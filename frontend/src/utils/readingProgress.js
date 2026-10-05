export function getWindowProgressPercent() {
  const max = document.documentElement.scrollHeight - window.innerHeight;

  if (max <= 0) {
    return 0;
  }

  const percent = (window.scrollY / max) * 100;
  return Math.min(100, Math.max(0, Math.round(percent * 100) / 100));
}

export function setWindowProgressPercent(percent) {
  const value = Number(percent);

  if (!Number.isFinite(value) || value <= 0) {
    return;
  }

  const max = document.documentElement.scrollHeight - window.innerHeight;

  if (max <= 0) {
    return;
  }

  window.scrollTo(0, (Math.min(100, value) / 100) * max);
}

export function displayProgressPercent(percent) {
  if (percent === null || percent === undefined) {
    return null;
  }

  const value = Number(percent);

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.round(value);
}

export function progressStatusLabel(percent) {
  const shown = displayProgressPercent(percent);

  if (shown === null || shown <= 0) {
    return 'Not started';
  }

  if (shown >= 100) {
    return 'Completed';
  }

  return `${shown}% complete`;
}
