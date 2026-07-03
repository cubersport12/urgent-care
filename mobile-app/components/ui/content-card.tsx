import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { StatusBadge, type StatusType } from '@/components/ui/status-badge';
import { TypeIcon, type MaterialKind } from '@/components/ui/type-icon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/use-theme-color';
import { staggerEnter } from '@/hooks/use-enter-animation';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

type ContentCardProps = {
  title: string;
  description: string;
  kind: MaterialKind;
  status?: StatusType;
  disabled?: boolean;
  onPress?: () => void;
  index?: number;
};

export function ContentCard({
  title,
  description,
  kind,
  status,
  disabled = false,
  onPress,
  index = 0,
}: ContentCardProps) {
  const { neutralSoft } = useAppTheme();

  return (
    <Animated.View entering={staggerEnter(index)}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={({ pressed }) => [
          { opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <GlassCard padding={16} borderRadius={12} style={styles.card}>
          <View style={styles.row}>
            <TypeIcon kind={kind} size={20} />
            <View style={styles.body}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {title}
              </ThemedText>
              <ThemedText style={[styles.description, { color: neutralSoft }]} numberOfLines={1}>
                {description}
              </ThemedText>
            </View>
            {status && <StatusBadge status={status} />}
            <IconSymbol name="chevron.right" size={16} color={neutralSoft} />
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
});
