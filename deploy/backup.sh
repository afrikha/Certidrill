#!/bin/sh
# Daily pg_dump (custom format) of the Certidrill database, 14 days kept.
set -eu
while true; do
  pg_dump -h db -U certidrill -d certidrill -Fc -f "/backups/certidrill-$(date +%F).dump"
  find /backups -name 'certidrill-*.dump' -mtime +14 -delete
  sleep 86400
done
