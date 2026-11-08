-- CreateTable
CREATE TABLE `languages` (
    `id` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `languages_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `english_samples` (
    `id` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `audio_path` TEXT NULL,
    `domain` ENUM('general', 'health', 'legal', 'education', 'news', 'conversational') NOT NULL,
    `difficulty` ENUM('easy', 'medium', 'hard') NOT NULL,
    `translation_count` INTEGER NOT NULL DEFAULT 0,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `is_gold_standard` BOOLEAN NOT NULL DEFAULT false,
    `iaa_score` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `english_samples_domain_idx`(`domain`),
    INDEX `english_samples_is_locked_idx`(`is_locked`),
    INDEX `english_samples_is_gold_standard_idx`(`is_gold_standard`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `translations` (
    `id` VARCHAR(191) NOT NULL,
    `sample_id` VARCHAR(191) NOT NULL,
    `contributor_id` VARCHAR(191) NOT NULL,
    `target_language` VARCHAR(191) NOT NULL,
    `dialect` VARCHAR(191) NULL,
    `translated_text` TEXT NOT NULL,
    `audio_path` TEXT NULL,
    `english_audio_path` TEXT NULL,
    `is_validated` BOOLEAN NOT NULL DEFAULT false,
    `quality_score` DOUBLE NULL,
    `gold_sim_score` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `translations_sample_id_target_language_idx`(`sample_id`, `target_language`),
    INDEX `translations_contributor_id_idx`(`contributor_id`),
    UNIQUE INDEX `translations_sample_id_contributor_id_target_language_key`(`sample_id`, `contributor_id`, `target_language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contributors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NULL,
    `native_language` VARCHAR(191) NULL,
    `native_dialect` VARCHAR(191) NULL,
    `region_of_origin` VARCHAR(191) NULL,
    `age_group` ENUM('under_18', '18_35', '36_55', '56_plus') NULL,
    `is_l1_speaker` BOOLEAN NULL,
    `reputation_score` DOUBLE NOT NULL DEFAULT 1.0,
    `is_admin` BOOLEAN NOT NULL DEFAULT false,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'ANALYST', 'RESEARCHER', 'CONTRIBUTOR') NOT NULL DEFAULT 'CONTRIBUTOR',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `verification_token` VARCHAR(191) NULL,
    `verification_sent_at` DATETIME(3) NULL,
    `google_id` VARCHAR(191) NULL,
    `github_id` VARCHAR(191) NULL,
    `oauth_provider` VARCHAR(191) NULL,
    `is_profile_complete` BOOLEAN NOT NULL DEFAULT false,
    `totp_secret` VARCHAR(191) NULL,
    `totp_enabled` BOOLEAN NOT NULL DEFAULT false,
    `pending_email` VARCHAR(191) NULL,
    `reset_token` VARCHAR(191) NULL,
    `reset_token_expires_at` DATETIME(3) NULL,
    `photo_url` TEXT NULL,
    `profession` VARCHAR(191) NULL,
    `affiliation` VARCHAR(191) NULL,
    `orcid_id` VARCHAR(191) NULL,
    `linkedin_url` VARCHAR(191) NULL,
    `researcher_bio` TEXT NULL,
    `is_featured_researcher` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `contributors_email_key`(`email`),
    UNIQUE INDEX `contributors_verification_token_key`(`verification_token`),
    UNIQUE INDEX `contributors_google_id_key`(`google_id`),
    UNIQUE INDEX `contributors_github_id_key`(`github_id`),
    UNIQUE INDEX `contributors_reset_token_key`(`reset_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contributor_badges` (
    `id` VARCHAR(191) NOT NULL,
    `contributor_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `awarded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contributor_badges_contributor_id_idx`(`contributor_id`),
    UNIQUE INDEX `contributor_badges_contributor_id_slug_key`(`contributor_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `language` VARCHAR(191) NOT NULL,
    `domain` ENUM('general', 'health', 'legal', 'education', 'news', 'conversational') NULL,
    `goal` INTEGER NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `badge_slug` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `campaigns_language_idx`(`language`),
    INDEX `campaigns_status_idx`(`status`),
    INDEX `campaigns_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `donations` (
    `id` VARCHAR(191) NOT NULL,
    `donor_name` VARCHAR(191) NULL,
    `donor_email` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `provider` ENUM('STRIPE', 'MTN_MOMO') NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `provider_ref` VARCHAR(191) NULL,
    `transaction_id` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `donations_provider_ref_key`(`provider_ref`),
    UNIQUE INDEX `donations_transaction_id_key`(`transaction_id`),
    INDEX `donations_status_idx`(`status`),
    INDEX `donations_provider_idx`(`provider`),
    INDEX `donations_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `category` ENUM('GENERAL', 'TECHNICAL', 'TRANSLATION_QUALITY', 'ACCOUNT', 'DATA_REQUEST', 'FUNDING', 'OTHER') NOT NULL DEFAULT 'GENERAL',
    `message` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `contributor_id` VARCHAR(191) NULL,
    `response` TEXT NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `support_tickets_status_idx`(`status`),
    INDEX `support_tickets_category_idx`(`category`),
    INDEX `support_tickets_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `key_hash` VARCHAR(191) NOT NULL,
    `prefix` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contributor_id` VARCHAR(191) NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `api_keys_key_hash_key`(`key_hash`),
    INDEX `api_keys_contributor_id_idx`(`contributor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dataset_publications` (
    `id` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `record_count` INTEGER NOT NULL DEFAULT 0,
    `audio_count` INTEGER NOT NULL DEFAULT 0,
    `text_only_count` INTEGER NOT NULL DEFAULT 0,
    `avg_quality` DOUBLE NULL,
    `domain_dist` JSON NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_by` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `dataset_publications_language_key`(`language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gold_standard` (
    `id` VARCHAR(191) NOT NULL,
    `sample_id` VARCHAR(191) NOT NULL,
    `target_language` VARCHAR(191) NOT NULL,
    `reference_translation` TEXT NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `gold_standard_sample_id_target_language_idx`(`sample_id`, `target_language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `target_id` VARCHAR(191) NULL,
    `resource_type` VARCHAR(191) NOT NULL,
    `changes` JSON NULL,
    `ip_address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_id_idx`(`actor_id`),
    INDEX `audit_logs_target_id_idx`(`target_id`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `translations` ADD CONSTRAINT `translations_sample_id_fkey` FOREIGN KEY (`sample_id`) REFERENCES `english_samples`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `translations` ADD CONSTRAINT `translations_contributor_id_fkey` FOREIGN KEY (`contributor_id`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contributor_badges` ADD CONSTRAINT `contributor_badges_contributor_id_fkey` FOREIGN KEY (`contributor_id`) REFERENCES `contributors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_contributor_id_fkey` FOREIGN KEY (`contributor_id`) REFERENCES `contributors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_contributor_id_fkey` FOREIGN KEY (`contributor_id`) REFERENCES `contributors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gold_standard` ADD CONSTRAINT `gold_standard_sample_id_fkey` FOREIGN KEY (`sample_id`) REFERENCES `english_samples`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `contributors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

