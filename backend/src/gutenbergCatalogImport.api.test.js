import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import pool, { closeDatabasePool } from './config/database.js';
import config from './config/index.js';
import {
  extractGutenbergText,
  gutenbergBookUuid,
  importGutenbergRecord,
  selectCatalogCategories,
  slugifyCatalogValue,
} from './services/gutenbergCatalogImport.service.js';

const server = (await import('./app.js')).default.listen(0);
const createdBookIds = [];
const createdAuthorSlugs = [];
let storageRoot;

before(async () => {
  storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cortex-gutenberg-import-'));
  await new Promise((resolve) => server.listening ? resolve() : server.once('listening', resolve));
});

after(async () => {
  if (createdBookIds.length) {
    await pool.query('DELETE FROM books WHERE id = ANY($1::uuid[])', [createdBookIds]);
  }
  for (const slug of createdAuthorSlugs) {
    await pool.query(
      `DELETE FROM authors a WHERE a.slug = $1 AND NOT EXISTS (SELECT 1 FROM book_authors ba WHERE ba.author_id = a.id)`,
      [slug]
    );
  }
  await fs.rm(storageRoot, { recursive: true, force: true });
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await closeDatabasePool();
});

function sampleRecord() {
  const id = 2_147_000_000 + Math.floor(Math.random() * 1_000_000);
  const suffix = crypto.randomUUID().slice(0, 8);
  const title = `Temporary Import Fixture ${suffix}`;
  const author = `Temporary Import Author ${suffix}`;
  const raw = `Header\n*** START OF THE PROJECT GUTENBERG EBOOK TEST ***\n${'A real sentence from the disposable parser test. '.repeat(120)}\n*** END OF THE PROJECT GUTENBERG EBOOK TEST ***\n`;
  return {
    id,
    title,
    authorSlug: slugifyCatalogValue(author),
    metadata: {
      id,
      title,
      authors: [{ name: author }],
      summaries: ['A temporary import integration fixture.'],
      subjects: ['Detective and mystery stories'],
      bookshelves: [],
      languages: ['en'],
      copyright: false,
    },
    raw,
  };
}

test('catalog mapper produces stable ids/slugs and uses only known categories', () => {
  assert.equal(slugifyCatalogValue('Émile & Co.: A Tale'), 'emile-and-co-a-tale');
  assert.equal(gutenbergBookUuid(1234), gutenbergBookUuid(1234));
  assert.match(gutenbergBookUuid(1234), /^[0-9a-f-]{36}$/);
  assert.deepEqual(selectCatalogCategories({ subjects: ['Detective fiction'], bookshelves: [] }), ['mystery', 'literature']);
});

test('import rejects records without explicit US public-domain status or valid text boundaries', () => {
  assert.throws(
    () => extractGutenbergText('no boundaries', { id: 123, copyright: false }),
    /no valid text boundaries/
  );
  assert.throws(
    () => extractGutenbergText('book text', { id: 123, copyright: null }),
    /Only catalog entries explicitly marked public domain/
  );
});

