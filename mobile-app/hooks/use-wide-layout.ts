import { NavRail } from '@/constants/theme';
import { useWindowDimensions } from 'react-native';

export function useWideLayout() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= NavRail.breakpoint;

  return { isWide, width, height };
}
