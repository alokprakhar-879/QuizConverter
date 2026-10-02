"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, Field, GhostButton, PrimaryButton, fieldClass } from "@/components/AppShell";
import { LETTERS, emptyDraft, optionKey, type DraftQuestion, type Letter } from "@/lib/types";
import { cn, fetchJson } from "@/lib/utils";

type QuestionRow = {
  id: number;
  categoryId: number;
  categoryName: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  source: string;
};

type CategoryRow = { id: number; name: string; questionCount: number };

export default function BankPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState<DraftQuestion>(emptyDraft());
  const [newCategory, setNewCategory] = useState("General");
  const [importCategory, setImportCategory] = useState("Imported set");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (query) params.set("q", query);
    const [qData, cData] = await Promise.all([
      fetchJson<{ questions: QuestionRow[] }>(`/api/questions?${params.toString()}`),
      fetchJson<{ categories: CategoryRow[] }>("/api/categories"),
    ]);
    setQuestions(qData.questions);
    setCategories(cData.categories);
  }, [categoryId, query]);

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [load]);

  async function saveNew() {
    setBusy(true);
    setError("");
    try {
      await fetchJson("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creating, categoryName: newCategory, source: "manual" }),
      });
      setCreating(emptyDraft());
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await fetchJson("/api/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this question?")) return;
    await fetchJson(`/api/questions/${id}`, { method: "DELETE" });
    await load();
  }

  async function move(id: number, direction: -1 | 1) {
    const index = questions.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= questions.length) return;
    if (questions[index].categoryId !== questions[target].categoryId) return;
    const ids = questions.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await fetchJson("/api/questions/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    await load();
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("categoryName", importCategory);
    setBusy(true);
    setError("");
    try {
      await fetchJson("/api/import/file", { method: "POST", body: form });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Question bank" lede="Search, edit, reorder. Keep this list small and accurate.">
      {error && <p className="mb-4 text-sm text-bad">{error}</p>}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input
          className={fieldClass}
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">All sets</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({cat.questionCount})
            </option>
          ))}
        </select>
        <GhostButton type="button" onClick={() => setShowAdd((value) => !value)}>
          {showAdd ? "Cancel" : "Add question"}
        </GhostButton>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
        <input
          className={cn(fieldClass, "max-w-[180px]")}
          value={importCategory}
          onChange={(event) => setImportCategory(event.target.value)}
          placeholder="Import set name"
        />
        <label className="cursor-pointer rounded-lg border border-line bg-card px-3 py-2 text-fg">
          Import CSV / JSON
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </label>
        <a className="underline" href="/samples/questions.csv">
          csv
        </a>
        <a className="underline" href="/samples/questions.json">
          json
        </a>
      </div>

      {showAdd && (
        <section className="mb-6 rounded-xl border border-line bg-card p-4">
          <Field label="Set name">
            <input className={fieldClass} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
          </Field>
          <textarea
            className={cn(fieldClass, "mt-3 min-h-[72px]")}
            placeholder="Question"
            value={creating.prompt}
            onChange={(event) => setCreating({ ...creating, prompt: event.target.value })}
          />
          <div className="mt-2 grid gap-2">
            {LETTERS.map((letter) => (
              <div key={letter} className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-md text-xs font-semibold",
                    creating.correctAnswer === letter ? "bg-good text-white" : "bg-bg",
                  )}
                  onClick={() => setCreating({ ...creating, correctAnswer: letter })}
                >
                  {letter}
                </button>
                <input
                  className={fieldClass}
                  placeholder={`Option ${letter}`}
                  value={creating[optionKey(letter)]}
                  onChange={(event) => setCreating({ ...creating, [optionKey(letter)]: event.target.value })}
                />
              </div>
            ))}
          </div>
          <PrimaryButton className="mt-3" disabled={busy} onClick={() => void saveNew()}>
            Save
          </PrimaryButton>
        </section>
      )}

      <div className="divide-y divide-line rounded-xl border border-line bg-card">
        {questions.map((row, index) => (
          <article key={row.id} className="px-4 py-3">
            <p className="text-xs text-muted">
              {row.categoryName} · {row.source}
            </p>
            <p className="mt-1 text-sm">{row.prompt}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="text-xs text-muted hover:text-fg" onClick={() => void move(row.id, -1)}>
                Up
              </button>
              <button type="button" className="text-xs text-muted hover:text-fg" onClick={() => void move(row.id, 1)}>
                Down
              </button>
              <button type="button" className="text-xs text-muted hover:text-fg" onClick={() => setEditing(row)}>
                Edit
              </button>
              <button type="button" className="text-xs text-muted hover:text-bad" onClick={() => void remove(row.id)}>
                Delete
              </button>
              <span className="text-xs text-muted">{index + 1}</span>
            </div>
          </article>
        ))}
        {!questions.length && <p className="px-4 py-8 text-center text-sm text-muted">Nothing matches.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-5">
            <h3 className="text-base font-semibold">Edit</h3>
            <div className="mt-3 space-y-3">
              <select
                className={fieldClass}
                value={editing.categoryId}
                onChange={(event) => setEditing({ ...editing, categoryId: Number(event.target.value) })}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <textarea
                className={cn(fieldClass, "min-h-[80px]")}
                value={editing.prompt}
                onChange={(event) => setEditing({ ...editing, prompt: event.target.value })}
              />
              {LETTERS.map((letter) => (
                <div key={letter} className="flex gap-2">
                  <button
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-md text-xs font-semibold",
                      editing.correctAnswer === letter ? "bg-good text-white" : "bg-bg",
                    )}
                    onClick={() => setEditing({ ...editing, correctAnswer: letter as Letter })}
                  >
                    {letter}
                  </button>
                  <input
                    className={fieldClass}
                    value={editing[optionKey(letter)]}
                    onChange={(event) => setEditing({ ...editing, [optionKey(letter)]: event.target.value })}
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <PrimaryButton disabled={busy} onClick={() => void saveEdit()}>
                  Save
                </PrimaryButton>
                <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
