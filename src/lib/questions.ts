import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db, ensureTablesCreated } from "@/db";
import {
  categories,
  pdfImports,
  questions,
  quizAnswers,
  quizAttempts,
  type Category,
  type Question,
} from "@/db/schema";
import type { DraftQuestion, Letter } from "./types";
import { percentage } from "./utils";

export async function ensureCategory(name: string, description = "") {
  await ensureTablesCreated();
  const trimmed = name.trim() || "Unsorted";
  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.name, trimmed))
    .limit(1);
  if (existing[0]) return existing[0];
  const palette = ["#1f5eff", "#0f7b45", "#d63c2e", "#6b4eff", "#0f766e", "#b45309"];
  const count = await db.select({ value: sql<number>`count(*)` }).from(categories);
  const color = palette[(Number(count[0]?.value) || 0) % palette.length];
  const inserted = await db
    .insert(categories)
    .values({ name: trimmed, description, color })
    .returning();
  return inserted[0];
}

export async function insertDrafts(options: {
  drafts: DraftQuestion[];
  categoryName: string;
  source: string;
  sourceFile?: string | null;
}) {
  const category = await ensureCategory(options.categoryName);
  const existing = await db
    .select({ sortOrder: questions.sortOrder })
    .from(questions)
    .where(eq(questions.categoryId, category.id))
    .orderBy(desc(questions.sortOrder))
    .limit(1);
  let sort = (existing[0]?.sortOrder ?? 0) + 1;
  const rows: Question[] = [];
  for (const draft of options.drafts) {
    const inserted = await db
      .insert(questions)
      .values({
        categoryId: category.id,
        prompt: draft.prompt,
        optionA: draft.optionA,
        optionB: draft.optionB,
        optionC: draft.optionC,
        optionD: draft.optionD,
        correctAnswer: draft.correctAnswer,
        explanation: draft.explanation ?? "",
        sortOrder: sort,
        source: options.source,
        sourceFile: options.sourceFile ?? null,
      })
      .returning();
    if (inserted[0]) rows.push(inserted[0]);
    sort += 1;
  }
  return { category, questions: rows };
}

export async function listQuestions(filters: { categoryId?: number; q?: string }) {
  await ensureTablesCreated();
  const clauses = [];
  if (filters.categoryId) clauses.push(eq(questions.categoryId, filters.categoryId));
  if (filters.q) clauses.push(ilike(questions.prompt, `%${filters.q}%`));
  const where = clauses.length ? and(...clauses) : undefined;
  const rows = await db
    .select({
      question: questions,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(questions)
    .innerJoin(categories, eq(questions.categoryId, categories.id))
    .where(where)
    .orderBy(asc(categories.name), asc(questions.sortOrder), asc(questions.id));
  return rows.map((row) => ({
    ...row.question,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor,
  }));
}

export async function listCategories(): Promise<(Category & { questionCount: number })[]> {
  await ensureTablesCreated();
  const rows = await db
    .select({
      category: categories,
      questionCount: sql<number>`count(${questions.id})::int`,
    })
    .from(categories)
    .leftJoin(questions, eq(questions.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  return rows.map((row) => ({ ...row.category, questionCount: Number(row.questionCount) }));
}

export async function getStudioStats() {
  await ensureTablesCreated();
  const [questionRow] = await db.select({ value: sql<number>`count(*)::int` }).from(questions);
  const [categoryRow] = await db.select({ value: sql<number>`count(*)::int` }).from(categories);
  const [attemptRow] = await db.select({ value: sql<number>`count(*)::int` }).from(quizAttempts);
  const [importRow] = await db.select({ value: sql<number>`count(*)::int` }).from(pdfImports);
  const [agg] = await db
    .select({
      average: sql<number>`coalesce(avg(${quizAttempts.percentage}), 0)`,
      best: sql<number>`coalesce(max(${quizAttempts.percentage}), 0)`,
    })
    .from(quizAttempts);

  return {
    questionCount: Number(questionRow?.value ?? 0),
    categoryCount: Number(categoryRow?.value ?? 0),
    attemptCount: Number(attemptRow?.value ?? 0),
    averageAccuracy: Math.round(Number(agg?.average ?? 0)),
    bestPercentage: Math.round(Number(agg?.best ?? 0)),
    importCount: Number(importRow?.value ?? 0),
  };
}

export async function recordAttempt(input: {
  candidateName?: string;
  categoryId: number | null;
  categoryName: string;
  timerMode: string;
  timerLimitSeconds: number;
  perQuestionSeconds?: number;
  timeTakenSeconds: number;
  answers: Array<{
    question: Question;
    selectedAnswer: Letter | null;
    timeSpentSeconds?: number;
  }>;
}) {
  await ensureTablesCreated();
  const total = input.answers.length;
  const correctCount = input.answers.filter(
    (item) => item.selectedAnswer && item.selectedAnswer === item.question.correctAnswer,
  ).length;
  const pct = percentage(correctCount, total);
  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      candidateName: (input.candidateName ?? "").trim() || "Candidate",
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      totalQuestions: total,
      correctCount,
      percentage: pct,
      timeTakenSeconds: input.timeTakenSeconds,
      timerMode: input.timerMode,
      timerLimitSeconds: input.timerLimitSeconds,
      perQuestionSeconds: input.perQuestionSeconds ?? 0,
    })
    .returning();

  if (attempt) {
    if (input.answers.length) {
      await db.insert(quizAnswers).values(
        input.answers.map((item, index) => ({
          attemptId: attempt.id,
          questionId: item.question.id,
          prompt: item.question.prompt,
          optionA: item.question.optionA,
          optionB: item.question.optionB,
          optionC: item.question.optionC,
          optionD: item.question.optionD,
          correctAnswer: item.question.correctAnswer,
          selectedAnswer: item.selectedAnswer,
          isCorrect: Boolean(
            item.selectedAnswer && item.selectedAnswer === item.question.correctAnswer,
          ),
          timeSpentSeconds: Math.max(0, item.timeSpentSeconds ?? 0),
          explanation: item.question.explanation ?? "",
          sortIndex: index,
        })),
      );
    }
  }

  return attempt;
}

export function toPublicQuestion(question: Question) {
  return {
    id: question.id,
    prompt: question.prompt,
    options: [
      { key: "A" as const, text: question.optionA },
      { key: "B" as const, text: question.optionB },
      { key: "C" as const, text: question.optionC },
      { key: "D" as const, text: question.optionD },
    ],
  };
}
