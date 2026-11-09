ALTER TABLE `translations`
ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
ADD COLUMN `review_state` ENUM('PENDING_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'ADJUDICATION_REQUIRED', 'RETRACTED') NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN `current_revision` INTEGER NOT NULL DEFAULT 1;

-- Existing Boolean validations cannot prove independent review. They remain
-- PENDING_REVIEW and must pass the new workflow before release.

CREATE TABLE `translation_revisions` (
    `id` VARCHAR(191) NOT NULL,
    `translation_id` VARCHAR(191) NOT NULL,
    `revision_no` INTEGER NOT NULL,
    `translated_text` TEXT NOT NULL,
    `dialect` VARCHAR(191) NULL,
    `audio_path` VARCHAR(191) NULL,
    `english_audio_path` VARCHAR(191) NULL,
    `guideline_version` VARCHAR(191) NULL,
    `collection_code` VARCHAR(191) NULL,
    `change_reason` TEXT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `translation_revisions_translation_id_revision_no_key`(`translation_id`, `revision_no`),
    INDEX `translation_revisions_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `review_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `translation_id` VARCHAR(191) NOT NULL,
    `reviewer_id` VARCHAR(191) NOT NULL,
    `revision_no` INTEGER NOT NULL,
    `assigned_by` VARCHAR(191) NOT NULL,
    `status` ENUM('ASSIGNED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ASSIGNED',
    `is_blind` BOOLEAN NOT NULL DEFAULT true,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    UNIQUE INDEX `review_assignments_translation_id_revision_no_reviewer_id_key`(`translation_id`, `revision_no`, `reviewer_id`),
    INDEX `review_assignments_reviewer_id_status_idx`(`reviewer_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `translation_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `translation_id` VARCHAR(191) NOT NULL,
    `revision_no` INTEGER NOT NULL,
    `reviewer_id` VARCHAR(191) NOT NULL,
    `decision` ENUM('APPROVE', 'REQUEST_CHANGES', 'REJECT', 'ABSTAIN') NOT NULL,
    `adequacy` INTEGER NULL,
    `fluency` INTEGER NULL,
    `orthography` INTEGER NULL,
    `dialect_fit` INTEGER NULL,
    `cultural_appropriateness` INTEGER NULL,
    `audio_intelligibility` INTEGER NULL,
    `error_labels` JSON NULL,
    `comments` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `translation_reviews_translation_id_revision_no_reviewer_id_key`(`translation_id`, `revision_no`, `reviewer_id`),
    INDEX `translation_reviews_reviewer_id_idx`(`reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `translation_adjudications` (
    `id` VARCHAR(191) NOT NULL,
    `translation_id` VARCHAR(191) NOT NULL,
    `revision_no` INTEGER NOT NULL,
    `adjudicator_id` VARCHAR(191) NOT NULL,
    `decision` ENUM('APPROVE', 'REJECT', 'RETURN_FOR_REVISION') NOT NULL,
    `final_score` DOUBLE NULL,
    `notes` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `translation_adjudications_translation_id_revision_no_key`(`translation_id`, `revision_no`),
    INDEX `translation_adjudications_adjudicator_id_idx`(`adjudicator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `translation_revisions` (
    `id`, `translation_id`, `revision_no`, `translated_text`, `dialect`,
    `audio_path`, `english_audio_path`, `created_by`, `created_at`
)
SELECT UUID(), `id`, 1, `translated_text`, `dialect`, `audio_path`,
       `english_audio_path`, `contributor_id`, `created_at`
FROM `translations`;

ALTER TABLE `translation_revisions` ADD CONSTRAINT `translation_revisions_translation_id_fkey` FOREIGN KEY (`translation_id`) REFERENCES `translations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `review_assignments` ADD CONSTRAINT `review_assignments_translation_id_fkey` FOREIGN KEY (`translation_id`) REFERENCES `translations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `review_assignments` ADD CONSTRAINT `review_assignments_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `review_assignments` ADD CONSTRAINT `review_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `translation_reviews` ADD CONSTRAINT `translation_reviews_translation_id_fkey` FOREIGN KEY (`translation_id`) REFERENCES `translations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `translation_reviews` ADD CONSTRAINT `translation_reviews_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `translation_adjudications` ADD CONSTRAINT `translation_adjudications_translation_id_fkey` FOREIGN KEY (`translation_id`) REFERENCES `translations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `translation_adjudications` ADD CONSTRAINT `translation_adjudications_adjudicator_id_fkey` FOREIGN KEY (`adjudicator_id`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
