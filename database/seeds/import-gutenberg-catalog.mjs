import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheRoot = path.join(root, 'database', 'seeds', '.cache', 'catalog-import');
const manifestPath = path.join(root, 'database', 'seeds', 'gutenberg-catalog-manifest.json');
const checkpointPath = path.join(root, 'database', 'seeds', 'gutenberg-catalog-checkpoint.json');
const failuresPath = path.join(root, 'database', 'seeds', 'gutenberg-catalog-failures.json');
const storageRoot = process.env.BOOK_STORAGE_ROOT || path.join(root, 'storage');
const targetTotal = Number.parseInt(process.env.TARGET_BOOK_COUNT || '250', 10);
const userAgent = 'CortexLibrary public-domain catalog import (local development)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!Number.isInteger(targetTotal) || targetTotal < 10 || targetTotal > 300) {
  throw new Error('TARGET_BOOK_COUNT must be an integer from 10 through 300.');
}

const configPath = process.env.CORTEX_BACKEND_CONFIG || path.join(root, 'backend', 'src', 'config', 'database.js');
const { default: pool, closeDatabasePool } = await import(pathToFileURL(configPath).href);
const { importGutenbergRecord } = await import(pathToFileURL(path.join(root, 'backend', 'src', 'services', 'gutenbergCatalogImport.service.js')).href);
const { fetchGutenbergWithRetry, runGutenbergCatalogPages } = await import(
  pathToFileURL(path.join(root, 'backend', 'src', 'services', 'gutenbergCatalogImportRunner.js')).href
);

async function readCache(filename) {
  try {
    return await fs.readFile(filename, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function readJson(filename, fallback) {
  const contents = await readCache(filename);
  if (!contents) return fallback;
  try {
    return JSON.parse(contents);
  } catch (error) {
    console.warn(`Ignoring invalid JSON cache ${filename}: ${error.message}`);
    return fallback;
  }
}

async function writeJsonAtomic(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, filename);
}

function logRetries(url) {
  return ({ attempt, nextAttempt, delayMs, error }) => {
    console.warn(
      `Retrying ${url} after attempt ${attempt}; next attempt ${nextAttempt} in ${delayMs}ms: ${error.message}`
    );
  };
}

async function getJson(url, cachePath) {
  const cached = await readCache(cachePath);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      await fs.rm(cachePath, { force: true });
    }
  }

  const response = await fetchGutenbergWithRetry(url, {
    headers: { 'User-Agent': userAgent, Accept: 'application/json' },
    attempts: 4,
    timeoutMs: 30_000,
    onRetry: logRetries(url),
  });
  const body = await response.text();
  const parsed = JSON.parse(body);
  await writeJsonAtomic(cachePath, parsed);
  return parsed;
}

async function getText(metadata) {
  const cachePath = path.join(cacheRoot, `pg${metadata.id}.txt`);
  const cached = await readCache(cachePath);
  if (cached) return cached;
  const formats = metadata.formats || {};
  const formatEntry = Object.entries(formats).find(([mime, url]) =>
    /^text\/plain(?:;|$)/i.test(mime) && typeof url === 'string' && /^https:\/\//i.test(url)
  );
  if (!formatEntry) throw new Error(`No downloadable plain-text format for Gutenberg ebook ${metadata.id}.`);

  const textUrl = formatEntry[1];
  const response = await fetchGutenbergWithRetry(textUrl, {
    headers: { 'User-Agent': userAgent, Accept: 'text/plain' },
    attempts: 4,
    timeoutMs: 60_000,
    baseDelayMs: 2_000,
    maxDelayMs: 15_000,
    onRetry: logRetries(textUrl),
  });
  const body = await response.text();
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  const temporary = `${cachePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, body, 'utf8');
  await fs.rename(temporary, cachePath);
  await sleep(1200);
  return body;
}

function pageUrl(page) {
  const query = new URLSearchParams({
    languages: 'en',
    copyright: 'false',
    mime_type: 'text/plain',
    sort: 'popular',
    page: String(page),
  });
  return `https://gutendex.com/books/?${query}`;
}

