CREATE TABLE "surface_similarity_signals" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'character_3gram_jaccard',
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "surface_similarity_signals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "surface_similarity_signals_sample_id_target_language_method_key"
    ON "surface_similarity_signals"("sample_id", "target_language", "method");
CREATE INDEX "surface_similarity_signals_target_language_idx"
    ON "surface_similarity_signals"("target_language");
ALTER TABLE "surface_similarity_signals" ADD CONSTRAINT "surface_similarity_signals_sample_id_fkey"
    FOREIGN KEY ("sample_id") REFERENCES "english_samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
