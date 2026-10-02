import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: number[] };
    if (!body.ids?.length) {
      return NextResponse.json({ error: "Provide the question id sequence" }, { status: 400 });
    }
    await Promise.all(
      body.ids.map((id, index) =>
        db.update(questions).set({ sortOrder: index + 1, updatedAt: new Date() }).where(eq(questions.id, id)),
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
