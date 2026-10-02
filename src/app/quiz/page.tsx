"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Field, PrimaryButton, fieldClass } from "@/components/AppShell";
import { QuizConfig, type QuizConfigValue } from "@/components/QuizConfig";
import { QUIZ_SESSION_KEY } from "@/lib/types";
import { fetchJson } from "@/lib/utils";

type CategoryRow = { id: number; name: string; questionCount: number };

export default function QuizSetupPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [config, setConfig] = useState<QuizConfigValue>({
    count: "10",
    globalMinutes: 15,
    perQuestionSeconds: 0,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchJson<{ categories: CategoryRow[] }>("/api/categories")
      .then((data) => setCategories(data.categories))
      .catch((err: Error) => setError(err.message));
  }, []);

  const selected = categories.find((item) => String(item.id) === categoryId);
  const available = selected?.questionCount ?? categories.reduce((sum, item) => sum + item.questionCount, 0);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const data = await fetchJson<{ session: unknown }>("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId ? Number(categoryId) : null,
          count: config.count === "all" ? "all" : Number(config.count),
          orderMode: config.orderMode ?? "start",
          timerLimitSeconds: config.globalMinutes * 60,
          perQuestionSeconds: config.perQuestionSeconds,
        }),
      });
      sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(data.session));
      router.push("/quiz/run");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Start a quiz" lede="Choose a set, how many questions, and optional timers. Time expiry submits automatically.">
      <div className="space-y-5 rounded-xl border border-line bg-card p-5">
        {error && <p className="text-sm text-bad">{error}</p>}
        <Field label="Question set">
          <select className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">All questions ({categories.reduce((s, c) => s + c.questionCount, 0)})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.questionCount})
              </option>
            ))}
          </select>
        </Field>
        <QuizConfig value={config} onChange={setConfig} available={available} />
        <PrimaryButton disabled={busy || available === 0} onClick={() => void start()}>
          Begin
        </PrimaryButton>
      </div>
    </AppShell>
  );
}
