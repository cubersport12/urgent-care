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
import { Button } from '../ui/button';
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
}: TestQuestionViewProps) {
  const {
    test,
    currentQuestionIndex,
    answers,
    getCurrentQuestion,
    submitAnswer,
    finishTest,
    getTotalScore,
    getTotalErrors,
    startedAt,
  } = useTest();
  const { deviceId } = useDeviceId();

  // Хук для сохранения статистики теста (вызываем всегда, но используем только когда нужно)
  const testStatsHook = useAddOrUpdateTestStats({
    clientId: deviceId || '',
    testId: test?.id || '',
    startedAt: startedAt || new Date().toISOString(),
  });

  const question = getCurrentQuestion();
  const { page: backgroundColor, border: borderColor, success: successColor, error: errorColor, primary: buttonColor, successContainer, errorContainer, layout2: disabledBackground } = useAppTheme();
  
  // Create alpha colors from containers
  const successAlpha10 = successContainer + '1A'; // ~10% opacity
  const errorAlpha10 = errorContainer + '1A'; // ~10% opacity

  // Загружаем изображение, если оно есть
  const { response: imageDataUrl, isLoading: isLoadingImage } = useFileImage(
    question?.image || ''
  );

  if (!test || !question) return null;

  const totalQuestions = test.questions?.length || 0;
  const currentAnswer = answers.find((a) => a.questionId === question.id);
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  
  // Определяем, нужно ли показывать результаты (учитываем showCorrectAnswer)
  const shouldShowResults = showResult && (test.showCorrectAnswer !== false);

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

  const handleBack = () => {
    // При нажатии на кнопку "Назад" вызываем ту же процедуру завершения теста
    handleFinishWithConfirmation();
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }, animatedStyle]}>
      <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedView style={styles.headerContent}>
          <BackButton onPress={handleBack} label="Назад" />
        <ThemedText style={styles.progressText}>
          Вопрос {currentQuestionIndex + 1} из {totalQuestions}
        </ThemedText>
        </ThemedView>
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

                // Определяем иконку для результата (только если показываем результаты)
                const resultIcon = shouldShowResults && status 
                  ? (status === 'correct' ? 'checkmark.circle.fill' : 'xmark.circle.fill')
                  : undefined;

                // Определяем стили для кнопки в зависимости от состояния
                const buttonStyles: any[] = [styles.answerButton];
                
                if (shouldShowResults) {
                  if (status === 'correct') {
                    buttonStyles.push({
                      borderColor: successColor,
                      backgroundColor: successAlpha10,
                    });
                  } else if (status === 'incorrect') {
                    buttonStyles.push({
                      borderColor: errorColor,
                      backgroundColor: errorAlpha10,
                    });
                  }
                } else if (isSelected) {
                  buttonStyles.push(styles.answerButtonSelected);
                }
                
                if (shouldShowResults && status === 'should-be-selected') {
                  buttonStyles.push(styles.answerButtonShouldBeSelected);
                }

                return (
                  <Button
                    key={index}
                    title={answer.answerText}
                    onPress={() => onAnswerToggle(index)}
                    disabled={showResult}
                    variant="default"
                    size="small"
                    icon={resultIcon}
                    iconPosition="right"
                    fullWidth
                    style={buttonStyles}
                      />
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
                    : errorAlpha10,
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
                {currentAnswer.isCorrect ? '✓ Правильный ответ!' : '✗ Неправильный ответ'}
              </ThemedText>
              {currentAnswer.score > 0 && (
                <ThemedText style={styles.resultScoreText}>
                  Баллов: {currentAnswer.score}
                </ThemedText>
              )}
            </ThemedView>
          )}
          <Pressable
            onPress={onNext}
            disabled={!showResult && selectedAnswers.length === 0}
            style={({ pressed }) => [
              styles.nextButton,
              {
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
