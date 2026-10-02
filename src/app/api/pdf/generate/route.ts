import { NextResponse } from "next/server";
import { generateFromNotes, parseExistingMcqs } from "@/lib/pdf-parser";
import { generateMcqsWithLlm } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      count?: number;
      apiKey?: string;
      provider?: "auto" | "gemini" | "openai";
      engine?: "llm" | "notes" | "auto";
      language?: "auto" | "hi" | "en";
    };
    const text = (body.text ?? "").trim();
    if (text.length < 40) {
      return NextResponse.json({ error: "Need more source text to generate questions" }, { status: 400 });
    }
    const count = Math.min(50, Math.max(1, Number(body.count) || 8));
    const language = body.language ?? "auto";

    const parsed = parseExistingMcqs(text);
    if (parsed.length >= 2 && body.engine !== "llm") {
      return NextResponse.json({
        questions: parsed,
        method: "regex",
        regexCount: parsed.length,
        isQuestionBank: true,
        totalBankQuestions: parsed.length,
      });
    }

    if (body.engine === "notes") {
      const questions = generateFromNotes(text, count, language);
      if (!questions.length) {
        return NextResponse.json(
          { error: "The notes did not contain enough distinct sentences to draft MCQs" },
          { status: 422 },
        );
      }
      return NextResponse.json({ questions, method: "notes" });
    }

    try {
      const questions = await generateMcqsWithLlm({
        text,
        count,
        apiKey: body.apiKey,
        provider: body.provider,
        language,
      });
      return NextResponse.json({ questions, method: "llm" });
    } catch (error) {
      const fallback = generateFromNotes(text, count, language);
      if (fallback.length) {
        const hasKey = Boolean(body.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
        return NextResponse.json({
          questions: fallback,
          method: "notes",
          warning:
            hasKey && error instanceof Error
              ? `AI service reported: ${error.message}. Generated using smart local extractor instead.`
              : "Questions drafted using built-in smart extractor (Hindi & English supported). Optional: paste an API key for deep AI generation.",
        });
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Question generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
