import { Colors } from '@/constants/theme';
import { useTest } from '@/contexts/test-context';
import { useTheme } from '@/contexts/theme-context';
import { AppTestQuestionAnswerVm, AppTestQuestionVm } from '@/hooks/api/types';
import { saveTestResult } from '@/hooks/api/useTestResults';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
    if (!question) return;
    
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 300 });
    // Сбрасываем состояние при смене вопроса - ВАЖНО: делаем это синхронно
    setSelectedAnswers([]);
    setShowResult(false);

    // Определяем, является ли вопрос мульти или сингл
    if (question.answers) {
      const correctAnswersCount = question.answers.filter(a => a.isCorrect).length;
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
    // Не показываем статус, если результат еще не показан или нет вопроса
    if (!showResult || !question) return null;
    
    const answer = question.answers?.[index];
    if (!answer) return null;
    
    // Проверяем, что есть сохраненный ответ для текущего вопроса
    const currentAnswer = answers.find(a => a.questionId === question.id);
    // КРИТИЧНО: Если ответ еще не сохранен для текущего вопроса, не показываем никакой статус
    if (!currentAnswer) return null;

    // Используем сохраненные индексы ответов из контекста, а не из локального состояния
    // Это гарантирует, что мы используем правильные данные для текущего вопроса
    const savedAnswerIndices = currentAnswer.answerIds.map(id => parseInt(id, 10));
    const isSelected = savedAnswerIndices.includes(index);
    
    // answer.isCorrect - это свойство варианта ответа (правильный ли это вариант в принципе)
    // currentAnswer.isCorrect - это результат ответа пользователя (правильно ли ответил пользователь)
    const isAnswerOptionCorrect = answer.isCorrect || false;
    const isUserAnswerCorrect = currentAnswer.isCorrect;

    // Показываем пунктирную рамку только если:
    // 1. Результат показан (showResult === true)
    // 2. Есть сохраненный ответ для текущего вопроса
    // 3. Вариант ответа правильный (isAnswerOptionCorrect), но не был выбран пользователем
    // 4. Пользователь уже ответил на этот вопрос (есть сохраненные ответы)
    // 5. Пользователь ответил неправильно (чтобы показать, какие варианты нужно было выбрать)
    if (!isSelected && isAnswerOptionCorrect && savedAnswerIndices.length > 0 && showResult && !isUserAnswerCorrect) {
      return 'should-be-selected';
    }
    
    // Если вариант выбран и он правильный - показываем зеленым
    if (isSelected && isAnswerOptionCorrect) return 'correct';
    // Если вариант выбран, но он неправильный - показываем красным
    if (isSelected && !isAnswerOptionCorrect) return 'incorrect';
    
    return null;
  };

  // Компонент аккордеона для вопроса
  const QuestionAccordion = ({ 
    question, 
    questionIndex, 
    questionAnswer, 
    savedAnswerIndices 
  }: { 
    question: AppTestQuestionVm; 
    questionIndex: number; 
    questionAnswer: typeof answers[0] | undefined;
    savedAnswerIndices: number[];
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { theme } = useTheme();
    const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
    
    return (
      <ThemedView 
        style={[
          styles.accordionContainer,
          {
            borderColor: pressedBackgroundColor,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.accordionHeader,
            {
              backgroundColor: pressedBackgroundColor,
            },
          ]}
          onPress={() => setIsOpen((value) => !value)}
          activeOpacity={0.8}
        >
          <View style={styles.accordionHeaderContent}>
            <View style={styles.accordionHeaderLeft}>
              <IconSymbol
                name="chevron.right"
                size={18}
                weight="medium"
                color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
              />
              <ThemedText 
                type="defaultSemiBold" 
                style={styles.accordionQuestionText}
                numberOfLines={2}
              >
                {question.questionText}
              </ThemedText>
            </View>
            {questionAnswer && (
              <ThemedView
                style={[
                  styles.accordionStatusBadge,
                  {
                    backgroundColor: questionAnswer.isCorrect
                      ? 'rgba(76, 175, 80, 0.2)'
                      : 'rgba(244, 67, 54, 0.2)',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.accordionStatusBadgeText,
                    {
                      color: questionAnswer.isCorrect ? successColor : errorColor,
                    },
                  ]}
                >
                  {questionAnswer.isCorrect ? '✓ Правильно' : '✗ Неправильно'}
                </ThemedText>
              </ThemedView>
            )}
          </View>
        </TouchableOpacity>
        {isOpen && (
          <ThemedView style={styles.accordionContent}>
            {question.answers && question.answers.length > 0 && (
              <ThemedView style={styles.questionAnswersList}>
                {question.answers.map((answer: AppTestQuestionAnswerVm, answerIndex: number) => {
                  const status = getAnswerStatusForResults(question.id, answerIndex);
                  const isSelected = savedAnswerIndices.includes(answerIndex);
                  
                  return (
                    <ThemedView
                      key={answerIndex}
                      style={[
                        styles.questionAnswerItem,
                        status === 'correct' && styles.questionAnswerCorrect,
                        status === 'incorrect' && styles.questionAnswerIncorrect,
                        status === 'should-be-selected' && styles.questionAnswerShouldBeSelected,
                      ]}
                    >
                      <View style={styles.questionAnswerContent}>
                        {isSelected ? (
                          <View
                            style={[
                              styles.questionAnswerCheckbox,
                              status === 'correct' && styles.questionAnswerCheckboxCorrect,
                              status === 'incorrect' && styles.questionAnswerCheckboxIncorrect,
                            ]}
                          >
                            <IconSymbol
                              name="checkmark"
                              size={14}
                              color={status === 'correct' ? '#fff' : '#fff'}
                            />
                          </View>
                        ) : (
                          <View style={styles.questionAnswerCheckboxEmpty} />
                        )}
                        <ThemedText
                          style={[
                            styles.questionAnswerText,
                            status === 'correct' && styles.questionAnswerTextCorrect,
                            status === 'incorrect' && styles.questionAnswerTextIncorrect,
                            status === 'should-be-selected' && styles.questionAnswerTextShouldBeSelected,
                          ]}
                        >
                          {answer.answerText}
                        </ThemedText>
                      </View>
                      {status && (
                        <IconSymbol
                          name={
                            status === 'correct'
                              ? 'checkmark.circle.fill'
                              : status === 'incorrect'
                              ? 'xmark.circle.fill'
                              : 'exclamationmark.circle.fill'
                          }
                          size={20}
                          color={
                            status === 'correct'
                              ? successColor
                              : status === 'incorrect'
                              ? errorColor
                              : successColor
                          }
                        />
                      )}
                    </ThemedView>
                  );
                })}
              </ThemedView>
            )}
            {questionAnswer && questionAnswer.score > 0 && (
              <ThemedText style={styles.questionScoreText}>
                Баллов: {questionAnswer.score}
              </ThemedText>
            )}
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  // Функция для получения статуса ответа для страницы результатов
  const getAnswerStatusForResults = (questionId: string, answerIndex: number) => {
    const questionAnswer = answers.find(a => a.questionId === questionId);
    if (!questionAnswer) return null;
    
    const savedAnswerIndices = questionAnswer.answerIds.map(id => parseInt(id, 10));
    const isSelected = savedAnswerIndices.includes(answerIndex);
    
    const question = test.questions?.find(q => q.id === questionId);
    const answer = question?.answers?.[answerIndex];
    if (!answer) return null;
    
    const isAnswerOptionCorrect = answer.isCorrect || false;
    const isUserAnswerCorrect = questionAnswer.isCorrect;
    
    if (isSelected && isAnswerOptionCorrect) return 'correct';
    if (isSelected && !isAnswerOptionCorrect) return 'incorrect';
    if (!isSelected && isAnswerOptionCorrect && !isUserAnswerCorrect) return 'should-be-selected';
    
    return null;
  };

  if (isTestCompleted || (test.questions && currentQuestionIndex >= test.questions.length)) {
    // Тест завершен, показываем результаты по всем вопросам
    const totalScore = getTotalScore();
    const totalErrors = getTotalErrors();
    const isPassed = 
      (test.minScore === undefined || test.minScore === null || totalScore >= test.minScore) &&
      (test.maxErrors === undefined || test.maxErrors === null || totalErrors <= test.maxErrors);

    return (
      <Animated.View style={[styles.container, { backgroundColor }, animatedStyle]}>
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
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
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
                <ThemedText style={styles.statusText}>
                  {isPassed ? 'Тест пройден ✓' : 'Тест не пройден ✗'}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            
            {/* Показываем результаты по каждому вопросу */}
            {test.questions && test.questions.map((q, questionIndex) => {
              const questionAnswer = answers.find(a => a.questionId === q.id);
              const savedAnswerIndices = questionAnswer?.answerIds.map(id => parseInt(id, 10)) || [];
              
              return (
                <QuestionAccordion
                  key={q.id}
                  question={q}
                  questionIndex={questionIndex}
                  questionAnswer={questionAnswer}
                  savedAnswerIndices={savedAnswerIndices}
                />
              );
            })}
          </ThemedView>
        </ScrollView>
        <ThemedView style={[styles.fixedButtonContainer, { backgroundColor }]}>
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
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor }, animatedStyle]}>
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
          {!(isLastQuestion && showResult) && (
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
          )}
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
  scrollViewContent: {
    paddingBottom: 100, // Отступ для фиксированной кнопки
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
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
  resultsTitle: {
    marginBottom: 24,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    marginBottom: 16,
    fontSize: 18,
  },
  summaryItem: {
    marginBottom: 12,
    fontSize: 16,
    lineHeight: 24,
  },
  questionResultCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  questionResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionResultNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  questionResultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  questionResultBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  questionResultText: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  questionAnswersList: {
    gap: 10,
    marginBottom: 12,
  },
  questionAnswerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  questionAnswerCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  questionAnswerIncorrect: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  questionAnswerShouldBeSelected: {
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  questionAnswerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  questionAnswerCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
  },
  questionAnswerCheckboxCorrect: {
    backgroundColor: '#4CAF50',
  },
  questionAnswerCheckboxIncorrect: {
    backgroundColor: '#F44336',
  },
  questionAnswerCheckboxEmpty: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  questionAnswerText: {
    flex: 1,
    fontSize: 15,
  },
  questionAnswerTextCorrect: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  questionAnswerTextIncorrect: {
    color: '#F44336',
    fontWeight: '600',
  },
  questionAnswerTextShouldBeSelected: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  questionScoreText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    marginTop: 8,
  },
  accordionContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  accordionHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accordionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionQuestionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  accordionStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexShrink: 0,
  },
  accordionStatusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accordionContent: {
    padding: 16,
    paddingTop: 12,
    marginTop: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
});
