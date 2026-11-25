# QZ-sc-500-21-storage-security — notes

`content/sc-500/quizzes/21-storage-security.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.1.1 (q1, q5, q9), 2.1.2 (q3, q6), 2.1.3 (q4, q8), 2.1.4 (q2, q7, q10). Positions 6–10: yesno_statements ×2, single, dropdown (Bicep), hotarea.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Minimum TLS**: the Learn page (updated 2026-10-26) is inconsistent. It says Azure Storage "supports two versions of the TLS protocol: 1.2 and 1.3" and permits "TLS versions 1.2 and above", but also that an account whose `MinimumTlsVersion` isn't set (CLI, PowerShell, templates) accepts TLS 1.0 and later. The chapter keeps the second statement. Check the TLS 1.0/1.1 retirement status before keeping it. I didn't test TLS in the quiz.
- **Cross-tenant replication**: since December 15, 2023, `AllowCrossTenantReplication` defaults to false for new accounts. The chapter lists "Disallow cross-tenant object replication" as a hardening step without this default; it matters only for older accounts (q5 uses one created in 2022).
- **Malware scanning limits**: Learn also says that legacy v1 accounts, blobs uploaded with NFS 3.0 and client-side encrypted blobs aren't scanned, the cap can overshoot by about 20 GB, and it resets at midnight UTC at month end. A subscription-level cap is allocated to each account (q8 s3). The chapter could add these.
- **Cap alerts at 75 % and 100 %**: not found on the on-upload malware scanning page or the Defender for Storage introduction. Unverified.
- **Defender for Storage (classic)**: Learn says to migrate to get current features and pricing; no retirement date found. The migration page couldn't be fetched (fetch budget), so q4 relies on the introduction page only.

## Mock-exam question to review

- `sc500-2a-fw-statements` s2 says the trusted services exception remains in effect when public network access is Disabled (answer Yes). The "Set the default public network access rule" page only says Disabled blocks traffic from all networks and permits access only through a private endpoint. I couldn't find a statement that exceptions still apply. Please check it.

## Doubts

- q9: the property `encryption.identity.userAssignedIdentity` is given the identity's resource ID (`uami.id`), as in Learn's CMK examples. I couldn't fetch the template reference section that describes this property. It isn't a slot, but it's shown in the template.
- q10: Storage Account Contributor (`Microsoft.Storage/storageAccounts/*`) may be able to request a user delegation key, but it holds no data action, so its SAS would grant nothing. The answers don't depend on this.
- q5: the option reuses the setting name "Allow cross-tenant replication", which echoes "another tenant" in the stem. I kept it because it's the real portal name.
- The WebFetch budget ran out during this task. All references are pages I fetched, except the titles of `account-encryption-key-create` (title from the fetch) and `templates/microsoft.storage/storageaccounts` (fetched; title as used in the bank).
