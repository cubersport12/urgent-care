import { AccountOverallStats } from '@/components/profile/account-overall-stats';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useGlow } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

export default function StatsScreen() {
  const glow = useGlow();
  const { contentPaddingBottom } = useNavRail();

  return (
    <ScreenBackground style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={staggerEnter(0)}>
          <ThemedText
            type="h1"
            style={{
              textShadowColor: glow.title,
              textShadowRadius: 20,
              textShadowOffset: { width: 0, height: 0 },
            }}
          >
            Статистика
          </ThemedText>
        </Animated.View>
        <AccountOverallStats />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 16,
  },
});
