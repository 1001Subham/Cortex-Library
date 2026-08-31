import { useState } from 'react';
import { catalogHash } from '../hooks/useHashRoute';
import { useAuth } from '../context/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_EMAIL_LENGTH = 254;

function validate({ email, password, mode }) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return 'Enter your email address.';
  }

  if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(trimmedEmail)) {
    return 'Enter a valid email address.';
  }

  if (!password) {
    return 'Enter your password.';
  }

  if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (mode === 'register' && password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }

  return null;
}

function AuthForm({
  mode,
  title,
  lede,
  submitLabel,
  footer,
}) {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate({ email, password, mode });

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'register') {
        await register({ email: email.trim(), password });
        setSuccess('Account created. Opening the library…');
      } else {
        await login({ email: email.trim(), password });
        setSuccess('Signed in. Opening the library…');
      }

      setPassword('');
      window.location.hash = catalogHash();
    } catch (err) {
      setError(err.message || 'Unable to complete the request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page page--auth">
      <div className="auth-panel">
        <header className="page__header">
          <p className="eyebrow">Cortex Library</p>
          <h1>{title}</h1>
          <p className="lede">{lede}</p>
        </header>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="banner banner--error" role="alert">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="banner banner--success" role="status">
            <p>{success}</p>
          </div>
        )}

        <label className="auth-field">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            maxLength={MAX_EMAIL_LENGTH}
            required
          />
        </label>

        <label className="auth-field">
          Password
          <input
            type="password"
            name="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            maxLength={MAX_PASSWORD_LENGTH}
            required
          />
        </label>

        <button className="button button--primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Please wait…' : submitLabel}
        </button>

        <p className="auth-footer">{footer}</p>
        </form>
      </div>
    </main>
  );
}

export default AuthForm;
