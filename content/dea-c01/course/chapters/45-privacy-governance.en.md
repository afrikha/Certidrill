Governance questions combine a sharing request ("give the finance account live access to the sales tables"), a privacy constraint ("no PII outside the restricted zone", "data must never leave the EU") and an audit need ("show what changed in this bucket policy"). This chapter covers sharing permissions, PII discovery, Region restrictions, AWS Config, sovereignty, SageMaker Catalog projects and governance frameworks.

<!-- section: data-sharing-permissions | objectives: 4.5.1 -->
## Granting permissions for data sharing

**Amazon Redshift data sharing** gives consumers live, read-only access to producer data without copying or unloading it: a committed write on the producer is visible to the next consumer transaction. It works between provisioned clusters with RA3 (or RG) nodes and Redshift Serverless workgroups, in the same account, across accounts and across Regions. The producer pays for storage; the consumer pays for its query compute and any cross-Region transfer. Producers can also grant INSERT, UPDATE or CREATE for consumer writes.

Steps for a cross-account share:

```sql
-- Producer (account 111122223333)
CREATE DATASHARE sales_share;
ALTER DATASHARE sales_share ADD SCHEMA sales;
ALTER DATASHARE sales_share ADD ALL TABLES IN SCHEMA sales;
ALTER DATASHARE sales_share SET INCLUDENEW = TRUE FOR SCHEMA sales;
GRANT USAGE ON DATASHARE sales_share TO ACCOUNT '444455556666';

-- Consumer (account 444455556666), after authorization and association
CREATE DATABASE sales_db
  FROM DATASHARE sales_share OF ACCOUNT '111122223333' NAMESPACE 'a1b2c3d4-5678-90ab-cdef-EXAMPLE22222';
GRANT USAGE ON DATABASE sales_db TO ROLE finance_analyst;
SELECT region, SUM(amount) FROM sales_db.sales.orders GROUP BY region;
```

```bash
# Producer administrator authorizes the consumer account
aws redshift authorize-data-share \
  --data-share-arn arn:aws:redshift:eu-west-1:111122223333:datashare:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222/sales_share \
  --consumer-identifier 444455556666
# Consumer administrator associates the datashare
aws redshift associate-data-share-consumer \
  --data-share-arn arn:aws:redshift:eu-west-1:111122223333:datashare:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222/sales_share \
  --associate-entire-account
```

Rules the exam uses:

- Within one account, `GRANT USAGE ... TO NAMESPACE '<guid>'`; across accounts, `TO ACCOUNT` plus producer **authorization** and consumer **association**. Across accounts both sides must be encrypted.
- `SET INCLUDENEW` (false by default) adds tables created later in the schema.
- `CREATE DATABASE ... WITH PERMISSIONS` makes the consumer grant object-level permissions; without it, USAGE on the database opens every shared object.
- A consumer cannot reshare shared objects.
- `TO ACCOUNT ... VIA DATA CATALOG` makes a **Lake Formation-managed datashare**: Lake Formation, not Redshift SQL, then decides which consumer principals see which tables, columns and rows. Datashares can also be licensed through **AWS Data Exchange**.

**Lake Formation** shares Data Catalog databases and tables with other accounts, organizations, OUs or IAM principals, by **named resources** or, at scale, with **LF-tags** (LF-TBAC). It uses AWS RAM: inside the organization the share is immediate; outside it, the recipient's data lake administrator accepts the invitation. The recipient grants its own principals and creates a **resource link** for Athena or Redshift Spectrum.

> **Exam trap.** "Give another team live access to Redshift tables without copying data and without loading the producer cluster" is a datashare: the consumer's own compute runs the queries. UNLOAD then COPY creates a copy that goes stale.

<!-- section: pii-identification | objectives: 4.5.2 -->
## Identifying PII with Amazon Macie and Lake Formation

**Amazon Macie** discovers sensitive data in S3 general purpose buckets:

