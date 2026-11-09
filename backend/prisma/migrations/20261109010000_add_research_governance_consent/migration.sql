-- Versioned research policy, append-only consent history, and governance approvals.
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE "ConsentDecision" AS ENUM ('GRANTED', 'WITHDRAWN');
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

CREATE TABLE "research_policies" (
    "id" TEXT NOT NULL,
    "policy_key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "content_url" TEXT,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "requires_reconsent" BOOLEAN NOT NULL DEFAULT true,
    "effective_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "research_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "contributor_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "decision" "ConsentDecision" NOT NULL,
    "scopes" JSONB NOT NULL,
    "supersedes_id" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "governance_approvals" (
    "id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "language" TEXT,
    "approver_id" TEXT NOT NULL,
    "authority_role" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "notes" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "governance_approvals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "research_policies_policy_key_version_key"
    ON "research_policies"("policy_key", "version");
CREATE INDEX "research_policies_policy_key_status_idx"
    ON "research_policies"("policy_key", "status");
CREATE INDEX "consent_records_contributor_id_policy_id_recorded_at_idx"
    ON "consent_records"("contributor_id", "policy_id", "recorded_at");
CREATE INDEX "consent_records_supersedes_id_idx" ON "consent_records"("supersedes_id");
CREATE INDEX "governance_approvals_resource_type_resource_id_idx"
    ON "governance_approvals"("resource_type", "resource_id");
CREATE INDEX "governance_approvals_language_idx" ON "governance_approvals"("language");
CREATE INDEX "governance_approvals_approver_id_idx" ON "governance_approvals"("approver_id");

ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_contributor_id_fkey"
    FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_policy_id_fkey"
    FOREIGN KEY ("policy_id") REFERENCES "research_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_supersedes_id_fkey"
    FOREIGN KEY ("supersedes_id") REFERENCES "consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "governance_approvals" ADD CONSTRAINT "governance_approvals_approver_id_fkey"
    FOREIGN KEY ("approver_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
