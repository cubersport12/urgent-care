import { NavRail } from '@/constants/theme';
import { useWideLayout } from '@/hooks/use-wide-layout';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavRailContextType = {
  isWide: boolean;
  expanded: boolean;
  toggleExpanded: () => void;
  /** Ширина зоны иконок (без выреза камеры) */
  railWidth: number;
  /** Полная ширина rail включая left safe-area (вырез/камера) */
  railOuterWidth: number;
  contentPaddingLeft: number;
  contentPaddingBottom: number;
};

const NavRailContext = createContext<NavRailContextType>({
  isWide: false,
  expanded: false,
  toggleExpanded: () => {},
  railWidth: 0,
  railOuterWidth: 0,
  contentPaddingLeft: 0,
  contentPaddingBottom: 96,
});

export function NavRailProvider({ children }: { children: ReactNode }) {
  const { isWide } = useWideLayout();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const railWidth = isWide
    ? expanded
      ? NavRail.expandedWidth
      : NavRail.collapsedWidth
    : 0;

  // Когда камера/вырез слева — добавляем inset к ширине rail, чтобы иконки не уезжали под notch
  const leftInset = isWide ? insets.left : 0;
  const railOuterWidth = railWidth + leftInset;

  const value = useMemo(
    () => ({
      isWide,
      expanded,
      toggleExpanded,
      railWidth,
      railOuterWidth,
      contentPaddingLeft: railOuterWidth,
      contentPaddingBottom: isWide ? 24 : 96,
    }),
    [isWide, expanded, toggleExpanded, railWidth, railOuterWidth],
  );

  return <NavRailContext.Provider value={value}>{children}</NavRailContext.Provider>;
}

export function useNavRail() {
  return useContext(NavRailContext);
}
