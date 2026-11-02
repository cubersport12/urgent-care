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
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useImmersiveMode } from '@/contexts/immersive-context';
import { useTest, type TestAnswer } from '@/contexts/test-context';
import type { AppTestQuestionVm } from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { selectionStepDelays } from '@/lib/random-training-delay';
import { ScreenAppBar } from '@/components/ui/screen-app-bar';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, View } from 'react-native';

const levels: { id: Difficulty; label: string; count: number }[] = [
  { id: 'easy', label: 'Лёгкий', count: 5 },
  { id: 'medium', label: 'Средний', count: 10 },
  { id: 'hard', label: 'Сложный', count: 20 },
];
const messages = ['Выбираем случайный вопрос', 'Крутим рулетку…', 'Ищем интересные вопросы', 'Собираем тренировку'];

export default function RandomTrainingMode({ marathon }: { marathon: boolean }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const router = useRouter();
  const navigation = useNavigation();
  const [stage, setStage] = useState<'home' | 'loading' | 'ready' | 'playing'>('home');
  const [history, setHistory] = useState<TrainingHistory[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [visibleQuestions, setVisibleQuestions] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [selection, setSelection] = useState<{ id: string; questions: AppTestQuestionVm[] } | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const stepDelays = useRef<number[]>([]);
  const focused = useIsFocused();
  useImmersiveMode(focused && stage === 'playing');
  const { startTest, resetTest, finishTest, processSkippedQuestions } = useTest();
  const saving = useRef<Promise<void> | null>(null);
  const leaving = useRef(false);
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
    if (stage !== 'loading' || marathon || visibleQuestions >= progress) return;
    const timer = setTimeout(() => setVisibleQuestions((count) => count + 1), stepDelays.current[visibleQuestions]);
    return () => clearTimeout(timer);
  }, [stage, progress, visibleQuestions, marathon]);
  useEffect(() => {
    if (stage === 'loading' && selection && visibleQuestions >= selection.questions.length) setStage('ready');
  }, [stage, selection, visibleQuestions]);
  useEffect(() => () => { socket.current?.close(); socket.current = null; }, []);
  useEffect(() => {
    if (focused) return;
    const ws = socket.current;
    socket.current = null;
    ws?.close();
    if (stage === 'playing' && marathon && selection) {
      const answers = processSkippedQuestions(false);
      if (answers.length) {
        const pending = saving.current ?? completeRandomTraining(selection.id, answers).then(() => undefined);
        saving.current = pending;
        void pending.then(() => { resetTest(); setSelection(null); setStage('home'); void refresh(); })
          .catch(() => { saving.current = null; finishTest(); setError('Не удалось сохранить результат. Вернитесь к марафону и повторите.'); });
        return;
      }
    }
    if (stage === 'playing') resetTest();
    if (stage !== 'home') { setSelection(null); setStage('home'); }
    // The transition away cancels a pending or unfinished training.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const beginSelection = () => {
    stepDelays.current = selectionStepDelays(level.count);
    setError(''); setProgress(0); setTotal(0); setVisibleQuestions(0); setMessageIndex(Math.floor(Math.random() * messages.length)); setSelection(null); setStage('loading');
    try {
      const ws = openTrainingSocket(marathon ? 'marathon' : difficulty);
      socket.current = ws;
      let finished = false;
      ws.onmessage = (message) => {
        if (socket.current !== ws) return;
        try {
          const event = JSON.parse(String(message.data)) as TrainingEvent;
          if (event.type === 'progress') { setProgress(event.count); setTotal(event.total); if (marathon) setVisibleQuestions(event.count); }
          if (event.type === 'ready') {
            finished = true;
            setSelection(event);
            setProgress(event.questions.length);
            setTotal(event.questions.length);
            if (marathon) setVisibleQuestions(event.questions.length);
          }
          if (event.type === 'insufficient') { finished = true; setError(marathon ? 'Нет доступных вопросов для марафона.' : `Доступно вопросов: ${event.available}. Выберите другой уровень.`); setStage('home'); }
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
      showCorrectAnswer: true, includeToStatistics: false, showSkipButton: !marathon,
      showNavigation: false, showBackButton: !marathon, hidden: false,
      randomizeQuestions: false, questionsToShow: null, accessabilityConditions: null,
      resetTestIds: null, requiredTariffId: null, requiredRewardId: null, isLocked: false, lockedBy: null });
    setStage('playing');
    saving.current = null;
  };
  const save = useCallback(async (answers: TestAnswer[]) => {
    if (!selection) throw new Error('Попытка не найдена');
    if (marathon && !answers.length) return;
    if (!saving.current) saving.current = completeRandomTraining(selection.id, answers).then(() => undefined).catch((error) => { saving.current = null; throw error; });
    await saving.current;
  }, [selection, marathon]);
  const finish = () => { resetTest(); setSelection(null); setStage('home'); void refresh(); };
  const cancel = () => {
    const ws = socket.current; socket.current = null; ws?.close();
    setSelection(null); setStage('home');
  };

  const goBack = () => {
    if (stage === 'home') {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/random-training');
    }
    else cancel();
  };
  useChromeBack(focused && stage !== 'playing' ? goBack : null);
  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (stage !== 'playing' || leaving.current) return;
    event.preventDefault();
    void save(processSkippedQuestions(!marathon)).then(() => {
      leaving.current = true;
      resetTest();
      navigation.dispatch(event.data.action);
    }).catch(() => {
      const message = 'Не удалось сохранить результат. Попробуйте ещё раз.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(message);
      else Alert.alert('Ошибка', message);
    });
  }), [navigation, stage, save, processSkippedQuestions, marathon, resetTest]);

  const filteredHistory = history.filter((attempt) => (attempt.difficulty === 'marathon') === marathon);
  if (stage === 'playing' && focused) return <TestTakingView onBack={finish} onFinish={finish} onSaveTraining={save} marathon={marathon} />;
  return (
    <ScreenBackground style={{ flex: 1 }}>
      <ScreenAppBar title={marathon ? 'Марафон' : 'Обычная тренировка'} onBack={goBack} showBack={focused} />
      <FlatList
        data={stage === 'home' && !historyError ? filteredHistory : []}
        keyExtractor={(attempt) => attempt.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.pageX, paddingTop: Spacing.card, paddingBottom: contentPaddingBottom }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.card / 2 }} />}
        ListHeaderComponent={<View style={{ gap: Spacing.card, paddingBottom: Spacing.card }}>
        {stage === 'home' ? <>
          {marathon ? <ThemedText type="caption" style={{ color: neutral }}>Все доступные вопросы до первой ошибки</ThemedText> :
          <View style={{ gap: Spacing.card / 2 }}>
            <ThemedText type="defaultSemiBold">Уровень сложности</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.card / 2 }}>
              {levels.map((item) => <Button key={item.id} title={item.label} size="small" variant={difficulty === item.id ? 'primary' : 'glass'} onPress={() => setDifficulty(item.id)} accessibilityRole="button" accessibilityState={{ selected: difficulty === item.id }} />)}
            </View>
            <ThemedText type="caption" style={{ color: neutral }}>{level.count} вопросов · для прохождения ответьте без ошибок</ThemedText>
          </View>
          }
          <Button title="Подобрать вопросы" onPress={beginSelection} />
          {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
          <View style={{ gap: Spacing.card / 2 }}>
            <ThemedText type="subtitle">Прошлые попытки</ThemedText>
            {marathon && filteredHistory.length > 0 && <ThemedText>Личный рекорд: {Math.max(...filteredHistory.map((attempt) => attempt.correct))}</ThemedText>}
            {historyError ? <Button title="Не удалось загрузить историю. Повторить" variant="glass" onPress={() => void refresh()} /> : filteredHistory.length === 0 ? <ThemedText type="caption" style={{ color: neutral }}>Пока нет завершённых тренировок</ThemedText> : null}
          </View>
        </> : <>
          <GlassCard>
            <View style={{ gap: Spacing.card }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.card }}>
                {stage === 'loading' && <ActivityIndicator color={primary} size="large" />}
                <View style={{ flex: 1, gap: Spacing.card / 2 }}>
                  <ThemedText type="subtitle" accessibilityLiveRegion="polite">{stage === 'loading' ? 'Подбираем вопросы' : 'Всё готово'}</ThemedText>
                  <ThemedText style={{ color: neutral }}>{stage === 'loading' ? messages[messageIndex] : `${marathon ? 'Марафон' : `${level.label} уровень`} · ${selection?.questions.length ?? progress} вопросов`}</ThemedText>
                </View>
              </View>
              <View style={{ gap: Spacing.card / 2 }}>
                <ThemedText type="caption">Подобрано: {visibleQuestions} из {marathon ? total : level.count}</ThemedText>
                <ProgressBar current={visibleQuestions} total={marathon ? total || 1 : level.count} variant="muted" />
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
                    <ThemedText type="caption" style={{ color: passed ? onSuccessContainer : onErrorContainer }}>{marathon ? (passed ? 'Все вопросы пройдены' : attempt.correct < attempt.items.length ? 'Первая ошибка' : 'Завершён досрочно') : passed ? 'Пройдена' : 'Не пройдена'}</ThemedText>
                  </View>
                  <ThemedText type="defaultSemiBold">{marathon ? `Серия: ${attempt.correct} · Отвечено: ${attempt.items.length} из ${attempt.total}` : `${attempt.correct} из ${attempt.total}`}</ThemedText>
                  <View style={{ flex: 1 }} />
                  <IconSymbol name={isExpanded ? 'chevron.down' : 'chevron.right'} size={Spacing.card} color={neutral} />
                </View>
                <ThemedText type="caption" style={{ color: neutral }}>{new Date(attempt.completedAt).toLocaleString('ru-RU')} · {marathon ? 'Марафон' : levels.find((item) => item.id === attempt.difficulty)?.label}</ThemedText>
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
