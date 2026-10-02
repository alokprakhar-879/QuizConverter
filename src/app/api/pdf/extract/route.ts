import { NextResponse } from "next/server";
import { generateFromNotes, parseExistingMcqs } from "@/lib/pdf-parser";
import { extractPdfText } from "@/lib/pdf-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let extractedText = "";
    let filename = "document.pdf";
    let totalPages = 1;
    let count = 8;
    let language: "auto" | "hi" | "en" = "auto";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      extractedText = String(body.text ?? "");
      filename = String(body.filename ?? "document.pdf");
      totalPages = Number(body.totalPages) || 1;
      count = Math.min(50, Math.max(1, Number(body.count) || 8));
      const langRaw = String(body.language ?? "auto");
      language = langRaw === "hi" || langRaw === "en" ? langRaw : "auto";
    } else {
      const form = await request.formData();
      const file = form.get("file");
      count = Math.min(50, Math.max(1, Number(form.get("count")) || 8));
      const langRaw = String(form.get("language") ?? "auto");
      language = langRaw === "hi" || langRaw === "en" ? langRaw : "auto";
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

      filename = file.name;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extracted = await extractPdfText(bytes);
      extractedText = extracted.text;
      totalPages = extracted.totalPages;
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            "No selectable text was found. This PDF may be a scanned image. Use an OCR’d file or paste notes instead.",
        },
        { status: 422 },
      );
    }

    const parsed = parseExistingMcqs(extractedText);
    const isQuestionBank = parsed.length >= 2;
    // If provided PDF is already a question bank, ONLY put those questions into the quiz
    const generated = isQuestionBank ? [] : generateFromNotes(extractedText, count, language);
    const questions = isQuestionBank ? parsed : generated;
    const method = isQuestionBank ? "regex" : generated.length ? "notes" : "empty";

    return NextResponse.json({
      filename,
      totalPages,
      text: extractedText.slice(0, 20000),
      charCount: extractedText.length,
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
