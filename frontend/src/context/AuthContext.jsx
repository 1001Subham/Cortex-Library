import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearStoredToken, getStoredToken, setStoredToken } from '../auth/tokenStorage';
import {
  getMe,
  loginAccount,
  loginWithGoogleAccount,
  registerAccount,
  updateProfile as updateProfileRequest,
} from '../services/api';

const AuthContext = createContext(null);

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    hasPassword: Boolean(user.hasPassword),
    hasGoogle: Boolean(user.hasGoogle),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const applySession = useCallback((token, nextUser) => {
    setStoredToken(token);
    setUser(toPublicUser(nextUser));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getStoredToken();

      if (!token) {
        if (!cancelled) {
          setReady(true);
        }
        return;
      }

      try {
        const data = await getMe();
        if (!cancelled) {
          setUser(toPublicUser(data.user));
        }
      } catch (error) {
        if (!cancelled && error.status === 401) {
          clearStoredToken();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(
    async ({ email, password }) => {
      const data = await registerAccount({ email, password });
      applySession(data.token, data.user);
      return toPublicUser(data.user);
    },
    [applySession]
  );

  const login = useCallback(
    async ({ email, password }) => {
      const data = await loginAccount({ email, password });
      applySession(data.token, data.user);
      return toPublicUser(data.user);
    },
    [applySession]
  );

  const loginWithGoogle = useCallback(
    async (credential) => {
      const data = await loginWithGoogleAccount(credential);
      applySession(data.token, data.user);
      return toPublicUser(data.user);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(async ({ displayName }) => {
    const data = await updateProfileRequest({ displayName });
    setUser(toPublicUser(data.user));
    return toPublicUser(data.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user),
      register,
      login,
      loginWithGoogle,
      logout,
      updateProfile,
    }),
    [user, ready, register, login, loginWithGoogle, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
