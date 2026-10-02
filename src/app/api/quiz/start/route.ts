import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, questions, type Question } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { toPublicQuestion } from "@/lib/questions";
import { seedIfEmpty } from "@/lib/seed";
import { shuffle } from "@/lib/utils";
import { deriveTimerMode, type Letter, type TimerMode } from "@/lib/types";
import { healDevanagariText } from "@/lib/pdf-parser";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await seedIfEmpty();
    const body = (await request.json()) as {
      categoryId?: number | null;
      questionIds?: number[];
      count?: number | "all";
      orderMode?: "start" | "end" | "random";
      timerMode?: TimerMode;
      timerLimitSeconds?: number;
      perQuestionSeconds?: number;
      candidateName?: string;
    };

    let pool: Question[] = [];
    if (body.questionIds?.length) {
      pool = await db.select().from(questions).where(inArray(questions.id, body.questionIds));
      pool.sort((a, b) => body.questionIds!.indexOf(a.id) - body.questionIds!.indexOf(b.id));
    } else if (body.categoryId) {
      pool = await db.select().from(questions).where(eq(questions.categoryId, body.categoryId));
    } else {
      pool = await db.select().from(questions);
    }

    if (!pool.length) {
      return NextResponse.json({ error: "No questions available for this selection" }, { status: 422 });
    }

    // Support "from starting", "from ending", or "random" slicing
    const totalCount = pool.length;
    const count =
      body.count === "all" || !body.count ? totalCount : Math.min(Number(body.count) || totalCount, totalCount);
    const orderMode = body.orderMode ?? (body.questionIds?.length ? "start" : "random");

    let selected: Question[] = [];
    if (orderMode === "end") {
      selected = pool.slice(-Math.max(1, count));
    } else if (orderMode === "start") {
      selected = pool.slice(0, Math.max(1, count));
    } else {
      selected = shuffle(pool).slice(0, Math.max(1, count));
    }

    // Recheck and validate all questions before starting quiz
    const verified = selected.map((q) => {
      const prompt = healDevanagariText(q.prompt);
      const optionA = healDevanagariText(q.optionA);
      const optionB = healDevanagariText(q.optionB);
      const optionC = healDevanagariText(q.optionC);
      const optionD = healDevanagariText(q.optionD);
      const explanation = healDevanagariText(q.explanation || "");
      const upperCorrect = (q.correctAnswer || "A").trim().toUpperCase();
      const correctAnswer: Letter = ["A", "B", "C", "D"].includes(upperCorrect)
        ? (upperCorrect as Letter)
        : "A";

      return {
        ...q,
        prompt,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        explanation,
      };
    });

    let categoryName = "Mixed bank";
    if (body.categoryId) {
      const [cat] = await db.select().from(categories).where(eq(categories.id, body.categoryId)).limit(1);
      categoryName = cat?.name ?? categoryName;
    } else if (verified.length) {
      const ids = [...new Set(verified.map((item) => item.categoryId))];
      if (ids.length === 1) {
        const [cat] = await db.select().from(categories).where(eq(categories.id, ids[0])).limit(1);
        categoryName = cat?.name ?? categoryName;
      }
    }

    const timerLimitSeconds = Math.max(0, Number(body.timerLimitSeconds) || 0);
    const perQuestionSeconds = Math.max(0, Number(body.perQuestionSeconds) || 0);
    const timerMode: TimerMode = body.timerMode ?? deriveTimerMode(timerLimitSeconds, perQuestionSeconds);

    return NextResponse.json({
      session: {
        categoryId: body.categoryId ?? null,
        categoryName,
        candidateName: body.candidateName?.trim() || undefined,
        timerMode,
        timerLimitSeconds,
        perQuestionSeconds,
        startedAt: Date.now(),
        questions: verified.map(toPublicQuestion),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
