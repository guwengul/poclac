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

// Returns tribe IDs where person is HR Partner
export async function getHRPartnerTribeIds(personId: string): Promise<string[]> {
  const rows = await prisma.tribeHRPartner.findMany({
    where: { personId },
    select: { tribeId: true },
  });
  return rows.map(r => r.tribeId);
}

// Admin OR HR Partner of at least one tribe
export async function requireAdminOrHRPartner() {
  const person = await getCurrentUser();
  if (!person) throw new Error("Unauthorized");
  if (person.isAdmin) return { person, isAdmin: true, hrTribeIds: [] as string[] };

  const hrTribeIds = await getHRPartnerTribeIds(person.id);
  if (hrTribeIds.length === 0) throw new Error("Unauthorized");

  return { person, isAdmin: false, hrTribeIds };
}
