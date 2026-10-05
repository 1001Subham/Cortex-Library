import { useEffect, useState } from 'react';
import { coverUrlFromKey } from '../utils/coverUrl';

function BookCover({ title, coverImageKey, className }) {
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallbackKey = typeof coverImageKey === 'string'
    ? coverImageKey.replace(/\.(?:jpe?g|png|webp)$/i, '.svg')
    : null;
  const src = coverUrlFromKey(useSvgFallback ? fallbackKey : coverImageKey);
  const classes = `book-cover ${className || ''}`.trim();

  useEffect(() => {
    setUseSvgFallback(false);
    setFailed(false);
  }, [coverImageKey]);

  if (!src || failed) {
    return (
      <div className={`${classes} book-cover--fallback`}>
        <span>{title?.slice(0, 1) || '?'}</span>
      </div>
    );
  }

  return (
    <img
      className={classes}
      src={src}
      alt={`${title} cover`}
      onError={() => {
        if (!useSvgFallback && fallbackKey !== coverImageKey) setUseSvgFallback(true);
        else setFailed(true);
      }}
    />
  );
}

export default BookCover;
