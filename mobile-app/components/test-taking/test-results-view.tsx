import { useTest } from '@/contexts/test-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Pressable, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from '../ui/icon-symbol';
import { QuestionAccordion } from './question-accordion';
import { styles } from './styles';

type TestResultsViewProps = {
  onBack: () => void;
  onFinish: () => void;
  animatedStyle: any;
};

import { Colors } from '@/constants/theme';

const successColor = Colors.light.success;
const errorColor = Colors.light.error;
const buttonColor = Colors.light.primary;

export function TestResultsView({ onBack, onFinish, animatedStyle }: TestResultsViewProps) {
  const {
    test,
    answers,
    getTotalScore,
    getTotalErrors,
    finishTest,
  } = useTest();

  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');
  const tintColor = useThemeColor({}, 'tint');

  if (!test) return null;

  const totalScore = getTotalScore();
  const totalErrors = getTotalErrors();
  const isPassed =
    (test.minScore === undefined || test.minScore === null || totalScore >= test.minScore) &&
    (test.maxErrors === undefined || test.maxErrors === null || totalErrors <= test.maxErrors);

  const handleFinish = () => {
    finishTest();
    onFinish();
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
          {test.questions &&
            test.questions.map((q, questionIndex) => {
              const questionAnswer = answers.find((a) => a.questionId === q.id);
              const savedAnswerIndices =
                questionAnswer?.answerIds.map((id) => parseInt(id, 10)) || [];

              return (
                <QuestionAccordion
                  key={q.id}
                  question={q}
                  questionIndex={questionIndex}
                  questionAnswer={questionAnswer}
                  savedAnswerIndices={savedAnswerIndices}
                  testAnswers={answers}
                  testQuestions={test.questions}
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
