# K-gcp-pca-cs4 — report

1. 3 original case studies: gcppca-cs4a-marrowfield-health (hospital network: imaging archive, ADT event hub), gcppca-cs4b-corvane-components (automotive parts manufacturer, factory IoT), gcppca-cs4c-saltroute-travel (travel booking marketplace moving from AWS).
2. 15 questions (5 per case): single=13, multi=2; difficulty 3 easy / 8 medium / 4 hard.
3. Domains: design 5, security 5, processes 3 (4.2.1, 4.2.2, 4.1.3), provisioning 1, implementation 1, operations 1 (each case covers 3 to 5 domains).
4. Facts checked on docs.cloud.google.com (2026-11-27); every reference is a page that was fetched. No Preview or deprecated feature is a correct answer.
5. `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-cs4` → 18 files, 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-cs4` → 0 problem(s), 0 warning(s).

## Notes and doubts

- Decisions chosen to differ from cs1–cs3: Cloud Healthcare API DICOM store + DICOM adapter + DICOM storage classes, HL7v2 store + MLLP adapter + Pub/Sub notifications, IAP with a device-based access level, Data Access logs for the Healthcare API with an Observability Analytics bucket (cs2b tested a locked Cloud Storage archive instead), Workload Identity Federation with X.509 certificates, Pub/Sub BigQuery subscription with topic schema, GKE "No minor or node upgrades" exclusion, Pub/Sub oldest-unacked-age alerting, workload disposition (retain / repurchase / retire), Memorystore for Valkey, Cloud Armor bot management with reCAPTCHA session-tokens, Sensitive Data Protection de-identification before BigQuery, Cloud Trace with log correlation, DMS PostgreSQL to AlloyDB (tables without primary key, promotion).
- WIF with X.509 certificates: GA on 2025-05-07 (IAM release notes). The X.509 page says some APIs need service account impersonation, so the correct option uses impersonation rather than direct resource access.
- GKE maintenance exclusions page now gives "No upgrades" a 90-day maximum (under 30 days recommended); the cs4b question therefore relies on control-plane patches being required, not on the exclusion length.
- The DICOM storage classes page does not state a launch stage or minimum storage durations; the question does not depend on them. Healthcare API dataset location is not named in the case (region availability not verified).
- Cloud Armor bot management pages do not list supported load balancer types; the case uses the global external Application Load Balancer only. The overview names "deny" when a token score is below a threshold.
- Memorystore for Valkey GA 2025-04-02 (release notes). Valkey key-expiration semantics are standard Valkey behavior, not stated on the fetched overview page.
- DMS: RDS for PostgreSQL 15 is a supported source; tables without a primary key get only the snapshot and INSERTs during CDC (Known limitations). The source-side pglogical prerequisites are not offered as an option.
