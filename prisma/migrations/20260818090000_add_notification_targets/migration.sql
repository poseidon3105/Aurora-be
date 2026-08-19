ALTER TABLE `notifications`
  ADD COLUMN `target_type` VARCHAR(30) NULL,
  ADD COLUMN `target_id` INTEGER NULL;

CREATE INDEX `notifications_target_type_target_id_idx` ON `notifications`(`target_type`, `target_id`);
