CREATE TYPE "DatasetReleaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RESTRICTED', 'RETRACTED', 'DEPRECATED');
CREATE TYPE "DatasetSplit" AS ENUM ('TRAIN', 'VALIDATION', 'TEST');

CREATE TABLE "dataset_releases" (
  "id" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "semantic_version" TEXT NOT NULL,
  "status" "DatasetReleaseStatus" NOT NULL DEFAULT 'DRAFT',
  "schema_version" TEXT NOT NULL,
  "git_commit" TEXT NOT NULL,
  "split_algorithm" TEXT NOT NULL,
  "split_seed" TEXT NOT NULL,
  "split_mode" TEXT NOT NULL,
  "manifest_checksum" TEXT,
  "artifact_checksum" TEXT,
  "artifact_url" TEXT,
  "license_key" TEXT NOT NULL,
  "inclusion_criteria" JSONB NOT NULL,
  "record_count" INTEGER NOT NULL DEFAULT 0,
  "changelog" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_by" TEXT,
  "published_at" TIMESTAMP(3),
  "restricted_at" TIMESTAMP(3),
  "retracted_at" TIMESTAMP(3),
  "retraction_reason" TEXT,
  CONSTRAINT "dataset_releases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dataset_release_items" (
  "id" TEXT NOT NULL,
  "release_id" TEXT NOT NULL,
  "translation_id" TEXT NOT NULL,
  "translation_revision_no" INTEGER NOT NULL,
  "source_group" TEXT NOT NULL,
  "duplicate_group" TEXT,
  "speaker_pseudonym" TEXT NOT NULL,
  "split" "DatasetSplit" NOT NULL,
  "record_checksum" TEXT NOT NULL,
  "record_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dataset_release_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "release_pseudonyms" (
  "id" TEXT NOT NULL,
  "release_id" TEXT NOT NULL,
  "contributor_id" TEXT NOT NULL,
  "pseudonym" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "release_pseudonyms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dataset_corrections" (
  "id" TEXT NOT NULL,
  "release_id" TEXT NOT NULL,
  "correction_type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "affected_ids" JSONB,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dataset_corrections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dataset_releases_language_semantic_version_key" ON "dataset_releases"("language", "semantic_version");
CREATE INDEX "dataset_releases_language_status_idx" ON "dataset_releases"("language", "status");
CREATE UNIQUE INDEX "dataset_release_items_release_id_translation_id_key" ON "dataset_release_items"("release_id", "translation_id");
CREATE INDEX "dataset_release_items_release_id_split_idx" ON "dataset_release_items"("release_id", "split");
CREATE INDEX "dataset_release_items_source_group_split_idx" ON "dataset_release_items"("source_group", "split");
CREATE INDEX "dataset_release_items_speaker_pseudonym_split_idx" ON "dataset_release_items"("speaker_pseudonym", "split");
CREATE UNIQUE INDEX "release_pseudonyms_release_id_contributor_id_key" ON "release_pseudonyms"("release_id", "contributor_id");
CREATE UNIQUE INDEX "release_pseudonyms_release_id_pseudonym_key" ON "release_pseudonyms"("release_id", "pseudonym");
CREATE INDEX "dataset_corrections_release_id_created_at_idx" ON "dataset_corrections"("release_id", "created_at");
ALTER TABLE "dataset_release_items" ADD CONSTRAINT "dataset_release_items_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "dataset_releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dataset_release_items" ADD CONSTRAINT "dataset_release_items_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "translations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "release_pseudonyms" ADD CONSTRAINT "release_pseudonyms_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "dataset_releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "release_pseudonyms" ADD CONSTRAINT "release_pseudonyms_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dataset_corrections" ADD CONSTRAINT "dataset_corrections_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "dataset_releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
