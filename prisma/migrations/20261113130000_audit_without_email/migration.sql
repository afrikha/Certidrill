-- The audit log no longer copies the user's e-mail (GDPR: deleting an account
-- must erase its address). The user is found through targetUserId.
UPDATE "audit_log" SET "details" = "details" - 'email' WHERE "details" ? 'email';
