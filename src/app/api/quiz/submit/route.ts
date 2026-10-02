import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { recordAttempt } from "@/lib/questions";
import { isLetter, type Letter } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      candidateName?: string;
      categoryId?: number | null;
      categoryName?: string;
      timerMode?: string;
      timerLimitSeconds?: number;
      perQuestionSeconds?: number;
      timeTakenSeconds?: number;
      answers?: Array<{ questionId: number; selectedAnswer?: string | null; timeSpentSeconds?: number }>;
    };

    const answerList = body.answers ?? [];
    if (!answerList.length) {
      return NextResponse.json({ error: "Quiz answers are missing" }, { status: 400 });
    }

    const ids = answerList.map((item) => item.questionId);
    const rows = await db.select().from(questions).where(inArray(questions.id, ids));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length) {
      return NextResponse.json({ error: "Some questions were removed from the bank" }, { status: 409 });
    }

    const attempt = await recordAttempt({
      candidateName: body.candidateName,
      categoryId: body.categoryId ?? null,
      categoryName: body.categoryName || "Mixed bank",
      timerMode: body.timerMode ?? "none",
      timerLimitSeconds: Number(body.timerLimitSeconds) || 0,
      perQuestionSeconds: Number(body.perQuestionSeconds) || 0,
      timeTakenSeconds: Math.max(0, Number(body.timeTakenSeconds) || 0),
      answers: answerList.map((item) => {
        const selected = item.selectedAnswer ? String(item.selectedAnswer).toUpperCase() : null;
        return {
          question: byId.get(item.questionId)!,
          selectedAnswer: selected && isLetter(selected) ? (selected as Letter) : null,
          timeSpentSeconds: Math.max(0, Number(item.timeSpentSeconds) || 0),
        };
      }),
    });

    return NextResponse.json({ attemptId: attempt?.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
