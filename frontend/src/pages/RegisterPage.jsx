import AuthForm from '../components/AuthForm';
import { catalogHash, loginHash } from '../hooks/useHashRoute';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <main className="page page--auth">
        <p className="status">Checking your session…</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="page page--auth">
        <header className="page__header">
          <p className="eyebrow">Cortex Library</p>
          <h1>You already have an account</h1>
          <p className="lede">Signed in as {user.email}.</p>
        </header>
        <p>
          <a className="button button--primary" href={catalogHash()}>
            Back to catalog
          </a>
        </p>
      </main>
    );
  }

  return (
    <AuthForm
      mode="register"
      title="Create an account"
      lede="Register with an email address and a password of at least 8 characters."
      submitLabel="Register"
      footer={
        <>
          Already registered? <a href={loginHash()}>Log in</a>
        </>
      }
    />
  );
}

export default RegisterPage;
