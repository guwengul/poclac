import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ tribeId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tribeId } = await params;
  const { tribeLeadId, tribeTechLeadId, tribeHRPartnerId } = await req.json();

  const tribe = await prisma.tribe.update({
    where: { id: tribeId },
    data: {
      tribeLeadId: tribeLeadId ?? null,
      tribeTechLeadId: tribeTechLeadId ?? null,
      tribeHRPartnerId: tribeHRPartnerId ?? null,
    },
  });

  return NextResponse.json({ tribe });
}
