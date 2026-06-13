import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// POST /api/admin/people — add a person without Supabase Auth (evaluatee-only)
export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, email, chapter } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const existing = await prisma.person.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A person with this email already exists." }, { status: 409 });
  }

  const person = await prisma.person.create({
    data: { email, name, chapter: chapter || null, isAdmin: false },
  });

  return NextResponse.json({ person }, { status: 201 });
}
