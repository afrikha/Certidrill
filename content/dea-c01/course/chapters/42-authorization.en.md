Authorization questions start from a business rule (analysts in each Region see only their Region's rows, the finance team must not read card numbers, a Glue job may write only to the curated prefix) and ask which layer enforces it with the least effort: an IAM policy, a database grant in Amazon Redshift, an AWS Lake Formation permission, or a tag-based model that scales without rewriting policies. This chapter covers custom IAM policies, credential storage, database permissions, Lake Formation, role-, tag- and attribute-based authorization, and least privilege.

<!-- section: custom-policies | objectives: 4.2.1 -->
## Custom IAM policies

| Policy type | Owner | Use |
| --- | --- | --- |
| AWS managed policy | AWS, updated by AWS | Quick start, job functions (`AWSGlueServiceRole`, `AmazonAthenaFullAccess`); often broader than needed and never scoped to your resources |
| Customer managed policy | You, versioned, attachable to many identities | The normal choice when a managed policy grants too much or the wrong resources |
| Inline policy | Embedded in one identity, deleted with it | A strict one-to-one permission that must not be reused |

A managed policy does not meet the need when it grants `*` on resources (all buckets, all tables), lacks an action the pipeline needs (for example `kms:Decrypt` on a specific key), or cannot express a condition. Write a customer managed policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadRaw",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-datalake/raw/orders/*"
    },
    {
      "Sid": "WriteCurated",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::example-datalake/curated/orders/*"
    },
    {
      "Sid": "ListOwnPrefixes",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::example-datalake",
      "Condition": { "StringLike": { "s3:prefix": ["raw/orders/*", "curated/orders/*"] } }
    },
    {
      "Sid": "CatalogOrders",
      "Effect": "Allow",
      "Action": ["glue:GetTable", "glue:GetPartitions", "glue:BatchCreatePartition"],
      "Resource": [
        "arn:aws:glue:eu-west-1:111122223333:catalog",
        "arn:aws:glue:eu-west-1:111122223333:database/sales",
        "arn:aws:glue:eu-west-1:111122223333:table/sales/orders"
      ]
    }
  ]
}
```

Evaluation rules: everything is denied by default; an explicit `Deny` in any applicable policy wins over every `Allow`; SCPs and permissions boundaries set a maximum that identity policies cannot exceed; a cross-account request needs an allow on both sides (identity policy in the caller's account, resource policy in the owner's).

> **Exam trap.** `s3:ListBucket` applies to the bucket ARN, `s3:GetObject` and `s3:PutObject` to object ARNs (`bucket/*`). A policy that puts `ListBucket` on `example-datalake/*` silently fails to list.

<!-- section: credential-storage | objectives: 4.2.2 -->
## Storing application and database credentials

| Criterion | AWS Secrets Manager | Systems Manager Parameter Store |
| --- | --- | --- |
| Built for | Database credentials, API keys, tokens | Configuration values, plus `SecureString` secrets encrypted with KMS |
| Rotation | Built in (managed or Lambda) | None |
| Database integrations | RDS, Aurora and Redshift managed passwords; Glue connections; Redshift Data API; MSK SCRAM | Referenced by name from code and templates |
| Cross-account sharing | Resource policy on the secret, customer managed KMS key | Advanced parameters only |
| Cost | Per secret and per API call | Standard parameters free; advanced parameters charged |

Ways to use a secret without exposing it:

- **Redshift Data API**: `aws redshift-data execute-statement --secret-arn ...` runs SQL with the secret's credentials, no JDBC driver or connection pool.
- **Glue connections**: reference the secret; the job role needs `secretsmanager:GetSecretValue` on it.
- **Lambda**: the AWS Parameters and Secrets Lambda Extension caches values locally.
- **CloudFormation**: dynamic references (`{{resolve:secretsmanager:...}}`, `{{resolve:ssm-secure:...}}`) resolve at deployment.
- **Amazon MWAA**: Secrets Manager can be the secrets backend for Airflow connections and variables.

```bash
aws redshift-data execute-statement \
  --cluster-identifier analytics --database sales \
  --secret-arn arn:aws:secretsmanager:eu-west-1:111122223333:secret:prod/warehouse/etl_user-AbCdEf \
  --sql "SELECT count(*) FROM orders WHERE order_date = current_date"
```

> **Exam tip.** When a secret is encrypted with a customer managed key, the reader needs `kms:Decrypt` on that key as well as `secretsmanager:GetSecretValue`. A missing KMS permission is the usual cause of `AccessDenied` on a secret that the policy seems to allow.

<!-- section: database-access | objectives: 4.2.3 -->
## Database users, groups and roles in Amazon Redshift

| Object | Behavior |
| --- | --- |
| User | Database identity; local password, or temporary credentials from IAM |
| Group | Collection of users that receive the same object grants; system permissions go to roles only |
| Role (RBAC) | Bundle of object and system permissions; granted to users or other roles; the recommended model |
| System roles | `sys:monitor` (catalog and system tables), `sys:operator` (plus `ANALYZE`, `VACUUM`, cancel queries), `sys:dba` (create and drop schemas, tables, views, procedures), `sys:secadmin` (users, roles, RLS and masking policies, no data access by default), `sys:superuser` |

```text
CREATE ROLE sales_analyst;
GRANT USAGE ON SCHEMA sales TO ROLE sales_analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA sales TO ROLE sales_analyst;
ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT ON TABLES TO ROLE sales_analyst;
GRANT SELECT (order_id, order_date, amount) ON sales.customers_orders TO ROLE sales_analyst;
GRANT ROLE sales_analyst TO alice;

CREATE RLS POLICY region_filter
WITH (region VARCHAR(10))
USING (region IN (SELECT region FROM sales.analyst_regions WHERE user_name = current_user));
GRANT SELECT ON TABLE sales.analyst_regions TO RLS POLICY region_filter;
ATTACH RLS POLICY region_filter ON sales.orders TO ROLE sales_analyst;
ALTER TABLE sales.orders ROW LEVEL SECURITY ON;
```

- `USAGE` on the schema is needed in addition to table grants; `ALTER DEFAULT PRIVILEGES` covers tables created later.
- **Column-level** grants restrict `SELECT` or `UPDATE` to listed columns.
- **Row-level security** (RLS): a policy's `USING` predicate is added to every query of the attached users or roles, once `ROW LEVEL SECURITY ON` is set on the table. Superusers and `sys:secadmin` manage policies.

A policy that reads a lookup table (here the analyst-to-Region mapping) needs `SELECT` on it granted to the policy itself.

**IAM-based access** avoids database passwords: `GetClusterCredentials` returns a temporary password for a named database user (with `DbGroups` and `AutoCreate`), `GetClusterCredentialsWithIAM` maps the IAM identity one to one to a database user (15 to 60 minutes), and Redshift Serverless uses `GetCredentials`. The JDBC and ODBC drivers call these for you; IAM policies restrict which clusters, databases and users a principal may obtain.

For Amazon RDS and Aurora, IAM database authentication issues 15-minute tokens instead of passwords (`GRANT rds_iam TO etl_user;` on PostgreSQL).

> **Exam trap.** Granting a role or group access to a schema does not give access to its tables, and granting tables does not give `USAGE` on the schema: both are required. Tables created after the grant need `ALTER DEFAULT PRIVILEGES`.

<!-- section: lake-formation | objectives: 4.2.4 -->
## Managing permissions with AWS Lake Formation

Lake Formation adds database-style grants on Data Catalog resources and the S3 data under them. Integrated engines (Athena, Redshift Spectrum, Amazon EMR, Glue ETL) ask Lake Formation for temporary credentials scoped to what the principal may read: **credential vending**.

**Default state**: for compatibility with Glue, the group `IAMAllowedPrincipals` has `Super` on existing resources and "Use only IAM access control" is on for new ones, so only IAM policies apply. To enforce Lake Formation, clear these defaults for new resources, revoke `IAMAllowedPrincipals` on existing ones after granting the principals, or use **hybrid access mode** to opt in principals gradually while others keep IAM access.

**Registering a location**: register the S3 path (it includes all subfolders) with the service-linked role, or with a user-defined role when the location is in another account, is encrypted with the AWS managed key `aws/s3`, or is read by Amazon EMR. The registering administrator needs `iam:PassRole` on a user-defined role.

| Permission | On | Allows |
| --- | --- | --- |
| `CREATE_DATABASE`, `CREATE_TABLE` | Catalog, database | Create metadata |
| `DATA_LOCATION_ACCESS` | Registered S3 location | Create tables that point to it (not read the data) |
| `SELECT` | Table, view | Query data; can be limited to included or excluded columns, or to a data filter |
| `INSERT`, `DELETE` | Table | Write or delete the S3 data through the table |
| `DESCRIBE`, `ALTER`, `DROP` | Database, table | View, change or delete metadata |
| `Super` (`ALL`) | Database, table | Every operation |
| Grant option | Any | Re-grant to others (not with column filtering) |

**Data filters** give fine-grained access with `SELECT`: column-level (included or excluded columns), row-level (a PartiQL `WHERE`-style expression) or cell-level (both). Filters apply only to reads.

```bash
aws lakeformation create-data-cells-filter --table-data '{
  "TableCatalogId": "111122223333", "DatabaseName": "sales", "TableName": "orders",
  "Name": "emea_no_email",
  "RowFilter": {"FilterExpression": "region = '\''EMEA'\''"},
  "ColumnWildcard": {"ExcludedColumnNames": ["customer_email"]}
}'

aws lakeformation grant-permissions \
  --principal DataLakePrincipalIdentifier=arn:aws:iam::111122223333:role/EmeaAnalysts \
  --permissions SELECT \
  --resource '{"DataCellsFilter": {"TableCatalogId": "111122223333",
    "DatabaseName": "sales", "TableName": "orders", "Name": "emea_no_email"}}'
```

| Engine | Lake Formation enforcement |
| --- | --- |
| Athena | Native, including data filters |
| Redshift Spectrum | External schema on the Data Catalog database; Lake Formation grants go to the IAM role of the schema |
| Amazon EMR | Lake Formation integration with runtime roles; the location must be registered with a user-defined role |
| Glue ETL | Jobs read with the job role's Lake Formation permissions |

Cross-account sharing grants to another account (or an organization) through AWS RAM; the consumer's data lake administrator re-grants locally and creates resource links.

> **Exam trap.** Granting Lake Formation `SELECT` changes nothing while `IAMAllowedPrincipals` still holds `Super` on the table: every principal with IAM access keeps full access. Revoke that default for the protected resources.

<!-- section: authorization-models | objectives: 4.2.5 -->
## Role-based, tag-based and attribute-based authorization

| Model | How it works on AWS | Fits |
| --- | --- | --- |
| Role-based (RBAC) | Permissions attached to IAM roles, Redshift roles or Lake Formation named grants; users get roles | Few stable job functions |
| Tag-based (LF-TBAC) | LF-Tags (key with allowed values) assigned to databases, tables and columns; grants on tag expressions | Many tables and principals; new tables governed by tagging them |
| Attribute-based (ABAC) | IAM policies compare principal tags with resource tags or request tags | Many teams and projects; permissions follow tags without policy edits |

**LF-Tags** are inherited (database to tables, tables to columns) and can be overridden. Granting every principal access to every resource takes principals × resources named grants, but principals + resources operations with one tag. IAM tags and LF-Tags are different objects.

```text
# LF-TBAC pseudo-code: tag the resources, then grant on a tag expression
ASSIGN TAGS domain=finance         TO DATABASE finance_db
ASSIGN TAGS sensitivity=public     TO TABLE finance_db.payments
ASSIGN TAGS sensitivity=restricted TO COLUMN finance_db.payments.card_number
GRANT (SELECT ON TABLES) ON TAGS domain=finance AND sensitivity=public TO FinanceAnalysts
# card_number overrides the inherited value, so FinanceAnalysts cannot read it
```

**ABAC** with IAM: a session tag from the identity provider (or a tag on the role) is compared with the resource's tag, here Glue jobs tagged with a project:

```json
{
  "Effect": "Allow",
  "Action": ["glue:StartJobRun", "glue:GetJobRun", "glue:GetJobRuns"],
  "Resource": "arn:aws:glue:eu-west-1:111122223333:job/*",
  "Condition": {
    "StringEquals": { "aws:ResourceTag/project": "${aws:PrincipalTag/project}" }
  }
}
```

> **Exam tip.** "Hundreds of tables, new ones every week, access by data domain and sensitivity, minimal administration" is LF-TBAC. "Engineers get access to the resources of the project they belong to, without changing policies when projects are added" is ABAC with `aws:PrincipalTag` and `aws:ResourceTag`.

<!-- section: least-privilege | objectives: 4.2.6 -->
## Building least-privilege policies

1. **Start from what is used.** IAM Access Analyzer **policy generation** reads CloudTrail (a trail is required) for a user or role over up to 90 days and drafts a policy; it does not list S3 data-event actions or `iam:PassRole`, which you add by hand.
2. **Name actions**, not `service:*`; **name resources** down to the prefix, table or key ARN.
3. **Add conditions**: `aws:SourceVpce`, `aws:RequestedRegion`, `aws:PrincipalOrgID`, `kms:ViaService` (key used only through S3 or Glue), `s3:prefix`, `iam:PassedToService`.
4. **Cap with guardrails**: permissions boundaries for roles that developers create, SCPs for accounts.
5. **Review**: Access Analyzer policy validation (errors, warnings, suggestions), unused access findings, last accessed information to remove permissions.

```json
{
  "Effect": "Allow",
  "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
  "Resource": "arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
  "Condition": {
    "StringEquals": { "kms:ViaService": "s3.eu-west-1.amazonaws.com" }
  }
}
```

> **Exam trap.** Least privilege is not "attach the AWS managed read-only policy": `AmazonS3ReadOnlyAccess` reads every bucket in the account. Scope actions and resources to the pipeline's prefixes.

<!-- section: key-points -->
## Key points

- Customer managed policies when AWS managed ones are too broad; explicit deny wins; SCPs and boundaries cap permissions; `ListBucket` on the bucket ARN, object actions on `bucket/*`.
- Secrets Manager for rotated database credentials (Glue connections, Redshift Data API `--secret-arn`), Parameter Store for configuration; `kms:Decrypt` on the customer managed key too.
- Redshift: roles (RBAC) and system roles, `USAGE` on schema plus table grants, `ALTER DEFAULT PRIVILEGES`, column grants, RLS policies; IAM temporary credentials instead of passwords.
- Lake Formation: revoke `IAMAllowedPrincipals` or use hybrid mode, register locations (user-defined role for EMR, `aws/s3` or cross-account), grant `SELECT` with column lists or data filters (row, cell), share through AWS RAM.
- RBAC for stable job functions, LF-TBAC for many catalog resources, ABAC with principal and resource tags for many projects.
- Least privilege: Access Analyzer policy generation (90 days, trail required), named actions and resources, conditions, boundaries, unused access review.
