import { trainingApi, type RecommendedArticle } from '@/api/training';
import { ArticleView } from '@/components/article-view';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useTest } from '@/contexts/test-context';
import { fetchArticle } from '@/hooks/api/useArticles';
import type { AppArticleVm } from '@/hooks/api/types';
import { computeTestOutcome } from '@/hooks/api/useTestResults';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';
import { IconSymbol } from '../ui/icon-symbol';
import { QuestionAccordion } from './question-accordion';
import { useTestTakingStyles } from './styles';

type TestResultsViewProps = {
  onBack: () => void;
  onFinish: () => void;
  animatedStyle: any;
};

export function TestResultsView({ onBack, onFinish, animatedStyle }: TestResultsViewProps) {
  const {
    test,
    answers,
    finishTest,
    processSkippedQuestions,
  } = useTest();

  const { page: backgroundColor, layout2: pressedBackgroundColor, primary: tintColor, success: successColor, error: errorColor, neutralSoft: mutedColor } = useAppTheme();
  const styles = useTestTakingStyles();
  const insets = useSafeAreaInsets();
  const { isWide, contentPaddingLeft, contentPaddingBottom } = useNavRail();
  useChromeBack(onBack);
  // Tab bar is absolute; lift the sticky CTA above it (esp. web).
  const footerPad = (isWide ? 16 : contentPaddingBottom) + Math.max(insets.bottom, 0);
  const [article, setArticle] = useState<AppArticleVm | null>(null);
  const [openingArticleId, setOpeningArticleId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedArticle[]>([]);

  // Обрабатываем пропущенные вопросы при монтировании компонента
  useEffect(() => {
    if (test) {
      processSkippedQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Выполняем только при монтировании

  // Вычисляем финальные ответы (включая все неотвеченные вопросы) без изменения состояния
  const finalAnswers = useMemo(() => {
    if (!test || !test.questions) return answers;

    const unansweredQuestions = test.questions.filter(
      question => !answers.find(a => a.questionId === question.id)
    );

    const skippedAnswers = unansweredQuestions.map(question => ({
      questionId: question.id,
      answerIds: [], // Пустой массив - вопрос не был отвечен
      isCorrect: false, // Неотвеченный вопрос считается ошибочным
      score: 0, // Неотвеченный вопрос не дает баллов
    }));

    // Возвращаем финальный массив ответов (включая пропущенные)
    return [...answers, ...skippedAnswers];
  }, [test, answers]);

  const outcome = useMemo(
    () =>
      computeTestOutcome({
        answers: finalAnswers,
        minScore: test?.minScore,
        maxErrors: test?.maxErrors,
      }),
    [finalAnswers, test],
  );

  // Документы для прочтения — подбор по смыслу (embeddings) по ошибочным вопросам
  useEffect(() => {
    if (!test) return;
    let cancelled = false;
    const wrongQuestionIds = finalAnswers
      .filter((a) => !a.isCorrect)
      .map((a) => a.questionId);
    void trainingApi
      .testRecommendations(test.id, wrongQuestionIds)
      .then((recs) => {
        if (!cancelled) setRecommendations(recs);
      })
      .catch(() => {
        // Рекомендации не критичны — молча пропускаем (например, embeddings не настроены)
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test?.id]);

  const openArticle = async (id: string) => {
    setOpeningArticleId(id);
    try {
      const r = await fetchArticle(id);
      if (r.data) setArticle(r.data);
    } finally {
      setOpeningArticleId(null);
    }
  };

  if (article) {
    return <ArticleView article={article} onBack={() => setArticle(null)} />;
  }

  if (!test) return null;

  const { totalScore, totalErrors, isPassed } = outcome;

  // Экран завершения один для всех случаев: просто пройден / не пройден
  const statusText = isPassed ? 'Тест пройден ✓' : 'Тест не пройден ✗';

  const handleFinish = () => {
    finishTest();
    onFinish();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: insets.top,
          paddingLeft: isWide ? contentPaddingLeft : insets.left,
          paddingRight: insets.right,
        },
        animatedStyle,
      ]}
    >
      {!isWide ? (
        <ThemedView style={styles.header}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: pressed ? pressedBackgroundColor : backgroundColor,
              },
            ]}
          >
            <IconSymbol name="chevron.left" size={28} color={tintColor} />
            <ThemedText style={styles.backButtonText}>Назад</ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, { paddingBottom: 88 + footerPad }]}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.resultsTitle}>
            Результаты теста
          </ThemedText>
          <ThemedView style={styles.summaryCard}>
            <ThemedText type="subtitle" style={styles.summaryTitle}>
              Итоги:
            </ThemedText>
            <ThemedText style={styles.summaryItem}>
              Набрано баллов: {totalScore}
              {test.minScore !== undefined && test.minScore !== null && (
                <ThemedText> / {test.minScore} (минимум)</ThemedText>
              )}
            </ThemedText>
            <ThemedText style={styles.summaryItem}>
              Ошибок: {totalErrors}
              {test.maxErrors !== undefined && test.maxErrors !== null && (
                <ThemedText> / {test.maxErrors} (максимум)</ThemedText>
              )}
            </ThemedText>
            <ThemedView
              style={[
                styles.statusBadge,
                { backgroundColor: isPassed ? successColor : errorColor },
              ]}
            >
              <ThemedText style={styles.statusText}>{statusText}</ThemedText>
            </ThemedView>
          </ThemedView>

          {recommendations.length > 0 ? (
            <ThemedView style={styles.summaryCard}>
              <ThemedText type="subtitle" style={styles.summaryTitle}>
                Рекомендуем прочитать
              </ThemedText>
              {recommendations.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => void openArticle(a.id)}
                  disabled={openingArticleId === a.id}
                  style={({ pressed }) => [
                    styles.recBtn,
                    pressed && { backgroundColor: pressedBackgroundColor },
                  ]}
                >
                  <IconSymbol name="book.fill" size={16} color={tintColor} />
                  <ThemedText style={{ color: tintColor, flex: 1 }} numberOfLines={2}>
                    {a.name}
                  </ThemedText>
                  {openingArticleId === a.id ? (
                    <ActivityIndicator size="small" color={tintColor} />
                  ) : (
                    <IconSymbol name="chevron.right" size={14} color={mutedColor} />
                  )}
                </Pressable>
              ))}
            </ThemedView>
          ) : null}

          {/* Разбор только отвеченных вопросов — неотвеченные на экране не показываются */}
          {(test.questions ?? [])
            .map((q, originalIndex) => ({ q, originalIndex }))
            .filter(({ q }) => {
              const answered = finalAnswers.find((a) => a.questionId === q.id);
              return !!answered && answered.answerIds.length > 0;
            })
            .map(({ q, originalIndex }, displayIndex) => {
              const questionAnswer = finalAnswers.find((a) => a.questionId === q.id);
              const savedAnswerIndices =
                questionAnswer?.answerIds.map((id) => parseInt(id, 10)) || [];

              return (
                <QuestionAccordion
                  key={q.id}
                  question={q}
                  questionIndex={displayIndex}
                  questionAnswer={questionAnswer}
                  savedAnswerIndices={savedAnswerIndices}
                  testAnswers={finalAnswers}
                  testQuestions={test.questions ?? undefined}
                />
              );
            })}
        </ThemedView>
      </ScrollView>
      <ThemedView
        style={[styles.fixedButtonContainer, { backgroundColor, paddingBottom: footerPad }]}
      >
        <Button title="Завершить" onPress={handleFinish} fullWidth size="large" />
      </ThemedView>
    </Animated.View>
  );
}
