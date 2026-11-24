# QZ-dp-300-22-data-protection — notes

`content/dp-300/quizzes/22-data-protection.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.2.1 (q1, q6, q10), 2.2.2 (q5), 2.2.3 (q2), 2.2.4 (q3, q7), 2.2.5 (q8), 2.2.6 (q4, q9). Positions 6–10: single, dragdrop, ordering, single, multi.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Losing the TDE protector.** The BYOK page now says that a database starts to deny connections and goes **Inaccessible "in up to 10 minutes"**. A 4XX Key Vault error moves it to Inaccessible after 30 minutes, and a 5XX (network) error gets a 24-hour buffer. The chapter says "after about 30 minutes". The 30-minute auto-recovery window is still correct.
- **Manual recovery** is now described step by step: fix the cause, then on the Transparent data encryption page select **Retry existing key** and **Validate key**. It needs the **original** key, and a new key version doesn't help. After recovery, some settings can be lost: failover groups, tags, elastic pool configuration, read scale, auto-pause, PITR history and LTR policies. The chapter only says "revalidated manually".
- **Key types.** Learn now lists **symmetric AES keys** (128, 192 and 256 bits, in Key Vault Premium or Managed HSM) for Azure SQL Database only, and **recommends AES-256 for new TDE protectors**. Automatic rotation doesn't change the key type. The chapter says only "RSA or RSA-HSM (2,048 or 3,072 bits)". The mock series `dp300-sr2-tde-protector-*` (RSA 4,096 = No) is still right. Learn also mentions versionless key identifiers (SQL Database only).
- **Geo-replication with CMK.** Learn: if the servers use different keys, add both keys to both servers before you create the link or failover group, and give both servers permissions on every vault that holds a required key (used in q10). The chapter's sentence is correct but short.
- **Redirect through a private endpoint.** Learn asks for inbound 1433–65535 to the VNet of the endpoint **and** outbound 1433–65535 from the client VNet. Redirect works with ODBC, OLE DB, .NET SqlClient and JDBC 9.4 or later; other drivers are proxied. Existing private endpoints on the **Default** policy use Proxy on 1433. The chapter could add the last two points.
- **Minimum TLS.** Learn: TLS 1.3 can be enforced, and once a minimum is enforced you can't go back to the default. The chapter is correct otherwise.
- **Always Encrypted limits.** Learn's list of unsupported items is longer than the chapter's. It adds `vector`, `hierarchyid`, `image`, `ntext`, `text`, `timestamp`, computed, sparse and partitioning columns, columns masked by DDM, `FOR XML`/`FOR JSON`, table-valued parameters and distributed queries. The chapter isn't wrong, only shorter.

## Doubts / not verified on a fetched page

- q8: Learn ("Configure column encryption in-place") allows in-place re-encryption with "a new encryption type" when both keys are enclave-enabled. It doesn't spell out deterministic to randomized. The rotate page says that replacing a non-enclave-enabled key with an enclave-enabled one "unlocks" enclave queries. It uses the generic word "key", but this is how CEK1 becomes enclave-enabled after the CMK rotation. A reviewer should confirm this path.
- q9: the 11000–11999 range (distractor) comes from the connectivity architecture page. I fetched it but couldn't read its title, so it isn't cited.
- q4/s3 and q9/c rely on the Private Link page: logins with the privatelink FQDN or the private IP fail by design.
- The connectivity settings page says "Deny public network access: the default is Disable". That's ambiguous, so I didn't use it.
- Mock question `dp300-2b-tde-enable-tsql` uses the unquoted option id `on`. A YAML 1.1 parser reads it as a boolean (`true`). The repo's YAML 1.2 parser is fine, but quoting it would be safer.

## Design notes

These decisions aren't in the mock bank: `master` not encrypted, NSG (not firewall rules) for MI, literal vs parameter (error 206), column-level encryption when T-SQL must decrypt, private endpoint facts (public access not blocked, Private access tab, no privatelink FQDN), revalidating the key after more than 30 minutes, the Always Encrypted role separation tasks, a CMK rotation that makes an existing CEK enclave-enabled, Redirect ports through a private endpoint, and keys plus permissions on both servers before a failover group.
