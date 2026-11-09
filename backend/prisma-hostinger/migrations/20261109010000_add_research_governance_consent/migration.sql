-- Versioned research policy, append-only consent history, and governance approvals.
CREATE TABLE `research_policies` (
    `id` VARCHAR(191) NOT NULL,
    `policy_key` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content_hash` VARCHAR(191) NOT NULL,
    `content_url` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
    `requires_reconsent` BOOLEAN NOT NULL DEFAULT true,
    `effective_at` DATETIME(3) NULL,
    `retired_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `research_policies_policy_key_version_key`(`policy_key`, `version`),
    INDEX `research_policies_policy_key_status_idx`(`policy_key`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `consent_records` (
    `id` VARCHAR(191) NOT NULL,
    `contributor_id` VARCHAR(191) NOT NULL,
    `policy_id` VARCHAR(191) NOT NULL,
    `decision` ENUM('GRANTED', 'WITHDRAWN') NOT NULL,
    `scopes` JSON NOT NULL,
    `supersedes_id` VARCHAR(191) NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    INDEX `consent_records_contributor_id_policy_id_recorded_at_idx`(`contributor_id`, `policy_id`, `recorded_at`),
    INDEX `consent_records_supersedes_id_idx`(`supersedes_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `governance_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `resource_type` VARCHAR(191) NOT NULL,
    `resource_id` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NULL,
    `approver_id` VARCHAR(191) NOT NULL,
    `authority_role` VARCHAR(191) NOT NULL,
    `decision` ENUM('APPROVED', 'REJECTED') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `decided_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `governance_approvals_resource_type_resource_id_idx`(`resource_type`, `resource_id`),
    INDEX `governance_approvals_language_idx`(`language`),
    INDEX `governance_approvals_approver_id_idx`(`approver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_contributor_id_fkey`
    FOREIGN KEY (`contributor_id`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_policy_id_fkey`
    FOREIGN KEY (`policy_id`) REFERENCES `research_policies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_supersedes_id_fkey`
    FOREIGN KEY (`supersedes_id`) REFERENCES `consent_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `governance_approvals` ADD CONSTRAINT `governance_approvals_approver_id_fkey`
    FOREIGN KEY (`approver_id`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
