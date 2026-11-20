-- Scoring rules of the blueprint (blueprint.scoring): {} keeps the Microsoft rule.
ALTER TABLE "blueprint" ADD COLUMN "scoring" JSONB NOT NULL DEFAULT '{}';
