import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { serveBookCovers } from './vite.storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const canReadRepoRoot = fs.existsSync(path.join(repoRoot, 'docker-compose.yml'));
const envDir = canReadRepoRoot ? repoRoot : __dirname;
const storageRoot =
  process.env.BOOK_STORAGE_ROOT || path.resolve(__dirname, '../storage');

function readViteGoogleClientId(mode) {
  const rootEnv = canReadRepoRoot ? loadEnv(mode, repoRoot, 'VITE_') : {};
  const localEnv = loadEnv(mode, __dirname, 'VITE_');

  return String(
    process.env.VITE_GOOGLE_CLIENT_ID ||
      localEnv.VITE_GOOGLE_CLIENT_ID ||
      rootEnv.VITE_GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      ''
  ).trim();
}

export default defineConfig(({ mode }) => {
  const googleClientId = readViteGoogleClientId(mode);

  return {
    envDir,
    plugins: [react(), serveBookCovers(storageRoot)],
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
  };
});
