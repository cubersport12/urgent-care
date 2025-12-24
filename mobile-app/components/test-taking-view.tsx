import { useTest } from '@/contexts/test-context';
import { useAddOrUpdateTestStats } from '@/hooks/api/useTestStats';
import { useDeviceId } from '@/hooks/use-device-id';
import { useEffect, useRef, useState } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TestQuestionView } from './test-taking/test-question-view';
import { TestResultsView } from './test-taking/test-results-view';

type TestTakingViewProps = {
  onBack: () => void;
  onFinish: () => void;
};

export function TestTakingView({ onBack, onFinish }: TestTakingViewProps) {
  const {
    test,
    currentQuestionIndex,
    isTestCompleted,
    getCurrentQuestion,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    finishTest,
    getTotalScore,
    getTotalErrors,
    answers,
    startedAt,
    areAllQuestionsVisited,
    visitedQuestions,
  } = useTest();
  const { deviceId } = useDeviceId();

  // Хук для сохранения статистики теста (вызываем всегда, но используем только когда нужно)
  const testStatsHook = useAddOrUpdateTestStats({
    clientId: deviceId || '',
    testId: test?.id || '',
    startedAt: startedAt || new Date().toISOString(),
  });

  const question = getCurrentQuestion();
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const previousAnswersLengthRef = useRef(0);
  const previousQuestionIdRef = useRef<string | null>(null);
  const previousVisitedQuestionsRef = useRef<Set<string>>(new Set());

  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  
  // Обновляем статистику после каждого ответа - рассчитываем passed
  useEffect(() => {
    if (test && deviceId && startedAt && testStatsHook && answers.length !== previousAnswersLengthRef.current) {
      previousAnswersLengthRef.current = answers.length;
      
      const totalScore = getTotalScore();
      const totalErrors = getTotalErrors();
      
      // Рассчитываем passed на основе текущих результатов
      const isPassed =
        (test.minScore === undefined || test.minScore === null || totalScore >= test.minScore) &&
        (test.maxErrors === undefined || test.maxErrors === null || totalErrors <= test.maxErrors);
      
      // Обновляем статистику с текущим значением passed
      const updateStats = async () => {
        try {
          await testStatsHook.addOrUpdate({ passed: isPassed });
        } catch (error) {
          console.error('Error updating test stats after answer:', error);
        }
      };
      void updateStats();
    }
  }, [test, deviceId, startedAt, testStatsHook, answers, getTotalScore, getTotalErrors]);

  useEffect(() => {
    if (!question) return;
    
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 300 });
    
    // Проверяем, был ли вопрос посещен до перехода к нему
    // Сохраняем предыдущее состояние visitedQuestions перед обновлением
    const wasVisitedBefore = previousVisitedQuestionsRef.current.has(question.id);
    
    // Обновляем предыдущее состояние для следующей проверки
    previousVisitedQuestionsRef.current = new Set(visitedQuestions);
    previousQuestionIdRef.current = question.id;
    
    // Проверяем, есть ли уже ответ на этот вопрос
    const existingAnswer = answers.find(a => a.questionId === question.id);
    
    if (existingAnswer) {
      // Если есть ответ, показываем результат и восстанавливаем выбранные ответы
      const answerIds = existingAnswer.answerIds.map(id => parseInt(id, 10));
      setSelectedAnswers(answerIds);
      setShowResult(true);
    } else {
      // Если ответа нет, сбрасываем состояние
      setSelectedAnswers([]);
      setShowResult(false);
    }

    // Определяем, является ли вопрос мульти или сингл
    if (question.answers) {
      const correctAnswersCount = question.answers.filter((a) => a.isCorrect).length;
      setIsMultiSelect(correctAnswersCount > 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, visitedQuestions]); // Используем question.id и visitedQuestions для отслеживания

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  if (!test || !question) {
    return null;
  }

  const totalQuestions = test.questions?.length || 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const handleAnswerToggle = (index: number) => {
    if (showResult) return;

    if (isMultiSelect) {
      setSelectedAnswers((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setSelectedAnswers([index]);
    }
  };

  const handleNext = async () => {
    if (showResult) {
      // Проверяем, все ли вопросы посещены
      if (areAllQuestionsVisited()) {
        // Если все вопросы посещены, завершаем тест
        finishTest();
      } else {
        // Сбрасываем showResult перед переходом к следующему вопросу
        setShowResult(false);
        setSelectedAnswers([]);
        nextQuestion();
      }
    } else {
      if (selectedAnswers.length === 0) return;
      
      submitAnswer(question.id, selectedAnswers);
      
      // Статистика обновляется автоматически через useEffect при изменении totalScoreAccumulated
      
      // Если showCorrectAnswer === false, сразу переходим к следующему вопросу без показа результатов
      if (test.showCorrectAnswer === false) {
        // Проверяем, все ли вопросы посещены
        if (areAllQuestionsVisited()) {
          finishTest();
        } else {
          setSelectedAnswers([]);
          nextQuestion();
        }
      } else {
        setShowResult(true);
      }
    }
  };

  const handleSkip = () => {
    // Пропускаем вопрос без ответа
    if (areAllQuestionsVisited()) {
      finishTest();
    } else {
      setSelectedAnswers([]);
      setShowResult(false);
      nextQuestion();
    }
  };

  const handlePrevious = () => {
    // Переходим на предыдущий вопрос
    setShowResult(false);
    setSelectedAnswers([]);
    previousQuestion();
  };

  // Если тест завершен (все вопросы посещены), показываем результаты
  if (isTestCompleted || areAllQuestionsVisited()) {
    return <TestResultsView onBack={onBack} onFinish={onFinish} animatedStyle={animatedStyle} />;
    }
    
  // Иначе показываем текущий вопрос
  // Проверяем, был ли текущий вопрос посещен до перехода к нему (т.е. перешли через навигацию)
  const wasCurrentQuestionVisitedBefore = previousVisitedQuestionsRef.current.has(question?.id || '');
  const currentAnswer = answers.find(a => a.questionId === question?.id);
  // Кнопка "Пропустить" не показывается только если:
  // 1. На вопрос можно перейти через навигацию (он был посещен ДО перехода) И вопрос отвечен
  // 2. Или вопрос отвечен
  // Иначе кнопка показывается (включая случай, когда вопрос посещен, но не отвечен)
  const canNavigateToCurrentQuestion = wasCurrentQuestionVisitedBefore && !!currentAnswer;
  
  return (
    <TestQuestionView
      onBack={onBack}
      onFinish={onFinish}
      animatedStyle={animatedStyle}
      selectedAnswers={selectedAnswers}
      showResult={showResult}
      isMultiSelect={isMultiSelect}
      onAnswerToggle={handleAnswerToggle}
      onNext={handleNext}
      onSkip={handleSkip}
      onPrevious={handlePrevious}
      canNavigateToQuestion={canNavigateToCurrentQuestion}
    />
  );
}

