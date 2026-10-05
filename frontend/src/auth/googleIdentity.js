const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const PLACEHOLDER_CLIENT_IDS = new Set([
  '',
  'changeme',
  'change_me',
  'your-client-id',
  'your_google_client_id',
]);

let scriptPromise = null;

export function getGoogleClientId() {
  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  if (PLACEHOLDER_CLIENT_IDS.has(clientId.toLowerCase())) {
    return '';
  }

  return clientId;
}

export function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in is not available.'));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);

      if (existing) {
        existing.addEventListener('load', () => resolve(window.google), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('Unable to load Google sign-in.')),
          { once: true }
        );
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Unable to load Google sign-in.'));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

export async function renderGoogleButton(element, onCredential) {
  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error('Google sign-in is not configured.');
  }

  const google = await loadGoogleIdentityScript();

  if (!google?.accounts?.id) {
    throw new Error('Google sign-in is not available.');
  }

  google.accounts.id.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    callback: (response) => {
      if (!response?.credential) {
        onCredential(null, new Error('Google sign-in was cancelled.'));
        return;
      }

      onCredential(response.credential);
    },
    cancel_on_tap_outside: true,
    auto_select: false,
  });

  element.replaceChildren();
  const width = Math.min(400, Math.max(element.clientWidth || 320, 280));
  google.accounts.id.renderButton(element, {
    theme: 'filled_black',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width,
  });
}
