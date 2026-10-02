import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

const DDL = `
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#c4a15a',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  source_file TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pdf_imports (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 0,
  char_count INTEGER NOT NULL DEFAULT 0,
  questions_created INTEGER NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'regex',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  candidate_name TEXT NOT NULL DEFAULT 'Candidate',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL DEFAULT 'Mixed bank',
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  timer_mode TEXT NOT NULL DEFAULT 'none',
  timer_limit_seconds INTEGER NOT NULL DEFAULT 0,
  per_question_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER,
  prompt TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  selected_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  sort_index INTEGER NOT NULL DEFAULT 0
);
`;

export type AppDatabase = ReturnType<typeof drizzleNodePg<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __quizPool?: Pool;
  __quizPglite?: PGlite;
  __quizDb?: AppDatabase;
  __quizInitPromise?: Promise<void>;
};

const databaseUrl = process.env.DATABASE_URL;

let pgliteClient: PGlite | undefined;
let pgPool: Pool | undefined;
let dbInstance: AppDatabase;

const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.argv.includes("build");

if (databaseUrl) {
  const needsSsl =
    databaseUrl.includes("supabase.co") ||
    databaseUrl.includes("neon.tech") ||
    databaseUrl.includes("pooler.supabase.com") ||
    databaseUrl.includes("sslmode=");
  pgPool =
    globalForDb.__quizPool ??
    new Pool({
      connectionString: databaseUrl,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__quizPool = pgPool;
  }
  dbInstance = globalForDb.__quizDb ?? drizzleNodePg(pgPool, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__quizDb = dbInstance;
  }
} else {
  if (!globalForDb.__quizPglite) {
    if (isBuildPhase) {
      globalForDb.__quizPglite = new PGlite();
    } else {
      try {
        const isVercel = Boolean(process.env.VERCEL);
        const dbDir = isVercel
          ? path.resolve("/tmp", "quiz-db")
          : path.resolve(process.cwd(), ".data/quiz-db");
        fs.mkdirSync(dbDir, { recursive: true });
        globalForDb.__quizPglite = new PGlite(dbDir);
      } catch {
        globalForDb.__quizPglite = new PGlite();
      }
    }
  }
  pgliteClient = globalForDb.__quizPglite;

  dbInstance =
    globalForDb.__quizDb ??
    (drizzlePglite(pgliteClient, { schema }) as unknown as AppDatabase);
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__quizDb = dbInstance;
  }
}

export const pool = pgPool;
export const pglite = pgliteClient;
export const db: AppDatabase = dbInstance;

export async function ensureTablesCreated(): Promise<void> {
  if (isBuildPhase) return;

  if (globalForDb.__quizInitPromise) {
    return globalForDb.__quizInitPromise;
  }

  const runInit = async () => {
    try {
      if (pgliteClient) {
        await pgliteClient.exec(DDL);
        await pgliteClient.exec(
          "ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS candidate_name TEXT NOT NULL DEFAULT 'Candidate';",
        );
      } else if (pgPool) {
        await pgPool.query(DDL);
        await pgPool.query(
          "ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS candidate_name TEXT NOT NULL DEFAULT 'Candidate';",
        );
      }
    } catch (err) {
      console.error("Failed to ensure tables are created:", err);
      globalForDb.__quizInitPromise = undefined;
      throw err;
    }
  };

  globalForDb.__quizInitPromise = runInit();
  return globalForDb.__quizInitPromise;
}
