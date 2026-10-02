"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, GhostButton, PrimaryButton, fieldClass } from "@/components/AppShell";
import {
  CANDIDATE_NAME_KEY,
  LETTERS,
  QUIZ_SESSION_KEY,
  type Letter,
  type QuizSession,
} from "@/lib/types";
import { cn, fetchJson, formatDuration } from "@/lib/utils";

export default function QuizRunPage() {
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [started, setStarted] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [nameError, setNameError] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [globalLeft, setGlobalLeft] = useState(0);
  const [questionLeft, setQuestionLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submitted = useRef(false);
  const indexRef = useRef(0);
  const answersRef = useRef(answers);
  const sessionRef = useRef(session);
  const candidateNameRef = useRef(candidateName);
  const elapsedRef = useRef(0);
  const timesRef = useRef<Record<number, number>>({});
  const qStartRef = useRef(Date.now());

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    candidateNameRef.current = candidateName;
  }, [candidateName]);
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  const flushTime = useCallback((questionId: number) => {
    const spent = Math.max(0, Math.round((Date.now() - qStartRef.current) / 1000));
    timesRef.current[questionId] = (timesRef.current[questionId] ?? 0) + spent;
    qStartRef.current = Date.now();
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const current = sessionRef.current;
      if (!current) return;
      const currentQ = current.questions[indexRef.current];
      if (currentQ) flushTime(currentQ.id);
      setIndex(next);
      if (current.perQuestionSeconds > 0) setQuestionLeft(current.perQuestionSeconds);
    },
    [flushTime],
  );

  const submit = useCallback(
    async (force = false) => {
      const current = sessionRef.current;
      if (!current || submitted.current) return;

      const currentQ = current.questions[indexRef.current];
      if (currentQ) flushTime(currentQ.id);

      submitted.current = true;
      setSubmitting(true);
      setError("");

      const effectiveName =
        candidateNameRef.current.trim() || current.candidateName?.trim() || "Candidate";

      try {
        const data = await fetchJson<{ attemptId: number }>("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateName: effectiveName,
            categoryId: current.categoryId,
            categoryName: current.categoryName,
            timerMode: current.timerMode,
            timerLimitSeconds: current.timerLimitSeconds,
            perQuestionSeconds: current.perQuestionSeconds,
            timeTakenSeconds: elapsedRef.current,
            answers: current.questions.map((item) => ({
              questionId: item.id,
              selectedAnswer: answersRef.current[item.id] ?? null,
              timeSpentSeconds: timesRef.current[item.id] ?? 0,
            })),
          }),
        });
        sessionStorage.removeItem(QUIZ_SESSION_KEY);
        router.replace(`/history/${data.attemptId}`);
      } catch (err) {
        submitted.current = false;
        setSubmitting(false);
        setShowConfirmModal(false);
        setError(err instanceof Error ? err.message : "Submit failed");
      }
    },
    [flushTime, router],
  );

  // Initialize session
  useEffect(() => {
    const raw = sessionStorage.getItem(QUIZ_SESSION_KEY);
    if (!raw) {
      router.replace("/quiz");
      return;
    }
    const parsed = JSON.parse(raw) as QuizSession;
    parsed.perQuestionSeconds = parsed.perQuestionSeconds ?? 0;
    parsed.timerLimitSeconds = parsed.timerLimitSeconds ?? 0;
    setSession(parsed);

    // Check candidate name
    const storedName = localStorage.getItem(CANDIDATE_NAME_KEY) ?? "";
    const name = parsed.candidateName?.trim() || storedName.trim();
    if (name) {
      setCandidateName(name);
    }
  }, [router]);

  const handleStartExam = () => {
    const trimmed = candidateName.trim();
    if (!trimmed) {
      setNameError("Please enter your name before starting the exam.");
      return;
    }
    setNameError("");
    try {
      localStorage.setItem(CANDIDATE_NAME_KEY, trimmed);
    } catch {}

    if (session) {
      const updated = { ...session, candidateName: trimmed };
      setSession(updated);
      setGlobalLeft(updated.timerLimitSeconds || 0);
      setQuestionLeft(updated.perQuestionSeconds || 0);
      sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(updated));
    }
    qStartRef.current = Date.now();
    setStarted(true);
  };

  // Warn on leave
  useEffect(() => {
    if (!session || !started) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!submitted.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [session, started]);

  // Timers
  useEffect(() => {
    if (!session || !started) return;
    const tick = window.setInterval(() => {
      setElapsed((value) => value + 1);
      if (session.timerLimitSeconds > 0) {
        setGlobalLeft((value) => {
          if (value <= 1) {
            if (value === 1) void submit(true);
            return 0;
          }
          return value - 1;
        });
      }
      if (session.perQuestionSeconds > 0) {
        setQuestionLeft((value) => {
          if (value <= 1) {
            const nextIndex = indexRef.current + 1;
            if (nextIndex < session.questions.length) {
              goTo(nextIndex);
              return session.perQuestionSeconds;
            }
            void submit(true);
            return 0;
          }
          return value - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [goTo, session, started, submit]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!sessionRef.current || submitted.current || !started) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const letter = event.key.toUpperCase();
      const current = sessionRef.current.questions[indexRef.current];
      if (LETTERS.includes(letter as Letter) && current) {
        setAnswers((prev) => ({ ...prev, [current.id]: letter as Letter }));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (indexRef.current < sessionRef.current.questions.length - 1) goTo(indexRef.current + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (indexRef.current > 0) goTo(indexRef.current - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, started]);

  const toggleMarkForReview = (questionId: number) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const clearAnswer = (questionId: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const total = session?.questions.length ?? 0;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const markedCount = markedForReview.size;
  const unansweredCount = total - answeredCount;

  const urgent =
    (session?.timerLimitSeconds ?? 0) > 0
      ? globalLeft <= 60
      : (session?.perQuestionSeconds ?? 0) > 0 && questionLeft <= 10;

  if (!session) {
    return (
      <AppShell title="Loading Examination…">
        <p className="text-sm text-muted">Preparing examination session.</p>
      </AppShell>
    );
  }

  // Pre-Quiz Candidate Registration & Instructions Screen
  if (!started) {
    return (
      <AppShell
        title="Candidate Registration & Instructions"
        lede={`${session.categoryName} · ${total} Questions · Professional Examination Environment`}
      >
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-5">
            <div className="border-b border-line pb-4">
              <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent uppercase tracking-wider">
                Exam Entry Verification
              </span>
              <h2 className="mt-2 text-xl font-bold text-fg">Enter Your Details to Begin</h2>
              <p className="mt-1 text-xs text-muted">
                Your full name will be recorded on your examination sheet and permanent history record.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg mb-1.5">
                Candidate Full Name / परीक्षार्थी का नाम <span className="text-bad">*</span>
              </label>
              <input
                type="text"
                autoFocus
                className={`${fieldClass} text-base py-2.5`}
                placeholder="e.g. Alok Prakhar"
                value={candidateName}
                onChange={(e) => {
                  setCandidateName(e.target.value);
                  if (nameError) setNameError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStartExam();
                }}
              />
              {nameError && <p className="mt-1.5 text-xs text-bad font-medium">{nameError}</p>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-line/60 bg-bg p-3.5 text-xs">
              <div>
                <p className="text-muted">Total Questions</p>
                <p className="text-base font-semibold text-fg mt-0.5">{total}</p>
              </div>
              <div>
                <p className="text-muted">Total Duration</p>
                <p className="text-base font-semibold text-fg mt-0.5">
                  {session.timerLimitSeconds > 0 ? formatDuration(session.timerLimitSeconds) : "Untimed"}
                </p>
              </div>
              <div>
                <p className="text-muted">Per Question Limit</p>
                <p className="text-base font-semibold text-fg mt-0.5">
                  {session.perQuestionSeconds > 0 ? `${session.perQuestionSeconds}s` : "Off"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-line/60 bg-bg p-4 space-y-2 text-xs text-muted">
              <p className="font-semibold text-fg">Examination Protocol & Instructions:</p>
              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                <li>Questions appear strictly <strong>one by one</strong> for focused testing.</li>
                <li><strong>Strictly No Hints:</strong> Answers, hints, and explanations are hidden during testing.</li>
                <li>You can mark questions for review, skip, or change your selected choice anytime.</li>
                <li>After you submit the full quiz, comprehensive results, accuracy score, and question review will be generated.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <GhostButton type="button" onClick={() => router.push("/quiz")}>
                Cancel
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={handleStartExam}
                className="px-6 py-2.5 text-sm font-semibold shadow"
              >
                Start Examination / परीक्षा शुरू करें
              </PrimaryButton>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const question = session.questions[index];
  const isMarked = markedForReview.has(question.id);
  const isAnswered = Boolean(answers[question.id]);

  return (
    <AppShell
      title={`Question ${index + 1} of ${total}`}
      lede={`${session.categoryName} · Candidate: ${candidateName || "Candidate"}`}
      actions={
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-xl border px-3.5 py-1.5 text-right transition font-mono",
              urgent
                ? "border-bad bg-bad/10 text-bad animate-pulse font-bold"
                : "border-line bg-card text-fg",
            )}
          >
            {session.timerLimitSeconds > 0 && (
              <p className="text-sm font-semibold tracking-tight">
                Exam: {formatDuration(globalLeft)}
              </p>
            )}
            {session.perQuestionSeconds > 0 && (
              <p className="text-xs text-muted font-medium">Item: {formatDuration(questionLeft)}</p>
            )}
            {session.timerLimitSeconds === 0 && session.perQuestionSeconds === 0 && (
              <p className="text-sm font-medium">{formatDuration(elapsed)}</p>
            )}
          </div>
        </div>
      }
    >
      {/* Top Examination Status Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fg">Candidate:</span>
          <span className="rounded-md bg-card border border-line px-2.5 py-1 font-medium text-fg">
            {candidateName}
          </span>
          <span
            className={cn(
              "ml-2 rounded-full px-2.5 py-0.5 font-medium",
              isAnswered ? "bg-good/15 text-good" : "bg-line/60 text-muted",
            )}
          >
            {isAnswered ? "✓ Answered" : "○ Not Answered"}
          </span>
          {isMarked && (
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-medium text-accent">
              ★ Marked for Review
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-muted">
          <span>
            Progress: <strong className="text-fg">{answeredCount}</strong>/{total} Answered
          </span>
          {markedCount > 0 && (
            <span>
              (<strong>{markedCount}</strong> review)
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-fg transition-all duration-300"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      {error && <p className="mb-4 text-sm text-bad font-medium">{error}</p>}

      {/* Main Examination Layout: Question on Left/Center, Palette on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Question & Choices Area (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-line bg-card p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Question {index + 1}
            </span>
            <span className="text-xs text-muted">Marks: 1.00</span>
          </div>

          {/* Complete Question Stem — Hindi & Multilingual with zero truncation */}
          <div className="text-lg sm:text-xl font-medium leading-relaxed tracking-normal break-words whitespace-pre-wrap text-fg">
            {question.prompt}
          </div>

          {/* 4 Choices — Professional Exam Radio Cards */}
          <div className="space-y-3 pt-2">
            {question.options.map((option) => {
              const selected = answers[question.id] === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: option.key,
                    }))
                  }
                  className={cn(
                    "w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-all",
                    selected
                      ? "border-fg bg-fg text-white shadow-sm ring-1 ring-fg"
                      : "border-line bg-card hover:border-fg/60 hover:bg-bg text-fg",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition",
                      selected
                        ? "bg-white text-fg"
                        : "border border-line bg-bg text-muted font-mono",
                    )}
                  >
                    {option.key}
                  </span>
                  <span className="text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap pt-0.5">
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Examination Action Toolbar */}
          <div className="pt-6 border-t border-line/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <GhostButton
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
                className="text-xs"
              >
                ← Previous
              </GhostButton>

              {answers[question.id] && (
                <button
                  type="button"
                  onClick={() => clearAnswer(question.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-bad hover:border-bad transition"
                >
                  Clear Response
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleMarkForReview(question.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                  isMarked
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-line text-muted hover:border-fg",
                )}
              >
                {isMarked ? "★ Marked for Review" : "☆ Mark for Review"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {index < total - 1 ? (
                <PrimaryButton type="button" onClick={() => goTo(index + 1)} className="text-xs">
                  Save & Next →
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="text-xs bg-good hover:bg-good/90"
                >
                  Submit Examination
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>

        {/* Right Palette & Submission Panel (1 col) */}
        <div className="lg:col-span-1 rounded-2xl border border-line bg-card p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Question Palette
            </h3>
            <span className="text-xs font-medium text-fg">{answeredCount}/{total}</span>
          </div>

          {/* Palette Grid */}
          <div className="grid grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto p-1">
            {session.questions.map((item, i) => {
              const answered = Boolean(answers[item.id]);
              const marked = markedForReview.has(item.id);
              const currentQ = i === index;

              let btnClass = "border-line bg-bg text-muted hover:border-fg";
              if (marked && answered) {
                btnClass = "border-accent bg-accent text-white font-bold";
              } else if (marked) {
                btnClass = "border-accent bg-accent/20 text-accent font-bold";
              } else if (answered) {
                btnClass = "border-good bg-good text-white font-bold";
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-lg border text-xs font-mono transition",
                    btnClass,
                    currentQ && "ring-2 ring-fg ring-offset-2 ring-offset-card",
                  )}
                  title={`Question ${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div className="border-t border-line pt-3 space-y-1.5 text-[11px] text-muted">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-good shrink-0" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-accent shrink-0" />
              <span>Marked for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-line bg-bg shrink-0" />
              <span>Not Answered</span>
            </div>
          </div>

          <div className="pt-2 border-t border-line">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowConfirmModal(true)}
              className="w-full rounded-xl bg-good text-white font-medium py-2.5 text-xs hover:bg-good/90 transition shadow-sm"
            >
              {submitting ? "Submitting…" : "Submit Full Quiz"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-line pb-3">
              <h3 className="text-lg font-bold text-fg">Submit Examination?</h3>
              <p className="mt-1 text-xs text-muted">
                Candidate: <strong>{candidateName}</strong> · Once submitted, you cannot change your answers.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-good/30 bg-good/10 p-3">
                <p className="text-good font-semibold">Answered</p>
                <p className="text-lg font-bold text-good mt-1">{answeredCount}</p>
              </div>
              <div className="rounded-xl border border-bad/30 bg-bad/10 p-3">
                <p className="text-bad font-semibold">Unanswered</p>
                <p className="text-lg font-bold text-bad mt-1">{unansweredCount}</p>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/10 p-3">
                <p className="text-accent font-semibold">Marked</p>
                <p className="text-lg font-bold text-accent mt-1">{markedCount}</p>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="rounded-lg bg-bad/10 p-2.5 text-xs text-bad">
                ⚠️ You have {unansweredCount} unanswered questions remaining.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <GhostButton
                disabled={submitting}
                type="button"
                onClick={() => setShowConfirmModal(false)}
              >
                Back to Test
              </GhostButton>
              <PrimaryButton
                disabled={submitting}
                type="button"
                onClick={() => void submit(true)}
                className="bg-good hover:bg-good/90"
              >
                {submitting ? "Saving Results…" : "Yes, Submit Exam"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
