import { AppTestQuestionActivationConditionKind, AppTestQuestionVm, AppTestVm } from '@/hooks/api/types';
import React, { createContext, ReactNode, useContext, useRef, useState } from 'react';

export type TestAnswer = {
  questionId: string;
  answerIds: string[]; // Индексы выбранных ответов как строки
  isCorrect: boolean;
  score: number;
};

export type TestFinishReason = 'user' | 'autoMaxErrors' | null;

type TestContextType = {
  test: AppTestVm | null;
  currentQuestionIndex: number;
  answers: TestAnswer[];
  visitedQuestions: Set<string>; // Множество ID посещенных вопросов
  isTestStarted: boolean;
  isTestCompleted: boolean;
  finishReason: TestFinishReason; // Как был завершён тест: вручную или по лимиту ошибок
  totalScoreAccumulated: number; // Накопленный счетчик баллов с начала теста
  startedAt: string | null; // Время начала теста
  startTest: (test: AppTestVm) => void;
  submitAnswer: (questionId: string, answerIds: number[] | string[]) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (questionId: string) => void;
  finishTest: (reason?: Exclude<TestFinishReason, null>) => void;
  resetTest: () => void;
  getCurrentQuestion: () => AppTestQuestionVm | null;
  getTotalScore: () => number;
  getTotalErrors: () => number;
  areAllQuestionsVisited: () => boolean;
  processSkippedQuestions: () => TestAnswer[]; // Обрабатывает неотвеченные вопросы как ошибочные и возвращает финальные ответы
};

const TestContext = createContext<TestContextType | undefined>(undefined);

