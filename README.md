# QuizConverter — AI & PDF Quiz Platform

An advanced desktop & web quiz application that converts PDF study materials, handouts, and question banks into professional interactive exams. Built with Next.js, React 19, TypeScript, Tailwind CSS, and embedded PostgreSQL (PGlite).

## Features

- **PDF Question Bank Extraction:**
  - Automatically identifies whether an uploaded PDF contains existing MCQs or general study notes.
  - Extracts questions, multi-choice options (A/B/C/D or क/ख/ग/घ or 1/2/3/4), correct answers, and detailed explanations.
  - Flexible Question Range: Select questions **From Beginning (शुरू से)**, **From End (अंत से)**, or **Random (रैंडम)**.
  - Supports large PDFs up to 100MB.

- **Devanagari & Hindi Font Healing Engine:**
  - Robust Devanagari Unicode repair that automatically eliminates Kruti Dev / Remington font conversion artifacts.
  - Fixes doubled consonants, clipped vowel marks, broken halants, glued words, and leaked headers.
  - Native Devanagari font stack (`Noto Sans Devanagari`, `Nirmala UI`, `Mangal`) ensures sharp, complete character visibility with zero clipping.

- **AI Question Generation (UPSC / BPSC / State PSC Civil Services Standard):**
  - Generates analytical multi-statement evaluation questions ("कथन 1 एवं कथन 2... केवल 1 / केवल 2 / 1 और 2 दोनों / न तो 1 और न ही 2").
  - Tricky conceptual questions with balanced distractors across A, B, C, and D.
  - Pre-exam verification and automated fact-checking against source text.

- **Exam Execution & Candidate Management:**
  - Candidate Name verification before starting any quiz.
  - Real-time examination toolbar with question status palette (Answered, Not Answered, Marked for Review).
  - Configurable timers: overall exam countdown timer or per-question time limit.
  - Instant auto-submit on time expiry.
  - Final results, score breakdowns, question-by-question review, and attempt history.

- **Zero-Config Database:**
  - Embedded local PostgreSQL via `@electric-sql/pglite` (requires zero setup or external services).
  - Optional connection to external PostgreSQL or Supabase via standard `DATABASE_URL`.

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment (Optional)
Copy `.env.example` to `.env.local` if you wish to configure an external AI provider (Gemini / OpenAI) or Supabase/PostgreSQL:
```bash
cp .env.example .env.local
```

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack
- **Framework:** Next.js 16 (App Router), React 19
- **Languages:** TypeScript, Vanilla CSS + Tailwind CSS
- **Database:** PGlite (Embedded Postgres) / Drizzle ORM
- **PDF Extraction:** `unpdf`
