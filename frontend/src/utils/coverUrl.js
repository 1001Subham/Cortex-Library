const COVER_KEY =
  /^storage\/books\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/cover\.(svg|jpg|jpeg|png|webp)$/i;

export function coverUrlFromKey(coverImageKey) {
  if (typeof coverImageKey !== 'string' || !COVER_KEY.test(coverImageKey)) {
    return null;
  }

  return `/${coverImageKey}`;
}