| Feature | Behavior |
| --- | --- |
| Automated sensitive data discovery | Evaluates the bucket inventory daily and inspects sampled objects; gives a sensitivity score per bucket |
| Sensitive data discovery job | Targeted analysis of chosen buckets or criteria, once or on a schedule, full depth |
| Managed data identifiers | Built-in detection of PII, financial data and credentials (names, addresses, passport numbers, credit card numbers, AWS secret keys) |
| Custom data identifiers | A regex plus optional keywords and a proximity rule (employee IDs, customer account numbers) |
| Allow lists | Text or patterns to ignore (test data, public company names) |

Macie produces **sensitive data findings** (category `CLASSIFICATION`, with the location of occurrences such as cells or records) and **policy findings** (category `POLICY`, bucket security posture). It publishes them automatically to **EventBridge** and optionally to Security Hub CSPM. Macie needs access to the KMS key of encrypted objects. Data in RDS, Aurora or DynamoDB is analyzed after export to S3.

**Macie with Lake Formation**: Macie says where PII is; Lake Formation enforces who can read it.

1. Macie scans the curated zone.
2. An EventBridge rule matches the findings and starts a Lambda function or a Step Functions workflow.
3. The workflow maps the S3 object to its Glue table and tags the affected columns with an LF-tag such as `classification=pii`.
4. LF-TBAC grants: analysts receive `classification=public` only, a restricted role also receives `classification=pii`. Revoke the default `IAMAllowedPrincipals` permission so that Lake Formation actually controls the tables.

```json
{
  "source": ["aws.macie"],
  "detail-type": ["Macie Finding"],
  "detail": {
    "category": ["CLASSIFICATION"],
    "resourcesAffected": { "s3Bucket": { "name": ["anycompany-curated"] } }
  }
}
```

```bash
aws lakeformation add-lf-tags-to-resource \
  --resource '{"TableWithColumns": {"DatabaseName": "curated", "Name": "customers", "ColumnNames": ["email", "phone"]}}' \
  --lf-tags '[{"TagKey": "classification", "TagValues": ["pii"]}]'
```

To act **inside the pipeline**, use the AWS Glue **Detect PII** transform (scan each cell or a sample of rows; redact, partially redact or replace with a SHA-256 hash). For PII in logs, a CloudWatch Logs data protection policy masks it at ingestion.

> **Exam tip.** "Discover PII across hundreds of buckets continuously with the least effort" is Macie automated sensitive data discovery. "Mask card numbers in the ETL job before writing the curated table" is Glue Detect PII. "Restrict analysts from PII columns that were found" is LF-tags on those columns.

<!-- section: region-restrictions | objectives: 4.5.3 -->
## Preventing backups and replications to disallowed Regions

Copies leave a Region through S3 Cross-Region Replication, AWS Backup copy rules, RDS cross-Region replicas and backup replication, Redshift cross-Region snapshot copy, DynamoDB global tables, KMS multi-Region keys, or a plain `aws s3 cp`. Preventive controls live in AWS Organizations:

