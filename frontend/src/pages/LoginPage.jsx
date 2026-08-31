import AuthForm from '../components/AuthForm';
import { catalogHash, registerHash } from '../hooks/useHashRoute';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <main className="page page--auth">
        <div className="auth-panel">
          <p className="status">Checking your session…</p>
        </div>
      </main>
    );
  }

  if (user) {
    return (
      <main className="page page--auth">
        <div className="auth-panel">
          <header className="page__header">
            <p className="eyebrow">Cortex Library</p>
            <h1>You are signed in</h1>
            <p className="lede">
              Signed in as {user.email}. The catalog stays open to everyone.
            </p>
          </header>
          <p>
            <a className="button button--primary" href={catalogHash()}>
              Back to catalog
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthForm
      mode="login"
      title="Log in"
      lede="Use the email and password for your Cortex Library account."
      submitLabel="Log in"
      footer={
        <>
          Need an account? <a href={registerHash()}>Register</a>
        </>
      }
    />
  );
}

export default LoginPage;
