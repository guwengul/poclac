import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.person.findUnique({
    where: { email: user.email! },
  });
}

export async function requireAdmin() {
  const person = await getCurrentUser();
  if (!person || !person.isAdmin) {
    throw new Error("Unauthorized");
  }
  return person;
}
