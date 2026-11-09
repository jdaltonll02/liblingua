CREATE TYPE "SourceKind" AS ENUM ('LEGACY_UNKNOWN', 'MANUAL', 'SEEDED', 'DATASET_IMPORT');
CREATE TYPE "CopyrightStatus" AS ENUM ('UNKNOWN', 'LICENSED', 'PUBLIC_DOMAIN', 'PERMISSION_GRANTED', 'RESTRICTED');
CREATE TYPE "ResearchReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "english_samples"
ADD COLUMN "text_hash" TEXT,
ADD COLUMN "near_duplicate_group" TEXT,
ADD COLUMN "source_kind" "SourceKind" NOT NULL DEFAULT 'LEGACY_UNKNOWN',
ADD COLUMN "source_dataset" TEXT,
ADD COLUMN "source_dataset_version" TEXT,
ADD COLUMN "source_record_id" TEXT,
ADD COLUMN "source_url" TEXT,
ADD COLUMN "source_citation" TEXT,
ADD COLUMN "source_license" TEXT,
ADD COLUMN "source_license_url" TEXT,
ADD COLUMN "copyright_status" "CopyrightStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "source_usage_restrictions" TEXT,
ADD COLUMN "source_release_eligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "original_text" TEXT,
ADD COLUMN "importer_version" TEXT,
ADD COLUMN "imported_by" TEXT,
ADD COLUMN "imported_at" TIMESTAMP(3),
ADD COLUMN "provenance_metadata" JSONB,
ADD COLUMN "specialist_review_status" "ResearchReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "specialist_reviewed_by" TEXT,
ADD COLUMN "specialist_reviewed_at" TIMESTAMP(3),
ADD COLUMN "specialist_review_notes" TEXT;

CREATE UNIQUE INDEX "english_samples_text_hash_key" ON "english_samples"("text_hash");
CREATE INDEX "english_samples_near_duplicate_group_idx" ON "english_samples"("near_duplicate_group");
CREATE INDEX "english_samples_source_release_eligible_idx" ON "english_samples"("source_release_eligible");
CREATE INDEX "english_samples_specialist_review_status_idx" ON "english_samples"("specialist_review_status");
