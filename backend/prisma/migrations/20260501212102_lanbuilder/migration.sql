/*
  Warnings:

  - The primary key for the `languages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `target_language` on the `translations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "contributors" ADD COLUMN     "photo_url" TEXT,
ADD COLUMN     "profession" TEXT;

-- AlterTable
ALTER TABLE "languages" DROP CONSTRAINT "languages_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "languages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "translations" DROP COLUMN "target_language",
ADD COLUMN     "target_language" TEXT NOT NULL;

-- DropEnum
DROP TYPE "TargetLanguage";

-- CreateIndex
CREATE INDEX "translations_sample_id_target_language_idx" ON "translations"("sample_id", "target_language");

-- CreateIndex
CREATE UNIQUE INDEX "translations_sample_id_contributor_id_target_language_key" ON "translations"("sample_id", "contributor_id", "target_language");
