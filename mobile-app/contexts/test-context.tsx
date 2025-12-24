import { AppTestQuestionActivationConditionKind, AppTestQuestionVm, AppTestVm } from '@/hooks/api/types';
import React, { createContext, ReactNode, useContext, useState } from 'react';

export type TestAnswer = {
  questionId: string;
  answerIds: string[]; // Индексы выбранных ответов как строки
  isCorrect: boolean;
  score: number;
};

type TestContextType = {
  test: AppTestVm | null;
  currentQuestionIndex: number;
  answers: TestAnswer[];
  visitedQuestions: Set<string>; // Множество ID посещенных вопросов
  isTestStarted: boolean;
  isTestCompleted: boolean;
  totalScoreAccumulated: number; // Накопленный счетчик баллов с начала теста
  startedAt: string | null; // Время начала теста
  startTest: (test: AppTestVm) => void;
  submitAnswer: (questionId: string, answerIds: number[] | string[]) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (questionId: string) => void;
  finishTest: () => void;
  resetTest: () => void;
  getCurrentQuestion: () => AppTestQuestionVm | null;
  getTotalScore: () => number;
  getTotalErrors: () => number;
  areAllQuestionsVisited: () => boolean;
  processSkippedQuestions: () => TestAnswer[]; // Обрабатывает пропущенные вопросы как ошибочные и возвращает финальные ответы
};

const TestContext = createContext<TestContextType | undefined>(undefined);

export function TestProvider({ children }: { children: ReactNode }) {
  const [test, setTest] = useState<AppTestVm | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [totalScoreAccumulated, setTotalScoreAccumulated] = useState(0); // Накопленный счетчик баллов
  const [startedAt, setStartedAt] = useState<string | null>(null); // Время начала теста

  const startTest = (testData: AppTestVm) => {
    setTest(testData);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setVisitedQuestions(new Set());
    setTotalScoreAccumulated(0); // Сбрасываем счетчик баллов
    setStartedAt(new Date().toISOString()); // Сохраняем время начала теста
    setIsTestStarted(true);
    setIsTestCompleted(false);
    
    // Отмечаем первый вопрос как посещенный
    if (testData.questions && testData.questions.length > 0) {
      setVisitedQuestions(new Set([testData.questions[0].id]));
    }
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

    setAnswers(prev => {
      const existingIndex = prev.findIndex(a => a.questionId === questionId);
      if (existingIndex >= 0) {
        // Если ответ уже был дан, вычитаем старые баллы и добавляем новые
        const oldAnswer = prev[existingIndex];
        setTotalScoreAccumulated(current => current - oldAnswer.score + score);
        const updated = [...prev];
        updated[existingIndex] = newAnswer;
        return updated;
      } else {
        // Если это новый ответ, добавляем баллы к счетчику
        setTotalScoreAccumulated(current => current + score);
        return [...prev, newAnswer];
      }
    });
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
        // Найден следующий неотвеченный вопрос
        setCurrentQuestionIndex(nextUnansweredIndex);
        const nextQuestion = test.questions[nextUnansweredIndex];
        if (nextQuestion) {
          setVisitedQuestions(new Set([...updatedVisited, nextQuestion.id]));
        }
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
            setVisitedQuestions(new Set([...updatedVisited, test.questions[unvisitedIndex].id]));
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

  const finishTest = () => {
    setIsTestCompleted(true);
  };

  const resetTest = () => {
    setTest(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setVisitedQuestions(new Set());
    setTotalScoreAccumulated(0);
    setStartedAt(null);
    setIsTestStarted(false);
    setIsTestCompleted(false);
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

  // Обрабатывает пропущенные вопросы (посещенные, но не отвеченные) как ошибочные
  // Возвращает финальный массив ответов, включая пропущенные вопросы
  const processSkippedQuestions = (): TestAnswer[] => {
    if (!test || !test.questions) return answers;

    // Находим все пропущенные вопросы (посещенные, но не отвеченные)
    const skippedQuestions = test.questions.filter(
      question => visitedQuestions.has(question.id) && !answers.find(a => a.questionId === question.id)
    );

    // Создаем ошибочные ответы для пропущенных вопросов
    const skippedAnswers: TestAnswer[] = skippedQuestions.map(question => ({
      questionId: question.id,
      answerIds: [], // Пустой массив - вопрос не был отвечен
      isCorrect: false, // Пропущенный вопрос считается ошибочным
      score: 0, // Пропущенный вопрос не дает баллов
    }));

    // Обновляем состояние для отображения
    if (skippedAnswers.length > 0) {
      setAnswers(prev => {
        const finalAnswers = [...prev];
        skippedAnswers.forEach(skippedAnswer => {
          // Проверяем, нет ли уже ответа на этот вопрос
          const existingIndex = finalAnswers.findIndex(a => a.questionId === skippedAnswer.questionId);
          if (existingIndex < 0) {
            // Добавляем новый ошибочный ответ
            finalAnswers.push(skippedAnswer);
          }
        });
        return finalAnswers;
      });
    }

    // Возвращаем финальный массив ответов (включая пропущенные)
    return [...answers, ...skippedAnswers];
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
