CREATE TABLE `governance_authority_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `contributor_id` VARCHAR(191) NOT NULL,
    `authority_role` VARCHAR(32) NOT NULL,
    `active_role` VARCHAR(32) NULL,
    `active_contributor_id` VARCHAR(191) NULL,
    `assigned_by` VARCHAR(191) NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked_at` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    INDEX `governance_authority_assignments_authority_role_revoked_at_idx` (`authority_role`, `revoked_at`),
    INDEX `governance_authority_assignments_contributor_id_revoked_at_idx` (`contributor_id`, `revoked_at`),
    UNIQUE INDEX `governance_authority_assignments_active_role_key` (`active_role`),
    UNIQUE INDEX `governance_authority_assignments_active_contributor_id_key` (`active_contributor_id`),
    CONSTRAINT `governance_authority_assignments_contributor_id_fkey` FOREIGN KEY (`contributor_id`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `governance_authority_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
