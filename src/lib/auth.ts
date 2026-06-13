import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// cache() deduplicates within a single request — layout + page both call this,
// but only one DB round-trip happens.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.person.findUnique({
    where: { email: user.email! },
    include: { tribeHRPartners: { select: { tribeId: true } } },
  });
});

export async function requireAdmin() {
  const person = await getCurrentUser();
  if (!person || !person.isAdmin) throw new Error("Unauthorized");
  return person;
}

export async function getHRPartnerTribeIds(personId: string): Promise<string[]> {
  const rows = await prisma.tribeHRPartner.findMany({
    where: { personId },
    select: { tribeId: true },
  });
  return rows.map(r => r.tribeId);
}

export async function requireAdminOrHRPartner() {
  const person = await getCurrentUser();
  if (!person) throw new Error("Unauthorized");
  if (person.isAdmin) return { person, isAdmin: true, hrTribeIds: [] as string[] };

  const hrTribeIds = (person.tribeHRPartners ?? []).map(r => r.tribeId);
  if (hrTribeIds.length === 0) throw new Error("Unauthorized");

  return { person, isAdmin: false, hrTribeIds };
}
