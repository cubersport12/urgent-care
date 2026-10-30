import { completeRandomTraining, openTrainingSocket, randomTrainingHistory, type Difficulty, type TrainingEvent, type TrainingHistory } from '@/api/random-training';
import { TestTakingView } from '@/components/test-taking-view';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/explorer/back-button';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Spacing } from '@/constants/theme';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useTest, type TestAnswer } from '@/contexts/test-context';
import type { AppTestQuestionVm } from '@/hooks/api/types';
import { useAppTheme } from '@/hooks/use-theme-color';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

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
  const [progress, setProgress] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [selection, setSelection] = useState<{ id: string; questions: AppTestQuestionVm[] } | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const focused = useIsFocused();
  const { startTest, resetTest } = useTest();
  const { primary, neutralSoft } = useAppTheme();
  const { contentPaddingBottom } = useNavRail();

  const refresh = useCallback(async () => {
    try { setHistory(await randomTrainingHistory()); setHistoryError(false); }
    catch { setHistoryError(true); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    if (stage !== 'loading') return;
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [stage]);
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
    setError(''); setProgress([]); setTick(0); setSelection(null); setStage('loading');
    try {
      const ws = openTrainingSocket(difficulty);
      socket.current = ws;
      let finished = false;
      ws.onmessage = (message) => {
        if (socket.current !== ws) return;
        try {
          const event = JSON.parse(String(message.data)) as TrainingEvent;
          if (event.type === 'progress') setProgress((items) => [...items, event.testName]);
          if (event.type === 'ready') { finished = true; setSelection(event); setStage('ready'); }
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
      order: null, parentId: null, minScore: null, maxErrors: null,
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
  const cancel = () => { const ws = socket.current; socket.current = null; ws?.close(); setStage('home'); };

  if (stage === 'playing' && focused) return <TestTakingView onBack={finish} onFinish={finish} onSaveTraining={save} />;
  return (
    <ScreenBackground style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.pageX, paddingTop: Spacing.card, paddingBottom: contentPaddingBottom, gap: Spacing.card }}>
        {stage !== 'home' && <BackButton onPress={cancel} label="Назад" />}
        <ThemedText type="h1">Тренировка</ThemedText>
        {stage === 'home' ? <>
          <ThemedText type="caption" style={{ color: neutralSoft }}>Выберите сложность и испытайте удачу</ThemedText>
          {levels.map((level) => <Button key={level.id} title={`${level.label} · ${level.count} вопросов`} variant={difficulty === level.id ? 'primary' : 'glass'} onPress={() => setDifficulty(level.id)} accessibilityState={{ selected: difficulty === level.id }} />)}
          <Button title="Испытать удачу" onPress={beginSelection} />
          {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
          <ThemedText type="subtitle">Прошлые попытки</ThemedText>
          {historyError ? <Button title="Не удалось загрузить историю. Повторить" variant="glass" onPress={() => void refresh()} /> : history.length === 0 ? <ThemedText type="caption">Пока нет завершённых тренировок</ThemedText> : history.map((attempt) => (
            <GlassCard key={attempt.id}>
              <View style={{ gap: Spacing.card }}>
                <ThemedText>{new Date(attempt.completedAt).toLocaleString('ru-RU')} · {levels.find((level) => level.id === attempt.difficulty)?.label}</ThemedText>
                <ThemedText>Правильно: {attempt.correct} из {attempt.total}</ThemedText>
                <Button variant="glass" title={expanded === attempt.id ? 'Скрыть ответы' : 'Посмотреть ответы'} onPress={() => setExpanded(expanded === attempt.id ? null : attempt.id)} accessibilityState={{ expanded: expanded === attempt.id }} />
                {expanded === attempt.id && attempt.items.map((item, index) => item.question ? <View key={item.question.id} style={{ gap: Spacing.card / 2 }}>
                  <ThemedText type="caption">{item.testName}</ThemedText>
                  <ThemedText>{index + 1}. {item.question.questionText}</ThemedText>
                  <ThemedText type="caption">Ответ: {item.answer?.answerIds.length ? item.answer.answerIds.map((i) => item.question?.answers?.[i]?.answerText ?? '').join(', ') : 'Пропущен'} · {item.answer?.isCorrect ? 'Верно' : 'Неверно'}</ThemedText>
                </View> : <ThemedText key={index} type="caption">Вопрос недоступен</ThemedText>)}
              </View>
            </GlassCard>
          ))}
        </> : <>
          {stage === 'loading' && <ActivityIndicator color={primary} size="large" />}
          <ThemedText accessibilityLiveRegion="polite">{stage === 'loading' ? messages[tick % messages.length] : 'Вопросы готовы'}</ThemedText>
          <ThemedText>Выбрано: {progress.length} из {levels.find((level) => level.id === difficulty)?.count}</ThemedText>
          {progress.map((name, index) => <ThemedText key={index} type="caption">{index + 1}. {name}</ThemedText>)}
          {stage === 'ready' && <Button title="Начать" onPress={start} />}
        </>}
      </ScrollView>
    </ScreenBackground>
  );
}
