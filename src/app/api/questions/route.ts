import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { insertDrafts, listQuestions } from "@/lib/questions";
import { normalizeDraft } from "@/lib/pdf-parser";
import { seedIfEmpty } from "@/lib/seed";
import { isLetter, type DraftQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await seedIfEmpty();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const q = searchParams.get("q") ?? undefined;
    const rows = await listQuestions({
      categoryId: categoryId ? Number(categoryId) : undefined,
      q,
    });
    return NextResponse.json({ questions: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      categoryName?: string;
      source?: string;
      sourceFile?: string;
      drafts?: DraftQuestion[];
      prompt?: string;
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctAnswer?: string;
      explanation?: string;
    };

    const drafts = body.drafts?.length
      ? body.drafts
      : [
          normalizeDraft({
            prompt: body.prompt,
            optionA: body.optionA,
            optionB: body.optionB,
            optionC: body.optionC,
            optionD: body.optionD,
            correctAnswer: isLetter(String(body.correctAnswer || "A"))
              ? (body.correctAnswer as DraftQuestion["correctAnswer"])
              : "A",
            explanation: body.explanation,
          }),
        ].filter((item): item is DraftQuestion => Boolean(item));

    if (!drafts.length) {
      return NextResponse.json({ error: "At least one complete question is required" }, { status: 400 });
    }
    if (!body.categoryName?.trim()) {
      return NextResponse.json({ error: "Assign a category before saving" }, { status: 400 });
    }

    const result = await insertDrafts({
      drafts,
      categoryName: body.categoryName,
      source: body.source ?? "manual",
      sourceFile: body.sourceFile,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: number;
      prompt?: string;
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctAnswer?: string;
      explanation?: string;
      categoryId?: number;
    };
    if (!body.id) {
      return NextResponse.json({ error: "Question id is required" }, { status: 400 });
    }
    if (body.correctAnswer && !isLetter(body.correctAnswer)) {
      return NextResponse.json({ error: "Correct answer must be A, B, C, or D" }, { status: 400 });
    }
    const [updated] = await db
      .update(questions)
      .set({
        prompt: body.prompt,
        optionA: body.optionA,
        optionB: body.optionB,
        optionC: body.optionC,
        optionD: body.optionD,
        correctAnswer: body.correctAnswer,
        explanation: body.explanation,
        categoryId: body.categoryId,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, body.id))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json({ question: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
