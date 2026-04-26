import ParallaxScrollView from '@/components/parallax-scroll-view';
import { AccountOverallStats } from '@/components/profile/account-overall-stats';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/use-theme-color';

export default function StatsScreen() {
  const {
    layout2: headerBackground,
    neutral: headerIcon,
  } = useAppTheme();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBackground, dark: headerBackground }}
      headerImage={<IconSymbol size={300} color={headerIcon} name="chart.pie.fill" />}
    >
      <AccountOverallStats />
    </ParallaxScrollView>
  );
}

