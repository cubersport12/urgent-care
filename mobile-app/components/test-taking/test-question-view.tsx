import { Spacing } from '@/constants/theme';
import { useChromeBack } from '@/contexts/chrome-back-context';
import { useTest, type TestAnswer } from '@/contexts/test-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import { persistTestCompletion } from '@/hooks/api/useTestResults';
import { useAddOrUpdateTestStats } from '@/hooks/api/useTestStats';
import { useDeviceId } from '@/hooks/use-device-id';
import { useAppTheme, useGlass } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BackButton } from '../explorer/back-button';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Button } from '../ui/button';
import { IconSymbol } from '../ui/icon-symbol';
import { ScreenBackground } from '../ui/screen-background';
import { ProgressBar } from '../ui/progress-bar';
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
  onSaveTraining?: (answers: TestAnswer[]) => Promise<void>;
  marathon?: boolean;
};

export function TestQuestionView({
  animatedStyle,
  selectedAnswers,
  showResult,
  isMultiSelect,
  onAnswerToggle,
  onNext,
  onSkip,
  onPrevious,
  canNavigateToQuestion = false,
  onSaveTraining,
  marathon = false,
}: TestQuestionViewProps) {
  const {
    test,
    currentQuestionIndex,
    answers,
    visitedQuestions,
    getCurrentQuestion,
    submitAnswer,
    finishTest,
    startedAt,
    goToQuestion,
    areAllQuestionsVisited,
    processSkippedQuestions,
  } = useTest();
  const { deviceId } = useDeviceId();
  const [navigationExpanded, setNavigationExpanded] = useState(false);

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
    text,
    neutral,
    onPrimary,
    primaryContainer,
    successContainer,
    errorContainer,
    warningContainer,
    onPrimaryContainer,
    onSuccessContainer,
    onErrorContainer,
    onWarningContainer,
  } = useAppTheme();
  const glass = useGlass();
  const styles = useTestTakingStyles();

  // Загружаем изображение, если оно есть
  const { response: imageDataUrl, isLoading: isLoadingImage } = useFileImage(
    question?.image || ''
  );

  const handleFinish = async () => {
    if (!test) return;

    const finalAnswers = processSkippedQuestions(!marathon);
    try {
      if (onSaveTraining) await onSaveTraining(finalAnswers);
      else await persistTestCompletion({
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
    if (!test || !question) return;

    const message = marathon ? 'Завершить марафон и сохранить результат?' : 'Вы уверены, что хотите завершить тест? Неотвеченные вопросы будут засчитаны как неправильные.';
    
    if (Platform.OS === 'web') {
      // Для веб используем window.confirm
      if (typeof window !== 'undefined' && window.confirm(message)) {
        // Сохраняем текущий ответ, если он выбран
        if (!marathon && selectedAnswers.length > 0 && !showResult) {
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
              if (!marathon && selectedAnswers.length > 0 && !showResult) {
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
    handleFinishWithConfirmation();
  };

  useChromeBack(test && question ? handleBackToFolder : null);

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

  const nextLabel = showResult
    ? isTestCompleted
      ? 'Завершить'
      : 'Далее'
    : isLastQuestion
      ? 'Завершить'
      : 'Далее';
  const canProceed = showResult || selectedAnswers.length > 0;
  const hasNavigation = test.showNavigation !== false &&
    totalQuestions > 0 && !test.randomizeQuestions &&
    !test.questions?.some((q) => q.activationCondition);

  return (
    <ScreenBackground style={styles.container}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.questionHeader}>
          <View style={styles.headerContent}>
            <BackButton onPress={handleBackToFolder} close label="Завершить тест" />
            <View style={styles.testHeaderDetails}>
              <ThemedText type="defaultSemiBold" style={styles.testHeaderTitle} numberOfLines={1}>
                {test.name}
              </ThemedText>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Прогресс теста"
                accessibilityValue={{ min: 0, max: totalQuestions, now: currentQuestionIndex + 1 }}
              >
                <ProgressBar current={currentQuestionIndex + 1} total={totalQuestions} height={Spacing.xs} variant="muted" />
              </View>
            </View>
            <Pressable
              accessibilityRole={hasNavigation ? 'button' : 'text'}
              accessibilityLabel={`Вопрос ${currentQuestionIndex + 1} из ${totalQuestions}`}
              accessibilityHint={hasNavigation ? 'Показать или скрыть переход к вопросам' : undefined}
              accessibilityState={hasNavigation ? { expanded: navigationExpanded } : undefined}
              disabled={!hasNavigation}
              onPress={() => setNavigationExpanded((expanded) => !expanded)}
              style={({ pressed }) => [styles.questionCounter, pressed && { backgroundColor: glass.backgroundHover }]}
            >
              <ThemedText type="caption" style={{ color: neutral }}>
                {currentQuestionIndex + 1} / {totalQuestions}
              </ThemedText>
              {hasNavigation ? (
                <IconSymbol name={navigationExpanded ? 'chevron.up' : 'chevron.down'} size={Spacing.card} color={neutral} />
              ) : null}
            </Pressable>
          </View>
          {hasNavigation && navigationExpanded ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.questionsNavigation}>
                {test.questions?.map((q, index) => {
                  const isVisited = visitedQuestions.has(q.id);
                  const isCurrent = index === currentQuestionIndex;
                  const questionAnswer = answers.find((a) => a.questionId === q.id);
                  const isCorrect = questionAnswer?.isCorrect;
                  const isSkipped = isVisited && !questionAnswer;

                  let navBorderColor: string = glass.borderSubtle;
                  let navBackgroundColor: string = glass.backgroundSubtle;
                  let navTextColor = neutral;
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
                      navBackgroundColor = successContainer;
                      navTextColor = onSuccessContainer;
                    } else {
                      navBorderColor = errorColor;
                      navBackgroundColor = errorContainer;
                      navTextColor = onErrorContainer;
                    }
                  } else if (isSkipped) {
                    navBorderStyle = 'dashed';
                    navBorderColor = warningColor;
                    navBackgroundColor = warningContainer;
                    navTextColor = onWarningContainer;
                    navBorderWidth = 2;
                  }

                  return (
                    <Pressable
                      key={q.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Вопрос ${index + 1}${questionAnswer ? isCorrect ? ', верно' : ', неверно' : isSkipped ? ', пропущен' : ''}`}
                      accessibilityState={{ selected: isCurrent, disabled: !isVisited }}
                      onPress={() => isVisited && goToQuestion(q.id)}
                      disabled={!isVisited}
                      style={[
                        styles.questionNavigationItem,
                        {
                          borderWidth: navBorderWidth,
                          borderStyle: navBorderStyle,
                          borderColor: navBorderColor,
                          backgroundColor: navBackgroundColor,
                        },
                        !isVisited && { opacity: 0.45 },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color: navTextColor }}
                      >
                        {index + 1}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.questionScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.questionContent}>
            <View style={styles.questionCopy}>
              {question.image ? (
                <ThemedView style={styles.imageContainer}>
                  {isLoadingImage ? (
                    <ThemedText type="caption" style={{ color: neutral }}>
                      Загрузка изображения...
                    </ThemedText>
                  ) : imageDataUrl ? (
                    <Image
                      source={{ uri: imageDataUrl }}
                      style={styles.questionImage}
                      contentFit="contain"
                      accessibilityLabel="Изображение к вопросу"
                    />
                  ) : (
                    <ThemedText type="caption" style={{ color: neutral }}>
                      [Изображение: {question.image}]
                    </ThemedText>
                  )}
                </ThemedView>
              ) : null}

              <ThemedText type="defaultSemiBold" accessibilityRole="header">{question.questionText}</ThemedText>
              {isMultiSelect ? <ThemedText type="caption" style={styles.questionHint}>Выберите несколько ответов</ThemedText> : null}
            </View>

            {question.answers && question.answers.length > 0 ? (
              <View style={{ gap: Spacing.sm }}>
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

                  let answerBg: string = glass.backgroundSubtle;
                  let answerBorder: string = glass.borderSubtle;
                  let letterColor = text;

                  if (shouldShowResults && currentAnswer) {
                    if (wasSelected && isAnswerCorrect) {
                      answerBg = successContainer;
                      answerBorder = successColor;
                      letterColor = onSuccessContainer;
                    } else if (wasSelected && !isAnswerCorrect) {
                      answerBg = errorContainer;
                      answerBorder = errorColor;
                      letterColor = onErrorContainer;
                    } else if (!wasSelected && isAnswerCorrect) {
                      answerBg = successContainer;
                      answerBorder = successColor;
                      letterColor = onSuccessContainer;
                    }
                  } else if (isSelected) {
                    answerBg = primaryContainer;
                    answerBorder = buttonColor;
                    letterColor = onPrimaryContainer;
                  }

                  if (shouldShowResults && status === 'should-be-selected') {
                    answerBorder = successColor;
                    answerBg = successContainer;
                  }

                  return (
                    <Pressable
                      key={index}
                      onPress={() => onAnswerToggle(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`${answer.answerText}${shouldShowResults ? isAnswerCorrect ? ', правильный ответ' : wasSelected ? ', неверный ответ' : '' : ''}`}
                      accessibilityState={{ selected: wasSelected, disabled: showResult }}
                      disabled={showResult}
                      style={({ pressed }) => [
                        styles.questionAnswer,
                        {
                          borderColor: answerBorder,
                          borderStyle: status === 'should-be-selected' ? 'dashed' : 'solid',
                          backgroundColor: answerBg,
                          opacity: pressed && !showResult ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View style={styles.answerRow}>
                        <View
                          style={styles.answerLetterBadge}
                          aria-hidden
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        >
                          {wasSelected || (shouldShowResults && isAnswerCorrect) ? (
                            <IconSymbol name={shouldShowResults && !isAnswerCorrect ? 'xmark' : 'checkmark'} size={Spacing.card} color={letterColor} />
                          ) : (
                            <ThemedText type="caption">{String.fromCharCode(65 + index)}</ThemedText>
                          )}
                        </View>
                        <ThemedText style={styles.answerCopy}>
                          {answer.answerText}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {shouldShowResults && currentAnswer && currentAnswer.score != null && currentAnswer.score > 0 ? (
              <ThemedText type="caption">Баллов: {currentAnswer.score}</ThemedText>
            ) : null}

            <View style={styles.questionActions}>
              {!isFirstQuestion && !isTestCompleted && test.showBackButton !== false ? (
                <Button
                  title="Назад"
                  variant="ghost"
                  onPress={onPrevious}
                  accessibilityRole="button"
                  style={styles.questionAction}
                />
              ) : null}
              {shouldShowSkipButton ? (
                <Button
                  title="Пропустить"
                  variant="ghost"
                  onPress={onSkip}
                  accessibilityRole="button"
                  style={styles.questionAction}
                />
              ) : null}
              <Button
                title={nextLabel}
                onPress={onNext}
                disabled={!canProceed}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canProceed }}
                style={styles.questionNextAction}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenBackground>
  );
}
