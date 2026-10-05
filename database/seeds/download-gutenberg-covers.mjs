import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gutenbergBookUuid } from '../../backend/src/services/gutenbergCatalogImport.service.js';
import { downloadPublicDomainCover } from '../../backend/src/services/gutenbergCover.service.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheRoot = path.join(root, 'database', 'seeds', '.cache', 'catalog-import');
const storageRoot = process.env.BOOK_STORAGE_ROOT || path.join(root, 'storage');
const downloadOnly = process.env.CORTEX_COVER_DOWNLOAD_ONLY === '1';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const seededGutenbergIds = new Map([
  [11, 'b3000000-0000-4000-8000-000000000001'],
  [1661, 'b3000000-0000-4000-8000-000000000002'],
  [35, 'b3000000-0000-4000-8000-000000000003'],
  [120, 'b3000000-0000-4000-8000-000000000004'],
  [1342, 'b3000000-0000-4000-8000-000000000005'],
  [55, 'b3000000-0000-4000-8000-000000000006'],
  [345, 'b3000000-0000-4000-8000-000000000007'],
  [84, 'b3000000-0000-4000-8000-000000000008'],
  [46, 'b3000000-0000-4000-8000-000000000009'],
  [36, 'b3000000-0000-4000-8000-00000000000a'],
]);

const database = downloadOnly ? null : await import(
  pathToFileURL(path.join(root, 'backend', 'src', 'config', 'database.js')).href
);
const pool = database?.default;

try {
  const pageFiles = (await fs.readdir(cacheRoot))
    .filter((name) => /^page-\d+\.json$/.test(name))
    .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));
  const metadataById = new Map();
  for (const filename of pageFiles) {
    const page = JSON.parse(await fs.readFile(path.join(cacheRoot, filename), 'utf8'));
    for (const metadata of page.results || []) {
      if (metadata.copyright === false) metadataById.set(metadata.id, metadata);
    }
  }
  const manifest = JSON.parse(await fs.readFile(
    path.join(root, 'database', 'seeds', 'gutenberg-catalog-manifest.json'),
    'utf8'
  ));
  const importedBookIds = new Map(
    manifest.map((entry) => [entry.gutenbergId, entry.bookId])
  );
  for (const gutenbergId of seededGutenbergIds.keys()) {
    if (!metadataById.has(gutenbergId)) {
      metadataById.set(gutenbergId, {
        id: gutenbergId,
        copyright: false,
        formats: {
          'image/jpeg': `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.cover.medium.jpg`,
        },
      });
    }
  }

  const totals = { checked: 0, downloaded: 0, alreadyOriginal: 0, unavailable: 0, failed: 0 };
  for (const metadata of metadataById.values()) {
    const bookIds = [...new Set([
      seededGutenbergIds.get(metadata.id),
      importedBookIds.get(metadata.id),
    ].filter(Boolean))];
    if (bookIds.length === 0) continue;
    for (const bookId of bookIds) {
      const result = downloadOnly ? null : await pool.query(
        'SELECT id, cover_image_key FROM books WHERE id = $1', [bookId]
      );
      if (result && !result.rowCount) continue;
      totals.checked += 1;
      const book = result?.rows[0] || { id: bookId, cover_image_key: null };
      if (/\.jpe?g$/i.test(book.cover_image_key || '')) {
        totals.alreadyOriginal += 1;
        continue;
      }

      const directory = path.join(storageRoot, 'books', book.id);
      const coverPath = path.join(directory, 'cover.jpg');
      try {
        if (downloadOnly) {
          try {
            await fs.access(coverPath);
            totals.alreadyOriginal += 1;
            continue;
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
        }
        let bytes;
        try {
          bytes = await fs.readFile(coverPath);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        if (!bytes) bytes = await downloadPublicDomainCover(metadata);
        if (!bytes) {
          totals.unavailable += 1;
          continue;
        }
        await fs.mkdir(directory, { recursive: true });
        try {
          await fs.writeFile(coverPath, bytes, { flag: 'wx' });
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
        }
        if (!downloadOnly) {
          await pool.query(
            `UPDATE books SET cover_image_key = $2
             WHERE id = $1 AND cover_image_key LIKE '%.svg'`,
            [book.id, `storage/books/${book.id}/cover.jpg`]
          );
        }
        totals.downloaded += 1;
        console.log(`Stored Project Gutenberg cover for ${book.id} (ebook ${metadata.id}).`);
        await delay(500);
      } catch (error) {
        totals.failed += 1;
        console.warn(`Cover import failed for Gutenberg ${metadata.id} (${book.id}): ${error.message}`);
      }
    }
  }
  console.log(JSON.stringify(totals, null, 2));
} finally {
  await database?.closeDatabasePool();
}
