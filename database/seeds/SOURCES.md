# Development catalog sources

All seeded works were published before 1929 and are in the public domain
in the United States. Cortex Library stores a **representative excerpt**
of each work (not the complete book). Descriptions and HTML files state this.

Texts are well-known opening passages from the original publications.
They were not scraped from an unknown website. Project Gutenberg reprints
the same public-domain wording; we did not copy Gutenberg HTML, branding,
or catalog pages.

Covers are original Cortex Library SVG placeholders, not publisher artwork.

| Book | Author | First published | Excerpt | US status |
|------|--------|-----------------|---------|-----------|
| Alice's Adventures in Wonderland | Lewis Carroll | 1865, Macmillan | Chapter I | Public domain |
| The Adventures of Sherlock Holmes | Arthur Conan Doyle | 1892, George Newnes | A Scandal in Bohemia (opening) | Public domain |
| The Time Machine | H. G. Wells | 1895, William Heinemann | Chapter I | Public domain |
| Treasure Island | Robert Louis Stevenson | 1883, Cassell & Company | Chapter I | Public domain |
| Pride and Prejudice | Jane Austen | 1813, T. Egerton | Chapter I | Public domain |
| The Wonderful Wizard of Oz | L. Frank Baum | 1900, George M. Hill Company | Chapter I | Public domain |
| Dracula | Bram Stoker | 1897, Archibald Constable | Journal opening | Public domain |
| Frankenstein | Mary Wollstonecraft Shelley | 1818, Lackington et al. | Letter I | Public domain |
| A Christmas Carol | Charles Dickens | 1843, Chapman & Hall | Stave I | Public domain |
| The War of the Worlds | H. G. Wells | 1898, William Heinemann | Book One, Chapter I | Public domain |

ISBN is NULL: original editions predate the ISBN system.

Apply seed:

```
Get-Content -Raw database\seeds\001_catalog_seed.sql | docker exec -i cortex-postgres psql -U cortex_user -d cortex_library -v ON_ERROR_STOP=1
```

Optional: regenerate HTML/SVG and byte-size SQL with `node database/seeds/generate-book-files.mjs`.
