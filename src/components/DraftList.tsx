"use client";

import { emptyDraft, LETTERS, optionKey, type DraftQuestion, type Letter } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GhostButton, fieldClass } from "./AppShell";

export function DraftList({
  drafts,
  onChange,
}: {
  drafts: DraftQuestion[];
  onChange: (next: DraftQuestion[]) => void;
}) {
  const update = (index: number, patch: Partial<DraftQuestion>) => {
    onChange(drafts.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3">
      {drafts.map((draft, index) => (
        <article key={index} className="rounded-xl border border-line bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Question {index + 1}</p>
            <button
              type="button"
              onClick={() => onChange(drafts.filter((_, i) => i !== index))}
              className="text-xs text-muted hover:text-bad"
            >
              Remove
            </button>
          </div>
          <textarea
            className={cn(fieldClass, "min-h-[72px]")}
            value={draft.prompt}
            onChange={(event) => update(index, { prompt: event.target.value })}
            placeholder="Question"
          />
          <div className="mt-2 grid gap-2">
            {LETTERS.map((letter) => (
              <div key={letter} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update(index, { correctAnswer: letter as Letter })}
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-semibold",
                    draft.correctAnswer === letter ? "bg-good text-white" : "bg-bg text-muted",
                  )}
                  title="Mark as correct"
                >
                  {letter}
                </button>
                <input
                  className={fieldClass}
                  value={draft[optionKey(letter)]}
                  onChange={(event) => update(index, { [optionKey(letter)]: event.target.value })}
                  placeholder={`Option ${letter}`}
                />
              </div>
            ))}
          </div>
          <input
            className={cn(fieldClass, "mt-2")}
            value={draft.explanation ?? ""}
            onChange={(event) => update(index, { explanation: event.target.value })}
            placeholder="Explanation (shown after the quiz)"
          />
        </article>
      ))}
      <GhostButton type="button" onClick={() => onChange([...drafts, emptyDraft()])}>
        Add question
      </GhostButton>
    </div>
  );
}
