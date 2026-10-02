import { draftsFromUnknown, healDevanagariText, recheckAndValidateQuestion } from "./pdf-parser";
import type { DraftQuestion } from "./types";

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-flash-latest",
];

export function serverApiKeys() {
  return {
    gemini:
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "",
    openai: process.env.OPENAI_API_KEY || "",
  };
}

export async function generateMcqsWithLlm(options: {
  text: string;
  count: number;
  apiKey?: string;
  provider?: "auto" | "gemini" | "openai";
  mode?: "notes" | "topic";
  language?: "auto" | "hi" | "en";
}): Promise<DraftQuestion[]> {
  const count = Math.min(50, Math.max(1, options.count || 8));
  const excerpt = healDevanagariText(options.text.slice(0, 14000));
  const prompt =
    options.mode === "topic"
      ? buildTopicPrompt(excerpt, count, options.language)
      : buildPrompt(excerpt, count, options.language);
  const keys = serverApiKeys();
  const provider = options.provider ?? "auto";
  const geminiKey = provider === "openai" ? "" : options.apiKey || keys.gemini;
  const openaiKey = provider === "gemini" ? "" : options.apiKey || keys.openai;

  const errors: string[] = [];

  if (geminiKey && provider !== "openai") {
    try {
      const drafts = await generateWithGemini(geminiKey, prompt);
      return drafts.map(recheckAndValidateQuestion);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Gemini failed");
    }
  }

  if (openaiKey && provider !== "gemini") {
    try {
      const drafts = await generateWithOpenAI(openaiKey, prompt, count);
      return drafts.map(recheckAndValidateQuestion);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "OpenAI failed");
    }
  }

  if (!geminiKey && !openaiKey) {
    throw new Error(
      "No LLM API key configured. Add GEMINI_API_KEY or OPENAI_API_KEY on the server, or paste a key in the import studio.",
    );
  }

  throw new Error(errors.join(" · ") || "LLM generation failed");
}

function getLanguageInstruction(language?: "auto" | "hi" | "en") {
  if (language === "hi") {
    return `\nLANGUAGE REQUIREMENT (100% COMPLETE & ACCURATE HINDI):
- All questions, choices (optionA, optionB, optionC, optionD), and explanations MUST be written in fluent, grammatically complete HINDI (शुद्ध मानक हिन्दी, Devanagari script).
- Ensure all Hindi characters, conjuncts, matras, and words are fully spelled out without truncation, cut-offs, or broken glyphs.
- Even if the input source or topic is in English, translate the core concepts and write natural, professional Hindi competitive exam questions.`;
  }
  if (language === "en") {
    return `\nLANGUAGE REQUIREMENT:
- All questions, choices, and explanations MUST be written in fluent ENGLISH with complete, well-formed sentences.`;
  }
  return `\nLANGUAGE REQUIREMENT:
- Maintain the language of the source text. If the source is in Hindi, output in Hindi. If in English, output in English.`;
}

function buildPrompt(text: string, count: number, language?: "auto" | "hi" | "en") {
  return `You are a senior question designer for prestigious competitive examinations (such as UPSC Civil Services, BPSC, State Public Service Commissions, and national olympiads). Read the study material and create ${count} TRICKY, HIGH-DIFFICULTY, ANALYTICAL multiple-choice questions.

Return ONLY a JSON array (no markdown) with this exact shape:
[
  {
    "prompt": "question text",
    "optionA": "...",
    "optionB": "...",
    "optionC": "...",
    "optionD": "...",
    "correctAnswer": "A",
    "explanation": "concise factual explanation verifying why the answer is correct"
  }
]

Competitive Exam Question Rules:
- ALWAYS MAKE TRICKY QUESTIONS: Avoid simple fill-in-the-blanks or direct sentence-completion questions. Use advanced examination patterns:
  1. Multi-Statement Evaluation ("Consider the following statements: 1. ... 2. ... Which is/are correct? (A) 1 only (B) 2 only (C) Both 1 and 2 (D) Neither 1 nor 2" / "निम्नलिखित कथनों पर विचार कीजिए...").
  2. Cause & Effect / Assertion-Reasoning.
  3. Conceptual Discrimination & Exception questions ("Which of the following is NOT correct...").
- FACTUAL ACCURACY & RECHECKING: Recheck and verify every fact and answer against the notes. The correctAnswer (A, B, C, or D) MUST be 100% factually accurate and proven by the explanation.
- ZERO HINT LEAKAGE: Never leak clues, giveaways, keywords, or answers in the prompt text.
- FULL TEXT VISIBILITY: Every Hindi and English word must be written out completely with all characters and matras intact. Never cut off or truncate statements.
- 4 DISTINCT & SUBTLE CHOICES: Provide 4 plausible choices that require genuine analytical thinking to differentiate.
${getLanguageInstruction(language)}

STUDY NOTES:
${text}`;
}

function buildTopicPrompt(topic: string, count: number, language?: "auto" | "hi" | "en") {
  return `You are a senior question designer for prestigious competitive examinations (UPSC, BPSC, State PSC). Create ${count} TRICKY, HIGH-DIFFICULTY, ANALYTICAL multiple-choice questions on this topic: "${topic}".

Return ONLY a JSON array (no markdown) with this exact shape:
[
  {
    "prompt": "question text",
    "optionA": "...",
    "optionB": "...",
    "optionC": "...",
    "optionD": "...",
    "correctAnswer": "A",
    "explanation": "concise factual explanation verifying why the answer is correct"
  }
]

Competitive Exam Question Rules:
- ALWAYS MAKE TRICKY QUESTIONS: Test deep conceptual grasp rather than surface memorization. Use statement evaluation ("Consider statements 1 and 2..."), assertion-reasoning, and subtle distinctions.
- FACTUAL ACCURACY & RECHECKING: Double-check every answer against verified academic facts. The correctAnswer MUST be undeniably correct.
- NO HINTS: Never provide clues or parenthetical answers in the question prompt.
- FULL TEXT: Ensure complete, grammatically pristine text with full words and sentences.
- 4 BALANCED CHOICES: 4 credible, distinct options with one unambiguously correct choice.
${getLanguageInstruction(language)}

TOPIC:
${topic}`;
}

async function generateWithGemini(apiKey: string, prompt: string) {
  let lastError = "Gemini request failed";
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    });
    const payload = (await response.json()) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (!response.ok) {
      lastError = payload.error?.message || `Gemini ${model} returned ${response.status}`;
      continue;
    }
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
    const drafts = parseModelJson(text);
    if (drafts.length) return drafts;
    lastError = "Gemini returned no usable questions";
  }
  throw new Error(lastError);
}

async function generateWithOpenAI(apiKey: string, prompt: string, count: number) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Return a JSON object { "questions": [...] } with ${count} MCQs.`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI returned ${response.status}`);
  }
  const text = payload.choices?.[0]?.message?.content || "";
  const drafts = parseModelJson(text);
  if (!drafts.length) throw new Error("OpenAI returned no usable questions");
  return drafts;
}

function parseModelJson(text: string): DraftQuestion[] {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return draftsFromUnknown(parsed);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      return draftsFromUnknown(record.questions ?? record.items ?? record.data);
    }
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        return draftsFromUnknown(JSON.parse(trimmed.slice(start, end + 1)));
      } catch {
        return [];
      }
    }
  }
  return [];
}
