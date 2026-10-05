import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { downloadPublicDomainCover } from './gutenbergCover.service.js';

const NAMESPACE = 'cortex-library:project-gutenberg:';
const CATEGORY_RULES = [
  ['mystery', /mystery|detective|crime fiction/i],
  ['science-fiction', /science fiction|scientific romances?|utopian fiction/i],
  ['fantasy', /fantasy|fairy tales?|magic/i],
  ['horror', /horror|ghost stories|gothic fiction/i],
  ['adventure', /adventure|sea stories|western stories/i],
  ['childrens-literature', /children|juvenile|young readers/i],
  ['historical', /historical fiction|historical novel/i],
  ['classics', /classics|classic literature/i],
  ['literature', /novels?|short stories|poetry|drama|literature|fiction/i],
];

export function slugifyCatalogValue(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

export function gutenbergBookUuid(gutenbergId) {
  const hash = crypto.createHash('sha1').update(`${NAMESPACE}${gutenbergId}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function selectCatalogCategories(metadata) {
  const sourceTerms = [
    ...(metadata.subjects || []),
    ...(metadata.bookshelves || []),
  ].join(' ');
  const selected = CATEGORY_RULES
    .filter(([, pattern]) => pattern.test(sourceTerms))
    .map(([slug]) => slug);

  if (/children|juvenile|young readers/i.test(sourceTerms)) {
    selected.push('children');
  }
  if (selected.length === 0) {
    selected.push(/fiction|novel|short stor/i.test(sourceTerms) ? 'literature' : 'fiction');
  }
  return [...new Set(selected)];
}

export function extractGutenbergText(raw, metadata) {
  if (metadata?.copyright !== false) {
    throw new Error('Only catalog entries explicitly marked public domain in the United States can be imported.');
  }

  const start = raw.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const end = raw.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*/i);
  if (!start || !end || end.index <= start.index) {
    throw new Error(`Gutenberg ebook ${metadata.id} has no valid text boundaries.`);
  }
  const licenseHeader = raw.slice(0, start.index);
  if (/this particular work is one of the few individual works restricted by copyright law|included with permission of the copyright holder/i.test(licenseHeader)) {
    throw new Error(`Gutenberg ebook ${metadata.id} contains a copyright-permission notice.`);
  }

  const text = raw
    .slice(start.index + start[0].length, end.index)
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim();
  if (text.length < 1000) {
    throw new Error(`Gutenberg ebook ${metadata.id} does not contain enough readable text.`);
  }
  return text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function makeHtml({ title, author, language, text, gutenbergId }) {
  const blocks = text.split(/\n\s*\n/).map((block) =>
    block.split('\n').map((line) => line.trim()).filter(Boolean).join(' ')
  ).filter((block) => block && !/^\[Illustration/i.test(block));
  const body = blocks.map((block) => {
    if (/^(chapter|book|part|stave|letter|introduction|preface|prologue|epilogue)\b/i.test(block) && block.length < 180) {
      return `      <h2>${escapeHtml(block)}</h2>`;
    }
    return `      <p>${escapeHtml(block)}</p>`;
  }).join('\n');
  const authorText = author || 'Author not listed in catalog metadata';

  return `<!doctype html>
<html lang="${escapeHtml(language)}">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
  <body><article><header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(authorText)}</p><p>Complete public-domain text.</p></header>
${body}
  </article></body>
</html>
`;
}

function wrapTitle(title, maxChars = 20, maxLines = 6) {
  const lines = [];
  let current = '';
  for (const word of title.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  }
  return lines;
}

function makeCoverSvg(title, author, colorSeed) {
  const colors = ['#2c5f4e', '#3d3a2e', '#1f3d5c', '#6b3a1f', '#5c2e3d', '#243024', '#4a1f1f'];
  const color = colors[Number.parseInt(colorSeed.slice(0, 6), 16) % colors.length];
  const lines = wrapTitle(title);
  const startY = 205 - (lines.length - 1) * 15;
  const titleLines = lines.map((line, i) => `<text x="160" y="${startY + i * 30}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia,serif" font-size="22">${escapeHtml(line)}</text>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480"><rect width="320" height="480" fill="${color}"/><rect x="18" y="18" width="284" height="444" fill="none" stroke="#f5f0e8" stroke-width="2"/><g>${titleLines}</g><line x1="96" y1="330" x2="224" y2="330" stroke="#f5f0e8" opacity=".45"/><text x="160" y="370" text-anchor="middle" fill="#d9d0c4" font-family="Georgia,serif" font-size="14">${escapeHtml(author || 'Unknown author')}</text><text x="160" y="434" text-anchor="middle" fill="#c4b8a8" font-family="Georgia,serif" font-size="11">Cortex Library</text></svg>`;
}

function textWordCount(html) {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

export async function importGutenbergRecord(metadata, raw, { pool, storageRoot, fetchImpl = globalThis.fetch }) {
  if (!Number.isInteger(metadata?.id) || !metadata.title || metadata.copyright !== false) {
    return { imported: false, reason: 'not-verified-public-domain' };
  }
  const title = String(metadata.title).trim();
  const authorNames = [...new Set((metadata.authors || []).map((entry) => String(entry.name || '').trim()).filter(Boolean))];
  const primaryAuthor = authorNames[0] || null;
  const text = extractGutenbergText(raw, metadata);
  const html = makeHtml({
    title,
    author: authorNames.join(', '),
    language: metadata.languages?.[0] || 'en',
    text,
    gutenbergId: metadata.id,
  });
  const words = textWordCount(html);
  const slug = `${slugifyCatalogValue(title).slice(0, 440)}-pg-${metadata.id}`;
  const id = gutenbergBookUuid(metadata.id);
  const directory = path.resolve(storageRoot, 'books', id);
  const booksRoot = path.resolve(storageRoot, 'books');
  if (!directory.startsWith(`${booksRoot}${path.sep}`)) {
    throw new Error('Generated catalog storage path escaped the books directory.');
  }

  const duplicate = await pool.query(
    `SELECT id FROM books WHERE slug = $1 OR lower(title) = lower($2) LIMIT 1`,
    [slug, title]
  );
  if (duplicate.rowCount) return { imported: false, reason: 'duplicate-title', id: duplicate.rows[0].id };

  const categorySlugs = selectCatalogCategories(metadata);
  const categories = await pool.query(
    'SELECT id, slug FROM categories WHERE slug = ANY($1::text[])',
    [categorySlugs]
  );
  if (!categories.rows.length) {
    const fiction = await pool.query("SELECT id, slug FROM categories WHERE slug = 'fiction'");
    categories.rows.push(...fiction.rows);
  }

  let coverBytes = null;
  try {
    coverBytes = await downloadPublicDomainCover(metadata, { fetchImpl });
  } catch (error) {
    console.warn(`Cover unavailable for Gutenberg ${metadata.id}; keeping SVG fallback: ${error.message}`);
  }
  const coverFilename = coverBytes ? 'cover.jpg' : 'cover.svg';
  const coverKey = `storage/books/${id}/${coverFilename}`;
  const fallbackCover = makeCoverSvg(title, primaryAuthor, id.replaceAll('-', ''));
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const repeated = await client.query(
      `SELECT id FROM books WHERE slug = $1 OR lower(title) = lower($2) LIMIT 1`,
      [slug, title]
    );
    if (repeated.rowCount) {
      await client.query('ROLLBACK');
      return { imported: false, reason: 'duplicate-title', id: repeated.rows[0].id };
    }

    const authorIds = [];
    for (const name of authorNames) {
      const authorSlug = slugifyCatalogValue(name).slice(0, 210);
      await client.query(
        `INSERT INTO authors (display_name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
        [name, authorSlug]
      );
      const author = await client.query('SELECT id FROM authors WHERE slug = $1', [authorSlug]);
      if (author.rows[0]) authorIds.push(author.rows[0].id);
    }

    const summary = Array.isArray(metadata.summaries) ? metadata.summaries.find((value) => String(value).trim()) : null;
    const result = await client.query(
      `INSERT INTO books (
         id, title, slug, description, publisher, language_code,
         cover_image_key, content_storage_key, content_format, content_byte_size,
         total_pages, estimated_reading_minutes, status, published_at
       ) VALUES (
         $1, $2, $3, $4, NULL, $5,
         $6, $7, 'html', $8, $9, $10, 'published', now()
       ) ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [
        id,
        title,
        slug,
        summary ? String(summary).slice(0, 10000) : null,
        (metadata.languages?.[0] || 'en').slice(0, 10),
        coverKey,
        `storage/books/${id}/content.html`,
        Buffer.byteLength(html, 'utf8'),
        Math.max(1, Math.round(words / 250)),
        Math.max(1, Math.round(words / 220)),
      ]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return { imported: false, reason: 'duplicate-slug' };
    }
    await fs.mkdir(directory, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(directory, 'content.html'), html, 'utf8'),
      fs.writeFile(path.join(directory, 'cover.svg'), fallbackCover, 'utf8'),
      ...(coverBytes ? [fs.writeFile(path.join(directory, coverFilename), coverBytes)] : []),
    ]);
    for (let index = 0; index < authorIds.length; index += 1) {
      await client.query(
        'INSERT INTO book_authors (book_id, author_id, author_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [id, authorIds[index], index + 1]
      );
    }
    for (const category of categories.rows) {
      await client.query(
        'INSERT INTO book_categories (book_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, category.id]
      );
    }
    await client.query('COMMIT');
    return { imported: true, id, title, author: primaryAuthor, words, coverSource: coverBytes ? 'gutenberg' : 'fallback' };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  } finally {
    client?.release();
  }
}
