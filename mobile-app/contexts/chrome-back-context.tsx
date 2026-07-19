import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

type ChromeBackHandler = () => void;

type StackEntry = {
  id: string;
  handler: ChromeBackHandler;
};

type ChromeBackContextType = {
  chromeBack: ChromeBackHandler | null;
  registerChromeBack: (id: string, handler: ChromeBackHandler) => void;
  unregisterChromeBack: (id: string) => void;
};

const ChromeBackContext = createContext<ChromeBackContextType>({
  chromeBack: null,
  registerChromeBack: () => {},
  unregisterChromeBack: () => {},
});

export function ChromeBackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const handlersRef = useRef<Map<string, ChromeBackHandler>>(new Map());

  const registerChromeBack = useCallback((id: string, handler: ChromeBackHandler) => {
    handlersRef.current.set(id, handler);
    setStack((prev) => {
      const without = prev.filter((e) => e.id !== id);
      return [...without, { id, handler }];
    });
  }, []);

  const unregisterChromeBack = useCallback((id: string) => {
    handlersRef.current.delete(id);
    setStack((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const top = stack[stack.length - 1];
  const chromeBack = useMemo(() => {
    if (!top) return null;
    return () => {
      handlersRef.current.get(top.id)?.();
    };
  }, [top]);

  const value = useMemo(
    () => ({ chromeBack, registerChromeBack, unregisterChromeBack }),
    [chromeBack, registerChromeBack, unregisterChromeBack],
  );

  return (
    <ChromeBackContext.Provider value={value}>{children}</ChromeBackContext.Provider>
  );
}

export function useChromeBackContext() {
  return useContext(ChromeBackContext);
}

/**
 * Registers a chrome-level Back handler for the tablet nav rail.
 * Uses a stack so nested screens don't clear each other's handlers.
 */
export function useChromeBack(handler: ChromeBackHandler | null | undefined) {
  const { registerChromeBack, unregisterChromeBack } = useChromeBackContext();
  const id = useId();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!handler) {
      unregisterChromeBack(id);
      return;
    }

    const stable = () => {
      handlerRef.current?.();
    };
    registerChromeBack(id, stable);

    return () => {
      unregisterChromeBack(id);
    };
  }, [!!handler, id, registerChromeBack, unregisterChromeBack]);
}
