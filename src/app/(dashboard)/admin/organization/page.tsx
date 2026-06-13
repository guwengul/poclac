import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OrgManager } from "./org-manager";

export default async function OrganizationPage() {
  let hrTribeIds: string[] = [];
  let isAdmin = false;

  try {
    const result = await requireAdminOrHRPartner();
    isAdmin = result.isAdmin;
    hrTribeIds = result.hrTribeIds;
  } catch {
    redirect("/dashboard");
  }

  const tribeFilter = isAdmin ? {} : { id: { in: hrTribeIds } };

  const [tribes, people] = await Promise.all([
    prisma.tribe.findMany({
      where: tribeFilter,
      include: {
        tribeLead:     { select: { id: true, name: true } },
        tribeTechLead: { select: { id: true, name: true } },
        hrPartners:    { include: { person: { select: { id: true, name: true } } } },
        squads: {
          include: {
            productOwner: { select: { id: true, name: true } },
            agileCoach:   { select: { id: true, name: true } },
            members:      { select: { id: true, name: true } },
          },
        },
        functionalAreas: {
          include: {
            chapterLead: { select: { id: true, name: true } },
            members:     { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.person.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, functionalAreaId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Organization</h1>
      <p className="text-sm text-gray-500 mb-8">
        {isAdmin ? "Manage tribes, functional areas, and squads." : "Manage your tribe's functional areas and squads."}
      </p>
      <OrgManager tribes={tribes as any} people={people} isAdmin={isAdmin} />
    </div>
  );
}
