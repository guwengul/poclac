import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ personId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { personId } = await params;
  const { password } = await req.json();

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (person.hasLogin) return NextResponse.json({ error: "This person already has login access." }, { status: 409 });

  const supabaseAdmin = createAdminClient();

  // Check if auth user already exists
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const alreadyExists = existing?.users?.some(u => u.email === person.email);

  if (alreadyExists) {
    // Update password only
    const user = existing.users.find(u => u.email === person.email)!;
    await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  } else {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await prisma.person.update({ where: { id: personId }, data: { hasLogin: true } });

  return NextResponse.json({ ok: true });
}
