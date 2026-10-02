import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizAnswers, quizAttempts } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const attemptId = Number(id);
    const [attempt] = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    const answers = await db
      .select()
      .from(quizAnswers)
      .where(eq(quizAnswers.attemptId, attemptId))
      .orderBy(asc(quizAnswers.sortIndex));
    return NextResponse.json({ attempt, answers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load attempt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
