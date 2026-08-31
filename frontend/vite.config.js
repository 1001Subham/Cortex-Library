import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { serveBookCovers } from './vite.storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageRoot =
  process.env.BOOK_STORAGE_ROOT || path.resolve(__dirname, '../storage');

export default defineConfig({
  plugins: [react(), serveBookCovers(storageRoot)],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
