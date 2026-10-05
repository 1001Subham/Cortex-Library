import AnalyticsPage from './pages/AnalyticsPage';
import BookDetailsPage from './pages/BookDetailsPage';
import CatalogPage from './pages/CatalogPage';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import RecommendationsPage from './pages/RecommendationsPage';
import ReaderPage from './pages/ReaderPage';
import RegisterPage from './pages/RegisterPage';
import SiteNav from './components/SiteNav';
import { AuthProvider } from './context/AuthContext';
import { TokenProvider } from './context/TokenContext';
import { useHashRoute } from './hooks/useHashRoute';

function AppRoutes() {
  const route = useHashRoute();
  const reading = route.name === 'reader';

  return (
    <div className={reading ? 'app app--reader' : 'app'}>
      {!reading && <SiteNav />}
      {route.name === 'reader' && <ReaderPage bookId={route.id} />}
      {route.name === 'detail' && <BookDetailsPage bookId={route.id} />}
      {route.name === 'library' && <LibraryPage />}
      {route.name === 'analytics' && <AnalyticsPage />}
      {route.name === 'recommendations' && <RecommendationsPage />}
      {route.name === 'profile' && <ProfilePage />}
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
      <TokenProvider>
        <AppRoutes />
      </TokenProvider>
    </AuthProvider>
  );
}

export default App;
