CREATE TABLE `surface_similarity_signals` (
    `id` VARCHAR(191) NOT NULL,
    `sample_id` VARCHAR(191) NOT NULL,
    `target_language` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'character_3gram_jaccard',
    `computed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `surface_similarity_signals_sample_id_target_language_method_key`(`sample_id`, `target_language`, `method`),
    INDEX `surface_similarity_signals_target_language_idx`(`target_language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `surface_similarity_signals` ADD CONSTRAINT `surface_similarity_signals_sample_id_fkey`
    FOREIGN KEY (`sample_id`) REFERENCES `english_samples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
