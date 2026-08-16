-- Required reference data for authorization and task workflows.
-- Each statement is idempotent, so it is safe for existing deployments.

INSERT INTO `system_roles` (`name`, `description`) VALUES
  ('USER', 'Standard application user'),
  ('ADMIN', 'System administrator'),
  ('SUPER_ADMIN', 'System super administrator')
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`);

INSERT INTO `project_roles` (`name`, `description`) VALUES
  ('PROJECT_MANAGER', 'Can manage project members and settings'),
  ('MEMBER', 'Can work on project checklists and tasks')
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`);

INSERT INTO `task_statuses` (`name`, `color`, `order_index`) VALUES
  ('TODO', '#6B7280', 1),
  ('IN_PROGRESS', '#2563EB', 2),
  ('REVIEW', '#D97706', 3),
  ('DONE', '#16A34A', 4)
ON DUPLICATE KEY UPDATE
  `color` = VALUES(`color`),
  `order_index` = VALUES(`order_index`);