- A **service control policy** that denies every Regional action when `aws:RequestedRegion` is not an approved Region stops the creation of buckets, vaults, replicas and clusters there. Global services (IAM, Organizations, Route 53, CloudFront, STS, Support) are exempted with `NotAction`, and a break-glass role can be excluded.
- Some copies are configured from the approved source Region (a replication rule, a backup plan copy action), so also deny the configuring actions outside a platform role, or restrict their targets. For AWS Backup, the `backup:CopyTargets` condition key on `backup:CopyFromBackupVault` limits destination vaults.
- **AWS Control Tower Region deny**: `AWS-GR_REGION_DENY` for the whole landing zone or `CT.MULTISERVICE.PV.1` for chosen OUs, implemented as an SCP; the home Region cannot be denied.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "cloudfront:*",
        "iam:*",
        "organizations:*",
        "route53:*",
        "sts:*",
        "support:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] },
        "ArnNotLike": { "aws:PrincipalArn": ["arn:aws:iam::*:role/PlatformBreakGlass"] }
      }
    },
    {
      "Sid": "DenyBackupCopiesOutsideApprovedRegions",
      "Effect": "Deny",
      "Action": "backup:CopyFromBackupVault",
      "Resource": "*",
      "Condition": {
        "ForAnyValue:ArnNotLike": {
          "backup:CopyTargets": [
            "arn:aws:backup:eu-west-1:*:backup-vault:*",
            "arn:aws:backup:eu-central-1:*:backup-vault:*"
          ]
        }
      }
    }
  ]
}
```

The NotAction list is abbreviated (AWS's example exempts more global services). Detective controls complete it: Config aggregator queries for resources in unapproved Regions, CloudTrail for the attempts.

> **Exam trap.** An IAM policy or a bucket policy cannot stop an administrator of the account from enabling replication elsewhere; an SCP applies to every principal of member accounts, including administrators (not the management account). SCPs never grant permissions.

<!-- section: config-changes | objectives: 4.5.4 -->
## Viewing configuration changes with AWS Config

AWS Config records **configuration items** (settings and relationships of each supported resource) at every change (continuous recording) or once a day (periodic recording). Its delivery channel writes history files to S3 every six hours, snapshots on demand, and SNS notifications (`ConfigurationItemChangeNotification`, `ComplianceChangeNotification`).

| Question | Tool |
| --- | --- |
| What did this bucket policy or security group look like last Tuesday, and what changed? | Config resource timeline (`get-resource-config-history`) |
| Who made the change? | The CloudTrail event linked from the configuration item |
| Is every bucket encrypted, is any Redshift cluster public? | Config rules (managed such as `s3-bucket-server-side-encryption-enabled`, `redshift-cluster-public-access-check`, or custom with Lambda or Guard), evaluated on change or periodically |
| Same checks across all accounts and Regions | An aggregator, conformance packs deployed to the organization |
| Inventory query on current state | Advanced query (SQL `SELECT` subset, current state only, also through an aggregator) |
| Fix automatically | Remediation with Systems Manager Automation documents |

```bash
aws configservice get-resource-config-history \
  --resource-type AWS::S3::Bucket --resource-id anycompany-curated --limit 5
aws configservice select-aggregate-resource-config \
  --configuration-aggregator-name org-aggregator \
  --expression "SELECT accountId, awsRegion, resourceId WHERE resourceType = 'AWS::S3::Bucket' AND awsRegion = 'us-east-1'"
