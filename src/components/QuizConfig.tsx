"use client";

import { Field, fieldClass } from "./AppShell";

export type QuizConfigValue = {
  count: string;
  globalMinutes: number;
  perQuestionSeconds: number;
  language?: "auto" | "hi" | "en";
  orderMode?: "start" | "end" | "random";
};

export function QuizConfig({
  value,
  onChange,
  available,
  showQuestionCount = true,
  showLanguage = true,
  showOrderMode = true,
}: {
  value: QuizConfigValue;
  onChange: (next: QuizConfigValue) => void;
  available?: number;
  showQuestionCount?: boolean;
  showLanguage?: boolean;
  showOrderMode?: boolean;
}) {
  const countOptions = ["3", "5", "8", "10", "15", "20", "25", "30", "50", "all"];
  const isPresetCount = countOptions.includes(value.count);

  let cols = 2;
  if (showQuestionCount) cols += 1;
  if (showLanguage) cols += 1;
  if (showOrderMode) cols += 1;

  const gridClass =
    cols >= 5
      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : cols === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : cols === 3
          ? "sm:grid-cols-3"
          : "sm:grid-cols-2";

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {showQuestionCount && (
        <Field label="Number of questions">
          <select
            className={fieldClass}
            value={isPresetCount ? value.count : "custom"}
            onChange={(event) => {
              if (event.target.value === "custom") {
                onChange({ ...value, count: "10" });
              } else {
                onChange({ ...value, count: event.target.value });
              }
            }}
          >
            {countOptions.map((item) => (
              <option key={item} value={item}>
                {item === "all"
                  ? available !== undefined
                    ? `All (${available})`
                    : "All available"
                  : `${item} questions`}
              </option>
            ))}
            {!isPresetCount && <option value="custom">Custom ({value.count})</option>}
          </select>
        </Field>
      )}

      {showLanguage && (
        <Field label="Language / भाषा">
          <select
            className={fieldClass}
            value={value.language ?? "auto"}
            onChange={(event) =>
              onChange({
                ...value,
                language: event.target.value as "auto" | "hi" | "en",
              })
            }
          >
            <option value="auto">Auto-detect (मूल भाषा)</option>
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="en">English</option>
          </select>
        </Field>
      )}

      {showOrderMode && (
        <Field label="Question Range / क्रम">
          <select
            className={fieldClass}
            value={value.orderMode ?? "start"}
            onChange={(event) =>
              onChange({
                ...value,
                orderMode: event.target.value as "start" | "end" | "random",
              })
            }
          >
            <option value="start">From Beginning (शुरू से — Q1 onward)</option>
            <option value="end">From End (अंत से — Last questions)</option>
            <option value="random">Random / Shuffle (रैंडम / शफ़ल)</option>
          </select>
        </Field>
      )}

      <Field label="Overall quiz timer">
        <select
          className={fieldClass}
          value={value.globalMinutes}
          onChange={(event) => onChange({ ...value, globalMinutes: Number(event.target.value) })}
        >
          <option value={0}>Off (no limit)</option>
          <option value={3}>3 minutes</option>
          <option value={5}>5 minutes</option>
          <option value={10}>10 minutes</option>
          <option value={15}>15 minutes</option>
          <option value={20}>20 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes (1 hour)</option>
        </select>
      </Field>

      <Field label="Timer per question">
        <select
          className={fieldClass}
          value={value.perQuestionSeconds}
          onChange={(event) => onChange({ ...value, perQuestionSeconds: Number(event.target.value) })}
        >
          <option value={0}>Off (no limit)</option>
          <option value={15}>15 seconds</option>
          <option value={30}>30 seconds</option>
          <option value={45}>45 seconds</option>
          <option value={60}>60 seconds (1 min)</option>
          <option value={90}>90 seconds</option>
          <option value={120}>120 seconds (2 min)</option>
        </select>
      </Field>
    </div>
  );
}
