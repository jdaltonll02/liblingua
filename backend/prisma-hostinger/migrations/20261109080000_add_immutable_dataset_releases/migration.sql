CREATE TABLE `dataset_releases` (
  `id` VARCHAR(191) NOT NULL, `language` VARCHAR(191) NOT NULL, `semantic_version` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT','PUBLISHED','RESTRICTED','RETRACTED','DEPRECATED') NOT NULL DEFAULT 'DRAFT',
  `schema_version` VARCHAR(191) NOT NULL, `git_commit` VARCHAR(191) NOT NULL,
  `split_algorithm` VARCHAR(191) NOT NULL, `split_seed` VARCHAR(191) NOT NULL, `split_mode` VARCHAR(191) NOT NULL,
  `manifest_checksum` VARCHAR(191) NULL, `artifact_checksum` VARCHAR(191) NULL, `artifact_url` VARCHAR(191) NULL,
  `license_key` VARCHAR(191) NOT NULL, `inclusion_criteria` JSON NOT NULL, `record_count` INTEGER NOT NULL DEFAULT 0,
  `changelog` TEXT NULL, `created_by` VARCHAR(191) NOT NULL, `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `published_by` VARCHAR(191) NULL, `published_at` DATETIME(3) NULL, `restricted_at` DATETIME(3) NULL,
  `retracted_at` DATETIME(3) NULL, `retraction_reason` TEXT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `dataset_releases_language_semantic_version_key` (`language`, `semantic_version`),
  INDEX `dataset_releases_language_status_idx` (`language`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `dataset_release_items` (
  `id` VARCHAR(191) NOT NULL, `release_id` VARCHAR(191) NOT NULL, `translation_id` VARCHAR(191) NOT NULL,
  `translation_revision_no` INTEGER NOT NULL, `source_group` VARCHAR(191) NOT NULL, `duplicate_group` VARCHAR(191) NULL,
  `speaker_pseudonym` VARCHAR(191) NOT NULL, `split` ENUM('TRAIN','VALIDATION','TEST') NOT NULL,
  `record_checksum` VARCHAR(191) NOT NULL, `record_snapshot` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
  UNIQUE INDEX `dataset_release_items_release_id_translation_id_key` (`release_id`, `translation_id`),
  INDEX `dataset_release_items_release_id_split_idx` (`release_id`, `split`),
  INDEX `dataset_release_items_source_group_split_idx` (`source_group`, `split`),
  INDEX `dataset_release_items_speaker_pseudonym_split_idx` (`speaker_pseudonym`, `split`),
  CONSTRAINT `dataset_release_items_release_id_fkey` FOREIGN KEY (`release_id`) REFERENCES `dataset_releases` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `dataset_release_items_translation_id_fkey` FOREIGN KEY (`translation_id`) REFERENCES `translations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `release_pseudonyms` (
  `id` VARCHAR(191) NOT NULL, `release_id` VARCHAR(191) NOT NULL, `contributor_id` VARCHAR(191) NOT NULL,
  `pseudonym` VARCHAR(191) NOT NULL, `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
  UNIQUE INDEX `release_pseudonyms_release_id_contributor_id_key` (`release_id`, `contributor_id`),
  UNIQUE INDEX `release_pseudonyms_release_id_pseudonym_key` (`release_id`, `pseudonym`),
  CONSTRAINT `release_pseudonyms_release_id_fkey` FOREIGN KEY (`release_id`) REFERENCES `dataset_releases` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `release_pseudonyms_contributor_id_fkey` FOREIGN KEY (`contributor_id`) REFERENCES `contributors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `dataset_corrections` (
  `id` VARCHAR(191) NOT NULL, `release_id` VARCHAR(191) NOT NULL, `correction_type` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL, `affected_ids` JSON NULL, `created_by` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
  INDEX `dataset_corrections_release_id_created_at_idx` (`release_id`, `created_at`),
  CONSTRAINT `dataset_corrections_release_id_fkey` FOREIGN KEY (`release_id`) REFERENCES `dataset_releases` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
