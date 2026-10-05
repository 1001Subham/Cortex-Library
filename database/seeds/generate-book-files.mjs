/**
 * Builds complete public-domain HTML files and project-owned SVG covers.
 *
 * Source: Project Gutenberg UTF-8 plain text (not Gutenberg HTML/catalog pages).
 * Transcriber headers, footers, Contents tables, and [Illustration] markers
 * are removed. The remaining literary text is stored as semantic HTML.
 *
 * Usage: node database/seeds/generate-book-files.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const storageBooks = path.join(root, 'storage', 'books');
const cacheDir = path.join(root, 'database', 'seeds', '.cache');
const USER_AGENT =
  'CortexLibrary/0.1 (local digital library; public-domain catalog seed)';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function estimateTextWidth(text, fontSize) {
  let width = 0;

  for (const character of String(text)) {
    if (character === ' ') {
      width += fontSize * 0.32;
    } else if ("'’.,;:!?-".includes(character)) {
      width += fontSize * 0.28;
    } else if (character !== character.toLowerCase()) {
      width += fontSize * 0.78;
    } else {
      width += fontSize * 0.64;
    }
  }

  return width;
}

function splitOversizedWord(word, maxWidth, fontSize) {
  const characters = [...word];
  const parts = [];
  let current = '';

  for (const character of characters) {
    const next = `${current}${character}`;

    if (current && estimateTextWidth(next, fontSize) > maxWidth) {
      parts.push(current);
      current = character;
    } else {
      current = next;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

export function wrapMultilineText(text, { maxWidth, fontSize, maxLines = 8 } = {}) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const pieces =
      estimateTextWidth(word, fontSize) > maxWidth
        ? splitOversizedWord(word, maxWidth, fontSize)
        : [word];

    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece;

      if (current && estimateTextWidth(next, fontSize) > maxWidth) {
        lines.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const fitted = lines.slice(0, maxLines);
  const last = fitted[maxLines - 1].replace(/\s+\S*$/, '').trim() || fitted[maxLines - 1];
  fitted[maxLines - 1] =
    estimateTextWidth(`${last}…`, fontSize) > maxWidth
      ? `${last.slice(0, Math.max(1, last.length - 2))}…`
      : `${last}…`;
  return fitted;
}

function fitWrappedText(text, { maxWidth, maxHeight, minFont, maxFont, lineHeight, maxLines }) {
  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 1) {
    const lines = wrapMultilineText(text, { maxWidth, fontSize, maxLines });
    const height = lines.length * fontSize * lineHeight;

    if (height <= maxHeight) {
      return { fontSize, lines, lineHeight: fontSize * lineHeight };
    }
  }

  const fontSize = minFont;
  return {
    fontSize,
    lines: wrapMultilineText(text, { maxWidth, fontSize, maxLines }),
    lineHeight: fontSize * lineHeight,
  };
}

function textBlock(lines, { x, startY, fontSize, lineHeight, fill }) {
  return lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `  <text x="${x}" y="${y}" text-anchor="middle" fill="${fill}" font-family="Georgia, serif" font-size="${fontSize}">${escapeHtml(line)}</text>`;
    })
    .join('\n');
}

function coverSvg({ id, title, author, background }) {
  const clipId = `cover-safe-${String(id).slice(-8)}`;
  const titleBox = { x: 40, width: 240, top: 64, bottom: 300 };
  const authorBox = { x: 40, width: 240, top: 348, bottom: 408 };
  const titleFit = fitWrappedText(title, {
    maxWidth: titleBox.width,
    maxHeight: titleBox.bottom - titleBox.top,
    minFont: 14,
    maxFont: 22,
    lineHeight: 1.26,
    maxLines: 7,
  });
  const authorFit = fitWrappedText(author, {
    maxWidth: Math.min(authorBox.width, 220),
    maxHeight: authorBox.bottom - authorBox.top,
    minFont: 11,
    maxFont: 13,
    lineHeight: 1.28,
    maxLines: 3,
  });
  const titleHeight = titleFit.lines.length * titleFit.lineHeight;
  const titleStartY = Number(
    (
      titleBox.top +
      (titleBox.bottom - titleBox.top - titleHeight) / 2 +
      titleFit.fontSize * 0.82
    ).toFixed(2)
  );
  const authorStartY = Number((authorBox.top + authorFit.fontSize).toFixed(2));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480">
  <rect width="320" height="480" fill="${background}"/>
  <rect x="18" y="18" width="284" height="444" fill="none" stroke="#f5f0e8" stroke-width="2"/>
  <defs>
    <clipPath id="${clipId}">
      <rect x="32" y="48" width="256" height="372"/>
    </clipPath>
  </defs>
  <g clip-path="url(#${clipId})">
${textBlock(titleFit.lines, {
    x: 160,
    startY: titleStartY,
    fontSize: titleFit.fontSize,
    lineHeight: titleFit.lineHeight,
    fill: '#f5f0e8',
  })}
  <line x1="96" y1="324" x2="224" y2="324" stroke="#f5f0e8" stroke-width="1" opacity="0.45"/>
${textBlock(authorFit.lines, {
    x: 160,
    startY: authorStartY,
    fontSize: authorFit.fontSize,
    lineHeight: authorFit.lineHeight,
    fill: '#d9d0c4',
  })}
  </g>
  <text x="160" y="434" text-anchor="middle" fill="#c4b8a8" font-family="Georgia, serif" font-size="11">
    Cortex Library
  </text>
</svg>
`;
}

function extractGutenbergBody(raw) {
  const startMatch = raw.match(
    /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i
  );
  const endMatch = raw.match(
    /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*/i
  );

  const startIndex = startMatch ? startMatch.index + startMatch[0].length : 0;
  const endIndex = endMatch ? endMatch.index : raw.length;

  return raw
    .slice(startIndex, endIndex)
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n');
}

