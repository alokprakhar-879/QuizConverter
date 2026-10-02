import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#c4a15a"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  source: text("source").notNull().default("manual"),
  sourceFile: text("source_file"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const pdfImports = pgTable("pdf_imports", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  charCount: integer("char_count").notNull().default(0),
  questionsCreated: integer("questions_created").notNull().default(0),
  method: text("method").notNull().default("regex"),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  candidateName: text("candidate_name").notNull().default("Candidate"),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  categoryName: text("category_name").notNull().default("Mixed bank"),
  totalQuestions: integer("total_questions").notNull(),
  correctCount: integer("correct_count").notNull(),
  percentage: integer("percentage").notNull(),
  timeTakenSeconds: integer("time_taken_seconds").notNull().default(0),
  timerMode: text("timer_mode").notNull().default("none"),
  timerLimitSeconds: integer("timer_limit_seconds").notNull().default(0),
  perQuestionSeconds: integer("per_question_seconds").notNull().default(0),
  startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }).defaultNow().notNull(),
});

export const quizAnswers = pgTable("quiz_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => quizAttempts.id, { onDelete: "cascade" }),
  questionId: integer("question_id"),
  prompt: text("prompt").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  selectedAnswer: text("selected_answer"),
  isCorrect: boolean("is_correct").notNull().default(false),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  explanation: text("explanation").notNull().default(""),
  sortIndex: integer("sort_index").notNull().default(0),
});

export type Category = typeof categories.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type QuizAnswer = typeof quizAnswers.$inferSelect;
export type PdfImport = typeof pdfImports.$inferSelect;
