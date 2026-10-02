import { NextResponse } from "next/server";
import { db } from "@/db";
import { pdfImports } from "@/db/schema";
import { insertDrafts } from "@/lib/questions";
import { normalizeDraft } from "@/lib/pdf-parser";
import type { DraftQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      categoryName?: string;
      filename?: string;
      method?: string;
      pageCount?: number;
      charCount?: number;
      drafts?: DraftQuestion[];
    };
    const drafts = (body.drafts ?? [])
      .map((item) => normalizeDraft(item))
      .filter((item): item is DraftQuestion => Boolean(item));
    if (!drafts.length) {
      return NextResponse.json({ error: "Review and complete at least one question" }, { status: 400 });
    }
    if (!body.categoryName?.trim()) {
      return NextResponse.json({ error: "Assign a category / tag to this batch" }, { status: 400 });
    }

    const result = await insertDrafts({
      drafts,
      categoryName: body.categoryName,
      source: body.method === "llm" ? "llm" : body.method === "regex" ? "pdf" : "pdf",
      sourceFile: body.filename ?? "upload.pdf",
    });

    await db.insert(pdfImports).values({
      filename: body.filename ?? "upload.pdf",
      pageCount: body.pageCount ?? 0,
      charCount: body.charCount ?? 0,
      questionsCreated: result.questions.length,
      method: body.method ?? "pdf",
      categoryId: result.category.id,
    });

    return NextResponse.json({
      category: result.category,
      questions: result.questions,
      ids: result.questions.map((item) => item.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save PDF batch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
