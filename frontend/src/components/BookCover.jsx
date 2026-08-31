import { useEffect, useState } from 'react';
import { coverUrlFromKey } from '../utils/coverUrl';

function BookCover({ title, coverImageKey, className }) {
  const src = coverUrlFromKey(coverImageKey);
  const [failed, setFailed] = useState(false);
  const classes = `book-cover ${className || ''}`.trim();

  useEffect(() => {
    setFailed(false);
  }, [src]);

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
      onError={() => setFailed(true)}
    />
  );
}

export default BookCover;
