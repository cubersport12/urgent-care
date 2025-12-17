import { AppTestQuestionVm } from '@/hooks/api/types';

export type AnswerStatus = 'correct' | 'incorrect' | 'should-be-selected' | null;

export function getAnswerStatus(
  index: number,
  showResult: boolean,
  question: AppTestQuestionVm | null,
  answers: Array<{
    questionId: string;
    answerIds: string[];
    isCorrect: boolean;
    score: number;
  }>,
  currentQuestionId: string
): AnswerStatus {
  // Не показываем статус, если результат еще не показан или нет вопроса
  if (!showResult || !question) return null;

  const answer = question.answers?.[index];
  if (!answer) return null;

  // Проверяем, что есть сохраненный ответ для текущего вопроса
  const currentAnswer = answers.find((a) => a.questionId === currentQuestionId);
  // КРИТИЧНО: Если ответ еще не сохранен для текущего вопроса, не показываем никакой статус
  if (!currentAnswer) return null;

  // Используем сохраненные индексы ответов из контекста, а не из локального состояния
  // Это гарантирует, что мы используем правильные данные для текущего вопроса
  const savedAnswerIndices = currentAnswer.answerIds.map((id) => parseInt(id, 10));
  const isSelected = savedAnswerIndices.includes(index);

  // answer.isCorrect - это свойство варианта ответа (правильный ли это вариант в принципе)
  // currentAnswer.isCorrect - это результат ответа пользователя (правильно ли ответил пользователь)
  const isAnswerOptionCorrect = answer.isCorrect || false;
  const isUserAnswerCorrect = currentAnswer.isCorrect;

  // Показываем пунктирную рамку только если:
  // 1. Результат показан (showResult === true)
  // 2. Есть сохраненный ответ для текущего вопроса
  // 3. Вариант ответа правильный (isAnswerOptionCorrect), но не был выбран пользователем
  // 4. Пользователь уже ответил на этот вопрос (есть сохраненные ответы)
  // 5. Пользователь ответил неправильно (чтобы показать, какие варианты нужно было выбрать)
  if (
    !isSelected &&
    isAnswerOptionCorrect &&
    savedAnswerIndices.length > 0 &&
    showResult &&
    !isUserAnswerCorrect
  ) {
    return 'should-be-selected';
  }

  // Если вариант выбран и он правильный - показываем зеленым
  if (isSelected && isAnswerOptionCorrect) return 'correct';
  // Если вариант выбран, но он неправильный - показываем красным
  if (isSelected && !isAnswerOptionCorrect) return 'incorrect';

  return null;
}

export function getAnswerStatusForResults(
  questionId: string,
  answerIndex: number,
  answers: Array<{
    questionId: string;
    answerIds: string[];
    isCorrect: boolean;
    score: number;
  }>,
  questions: AppTestQuestionVm[] | undefined
): AnswerStatus {
  const questionAnswer = answers.find((a) => a.questionId === questionId);
  if (!questionAnswer) return null;

  const savedAnswerIndices = questionAnswer.answerIds.map((id) => parseInt(id, 10));
  const isSelected = savedAnswerIndices.includes(answerIndex);

  const question = questions?.find((q) => q.id === questionId);
  const answer = question?.answers?.[answerIndex];
  if (!answer) return null;

  const isAnswerOptionCorrect = answer.isCorrect || false;
  const isUserAnswerCorrect = questionAnswer.isCorrect;

  if (isSelected && isAnswerOptionCorrect) return 'correct';
  if (isSelected && !isAnswerOptionCorrect) return 'incorrect';
  if (!isSelected && isAnswerOptionCorrect && !isUserAnswerCorrect) return 'should-be-selected';

  return null;
}
