import AuthForm from '../components/AuthForm';
import { catalogHash, useHashRoute } from '../hooks/useHashRoute';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { user, ready } = useAuth();
  const route = useHashRoute();
  const nextHash = route.next ? `#${route.next}` : catalogHash();

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
              Signed in as {user.email}. Browse the catalog publicly, then issue
              a title to read it.
            </p>
          </header>
          <p>
            <a className="button button--primary" href={nextHash}>
              Continue
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
      lede="Use your email and password, or continue with Google. Sign in to issue books to My Library."
      submitLabel="Log in"
      nextHash={nextHash}
      footer={
        <>
          Need an account? <a href="#/register">Register</a>
        </>
      }
    />
  );
}

export default LoginPage;