test('public-domain import is idempotent and writes readable HTML and a local SVG cover', async () => {
  const fixture = sampleRecord();
  createdBookIds.push(gutenbergBookUuid(fixture.id));
  createdAuthorSlugs.push(fixture.authorSlug);

  const first = await importGutenbergRecord(fixture.metadata, fixture.raw, { pool, storageRoot });
  assert.equal(first.imported, true);
  assert.ok(first.words > 100);
  const contentPath = path.join(storageRoot, 'books', first.id, 'content.html');
  const coverPath = path.join(storageRoot, 'books', first.id, 'cover.svg');
  const originalHtml = await fs.readFile(contentPath, 'utf8');
  const originalCover = await fs.readFile(coverPath, 'utf8');
  const second = await importGutenbergRecord(fixture.metadata, fixture.raw, { pool, storageRoot });
  assert.equal(second.imported, false);
  assert.equal(second.reason, 'duplicate-title');
  assert.equal(await fs.readFile(contentPath, 'utf8'), originalHtml);
  assert.equal(await fs.readFile(coverPath, 'utf8'), originalCover);
  assert.deepEqual(await fs.readdir(path.join(storageRoot, 'books')), [first.id]);

  const record = await pool.query(
    `SELECT b.*, count(DISTINCT ba.author_id)::int AS author_count,
            count(DISTINCT bc.category_id)::int AS category_count
     FROM books b LEFT JOIN book_authors ba ON ba.book_id=b.id
     LEFT JOIN book_categories bc ON bc.book_id=b.id
     WHERE b.id=$1 GROUP BY b.id`,
    [first.id]
  );
  assert.equal(record.rowCount, 1);
  assert.equal(record.rows[0].status, 'published');
  assert.equal(record.rows[0].language_code, 'en');
  assert.equal(record.rows[0].publication_year, null);
  assert.ok(record.rows[0].content_byte_size > 1000);
  assert.ok(record.rows[0].estimated_reading_minutes >= 1);
  assert.ok(record.rows[0].total_pages >= 1);
  assert.equal(record.rows[0].author_count, 1);
  assert.ok(record.rows[0].category_count >= 1);

  const html = await fs.readFile(contentPath, 'utf8');
  const cover = await fs.readFile(coverPath, 'utf8');
  assert.match(html, /<article>/);
  assert.match(html, /<p>A real sentence/);
  assert.match(cover, /<svg/);
  assert.ok(Buffer.byteLength(html, 'utf8') === record.rows[0].content_byte_size);
});

test('public-domain import stores a verified local Project Gutenberg cover when available', async () => {
  const fixture = sampleRecord();
  fixture.metadata.formats = {
    'image/jpeg': `https://www.gutenberg.org/cache/epub/${fixture.id}/pg${fixture.id}.cover.medium.jpg`,
  };
  createdBookIds.push(gutenbergBookUuid(fixture.id));
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02]);
  const result = await importGutenbergRecord(fixture.metadata, fixture.raw, {
    pool,
    storageRoot,
    fetchImpl: async () => new Response(jpegBytes, {
      status: 200,
      headers: { 'content-type': 'image/jpeg', 'content-length': String(jpegBytes.length) },
    }),
  });
  assert.equal(result.coverSource, 'gutenberg');
  const coverPath = path.join(storageRoot, 'books', result.id, 'cover.jpg');
  assert.deepEqual(await fs.readFile(coverPath), jpegBytes);
  const book = await pool.query('SELECT cover_image_key FROM books WHERE id = $1', [result.id]);
  assert.equal(book.rows[0].cover_image_key, `storage/books/${result.id}/cover.jpg`);
  assert.ok((await fs.stat(path.join(storageRoot, 'books', result.id, 'cover.svg'))).isFile());
});

test('current catalog API pagination count matches PostgreSQL and published content paths exist', async () => {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/books?limit=1`);
  assert.equal(response.status, 200);
  const body = await response.json();
  const count = await pool.query("SELECT count(*)::int AS count FROM books WHERE status='published'");
  assert.equal(body.pagination.total, count.rows[0].count);
  assert.equal(body.books.length, 1);
  assert.ok(body.books[0].languageCode);

  // Import integration tests run in a separate Node test process and use a
  // temporary storage root. Limit this filesystem check to the stable seed
  // catalog so concurrent fixture rows cannot be mistaken for live content.
  const seededIds = Array.from({ length: 10 }, (_, index) =>
    `b3000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
  );
  const available = await pool.query(
    `SELECT id, content_storage_key, cover_image_key FROM books
     WHERE id = ANY($1::uuid[]) AND status='published' AND content_format='html'
       AND content_storage_key IS NOT NULL`,
    [seededIds]
  );
  for (const book of available.rows) {
    assert.equal(book.content_storage_key, `storage/books/${book.id}/content.html`);
    assert.match(book.cover_image_key, new RegExp(`^storage/books/${book.id}/cover\\.(?:svg|jpg)$`));
    await fs.access(path.join(config.bookStorageRoot, 'books', book.id, 'content.html'));
    await fs.access(path.join(config.bookStorageRoot, 'books', book.id, 'cover.svg'));
    if (book.cover_image_key.endsWith('.jpg')) {
      await fs.access(path.join(config.bookStorageRoot, 'books', book.id, 'cover.jpg'));
    }
  }
});
