ALTER TABLE `languages`
ADD COLUMN `autonym` VARCHAR(191) NULL,
ADD COLUMN `iso639_3` VARCHAR(191) NULL,
ADD COLUMN `glottocode` VARCHAR(191) NULL,
ADD COLUMN `default_script` VARCHAR(191) NULL,
ADD COLUMN `metadata_version` VARCHAR(191) NULL;

CREATE TABLE `language_varieties` (
    `id` VARCHAR(191) NOT NULL, `language_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL,
    `autonym` VARCHAR(191) NULL, `dialect_group` VARCHAR(191) NULL,
    `iso639_3` VARCHAR(191) NULL, `glottocode` VARCHAR(191) NULL,
    `bcp47` VARCHAR(191) NULL, `region` VARCHAR(191) NULL, `description` TEXT NULL,
    `status` ENUM('DRAFT','ACTIVE','RETIRED') NOT NULL DEFAULT 'DRAFT',
    `approved_by` VARCHAR(191) NULL, `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `language_varieties_code_key`(`code`),
    INDEX `language_varieties_language_id_status_idx`(`language_id`, `status`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `orthographies` (
    `id` VARCHAR(191) NOT NULL, `variety_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL, `script` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NULL, `authority` VARCHAR(191) NULL, `description` TEXT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('DRAFT','ACTIVE','RETIRED') NOT NULL DEFAULT 'DRAFT',
    `approved_by` VARCHAR(191) NULL, `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `orthographies_code_key`(`code`),
    INDEX `orthographies_variety_id_status_idx`(`variety_id`, `status`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `contributor_language_profiles` (
    `id` VARCHAR(191) NOT NULL, `contributor_id` VARCHAR(191) NOT NULL, `variety_id` VARCHAR(191) NOT NULL,
    `speaking_proficiency` ENUM('NONE','LIMITED','WORKING','PROFICIENT','DOMINANT') NOT NULL,
    `reading_proficiency` ENUM('NONE','LIMITED','WORKING','PROFICIENT','DOMINANT') NOT NULL,
    `writing_proficiency` ENUM('NONE','LIMITED','WORKING','PROFICIENT','DOMINANT') NOT NULL,
    `usage_frequency` ENUM('RARELY','MONTHLY','WEEKLY','DAILY') NOT NULL,
    `age_of_acquisition` INTEGER NULL, `place_learned` VARCHAR(191) NULL,
    `current_use_region` VARCHAR(191) NULL, `literacy_training` TEXT NULL,
    `is_first_language` BOOLEAN NOT NULL DEFAULT false, `self_reported` BOOLEAN NOT NULL DEFAULT true,
    `verified_by` VARCHAR(191) NULL, `verified_at` DATETIME(3) NULL, `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `contributor_language_profiles_contributor_id_variety_id_key`(`contributor_id`, `variety_id`),
    INDEX `contributor_language_profiles_variety_id_idx`(`variety_id`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `annotation_guidelines` (
    `id` VARCHAR(191) NOT NULL, `variety_id` VARCHAR(191) NOT NULL, `orthography_id` VARCHAR(191) NULL,
    `version` VARCHAR(191) NOT NULL, `title` VARCHAR(191) NOT NULL, `content_hash` VARCHAR(191) NOT NULL,
    `content_url` VARCHAR(191) NOT NULL, `status` ENUM('DRAFT','ACTIVE','RETIRED') NOT NULL DEFAULT 'DRAFT',
    `effective_at` DATETIME(3) NULL, `retired_at` DATETIME(3) NULL,
    `approved_by` VARCHAR(191) NULL, `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `annotation_guidelines_variety_id_orthography_id_version_key`(`variety_id`, `orthography_id`, `version`),
    INDEX `annotation_guidelines_variety_id_status_idx`(`variety_id`, `status`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `translations`
ADD COLUMN `language_variety_id` VARCHAR(191) NULL,
ADD COLUMN `orthography_id` VARCHAR(191) NULL,
ADD COLUMN `guideline_id` VARCHAR(191) NULL,
ADD COLUMN `register` ENUM('GENERAL','CASUAL','FORMAL','TECHNICAL','CEREMONIAL','OTHER') NOT NULL DEFAULT 'GENERAL',
ADD COLUMN `contains_code_switching` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `code_switching_notes` TEXT NULL,
ADD COLUMN `uncertainty` ENUM('CONFIDENT','SOME_UNCERTAINTY','NEEDS_DISCUSSION') NOT NULL DEFAULT 'CONFIDENT',
ADD COLUMN `annotation_outcome` ENUM('TRANSLATED','UNTRANSLATABLE','CULTURALLY_SENSITIVE','NEEDS_CONTEXT') NOT NULL DEFAULT 'TRANSLATED',
ADD COLUMN `alternative_translation` TEXT NULL,
ADD COLUMN `annotation_notes` TEXT NULL,
ADD COLUMN `linguistic_metadata_complete` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `translation_revisions`
ADD COLUMN `language_variety_id` VARCHAR(191) NULL,
ADD COLUMN `orthography_id` VARCHAR(191) NULL,
ADD COLUMN `guideline_id` VARCHAR(191) NULL,
ADD COLUMN `register` ENUM('GENERAL','CASUAL','FORMAL','TECHNICAL','CEREMONIAL','OTHER') NOT NULL DEFAULT 'GENERAL',
ADD COLUMN `contains_code_switching` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `code_switching_notes` TEXT NULL,
ADD COLUMN `uncertainty` ENUM('CONFIDENT','SOME_UNCERTAINTY','NEEDS_DISCUSSION') NOT NULL DEFAULT 'CONFIDENT',
ADD COLUMN `annotation_outcome` ENUM('TRANSLATED','UNTRANSLATABLE','CULTURALLY_SENSITIVE','NEEDS_CONTEXT') NOT NULL DEFAULT 'TRANSLATED',
ADD COLUMN `alternative_translation` TEXT NULL,
ADD COLUMN `annotation_notes` TEXT NULL;

ALTER TABLE `language_varieties` ADD CONSTRAINT `language_varieties_language_id_fkey` FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `orthographies` ADD CONSTRAINT `orthographies_variety_id_fkey` FOREIGN KEY (`variety_id`) REFERENCES `language_varieties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `contributor_language_profiles` ADD CONSTRAINT `contributor_language_profiles_contributor_id_fkey` FOREIGN KEY (`contributor_id`) REFERENCES `contributors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `contributor_language_profiles` ADD CONSTRAINT `contributor_language_profiles_variety_id_fkey` FOREIGN KEY (`variety_id`) REFERENCES `language_varieties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `annotation_guidelines` ADD CONSTRAINT `annotation_guidelines_variety_id_fkey` FOREIGN KEY (`variety_id`) REFERENCES `language_varieties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `annotation_guidelines` ADD CONSTRAINT `annotation_guidelines_orthography_id_fkey` FOREIGN KEY (`orthography_id`) REFERENCES `orthographies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `translations` ADD CONSTRAINT `translations_language_variety_id_fkey` FOREIGN KEY (`language_variety_id`) REFERENCES `language_varieties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `translations` ADD CONSTRAINT `translations_orthography_id_fkey` FOREIGN KEY (`orthography_id`) REFERENCES `orthographies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `translations` ADD CONSTRAINT `translations_guideline_id_fkey` FOREIGN KEY (`guideline_id`) REFERENCES `annotation_guidelines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
