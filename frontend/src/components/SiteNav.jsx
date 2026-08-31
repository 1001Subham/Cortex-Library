import {
  catalogHash,
  loginHash,
  registerHash,
  useHashRoute,
} from '../hooks/useHashRoute';
import { useAuth } from '../context/AuthContext';

function SiteNav() {
  const { user, ready, logout } = useAuth();
  const route = useHashRoute();
  const initial = user?.email?.slice(0, 1).toUpperCase() || '';

  return (
    <nav className="site-nav">
      <div className="site-nav__inner">
        <a className="site-nav__brand" href={catalogHash()}>
          <span className="site-nav__mark" aria-hidden="true">
            C
          </span>
          <span>
            Cortex <em>Library</em>
          </span>
        </a>
        <div className="site-nav__links">
          <a
            href={catalogHash()}
            className={route.name === 'catalog' ? 'is-active' : undefined}
            aria-current={route.name === 'catalog' ? 'page' : undefined}
          >
            Catalog
          </a>
          <a
            href="#/status"
            className={route.name === 'status' ? 'is-active' : undefined}
            aria-current={route.name === 'status' ? 'page' : undefined}
          >
            Status
          </a>
          {ready && user ? (
            <div className="site-nav__user">
              <span className="site-nav__avatar" aria-hidden="true">
                {initial}
              </span>
              <span className="site-nav__email">{user.email}</span>
              <button type="button" className="site-nav__logout" onClick={logout}>
                Log out
              </button>
            </div>
          ) : null}
          {ready && !user ? (
            <>
              <a
                href={loginHash()}
                className={route.name === 'login' ? 'is-active' : undefined}
              >
                Log in
              </a>
              <a className="button button--primary button--small" href={registerHash()}>
                Register
              </a>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

export default SiteNav;
