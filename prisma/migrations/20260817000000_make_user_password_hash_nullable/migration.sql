-- Allow password-less accounts created through Google sign-in.
ALTER TABLE `users` MODIFY `password_hash` VARCHAR(255) NULL;