function toParagraphs(text) {
  const blocks = text.split(/\n{2,}/);
  const paragraphs = [];

  for (const block of blocks) {
    const joined = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!joined || isDiscardable(joined)) {
      continue;
    }

    const unwrapped = unwrapGutenbergComment(joined);
    if (!unwrapped || isDiscardable(unwrapped)) {
      continue;
    }

    paragraphs.push(unwrapped);
  }

  return paragraphs;
}

function unwrapGutenbergComment(text) {
  const match = text.match(/^\s*\/\*\s*(?:NIND|RIGHT)?\s*([\s\S]*?)\s*\*\/\s*$/);
  return match ? match[1].trim() : text;
}

function isDiscardable(text) {
  if (/^\[Illustration/i.test(text)) {
    return true;
  }

  if (/^Produced by /i.test(text) || /millennium fulcrum/i.test(text)) {
    return true;
  }

  if (/^(\*\s*){3,}\*?$/.test(text) || /^[_—\-.]{5,}$/.test(text)) {
    return true;
  }

  if (
    /George Saintsbury/i.test(text) ||
    /Hugh Thomson/i.test(text) ||
    /CHISWICK PRESS/i.test(text) ||
    /GEORGE ALLEN PUBLISHER/i.test(text) ||
    /copyright[^\n]{0,40}george allen/i.test(text) ||
    /Popular Copyrighted Fiction/i.test(text) ||
    /Ask for Complete free list/i.test(text) ||
    /with a Preface by/i.test(text) ||
    /grosset\s*&\s*dunlap/i.test(text) ||
    /country life press/i.test(text) ||
    /printed in the united states/i.test(text) ||
    /^\[_?all rights reserved/i.test(text) ||
    /copyright,?\s+\d{4},?\s+in the united states/i.test(text)
  ) {
    return true;
  }

  if (/^(PAGE|Frontispiece|Title-page|_Publishers_|NEW YORK|GROSSET)\b/i.test(text)) {
    return true;
  }

  if (/^(_by_|by Mary Wollstonecraft)/i.test(text) && text.length < 80) {
    return true;
  }

  if (/^Frankenstein;$/i.test(text) || /^or, the Modern Prometheus$/i.test(text)) {
    return true;
  }

  if (/^An Invention$/i.test(text)) {
    return true;
  }

  if (/^Heading to (Preface|List of Illustrations|Chapter)/i.test(text)) {
    return true;
  }

  return false;
}

function isContentsHeading(text) {
  return /^(contents|table of contents|list of illustrations)$/i.test(text);
}

function isCollapsedToc(text) {
  const chapterHits = (text.match(/\bCHAPTER\s+[IVXLCDM0-9]+/gi) || []).length;
  const staveHits = (text.match(/\bSTAVE\s+[IVXLCDM0-9]+/gi) || []).length;
  const dottedPages = (text.match(/\.{2,}\s*\d+/g) || []).length;
  const jammedRomans = (
    text.match(
      /\b(?:I{1,3}|IV|V|VI{0,3}|IX|X{1,3}|XI{0,3}|XIV|XV|XVI)\b\s+[A-Z]/g
    ) || []
  ).length;

  return (
    chapterHits >= 3 || staveHits >= 3 || dottedPages >= 3 || jammedRomans >= 6
  );
}

function isTitlePageLine(text, bookTitle, bookAuthor) {
  const normalized = text.replace(/[.’']/g, '').toLowerCase();
  const title = bookTitle.replace(/[.’']/g, '').toLowerCase();

  if (normalized === title || normalized === `${title} by ${bookAuthor.toLowerCase()}`) {
    return true;
  }

  if (/^by [\w .'-]+$/i.test(text) && text.length < 80) {
    return true;
  }

  return false;
}

function sanitizeHeading(text, bookTitle) {
  let heading = text.replace(/[\[\]]+/g, '').replace(/\s+/g, ' ').trim();

  // Gutenberg ebook 120 numbers the Jolly-boat chapter as XXVII instead of XVII.
  if (bookTitle === 'Treasure Island') {
    if (/^XXVII\b/.test(heading) && /Jolly-boat/i.test(heading)) {
      heading = heading.replace(/^XXVII/, 'XVII');
    }
  }

  return heading;
}

function isHeading(text) {
  if (text.length > 120 || isCollapsedToc(text)) {
    return false;
  }

  if (/Chicago,\s+April/i.test(text) || /^L\. Frank Baum\b/i.test(text)) {
    return false;
  }

  return (
    /^(CHAPTER|STAVE|LETTER|BOOK|ADVENTURE|PART|Chapter)\s+/i.test(text) ||
    /^Letter\s+\d+/i.test(text) ||
    /^(INTRODUCTION|PROLOGUE|EPILOGUE|PREFACE)\b/i.test(text) ||
    /^[IVXLCDM]+\.\s+[A-Z]/.test(text) ||
    /^[IVXLCDM]+\s+[“"'‘]?[A-Z]/.test(text) ||
    /^[IVXLCDM]{1,6}\.?\]?$/.test(text)
  );
}

function skipFrontMatterNoise(paragraphs, startPattern, book) {
  let source = paragraphs.filter(
    (paragraph) =>
      !isTitlePageLine(paragraph, book.title, book.author) &&
      !isContentsHeading(paragraph) &&
      !isCollapsedToc(paragraph)
  );

  if (startPattern) {
    const startIndex = source.findIndex((paragraph) => startPattern.test(paragraph));
    if (startIndex >= 0) {
      source = source.slice(startIndex);
    }
  }

  return source;
}

function buildSections(paragraphs, startPattern, book) {
  const cleaned = skipFrontMatterNoise(paragraphs, startPattern, book);
  const sections = [];
  let current = { title: null, paragraphs: [] };

  const pushCurrent = () => {
    if (current.title || current.paragraphs.length > 0) {
      sections.push(current);
    }
  };

  for (let index = 0; index < cleaned.length; index += 1) {
    const paragraph = cleaned[index];
    const next = cleaned[index + 1];

    if (isHeading(paragraph)) {
      pushCurrent();
      let title = paragraph;

      if (
        /^[IVXLCDM]{1,6}\.?\]?$/.test(paragraph) &&
        next &&
        !isHeading(next) &&
        next.length < 120
      ) {
        title = `${paragraph.replace(/\.$/, '')} ${next}`;
        index += 1;
      }

      current = { title: sanitizeHeading(title, book.title), paragraphs: [] };
      continue;
    }

    current.paragraphs.push(paragraph);
  }

  pushCurrent();
  return sections.filter(
    (section) => section.paragraphs.length > 0 || section.title
  );
}

function documentHtml({ title, author, year, gutenbergId, sections }) {
  const body = sections
    .map((section) => {
      const heading = section.title
        ? `      <h2>${escapeHtml(section.title)}</h2>\n`
        : '';
      const paras = section.paragraphs
        .map((paragraph) => `      <p>${escapeHtml(paragraph)}</p>`)
        .join('\n');
      return `    <section>\n${heading}${paras}\n    </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <article>
      <header>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(author)} · ${escapeHtml(String(year))}</p>
        <p>Complete public-domain text prepared from Project Gutenberg plain-text ebook ${escapeHtml(String(gutenbergId))}. This file contains the literary work only: no Gutenberg HTML, catalog page, scripts, or external reading links.</p>
      </header>
${body}
    </article>
  </body>
</html>
`;
}

async function downloadPlainText(gutenbergId) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `pg${gutenbergId}.txt`);

  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 1000) {
    return fs.readFileSync(cachePath, 'utf8');
  }

  const urls = [
    `https://www.gutenberg.org/ebooks/${gutenbergId}.txt.utf-8`,
    `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`,
    `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`,
  ];

  let lastError = null;

  for (const url of urls) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain' },
        });

        if (!response.ok) {
          lastError = new Error(`${url} -> ${response.status}`);
          continue;
        }

        const text = await response.text();
        if (text.length < 1000) {
          lastError = new Error(`${url} too short`);
          continue;
        }

        fs.writeFileSync(cachePath, text, 'utf8');
        return text;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  throw lastError || new Error(`Unable to download Gutenberg ${gutenbergId}`);
}

const books = [
  {
    id: 'b3000000-0000-4000-8000-000000000001',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    year: 1865,
    background: '#2c5f4e',
    gutenbergId: 11,
    startPattern: /^CHAPTER I\.\s*Down the Rabbit-Hole$/,
  },
  {
    id: 'b3000000-0000-4000-8000-000000000002',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: 1892,
    background: '#3d3a2e',
    gutenbergId: 1661,
    startPattern: /^I\.\s*A SCANDAL IN BOHEMIA/,
  },
  {
    id: 'b3000000-0000-4000-8000-000000000003',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    year: 1895,
    background: '#1f3d5c',
    gutenbergId: 35,
    startPattern: /^I\.\s*Introduction$/,
  },
  {
    id: 'b3000000-0000-4000-8000-000000000004',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    year: 1883,
    background: '#6b3a1f',
    gutenbergId: 120,
    startPattern: /^PART ONE--The Old Buccaneer$/,
  },
  {
    id: 'b3000000-0000-4000-8000-000000000005',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    background: '#5c2e3d',
    gutenbergId: 1342,
    startPattern: /It is a truth universally acknowledged|^Chapter I\.?\]?$/i,
  },
  {
    id: 'b3000000-0000-4000-8000-000000000006',
    title: 'The Wonderful Wizard of Oz',
    author: 'L. Frank Baum',
    year: 1900,
    background: '#7a5b12',
    gutenbergId: 55,
    startPattern: /^Introduction$/,
  },
  {
    id: 'b3000000-0000-4000-8000-000000000007',
    title: 'Dracula',
    author: 'Bram Stoker',
    year: 1897,
    background: '#2a1c24',
    gutenbergId: 345,
    startPattern: /^TO$|^How these papers have been placed/i,
  },
  {
    id: 'b3000000-0000-4000-8000-000000000008',
    title: 'Frankenstein',
    author: 'Mary Wollstonecraft Shelley',
    year: 1818,
    background: '#243024',
    gutenbergId: 84,
    startPattern: /^Letter 1$/,
  },
  {
    id: 'b3000000-0000-4000-8000-000000000009',
    title: 'A Christmas Carol',
    author: 'Charles Dickens',
    year: 1843,
    background: '#4a1f1f',
    gutenbergId: 46,
    startPattern: /^PREFACE$|^STAVE I:/i,
  },
  {
    id: 'b3000000-0000-4000-8000-00000000000a',
    title: 'The War of the Worlds',
    author: 'H. G. Wells',
    year: 1898,
    background: '#2e2438',
    gutenbergId: 36,
    startPattern: /^BOOK ONE THE COMING OF THE MARTIANS$/,
  },
];

const coversOnly = process.argv.includes('--covers-only');

if (coversOnly) {
  for (const book of books) {
    const dir = path.join(storageBooks, book.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'cover.svg'), coverSvg(book), 'utf8');
  }

  console.log(`Regenerated ${books.length} covers.`);
  process.exit(0);
}

const stats = [];

for (const book of books) {
  const raw = await downloadPlainText(book.gutenbergId);
  const body = extractGutenbergBody(raw);
  const sections = buildSections(toParagraphs(body), book.startPattern, book);
  const html = documentHtml({ ...book, sections });
  const svg = coverSvg(book);
  const dir = path.join(storageBooks, book.id);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'content.html'), html, 'utf8');
  fs.writeFileSync(path.join(dir, 'cover.svg'), svg, 'utf8');

  const wordCount = sections.reduce(
    (sum, section) =>
      sum +
      section.paragraphs.reduce(
        (inner, paragraph) => inner + paragraph.split(/\s+/).filter(Boolean).length,
        0
      ),
    0
  );

  stats.push({
    id: book.id,
    title: book.title,
    gutenbergId: book.gutenbergId,
    sections: sections.filter((section) => section.title).length,
    wordCount,
    htmlBytes: Buffer.byteLength(html, 'utf8'),
    totalPages: Math.max(1, Math.round(wordCount / 250)),
    estimatedReadingMinutes: Math.max(1, Math.round(wordCount / 220)),
    firstHeading: sections.find((section) => section.title)?.title || null,
  });
}

