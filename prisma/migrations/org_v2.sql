-- Org V2 Migration
-- Run this in Supabase SQL Editor

-- 1. Tribe: add TTL and HR Partner
ALTER TABLE "Tribe" ALTER COLUMN "tribeLeadId" DROP NOT NULL;
ALTER TABLE "Tribe" ADD COLUMN IF NOT EXISTS "tribeTechLeadId" TEXT REFERENCES "Person"(id);
ALTER TABLE "Tribe" ADD COLUMN IF NOT EXISTS "tribeHRPartnerId" TEXT REFERENCES "Person"(id);

-- 2. FunctionalArea (new)
CREATE TABLE IF NOT EXISTS "FunctionalArea" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          TEXT NOT NULL,
  "tribeId"       TEXT NOT NULL REFERENCES "Tribe"(id) ON DELETE CASCADE,
  "chapterLeadId" TEXT REFERENCES "Person"(id),
  UNIQUE ("tribeId", "name")
);

-- 3. Squad: add PO and AC
ALTER TABLE "Squad" ADD COLUMN IF NOT EXISTS "productOwnerId" TEXT REFERENCES "Person"(id);
ALTER TABLE "Squad" ADD COLUMN IF NOT EXISTS "agileCoachId"   TEXT REFERENCES "Person"(id);

-- 4. Person: add functionalAreaId
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "functionalAreaId" TEXT REFERENCES "FunctionalArea"(id);

-- 5. TribePeriod (new)
CREATE TYPE IF NOT EXISTS "TribePeriodStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLOSED');

CREATE TABLE IF NOT EXISTS "TribePeriod" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "periodId"      TEXT NOT NULL REFERENCES "Period"(id),
  "tribeId"       TEXT NOT NULL REFERENCES "Tribe"(id),
  "status"        "TribePeriodStatus" NOT NULL DEFAULT 'PENDING',
  "activatedAt"   TIMESTAMPTZ,
  "activatedById" TEXT REFERENCES "Person"(id),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("periodId", "tribeId")
);

-- 6. EvaluatorAssignment: add isOverride flag
ALTER TABLE "EvaluatorAssignment" ADD COLUMN IF NOT EXISTS "isOverride" BOOLEAN NOT NULL DEFAULT false;
