import { useTest } from '@/contexts/test-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import { saveTestResult } from '@/hooks/api/useTestResults';
import { useAddOrUpdateTestStats } from '@/hooks/api/useTestStats';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';
import { Alert, Platform, Pressable, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { BackButton } from '../explorer/back-button';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { styles } from './styles';
import { getAnswerStatus } from './utils';

type TestQuestionViewProps = {
  onBack: () => void;
  onFinish: () => void;
  animatedStyle: any;
  selectedAnswers: number[];
  showResult: boolean;
  isMultiSelect: boolean;
  onAnswerToggle: (index: number) => void;
  onNext: () => void;
  onSkip: () => void;
  onPrevious: () => void;
  canNavigateToQuestion?: boolean;
};

export function TestQuestionView({
  onBack,
  onFinish,
  animatedStyle,
  selectedAnswers,
  showResult,
  isMultiSelect,
  onAnswerToggle,
  onNext,
  onSkip,
  onPrevious,
  canNavigateToQuestion = false,
}: TestQuestionViewProps) {
  const {
    test,
    currentQuestionIndex,
    answers,
    visitedQuestions,
    getCurrentQuestion,
    submitAnswer,
    finishTest,
    getTotalScore,
    getTotalErrors,
    startedAt,
    goToQuestion,
    areAllQuestionsVisited,
    processSkippedQuestions,
  } = useTest();
  const { deviceId } = useDeviceId();

  // Хук для сохранения статистики теста (вызываем всегда, но используем только когда нужно)
  const testStatsHook = useAddOrUpdateTestStats({
    clientId: deviceId || '',
    testId: test?.id || '',
    startedAt: startedAt || new Date().toISOString(),
  });

  const question = getCurrentQuestion();
  const { page: backgroundColor, border: borderColor, success: successColor, error: errorColor, warning: warningColor, primary: buttonColor, successContainer, errorContainer, warningContainer, layout2: disabledBackground } = useAppTheme();
  
  // Create alpha colors from containers
  const successAlpha10 = successContainer + '1A'; // ~10% opacity
  const errorAlpha10 = errorContainer + '1A'; // ~10% opacity
  const warningAlpha10 = warningContainer + '1A'; // ~10% opacity

  // Загружаем изображение, если оно есть
  const { response: imageDataUrl, isLoading: isLoadingImage } = useFileImage(
    question?.image || ''
  );

  if (!test || !question) return null;

  const totalQuestions = test.questions?.length || 0;
  const currentAnswer = answers.find((a) => a.questionId === question.id);
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isTestCompleted = areAllQuestionsVisited();
  const isFirstQuestion = currentQuestionIndex === 0;
  // Кнопка "Пропустить" показывается только если:
  // 1. showSkipButton !== false
  // 2. Вопрос не отвечен и не был пропущен ранее
  // 3. Если на вопрос можно перейти через навигацию (он был посещен ранее и отвечен или пропущен), то кнопку не показываем
  const shouldShowSkipButton = test.showSkipButton !== false && !showResult && !currentAnswer && !canNavigateToQuestion;
  
  // Определяем, нужно ли показывать результаты (учитываем showCorrectAnswer)
  const shouldShowResults = showResult && (test.showCorrectAnswer !== false);

  // Определяем, является ли ответ частично правильным
  const isPartiallyCorrect = (() => {
    if (!currentAnswer || !question || !question.answers) return false;
    
    // Получаем выбранные ответы по индексам из currentAnswer
    const answerIndices = currentAnswer.answerIds.map(id => parseInt(id, 10));
    const selectedAnswers = question.answers.filter((_, index) => 
      answerIndices.includes(index)
    );
    
    // Находим правильные ответы
    const correctAnswers = question.answers.filter(a => a.isCorrect);
    const selectedCorrectAnswers = selectedAnswers.filter(a => a.isCorrect);
    
    // Частично правильный, если:
    // 1. Выбраны некоторые правильные ответы, но не все
    // 2. Или выбраны правильные, но также выбраны неправильные
    const hasSomeCorrect = selectedCorrectAnswers.length > 0;
    const notAllCorrect = selectedCorrectAnswers.length < correctAnswers.length;
    const hasIncorrect = selectedAnswers.some(a => !a.isCorrect);
    
    return hasSomeCorrect && (notAllCorrect || hasIncorrect) && !currentAnswer.isCorrect;
  })();

  const handleFinish = async () => {
    if (!test) return;

    // Обрабатываем пропущенные вопросы как ошибочные и получаем финальные ответы
    const finalAnswers = processSkippedQuestions();

    // Рассчитываем итоговые результаты на основе финальных ответов
    const totalScore = finalAnswers.reduce((sum, answer) => sum + answer.score, 0);
    const totalErrors = finalAnswers.filter(answer => !answer.isCorrect).length;
    const isPassed =
      (test.minScore === undefined || test.minScore === null || totalScore >= test.minScore) &&
      (test.maxErrors === undefined || test.maxErrors === null || totalErrors <= test.maxErrors);

    try {
      await saveTestResult({
        testId: test.id,
        totalScore,
        totalErrors,
        isPassed,
        answers: finalAnswers,
      });
      
      // Сохраняем completedAt и passed в статистику
      if (deviceId && startedAt && test) {
        try {
          const completedAt = new Date().toISOString();
          await testStatsHook.addOrUpdate({
            completedAt,
            passed: isPassed,
          });
        } catch (error) {
          console.error('Error saving test stats on finish:', error);
          // Не блокируем завершение теста при ошибке сохранения статистики
        }
      }
      
      finishTest();
      onFinish();
    } catch (error) {
      const errorMessage = 'Не удалось сохранить результаты теста. Попробуйте еще раз.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Ошибка', errorMessage);
      }
      console.error('Error saving test result:', error);
    }
  };

  const handleFinishWithConfirmation = () => {
    const message = 'Вы уверены, что хотите завершить тест? Неотвеченные вопросы будут засчитаны как неправильные.';
    
    if (Platform.OS === 'web') {
      // Для веб используем window.confirm
      if (typeof window !== 'undefined' && window.confirm(message)) {
        // Сохраняем текущий ответ, если он выбран
        if (selectedAnswers.length > 0 && !showResult) {
          submitAnswer(question.id, selectedAnswers);
        }
        // Вызываем handleFinish асинхронно
        void handleFinish();
      }
    } else {
      // Для нативных платформ используем Alert.alert
      Alert.alert(
        'Завершить тест',
        message,
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
    }
  };

  const handleBackToFolder = () => {
    // При нажатии на кнопку "Назад" вызываем процедуру завершения теста
    handleFinishWithConfirmation();
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }, animatedStyle]}>
      <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedView style={styles.headerContent}>
          {test.showBackButton !== false && (
            <BackButton onPress={handleBackToFolder} label="Назад" />
          )}
        {/* <ThemedText style={styles.progressText}>
          Вопрос {currentQuestionIndex + 1} из {totalQuestions}
        </ThemedText> */}
        </ThemedView>
        {/* Навигация по вопросам - показывается если showNavigation !== false и нет ни одного activationCondition в тесте */}
        {test.showNavigation !== false && 
         test.questions && test.questions.length > 0 && 
         !test.questions.some(q => q.activationCondition) && (
          <ThemedView style={styles.questionsNavigation}>
            {test.questions.map((q, index) => {
              const isVisited = visitedQuestions.has(q.id);
              const isCurrent = index === currentQuestionIndex;
              const questionAnswer = answers.find(a => a.questionId === q.id);
              const isCorrect = questionAnswer?.isCorrect;
              const isSkipped = isVisited && !questionAnswer; // Посещен, но не отвечен
              
              // Определяем стиль в зависимости от состояния
              let navStyle: any = {
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: borderColor,
                backgroundColor: isCurrent ? buttonColor : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginHorizontal: 4,
              };

              // Активный вопрос всегда primary цвет
              if (isCurrent) {
                navStyle.backgroundColor = buttonColor;
                navStyle.borderColor = buttonColor;
              } else {
                // Если showCorrectAnswer = true, показываем правильные/неправильные для неактивных
                if (test.showCorrectAnswer && isVisited && questionAnswer) {
                  if (isCorrect) {
                    navStyle.borderColor = successColor;
                    navStyle.backgroundColor = successAlpha10;
                  } else {
                    navStyle.borderColor = errorColor;
                    navStyle.backgroundColor = errorAlpha10;
                  }
                } else if (test.showCorrectAnswer === false && questionAnswer) {
                  // Если showCorrectAnswer = false и вопрос отвечен, обводим primary рамкой
                  navStyle.borderColor = buttonColor;
                }
              }

              // Пропущенные вопросы (посещены, но не отвечены) - пунктирная рамка
              if (isSkipped && !isCurrent) {
                navStyle.borderStyle = 'dashed';
              }

              return (
                <Pressable
                  key={q.id}
                  onPress={() => isVisited && goToQuestion(q.id)}
                  disabled={!isVisited}
                  style={[
                    navStyle,
                    !isVisited && { opacity: 0.5 },
                  ]}
                >
                  <ThemedText
                    style={{
                      fontSize: 12,
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      color: isCurrent ? '#fff' : undefined,
                    }}
                  >
                    {index + 1}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        )}
      </ThemedView>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.questionContainer}>
          {question.image && (
            <ThemedView style={styles.imageContainer}>
                {isLoadingImage ? (
                  <ThemedText style={styles.imagePlaceholder}>Загрузка изображения...</ThemedText>
                ) : imageDataUrl ? (
                  <Image
                    source={{ uri: imageDataUrl }}
                    style={styles.questionImage}
                    contentFit="contain"
                    transition={200}
                  />
                ) : (
              <ThemedText style={styles.imagePlaceholder}>
                [Изображение: {question.image}]
              </ThemedText>
                )}
            </ThemedView>
          )}
            <ThemedText 
              type="subtitle" 
              style={[
                styles.questionTitle,
                !question.image && styles.questionTitleWithoutImage
              ]}
            >
              {question.questionText}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.divider} />
          {question.answers && question.answers.length > 0 && (
            <ThemedView style={styles.answersContainer}>
              {question.answers.map((answer, index) => {
                const status = getAnswerStatus(
                  index,
                  shouldShowResults,
                  question,
                  answers,
                  question.id
                );
                const isSelected = selectedAnswers.includes(index);
                const isAnswerCorrect = answer.isCorrect || false;

                // Определяем, был ли ответ выбран (используем сохраненные ответы при показе результатов)
                const wasSelected = shouldShowResults && currentAnswer
                  ? currentAnswer.answerIds.map(id => parseInt(id, 10)).includes(index)
                  : isSelected;

                // Определяем подпись для ответа (только когда показываются результаты)
                let answerLabel = '';
                let answerLabelType: 'selected-correct' | 'selected-incorrect' | 'not-selected-correct' | null = null;
                let shouldShowBadge = false;
                
                if (shouldShowResults && currentAnswer) {
                  // Когда показываются результаты:
                  if (wasSelected) {
                    // Пользователь выбрал ответ
                    if (isAnswerCorrect) {
                      // Выбрал верный ответ
                      answerLabel = 'Выбрано';
                      answerLabelType = 'selected-correct';
                      shouldShowBadge = true;
                    } else {
                      // Выбрал неверный ответ
                      answerLabel = 'Выбрано';
                      answerLabelType = 'selected-incorrect';
                      shouldShowBadge = true;
                    }
                  } else if (isAnswerCorrect) {
                    // Пользователь не выбрал ответ, но ответ верный
                    answerLabel = 'Не выбрано';
                    answerLabelType = 'not-selected-correct';
                    shouldShowBadge = true;
                  }
                  // Если пользователь не выбрал неправильный ответ - не показываем badge
                }

                // Определяем стили для контейнера кнопки в зависимости от состояния
                const containerStyles: any[] = [styles.answerButtonContainer];
                
                if (shouldShowResults && currentAnswer) {
                  if (wasSelected) {
                    // Пользователь выбрал ответ
                    if (isAnswerCorrect) {
                      // Выбрал верный ответ - зеленый фон
                      containerStyles.push({
                        borderColor: successColor,
                        backgroundColor: successAlpha10,
                      });
                    } else {
                      // Выбрал неверный ответ - красный фон
                      containerStyles.push({
                        borderColor: errorColor,
                        backgroundColor: errorAlpha10,
                      });
                    }
                  } else if (isAnswerCorrect) {
                    // Пользователь не выбрал ответ, но ответ верный - warning фон
                    containerStyles.push({
                      borderColor: warningColor,
                      backgroundColor: warningAlpha10,
                    });
                  }
                  // Если пользователь не выбрал неправильный ответ - обычный фон (не меняем)
                } else if (isSelected) {
                  containerStyles.push(styles.answerButtonSelected);
                }
                
                if (shouldShowResults && status === 'should-be-selected') {
                  containerStyles.push(styles.answerButtonShouldBeSelected);
                }

                return (
                  <ThemedView key={index} style={[containerStyles, { position: 'relative' }]}>
                    <Pressable
                      onPress={() => onAnswerToggle(index)}
                      disabled={showResult}
                      style={styles.answerButtonContent}
                    >
                      <ThemedText style={styles.answerText} numberOfLines={0}>
                        {answer.answerText}
                      </ThemedText>
                    </Pressable>
                    {shouldShowBadge && answerLabel && (
                      <ThemedView
                        style={[
                          styles.answerBadge,
                          answerLabelType === 'selected-correct' && {
                            backgroundColor: successColor,
                          },
                          answerLabelType === 'not-selected-correct' && {
                            backgroundColor: warningColor,
                          },
                          answerLabelType === 'selected-incorrect' && {
                            backgroundColor: errorColor,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.answerBadgeText,
                            {
                              color: '#fff',
                            },
                          ]}
                        >
                          {answerLabel}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                );
              })}
            </ThemedView>
          )}
          {shouldShowResults && currentAnswer && (
            <ThemedView
              style={[
                styles.resultMessage,
                {
                  backgroundColor: currentAnswer.isCorrect
                    ? successAlpha10
                    : isPartiallyCorrect
                    ? warningAlpha10
                    : errorAlpha10,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.resultMessageText,
                  {
                    color: currentAnswer.isCorrect 
                      ? successColor 
                      : isPartiallyCorrect
                      ? warningColor
                      : errorColor,
                  },
                ]}
              >
                {currentAnswer.isCorrect 
                  ? '✓ Правильный ответ!' 
                  : isPartiallyCorrect
                  ? '⚠ Частично правильный ответ'
                  : '✗ Неправильный ответ'}
              </ThemedText>
              {currentAnswer.score > 0 && (
                <ThemedText style={styles.resultScoreText}>
                  Баллов: {currentAnswer.score}
                </ThemedText>
              )}
            </ThemedView>
          )}
          <ThemedView style={styles.buttonsRow}>
            {!isFirstQuestion && !isTestCompleted && test.showBackButton !== false ? (
              <>
                <Pressable
                  onPress={onPrevious}
                  style={({ pressed }) => [
                    styles.previousButton,
                    {
                      flex: 1,
                      backgroundColor: pressed ? borderColor + 'CC' : 'transparent',
                      borderColor: borderColor,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText style={styles.previousButtonText}>Назад</ThemedText>
                </Pressable>
                <Pressable
                  onPress={onNext}
                  disabled={!showResult && selectedAnswers.length === 0}
                  style={({ pressed }) => [
                    styles.nextButton,
                    {
                      flex: 1,
                      backgroundColor:
                        !showResult && selectedAnswers.length === 0
                          ? disabledBackground
                          : pressed
                          ? buttonColor + 'CC'
                          : buttonColor,
                      opacity: (!showResult && selectedAnswers.length === 0) || pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText style={styles.nextButtonText}>
                    {showResult ? (isTestCompleted ? 'Завершить' : 'Далее') : 'Далее'}
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={onNext}
                disabled={!showResult && selectedAnswers.length === 0}
                style={({ pressed }) => [
                  styles.nextButton,
                  {
                    flex: 1,
                    backgroundColor:
                      !showResult && selectedAnswers.length === 0
                        ? disabledBackground
                        : pressed
                        ? buttonColor + 'CC'
                        : buttonColor,
                    opacity: (!showResult && selectedAnswers.length === 0) || pressed ? 0.8 : 1,
                  },
                ]}
              >
                <ThemedText style={styles.nextButtonText}>
                  {showResult ? (isTestCompleted ? 'Завершить' : 'Далее') : 'Далее'}
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
          {shouldShowSkipButton && (
            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [
                styles.skipButton,
                {
                  backgroundColor: pressed ? borderColor + 'CC' : 'transparent',
                  borderColor: borderColor,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText style={styles.skipButtonText}>Пропустить</ThemedText>
            </Pressable>
          )}
          {!isTestCompleted && (
            <Pressable
              onPress={handleFinishWithConfirmation}
              style={({ pressed }) => [
                styles.finishTestButton,
                {
                  backgroundColor: pressed ? errorColor + 'CC' : errorColor,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              // Для веб добавляем cursor pointer и явную обработку onClick
              {...(Platform.OS === 'web' && {
                cursor: 'pointer',
                onClick: (e: any) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFinishWithConfirmation();
                },
              })}
            >
              <ThemedText style={styles.finishTestButtonText}>Завершить тест</ThemedText>
            </Pressable>
          )}
        </ThemedView>
      </ScrollView>
    </Animated.View>
  );
}
