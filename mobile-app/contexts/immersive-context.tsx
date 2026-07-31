import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type ImmersiveContextValue = {
  isImmersive: boolean;
  setImmersive: (value: boolean) => void;
};

const ImmersiveContext = createContext<ImmersiveContextValue | null>(null);

export function ImmersiveProvider({ children }: { children: React.ReactNode }) {
  const [isImmersive, setIsImmersive] = useState(false);
  const setImmersive = useCallback((value: boolean) => {
    setIsImmersive(value);
  }, []);
  const value = useMemo(
    () => ({ isImmersive, setImmersive }),
    [isImmersive, setImmersive],
  );
  return (
    <ImmersiveContext.Provider value={value}>{children}</ImmersiveContext.Provider>
  );
}

export function useImmersive(): ImmersiveContextValue {
  const ctx = useContext(ImmersiveContext);
  if (!ctx) {
    throw new Error('useImmersive must be used within ImmersiveProvider');
  }
  return ctx;
}

/** Keep immersive flag in sync while `active` is true; clears on unmount. */
export function useImmersiveMode(active: boolean) {
  const { setImmersive } = useImmersive();
  useEffect(() => {
    setImmersive(active);
    return () => setImmersive(false);
  }, [active, setImmersive]);
}
