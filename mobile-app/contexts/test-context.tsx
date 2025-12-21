import { AppTestQuestionVm, AppTestVm } from '@/hooks/api/types';
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
  isTestStarted: boolean;
  isTestCompleted: boolean;
  totalScoreAccumulated: number; // Накопленный счетчик баллов с начала теста
  startedAt: string | null; // Время начала теста
  startTest: (test: AppTestVm) => void;
  submitAnswer: (questionId: string, answerIds: number[] | string[]) => void;
  nextQuestion: () => void;
  finishTest: () => void;
  resetTest: () => void;
  getCurrentQuestion: () => AppTestQuestionVm | null;
  getTotalScore: () => number;
  getTotalErrors: () => number;
};

const TestContext = createContext<TestContextType | undefined>(undefined);

export function TestProvider({ children }: { children: ReactNode }) {
  const [test, setTest] = useState<AppTestVm | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [totalScoreAccumulated, setTotalScoreAccumulated] = useState(0); // Накопленный счетчик баллов
  const [startedAt, setStartedAt] = useState<string | null>(null); // Время начала теста

  const startTest = (testData: AppTestVm) => {
    setTest(testData);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setTotalScoreAccumulated(0); // Сбрасываем счетчик баллов
    setStartedAt(new Date().toISOString()); // Сохраняем время начала теста
    setIsTestStarted(true);
    setIsTestCompleted(false);
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

  const nextQuestion = () => {
    if (!test || !test.questions) return;
    
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsTestCompleted(true);
    }
  };

  const finishTest = () => {
    setIsTestCompleted(true);
  };

  const resetTest = () => {
    setTest(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setTotalScoreAccumulated(0);
    setStartedAt(null);
    setIsTestStarted(false);
    setIsTestCompleted(false);
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

  return (
    <TestContext.Provider
      value={{
        test,
        currentQuestionIndex,
        answers,
        isTestStarted,
        isTestCompleted,
        totalScoreAccumulated,
        startedAt,
        startTest,
        submitAnswer,
        nextQuestion,
        finishTest,
        resetTest,
        getCurrentQuestion,
        getTotalScore,
        getTotalErrors,
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
