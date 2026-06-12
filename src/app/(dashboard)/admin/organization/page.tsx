import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OrgManager } from "./org-manager";

export default async function OrganizationPage() {
  try { await requireAdmin(); } catch { redirect("/dashboard"); }

  const [tribes, people] = await Promise.all([
    prisma.tribe.findMany({
      include: {
        tribeLead: { select: { id: true, name: true } },
        squads: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.person.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Organization</h1>
      <p className="text-sm text-gray-500 mb-8">Manage tribes and squads.</p>
      <OrgManager tribes={tribes} people={people} />
    </div>
  );
}
