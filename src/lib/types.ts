export const LETTERS = ["A", "B", "C", "D"] as const;
export type Letter = (typeof LETTERS)[number];

export type DraftQuestion = {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: Letter;
  explanation?: string;
};

export type PublicQuizQuestion = {
  id: number;
  prompt: string;
  options: { key: Letter; text: string }[];
};

export type TimerMode = "none" | "total" | "per_question" | "both";

export type QuizSession = {
  categoryId: number | null;
  categoryName: string;
  candidateName?: string;
  timerMode: TimerMode;
  timerLimitSeconds: number;
  perQuestionSeconds: number;
  startedAt: number;
  questions: PublicQuizQuestion[];
};

export const QUIZ_SESSION_KEY = "meridian-quiz-session";
export const CANDIDATE_NAME_KEY = "meridian-candidate-name";

export function deriveTimerMode(globalSeconds: number, perQuestionSeconds: number): TimerMode {
  if (globalSeconds > 0 && perQuestionSeconds > 0) return "both";
  if (globalSeconds > 0) return "total";
  if (perQuestionSeconds > 0) return "per_question";
  return "none";
}

export type AttemptSummary = {
  id: number;
  candidateName?: string;
  categoryName: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  timeTakenSeconds: number;
  timerMode: string;
  completedAt: string;
};

export type StudioStats = {
  questionCount: number;
  categoryCount: number;
  attemptCount: number;
  averageAccuracy: number;
  bestPercentage: number;
  importCount: number;
};

export function isLetter(value: string): value is Letter {
  return LETTERS.includes(value as Letter);
}

export function emptyDraft(): DraftQuestion {
  return {
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
    explanation: "",
  };
}

export function optionKey(letter: Letter): "optionA" | "optionB" | "optionC" | "optionD" {
  return `option${letter}` as "optionA" | "optionB" | "optionC" | "optionD";
}
