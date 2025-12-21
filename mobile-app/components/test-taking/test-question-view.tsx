import { Colors } from '@/constants/theme';
import { useTest } from '@/contexts/test-context';
import { useFileImage } from '@/hooks/api/useFileImage';
import { saveTestResult } from '@/hooks/api/useTestResults';
import { useThemeColor } from '@/hooks/use-theme-color';
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

const successColor = Colors.light.success;
const errorColor = Colors.light.error;
const buttonColor = Colors.light.primary;

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
  } = useTest();

  const question = getCurrentQuestion();
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#1a1a1a' }, 'border');

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

  return (
    <Animated.View style={[styles.container, { backgroundColor }, animatedStyle]}>
      <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedView style={styles.headerContent}>
          <BackButton onPress={onBack} label="Назад" />
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
                      borderColor: Colors.light.success,
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    });
                  } else if (status === 'incorrect') {
                    buttonStyles.push({
                      borderColor: Colors.light.error,
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
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
                    size="medium"
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
