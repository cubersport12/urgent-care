import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
    textAlign: 'center',
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
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
  },
  answerItemPressed: {
    opacity: 0.7,
  },
  answerItemCorrect: {
    borderColor: Colors.light.success,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  answerItemIncorrect: {
    borderColor: Colors.light.error,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  answerItemShouldBeSelected: {
    borderColor: Colors.light.success,
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
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  checkboxCorrect: {
    borderColor: Colors.light.success,
    backgroundColor: Colors.light.success,
  },
  checkboxIncorrect: {
    borderColor: Colors.light.error,
    backgroundColor: Colors.light.error,
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
    borderColor: Colors.light.primary,
  },
  radioCorrect: {
    borderColor: Colors.light.success,
  },
  radioIncorrect: {
    borderColor: Colors.light.error,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
  },
  radioInnerCorrect: {
    backgroundColor: Colors.light.success,
  },
  radioInnerIncorrect: {
    backgroundColor: Colors.light.error,
  },
  answerText: {
    flex: 1,
    fontSize: 16,
  },
  answerTextSelected: {
    fontWeight: '600',
  },
  answerTextCorrect: {
    color: Colors.light.success,
    fontWeight: '600',
  },
  answerTextIncorrect: {
    color: Colors.light.error,
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
    borderColor: Colors.light.success,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  questionAnswerIncorrect: {
    borderColor: Colors.light.error,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  questionAnswerShouldBeSelected: {
    borderColor: Colors.light.success,
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
    backgroundColor: Colors.light.primary,
  },
  questionAnswerCheckboxCorrect: {
    backgroundColor: Colors.light.success,
  },
  questionAnswerCheckboxIncorrect: {
    backgroundColor: Colors.light.error,
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
    color: Colors.light.success,
    fontWeight: '600',
  },
  questionAnswerTextIncorrect: {
    color: Colors.light.error,
    fontWeight: '600',
  },
  questionAnswerTextShouldBeSelected: {
    color: Colors.light.success,
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
