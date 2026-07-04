/*
  Warnings:

  - A unique constraint covering the columns `[project_id,user_id]` on the table `project_members` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `project_members` ADD COLUMN `deleted_at` TIMESTAMP(0) NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX `project_members_project_id_user_id_key` ON `project_members`(`project_id`, `user_id`);
