import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ personId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { personId } = await params;
  const { name, email } = await req.json();
  if (!name || !email) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // If email changed and person has login, update Supabase Auth too
  if (person.hasLogin && email !== person.email) {
    const supabaseAdmin = createAdminClient();
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users.find(u => u.email === person.email);
    if (authUser) {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, { email });
    }
  }

  const updated = await prisma.person.update({ where: { id: personId }, data: { name, email } });
  return NextResponse.json({ person: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { personId } = await params;

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (person.isAdmin) return NextResponse.json({ error: "Cannot delete admin users." }, { status: 400 });

  // Delete from Supabase Auth if they have login
  if (person.hasLogin) {
    const supabaseAdmin = createAdminClient();
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users.find(u => u.email === person.email);
    if (authUser) await supabaseAdmin.auth.admin.deleteUser(authUser.id);
  }

  await prisma.person.delete({ where: { id: personId } });
  return NextResponse.json({ ok: true });
}
