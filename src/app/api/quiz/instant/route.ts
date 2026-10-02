import { NextResponse } from "next/server";
import { generateFromTopic } from "@/lib/pdf-parser";
import { generateMcqsWithLlm } from "@/lib/llm";
import { insertDrafts, toPublicQuestion } from "@/lib/questions";
import { deriveTimerMode, type DraftQuestion } from "@/lib/types";
import { seedIfEmpty } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await seedIfEmpty();
    const body = (await request.json()) as {
      topic?: string;
      count?: number;
      timerLimitSeconds?: number;
      perQuestionSeconds?: number;
      apiKey?: string;
      language?: "auto" | "hi" | "en";
      candidateName?: string;
    };
    const topic = (body.topic ?? "").trim();
    if (topic.length < 2) {
      return NextResponse.json({ error: "Enter a topic first" }, { status: 400 });
    }
    const count = Math.min(50, Math.max(1, Number(body.count) || 8));
    const timerLimitSeconds = Math.max(0, Number(body.timerLimitSeconds) || 0);
    const perQuestionSeconds = Math.max(0, Number(body.perQuestionSeconds) || 0);
    const language = body.language ?? "auto";

    let drafts: DraftQuestion[] = [];
    let method = "llm";
    let warning = "";
    try {
      drafts = await generateMcqsWithLlm({
        text: topic,
        count,
        mode: "topic",
        apiKey: body.apiKey,
        language,
      });
    } catch (error) {
      drafts = generateFromTopic(topic, count, language);
      method = "notes";
      warning =
        error instanceof Error
          ? `${error.message} Starter questions were used instead.`
          : "Starter questions were used instead.";
    }

    if (!drafts.length) {
      return NextResponse.json({ error: "Could not generate questions for that topic" }, { status: 422 });
    }

    const saved = await insertDrafts({
      drafts,
      categoryName: topic,
      source: method === "llm" ? "llm" : "topic",
      sourceFile: topic,
    });

    return NextResponse.json({
      warning: warning || undefined,
      session: {
        categoryId: saved.category.id,
        categoryName: saved.category.name,
        candidateName: body.candidateName?.trim() || undefined,
        timerMode: deriveTimerMode(timerLimitSeconds, perQuestionSeconds),
        timerLimitSeconds,
        perQuestionSeconds,
        startedAt: Date.now(),
        questions: saved.questions.map(toPublicQuestion),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start a quiz from that topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
