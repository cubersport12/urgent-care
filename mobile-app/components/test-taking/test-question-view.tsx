import { useChromeBack } from '@/contexts/chrome-back-context';
import { useNavRail } from '@/contexts/nav-rail-context';
import { useTest } from '@/contexts/test-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import { persistTestCompletion } from '@/hooks/api/useTestResults';
import { useAddOrUpdateTestStats } from '@/hooks/api/useTestStats';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { Gradients } from '@/constants/theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BackButton } from '../explorer/back-button';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { GlassCard } from '../ui/glass-card';
import { Button } from '../ui/button';
import { ScreenBackground } from '../ui/screen-background';
import { useTestTakingStyles } from './styles';
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
  const {
    success: successColor,
    error: errorColor,
    warning: warningColor,
    primary: buttonColor,
    neutralSoft,
    onPrimary,
    primaryContainer,
    successContainer,
    errorContainer,
    warningContainer,
  } = useAppTheme();
  const glass = useGlass();
  const styles = useTestTakingStyles();
  
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

    const finalAnswers = processSkippedQuestions();
    try {
      await persistTestCompletion({
        testId: test.id,
        minScore: test.minScore,
        maxErrors: test.maxErrors,
        answers: finalAnswers,
        finishReason: 'user',
        onStats:
          deviceId && startedAt
            ? (patch) => testStatsHook.addOrUpdate(patch)
            : undefined,
      });
      finishTest('user');
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

  const { isWide } = useNavRail();
  useChromeBack(handleBackToFolder);

  const progressPercent =
    totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const nextLabel = showResult
    ? isTestCompleted
      ? 'Завершить'
      : 'Далее'
    : isLastQuestion
      ? 'Завершить'
      : 'Далее';
  const canProceed = showResult || selectedAnswers.length > 0;

  return (
    <ScreenBackground style={styles.container}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={[styles.topProgressTrack, { backgroundColor: glass.progressTrack }]}>
          <LinearGradient
            colors={[...Gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.topProgressFill, { width: `${progressPercent}%` }]}
          />
        </View>

        <ThemedView style={[styles.header, { borderBottomColor: glass.border }]}>
          {!isWide ? (
            <ThemedView style={styles.headerContent}>
              <BackButton onPress={handleBackToFolder} />
            </ThemedView>
          ) : null}
          {test.showNavigation !== false &&
            test.questions &&
            test.questions.length > 0 &&
            !test.randomizeQuestions &&
            !test.questions.some((q) => q.activationCondition) && (
              <ThemedView style={styles.questionsNavigation}>
                {test.questions.map((q, index) => {
                  const isVisited = visitedQuestions.has(q.id);
                  const isCurrent = index === currentQuestionIndex;
                  const questionAnswer = answers.find((a) => a.questionId === q.id);
                  const isCorrect = questionAnswer?.isCorrect;
                  const isSkipped = isVisited && !questionAnswer;

                  let navBorderColor = glass.borderSubtle;
                  let navBackgroundColor = 'transparent';
                  let navTextColor = neutralSoft;
                  let navBorderStyle: 'solid' | 'dashed' = 'solid';
                  let navBorderWidth = 1;

                  if (isCurrent) {
                    navBackgroundColor = buttonColor;
                    navBorderColor = buttonColor;
                    navTextColor = onPrimary;
                    navBorderWidth = 2;
                  } else if (questionAnswer) {
                    navBorderWidth = 2;
                    if (isCorrect) {
                      navBorderColor = successColor;
                      navBackgroundColor = successAlpha10;
                      navTextColor = successColor;
                    } else {
                      navBorderColor = errorColor;
                      navBackgroundColor = errorAlpha10;
                      navTextColor = errorColor;
                    }
                  } else if (isSkipped) {
                    navBorderStyle = 'dashed';
                    navBorderColor = warningColor;
                    navBackgroundColor = warningAlpha10;
                    navTextColor = warningColor;
                    navBorderWidth = 2;
                  }

                  return (
                    <Pressable
                      key={q.id}
                      onPress={() => isVisited && goToQuestion(q.id)}
                      disabled={!isVisited}
                      style={[
                        {
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          borderWidth: navBorderWidth,
                          borderStyle: navBorderStyle,
                          borderColor: navBorderColor,
                          backgroundColor: navBackgroundColor,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginHorizontal: 4,
                        },
                        !isVisited && { opacity: 0.45 },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: isCurrent || questionAnswer ? '600' : '400',
                          color: navTextColor,
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.content}>
            <ThemedText style={[styles.progressText, { color: neutralSoft }]}>
              Вопрос {currentQuestionIndex + 1} из {totalQuestions}
            </ThemedText>

            <GlassCard padding={24} borderRadius={16} style={{ marginBottom: 20 }}>
              {question.image ? (
                <ThemedView style={[styles.imageContainer, { borderColor: glass.borderSubtle, backgroundColor: glass.backgroundSubtle }]}>
                  {isLoadingImage ? (
                    <ThemedText style={[styles.imagePlaceholder, { color: neutralSoft }]}>
                      Загрузка изображения...
                    </ThemedText>
                  ) : imageDataUrl ? (
                    <Image
                      source={{ uri: imageDataUrl }}
                      style={styles.questionImage}
                      contentFit="contain"
                      transition={200}
                    />
                  ) : (
                    <ThemedText style={[styles.imagePlaceholder, { color: neutralSoft }]}>
                      [Изображение: {question.image}]
                    </ThemedText>
                  )}
                </ThemedView>
              ) : null}

              <View style={styles.questionRow}>
                <View style={[styles.questionNumberBadge, { backgroundColor: `${buttonColor}26` }]}>
                  <ThemedText style={[styles.questionNumberText, { color: buttonColor }]}>
                    {currentQuestionIndex + 1}
                  </ThemedText>
                </View>
                <ThemedText style={styles.questionTitle}>{question.questionText}</ThemedText>
              </View>
            </GlassCard>

            {question.answers && question.answers.length > 0 ? (
              <ThemedView style={styles.answersContainer}>
                {question.answers.map((answer, index) => {
                  const status = getAnswerStatus(
                    index,
                    shouldShowResults,
                    question,
                    answers,
                    question.id,
                  );
                  const isSelected = selectedAnswers.includes(index);
                  const isAnswerCorrect = answer.isCorrect || false;
                  const wasSelected =
                    shouldShowResults && currentAnswer
                      ? currentAnswer.answerIds.map((id) => parseInt(id, 10)).includes(index)
                      : isSelected;

                  let answerBg = glass.backgroundSubtle;
                  let answerBorder = glass.borderSubtle;
                  let letterBg = glass.backgroundSubtle;
                  let letterBorder = glass.borderSubtle;
                  let letterColor = neutralSoft;

                  if (shouldShowResults && currentAnswer) {
                    if (wasSelected && isAnswerCorrect) {
                      answerBg = successContainer;
                      answerBorder = successColor;
                      letterBg = successContainer;
                      letterBorder = successColor;
                      letterColor = successColor;
                    } else if (wasSelected && !isAnswerCorrect) {
                      answerBg = errorContainer;
                      answerBorder = errorColor;
                      letterBg = errorContainer;
                      letterBorder = errorColor;
                      letterColor = errorColor;
                    } else if (!wasSelected && isAnswerCorrect) {
                      answerBg = successContainer;
                      answerBorder = successColor;
                      letterBg = successContainer;
                      letterBorder = successColor;
                      letterColor = successColor;
                    }
                  } else if (isSelected) {
                    answerBg = primaryContainer;
                    answerBorder = buttonColor;
                    letterBg = primaryContainer;
                    letterBorder = buttonColor;
                    letterColor = buttonColor;
                  }

                  if (shouldShowResults && status === 'should-be-selected') {
                    answerBorder = successColor;
                    answerBg = successContainer;
                  }

                  return (
                    <Pressable
                      key={index}
                      onPress={() => onAnswerToggle(index)}
                      disabled={showResult}
                      style={({ pressed }) => [
                        {
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: answerBorder,
                          backgroundColor: answerBg,
                          opacity: pressed && !showResult ? 0.9 : 1,
                          transform: [{ scale: pressed && !showResult ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <View style={styles.answerRow}>
                        <View
                          style={[
                            styles.answerLetterBadge,
                            {
                              backgroundColor: letterBg,
                              borderColor: letterBorder,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.answerLetterText,
                              { color: letterColor },
                              isSelected && styles.answerLetterTextSelected,
                            ]}
                          >
                            {String.fromCharCode(65 + index)}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.answerText} numberOfLines={0}>
                          {answer.answerText}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </ThemedView>
            ) : null}

            {shouldShowResults && currentAnswer ? (
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
                {currentAnswer.score > 0 ? (
                  <ThemedText style={[styles.resultScoreText, { color: neutralSoft }]}>
                    Баллов: {currentAnswer.score}
                  </ThemedText>
                ) : null}
              </ThemedView>
            ) : null}

            <ThemedView style={styles.buttonsRow}>
              {!isFirstQuestion && !isTestCompleted && test.showBackButton !== false ? (
                <Pressable
                  onPress={onPrevious}
                  style={({ pressed }) => [
                    styles.glassButton,
                    {
                      flex: 1,
                      borderColor: glass.border,
                      backgroundColor: glass.backgroundSubtle,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <ThemedText style={styles.glassButtonText}>Назад</ThemedText>
                </Pressable>
              ) : null}

              <View style={styles.nextButtonWrap}>
                {canProceed ? (
                  <Button title={nextLabel} onPress={onNext} fullWidth size="large" />
                ) : (
                  <Pressable
                    disabled
                    style={[
                      styles.glassButton,
                      {
                        flex: 1,
                        borderColor: glass.borderSubtle,
                        backgroundColor: glass.backgroundSubtle,
                        opacity: 0.4,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.glassButtonText, { color: neutralSoft }]}>
                      {nextLabel}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </ThemedView>

            {shouldShowSkipButton ? (
              <Pressable
                onPress={onSkip}
                style={({ pressed }) => [
                  styles.glassButton,
                  {
                    borderColor: glass.border,
                    backgroundColor: glass.backgroundSubtle,
                    opacity: pressed ? 0.85 : 1,
                    marginTop: 8,
                  },
                ]}
              >
                <ThemedText style={styles.glassButtonText}>Пропустить</ThemedText>
              </Pressable>
            ) : null}

            {!isTestCompleted ? (
              <Pressable
                onPress={handleFinishWithConfirmation}
                style={({ pressed }) => [
                  styles.finishTestButtonGhost,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
                {...(Platform.OS === 'web' && {
                  cursor: 'pointer',
                  onClick: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFinishWithConfirmation();
                  },
                })}
              >
                <ThemedText style={styles.finishTestButtonGhostText}>Завершить тест</ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>
        </ScrollView>
      </Animated.View>
    </ScreenBackground>
  );
}
