-- CreateEnum
CREATE TYPE "Domain" AS ENUM ('general', 'health', 'legal', 'education', 'news', 'conversational');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('under_18', '18_35', '36_55', '56_plus');

-- CreateEnum
CREATE TYPE "TargetLanguage" AS ENUM ('kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan');

-- CreateTable
CREATE TABLE "english_samples" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "audio_path" TEXT,
    "domain" "Domain" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "translation_count" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_gold_standard" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "english_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "contributor_id" TEXT NOT NULL,
    "target_language" "TargetLanguage" NOT NULL,
    "dialect" TEXT,
    "translated_text" TEXT NOT NULL,
    "audio_path" TEXT,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "quality_score" DOUBLE PRECISION,
    "gold_sim_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "native_language" TEXT,
    "native_dialect" TEXT,
    "region_of_origin" TEXT,
    "age_group" "AgeGroup",
    "is_l1_speaker" BOOLEAN,
    "reputation_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "verification_sent_at" TIMESTAMP(3),
    "google_id" TEXT,
    "github_id" TEXT,
    "oauth_provider" TEXT,
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_standard" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "reference_translation" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gold_standard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "english_samples_domain_idx" ON "english_samples"("domain");

-- CreateIndex
CREATE INDEX "english_samples_is_locked_idx" ON "english_samples"("is_locked");

-- CreateIndex
CREATE INDEX "english_samples_is_gold_standard_idx" ON "english_samples"("is_gold_standard");

-- CreateIndex
CREATE INDEX "translations_sample_id_target_language_idx" ON "translations"("sample_id", "target_language");

-- CreateIndex
CREATE INDEX "translations_contributor_id_idx" ON "translations"("contributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "translations_sample_id_contributor_id_target_language_key" ON "translations"("sample_id", "contributor_id", "target_language");

-- CreateIndex
CREATE UNIQUE INDEX "contributors_email_key" ON "contributors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contributors_verification_token_key" ON "contributors"("verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "contributors_google_id_key" ON "contributors"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "contributors_github_id_key" ON "contributors"("github_id");

-- CreateIndex
CREATE INDEX "gold_standard_sample_id_target_language_idx" ON "gold_standard"("sample_id", "target_language");

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "english_samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_standard" ADD CONSTRAINT "gold_standard_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "english_samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
