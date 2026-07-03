import { Fonts } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View } from 'react-native';

export type StatusType =
  | 'read'
  | 'unread'
  | 'passed'
  | 'not-passed'
  | 'success'
  | 'failure'
  | 'locked';

const config: Record<
  StatusType,
  { icon: string; text: string; color: string; bg: string; border: string }
> = {
  read: {
    icon: 'checkmark.circle.fill',
    text: 'Прочитано',
    color: '#4D8B31',
    bg: 'rgba(77, 139, 49, 0.1)',
    border: 'rgba(77, 139, 49, 0.2)',
  },
  unread: {
    icon: 'circle',
    text: 'Не прочитано',
    color: '#7E7E7E',
    bg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  passed: {
    icon: 'checkmark.circle.fill',
    text: 'Пройдено',
    color: '#4D8B31',
    bg: 'rgba(77, 139, 49, 0.1)',
    border: 'rgba(77, 139, 49, 0.2)',
  },
  'not-passed': {
    icon: 'circle',
    text: 'Не пройдено',
    color: '#7E7E7E',
    bg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  success: {
    icon: 'trophy.fill',
    text: 'Успешно',
    color: '#4D8B31',
    bg: 'rgba(77, 139, 49, 0.1)',
    border: 'rgba(77, 139, 49, 0.2)',
  },
  failure: {
    icon: 'xmark.circle.fill',
    text: 'Не успешно',
    color: '#FF6B6B',
    bg: 'rgba(255, 107, 107, 0.1)',
    border: 'rgba(255, 107, 107, 0.2)',
  },
  locked: {
    icon: 'lock.fill',
    text: 'Заблокировано',
    color: '#7E7E7E',
    bg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
};

export function StatusBadge({ status }: { status: StatusType }) {
  const c = config[status];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <IconSymbol name={c.icon as never} size={12} color={c.color} />
      <ThemedText style={[styles.text, { color: c.color }]}>{c.text}</ThemedText>
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
