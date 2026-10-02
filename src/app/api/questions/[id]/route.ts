import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const questionId = Number(id);
    if (!questionId) {
      return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
    }
    const deleted = await db.delete(questions).where(eq(questions.id, questionId)).returning();
    if (!deleted.length) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
