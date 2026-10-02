import { NextResponse } from "next/server";
import { ensureCategory, listCategories } from "@/lib/questions";
import { seedIfEmpty } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await seedIfEmpty();
    const rows = await listCategories();
    return NextResponse.json({ categories: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; description?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }
    const category = await ensureCategory(body.name, body.description ?? "");
    return NextResponse.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
