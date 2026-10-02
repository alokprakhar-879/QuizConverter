import { NextResponse } from "next/server";
import { db, ensureTablesCreated } from "@/db";
import { quizAttempts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getStudioStats } from "@/lib/questions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureTablesCreated();
    const attempts = await db.select().from(quizAttempts).orderBy(desc(quizAttempts.completedAt));
    const stats = await getStudioStats();
    return NextResponse.json({ attempts, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
