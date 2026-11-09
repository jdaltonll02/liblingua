CREATE TABLE "governance_authority_assignments" (
    "id" TEXT NOT NULL,
    "contributor_id" TEXT NOT NULL,
    "authority_role" TEXT NOT NULL,
    "active_role" TEXT,
    "active_contributor_id" TEXT,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "governance_authority_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "governance_authority_assignments_authority_role_revoked_at_idx"
ON "governance_authority_assignments"("authority_role", "revoked_at");
CREATE INDEX "governance_authority_assignments_contributor_id_revoked_at_idx"
ON "governance_authority_assignments"("contributor_id", "revoked_at");
CREATE UNIQUE INDEX "governance_authority_assignments_active_role_key" ON "governance_authority_assignments"("active_role");
CREATE UNIQUE INDEX "governance_authority_assignments_active_contributor_id_key" ON "governance_authority_assignments"("active_contributor_id");
ALTER TABLE "governance_authority_assignments" ADD CONSTRAINT "governance_authority_assignments_contributor_id_fkey"
FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "governance_authority_assignments" ADD CONSTRAINT "governance_authority_assignments_assigned_by_fkey"
FOREIGN KEY ("assigned_by") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