```

> **Exam trap.** CloudTrail answers "who called which API and when"; Config answers "what was the resource's configuration at a point in time and is it compliant". A question about the state before and after a change, or continuous compliance, wants Config.

<!-- section: data-sovereignty | objectives: 4.5.5 -->
## Maintaining data sovereignty

**Data residency** is where data is stored and processed; **data sovereignty** adds which laws apply and who controls access, keys and operations. AWS commits not to move or replicate content outside the Regions the customer chooses, except as needed to provide services the customer started or to comply with the law. The data engineer's part:

- Choose the Regions, then enforce them (Region-deny SCP, controls on copies) and verify them (Config, CloudTrail, Macie for classification).
- Watch features that process data in another Region by design (cross-Region inference, global endpoints): use geography-scoped options or disable them.
- Keep keys under control: customer managed KMS keys created in the approved Region (single-Region keys rather than multi-Region keys), restrictive key policies, and, when regulation demands keys outside AWS, a KMS **external key store** (XKS): keys live in the customer's own key manager, AWS cannot decrypt without it, but the customer owns availability and latency (symmetric keys only, no automatic rotation, no multi-Region keys). A CloudHSM key store keeps keys in single-tenant HSMs that the customer manages inside AWS.
- For EU sovereignty requirements, the **AWS European Sovereign Cloud** (generally available since January 14, 2026) is a separate partition (`aws-eusc`, Region `eusc-de-east-1` in Brandenburg, Germany) operated by EU residents, with its own accounts, IAM and billing.

> **Exam tip.** "Encryption keys must remain under the company's exclusive control outside AWS" is an external key store. "Data must stay in two EU Regions, including backups" is an SCP with `aws:RequestedRegion` plus backup copy restrictions, not encryption.

<!-- section: sagemaker-catalog-projects | objectives: 4.5.6 -->
## Managing data access through SageMaker Catalog projects

In **Amazon SageMaker Unified Studio**, a domain (organized in domain units) contains **projects**: a team's working boundary, with members who are **owners** (manage members, edit and delete the project) or **contributors** (IAM Identity Center users or groups, or IAM principals). Each project has its own IAM role; access to data is granted to the project, not to individuals.

The **SageMaker Catalog** flow:

1. A producing project brings assets into its inventory (visible only to its members), adds business names, descriptions, glossary terms and metadata forms, then **publishes** them. A later change must be published again to appear in the catalog.
2. A consuming project finds the asset and submits a **subscription request** with a justification.
3. Only members of the **owning project** approve or reject, granting full access or filtered access with row and column filters. Requests are approved automatically if the publisher disabled approval, or if the requester is an owner or contributor of both projects.
4. **Fulfillment** is automatic for managed assets. Glue tables: Lake Formation-managed, the publishing project's role holds grantable DESCRIBE and SELECT; no LF-TBAC, no cross-Region. Redshift tables and views: grants, a view or a datashare, no cross-Region. Unmanaged assets: events in EventBridge for custom fulfillment.
5. The owning project can revoke a subscription at any time.

> **Exam trap.** Granting Lake Formation permissions directly to an analyst's role bypasses the catalog workflow. When the requirement is "request, approve and audit access to published data products", the answer is a subscription between projects in SageMaker Catalog.

<!-- section: governance-patterns | objectives: 4.5.7 -->
## Governance frameworks and data sharing patterns

A data governance framework defines **ownership** (a domain team per data product), **stewardship** (metadata, glossary, quality rules), **classification** (public, internal, confidential, PII), **access policy** (who requests, who approves), **lineage** and **audit** (CloudTrail, Config, Redshift logs). Operating models:

| Model | AWS layout | Fits |
| --- | --- | --- |
| Centralized | One data lake account holds storage, catalog and permissions | Small organizations, strict central control |
| Data mesh (decentralized ownership, federated governance) | Producer accounts own S3, Glue tables and Redshift; a central governance account holds the shared catalog, LF-tags and the SageMaker Catalog domain; consumer accounts query through resource links or datashares | Many domain teams that publish data products |
| Hub and spoke | A central account curates and redistributes data to business unit accounts | Shared reference data, mixed maturity |

Sharing patterns:

| Need | Pattern |
| --- | --- |
| Live access to lake tables in another account | Lake Formation cross-account grant (LF-tags), resource link on the consumer side |
| Live access to warehouse tables, consumer compute | Redshift datashare |
| Request and approval workflow with business metadata | SageMaker Catalog subscription between projects |
| Share or sell data to external organizations | AWS Data Exchange: data grants or AWS Marketplace products, with files, APIs, Redshift datashares, S3 data access, or Lake Formation (preview) |
| Simple object access for another account | Bucket policy or S3 access point, plus the KMS key policy if SSE-KMS |
| Isolation, other Region, or latency requires a physical copy | Replication, UNLOAD, or a pipeline, accepting duplicate storage and governance drift |

> **Exam tip.** Prefer share-in-place (Lake Formation, datashares, catalog subscriptions) over copies: one copy means one set of permissions, one audit trail and no stale data.

<!-- section: key-points -->
## Key points

- Redshift datashare: RA3/RG or Serverless, live, consumer pays compute; `GRANT USAGE ON DATASHARE`, authorization and association across accounts, `CREATE DATABASE ... FROM DATASHARE`, no resharing.
- Lake Formation sharing: named resources or LF-tags, AWS RAM, resource links for Athena and Spectrum.
- Macie: automated discovery (daily, sampled) or jobs; managed and custom identifiers, allow lists; findings to EventBridge; LF-tags on PII columns enforce access; Glue Detect PII masks in the pipeline.
- Region control: SCP on `aws:RequestedRegion` with global exemptions, restrictions on copy configuration (`backup:CopyTargets`), Control Tower Region deny.
- Config: configuration items and timeline, rules, aggregators, advanced query, SSM remediation; CloudTrail says who.
- Sovereignty: chosen Regions, in-Region keys, XKS for keys outside AWS, AWS European Sovereign Cloud partition.
- SageMaker Catalog: publish, subscribe, owning project approves (full or filtered), automatic fulfillment through Lake Formation or Redshift grants.
