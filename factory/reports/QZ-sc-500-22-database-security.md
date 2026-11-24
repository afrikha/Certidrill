# QZ-sc-500-22-database-security — report

File: `content/sc-500/quizzes/22-database-security.yaml` (10 questions; 2.2.1 ×5, 2.2.2 ×3, 2.2.3 ×2). Check: `npx tsx factory/check-quiz.ts sc-500 22-database-security` → 0 problem(s), 0 warning(s).

The 35 mock-exam questions of 2.2.x cover most of the chapter's decisions, so the quiz tests other ones: NSG rule for the MI public endpoint (3342), the Synapse dedicated SQL pool plan, a deleted `SQLSecurityAuditEvents_…` diagnostic setting, error 47072 / minimum TLS, a GPv1 audit account behind a firewall, Entra-only side effects, VA express vs classic roles, the Key Vault trusted-services exception for CMK TDE, a separate MI audit for Microsoft support operations, and CMK keys for failover groups.

## Chapter vs current Learn (Nov. 2026)

- **"Select types" in the Databases plan** (section defender-for-databases): neither "Protect your databases with Defender for Databases" page I fetched (tutorial-enable-databases-plan, quickstart-enable-database-protections) mentions it. They only say that Databases **On** turns on all four plans and that each plan has its own enablement article. I didn't use it in the quiz. Please check it in the portal.
- **TDE protector key types**: the chapter says "RSA or RSA-HSM 2048 or 3072 bits". The current "Azure SQL Transparent Data Encryption with customer-managed key" page also lists **AES (symmetric) keys of 128, 192 or 256 bits** in Key Vault Premium or Managed HSM, for Azure SQL Database only (SQL Managed Instance still needs RSA). The page doesn't say whether AES is in preview. The chapter (and option d of the mock question `sc500-2a-sql-tde-statements`, which is still false for EC keys) may need an update. The page also mentions versionless key identifiers (SQL Database only).
- **TDE inaccessibility timing**: Learn now gives more detail: about 10 minutes after the key access is lost; a 24-hour buffer for intermittent 5XX errors; Inaccessible after 30 minutes for 4XX errors; automatic recovery within one hour if access comes back within 30 minutes; and recovery needs the original key ("Retry existing key" / "Validate key"). The chapter's short summary is still correct.
- **Server auditing re-architecture (GA July 2025)**: server audit logs now go to a single `master` folder in the container, with one server-level extended event session. The chapter doesn't mention it. It isn't wrong, but it could be added.
- **Public network access default**: the Connectivity settings page says **Disable** is the default. The chapter doesn't state a default.
- **VA express configuration for SQL Managed Instance** needs a system-assigned managed identity (Learn). The chapter doesn't mention it.
- **Microsoft support operations on MI**: Learn warns that turning the option on for an existing audit overwrites that audit, which then logs only support operations. The chapter only says "separate server audit". Q9 relies on the Learn wording. The Learn sample also has a wrong comment ("without OPERATOR_AUDIT ON" above code that sets it ON).

## Doubts

- Q5: the option "Upgrade to general-purpose v2" follows the prerequisite on "Write audit to a storage account behind VNet and firewall". Learn doesn't describe the exact failure symptom (a save error).
- Q6 option e: the chapter says only that the Entra admin is a prerequisite. The fact that you can't remove the admin while the feature is on comes from the Entra-only Learn page.
- Q7: Learn writes "security admin (for the new unified API)" for changing express settings. I took Security Admin as enough, as the chapter does.
- Q9 distractor categories `ResourceUsageStats` and `Errors` are real SQL MI diagnostic categories as far as I know. I didn't fetch a page that lists them.
