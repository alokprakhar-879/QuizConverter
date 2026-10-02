"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { StudioStats } from "@/lib/types";
import { accuracyLabel, fetchJson, formatDate, formatDuration } from "@/lib/utils";

type AttemptRow = {
  id: number;
  candidateName?: string;
  categoryName: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  timeTakenSeconds: number;
  completedAt: string;
};

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [stats, setStats] = useState<StudioStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<{ attempts: AttemptRow[]; stats: StudioStats }>("/api/attempts")
      .then((data) => {
        setAttempts(data.attempts);
        setStats(data.stats);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <AppShell title="Progress" lede="Score history and a simple trend of recent quizzes.">
      {error && <p className="mb-4 text-sm text-bad">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        <Mini label="Quizzes" value={stats?.attemptCount ?? 0} />
        <Mini label="Average" value={`${stats?.averageAccuracy ?? 0}%`} />
        <Mini label="Best" value={`${stats?.bestPercentage ?? 0}%`} />
      </div>

      {attempts.length > 0 && (
        <div className="mt-8 flex h-16 items-end gap-1">
          {attempts
            .slice(0, 16)
            .reverse()
            .map((row) => (
              <Link
                key={row.id}
                href={`/history/${row.id}`}
                className="flex h-full flex-1 items-end rounded-sm bg-line"
                title={`${row.percentage}%`}
              >
                <span
                  className="block w-full rounded-sm bg-fg"
                  style={{ height: `${Math.max(8, row.percentage)}%` }}
                />
              </Link>
            ))}
        </div>
      )}

      <div className="mt-8 divide-y divide-line rounded-xl border border-line bg-card">
        {attempts.map((row) => (
          <Link key={row.id} href={`/history/${row.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-bg">
            <div>
              <p className="text-sm font-medium">
                {row.categoryName}
                {row.candidateName && row.candidateName !== "Candidate" ? (
                  <span className="ml-2 rounded bg-accent/15 px-2 py-0.5 text-xs text-accent font-normal">
                    {row.candidateName}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {formatDate(row.completedAt)} · {formatDuration(row.timeTakenSeconds)} · {accuracyLabel(row.percentage)}
              </p>
            </div>
            <p className="stat-num text-sm">
              {row.correctCount}/{row.totalQuestions} · {row.percentage}%
            </p>
          </Link>
        ))}
        {!attempts.length && <p className="px-4 py-10 text-center text-sm text-muted">No attempts yet.</p>}
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="stat-num mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