async function main() {
  await fs.mkdir(cacheRoot, { recursive: true });
  const initial = await pool.query('SELECT count(*)::int AS count FROM books');
  let total = initial.rows[0].count;
  if (total >= targetTotal) {
    console.log(`Catalog already contains ${total} books; target is ${targetTotal}. No import needed.`);
    return;
  }

  const manifestData = await readJson(manifestPath, []);
  const manifestEntries = Array.isArray(manifestData)
    ? manifestData
    : Array.isArray(manifestData.books) ? manifestData.books : [];
  const checkpoint = await readJson(checkpointPath, { lastCompletedPage: 0 });
  const failureData = await readJson(failuresPath, { failures: [] });
  const failures = Array.isArray(failureData.failures) ? failureData.failures : [];
  const lastCompletedPage = Number.isInteger(checkpoint.lastCompletedPage)
    ? checkpoint.lastCompletedPage
    : 0;
  if (lastCompletedPage === 0 && (manifestEntries.length || await readCache(path.join(cacheRoot, 'page-1.json')))) {
    console.log('Resuming from page 1 using existing manifest/cache; title checks will skip prior imports.');
  } else {
    console.log(`Resuming from Gutendex page ${lastCompletedPage + 1}.`);
  }

  const saveManifest = (books) => writeJsonAtomic(manifestPath, books);
  const saveCheckpoint = (page) => writeJsonAtomic(checkpointPath, { lastCompletedPage: page, updatedAt: new Date().toISOString() });
  const recordPageFailure = async (failure) => {
    const existing = failures.find((entry) =>
      entry.page === failure.page && entry.requestUrl === failure.requestUrl && !entry.resolvedAt
    );
    if (existing) {
      existing.attempts = failure.attempts;
      existing.status = failure.status;
      existing.error = failure.error;
      existing.lastFailedAt = new Date().toISOString();
      existing.gutenbergId = failure.gutenbergId ?? existing.gutenbergId;
      existing.title = failure.title ?? existing.title;
    } else {
      failures.push({ ...failure, firstFailedAt: new Date().toISOString(), lastFailedAt: new Date().toISOString(), resolvedAt: null });
    }
    await writeJsonAtomic(failuresPath, { failures });
  };
  const resolvePageFailures = async (page) => {
    let changed = false;
    for (const failure of failures) {
      if (failure.page === page && !failure.resolvedAt) {
        failure.resolvedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) await writeJsonAtomic(failuresPath, { failures });
  };

  const result = await runGutenbergCatalogPages({
    targetTotal,
    initialTotal: total,
    lastCompletedPage,
    manifestEntries,
    pageUrl,
    getPage: (page, url) => getJson(url, path.join(cacheRoot, `page-${page}.json`)),
    processRecord: async (metadata) => {
      const duplicate = await pool.query(
        'SELECT id FROM books WHERE lower(title) = lower($1) LIMIT 1',
        [String(metadata.title).trim()]
      );
      if (duplicate.rowCount) return { imported: false, reason: 'duplicate-title', id: duplicate.rows[0].id };
      const raw = await getText(metadata);
      return importGutenbergRecord(metadata, raw, { pool, storageRoot });
    },
    saveManifest,
    saveCheckpoint,
    recordPageFailure,
    resolvePageFailures,
    onRecordError: (metadata, error) => {
      console.warn(`Skipped Gutenberg ${metadata.id} (${metadata.title}): ${error.message}`);
    },
    onImported: ({ total: count, result: record }) => {
      total = count;
      console.log(`Imported ${count}/${targetTotal}: ${record.title}`);
    },
  });

  console.log(JSON.stringify({
    initial: initial.rows[0].count,
    final: result.total,
    imported: result.imported,
    target: targetTotal,
    lastCompletedPage: result.lastCompletedPage,
    failedPage: result.failedPage,
    failedUrl: result.failedUrl,
  }, null, 2));
  if (result.failedPage) {
    console.error(`Catalog import paused safely at Gutendex page ${result.failedPage}; retry with the same command later.`);
    process.exitCode = 1;
  } else if (result.total < targetTotal) {
    console.warn(`Catalog import stopped at ${result.total}; fewer eligible books were available than target ${targetTotal}.`);
  }
}

try {
  await main();
} finally {
  await closeDatabasePool();
}
