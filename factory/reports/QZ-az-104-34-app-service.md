# QZ-az-104-34-app-service — doubts and notes

Quiz: `content/az-104/course/quizzes/34-app-service.yaml` (10 questions). `check-quiz` reports 0 problems and 0 warnings.

## Chapter 34-app-service is out of date or imprecise (checked on Learn, Nov. 2026)

The quiz avoids all of these points. The course agent should fix the chapter.

- **Linked database backups are being retired.** "Back Up an App" (manage-backup) says custom backups stop backing up linked databases on 3/31/2028. The option to include them in *new* custom backup configurations was removed in November 2025 for MySQL/PostgreSQL and in April 2026 for Azure SQL / SQL Server. Flexible Server databases were never supported. The chapter's "Linked databases: Yes" row (EN and FR) and its key point ("custom backups … allow databases") need a deprecation note. Mock-exam questions that rely on including a database in a new custom backup should be checked too. I didn't find any in `c4-backup-*`.
- **Custom backup details** from the same page: the limit is 10 GB, of which at most 4 GB can be the linked database. The schedule allows one backup every 2 hours at most, and 12 backups per day (manual + scheduled). Retention is 0–30 days or indefinite. The chapter says only "up to 10 GB, including databases" and "your schedule".
- **The TXT `asuid` record isn't strictly required for subdomains.** The custom-domain tutorial says it's "not absolutely required" but highly recommended, to prevent subdomain takeover. The chapter's table implies it's mandatory. The answer is the same in practice, but a precise statement would be safer.
- Wildcard verification: Learn ("Migrate an Active Domain") confirms TXT host `asuid` for `*`, as the chapter says. The same page notes that a wildcard doesn't validate subdomains that already have their own CNAME record. Q6 states that the zone has no CNAME records.

## Facts used in the quiz, and where I verified them

- Plan defines OS, region, instance count/size, tier (overview-hosting-plans).
- Always On: off by default, unloads after 20 minutes, ping every 5 minutes (configure-common). Available from Basic (service limits table).
- Restore stops the target, so restore to a slot and then swap. Automatic backups are hourly, and hourly points are kept for days 1–3 (manage-backup).
- Max instances: Standard 10, Premium v2/v3/v4 30, Isolated 100 (azure-subscription-service-limits).
- .cer files aren't used for custom domains. Uploaded private certificates aren't renewed or rebound automatically (configure-ssl-certificate).
- Autoscale profile order: fixed date, then recurring, then default. With only a scale-out rule, autoscale acts in one direction only (autoscale-understanding-settings, autoscale-best-practices).
- Always On and managed identities aren't swapped (deploy-staging-slots). Managed identity configuration is slot-specific (overview-managed-identity).
- Regional VNet integration needs the same region and a dedicated subnet, reaches resources through global peering, and is available from Basic (overview-vnet-integration).

## Not verified on a fetched page (common knowledge, kept)

- The permissions of the Key Vault Secrets User role (read secret contents) and the Secrets Officer role (full secret management), used in Q10's explanation. I didn't fetch the built-in roles page.
- The claim that Isolated v2 costs more than Premium v3 (Q4 distractor). The explanation relies mainly on Isolated v2 needing an App Service Environment.
