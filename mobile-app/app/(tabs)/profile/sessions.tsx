import { fetchSessions } from '@/lib/auth-api';
import { getSessionId } from '@/lib/auth-storage';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { SessionOut } from '@/api/generated/types.gen';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ended_at / expires_at -> человекочитаемый статус строки */
function sessionStatus(s: SessionOut): { label: string; ended: boolean } {
  if (s.ended_at) return { label: `Завершена ${formatWhen(s.ended_at)}`, ended: true };
  if (new Date(s.expires_at) <= new Date()) return { label: 'Истекла', ended: true };
  return { label: 'Активна', ended: false };
}

export default function SessionsScreen() {
  const { neutralSoft, primary } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const [sessions, setSessions] = useState<SessionOut[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchSessions()
        .then((s) => alive && setSessions(s))
        .catch(() => alive && setSessions([]));
      return () => {
        alive = false;
      };
    }, []),
  );

  const currentId = getSessionId();

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="Активные сессии" backFallbackHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.hint, { color: neutralSoft }]}>
          Одновременно активна одна сессия: вход на новом устройстве завершает сессию на
          предыдущем. Ниже — текущая и все предыдущие сессии.
        </ThemedText>
        {sessions === null ? (
          <ActivityIndicator style={styles.spinner} />
        ) : sessions.length === 0 ? (
          <ThemedText style={[styles.empty, { color: neutralSoft }]}>
            Нет сессий
          </ThemedText>
        ) : (
          <GlassCard padding={0} borderRadius={16}>
            {sessions.map((s, idx) => {
              const isCurrent = s.id === currentId;
              const status = sessionStatus(s);
              return (
                <View key={s.id}>
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: status.ended ? 'rgba(128,128,128,0.15)' : `${primary}1A` },
                      ]}
                    >
                      <IconSymbol
                        name="shield.fill"
                        size={18}
                        color={status.ended ? neutralSoft : primary}
                      />
                    </View>
                    <View style={styles.info}>
                      <ThemedText
                        style={[styles.device, status.ended && { color: neutralSoft }]}
                      >
                        {s.device_name || 'Устройство'}
                        {isCurrent ? ' · текущая' : ''}
                      </ThemedText>
                      <ThemedText style={[styles.dates, { color: neutralSoft }]}>
                        Вход: {formatWhen(s.created_at)}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.dates,
                          { color: status.ended ? neutralSoft : primary },
                        ]}
                      >
                        {status.ended ? status.label : `Активность: ${formatWhen(s.last_active_at)}`}
                      </ThemedText>
                    </View>
                    {isCurrent ? (
                      <IconSymbol name="checkmark.circle.fill" size={18} color={primary} />
                    ) : null}
                  </View>
                  {idx < sessions.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: 'rgba(128,128,128,0.15)' }]} />
                  )}
                </View>
              );
            })}
          </GlassCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 8,
    gap: 12,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  spinner: {
    marginTop: 32,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  device: {
    fontSize: 15,
    fontWeight: '500',
  },
  dates: {
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
    marginRight: 16,
  },
});
