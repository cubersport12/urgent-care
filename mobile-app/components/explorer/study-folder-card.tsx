import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useAppTheme } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

type StudyFolderCardProps = {
  name: string;
  materialCount: number;
  progressPercent: number;
  onPress: () => void;
  index: number;
};

export function StudyFolderCard({
  name,
  materialCount,
  progressPercent,
  onPress,
  index,
}: StudyFolderCardProps) {
  const { primary, neutralSoft } = useAppTheme();
  const completed = Math.round((progressPercent / 100) * materialCount);
  const countLabel =
    materialCount === 1
      ? '1 материал'
      : materialCount < 5
        ? `${materialCount} материала`
        : `${materialCount} материалов`;

  return (
    <Animated.View entering={staggerEnter(index)} style={styles.wrapper}>
      <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <GlassCard padding={20} borderRadius={16}>
          <View
            style={[styles.iconCircle, { backgroundColor: 'rgba(0, 132, 255, 0.1)' }]}
          >
            <IconSymbol name="folder.fill" size={32} color={primary} />
          </View>
          <ThemedText style={styles.name}>{name}</ThemedText>
          <ThemedText style={[styles.count, { color: neutralSoft }]}>{countLabel}</ThemedText>
          <View style={styles.progress}>
            <ProgressBar current={completed} total={materialCount || 1} height={4} />
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 132, 255, 0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  count: {
    fontSize: 13,
    marginTop: 4,
  },
  progress: {
    marginTop: 12,
  },
});
