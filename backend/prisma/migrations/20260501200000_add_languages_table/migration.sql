-- CreateTable
CREATE TABLE "languages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_value_key" ON "languages"("value");

-- Seed default languages
INSERT INTO "languages" ("value", "label", "sort_order") VALUES
  ('kpelle', 'Kpelle',    1),
  ('bassa',  'Bassa',     2),
  ('grebo',  'Grebo',     3),
  ('vai',    'Vai',       4),
  ('mende',  'Mende',     5),
  ('loma',   'Loma',      6),
  ('krahn',  'Krahn',     7),
  ('dan',    'Dan (Gio)', 8)
ON CONFLICT DO NOTHING;

-- AlterTable: change target_language from enum to TEXT (already applied to DB)
-- ALTER TABLE "translations" ALTER COLUMN "target_language" TYPE TEXT USING "target_language"::TEXT;

-- DropEnum (already applied to DB)
-- DROP TYPE IF EXISTS "TargetLanguage";
