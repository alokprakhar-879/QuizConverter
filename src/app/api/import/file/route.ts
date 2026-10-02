import { NextResponse } from "next/server";
import { draftsFromUnknown, parseCsv } from "@/lib/pdf-parser";
import { insertDrafts } from "@/lib/questions";
import type { DraftQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const categoryName = String(form.get("categoryName") ?? "").trim();
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a CSV or JSON file" }, { status: 400 });
    }
    if (!categoryName) {
      return NextResponse.json({ error: "Assign a category to this import" }, { status: 400 });
    }

    const content = await file.text();
    const name = file.name.toLowerCase();
    let drafts: DraftQuestion[] = [];
    if (name.endsWith(".csv") || file.type.includes("csv")) {
      drafts = parseCsv(content);
    } else if (name.endsWith(".json") || file.type.includes("json")) {
      const parsed = JSON.parse(content) as unknown;
      drafts = draftsFromUnknown(Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown }).questions);
    } else {
      return NextResponse.json({ error: "Use a .csv or .json file" }, { status: 400 });
    }

    if (!drafts.length) {
      return NextResponse.json(
        {
          error:
            "No valid MCQs found. CSV needs prompt,optionA,optionB,optionC,optionD,correctAnswer columns.",
        },
        { status: 422 },
      );
    }

    const result = await insertDrafts({
      drafts,
      categoryName,
      source: name.endsWith(".json") ? "json" : "csv",
      sourceFile: file.name,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
