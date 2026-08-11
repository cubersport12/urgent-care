import { trainingApi, type TrainingTopic } from '@/api/training';
import { ApiError } from '@/api/utils';
import { ArticleView } from '@/components/article-view';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { fetchArticle } from '@/hooks/api/useArticles';
import type { AppArticleVm } from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

export default function TrainingScreen() {
  const { primary, neutralSoft, text } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [article, setArticle] = useState<AppArticleVm | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await trainingApi.listMine();
    setTopics(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setError(null);
          setLoading(true);
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
    }, [refresh])
  );

  const openArticle = async (id: string) => {
    setOpeningId(id);
    try {
      const r = await fetchArticle(id);
      if (r.data) setArticle(r.data);
    } finally {
      setOpeningId(null);
    }
  };

  if (article) {
    return (
      <ArticleView article={article} onBack={() => setArticle(null)} />
    );
  }

  return (
    <ScreenBackground style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="h1" style={{ color: text, marginBottom: 8 }}>
          Тренировка
        </ThemedText>
        <ThemedText type="caption" style={{ color: neutralSoft, marginBottom: 16 }}>
          Работа над ошибками в тестах и материалы для повторения
        </ThemedText>

        {loading ? (
          <ActivityIndicator color={primary} style={{ marginTop: 24 }} />
        ) : error ? (
          <GlassCard padding={20} borderRadius={16}>
            <ThemedText style={{ color: text }}>{error}</ThemedText>
          </GlassCard>
        ) : topics.length === 0 ? (
          <GlassCard padding={20} borderRadius={16}>
            <ThemedText style={{ color: neutralSoft, textAlign: 'center' }}>
              Пока нет ошибок в тестах — продолжайте обучение
            </ThemedText>
          </GlassCard>
        ) : (
          topics.map((topic) => {
            const open = !!expanded[topic.testId];
            return (
              <GlassCard key={topic.testId} padding={0} borderRadius={16} style={styles.card}>
                <Pressable
                  onPress={() =>
                    setExpanded((prev) => ({ ...prev, [topic.testId]: !prev[topic.testId] }))
                  }
                  style={styles.topicHeader}
                >
                  <View style={styles.topicHeaderText}>
                    <ThemedText style={[styles.topicTitle, { color: text }]} numberOfLines={2}>
                      {topic.testName}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: neutralSoft }}>
                      Ошибок в вопросах: {topic.wrongQuestions.length}
                    </ThemedText>
                  </View>
                  <IconSymbol
                    name={open ? 'chevron.down' : 'chevron.right'}
                    size={18}
                    color={neutralSoft}
                  />
                </Pressable>
                {open
                  ? topic.wrongQuestions.map((q, idx) => (
                      <View key={q.questionId}>
                        <View
                          style={[
                            styles.qRow,
                            idx === 0 && { borderTopWidth: StyleSheet.hairlineWidth },
                          ]}
                        >
                          <ThemedText style={{ color: text, flex: 1 }} numberOfLines={3}>
                            {q.questionText}
                          </ThemedText>
                          <ThemedText type="caption" style={{ color: neutralSoft, marginLeft: 8 }}>
                            ×{q.wrongCount}
                          </ThemedText>
                        </View>
                        {(q.recommendedArticles?.length ?? 0) > 0 ? (
                          <View style={styles.recs}>
                            <ThemedText type="caption" style={{ color: neutralSoft, marginBottom: 6 }}>
                              Почитать
                            </ThemedText>
                            {(q.recommendedArticles ?? []).map((a) => (
                              <Pressable
                                key={a.id}
                                onPress={() => void openArticle(a.id)}
                                style={styles.recBtn}
                                disabled={openingId === a.id}
                              >
                                <IconSymbol name="book.fill" size={16} color={primary} />
                                <ThemedText style={{ color: primary, flex: 1 }} numberOfLines={2}>
                                  {a.name}
                                </ThemedText>
                                {openingId === a.id ? (
                                  <ActivityIndicator size="small" color={primary} />
                                ) : null}
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ))
                  : null}
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: 16,
  },
  card: { marginBottom: 12, overflow: 'hidden' },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  topicHeaderText: { flex: 1, gap: 4 },
  topicTitle: { fontSize: 16, fontWeight: '600' },
  qRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  recs: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
});
