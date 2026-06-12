import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const { email, name, password, chapter, isAdmin } = await req.json();

  if (!email || !name || !password) {
    return NextResponse.json({ error: "E-posta, ad ve şifre zorunludur." }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // Create auth user in Supabase
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create Person record in DB
  const person = await prisma.person.create({
    data: { email, name, chapter: chapter ?? null, isAdmin: isAdmin ?? false },
  });

  return NextResponse.json({ person }, { status: 201 });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  }

  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    select: { id: true, email: true, name: true, chapter: true, isActive: true, isAdmin: true },
  });

  return NextResponse.json({ people });
}
