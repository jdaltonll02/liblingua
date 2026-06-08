-- AlterTable
ALTER TABLE "translations" ADD COLUMN     "english_audio_path" TEXT;

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contributor_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_publications" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "record_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" TEXT NOT NULL,

    CONSTRAINT "dataset_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_contributor_id_idx" ON "api_keys"("contributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_publications_language_key" ON "dataset_publications"("language");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