export function TestProvider({ children }: { children: ReactNode }) {
  const [test, setTest] = useState<AppTestVm | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [finishReason, setFinishReason] = useState<TestFinishReason>(null);
  const [totalScoreAccumulated, setTotalScoreAccumulated] = useState(0); // Накопленный счетчик баллов
  const [startedAt, setStartedAt] = useState<string | null>(null); // Время начала теста
  // Синхронное зеркало answers: processSkippedQuestions вызывается сразу после submitAnswer,
  // когда state ещё не обновлён — без ref только что данный ответ терялся.
  const answersRef = useRef<TestAnswer[]>([]);

  const startTest = (testData: AppTestVm) => {
    let questions = [...(testData.questions ?? [])];
    if (testData.randomizeQuestions) {
      // Fisher–Yates
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      const n = testData.questionsToShow;
      if (n != null && n > 0) {
        questions = questions.slice(0, n);
      }
    }
    setTest({ ...testData, questions });
    setCurrentQuestionIndex(0);
    answersRef.current = [];
    setAnswers([]);
    setVisitedQuestions(new Set());
    setTotalScoreAccumulated(0); // Сбрасываем счетчик баллов
    setStartedAt(new Date().toISOString()); // Сохраняем время начала теста
    setIsTestStarted(true);
    setIsTestCompleted(false);
    setFinishReason(null);
  };

  const submitAnswer = (questionId: string, answerIds: number[] | string[]) => {
    if (!test || !test.questions) return;

    const question = test.questions.find(q => q.id === questionId);
    if (!question || !question.answers) return;

    // Получаем выбранные ответы по индексам
    const answerIndices = answerIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
    const selectedAnswers = question.answers.filter((_, index) => 
      answerIndices.includes(index)
    );

    // Проверяем правильность: все выбранные ответы должны быть правильными
    // и должны быть выбраны все правильные ответы
    const correctAnswers = question.answers.filter(a => a.isCorrect);
    const selectedCorrectAnswers = selectedAnswers.filter(a => a.isCorrect);
    
    const isCorrect = 
      correctAnswers.length === selectedCorrectAnswers.length &&
      selectedAnswers.length === correctAnswers.length &&
      selectedAnswers.every(a => a.isCorrect);

    // Вычисляем баллы
    const score = selectedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);

    const newAnswer: TestAnswer = {
      questionId,
      answerIds: answerIds.map(id => String(id)),
      isCorrect,
      score,
    };

    const prev = answersRef.current;
    const existingIndex = prev.findIndex(a => a.questionId === questionId);
    if (existingIndex >= 0) {
      // Если ответ уже был дан, вычитаем старые баллы и добавляем новые
      const updated = [...prev];
      updated[existingIndex] = newAnswer;
      answersRef.current = updated;
      setTotalScoreAccumulated(current => current - prev[existingIndex].score + score);
      setAnswers(updated);
    } else {
      // Если это новый ответ, добавляем баллы к счетчику
      const next = [...prev, newAnswer];
      answersRef.current = next;
      setTotalScoreAccumulated(current => current + score);
      setAnswers(next);
    }
  };

  // Проверяет условие активации вопроса
  const checkActivationCondition = (
    { activationCondition }: AppTestQuestionVm,
    currentAnswer: TestAnswer
  ): boolean => {
    if (!activationCondition || activationCondition.kind !== AppTestQuestionActivationConditionKind.CompleteQuestion) {
      return false;
    }

    // Проверяем условие в зависимости от типа данных
    if (activationCondition.data.type === 'score') {
      return currentAnswer.score >= activationCondition.data.score;
    } else if (activationCondition.data.type === 'correct') {
      return currentAnswer.isCorrect === activationCondition.data.isCorrect;
    }

    return false;
  };

  const nextQuestion = () => {
    if (!test || !test.questions) return;
    
    const currentQuestion = test.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Отмечаем текущий вопрос как посещенный
    const updatedVisited = new Set([...visitedQuestions, currentQuestion.id]);
    setVisitedQuestions(updatedVisited);

    // Используем функциональное обновление для получения актуального состояния answers
    setAnswers(currentAnswers => {
      if (!test || !test.questions) return currentAnswers;

      // Находим ответ на текущий вопрос (может быть только что добавлен)
      const currentAnswer = currentAnswers.find(a => a.questionId === currentQuestion.id);

      // Функция для поиска следующего неотвеченного вопроса с проверкой условий активации
      const findNextUnansweredQuestion = (startFromIndex: number): number | null => {
        if (!test.questions) return null;

        // Random queue: linear walk only (ignore activation branches)
        if (test.randomizeQuestions) {
          for (let i = startFromIndex + 1; i < test.questions.length; i++) {
            if (!currentAnswers.find((a) => a.questionId === test.questions![i].id)) {
              return i;
            }
          }
          return null;
        }
        
        // Сначала проверяем условия активации для всех вопросов, начиная с startFromIndex
        const activatedQuestions: { question: AppTestQuestionVm; index: number }[] = [];
        
        test.questions.forEach((question, index) => {
          if (index <= startFromIndex) return; // Пропускаем уже пройденные вопросы
          
          // Проверяем, есть ли ответ на этот вопрос - если есть, пропускаем
          const hasAnswer = currentAnswers.find(a => a.questionId === question.id);
          if (hasAnswer) return;
          
          // Если у вопроса есть activationCondition, проверяем условие
          if (question.activationCondition && question.activationCondition.relationQuestionId === currentQuestion.id) {
            // Передаем currentAnswer для проверки условия активации
            if (checkActivationCondition(question, currentAnswer!)) {
              activatedQuestions.push({ question, index });
            }
          }
        });

        // Если есть активированные вопросы, выбираем тот, у которого order меньше всего
        if (activatedQuestions.length > 0) {
          activatedQuestions.sort((a, b) => (a.question.order || 0) - (b.question.order || 0));
          const targetQuestion = activatedQuestions[0];
          // Проверяем, что на этот вопрос нет ответа
          const hasAnswer = currentAnswers.find(a => a.questionId === targetQuestion.question.id);
          if (!hasAnswer) {
            return targetQuestion.index;
          }
          // Если на активированный вопрос есть ответ, ищем следующий
          return findNextUnansweredQuestion(targetQuestion.index);
        }

        // Если нет активированных вопросов, ищем следующий неотвеченный вопрос в коллекции
        for (let i = startFromIndex + 1; i < test.questions.length; i++) {
          const question = test.questions[i];
          // Проверяем, есть ли ответ на этот вопрос
          const hasAnswer = currentAnswers.find(a => a.questionId === question.id);
          if (!hasAnswer) {
            // Найден неотвеченный вопрос
            return i;
          }
        }

        return null;
      };

      // Ищем следующий неотвеченный вопрос
      const nextUnansweredIndex = findNextUnansweredQuestion(currentQuestionIndex);

      if (nextUnansweredIndex !== null) {
        // Найден следующий неотвеченный вопрос (не помечаем его посещённым до показа)
        setCurrentQuestionIndex(nextUnansweredIndex);
      } else {
        // Если не найден следующий неотвеченный вопрос, проверяем, все ли вопросы посещены
        const allVisited = test.questions.every(q => updatedVisited.has(q.id));
        if (allVisited) {
          setIsTestCompleted(true);
        } else {
          // Если не все вопросы посещены, ищем первый непосещенный без ответа
          const unvisitedIndex = test.questions.findIndex(q => {
            const hasAnswer = currentAnswers.find(a => a.questionId === q.id);
            return !updatedVisited.has(q.id) && !hasAnswer;
          });
          if (unvisitedIndex >= 0) {
            setCurrentQuestionIndex(unvisitedIndex);
          } else {
            setIsTestCompleted(true);
          }
        }
      }

      return currentAnswers; // Возвращаем без изменений
    });
  };

  const previousQuestion = () => {
    if (!test || !test.questions) return;
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (questionId: string) => {
    if (!test || !test.questions) return;
    
    const questionIndex = test.questions.findIndex(q => q.id === questionId);
    if (questionIndex >= 0) {
      setCurrentQuestionIndex(questionIndex);
      setVisitedQuestions(prev => new Set([...prev, questionId]));
    }
  };

  const finishTest = (reason: Exclude<TestFinishReason, null> = 'user') => {
    setFinishReason(reason);
    setIsTestCompleted(true);
  };

  const resetTest = () => {
    setTest(null);
    setCurrentQuestionIndex(0);
    answersRef.current = [];
    setAnswers([]);
    setVisitedQuestions(new Set());
    setTotalScoreAccumulated(0);
    setStartedAt(null);
    setIsTestStarted(false);
    setIsTestCompleted(false);
    setFinishReason(null);
  };

  const areAllQuestionsVisited = (): boolean => {
    if (!test || !test.questions) return false;
    return test.questions.every(q => visitedQuestions.has(q.id));
  };

  const getCurrentQuestion = (): AppTestQuestionVm | null => {
    if (!test || !test.questions || test.questions.length === 0) return null;
    return test.questions[currentQuestionIndex] || null;
  };

  const getTotalScore = (): number => {
    return answers.reduce((sum, answer) => sum + answer.score, 0);
  };

  const getTotalErrors = (): number => {
    return answers.filter(answer => !answer.isCorrect).length;
  };

  // Обрабатывает неотвеченные вопросы как ошибочные (независимо от того, посещал ли их пользователь).
  // Возвращает финальный массив ответов, включая неотвеченные вопросы.
  const processSkippedQuestions = (): TestAnswer[] => {
    if (!test || !test.questions) return answersRef.current;

    const current = answersRef.current;
    const skippedAnswers: TestAnswer[] = test.questions
      .filter(question => !current.find(a => a.questionId === question.id))
      .map(question => ({
        questionId: question.id,
        answerIds: [], // Пустой массив - вопрос не был отвечен
        isCorrect: false, // Неотвеченный вопрос считается ошибочным
        score: 0, // Неотвеченный вопрос не дает баллов
      }));

    const finalAnswers = skippedAnswers.length > 0 ? [...current, ...skippedAnswers] : current;
    answersRef.current = finalAnswers;
    setAnswers(finalAnswers);
    return finalAnswers;
  };

  return (
    <TestContext.Provider
      value={{
        test,
        currentQuestionIndex,
        answers,
        visitedQuestions,
        isTestStarted,
        isTestCompleted,
        finishReason,
        totalScoreAccumulated,
        startedAt,
        startTest,
        submitAnswer,
        nextQuestion,
        previousQuestion,
        goToQuestion,
        finishTest,
        resetTest,
        getCurrentQuestion,
        getTotalScore,
        getTotalErrors,
        areAllQuestionsVisited,
        processSkippedQuestions,
      }}
    >
      {children}
    </TestContext.Provider>
  );
}

export function useTest() {
  const context = useContext(TestContext);
  if (context === undefined) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
}
