import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { AppTestQuestionVm } from '@/hooks/api/types';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from '../ui/icon-symbol';
import { styles } from './styles';
import { getAnswerStatusForResults } from './utils';

type QuestionAccordionProps = {
  question: AppTestQuestionVm;
  questionIndex: number;
  questionAnswer: {
    questionId: string;
    answerIds: string[];
    isCorrect: boolean;
    score: number;
  } | undefined;
  savedAnswerIndices: number[];
  testAnswers: {
    questionId: string;
    answerIds: string[];
    isCorrect: boolean;
    score: number;
  }[];
  testQuestions: AppTestQuestionVm[] | undefined;
};

const successColor = '#4CAF50';
const errorColor = '#F44336';

export function QuestionAccordion({
  question,
  questionIndex,
  questionAnswer,
  savedAnswerIndices,
  testAnswers,
  testQuestions,
}: QuestionAccordionProps) {
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
              {question.answers.map((answer, answerIndex: number) => {
                const status = getAnswerStatusForResults(
                  question.id,
                  answerIndex,
                  testAnswers,
                  testQuestions
                );
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
}
