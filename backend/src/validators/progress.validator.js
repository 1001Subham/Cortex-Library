const MAX_PERCENT = 100;
const MIN_PERCENT = 0;

export function parseProgressBody(body = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'progressPercent is required.' };
  }

  if (!Object.hasOwn(body, 'progressPercent')) {
    return { error: 'progressPercent is required.' };
  }

  const raw = body.progressPercent;

  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return { error: 'progressPercent must be a finite number.' };
  }

  if (raw < MIN_PERCENT) {
    return { error: 'progressPercent cannot be negative.' };
  }

  if (raw > MAX_PERCENT) {
    return { error: 'progressPercent cannot be greater than 100.' };
  }

  const progressPercent = Math.round(raw * 100) / 100;

  return { value: { progressPercent } };
}
