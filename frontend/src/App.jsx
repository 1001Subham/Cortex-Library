import BookDetailsPage from './pages/BookDetailsPage';
import CatalogPage from './pages/CatalogPage';
import HomePage from './pages/HomePage';
import { catalogHash, useHashRoute } from './hooks/useHashRoute';

function App() {
  const route = useHashRoute();

  return (
    <div className="app">
      <nav className="site-nav">
        <a className="site-nav__brand" href={catalogHash()}>
          Cortex Library
        </a>
        <div className="site-nav__links">
          <a href={catalogHash()}>Catalog</a>
          <a href="#/status">System status</a>
        </div>
      </nav>
      {route.name === 'detail' && <BookDetailsPage bookId={route.id} />}
      {route.name === 'status' && <HomePage />}
      {route.name === 'catalog' && <CatalogPage />}
    </div>
  );
}

export default App;
