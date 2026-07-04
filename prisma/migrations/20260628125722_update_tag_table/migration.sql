/*
  Warnings:

  - A unique constraint covering the columns `[project_id,name]` on the table `tags` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `created_by` to the `tags` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `tags` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `tags` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
/*
  Warnings:

  - A unique constraint covering the columns `[project_id,name]` on the table `tags` will be added. If there are existing duplicate values, this will fail.
  - Made the column `name` on table `tags` required. This step will fail if there are existing NULL values in that column.

*/

-- DropIndex
DROP INDEX `tags_name_key` ON `tags`;

-- =========================
-- Step 1: Thêm cột cho phép NULL
-- =========================

ALTER TABLE `tags`
ADD COLUMN `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
ADD COLUMN `created_by` INTEGER NULL,
ADD COLUMN `project_id` INTEGER NULL,
MODIFY `name` VARCHAR(100) NOT NULL;

-- =========================
-- Step 2: Cập nhật dữ liệu cũ
-- =========================

UPDATE `tags`
SET
    `project_id` = 1,
    `created_by` = 1
WHERE `project_id` IS NULL;

-- =========================
-- Step 3: Đổi thành NOT NULL
-- =========================

ALTER TABLE `tags`
MODIFY `created_by` INTEGER NOT NULL,
MODIFY `project_id` INTEGER NOT NULL;

-- =========================
-- Step 4: Tạo Index
-- =========================

CREATE INDEX `tags_project_id_idx`
ON `tags`(`project_id`);

CREATE INDEX `tags_created_by_idx`
ON `tags`(`created_by`);

-- =========================
-- Step 5: Unique
-- =========================

CREATE UNIQUE INDEX `tags_project_id_name_key`
ON `tags`(`project_id`, `name`);

-- =========================
-- Step 6: Foreign Key
-- =========================

ALTER TABLE `tags`
ADD CONSTRAINT `tags_project_id_fkey`
FOREIGN KEY (`project_id`)
REFERENCES `projects`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE `tags`
ADD CONSTRAINT `tags_created_by_fkey`
FOREIGN KEY (`created_by`)
REFERENCES `users`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;