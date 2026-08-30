/**
 * Самопроверка формулы результата теста (computeTestOutcome).
 * Запуск: node scripts/check-test-outcome.mjs
 */
import { computeTestOutcome } from '../lib/test-outcome.ts';

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
};

const answered = (id, correct, score = 1) => ({
  questionId: id,
  answerIds: ['0'],
  isCorrect: correct,
  score: correct ? score : 0,
});
const skipped = (id) => ({ questionId: id, answerIds: [], isCorrect: false, score: 0 });

// Сценарий пользователя: 10 вопросов, отвечено 5 (3 верно, 2 неверно), досрочный выход
{
  const answers = [
    answered('q1', true),
    answered('q2', false),
    answered('q3', true),
    answered('q4', true),
    answered('q5', false),
  ];
  const out = computeTestOutcome({
    answers: [...answers, 'q6', 'q7', 'q8', 'q9', 'q10'].map((id, i) =>
      i < 5 ? answers[i] : skipped(`q${i + 1}`),
    ),
    maxErrors: 2,
  });
  assert(out.totalScore === 3, 'score = 3');
  assert(out.totalErrors === 7, 'errors = 7 (2 неверных + 5 неотвеченных)');
  assert(!out.allAnswered, 'not all answered');
  assert(!out.isPassed, 'early exit is not passed');
  assert(out.completionType === 'early', 'completionType = early');
}

// Полное прохождение: 10/10 отвечено, 1 ошибка, maxErrors = 2 → пройден
{
  const answers = ['q1', 'q2', 'q3'].map((id, i) => answered(id, i !== 2));
  const out = computeTestOutcome({ answers, maxErrors: 2 });
  assert(out.isPassed, '10 answered, 1 error <= 2 → passed');
  assert(out.completionType === 'full', 'completionType = full');
}

// Ошибок ровно maxErrors → пройден (лимит включительно)
{
  const answers = ['q1', 'q2', 'q3'].map((id, i) => answered(id, i !== 1 && i !== 2));
  const out = computeTestOutcome({ answers, maxErrors: 2 });
  assert(out.isPassed, '2 errors <= 2 → passed');
}

// Ошибок больше maxErrors → не пройден
{
  const answers = ['q1', 'q2', 'q3', 'q4'].map((id, i) => answered(id, i > 2));
  const out = computeTestOutcome({ answers, maxErrors: 2 });
  assert(!out.isPassed, '3 errors > 2 → failed');
  assert(out.completionType === 'full', 'still full completion');
}

// Автозавершение по лимиту: 2-я ошибка на 3-м вопросе из 10 → не пройден, maxErrors
{
  const answers = [
    answered('q1', true),
    answered('q2', false),
    answered('q3', false),
    ...['q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'].map((id) => skipped(id)),
  ];
  const out = computeTestOutcome({ answers, maxErrors: 2, finishReason: 'autoMaxErrors' });
  assert(!out.isPassed, 'autoMaxErrors → failed');
  assert(out.completionType === 'maxErrors', 'completionType = maxErrors');
  assert(out.totalErrors === 9, 'errors = 2 неверных + 7 неотвеченных');
}

// maxErrors = 0: без ошибок → пройден, одна ошибка → нет (0 <= 0, 1 > 0)
{
  assert(computeTestOutcome({ answers: [answered('q1', true)], maxErrors: 0 }).isPassed);
  assert(!computeTestOutcome({ answers: [answered('q1', false)], maxErrors: 0 }).isPassed);
}

// minScore: балл ниже проходного → не пройден
{
  const out = computeTestOutcome({
    answers: [answered('q1', true, 1), answered('q2', true, 1)],
    minScore: 5,
  });
  assert(!out.isPassed, 'score 2 < minScore 5 → failed');
}

console.log('OK: все сценарии computeTestOutcome прошли');
