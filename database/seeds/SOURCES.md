# Development catalog sources

All ten seeded works were published before 1929 and are in the public domain
in the United States. Cortex Library stores the **complete literary work**
for each title as reader-friendly HTML under
`storage/books/{book_id}/content.html`.

Source: Project Gutenberg UTF-8 **plain text** ebooks (not Gutenberg HTML,
catalog pages, or website chrome). Transcriber headers/footers, contents
tables, illustration markers, and Gutenberg license wrappers are stripped
before storage. The files contain the literary text only: no scripts,
iframes, forms, tracking, or external reading links.

Project Gutenberg cover JPEGs are used when Gutendex supplies the official
`image/jpeg` cover URL for a record explicitly marked `copyright=false`. They
are downloaded to local book storage; no browser hotlinks are used. The original
generated Cortex SVG remains alongside each imported cover as a fallback.
Books without an available source cover keep using the local SVG.

Do not treat this repository as a substitute for a critical edition. Gutenberg
plain-text transcriptions can retain minor heading-number quirks from the
source file.

| Book | Author | First published | Gutenberg ebook | Headed sections | US status |
|------|--------|-----------------|-----------------|-----------------|-----------|
| Alice's Adventures in Wonderland | Lewis Carroll | 1865, Macmillan | [11](https://www.gutenberg.org/ebooks/11) | 12 chapters | Public domain |
| The Adventures of Sherlock Holmes | Arthur Conan Doyle | 1892, George Newnes | [1661](https://www.gutenberg.org/ebooks/1661) | 12 stories (plus story parts) | Public domain |
| The Time Machine | H. G. Wells | 1895, William Heinemann | [35](https://www.gutenberg.org/ebooks/35) | 16 chapters + epilogue | Public domain |
| Treasure Island | Robert Louis Stevenson | 1883, Cassell & Company | [120](https://www.gutenberg.org/ebooks/120) | 6 parts / 34 chapters (40 headed sections) | Public domain |
| Pride and Prejudice | Jane Austen | 1813, T. Egerton | [1342](https://www.gutenberg.org/ebooks/1342) | 61 chapters | Public domain |
| The Wonderful Wizard of Oz | L. Frank Baum | 1900, George M. Hill Company | [55](https://www.gutenberg.org/ebooks/55) | Author introduction + 24 chapters | Public domain |
| Dracula | Bram Stoker | 1897, Archibald Constable | [345](https://www.gutenberg.org/ebooks/345) | 27 chapters | Public domain |
| Frankenstein | Mary Wollstonecraft Shelley | 1818, Lackington et al. | [84](https://www.gutenberg.org/ebooks/84) | 4 letters + 24 chapters | Public domain |
| A Christmas Carol | Charles Dickens | 1843, Chapman & Hall | [46](https://www.gutenberg.org/ebooks/46) | 5 staves | Public domain |
| The War of the Worlds | H. G. Wells | 1898, William Heinemann | [36](https://www.gutenberg.org/ebooks/36) | 2 books / 27 chapters | Public domain |

ISBN is NULL: original editions predate the ISBN system.

Apply seed (idempotent UPSERT by deterministic UUID):

```
Get-Content -Raw database\seeds\001_catalog_seed.sql | docker exec -i cortex-postgres psql -U cortex_user -d cortex_library -v ON_ERROR_STOP=1
Get-Content -Raw database\seeds\002_update_content_byte_sizes.sql | docker exec -i cortex-postgres psql -U cortex_user -d cortex_library -v ON_ERROR_STOP=1
```

Regenerate HTML/SVG and byte-size SQL from cached Gutenberg plain text:

```
node database/seeds/generate-book-files.mjs
```

The Gutenberg download cache lives in `database/seeds/.cache/` (gitignored).

## Repeatable catalog expansion

`import-gutenberg-catalog.mjs` discovers English text ebooks through Gutendex's
machine-readable catalog, requires `copyright=false` (US public domain),
validates Gutenberg text boundaries and rejects explicit permission/copyright
notices, then stores escaped reader HTML and an official local JPEG cover when
provided. Generated SVG covers remain available as a fallback.
It only imports a title if the title/slug is not already present. The source
ebook ID determines the record UUID and the database transaction inserts
metadata, author links, and category links together. `gutenberg-catalog-manifest.json`
records imported ebook IDs and source URLs. Text and catalog-page downloads are
cached under the ignored `.cache/catalog-import/` folder, and requests are
serial with a 1.2 second delay between book texts. Existing titles are checked
before text downloads, and the database transaction remains the final duplicate
guard; reruns do not replace existing book files.

Catalog and text requests have finite timeouts and four total attempts. HTTP
429/500/502/503/504 responses and transient connection/time-out errors use
bounded exponential delays. Permanent HTTP failures stop without retrying.
`gutenberg-catalog-checkpoint.json` records the last fully processed page, and
`gutenberg-catalog-failures.json` records failed page/request URLs and retry
details. A failed page does not advance the checkpoint; running the same command
again resumes from that page. The first run after adding checkpoints safely
replays older cached pages once, relying on duplicate checks.

To fill in official Gutenberg covers for previously imported records, first run
`node database/seeds/download-gutenberg-covers.mjs` on the host with
`CORTEX_COVER_DOWNLOAD_ONLY=1` and `BOOK_STORAGE_ROOT` set to writable local
storage. Then run `docker compose exec -T backend node src/scripts/syncLocalGutenbergCovers.js`
to point verified database cover keys at those files. It skips current JPEG
keys and leaves all SVG fallbacks in place. The download script uses cached
Gutendex metadata and imported/seeded book IDs, so duplicate-only source records
do not create orphan storage directories.

The importer targets 250 total catalog rows by default and accepts
`TARGET_BOOK_COUNT` from 10 to 300. It does not invent publication years;
Gutendex does not provide original print publication dates, so `publication_year`
remains NULL when that source does not provide a verified value. Word count is
derived from the downloaded text for approximate pages and reading minutes.

Run from PowerShell on the host when the Compose PostgreSQL service is running
and public HTTPS access is available:

```powershell
$env:POSTGRES_HOST = 'localhost'
node database/seeds/import-gutenberg-catalog.mjs
```

When outbound HTTPS requires Docker Desktop's proxy, run the importer with a
Node version supporting `--use-env-proxy`, set `HTTPS_PROXY` (and optionally
`HTTP_PROXY`) to the configured proxy, and attach the importer process to the
Compose network. Node 20's built-in `fetch` does not automatically use proxy
environment variables; Node 24 supports `--use-env-proxy`.

The Project Gutenberg catalog provides machine-readable metadata, and its
license distinguishes US-public-domain titles from copyrighted titles shared
by permission. This importer filters to the former; check local copyright law
before redistributing outside the United States. It strips the Gutenberg
license wrapper from each in-library text and does not place Gutenberg's mark
on the generated covers.
