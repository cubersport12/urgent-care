import { AccountOverallStats } from '@/components/profile/account-overall-stats';
import { BackButton } from '@/components/explorer/back-button';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAccountOverallStats } from '@/hooks/api/useAccountOverallStats';
import { useGlow } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useIsFocused } from '@react-navigation/native';

export default function StatsScreen() {
  const goHome = () => router.navigate('/(tabs)');
  const isFocused = useIsFocused();
  useChromeBack(isFocused ? goHome : null);
  const { contentPaddingBottom, isWide } = useNavRail();
  const glow = useGlow();
  const stats = useAccountOverallStats();

  return (
    <ScreenBackground style={styles.root}>
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {!isWide && <BackButton onPress={goHome} label="Назад" />}
          <Animated.View entering={staggerEnter(0)}>
            <ThemedText
              type="h1"
              style={{
                textShadowColor: glow.title,
                textShadowRadius: 20,
                textShadowOffset: { width: 0, height: 0 },
                marginBottom: Spacing.card,
              }}
            >
              Статистика
            </ThemedText>
          </Animated.View>
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
