"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell, PrimaryButton, fieldClass } from "@/components/AppShell";
import { QuizConfig, type QuizConfigValue } from "@/components/QuizConfig";
import { QUIZ_SESSION_KEY, type StudioStats } from "@/lib/types";
import { accuracyLabel, fetchJson, formatDate } from "@/lib/utils";

type CategoryRow = {
  id: number;
  name: string;
  questionCount: number;
};

type AttemptRow = {
  id: number;
  categoryName: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  completedAt: string;
};

export default function StudioPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StudioStats | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recent, setRecent] = useState<AttemptRow[]>([]);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<QuizConfigValue>({
    count: "8",
    globalMinutes: 10,
    perQuestionSeconds: 0,
    language: "auto",
  });

  useEffect(() => {
    fetchJson<{ stats: StudioStats; categories: CategoryRow[]; recent: AttemptRow[] }>("/api/stats")
      .then((data) => {
        setStats(data.stats);
        setCategories(data.categories);
        setRecent(data.recent);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function instantQuiz() {
    if (!topic.trim()) {
      setError("Enter a topic to generate a quiz.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await fetchJson<{ session: unknown; warning?: string }>("/api/quiz/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          count: config.count === "all" ? 10 : Number(config.count) || 8,
          timerLimitSeconds: config.globalMinutes * 60,
          perQuestionSeconds: config.perQuestionSeconds,
          language: config.language ?? "auto",
        }),
      });
      sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(data.session));
      router.push("/quiz/run");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a quiz");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Quiz dashboard" lede="Create from a PDF or topic, then practice. That’s the whole loop.">
      {error && <p className="mb-6 text-sm text-bad">{error}</p>}

      <form
        className="rounded-xl border border-line bg-card p-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void instantQuiz();
        }}
      >
        <div>
          <p className="text-sm font-medium">Quick quiz from a topic</p>
          <p className="mt-1 text-xs text-muted">
            Configure questions, language (Hindi / English / Auto), timer per question, and overall duration.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={fieldClass}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Indian History, Photosynthesis, भारतीय संविधान (Polity)…"
          />
          <PrimaryButton type="submit" disabled={busy} className="shrink-0">
            {busy ? "Generating…" : "Generate & start"}
          </PrimaryButton>
        </div>

        <div className="pt-2 border-t border-line/60">
          <QuizConfig value={config} onChange={setConfig} />
        </div>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Action href="/import" title="Create" body="PDF, pasted notes, or a topic — with review." />
        <Action href="/quiz" title="Start quiz" body="Use questions already in the bank." />
        <Action href="/bank" title="Question bank" body="Edit, search, reorder, import CSV." />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <Stat label="Questions" value={stats?.questionCount ?? "—"} />
        <Stat label="Attempts" value={stats?.attemptCount ?? "—"} />
        <Stat label="Average" value={stats ? `${stats.averageAccuracy}%` : "—"} />
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Recent attempts</h2>
          <Link href="/history" className="text-sm text-muted hover:text-fg">
            All progress
          </Link>
        </div>
        <div className="divide-y divide-line rounded-xl border border-line bg-card">
          {recent.map((row) => (
            <Link key={row.id} href={`/history/${row.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-bg">
              <div>
                <p className="text-sm">{row.categoryName}</p>
                <p className="text-xs text-muted">
                  {row.correctCount}/{row.totalQuestions} · {accuracyLabel(row.percentage)} · {formatDate(row.completedAt)}
                </p>
              </div>
              <p className="stat-num text-sm font-medium">{row.percentage}%</p>
            </Link>
          ))}
          {!recent.length && (
            <p className="px-4 py-8 text-center text-sm text-muted">No quizzes yet. Generate one above or start a demo set.</p>
          )}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium">Sets</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href="/quiz"
                className="rounded-full border border-line bg-card px-3 py-1 text-xs text-muted hover:border-fg hover:text-fg"
              >
                {cat.name} · {cat.questionCount}
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function Action({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-xl border border-line bg-card p-4 transition hover:border-fg">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{body}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="stat-num mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
