import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  analyticsHash,
  catalogHash,
  libraryHash,
  loginHash,
} from '../hooks/useHashRoute';
import { getProfile } from '../services/api';

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function signInMethods(user) {
  const methods = [];

  if (user?.hasPassword) {
    methods.push('Email and password');
  }

  if (user?.hasGoogle) {
    methods.push('Google');
  }

  return methods.length > 0 ? methods.join(' · ') : 'Not available';
}

function ProfilePage() {
  const { user, ready, logout, updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!ready || !user) {
      setProfile(null);
      setLoading(false);
      setEditing(false);
      setDisplayName('');
      setError(null);
      setNotice(null);
      setSaving(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data.user);
          setDisplayName(data.user?.displayName || '');
          setEditing(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProfile(null);
          setError(err.message || 'Unable to load your profile.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user?.id]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const nextUser = await updateProfile({ displayName });
      setProfile(nextUser);
      setDisplayName(nextUser.displayName || '');
      setEditing(false);
      setNotice('Profile saved.');
    } catch (err) {
      setError(err.message || 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDisplayName(profile?.displayName || '');
    setEditing(false);
    setError(null);
  }

  if (!ready) {
    return (
      <main className="page page--profile">
        <p className="status">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page page--profile">
        <header className="page__header">
          <p className="eyebrow">Profile</p>
          <h1>Your account</h1>
          <p className="lede">
            Sign in to view your Cortex Library account details. Profile data
            stays on your account only.
          </p>
        </header>
        <div className="banner banner--error" role="status">
          <p>Log in to view and manage your profile.</p>
        </div>
        <a className="button button--primary" href={loginHash('/profile')}>
          Log in
        </a>
      </main>
    );
  }

  if (loading && !profile) {
    return (
      <main className="page page--profile">
        <p className="status">Loading your profile…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page page--profile">
        <header className="page__header">
          <p className="eyebrow">Profile</p>
          <h1>Your account</h1>
        </header>
        {error && (
          <div className="banner banner--error" role="alert">
            <p>{error}</p>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="page page--profile">
      <header className="page__header">
        <p className="eyebrow">Profile</p>
        <h1>Your account</h1>
        <p className="lede">
          Account details for {profile.email}. Email is your sign-in identity
          and cannot be changed here.
        </p>
        <div className="hero__actions">
          <a className="button button--ghost" href={libraryHash()}>
            My Library
          </a>
          <a className="button button--ghost" href={analyticsHash()}>
            Analytics
          </a>
          <a className="button button--ghost" href={catalogHash()}>
            Catalog
          </a>
        </div>
      </header>

      {error && (
        <div className="banner banner--error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div className="banner banner--success" role="status">
          <p>{notice}</p>
        </div>
      )}

      <section className="profile-card">
        <div className="profile-card__identity">
          <span className="site-nav__avatar" aria-hidden="true">
            {(profile.displayName || profile.email).slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h2>{profile.displayName || 'Name not set'}</h2>
            <p>{profile.email}</p>
          </div>
        </div>

        {editing ? (
          <form className="profile-form" onSubmit={handleSave}>
            <label className="auth-field">
              Name
              <input
                type="text"
                name="displayName"
                autoComplete="name"
                maxLength={120}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={saving}
                required
              />
            </label>
            <div className="hero__actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="profile-dl">
            <div>
              <dt>Name</dt>
              <dd>{profile.displayName || 'Not set'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Sign-in</dt>
              <dd>{signInMethods(profile)}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(profile.createdAt)}</dd>
            </div>
          </dl>
        )}

        <div className="hero__actions">
          {!editing ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setNotice(null);
                setError(null);
                setDisplayName(profile.displayName || '');
                setEditing(true);
              }}
            >
              Edit
            </button>
          ) : null}
          <button type="button" className="button button--ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;
