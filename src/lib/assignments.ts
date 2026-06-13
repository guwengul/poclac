import { prisma } from "@/lib/prisma";
import { EvaluatorRole } from "@prisma/client";

type AssignmentRow = {
  periodId: string;
  evaluateeId: string;
  evaluatorId: string;
  role: EvaluatorRole;
  isOverride: boolean;
};

/**
 * Generates EvaluatorAssignment rows for every eligible person in the given tribe.
 * Rules:
 *   Squad member → PO=squad.PO, CL=area.CL, AC=squad.AC
 *   PO           → PO=tribe.TL,  CL=area.CL, AC=squad.AC
 *   CL           → PO=tribe.TL,  CL=tribe.TTL, AC=squad.AC (their own squad)
 * Self-evaluations and null evaluators are skipped.
 * Existing non-override assignments are left intact; missing ones are created.
 */
export async function generateTribeAssignments(periodId: string, tribeId: string) {
  const tribe = await prisma.tribe.findUnique({
    where: { id: tribeId },
    include: {
      squads: {
        include: {
          members: {
            include: {
              functionalArea: { select: { id: true, chapterLeadId: true } },
              squad: { select: { id: true, productOwnerId: true, agileCoachId: true } },
            },
          },
          productOwner: {
            include: {
              functionalArea: { select: { id: true, chapterLeadId: true } },
            },
          },
          agileCoach: true,
        },
      },
      functionalAreas: {
        include: {
          members: {
            include: {
              squad: { select: { id: true, productOwnerId: true, agileCoachId: true } },
            },
          },
        },
      },
    },
  });

  if (!tribe) throw new Error("Tribe not found");

  const rows: AssignmentRow[] = [];

  function addRow(evaluateeId: string, evaluatorId: string | null | undefined, role: EvaluatorRole) {
    if (!evaluatorId) return;
    if (evaluatorId === evaluateeId) return; // no self-eval
    rows.push({ periodId, evaluateeId, evaluatorId, role, isOverride: false });
  }

  // Track who has been processed to avoid duplicates
  const processed = new Set<string>();

  for (const squad of tribe.squads) {
    // Regular squad members
    for (const member of squad.members) {
      if (processed.has(member.id)) continue;
      processed.add(member.id);

      // Check if member is the PO of this or any squad — handled separately
      // Check if member is a CL — handled separately
      const isPO = squad.productOwnerId === member.id;
      const isCL = member.functionalArea?.chapterLeadId === member.id;

      if (isCL) {
        // CL: PO=TL, CL=TTL, AC=own squad's AC
        addRow(member.id, tribe.tribeLeadId, EvaluatorRole.PO);
        addRow(member.id, tribe.tribeTechLeadId, EvaluatorRole.CL);
        addRow(member.id, squad.agileCoachId, EvaluatorRole.AC);
      } else if (isPO) {
        // PO: PO=TL, CL=area.CL, AC=squad.AC
        addRow(member.id, tribe.tribeLeadId, EvaluatorRole.PO);
        addRow(member.id, member.functionalArea?.chapterLeadId, EvaluatorRole.CL);
        addRow(member.id, squad.agileCoachId, EvaluatorRole.AC);
      } else {
        // Regular member: PO=squad.PO, CL=area.CL, AC=squad.AC
        addRow(member.id, squad.productOwnerId, EvaluatorRole.PO);
        addRow(member.id, member.functionalArea?.chapterLeadId, EvaluatorRole.CL);
        addRow(member.id, squad.agileCoachId, EvaluatorRole.AC);
      }
    }
  }

  // Deduplicate by (evaluateeId, role) — keep first occurrence
  const seen = new Map<string, AssignmentRow>();
  for (const r of rows) {
    const key = `${r.evaluateeId}:${r.role}`;
    if (!seen.has(key)) seen.set(key, r);
  }

  const deduped = Array.from(seen.values());

  // Get existing non-override assignments for this period+tribe's people
  const evaluateeIds = [...new Set(deduped.map(r => r.evaluateeId))];
  const existing = await prisma.evaluatorAssignment.findMany({
    where: { periodId, evaluateeId: { in: evaluateeIds }, isOverride: false },
    select: { evaluateeId: true, role: true },
  });
  const existingKeys = new Set(existing.map(e => `${e.evaluateeId}:${e.role}`));

  const toCreate = deduped.filter(r => !existingKeys.has(`${r.evaluateeId}:${r.role}`));

  if (toCreate.length > 0) {
    await prisma.evaluatorAssignment.createMany({ data: toCreate, skipDuplicates: true });
  }

  return { created: toCreate.length, total: deduped.length };
}
