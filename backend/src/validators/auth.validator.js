const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_EMAIL_LENGTH = 254;

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseRegisterBody(body = {}) {
  const emailRaw = asTrimmedString(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!emailRaw) {
    return { error: 'email is required.' };
  }

  if (emailRaw.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(emailRaw)) {
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
      email: emailRaw.toLowerCase(),
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

  if (emailRaw.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(emailRaw)) {
    return { error: 'email must be a valid email address.' };
  }

  if (!password) {
    return { error: 'password is required.' };
  }

  return {
    value: {
      email: emailRaw.toLowerCase(),
      password,
    },
  };
}
