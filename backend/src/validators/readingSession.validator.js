const MAX_ELAPSED_SECONDS = 60;
const MIN_ELAPSED_SECONDS = 0;

export { MAX_ELAPSED_SECONDS };

export function parseElapsedBody(body = {}, { required = true } = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'elapsedSeconds must be a finite number.' };
  }

  if (!Object.hasOwn(body, 'elapsedSeconds')) {
    if (!required) {
      return { value: { elapsedSeconds: 0 } };
    }

    return { error: 'elapsedSeconds is required.' };
  }

  const raw = body.elapsedSeconds;

  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return { error: 'elapsedSeconds must be a finite number.' };
  }

  if (raw < MIN_ELAPSED_SECONDS) {
    return { error: 'elapsedSeconds cannot be negative.' };
  }

  if (raw > MAX_ELAPSED_SECONDS) {
    return { error: 'elapsedSeconds cannot be greater than 60.' };
  }

  return { value: { elapsedSeconds: Math.floor(raw) } };
}
