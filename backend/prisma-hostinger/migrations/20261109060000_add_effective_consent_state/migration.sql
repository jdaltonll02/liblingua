CREATE TABLE `consent_states` (
  `id` VARCHAR(191) NOT NULL,
  `contributor_id` VARCHAR(191) NOT NULL,
  `policy_id` VARCHAR(191) NOT NULL,
  `text_contribution` BOOLEAN NOT NULL DEFAULT false,
  `target_audio` BOOLEAN NOT NULL DEFAULT false,
  `english_audio` BOOLEAN NOT NULL DEFAULT false,
  `model_training` BOOLEAN NOT NULL DEFAULT false,
  `public_release` BOOLEAN NOT NULL DEFAULT false,
  `commercial_use` BOOLEAN NOT NULL DEFAULT false,
  `future_research` BOOLEAN NOT NULL DEFAULT false,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `consent_states_contributor_id_policy_id_key` (`contributor_id`, `policy_id`),
  INDEX `consent_states_policy_id_public_release_model_training_idx` (`policy_id`, `public_release`, `model_training`),
  CONSTRAINT `consent_states_contributor_id_fkey` FOREIGN KEY (`contributor_id`) REFERENCES `contributors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `consent_states_policy_id_fkey` FOREIGN KEY (`policy_id`) REFERENCES `research_policies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
