-- AlterTable
ALTER TABLE `task_attachments` ADD COLUMN `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `deleted_at` TIMESTAMP(0) NULL,
    ADD COLUMN `updated_at` TIMESTAMP(0) NULL;

-- AlterTable
ALTER TABLE `task_comments` ADD COLUMN `updated_at` TIMESTAMP(0) NULL;
