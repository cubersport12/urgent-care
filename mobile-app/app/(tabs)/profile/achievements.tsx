import { achievementsApi, type AchievementMe, type RewardMe } from '@/api/achievements';
import { ApiError } from '@/api/utils';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

function MediaIcon({ path, locked }: { path?: string | null; locked?: boolean }) {
  const { primary, neutralSoft } = useAppTheme();
  const { response, isLoading } = useFileImage(path ?? '');

  if (!path) {
    return (
      <View
        style={[
          styles.iconBox,
          { backgroundColor: locked ? 'rgba(128,128,128,0.1)' : 'rgba(245, 158, 11, 0.12)' },
        ]}
      >
        <IconSymbol
          name="trophy.fill"
          size={22}
          color={locked ? neutralSoft : '#F59E0B'}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconBox,
        { backgroundColor: locked ? 'rgba(128,128,128,0.1)' : 'rgba(245, 158, 11, 0.12)' },
        locked && { opacity: 0.45 },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={primary} />
      ) : response ? (
        <Image source={{ uri: response }} style={styles.iconImg} resizeMode="cover" />
      ) : (
        <IconSymbol name="trophy.fill" size={22} color={locked ? neutralSoft : '#F59E0B'} />
      )}
    </View>
  );
}

function ruleHint(a: AchievementMe): string {
  if (a.ruleType === 'manual') return 'Выдаётся вручную';
  const labels: Record<string, string> = {
    articles_read: 'статей',
    tests_passed: 'тестов',
    rescues_completed: 'режимов',
  };
  const unit = labels[a.ruleType] ?? '';
  return `${a.progress}/${a.ruleThreshold} ${unit}`;
}

export default function AchievementsScreen() {
  const { primary, neutralSoft, text, error: dangerColor } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const [achievements, setAchievements] = useState<AchievementMe[]>([]);
  const [rewards, setRewards] = useState<RewardMe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [a, r] = await Promise.all([
      achievementsApi.listMine(),
      achievementsApi.listRewardsMine(),
    ]);
    setAchievements(a);
    setRewards(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setError(null);
          await refresh();
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof ApiError ? e.detail : 'Не удалось загрузить');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refresh]),
  );

  return (
    <ScreenBackground style={styles.root}>
      <ScreenAppBar title="Достижения и награды" backFallbackHref="/(tabs)/profile" />

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
          <ThemedText type="caption" style={[styles.sectionHeader, { color: neutralSoft }]}>
            ДОСТИЖЕНИЯ
          </ThemedText>
          {achievements.length === 0 ? (
            <GlassCard padding={20} borderRadius={16} style={styles.empty}>
              <ThemedText style={{ color: neutralSoft }}>Пока нет достижений</ThemedText>
            </GlassCard>
          ) : (
            <GlassCard padding={0} borderRadius={16}>
              {achievements.map((a, idx) => (
                <View key={a.id}>
                  <View style={[styles.row, !a.unlocked && styles.rowLocked]}>
                    <MediaIcon path={a.iconPath} locked={!a.unlocked} />
                    <View style={styles.rowBody}>
                      <ThemedText
                        style={[styles.rowTitle, { color: text, opacity: a.unlocked ? 1 : 0.7 }]}
                        numberOfLines={1}
                      >
                        {a.title}
                      </ThemedText>
                      {a.description ? (
                        <ThemedText type="caption" style={{ color: neutralSoft }} numberOfLines={2}>
                          {a.description}
                        </ThemedText>
                      ) : null}
                      <ThemedText type="caption" style={{ color: a.unlocked ? '#10B981' : neutralSoft }}>
                        {a.unlocked ? 'Получено' : ruleHint(a)}
                      </ThemedText>
                    </View>
                    {a.unlocked ? (
                      <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
                    ) : (
                      <IconSymbol name="lock.fill" size={18} color={neutralSoft} />
                    )}
                  </View>
                  {idx < achievements.length - 1 ? (
                    <View style={[styles.divider, { backgroundColor: 'rgba(128,128,128,0.12)' }]} />
                  ) : null}
                </View>
              ))}
            </GlassCard>
          )}

          <ThemedText
            type="caption"
            style={[styles.sectionHeader, { color: neutralSoft, marginTop: 22 }]}
          >
            НАГРАДЫ
          </ThemedText>
          {rewards.length === 0 ? (
            <GlassCard padding={20} borderRadius={16} style={styles.empty}>
              <ThemedText style={{ color: neutralSoft, textAlign: 'center' }}>
                Награды появятся после получения достижений
              </ThemedText>
            </GlassCard>
          ) : (
            <GlassCard padding={0} borderRadius={16}>
              {rewards.map((r, idx) => (
                <View key={r.id}>
                  <View style={styles.row}>
                    <MediaIcon path={r.iconPath} />
                    <View style={styles.rowBody}>
                      <ThemedText style={[styles.rowTitle, { color: text }]} numberOfLines={1}>
                        {r.title}
                      </ThemedText>
                      {r.description ? (
                        <ThemedText type="caption" style={{ color: neutralSoft }} numberOfLines={2}>
                          {r.description}
                        </ThemedText>
                      ) : null}
                      <ThemedText type="caption" style={{ color: neutralSoft }}>
                        За: {r.achievementTitles.join(', ')}
                      </ThemedText>
                    </View>
                    <IconSymbol name="star.fill" size={18} color="#F59E0B" />
                  </View>
                  {idx < rewards.length - 1 ? (
                    <View style={[styles.divider, { backgroundColor: 'rgba(128,128,128,0.12)' }]} />
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
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  empty: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowLocked: {
    opacity: 0.95,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImg: {
    width: 44,
    height: 44,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
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
