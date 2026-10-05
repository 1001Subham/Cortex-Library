import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadPublicDomainCover, publicDomainCoverUrl } from './services/gutenbergCover.service.js';

const coverMetadata = {
  id: 1234,
  copyright: false,
  formats: {
    'image/jpeg': 'https://www.gutenberg.org/cache/epub/1234/pg1234.cover.medium.jpg',
  },
};

test('only explicitly public-domain official Gutenberg cover URLs are accepted', () => {
  assert.equal(publicDomainCoverUrl(coverMetadata), coverMetadata.formats['image/jpeg']);
  assert.equal(publicDomainCoverUrl({ ...coverMetadata, copyright: true }), null);
  assert.equal(publicDomainCoverUrl({ ...coverMetadata, formats: { 'image/jpeg': 'http://www.gutenberg.org/cache/epub/1234/pg1234.cover.medium.jpg' } }), null);
  assert.equal(publicDomainCoverUrl({ ...coverMetadata, formats: { 'image/jpeg': 'https://images.example.test/cover.jpg' } }), null);
  assert.equal(publicDomainCoverUrl({ ...coverMetadata, formats: { 'image/jpeg': 'https://www.gutenberg.org/cache/epub/1234/not-the-cover.jpg' } }), null);
});

test('official cover is downloaded as bounded JPEG bytes for local storage', async () => {
  const expected = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
  let requestedUrl;
  const bytes = await downloadPublicDomainCover(coverMetadata, {
    fetchImpl: async (url) => {
      requestedUrl = url;
      return new Response(expected, {
        status: 200,
        headers: { 'content-type': 'image/jpeg', 'content-length': String(expected.length) },
      });
    },
  });
  assert.equal(requestedUrl, coverMetadata.formats['image/jpeg']);
  assert.deepEqual(bytes, expected);
});

test('cover downloader rejects non-image payloads', async () => {
  await assert.rejects(
    downloadPublicDomainCover(coverMetadata, {
      fetchImpl: async () => new Response('<html>not a cover</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    }),
    /not an image\/jpeg/
  );
});
