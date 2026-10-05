import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { getTokens } from '../services/api';

const TokenContext = createContext(null);

export function TokenProvider({ children }) {
  const { user, ready } = useAuth();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshTokens = useCallback(async () => {
    if (!user) {
      setAccount(null);
      return null;
    }

    setLoading(true);

    try {
      const data = await getTokens();
      setAccount(data);
      return data;
    } catch {
      setAccount(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      setAccount(null);
      return;
    }

    refreshTokens();
  }, [ready, refreshTokens, user]);

  const value = useMemo(
    () => ({
      account,
      balance: account?.balance ?? null,
      issueCost: account?.issueCost ?? null,
      transactions: account?.transactions ?? [],
      loading,
      refreshTokens,
    }),
    [account, loading, refreshTokens]
  );

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>;
}

export function useTokens() {
  const context = useContext(TokenContext);

  if (!context) {
    throw new Error('useTokens must be used within TokenProvider');
  }

  return context;
}
