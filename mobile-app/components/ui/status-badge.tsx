import { Fonts } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { StyleSheet, View } from 'react-native';

export type StatusType =
  | 'read'
  | 'unread'
  | 'passed'
  | 'not-passed'
  | 'success'
  | 'failure'
  | 'locked';

type StatusTone = 'good' | 'mute' | 'bad';

const config: Record<StatusType, { icon: string; text: string; tone: StatusTone }> = {
  read: { icon: 'checkmark.circle.fill', text: 'Прочитано', tone: 'good' },
  unread: { icon: 'circle', text: 'Не прочитано', tone: 'mute' },
  passed: { icon: 'checkmark.circle.fill', text: 'Пройдено', tone: 'good' },
  'not-passed': { icon: 'circle', text: 'Не пройдено', tone: 'mute' },
  success: { icon: 'trophy.fill', text: 'Успешно', tone: 'good' },
  failure: { icon: 'xmark.circle.fill', text: 'Не успешно', tone: 'bad' },
  locked: { icon: 'lock.fill', text: 'Заблокировано', tone: 'mute' },
};

export function StatusBadge({ status }: { status: StatusType }) {
  const { success, error, neutralSoft } = useAppTheme();
  const glass = useGlass();
  const c = config[status];

  const tone = {
    good: { color: success, bg: glass.successTint, border: glass.successBorder },
    mute: { color: neutralSoft, bg: glass.backgroundSubtle, border: glass.borderSubtle },
    bad: { color: error, bg: glass.dangerTint, border: glass.dangerBorder },
  }[c.tone];

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <IconSymbol name={c.icon as never} size={12} color={tone.color} />
      <ThemedText style={[styles.text, { color: tone.color }]}>{c.text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: Fonts?.sansMedium,
    fontWeight: '500',
  },
});
