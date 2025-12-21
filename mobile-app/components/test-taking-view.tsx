import { useTest } from '@/contexts/test-context';
import { useEffect, useState } from 'react';
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
    finishTest,
  } = useTest();

  const question = getCurrentQuestion();
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!question) return;
    
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 300 });
    // Сбрасываем состояние при смене вопроса - ВАЖНО: делаем это синхронно
    setSelectedAnswers([]);
    setShowResult(false);

    // Определяем, является ли вопрос мульти или сингл
    if (question.answers) {
      const correctAnswersCount = question.answers.filter((a) => a.isCorrect).length;
      setIsMultiSelect(correctAnswersCount > 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]); // Используем question.id для точного отслеживания смены вопроса

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

  const handleNext = () => {
    if (showResult) {
      if (isLastQuestion) {
        // На последнем вопросе после показа результата переходим к странице результатов
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
      
      // Если showCorrectAnswer === false, сразу переходим к следующему вопросу без показа результатов
      if (test.showCorrectAnswer === false) {
        if (isLastQuestion) {
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

  // Если тест завершен, показываем результаты
  if (isTestCompleted || (test.questions && currentQuestionIndex >= test.questions.length)) {
    return <TestResultsView onBack={onBack} onFinish={onFinish} animatedStyle={animatedStyle} />;
    }
    
  // Иначе показываем текущий вопрос
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
    />
  );
}

