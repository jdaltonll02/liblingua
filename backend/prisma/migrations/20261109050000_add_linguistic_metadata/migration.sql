CREATE TYPE "ProficiencyLevel" AS ENUM ('NONE', 'LIMITED', 'WORKING', 'PROFICIENT', 'DOMINANT');
CREATE TYPE "UsageFrequency" AS ENUM ('RARELY', 'MONTHLY', 'WEEKLY', 'DAILY');
CREATE TYPE "AnnotationRegister" AS ENUM ('GENERAL', 'CASUAL', 'FORMAL', 'TECHNICAL', 'CEREMONIAL', 'OTHER');
CREATE TYPE "TranslationUncertainty" AS ENUM ('CONFIDENT', 'SOME_UNCERTAINTY', 'NEEDS_DISCUSSION');
CREATE TYPE "AnnotationOutcome" AS ENUM ('TRANSLATED', 'UNTRANSLATABLE', 'CULTURALLY_SENSITIVE', 'NEEDS_CONTEXT');

ALTER TABLE "languages"
ADD COLUMN "autonym" TEXT,
ADD COLUMN "iso639_3" TEXT,
ADD COLUMN "glottocode" TEXT,
ADD COLUMN "default_script" TEXT,
ADD COLUMN "metadata_version" TEXT;

CREATE TABLE "language_varieties" (
    "id" TEXT NOT NULL, "language_id" TEXT NOT NULL, "code" TEXT NOT NULL,
    "name" TEXT NOT NULL, "autonym" TEXT, "dialect_group" TEXT,
    "iso639_3" TEXT, "glottocode" TEXT, "bcp47" TEXT, "region" TEXT,
    "description" TEXT, "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by" TEXT, "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "language_varieties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orthographies" (
    "id" TEXT NOT NULL, "variety_id" TEXT NOT NULL, "code" TEXT NOT NULL,
    "name" TEXT NOT NULL, "script" TEXT NOT NULL, "version" TEXT,
    "authority" TEXT, "description" TEXT, "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT', "approved_by" TEXT,
    "approved_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orthographies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contributor_language_profiles" (
    "id" TEXT NOT NULL, "contributor_id" TEXT NOT NULL, "variety_id" TEXT NOT NULL,
    "speaking_proficiency" "ProficiencyLevel" NOT NULL,
    "reading_proficiency" "ProficiencyLevel" NOT NULL,
    "writing_proficiency" "ProficiencyLevel" NOT NULL,
    "usage_frequency" "UsageFrequency" NOT NULL,
    "age_of_acquisition" INTEGER, "place_learned" TEXT, "current_use_region" TEXT,
    "literacy_training" TEXT, "is_first_language" BOOLEAN NOT NULL DEFAULT false,
    "self_reported" BOOLEAN NOT NULL DEFAULT true, "verified_by" TEXT,
    "verified_at" TIMESTAMP(3), "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contributor_language_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "annotation_guidelines" (
    "id" TEXT NOT NULL, "variety_id" TEXT NOT NULL, "orthography_id" TEXT,
    "version" TEXT NOT NULL, "title" TEXT NOT NULL, "content_hash" TEXT NOT NULL,
    "content_url" TEXT NOT NULL, "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "effective_at" TIMESTAMP(3), "retired_at" TIMESTAMP(3), "approved_by" TEXT,
    "approved_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "annotation_guidelines_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "translations"
ADD COLUMN "language_variety_id" TEXT,
ADD COLUMN "orthography_id" TEXT,
ADD COLUMN "guideline_id" TEXT,
ADD COLUMN "register" "AnnotationRegister" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "contains_code_switching" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "code_switching_notes" TEXT,
ADD COLUMN "uncertainty" "TranslationUncertainty" NOT NULL DEFAULT 'CONFIDENT',
ADD COLUMN "annotation_outcome" "AnnotationOutcome" NOT NULL DEFAULT 'TRANSLATED',
ADD COLUMN "alternative_translation" TEXT,
ADD COLUMN "annotation_notes" TEXT,
ADD COLUMN "linguistic_metadata_complete" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "translation_revisions"
ADD COLUMN "language_variety_id" TEXT,
ADD COLUMN "orthography_id" TEXT,
ADD COLUMN "guideline_id" TEXT,
ADD COLUMN "register" "AnnotationRegister" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "contains_code_switching" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "code_switching_notes" TEXT,
ADD COLUMN "uncertainty" "TranslationUncertainty" NOT NULL DEFAULT 'CONFIDENT',
ADD COLUMN "annotation_outcome" "AnnotationOutcome" NOT NULL DEFAULT 'TRANSLATED',
ADD COLUMN "alternative_translation" TEXT,
ADD COLUMN "annotation_notes" TEXT;

CREATE UNIQUE INDEX "language_varieties_code_key" ON "language_varieties"("code");
CREATE INDEX "language_varieties_language_id_status_idx" ON "language_varieties"("language_id", "status");
CREATE UNIQUE INDEX "orthographies_code_key" ON "orthographies"("code");
CREATE INDEX "orthographies_variety_id_status_idx" ON "orthographies"("variety_id", "status");
CREATE UNIQUE INDEX "contributor_language_profiles_contributor_id_variety_id_key" ON "contributor_language_profiles"("contributor_id", "variety_id");
CREATE INDEX "contributor_language_profiles_variety_id_idx" ON "contributor_language_profiles"("variety_id");
CREATE UNIQUE INDEX "annotation_guidelines_variety_id_orthography_id_version_key" ON "annotation_guidelines"("variety_id", "orthography_id", "version");
CREATE INDEX "annotation_guidelines_variety_id_status_idx" ON "annotation_guidelines"("variety_id", "status");

ALTER TABLE "language_varieties" ADD CONSTRAINT "language_varieties_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orthographies" ADD CONSTRAINT "orthographies_variety_id_fkey" FOREIGN KEY ("variety_id") REFERENCES "language_varieties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contributor_language_profiles" ADD CONSTRAINT "contributor_language_profiles_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contributor_language_profiles" ADD CONSTRAINT "contributor_language_profiles_variety_id_fkey" FOREIGN KEY ("variety_id") REFERENCES "language_varieties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "annotation_guidelines" ADD CONSTRAINT "annotation_guidelines_variety_id_fkey" FOREIGN KEY ("variety_id") REFERENCES "language_varieties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "annotation_guidelines" ADD CONSTRAINT "annotation_guidelines_orthography_id_fkey" FOREIGN KEY ("orthography_id") REFERENCES "orthographies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "translations" ADD CONSTRAINT "translations_language_variety_id_fkey" FOREIGN KEY ("language_variety_id") REFERENCES "language_varieties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "translations" ADD CONSTRAINT "translations_orthography_id_fkey" FOREIGN KEY ("orthography_id") REFERENCES "orthographies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "translations" ADD CONSTRAINT "translations_guideline_id_fkey" FOREIGN KEY ("guideline_id") REFERENCES "annotation_guidelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
