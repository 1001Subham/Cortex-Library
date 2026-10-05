import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';
import pool, { closeDatabasePool } from '../config/database.js';

const prefix = Buffer.from([0xff, 0xd8, 0xff]);

try {
  const books = await pool.query(
    `SELECT id FROM books WHERE cover_image_key LIKE '%.svg' ORDER BY id`
  );
  let updated = 0;
  let missing = 0;
  for (const { id } of books.rows) {
    const imagePath = path.join(config.bookStorageRoot, 'books', id, 'cover.jpg');
    let bytes;
    try {
      bytes = await fs.readFile(imagePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        missing += 1;
        continue;
      }
      throw error;
    }
    if (bytes.length < 3 || !bytes.subarray(0, 3).equals(prefix)) {
      console.warn(`Skipping invalid JPEG for ${id}; existing SVG remains active.`);
      missing += 1;
      continue;
    }
    const result = await pool.query(
      `UPDATE books SET cover_image_key = $2
       WHERE id = $1 AND cover_image_key LIKE '%.svg'`,
      [id, `storage/books/${id}/cover.jpg`]
    );
    updated += result.rowCount;
  }
  console.log(JSON.stringify({ checked: books.rowCount, updated, missing }, null, 2));
} finally {
  await closeDatabasePool();
}
