import { AppTestVm } from '@/hooks/api/types';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

type TestViewProps = {
  test: AppTestVm;
  onBack: () => void;
};

export function TestView({ test, onBack }: TestViewProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const pressedBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2a2a2a' }, 'background');

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
          <ThemedText type="title" style={styles.title}>
            {test.name}
          </ThemedText>
          {test.minScore !== undefined && test.minScore !== null && (
            <ThemedText style={styles.meta}>
              Минимальный балл: {test.minScore}
            </ThemedText>
          )}
          {test.maxErrors !== undefined && test.maxErrors !== null && (
            <ThemedText style={styles.meta}>
              Максимальное количество ошибок: {test.maxErrors}
            </ThemedText>
          )}
          {test.questions && test.questions.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Вопросы ({test.questions.length}):
              </ThemedText>
              {test.questions.map((question, index) => (
                <ThemedView key={question.id} style={styles.questionItem}>
                  <ThemedText style={styles.questionNumber}>
                    Вопрос {index + 1}
                  </ThemedText>
                  <ThemedText style={styles.questionText}>
                    {question.questionText}
                  </ThemedText>
                  {question.image && (
                    <ThemedText style={styles.questionImage}>
                      [Изображение: {question.image}]
                    </ThemedText>
                  )}
                  {question.answers && question.answers.length > 0 && (
                    <ThemedView style={styles.answersContainer}>
                      {question.answers.map((answer, answerIndex) => (
                        <ThemedText key={answerIndex} style={styles.answerItem}>
                          • {answer.answerText}
                          {answer.isCorrect && ' ✓'}
                          {answer.score !== undefined && ` (${answer.score} баллов)`}
                        </ThemedText>
                      ))}
                    </ThemedView>
                  )}
                </ThemedView>
              ))}
            </ThemedView>
          )}
          {test.accessabilityConditions && test.accessabilityConditions.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Условия доступности:
              </ThemedText>
              {test.accessabilityConditions.map((condition, index) => (
                <ThemedText key={index} style={styles.conditionItem}>
                  • {condition.type === 'test' ? 'Тест' : 'Статья'}: {condition.type === 'test' ? condition.testId : condition.articleId}
                </ThemedText>
              ))}
            </ThemedView>
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
    alignItems: 'flex-start',
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  meta: {
    marginBottom: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  questionItem: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  questionNumber: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
  },
  questionText: {
    marginBottom: 8,
    fontSize: 15,
  },
  questionImage: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 8,
  },
  answersContainer: {
    marginTop: 8,
    paddingLeft: 8,
  },
  answerItem: {
    marginBottom: 4,
    fontSize: 14,
  },
  conditionItem: {
    marginBottom: 8,
    paddingLeft: 8,
    fontSize: 14,
  },
});

