ALTER TABLE `english_samples`
ADD COLUMN `text_hash` VARCHAR(191) NULL,
ADD COLUMN `near_duplicate_group` VARCHAR(191) NULL,
ADD COLUMN `source_kind` ENUM('LEGACY_UNKNOWN', 'MANUAL', 'SEEDED', 'DATASET_IMPORT') NOT NULL DEFAULT 'LEGACY_UNKNOWN',
ADD COLUMN `source_dataset` VARCHAR(191) NULL,
ADD COLUMN `source_dataset_version` VARCHAR(191) NULL,
ADD COLUMN `source_record_id` VARCHAR(191) NULL,
ADD COLUMN `source_url` VARCHAR(191) NULL,
ADD COLUMN `source_citation` TEXT NULL,
ADD COLUMN `source_license` VARCHAR(191) NULL,
ADD COLUMN `source_license_url` VARCHAR(191) NULL,
ADD COLUMN `copyright_status` ENUM('UNKNOWN', 'LICENSED', 'PUBLIC_DOMAIN', 'PERMISSION_GRANTED', 'RESTRICTED') NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN `source_usage_restrictions` TEXT NULL,
ADD COLUMN `source_release_eligible` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `original_text` TEXT NULL,
ADD COLUMN `importer_version` VARCHAR(191) NULL,
ADD COLUMN `imported_by` VARCHAR(191) NULL,
ADD COLUMN `imported_at` DATETIME(3) NULL,
ADD COLUMN `provenance_metadata` JSON NULL,
ADD COLUMN `specialist_review_status` ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
ADD COLUMN `specialist_reviewed_by` VARCHAR(191) NULL,
ADD COLUMN `specialist_reviewed_at` DATETIME(3) NULL,
ADD COLUMN `specialist_review_notes` TEXT NULL;

CREATE UNIQUE INDEX `english_samples_text_hash_key` ON `english_samples`(`text_hash`);
CREATE INDEX `english_samples_near_duplicate_group_idx` ON `english_samples`(`near_duplicate_group`);
CREATE INDEX `english_samples_source_release_eligible_idx` ON `english_samples`(`source_release_eligible`);
CREATE INDEX `english_samples_specialist_review_status_idx` ON `english_samples`(`specialist_review_status`);
