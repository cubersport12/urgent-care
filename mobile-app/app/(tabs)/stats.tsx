import { AccountOverallStats } from '@/components/profile/account-overall-stats';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAccountOverallStats } from '@/hooks/api/useAccountOverallStats';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useIsFocused } from '@react-navigation/native';

export default function StatsScreen() {
  const goHome = () => router.navigate('/(tabs)');
  const isFocused = useIsFocused();
  useChromeBack(isFocused ? goHome : null);
  const { contentPaddingBottom } = useNavRail();
  const stats = useAccountOverallStats();

  return (
    <ScreenBackground style={styles.root}>
      <View style={styles.flex}>
        <ScreenAppBar title="Статистика" onBack={goHome} showBack={isFocused} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <AccountOverallStats stats={stats} />
        </ScrollView>
        {stats.isLoading && <LoadingOverlay />}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 16,
  },
});
