import BookDetailsPage from './pages/BookDetailsPage';
import CatalogPage from './pages/CatalogPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ReaderPage from './pages/ReaderPage';
import RegisterPage from './pages/RegisterPage';
import SiteNav from './components/SiteNav';
import { AuthProvider } from './context/AuthContext';
import { useHashRoute } from './hooks/useHashRoute';

function AppRoutes() {
  const route = useHashRoute();

  return (
    <div className="app">
      <SiteNav />
      {route.name === 'reader' && <ReaderPage bookId={route.id} />}
      {route.name === 'detail' && <BookDetailsPage bookId={route.id} />}
      {route.name === 'status' && <HomePage />}
      {route.name === 'login' && <LoginPage />}
      {route.name === 'register' && <RegisterPage />}
      {route.name === 'catalog' && <CatalogPage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
