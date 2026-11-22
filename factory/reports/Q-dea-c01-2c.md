# Q-dea-c01-2c — report

49 questions, prefix `deac01-2c-`, `content/dea-c01/questions/datastore/`: 7 per objective (2.3.1–2.3.6, 2.4.1), single 41 / multi 8 (one 6-option "Choose three"), difficulty 15 / 24 / 10. Both validators: 0 problems (`content:validate` shows one warning on `blueprint.yaml`, scoring.dragdrop per_element, not in this batch).

## Facts checked that matter (AWS docs, Nov 2026)

- **S3 removed the 30-day minimum before Lifecycle transitions to Standard-IA / One Zone-IA** (What's New, 16 July 2026). No question relies on the old 30-day rule; `lc-one-zone-recreatable` transitions after 3 days on purpose. Course chapters and other batches should not teach the old minimum. The 30-day *minimum storage duration charge* of the IA classes still appears on the storage-class page.
- Lifecycle: objects < 128 KB not transitioned by default since Sept 2024 (rules created before keep the old behavior until edited — stem of `lc-small-objects` says the rule was created in 2026).
- Redshift auto-copy now needs an **S3 event integration** before `COPY JOB ... AUTO ON` (same Region, provisioned or Serverless).
- COPY/UNLOAD client-side encryption (`MASTER_SYMMETRIC_KEY`) is being retired (usable until 30 April 2026, closed to new customers) — used only as a distractor.
- EMR: since 7.10.0 S3A replaces EMRFS for `s3://`; the question says "s3:// URIs", not EMRFS.
- Redshift Multi-AZ: provisioned RA3 **and RG**; zero RPO, single endpoint.

## Deliberately avoided (could not verify or ambiguous)

- Whether Athena reads S3 Glacier Instant Retrieval objects directly (not on the Athena page fetched).
- MFA delete interaction with Lifecycle (doc says they cannot be used together, without details).
- DynamoDB GSI multi-attribute keys (new feature), AWS Backup advanced features for DynamoDB cross-Region copy.
- Cross-Region snapshot copy for Redshift Serverless.
