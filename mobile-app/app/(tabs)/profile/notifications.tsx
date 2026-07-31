import { notificationsApi, type AppNotification } from '@/api/notifications';
import { ApiError } from '@/api/utils';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function NotificationsScreen() {
  const { primary, neutralSoft, text, error: dangerColor } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const { refreshUnread, onLiveNotification, dismissBanner } = useNotifications();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await notificationsApi.list();
    setItems(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setError(null);
          dismissBanner();
          await refresh();
          refreshUnread();
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof ApiError ? e.detail : 'Не удалось загрузить уведомления');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refresh, refreshUnread, dismissBanner]),
  );

  useEffect(() => {
    return onLiveNotification((n) => {
      setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
    });
  }, [onLiveNotification]);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const onOpen = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        const updated = await notificationsApi.markRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
        refreshUnread();
      } catch (e) {
        Alert.alert('Ошибка', e instanceof ApiError ? e.detail : 'Не удалось отметить прочитанным');
        return;
      }
    }
    Alert.alert(n.title, n.body || undefined);
  };

  const onMarkAll = async () => {
    if (unreadCount === 0 || busy) return;
    setBusy(true);
    try {
      await notificationsApi.markAllRead();
      await refresh();
      refreshUnread();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof ApiError ? e.detail : 'Не удалось отметить все');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar
        title="Уведомления"
        backFallbackHref="/(tabs)/profile"
        right={
          unreadCount > 0 ? (
            <Pressable onPress={() => void onMarkAll()} hitSlop={8} disabled={busy}>
              {busy ? (
                <ActivityIndicator size="small" color={primary} />
              ) : (
                <ThemedText style={[styles.markAll, { color: primary }]}>Прочитать все</ThemedText>
              )}
            </Pressable>
          ) : (
            <View style={styles.rightSpacer} />
          )
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ThemedText style={{ color: dangerColor }}>{error}</ThemedText>
          <Pressable
            onPress={() => {
              setLoading(true);
              void refresh()
                .catch((e) =>
                  setError(e instanceof ApiError ? e.detail : 'Не удалось загрузить'),
                )
                .finally(() => setLoading(false));
            }}
            style={[styles.retryBtn, { backgroundColor: primary }]}
          >
            <ThemedText style={styles.retryText}>Повторить</ThemedText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <GlassCard padding={24} borderRadius={16} style={styles.empty}>
              <IconSymbol name="bell.fill" size={28} color={neutralSoft} />
              <ThemedText style={[styles.emptyTitle, { color: text }]}>Пока пусто</ThemedText>
              <ThemedText type="caption" style={{ color: neutralSoft, textAlign: 'center' }}>
                Здесь появятся уведомления о подписке и важных событиях
              </ThemedText>
            </GlassCard>
          ) : (
            <GlassCard padding={0} borderRadius={16}>
              {items.map((n, idx) => (
                <View key={n.id}>
                  <Pressable
                    onPress={() => void onOpen(n)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: n.isRead ? 'transparent' : primary },
                      ]}
                    />
                    <View style={styles.rowBody}>
                      <ThemedText
                        style={[
                          styles.title,
                          { color: text, fontWeight: n.isRead ? '500' : '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {n.title}
                      </ThemedText>
                      {n.body ? (
                        <ThemedText
                          type="caption"
                          style={{ color: neutralSoft }}
                          numberOfLines={2}
                        >
                          {n.body}
                        </ThemedText>
                      ) : null}
                      <ThemedText type="caption" style={{ color: neutralSoft, marginTop: 2 }}>
                        {formatWhen(n.createdAt)}
                      </ThemedText>
                    </View>
                  </Pressable>
                  {idx < items.length - 1 ? (
                    <View
                      style={[styles.divider, { backgroundColor: 'rgba(128,128,128,0.12)' }]}
                    />
                  ) : null}
                </View>
              ))}
            </GlassCard>
          )}
        </ScrollView>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  markAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  rightSpacer: { width: 36 },
  empty: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  rowPressed: {
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  rowBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 32,
    marginRight: 14,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
