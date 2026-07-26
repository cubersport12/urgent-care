import type { UserOut } from '@/api/generated/types.gen';
import {
  getCurrentUser,
  loadStoredAuth,
  onAuthChange,
} from '@/lib/auth-storage';
import { signOut as apiSignOut } from '@/lib/auth-api';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  session: { access_token: string } | null;
  user: UserOut | null;
  initialized: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    void loadStoredAuth().then((u) => {
      setUser(u);
      setInitialized(true);
    });
    return onAuthChange(setUser);
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: user ? { access_token: 'stored' } : null,
      user: user ?? getCurrentUser(),
      initialized,
      signOut,
    }),
    [user, initialized, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
