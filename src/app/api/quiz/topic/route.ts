import { NextResponse } from "next/server";
import { generateFromTopic } from "@/lib/pdf-parser";
import { generateMcqsWithLlm } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topic?: string;
      count?: number;
      apiKey?: string;
      language?: "auto" | "hi" | "en";
    };
    const topic = (body.topic ?? "").trim();
    if (topic.length < 2) {
      return NextResponse.json({ error: "Enter a topic first" }, { status: 400 });
    }
    const count = Math.min(50, Math.max(1, Number(body.count) || 8));
    const language = body.language ?? "auto";

    try {
      const questions = await generateMcqsWithLlm({
        text: topic,
        count,
        apiKey: body.apiKey,
        mode: "topic",
        language,
      });
      return NextResponse.json({ questions, method: "llm", topic });
    } catch (error) {
      const questions = generateFromTopic(topic, count, language);
      return NextResponse.json({
        questions,
        method: "notes",
        topic,
        warning:
          error instanceof Error
            ? `${error.message} Starter questions were drafted instead — edit them before saving.`
            : "Starter questions were drafted instead — edit them before saving.",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Topic generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
