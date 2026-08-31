import { catalogHash, loginHash, registerHash } from '../hooks/useHashRoute';
import { useAuth } from '../context/AuthContext';

function SiteNav() {
  const { user, ready, logout } = useAuth();

  return (
    <nav className="site-nav">
      <a className="site-nav__brand" href={catalogHash()}>
        Cortex Library
      </a>
      <div className="site-nav__links">
        <a href={catalogHash()}>Catalog</a>
        <a href="#/status">System status</a>
        {ready && user ? (
          <>
            <span className="site-nav__email">{user.email}</span>
            <button type="button" className="site-nav__logout" onClick={logout}>
              Log out
            </button>
          </>
        ) : null}
        {ready && !user ? (
          <>
            <a href={loginHash()}>Log in</a>
            <a href={registerHash()}>Register</a>
          </>
        ) : null}
      </div>
    </nav>
  );
}

export default SiteNav;
