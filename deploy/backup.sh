#!/bin/sh
# Daily pg_dump (custom format) of the Certidrill database, 14 days kept.
# Expired sign-up requests (address and password hash of someone who never
# confirmed) are purged first, so they outlive their 24 hours by a day at most.
set -eu
while true; do
  # A failed purge must not stop the backup.
  psql -h db -U certidrill -d certidrill -q -c 'DELETE FROM signup_request WHERE "expiresAt" <= now()' || echo "purge of expired sign-up requests failed" >&2
  pg_dump -h db -U certidrill -d certidrill -Fc -f "/backups/certidrill-$(date +%F).dump"
  find /backups -name 'certidrill-*.dump' -mtime +14 -delete
  sleep 86400
done
