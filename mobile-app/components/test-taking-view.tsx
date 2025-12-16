import { useTest } from '@/contexts/test-context';
import { saveTestResult } from '@/hooks/api/useTestResults';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

type TestTakingViewProps = {
  onBack: () => void;
  onFinish: () => void;
};

export function TestTakingView({ onBack, onFinish }: TestTakingViewProps) {
  const {
    test,
    currentQuestionIndex,
    answers,
    isTestCompleted,
    getCurrentQuestion,
    submitAnswer,
    nextQuestion,
    finishTest,
    getTotalScore,
    getTotalErrors,
  } = useTest();

  const question = getCurrentQuestion();
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 300 });
    setSelectedAnswers([]);
    setShowResult(false);

    // Определяем, является ли вопрос мульти или сингл
    if (question && question.answers) {
      const correctAnswersCount = question.answers.filter(a => a.isCorrect).length;
      setIsMultiSelect(correctAnswersCount > 1);
    }
  }, [question, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
  const successColor = '#4CAF50';
  const errorColor = '#F44336';
  // Используем фиксированный синий цвет для кнопок, чтобы текст был всегда виден
  const buttonColor = '#0a7ea4';

  if (!test || !question) {
    return null;
  }

  const totalQuestions = test.questions?.length || 0;
  const currentAnswer = answers.find(a => a.questionId === question.id);
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const handleAnswerToggle = (index: number) => {
    if (showResult) return;

    if (isMultiSelect) {
      setSelectedAnswers(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      setSelectedAnswers([index]);
    }
  };

  const handleNext = async () => {
    if (showResult) {
      if (isLastQuestion) {
        await handleFinish();
      } else {
        nextQuestion();
      }
    } else {
      if (selectedAnswers.length === 0) return;
      
      submitAnswer(question.id, selectedAnswers);
      setShowResult(true);
    }
  };

  const handleFinish = async () => {
    if (!test) return;

    const totalScore = getTotalScore();
    const totalErrors = getTotalErrors();
    const isPassed = 
      (test.minScore === undefined || test.minScore === null || totalScore >= test.minScore) &&
      (test.maxErrors === undefined || test.maxErrors === null || totalErrors <= test.maxErrors);

    try {
      await saveTestResult({
        testId: test.id,
        totalScore,
        totalErrors,
        isPassed,
        answers: answers,
      });
      finishTest();
      onFinish();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить результаты теста. Попробуйте еще раз.');
      console.error('Error saving test result:', error);
    }
  };

  const handleFinishWithConfirmation = () => {
    Alert.alert(
      'Завершить тест',
      'Вы уверены, что хотите завершить тест? Неотвеченные вопросы будут засчитаны как неправильные.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Завершить',
          style: 'destructive',
          onPress: async () => {
            // Сохраняем текущий ответ, если он выбран
            if (selectedAnswers.length > 0 && !showResult) {
              submitAnswer(question.id, selectedAnswers);
            }
            await handleFinish();
          },
        },
      ]
    );
  };

  const getAnswerStatus = (index: number) => {
    if (!showResult) return null;
    
    const answer = question.answers?.[index];
    const isSelected = selectedAnswers.includes(index);
    const isCorrect = answer?.isCorrect || false;

    if (isSelected && isCorrect) return 'correct';
    if (isSelected && !isCorrect) return 'incorrect';
    if (!isSelected && isCorrect) return 'should-be-selected';
    return null;
  };

  if (isTestCompleted || (test.questions && currentQuestionIndex >= test.questions.length)) {
    // Тест завершен, показываем результаты
    const totalScore = getTotalScore();
    const totalErrors = getTotalErrors();
    const isPassed = 
      (test.minScore === undefined || test.minScore === null || totalScore >= test.minScore) &&
      (test.maxErrors === undefined || test.maxErrors === null || totalErrors <= test.maxErrors);

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
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
        <ScrollView style={styles.scrollView}>
          <ThemedView style={styles.content}>
            <ThemedText type="title">
              Тест завершен
            </ThemedText>
            <ThemedView style={styles.resultCard}>
              <ThemedText type="subtitle" style={styles.resultTitle}>
                Результаты:
              </ThemedText>
              <ThemedText style={styles.resultItem}>
                Набрано баллов: {totalScore}
                {test.minScore !== undefined && test.minScore !== null && (
                  <ThemedText> / {test.minScore} (минимум)</ThemedText>
                )}
              </ThemedText>
              <ThemedText style={styles.resultItem}>
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
                <ThemedText style={styles.statusText}>
                  {isPassed ? 'Тест пройден ✓' : 'Тест не пройден ✗'}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <Pressable
              onPress={handleFinish}
              style={({ pressed }) => [
                styles.finishButton,
                {
                  backgroundColor: pressed ? buttonColor + 'CC' : buttonColor,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText style={styles.finishButtonText}>Завершить</ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
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
        <ThemedText style={styles.progressText}>
          Вопрос {currentQuestionIndex + 1} из {totalQuestions}
        </ThemedText>
      </ThemedView>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.content}>
          <ThemedText type="subtitle" style={styles.questionTitle}>
            {question.questionText}
          </ThemedText>
          {question.image && (
            <ThemedView style={styles.imageContainer}>
              <ThemedText style={styles.imagePlaceholder}>
                [Изображение: {question.image}]
              </ThemedText>
            </ThemedView>
          )}
          {question.answers && question.answers.length > 0 && (
            <ThemedView style={styles.answersContainer}>
              {question.answers.map((answer, index) => {
                const status = getAnswerStatus(index);
                const isSelected = selectedAnswers.includes(index);

                return (
                  <Pressable
                    key={index}
                    onPress={() => handleAnswerToggle(index)}
                    disabled={showResult}
                    style={({ pressed }) => [
                      styles.answerItem,
                      isSelected && styles.answerItemSelected,
                      status === 'correct' && styles.answerItemCorrect,
                      status === 'incorrect' && styles.answerItemIncorrect,
                      status === 'should-be-selected' && styles.answerItemShouldBeSelected,
                      pressed && !showResult && styles.answerItemPressed,
                    ]}
                  >
                    <View style={styles.answerContent}>
                      {isMultiSelect ? (
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected,
                            status === 'correct' && styles.checkboxCorrect,
                            status === 'incorrect' && styles.checkboxIncorrect,
                          ]}
                        >
                          {isSelected && (
                            <IconSymbol
                              name="checkmark"
                              size={16}
                              color={
                                status === 'correct'
                                  ? '#fff'
                                  : status === 'incorrect'
                                  ? '#fff'
                                  : tintColor
                              }
                            />
                          )}
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.radio,
                            isSelected && styles.radioSelected,
                            status === 'correct' && styles.radioCorrect,
                            status === 'incorrect' && styles.radioIncorrect,
                          ]}
                        >
                          {isSelected && (
                            <View
                              style={[
                                styles.radioInner,
                                status === 'correct' && styles.radioInnerCorrect,
                                status === 'incorrect' && styles.radioInnerIncorrect,
                              ]}
                            />
                          )}
                        </View>
                      )}
                      <ThemedText
                        style={[
                          styles.answerText,
                          isSelected && styles.answerTextSelected,
                          status === 'correct' && styles.answerTextCorrect,
                          status === 'incorrect' && styles.answerTextIncorrect,
                        ]}
                      >
                        {answer.answerText}
                      </ThemedText>
                    </View>
                    {showResult && status && (
                      <IconSymbol
                        name={status === 'correct' ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                        size={24}
                        color={status === 'correct' ? successColor : errorColor}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ThemedView>
          )}
          {showResult && currentAnswer && (
            <ThemedView
              style={[
                styles.resultMessage,
                {
                  backgroundColor: currentAnswer.isCorrect
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(244, 67, 54, 0.1)',
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.resultMessageText,
                  {
                    color: currentAnswer.isCorrect ? successColor : errorColor,
                  },
                ]}
              >
                {currentAnswer.isCorrect
                  ? '✓ Правильный ответ!'
                  : '✗ Неправильный ответ'}
              </ThemedText>
              {currentAnswer.score > 0 && (
                <ThemedText style={styles.resultScoreText}>
                  Баллов: {currentAnswer.score}
                </ThemedText>
              )}
            </ThemedView>
          )}
          <Pressable
            onPress={handleNext}
            disabled={!showResult && selectedAnswers.length === 0}
            style={({ pressed }) => [
              styles.nextButton,
              {
                backgroundColor:
                  !showResult && selectedAnswers.length === 0
                    ? '#ccc'
                    : pressed
                    ? buttonColor + 'CC'
                    : buttonColor,
                opacity: (!showResult && selectedAnswers.length === 0) || pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText style={styles.nextButtonText}>
              {showResult ? (isLastQuestion ? 'Завершить' : 'Далее') : 'Далее'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleFinishWithConfirmation}
            style={({ pressed }) => [
              styles.finishTestButton,
              {
                backgroundColor: pressed ? errorColor + 'CC' : errorColor,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText style={styles.finishTestButtonText}>Завершить тест</ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  finishTestButton: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  finishTestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  questionTitle: {
    marginBottom: 24,
    fontSize: 20,
  },
  imageContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  imagePlaceholder: {
    fontSize: 12,
    opacity: 0.6,
  },
  answersContainer: {
    marginBottom: 24,
    gap: 12,
  },
  answerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  answerItemSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
  },
  answerItemPressed: {
    opacity: 0.7,
  },
  answerItemCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  answerItemIncorrect: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  answerItemShouldBeSelected: {
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  answerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#0a7ea4',
  },
  checkboxCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  checkboxIncorrect: {
    borderColor: '#F44336',
    backgroundColor: '#F44336',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#0a7ea4',
  },
  radioCorrect: {
    borderColor: '#4CAF50',
  },
  radioIncorrect: {
    borderColor: '#F44336',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0a7ea4',
  },
  radioInnerCorrect: {
    backgroundColor: '#4CAF50',
  },
  radioInnerIncorrect: {
    backgroundColor: '#F44336',
  },
  answerText: {
    flex: 1,
    fontSize: 16,
  },
  answerTextSelected: {
    fontWeight: '600',
  },
  answerTextCorrect: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  answerTextIncorrect: {
    color: '#F44336',
    fontWeight: '600',
  },
  resultMessage: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  resultMessageText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultScoreText: {
    fontSize: 14,
    opacity: 0.7,
  },
  nextButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 24,
  },
  resultTitle: {
    marginBottom: 16,
  },
  resultItem: {
    marginBottom: 12,
    fontSize: 16,
  },
  statusBadge: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  finishButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
