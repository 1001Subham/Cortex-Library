import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fetchGutenbergWithRetry,
  GutenbergRequestError,
  runGutenbergCatalogPages,
} from './services/gutenbergCatalogImportRunner.js';

function response(status, { retryAfter } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'retry-after' ? retryAfter ?? null : null },
    body: { cancel: async () => {} },
    json: async () => ({ results: [] }),
  };
}

const pageUrl = (page) => `https://gutendex.com/books/?page=${page}`;

test('transient HTTP failure retries with bounded delay and then succeeds', async () => {
  let calls = 0;
  const delays = [];
  const result = await fetchGutenbergWithRetry(pageUrl(1), {
    attempts: 4,
    fetchImpl: async () => (++calls === 1 ? response(503) : response(200)),
    sleepImpl: async (delay) => delays.push(delay),
  });

  assert.equal(result.status, 200);
  assert.equal(calls, 2);
  assert.deepEqual(delays, [1_000]);
});

test('transient request timeout retries and succeeds', async () => {
  let calls = 0;
  const delays = [];
  const result = await fetchGutenbergWithRetry(pageUrl(1), {
    attempts: 4,
    fetchImpl: async (_url, options) => {
      assert.ok(options.signal);
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('request timed out'), { name: 'TimeoutError' });
      return response(200);
    },
    sleepImpl: async (delay) => delays.push(delay),
  });

  assert.equal(result.status, 200);
  assert.equal(calls, 2);
  assert.deepEqual(delays, [1_000]);
});

test('retry limit is finite and permanent HTTP failures are not retried', async () => {
  let calls = 0;
  const delays = [];
  await assert.rejects(
    fetchGutenbergWithRetry(pageUrl(2), {
      attempts: 3,
      fetchImpl: async () => { calls += 1; return response(503); },
      sleepImpl: async (delay) => delays.push(delay),
    }),
    (error) => error instanceof GutenbergRequestError
      && error.retryable
      && error.status === 503
      && error.attempts === 3
  );
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1_000, 2_000]);

  calls = 0;
  await assert.rejects(
    fetchGutenbergWithRetry(pageUrl(2), {
      fetchImpl: async () => { calls += 1; return response(404); },
      sleepImpl: async () => {},
    }),
    (error) => error.status === 404 && !error.retryable && error.attempts === 1
  );
  assert.equal(calls, 1);
});

test('repeated page failure is recorded and returns without advancing its checkpoint', async () => {
  let calls = 0;
  let checkpoint = 0;
  const failures = [];
  const result = await runGutenbergCatalogPages({
    targetTotal: 20,
    initialTotal: 10,
    lastCompletedPage: checkpoint,
    pageUrl,
    getPage: async (page, url) => {
      const r = await fetchGutenbergWithRetry(url, {
        attempts: 3,
        fetchImpl: async () => { calls += 1; return response(503); },
        sleepImpl: async () => {},
      });
      return r.json();
    },
    processRecord: async () => ({ imported: false }),
    saveCheckpoint: async (page) => { checkpoint = page; },
    recordPageFailure: async (failure) => failures.push(failure),
  });

  assert.equal(calls, 3);
  assert.equal(result.failedPage, 1);
  assert.equal(result.failedUrl, pageUrl(1));
  assert.equal(result.total, 10);
  assert.equal(checkpoint, 0);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].attempts, 3);
  assert.equal(failures[0].status, 503);
});

test('resume restarts at the first incomplete page and preserves prior records', async () => {
  const catalog = new Map([['existing-book', 'Existing seeded title']]);
  let checkpoint = 0;
  const savedManifest = new Map();
  const failed = [];
  const resolved = [];
  const calls = [];
  const metadata = (id, title) => ({
    id,
    title,
    copyright: false,
    formats: { 'text/plain; charset=utf-8': `https://www.gutenberg.org/ebooks/${id}.txt` },
  });
  const processRecord = async (book) => {
    if ([...catalog.values()].some((title) => title.toLowerCase() === book.title.toLowerCase())) {
      return { imported: false, reason: 'duplicate-title' };
    }
    catalog.set(`book-${book.id}`, book.title);
    return { imported: true, id: `book-${book.id}`, title: book.title };
  };

  const first = await runGutenbergCatalogPages({
    targetTotal: 10,
    initialTotal: catalog.size,
    lastCompletedPage: checkpoint,
    pageUrl,
    getPage: async (page, url) => {
      calls.push(page);
      if (page === 1) return { results: [metadata(1, 'First imported book')], next: pageUrl(2) };
      throw new GutenbergRequestError('temporary 503', { url, status: 503, attempts: 4, retryable: true });
    },
    processRecord,
    saveManifest: async (items) => items.forEach((item) => savedManifest.set(item.gutenbergId, item)),
    saveCheckpoint: async (page) => { checkpoint = page; },
    recordPageFailure: async (failure) => failed.push(failure),
  });

  assert.equal(first.failedPage, 2);
  assert.equal(checkpoint, 1);
  assert.equal(catalog.get('existing-book'), 'Existing seeded title');
  assert.equal(catalog.size, 2);

  const second = await runGutenbergCatalogPages({
    targetTotal: 4,
    initialTotal: catalog.size,
    lastCompletedPage: checkpoint,
    manifestEntries: [...savedManifest.values()],
    pageUrl,
    getPage: async (page) => {
      calls.push(page);
      assert.equal(page, 2);
      return { results: [metadata(1, 'First imported book'), metadata(2, 'Second imported book')], next: null };
    },
    processRecord,
    saveManifest: async (items) => items.forEach((item) => savedManifest.set(item.gutenbergId, item)),
    saveCheckpoint: async (page) => { checkpoint = page; },
    resolvePageFailures: async (page) => resolved.push(page),
  });

  assert.deepEqual(calls, [1, 2, 2]);
  assert.equal(second.failedPage, null);
  assert.equal(checkpoint, 2);
  assert.equal(catalog.size, 3);
  assert.equal(catalog.get('existing-book'), 'Existing seeded title');
  assert.equal(catalog.get('book-1'), 'First imported book');
  assert.equal(catalog.get('book-2'), 'Second imported book');
  assert.equal(savedManifest.size, 2);
  assert.deepEqual(resolved, [2]);
  assert.equal(failed[0].page, 2);
});

test('previously imported titles are skipped without replacing existing catalog entries', async () => {
  const catalog = new Map([['book-7', 'Already imported title']]);
  let processed = 0;
  const result = await runGutenbergCatalogPages({
    targetTotal: 5,
    initialTotal: catalog.size,
    pageUrl,
    getPage: async () => ({
      results: [{
        id: 7,
        title: 'Already imported title',
        copyright: false,
        formats: { 'text/plain': 'https://www.gutenberg.org/ebooks/7.txt' },
      }],
      next: null,
    }),
    processRecord: async (book) => {
      processed += 1;
      if ([...catalog.values()].some((title) => title.toLowerCase() === book.title.toLowerCase())) {
        return { imported: false, reason: 'duplicate-title' };
      }
      catalog.set(`book-${book.id}`, book.title);
      return { imported: true, id: `book-${book.id}`, title: book.title };
    },
  });

  assert.equal(processed, 1);
  assert.equal(result.imported, 0);
  assert.equal(catalog.size, 1);
  assert.equal(catalog.get('book-7'), 'Already imported title');
});
