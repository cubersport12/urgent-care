import { useTest } from '@/contexts/test-context';
import { saveTestResult } from '@/hooks/api/useTestResults';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from '../ui/icon-symbol';
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

import { Colors } from '@/constants/theme';

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
    nextQuestion,
    finishTest,
    getTotalScore,
    getTotalErrors,
  } = useTest();

  const question = getCurrentQuestion();
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
  const tintColor = useThemeColor({}, 'tint');

  if (!test || !question) return null;

  const totalQuestions = test.questions?.length || 0;
  const currentAnswer = answers.find((a) => a.questionId === question.id);
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

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
                const status = getAnswerStatus(
                  index,
                  showResult,
                  question,
                  answers,
                  question.id
                );
                const isSelected = selectedAnswers.includes(index);

                return (
                  <Pressable
                    key={index}
                    onPress={() => onAnswerToggle(index)}
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
