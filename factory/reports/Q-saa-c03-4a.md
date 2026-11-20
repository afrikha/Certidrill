# Q-saa-c03-4a — QUESTIONS SAA-C03, domain cost (4.1.1–4.1.19)

- 47 questions in `content/saa-c03/questions/cost/saac03-4a-*.yaml`: single 39, multi 8 (all 5 options / choose 2); difficulty 14 easy / 24 medium / 9 hard; counts per objective as assigned.
- Validator: `CERT=saa-c03 npx tsx factory/validate.ts --prefix saac03-4a-` → 0 problem(s).
- No SAA-C03 course chapter existed when the batch was written; facts come from AWS pages fetched on 2026-11-19 (all references were fetched; titles are the page H1 without the " - Service name" suffix).

## Facts checked (Nov 2026) that drive answers
- gp3 now: 1 GiB–64 TiB, up to 80,000 IOPS and 2,000 MiB/s (baseline 3,000 IOPS / 125 MiB/s); io2 Block Express up to 256,000 IOPS, 99.999 % durability; io1 64,000 IOPS. Questions use 100,000 IOPS to separate io2 from gp3.
- Cost Explorer: 13 months history + current month, 18-month forecast. CUR 2.0 via AWS Data Exports is the recommended CUR.
- Lifecycle: objects < 128 KB not transitioned by default since Sept 2024; Glacier 40 KB per-object overhead (8 KB at Standard rates).
- AWS Backup: cold storage minimum 90 days; continuous backups max 35 days and cannot be copied (RDS); Vault Lock compliance grace time ≥ 3 days.
- DLM snapshot archiving: one schedule per policy, monthly / ≥ 28-day frequency, ≥ 90 days archive retention.

## Avoided on purpose
- Snowball Edge (no new customers), FSx File Gateway (no new customers), Amazon Glacier vaults; AWS Data Transfer Terminal (only for Enterprise Support customers) not used as an answer.
- No maximum S3 object size or single-PUT limit stated (not confirmed on the fetched page).

## Stated from general AWS knowledge, not read verbatim on a fetched page
- st1/HDD cheaper per GiB than SSD; interface endpoints billed per hour and per GB; Compute Optimizer requires opt-in; Lifecycle requires 30 days before Standard-IA (questions avoid relying on it).
- Reference title "S3 Pricing" for https://aws.amazon.com/s3/pricing/ as returned by the fetch; reviewer may prefer the full marketing title.