const sizeSql = stats
  .map(
    (row) =>
      `UPDATE books SET content_byte_size = ${row.htmlBytes}, total_pages = ${row.totalPages}, estimated_reading_minutes = ${row.estimatedReadingMinutes}, updated_at = now() WHERE id = '${row.id}';`
  )
  .join('\n');

fs.writeFileSync(
  path.join(root, 'database', 'seeds', '002_update_content_byte_sizes.sql'),
  `${sizeSql}\n`
);
fs.writeFileSync(
  path.join(root, 'database', 'seeds', 'content-stats.json'),
  `${JSON.stringify(stats, null, 2)}\n`
);

const catalogSeedPath = path.join(root, 'database', 'seeds', '001_catalog_seed.sql');
let catalogSeed = fs.readFileSync(catalogSeedPath, 'utf8');

for (const row of stats) {
  const block = new RegExp(
    `(${row.id}[\\s\\S]*?'html',\\s*)\\d+,\\s*\\d+,\\s*\\d+,`,
    'm'
  );
  catalogSeed = catalogSeed.replace(
    block,
    `$1${row.htmlBytes},\n    ${row.totalPages},\n    ${row.estimatedReadingMinutes},`
  );
}

fs.writeFileSync(catalogSeedPath, catalogSeed, 'utf8');

console.log(JSON.stringify(stats, null, 2));
