"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell, GhostButton, PrimaryButton } from "@/components/AppShell";
import { LETTERS, optionKey } from "@/lib/types";
import { accuracyLabel, cn, fetchJson, formatDate, formatDuration } from "@/lib/utils";

type Attempt = {
  id: number;
  candidateName?: string;
  categoryName: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  timeTakenSeconds: number;
  timerMode: string;
  completedAt: string;
};

type Answer = {
  id: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
  explanation: string;
};

export default function AttemptPage() {
  const params = useParams<{ id: string }>();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<{ attempt: Attempt; answers: Answer[] }>(`/api/attempts/${params.id}`)
      .then((data) => {
        setAttempt(data.attempt);
        setAnswers(data.answers);
      })
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  if (error) {
    return (
      <AppShell title="Not found">
        <p className="text-sm text-bad">{error}</p>
      </AppShell>
    );
  }

  if (!attempt) {
    return (
      <AppShell title="Loading Results…">
        <p className="text-sm text-muted">Loading your official examination scorecard.</p>
      </AppShell>
    );
  }

  const incorrectCount = attempt.totalQuestions - attempt.correctCount;
  const passed = attempt.percentage >= 60;
  const candidate = attempt.candidateName || "Candidate";

  return (
    <AppShell
      title="Examination Score Report"
      lede={`Candidate: ${candidate} · Subject: ${attempt.categoryName} · Completed: ${formatDate(attempt.completedAt)}`}
      actions={
        <div className="flex gap-2">
          <Link href="/quiz">
            <PrimaryButton>Take Another Quiz</PrimaryButton>
          </Link>
          <Link href="/history">
            <GhostButton>All History</GhostButton>
          </Link>
        </div>
      }
    >
      {/* Official Scorecard Certificate Card */}
      <div className="rounded-2xl border border-line bg-card p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-muted">
              Official Assessment Result
            </span>
            <h2 className="mt-1 text-2xl font-bold text-fg flex items-center gap-3">
              {candidate}
              <span
                className={cn(
                  "rounded-full px-3 py-0.5 text-xs font-semibold",
                  passed
                    ? "bg-good/15 text-good border border-good/30"
                    : "bg-accent/15 text-accent border border-accent/30",
                )}
              >
                {passed ? "Qualified / Passed" : "Needs Review"}
              </span>
            </h2>
            <p className="mt-1 text-xs text-muted">
              Category: <strong>{attempt.categoryName}</strong> · Time Taken:{" "}
              <strong>{formatDuration(attempt.timeTakenSeconds)}</strong>
            </p>
          </div>

          <div className="text-right">
            <div className="stat-num text-4xl sm:text-5xl font-black text-fg">
              {attempt.percentage}%
            </div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mt-1">
              {accuracyLabel(attempt.percentage)}
            </p>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="rounded-xl border border-line/60 bg-bg p-3.5">
            <p className="text-xs text-muted">Total Questions</p>
            <p className="stat-num text-xl font-bold text-fg mt-1">{attempt.totalQuestions}</p>
          </div>
          <div className="rounded-xl border border-good/30 bg-good/10 p-3.5">
            <p className="text-xs text-good font-semibold">Correct Answers</p>
            <p className="stat-num text-xl font-bold text-good mt-1">{attempt.correctCount}</p>
          </div>
          <div className="rounded-xl border border-bad/30 bg-bad/10 p-3.5">
            <p className="text-xs text-bad font-semibold">Incorrect / Skipped</p>
            <p className="stat-num text-xl font-bold text-bad mt-1">{incorrectCount}</p>
          </div>
          <div className="rounded-xl border border-line/60 bg-bg p-3.5">
            <p className="text-xs text-muted">Total Duration</p>
            <p className="stat-num text-xl font-bold text-fg mt-1">
              {formatDuration(attempt.timeTakenSeconds)}
            </p>
          </div>
        </div>
      </div>

      {/* Question-by-Question Detailed Review */}
      <section className="mt-10 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h3 className="text-base font-bold text-fg">Detailed Question Review & Explanations</h3>
          <p className="text-xs text-muted">Review each question with full verified explanation</p>
        </div>

        <div className="space-y-4">
          {answers.map((item, index) => {
            const hasAnswered = Boolean(item.selectedAnswer);
            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-2xl border p-5 sm:p-6 transition space-y-4",
                  item.isCorrect
                    ? "border-good/40 bg-card"
                    : hasAnswered
                      ? "border-bad/40 bg-card"
                      : "border-line bg-card",
                )}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-fg">Question {index + 1}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-semibold text-[11px]",
                        item.isCorrect
                          ? "bg-good/15 text-good"
                          : hasAnswered
                            ? "bg-bad/15 text-bad"
                            : "bg-line/60 text-muted",
                      )}
                    >
                      {item.isCorrect ? "✓ Correct" : hasAnswered ? "✗ Incorrect" : "○ Not Answered"}
                    </span>
                  </div>
                  <span className="text-muted font-mono text-[11px]">
                    Time: {formatDuration(item.timeSpentSeconds || 0)}
                  </span>
                </div>

                {/* Complete Question Stem — Hindi & Multilingual with zero truncation */}
                <p className="text-base sm:text-lg font-medium leading-relaxed tracking-normal break-words whitespace-pre-wrap text-fg">
                  {item.prompt}
                </p>

                {/* 4 Choices */}
                <div className="space-y-2 pt-1">
                  {LETTERS.map((letter) => {
                    const text = item[optionKey(letter)];
                    const isCorrect = item.correctAnswer === letter;
                    const isSelected = item.selectedAnswer === letter;

                    return (
                      <div
                        key={letter}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3.5 text-sm transition-all",
                          isCorrect
                            ? "border-good bg-good/15 text-fg font-medium"
                            : isSelected
                              ? "border-bad bg-bad/15 text-fg"
                              : "border-line/60 bg-bg text-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold font-mono",
                            isCorrect
                              ? "bg-good text-white"
                              : isSelected
                                ? "bg-bad text-white"
                                : "border border-line bg-card text-muted",
                          )}
                        >
                          {letter}
                        </span>
                        <div className="flex-1 leading-relaxed break-words whitespace-pre-wrap pt-0.5">
                          {text}
                        </div>
                        {isCorrect && (
                          <span className="shrink-0 rounded bg-good/20 px-2 py-0.5 text-[11px] font-semibold text-good">
                            ✓ Correct Answer
                          </span>
                        )}
                        {!isCorrect && isSelected && (
                          <span className="shrink-0 rounded bg-bad/20 px-2 py-0.5 text-[11px] font-semibold text-bad">
                            ✗ Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Verified Explanation */}
                {item.explanation && (
                  <div className="rounded-xl border border-line/60 bg-bg p-3.5 text-xs text-muted leading-relaxed">
                    <strong className="text-fg block mb-1">Factual Verification & Explanation:</strong>
                    <div className="break-words whitespace-pre-wrap">{item.explanation}</div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
