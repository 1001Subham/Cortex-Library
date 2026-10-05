const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const LOCAL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
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
