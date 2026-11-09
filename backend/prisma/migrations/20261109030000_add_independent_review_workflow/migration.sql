CREATE TYPE "TranslationReviewState" AS ENUM ('PENDING_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'ADJUDICATION_REQUIRED', 'RETRACTED');
CREATE TYPE "ReviewAssignmentStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVE', 'REQUEST_CHANGES', 'REJECT', 'ABSTAIN');
CREATE TYPE "AdjudicationDecision" AS ENUM ('APPROVE', 'REJECT', 'RETURN_FOR_REVISION');

ALTER TABLE "translations"
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "review_state" "TranslationReviewState" NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN "current_revision" INTEGER NOT NULL DEFAULT 1;

-- Existing Boolean validations cannot prove independent review. They remain
-- PENDING_REVIEW and must pass the new workflow before release.

CREATE TABLE "translation_revisions" (
    "id" TEXT NOT NULL,
    "translation_id" TEXT NOT NULL,
    "revision_no" INTEGER NOT NULL,
    "translated_text" TEXT NOT NULL,
    "dialect" TEXT,
    "audio_path" TEXT,
    "english_audio_path" TEXT,
    "guideline_version" TEXT,
    "collection_code" TEXT,
    "change_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "translation_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_assignments" (
    "id" TEXT NOT NULL,
    "translation_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "revision_no" INTEGER NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "status" "ReviewAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "is_blind" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "review_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_reviews" (
    "id" TEXT NOT NULL,
    "translation_id" TEXT NOT NULL,
    "revision_no" INTEGER NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "adequacy" INTEGER,
    "fluency" INTEGER,
    "orthography" INTEGER,
    "dialect_fit" INTEGER,
    "cultural_appropriateness" INTEGER,
    "audio_intelligibility" INTEGER,
    "error_labels" JSONB,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "translation_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_adjudications" (
    "id" TEXT NOT NULL,
    "translation_id" TEXT NOT NULL,
    "revision_no" INTEGER NOT NULL,
    "adjudicator_id" TEXT NOT NULL,
    "decision" "AdjudicationDecision" NOT NULL,
    "final_score" DOUBLE PRECISION,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "translation_adjudications_pkey" PRIMARY KEY ("id")
);

INSERT INTO "translation_revisions" (
    "id", "translation_id", "revision_no", "translated_text", "dialect",
    "audio_path", "english_audio_path", "created_by", "created_at"
)
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", 1,
       "translated_text", "dialect", "audio_path", "english_audio_path",
       "contributor_id", "created_at"
FROM "translations";

CREATE UNIQUE INDEX "translation_revisions_translation_id_revision_no_key" ON "translation_revisions"("translation_id", "revision_no");
CREATE INDEX "translation_revisions_created_by_idx" ON "translation_revisions"("created_by");
CREATE UNIQUE INDEX "review_assignments_translation_id_revision_no_reviewer_id_key" ON "review_assignments"("translation_id", "revision_no", "reviewer_id");
CREATE INDEX "review_assignments_reviewer_id_status_idx" ON "review_assignments"("reviewer_id", "status");
CREATE UNIQUE INDEX "translation_reviews_translation_id_revision_no_reviewer_id_key" ON "translation_reviews"("translation_id", "revision_no", "reviewer_id");
CREATE INDEX "translation_reviews_reviewer_id_idx" ON "translation_reviews"("reviewer_id");
CREATE UNIQUE INDEX "translation_adjudications_translation_id_revision_no_key" ON "translation_adjudications"("translation_id", "revision_no");
CREATE INDEX "translation_adjudications_adjudicator_id_idx" ON "translation_adjudications"("adjudicator_id");

ALTER TABLE "translation_revisions" ADD CONSTRAINT "translation_revisions_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "translation_reviews" ADD CONSTRAINT "translation_reviews_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_reviews" ADD CONSTRAINT "translation_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "translation_adjudications" ADD CONSTRAINT "translation_adjudications_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_adjudications" ADD CONSTRAINT "translation_adjudications_adjudicator_id_fkey" FOREIGN KEY ("adjudicator_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
