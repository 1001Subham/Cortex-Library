import { fetchGutenbergWithRetry } from './gutenbergCatalogImportRunner.js';

const MAX_COVER_BYTES = 8 * 1024 * 1024;

export function publicDomainCoverUrl(metadata) {
  if (metadata?.copyright !== false || !Number.isInteger(metadata.id)) return null;

  const url = metadata.formats?.['image/jpeg'];
  if (typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'www.gutenberg.org' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== `/cache/epub/${metadata.id}/pg${metadata.id}.cover.medium.jpg`
    ) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

async function readBoundedBody(response, maxBytes) {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Cover image exceeds the ${maxBytes} byte size limit.`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Cover response has no readable body.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`Cover image exceeds the ${maxBytes} byte size limit.`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

export async function downloadPublicDomainCover(metadata, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 20_000,
  attempts = 3,
  maxBytes = MAX_COVER_BYTES,
} = {}) {
  const url = publicDomainCoverUrl(metadata);
  if (!url) return null;

  const response = await fetchGutenbergWithRetry(url, {
    fetchImpl,
    headers: { 'User-Agent': 'CortexLibrary public-domain cover import' },
    attempts,
    timeoutMs,
    baseDelayMs: 1_000,
    maxDelayMs: 5_000,
  });

  const finalUrl = new URL(response.url || url);
  if (finalUrl.protocol !== 'https:' || finalUrl.hostname !== 'www.gutenberg.org') {
    throw new Error('Gutenberg cover redirected outside the trusted HTTPS host.');
  }
  if (!/^image\/jpeg(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
    throw new Error('Gutenberg cover response was not an image/jpeg.');
  }

  const bytes = await readBoundedBody(response, maxBytes);
  if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new Error('Gutenberg cover response did not contain a valid JPEG signature.');
  }
  return bytes;
}
