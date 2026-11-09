CREATE TABLE "consent_states" (
  "id" TEXT NOT NULL,
  "contributor_id" TEXT NOT NULL,
  "policy_id" TEXT NOT NULL,
  "text_contribution" BOOLEAN NOT NULL DEFAULT false,
  "target_audio" BOOLEAN NOT NULL DEFAULT false,
  "english_audio" BOOLEAN NOT NULL DEFAULT false,
  "model_training" BOOLEAN NOT NULL DEFAULT false,
  "public_release" BOOLEAN NOT NULL DEFAULT false,
  "commercial_use" BOOLEAN NOT NULL DEFAULT false,
  "future_research" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consent_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consent_states_contributor_id_policy_id_key" ON "consent_states"("contributor_id", "policy_id");
CREATE INDEX "consent_states_policy_id_public_release_model_training_idx" ON "consent_states"("policy_id", "public_release", "model_training");
ALTER TABLE "consent_states" ADD CONSTRAINT "consent_states_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consent_states" ADD CONSTRAINT "consent_states_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "research_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
