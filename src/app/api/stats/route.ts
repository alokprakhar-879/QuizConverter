import { NextResponse } from "next/server";
import { getStudioStats, listCategories } from "@/lib/questions";
import { seedIfEmpty } from "@/lib/seed";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await seedIfEmpty();
    const stats = await getStudioStats();
    const cats = await listCategories();
    const recent = await db
      .select()
      .from(quizAttempts)
      .orderBy(desc(quizAttempts.completedAt))
      .limit(6);
    return NextResponse.json({ stats, categories: cats, recent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load studio stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
