const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const LOCAL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeEmail(value) {
  return asTrimmedString(value).toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);

  if (!email || email.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  if (email.includes('..') || email.includes(' ')) {
    return false;
  }

  const at = email.indexOf('@');

  if (at <= 0 || at !== email.lastIndexOf('@')) {
    return false;
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (!local || local.length > MAX_LOCAL_LENGTH) {
    return false;
  }

  if (
    !LOCAL_PATTERN.test(local) ||
    local.startsWith('.') ||
    local.endsWith('.')
  ) {
    return false;
  }

  const labels = domain.split('.');

  if (labels.length < 2) {
    return false;
  }

  const tld = labels[labels.length - 1];

  if (!/^[a-z]{2,}$/i.test(tld)) {
    return false;
  }

  return labels.every((label) => DOMAIN_LABEL_PATTERN.test(label));
}

export function parseRegisterBody(body = {}) {
  const emailRaw = asTrimmedString(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!emailRaw) {
    return { error: 'email is required.' };
  }

  if (!isValidEmail(emailRaw)) {
    return { error: 'email must be a valid email address.' };
  }

  if (!password) {
    return { error: 'password is required.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      error: `password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
    };
  }

  return {
    value: {
      email: normalizeEmail(emailRaw),
      password,
    },
  };
}

export function parseLoginBody(body = {}) {
  const emailRaw = asTrimmedString(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!emailRaw) {
    return { error: 'email is required.' };
  }

  if (!isValidEmail(emailRaw)) {
    return { error: 'email must be a valid email address.' };
  }

  if (!password) {
    return { error: 'password is required.' };
  }

  return {
    value: {
      email: normalizeEmail(emailRaw),
      password,
    },
  };
}

export function parseGoogleBody(body = {}) {
  const credential = asTrimmedString(body.credential);

  if (!credential) {
    return { error: 'Google credential is required.' };
  }

  return { value: { credential } };
}

const MAX_DISPLAY_NAME_LENGTH = 120;

export function parseProfileBody(body = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'displayName is required.' };
  }

  if (!Object.hasOwn(body, 'displayName')) {
    return { error: 'displayName is required.' };
  }

  if (typeof body.displayName !== 'string') {
    return { error: 'displayName must be a string.' };
  }

  const displayName = body.displayName.trim();

  if (!displayName) {
    return { error: 'displayName cannot be empty.' };
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      error: `displayName must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`,
    };
  }

  return { value: { displayName } };
}
