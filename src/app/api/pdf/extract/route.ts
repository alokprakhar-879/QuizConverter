import { NextResponse } from "next/server";
import { generateFromNotes, parseExistingMcqs } from "@/lib/pdf-parser";
import { extractPdfText } from "@/lib/pdf-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const count = Math.min(50, Math.max(1, Number(form.get("count")) || 8));
    const langRaw = String(form.get("language") ?? "auto");
    const language = langRaw === "hi" || langRaw === "en" ? langRaw : "auto";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF file first" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files can be ingested" }, { status: 400 });
    }
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "PDF must be 100 MB or smaller" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractPdfText(bytes);
    if (!extracted.text) {
      return NextResponse.json(
        {
          error:
            "No selectable text was found. This PDF may be a scanned image. Use an OCR’d file or paste notes instead.",
        },
        { status: 422 },
      );
    }

    const parsed = parseExistingMcqs(extracted.text);
    const isQuestionBank = parsed.length >= 2;
    // If provided PDF is already a question bank, ONLY put those questions into the quiz
    const generated = isQuestionBank ? [] : generateFromNotes(extracted.text, count, language);
    const questions = isQuestionBank ? parsed : generated;
    const method = isQuestionBank ? "regex" : generated.length ? "notes" : "empty";

    return NextResponse.json({
      filename: file.name,
      totalPages: extracted.totalPages,
      text: extracted.text.slice(0, 20000),
      charCount: extracted.text.length,
      method,
      questions,
      regexCount: parsed.length,
      isQuestionBank,
      totalBankQuestions: parsed.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
