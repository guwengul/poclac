import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 3 fixed criteria — upsert so re-running seed is safe
  await prisma.criterion.upsert({
    where: { code: "K1" },
    update: {},
    create: { code: "K1", name: "Squad/Team Contribution" },
  });
  await prisma.criterion.upsert({
    where: { code: "K2" },
    update: {},
    create: { code: "K2", name: "Functional Mastery" },
  });
  await prisma.criterion.upsert({
    where: { code: "K3" },
    update: {},
    create: { code: "K3", name: "Agile Mindset" },
  });

  console.log("Seed complete: 3 criteria created.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
