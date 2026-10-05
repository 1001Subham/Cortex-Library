import { useEffect, useRef, useState } from 'react';
import { getGoogleClientId, renderGoogleButton } from '../auth/googleIdentity';
import { useAuth } from '../context/AuthContext';

function GoogleSignInButton({ disabled, onError, onSuccess }) {
  const { loginWithGoogle } = useAuth();
  const hostRef = useRef(null);
  const [readyError, setReadyError] = useState(null);
  const configured = Boolean(getGoogleClientId());

  useEffect(() => {
    if (!configured || disabled || !hostRef.current) {
      return undefined;
    }

    let cancelled = false;

    renderGoogleButton(hostRef.current, async (credential, renderError) => {
      if (cancelled) {
        return;
      }

      if (renderError || !credential) {
        onError?.(renderError?.message || 'Google sign-in was cancelled.');
        return;
      }

      try {
        await loginWithGoogle(credential);
        onSuccess?.();
      } catch (error) {
        onError?.(error.message || 'Google sign-in failed.');
      }
    }).catch((error) => {
      if (!cancelled) {
        setReadyError(error.message || 'Google sign-in is not available.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [configured, disabled, loginWithGoogle, onError, onSuccess]);

  if (!configured) {
    return (
      <p className="auth-google__hint">
        Google sign-in is not configured for this environment. Add the same
        Google Cloud OAuth Web client ID to <code>GOOGLE_CLIENT_ID</code> and
        {' '}
        <code>VITE_GOOGLE_CLIENT_ID</code> in the project root <code>.env</code>,
        then recreate the frontend and backend containers.
      </p>
    );
  }

  return (
    <div className="auth-google">
      {readyError ? <p className="auth-google__hint">{readyError}</p> : null}
      <div ref={hostRef} className="auth-google__button" />
    </div>
  );
}

export default GoogleSignInButton;
