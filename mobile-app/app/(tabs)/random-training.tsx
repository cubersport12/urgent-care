import { completeRandomTraining, openTrainingSocket, randomTrainingHistory, type Difficulty, type TrainingEvent, type TrainingHistory } from '@/api/random-training';
import { TestTakingView } from '@/components/test-taking-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ProgressBar } from '@/components/ui/progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius, Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useTest, type TestAnswer } from '@/contexts/test-context';
import type { AppTestQuestionVm } from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { selectionStepDelays } from '@/lib/random-training-delay';
import { BackButton } from '@/components/explorer/back-button';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

const levels: { id: Difficulty; label: string; count: number }[] = [
  { id: 'easy', label: 'Лёгкий', count: 5 },
  { id: 'medium', label: 'Средний', count: 10 },
  { id: 'hard', label: 'Сложный', count: 20 },
];
const messages = ['Выбираем случайный вопрос', 'Крутим рулетку…', 'Ищем интересные вопросы', 'Собираем тренировку'];

export default function RandomTrainingScreen() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [stage, setStage] = useState<'home' | 'loading' | 'ready' | 'playing'>('home');
  const [history, setHistory] = useState<TrainingHistory[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [visibleQuestions, setVisibleQuestions] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [selection, setSelection] = useState<{ id: string; questions: AppTestQuestionVm[] } | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const stepDelays = useRef<number[]>([]);
  const focused = useIsFocused();
  const { startTest, resetTest } = useTest();
  const { primary, neutral, layout2, success, error: errorColor, successContainer, errorContainer, onSuccessContainer, onErrorContainer } = useAppTheme();
  const level = levels.find((item) => item.id === difficulty)!;
  const { contentPaddingBottom } = useNavRail();

  const refresh = useCallback(async () => {
    try { setHistory(await randomTrainingHistory()); setHistoryError(false); }
    catch { setHistoryError(true); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    if (stage !== 'loading') return;
    const timer = setInterval(() => {
      const offset = 1 + Math.floor(Math.random() * (messages.length - 1));
      setMessageIndex((index) => (index + offset) % messages.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);
  useEffect(() => {
    if (stage !== 'loading' || visibleQuestions >= progress) return;
    const timer = setTimeout(() => setVisibleQuestions((count) => count + 1), stepDelays.current[visibleQuestions]);
    return () => clearTimeout(timer);
  }, [stage, progress, visibleQuestions]);
  useEffect(() => {
    if (stage === 'loading' && selection && visibleQuestions >= selection.questions.length) setStage('ready');
  }, [stage, selection, visibleQuestions]);
  useEffect(() => () => { socket.current?.close(); socket.current = null; }, []);
  useEffect(() => {
    if (focused) return;
    const ws = socket.current;
    socket.current = null;
    ws?.close();
    if (stage === 'playing') resetTest();
    if (stage !== 'home') { setSelection(null); setStage('home'); }
    // The transition away cancels a pending or unfinished training.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const beginSelection = () => {
    stepDelays.current = selectionStepDelays(level.count);
    setError(''); setProgress(0); setVisibleQuestions(0); setMessageIndex(Math.floor(Math.random() * messages.length)); setSelection(null); setStage('loading');
    try {
      const ws = openTrainingSocket(difficulty);
      socket.current = ws;
      let finished = false;
      ws.onmessage = (message) => {
        if (socket.current !== ws) return;
        try {
          const event = JSON.parse(String(message.data)) as TrainingEvent;
          if (event.type === 'progress') setProgress(event.count);
          if (event.type === 'ready') {
            finished = true;
            setSelection(event);
            setProgress(event.questions.length);
          }
          if (event.type === 'insufficient') { finished = true; setError(`Доступно вопросов: ${event.available}. Выберите другой уровень.`); setStage('home'); }
          if (event.type === 'error') { finished = true; setError(event.message); setStage('home'); }
        } catch { finished = true; setError('Не удалось получить вопросы. Попробуйте снова.'); setStage('home'); ws.close(); }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        if (socket.current !== ws) return;
        socket.current = null;
        if (!finished) { setError('Соединение прервано. Попробуйте снова.'); setStage('home'); }
      };
    } catch { setError('Не удалось подключиться. Попробуйте снова.'); setStage('home'); }
  };

  const start = () => {
    if (!selection) return;
    startTest({ id: selection.id, name: 'Тренировка', questions: selection.questions,
      order: null, parentId: null, minScore: null, maxErrors: 0,
      showCorrectAnswer: true, includeToStatistics: false, showSkipButton: true,
      showNavigation: false, showBackButton: true, hidden: false,
      randomizeQuestions: false, questionsToShow: null, accessabilityConditions: null,
      resetTestIds: null, requiredTariffId: null, requiredRewardId: null, isLocked: false, lockedBy: null });
    setStage('playing');
  };
  const save = useCallback(async (answers: TestAnswer[]) => {
    if (!selection) throw new Error('Попытка не найдена');
    await completeRandomTraining(selection.id, answers);
  }, [selection]);
  const finish = () => { resetTest(); setSelection(null); setStage('home'); void refresh(); };
  const cancel = () => {
    const ws = socket.current; socket.current = null; ws?.close();
    setSelection(null); setStage('home');
  };

  if (stage === 'playing' && focused) return <TestTakingView onBack={finish} onFinish={finish} onSaveTraining={save} />;
  return (
    <ScreenBackground style={{ flex: 1 }}>
      <FlatList
        data={stage === 'home' && !historyError ? history : []}
        keyExtractor={(attempt) => attempt.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.pageX, paddingTop: Spacing.card, paddingBottom: contentPaddingBottom }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.card / 2 }} />}
        ListHeaderComponent={<View style={{ gap: Spacing.card, paddingBottom: Spacing.card }}>
        {stage !== 'home' && <BackButton onPress={cancel} label="Назад" />}
        <ThemedText type="h1">Тренировка</ThemedText>
        {stage === 'home' ? <>
          <View style={{ gap: Spacing.card / 2 }}>
            <ThemedText type="defaultSemiBold">Уровень сложности</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.card / 2 }}>
              {levels.map((item) => <Button key={item.id} title={item.label} size="small" variant={difficulty === item.id ? 'primary' : 'glass'} onPress={() => setDifficulty(item.id)} accessibilityRole="button" accessibilityState={{ selected: difficulty === item.id }} />)}
            </View>
            <ThemedText type="caption" style={{ color: neutral }}>{level.count} вопросов · для прохождения ответьте без ошибок</ThemedText>
          </View>
          <Button title="Подобрать вопросы" onPress={beginSelection} />
          {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
          <View style={{ gap: Spacing.card / 2 }}>
            <ThemedText type="subtitle">Прошлые попытки</ThemedText>
            {historyError ? <Button title="Не удалось загрузить историю. Повторить" variant="glass" onPress={() => void refresh()} /> : history.length === 0 ? <ThemedText type="caption" style={{ color: neutral }}>Пока нет завершённых тренировок</ThemedText> : null}
          </View>
        </> : <>
          <GlassCard>
            <View style={{ gap: Spacing.card }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.card }}>
                {stage === 'loading' && <ActivityIndicator color={primary} size="large" />}
                <View style={{ flex: 1, gap: Spacing.card / 2 }}>
                  <ThemedText type="subtitle" accessibilityLiveRegion="polite">{stage === 'loading' ? 'Подбираем вопросы' : 'Всё готово'}</ThemedText>
                  <ThemedText style={{ color: neutral }}>{stage === 'loading' ? messages[messageIndex] : `${level.label} уровень · ${selection?.questions.length ?? progress} вопросов`}</ThemedText>
                </View>
              </View>
              <View style={{ gap: Spacing.card / 2 }}>
                <ThemedText type="caption">Подобрано: {visibleQuestions} из {level.count}</ThemedText>
                <ProgressBar current={visibleQuestions} total={level.count} variant="muted" />
              </View>
              {stage === 'ready' && <Button title="Начать тренировку" onPress={start} />}
            </View>
          </GlassCard>
        </>}
        </View>}
        renderItem={({ item: attempt }) => {
          const passed = attempt.total > 0 && attempt.correct === attempt.total;
          const isExpanded = expanded === attempt.id;
          return (
            <View style={{ backgroundColor: layout2, borderRadius: Radius.lg, overflow: 'hidden' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                onPress={() => setExpanded(isExpanded ? null : attempt.id)}
                style={({ pressed }) => ({ padding: Spacing.card, gap: Spacing.card / 2, opacity: pressed ? 0.75 : 1 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.card / 2 }}>
                  <View style={{ backgroundColor: passed ? successContainer : errorContainer, borderRadius: Radius.sm, paddingHorizontal: Spacing.card / 2, paddingVertical: Spacing.card / 4 }}>
                    <ThemedText type="caption" style={{ color: passed ? onSuccessContainer : onErrorContainer }}>{passed ? 'Пройдена' : 'Не пройдена'}</ThemedText>
                  </View>
                  <ThemedText type="defaultSemiBold">{attempt.correct} из {attempt.total}</ThemedText>
                  <View style={{ flex: 1 }} />
                  <IconSymbol name={isExpanded ? 'chevron.down' : 'chevron.right'} size={Spacing.card} color={neutral} />
                </View>
                <ThemedText type="caption" style={{ color: neutral }}>{new Date(attempt.completedAt).toLocaleString('ru-RU')} · {levels.find((item) => item.id === attempt.difficulty)?.label}</ThemedText>
              </Pressable>
              {isExpanded && <View style={{ paddingHorizontal: Spacing.card, paddingBottom: Spacing.card, gap: Spacing.card }}>
                {attempt.items.map((item, index) => item.question ? <View key={item.question.id} style={{ gap: Spacing.card / 2 }}>
                  <ThemedText type="caption" style={{ color: neutral }}>{item.testName}</ThemedText>
                  <ThemedText>{index + 1}. {item.question.questionText}</ThemedText>
                  <ThemedText type="caption" style={{ color: item.answer?.isCorrect ? success : errorColor }}>Ответ: {item.answer?.answerIds.length ? item.answer.answerIds.map((i) => item.question?.answers?.[i]?.answerText ?? '').join(', ') : 'Пропущен'} · {item.answer?.isCorrect ? 'Верно' : 'Неверно'}</ThemedText>
                </View> : <ThemedText key={index} type="caption">Вопрос недоступен</ThemedText>)}
              </View>}
            </View>
          );
        }}
      />
    </ScreenBackground>
  );
}
