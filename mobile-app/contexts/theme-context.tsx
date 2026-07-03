import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = '@app/theme-preference';

type ThemeContextType = {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  isThemeLoaded: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  themePreference: 'system',
  setThemePreference: () => {},
  isThemeLoaded: false,
});

function resolveTheme(preference: ThemePreference, systemScheme: Theme | null | undefined): Theme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemePreferenceState(stored);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setIsThemeLoaded(true);
      }
    };

    void loadPreference();
  }, []);

  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  const theme = useMemo(
    () => resolveTheme(themePreference, systemColorScheme),
    [themePreference, systemColorScheme],
  );

  const value = useMemo(
    () => ({
      theme,
      themePreference,
      setThemePreference,
      isThemeLoaded,
    }),
    [theme, themePreference, setThemePreference, isThemeLoaded],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
