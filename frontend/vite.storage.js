import fs from 'node:fs';
import path from 'node:path';

const COVER_URL =
  /^\/storage\/books\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/cover\.(svg|jpg|jpeg|png|webp)$/i;

const CONTENT_TYPES = {
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function serveBookCovers(storageRoot) {
  return {
    name: 'serve-book-covers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0];
        const match = urlPath.match(COVER_URL);

        if (!match) {
          next();
          return;
        }

        const bookId = match[1].toLowerCase();
        const extension = match[2].toLowerCase();
        const booksRoot = path.resolve(storageRoot, 'books');
        const filePath = path.resolve(booksRoot, bookId, `cover.${extension}`);

        if (!filePath.startsWith(`${booksRoot}${path.sep}`)) {
          res.statusCode = 403;
          res.end();
          return;
        }

        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end();
          return;
        }

        res.setHeader('Content-Type', CONTENT_TYPES[extension] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}
