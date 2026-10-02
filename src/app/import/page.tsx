"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppShell, Field, GhostButton, PrimaryButton, fieldClass } from "@/components/AppShell";
import { DraftList } from "@/components/DraftList";
import { QuizConfig, type QuizConfigValue } from "@/components/QuizConfig";
import { QUIZ_SESSION_KEY, emptyDraft, type DraftQuestion } from "@/lib/types";
import { cn, fetchJson, shuffle } from "@/lib/utils";

function ImportInner() {
  const router = useRouter();
  const search = useSearchParams();
  const initialTab = search.get("tab");
  const [tab, setTab] = useState<"pdf" | "topic" | "notes">(
    initialTab === "topic" || initialTab === "notes" ? initialTab : "pdf",
  );
  const [fileName, setFileName] = useState("");
  const [pages, setPages] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [text, setText] = useState("");
  const [method, setMethod] = useState("regex");
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [isQuestionBank, setIsQuestionBank] = useState(false);
  const [allBankQuestions, setAllBankQuestions] = useState<DraftQuestion[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [topic, setTopic] = useState(search.get("q") ?? "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [config, setConfig] = useState<QuizConfigValue>({
    count: "10",
    globalMinutes: 10,
    perQuestionSeconds: 0,
    language: "auto",
    orderMode: "start",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("meridian_quiz_api_key");
      if (stored) setApiKey(stored);
    } catch {}
  }, []);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    try {
      if (key.trim()) {
        localStorage.setItem("meridian_quiz_api_key", key.trim());
      } else {
        localStorage.removeItem("meridian_quiz_api_key");
      }
    } catch {}
  };

  const effectiveCount = useMemo(() => {
    if (config.count === "all") return isQuestionBank && allBankQuestions.length ? allBankQuestions.length : 10;
    const n = Number(config.count);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }, [config.count, isQuestionBank, allBankQuestions.length]);

  // When question bank is present, slice according to starting / ending / random selection
  useEffect(() => {
    if (!isQuestionBank || !allBankQuestions.length) return;
    const total = allBankQuestions.length;
    const n = config.count === "all" ? total : Math.min(Number(config.count) || 10, total);
    const mode = config.orderMode ?? "start";
    let subset: DraftQuestion[] = [];
    if (mode === "end") {
      subset = allBankQuestions.slice(-n);
    } else if (mode === "start") {
      subset = allBankQuestions.slice(0, n);
    } else {
      subset = shuffle(allBankQuestions).slice(0, n);
    }
    setDrafts(subset);
  }, [isQuestionBank, allBankQuestions, config.count, config.orderMode]);

  const complete = useMemo(
    () => drafts.filter((d) => d.prompt && d.optionA && d.optionB && d.optionC && d.optionD),
    [drafts],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("PDF must be 100 MB or smaller.");
      return;
    }
    setError("");
    setWarning("");
    setBusy("Reading PDF (supports up to 100 MB)…");

    type ExtractResult = {
      filename: string;
      totalPages: number;
      text: string;
      charCount: number;
      method: string;
      questions: DraftQuestion[];
      isQuestionBank?: boolean;
      totalBankQuestions?: number;
    };

    try {
      let data: ExtractResult;

      // Vercel serverless functions have a 4.5 MB request body limit.
      // For any PDF > 3.5 MB, extract text directly in the browser and send the clean text JSON (~50-100 KB)
      if (file.size > 3.5 * 1024 * 1024) {
        setBusy(`Extracting text from ${Math.round(file.size / (1024 * 1024))} MB PDF directly in your browser…`);
        const { extractPdfText } = await import("@/lib/pdf-extract");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const extracted = await extractPdfText(bytes);
        if (!extracted.text.trim()) {
          throw new Error("No selectable text was found. This PDF may be a scanned image.");
        }
        setBusy("Analyzing questions & creating quiz…");
        data = await fetchJson<ExtractResult>("/api/pdf/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: extracted.text,
            filename: file.name,
            totalPages: extracted.totalPages,
            count: effectiveCount,
            language: config.language ?? "auto",
          }),
        });
      } else {
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("count", String(effectiveCount));
          form.append("language", config.language ?? "auto");
          data = await fetchJson<ExtractResult>("/api/pdf/extract", { method: "POST", body: form });
        } catch (uploadErr) {
          // If 413 or payload limit error, fallback to browser extraction
          setBusy("Direct upload limit reached; extracting text in browser…");
          const { extractPdfText } = await import("@/lib/pdf-extract");
          const bytes = new Uint8Array(await file.arrayBuffer());
          const extracted = await extractPdfText(bytes);
          data = await fetchJson<ExtractResult>("/api/pdf/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: extracted.text,
              filename: file.name,
              totalPages: extracted.totalPages,
              count: effectiveCount,
              language: config.language ?? "auto",
            }),
          });
        }
      }

      setFileName(data.filename);
      setPages(data.totalPages);
      setCharCount(data.charCount);
      setText(data.text);
      setMethod(data.method);
      const isBank = Boolean(
        data.isQuestionBank ||
          data.method === "regex" ||
          (data.questions && data.questions.length >= 2 && data.method === "regex"),
      );
      setIsQuestionBank(isBank);
      setAllBankQuestions(data.questions || []);
      setDrafts(data.questions.length ? data.questions : [emptyDraft()]);
      if (!categoryName) setCategoryName(data.filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "));
      if (isBank) {
        setWarning("");
      } else if (data.method !== "regex") {
        setWarning("No numbered question bank found in this PDF. Analytical questions were drafted from the study notes — review before saving.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setBusy("");
    }
  }

  async function generateFromNotes(startQuiz = false) {
    if (!text.trim()) {
      setError("Upload a PDF or paste notes first.");
      return;
    }
    setBusy(startQuiz ? "Generating quiz & preparing session…" : "Generating questions…");
    setError("");
    setWarning("");
    try {
      const data = await fetchJson<{ questions: DraftQuestion[]; method: string; warning?: string }>(
        "/api/pdf/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            count: effectiveCount,
            engine: "auto",
            apiKey: apiKey.trim() || undefined,
            language: config.language ?? "auto",
          }),
        },
      );
      if (!data.questions?.length) {
        setError("Could not generate questions from the text.");
        return;
      }
      setDrafts(data.questions);
      setMethod(data.method);
      if (data.warning) setWarning(data.warning);

      if (startQuiz) {
        const cat = categoryName.trim() || fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ") || "Study Notes";
        const saved = await fetchJson<{
          category: { id: number; name: string };
          ids: number[];
        }>("/api/pdf/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryName: cat,
            filename: fileName || "notes",
            method: data.method,
            pageCount: pages || 1,
            charCount: text.length,
            drafts: data.questions,
          }),
        });

        const session = await fetchJson<{ session: unknown }>("/api/quiz/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIds: saved.ids,
            categoryId: saved.category.id,
            count: config.count === "all" ? "all" : effectiveCount,
            orderMode: config.orderMode ?? "start",
            timerLimitSeconds: config.globalMinutes * 60,
            perQuestionSeconds: config.perQuestionSeconds,
          }),
        });
        sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(session.session));
        router.push("/quiz/run");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy("");
    }
  }

  async function generateTopic(startQuiz = false) {
    if (!topic.trim()) {
      setError("Enter a topic first.");
      return;
    }
    setBusy(startQuiz ? "Generating quiz from topic…" : "Generating questions…");
    setError("");
    setWarning("");
    try {
      if (startQuiz) {
        const data = await fetchJson<{ session: unknown; warning?: string }>("/api/quiz/instant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            count: effectiveCount,
            timerLimitSeconds: config.globalMinutes * 60,
            perQuestionSeconds: config.perQuestionSeconds,
            apiKey: apiKey.trim() || undefined,
            language: config.language ?? "auto",
          }),
        });
        sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(data.session));
        router.push("/quiz/run");
        return;
      }

      const data = await fetchJson<{ questions: DraftQuestion[]; method: string; warning?: string }>(
        "/api/quiz/topic",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            count: effectiveCount,
            apiKey: apiKey.trim() || undefined,
            language: config.language ?? "auto",
          }),
        },
      );
      setDrafts(data.questions);
      setMethod(data.method);
      if (!categoryName) setCategoryName(topic.trim());
      if (data.warning) setWarning(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy("");
    }
  }

  async function save(startQuiz: boolean) {
    if (!complete.length) {
      setError("Finish at least one question with four options.");
      return;
    }
    if (!categoryName.trim()) {
      setError("Give this set a name.");
      return;
    }
    setBusy(startQuiz ? "Starting quiz…" : "Saving to bank…");
    setError("");
    try {
      const saved = await fetchJson<{
        category: { id: number; name: string };
        ids: number[];
      }>("/api/pdf/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryName,
          filename: fileName || topic || "quiz",
          method,
          pageCount: pages,
          charCount,
          drafts: complete,
        }),
      });
      if (startQuiz) {
        const session = await fetchJson<{ session: unknown }>("/api/quiz/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIds: saved.ids,
            categoryId: saved.category.id,
            count: config.count === "all" ? "all" : effectiveCount,
            orderMode: config.orderMode ?? "start",
            timerLimitSeconds: config.globalMinutes * 60,
            perQuestionSeconds: config.perQuestionSeconds,
          }),
        });
        sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(session.session));
        router.push("/quiz/run");
        return;
      }
      router.push("/bank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <AppShell
      title="Create a quiz"
      lede="Upload a PDF (up to 100 MB), paste study notes, or type a topic. Set timers, question count, and practice."
    >
      {/* Engine & Optional API Key Card */}
      <div className="mb-6 rounded-xl border border-line bg-card p-3.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium",
                apiKey.trim()
                  ? "bg-accent/15 text-accent"
                  : "bg-good/15 text-good",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {apiKey.trim() ? "AI Generation Enabled" : "Smart Multilingual Extractor (Free & Offline)"}
            </span>
            <span className="text-muted">
              {apiKey.trim()
                ? "Using your custom API key"
                : "No API key needed — Hindi, English & Devanagari fully supported"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAiSettings((prev) => !prev)}
            className="text-accent hover:underline font-medium"
          >
            {showAiSettings ? "Hide AI Key Settings" : "Configure AI Key (Optional)"}
          </button>
        </div>

        {showAiSettings && (
          <div className="mt-3 border-t border-line pt-3 space-y-2">
            <p className="text-muted">
              Optional: Add a Google Gemini (free from Google AI Studio) or OpenAI API key for deep AI MCQ generation.
              Keys are stored securely in your browser’s local storage.
            </p>
            <div className="flex gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                className={`${fieldClass} font-mono text-xs`}
                placeholder="Paste Gemini (AIza...) or OpenAI (sk-...) API key"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="rounded-lg border border-line px-3 py-1 text-xs hover:bg-line/40 transition whitespace-nowrap"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
              {apiKey && (
                <button
                  type="button"
                  onClick={() => handleApiKeyChange("")}
                  className="rounded-lg border border-line px-3 py-1 text-xs text-bad hover:bg-bad/10 transition whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-line p-1 text-sm">
        {(
          [
            ["pdf", "PDF (up to 100 MB)"],
            ["notes", "Notes"],
            ["topic", "Topic"],
          ] as const
        ).map(([item, label]) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5",
              tab === item ? "bg-card font-medium shadow-sm" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pdf" && (
        <section className="space-y-4">
          <label className="block cursor-pointer rounded-xl border border-dashed border-line bg-card px-4 py-8 text-center hover:border-fg transition">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
            <p className="text-sm font-medium">{fileName || "Choose a PDF file (up to 100 MB)"}</p>
            <p className="mt-1 text-xs text-muted">
              Numbered exam papers are extracted as-is. Study notes become MCQs. Supports PDFs up to 100 MB.
            </p>
            {fileName && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="text-good font-medium">
                  ✓ Loaded: {pages} pages · {charCount.toLocaleString()} characters
                </span>
                {complete.length > 0 && (
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-accent font-medium">
                    ✓ {complete.length} MCQs ready
                  </span>
                )}
              </div>
            )}
          </label>

          {isQuestionBank && (
            <div className="rounded-xl border border-good/40 bg-good/10 p-4 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-good">
                <span>✓ PDF Question Bank Detected</span>
                <span className="rounded-md bg-good/20 px-2.5 py-0.5 text-xs text-good font-mono">
                  {allBankQuestions.length} Questions Found in PDF
                </span>
              </div>
              <p className="text-xs text-fg leading-relaxed">
                This PDF already contains official questions. <strong>Only these verified PDF questions are put on your quiz</strong>. Choose how many questions to attempt and select <strong>From Beginning (शुरू से)</strong> or <strong>From End (अंत से)</strong>.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-line bg-card p-4">
            <p className="text-sm font-medium">Quiz settings for this PDF</p>
            <p className="mt-1 text-xs text-muted mb-3">
              Configure question count, question range (शुरू से / अंत से), and timers.
            </p>
            <QuizConfig
              value={config}
              onChange={setConfig}
              available={isQuestionBank ? allBankQuestions.length : complete.length}
              showOrderMode={true}
            />
          </div>

          {text && (
            <div className="flex flex-wrap gap-2">
              {isQuestionBank ? (
                <>
                  <PrimaryButton
                    type="button"
                    disabled={Boolean(busy) || !complete.length}
                    onClick={() => void save(true)}
                  >
                    Start Quiz ({complete.length} PDF Questions)
                  </PrimaryButton>
                  <GhostButton
                    type="button"
                    disabled={Boolean(busy) || !complete.length}
                    onClick={() => void save(false)}
                  >
                    Save to Bank
                  </GhostButton>
                </>
              ) : (
                <>
                  <GhostButton type="button" disabled={Boolean(busy)} onClick={() => void generateFromNotes(false)}>
                    Regenerate for review
                  </GhostButton>
                  <PrimaryButton type="button" disabled={Boolean(busy)} onClick={() => void generateFromNotes(true)}>
                    Generate Tricky Questions & Start Quiz
                  </PrimaryButton>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {tab === "notes" && (
        <section className="space-y-4">
          <Field label="Paste notes or existing MCQs">
            <textarea
              className={`${fieldClass} min-h-[160px]`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={"1. What is force?\nA) Mass times acceleration\nB) Mass times velocity\nC) Energy\nD) Power\nAnswer: A"}
            />
          </Field>

          <div className="rounded-xl border border-line bg-card p-4">
            <p className="text-sm font-medium">Quiz settings for these notes</p>
            <p className="mt-1 text-xs text-muted mb-3">
              Configure question count, overall timer, and timer per question.
            </p>
            <QuizConfig value={config} onChange={setConfig} />
          </div>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              type="button"
              disabled={Boolean(busy)}
              onClick={() => {
                if (!categoryName.trim()) setCategoryName("Pasted notes");
                void generateFromNotes(true);
              }}
            >
              Generate & Start Quiz
            </PrimaryButton>
            <GhostButton
              type="button"
              disabled={Boolean(busy)}
              onClick={() => {
                if (!categoryName.trim()) setCategoryName("Pasted notes");
                void generateFromNotes(false);
              }}
            >
              Generate for review
            </GhostButton>
          </div>
        </section>
      )}

      {tab === "topic" && (
        <section className="space-y-4">
          <Field label="Topic">
            <input
              className={fieldClass}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Newton’s second law, Photosynthesis, French Revolution…"
            />
          </Field>

          <div className="rounded-xl border border-line bg-card p-4">
            <p className="text-sm font-medium">Quiz settings for this topic</p>
            <p className="mt-1 text-xs text-muted mb-3">
              Configure question count, overall timer, and timer per question.
            </p>
            <QuizConfig value={config} onChange={setConfig} />
          </div>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="button" disabled={Boolean(busy)} onClick={() => void generateTopic(true)}>
              Generate & Start Quiz
            </PrimaryButton>
            <GhostButton type="button" disabled={Boolean(busy)} onClick={() => void generateTopic(false)}>
              Generate for review
            </GhostButton>
          </div>
        </section>
      )}

      <div className="mt-8 space-y-4">
        <Field label="Set name / category">
          <input
            className={fieldClass}
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="e.g. General Science, Unit 1"
          />
        </Field>
        {busy && <p className="text-sm text-accent animate-pulse font-medium">{busy}</p>}
        {error && <p className="text-sm text-bad font-medium">{error}</p>}
        {warning && <p className="text-sm text-muted">{warning}</p>}
      </div>

      {drafts.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Review · {complete.length} ready</h2>
            <p className="text-xs text-muted">You can edit prompts, choices, and explanations before saving.</p>
          </div>
          <DraftList drafts={drafts} onChange={setDrafts} />
          <div className="mt-8 rounded-xl border border-line bg-card p-4">
            <p className="text-sm font-medium">Confirm quiz settings</p>
            <p className="mt-1 text-xs text-muted mb-3">Adjust timers or question count before starting.</p>
            <QuizConfig value={config} onChange={setConfig} available={complete.length} />
            <div className="mt-4 flex gap-2">
              <GhostButton disabled={Boolean(busy)} onClick={() => void save(false)}>
                Save to bank only
              </GhostButton>
              <PrimaryButton disabled={Boolean(busy)} onClick={() => void save(true)}>
                Save and start quiz
              </PrimaryButton>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}

export default function ImportPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Create a quiz">
          <p className="text-sm text-muted">Loading…</p>
        </AppShell>
      }
    >
      <ImportInner />
    </Suspense>
  );
}
