import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, email, hasLogin, password, isAdmin } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (hasLogin && (!password || password.length < 8)) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.person.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A person with this email already exists." }, { status: 409 });
  }

  if (hasLogin) {
    const supabaseAdmin = createAdminClient();
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
  }

  const person = await prisma.person.create({
    data: {
      email,
      name,
      hasLogin: hasLogin ?? false,
      isAdmin: hasLogin ? (isAdmin ?? false) : false,
    },
  });

  return NextResponse.json({ person }, { status: 201 });
}

export async function GET() {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    select: { id: true, email: true, name: true, isActive: true, isAdmin: true, hasLogin: true, functionalAreaId: true },
  });

  return NextResponse.json({ people });
}
