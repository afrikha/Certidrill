# QZ-ai-200-41-secrets-configuration — report

Quiz: `content/ai-200/quizzes/41-secrets-configuration.yaml`, 10 questions (`ai200-qz-41-01` to `-10`), checker 0 problem(s), 0 warning(s).

Objectives: 4.1.1 (Q1, Q5, Q6, Q8, Q10), 4.1.2 (Q2, Q3, Q4, Q7, Q9). Positions 6–10: single, yesno_statements, dropdown, dropdown, multi.

Mock-exam questions of 4.1.1–4.1.2 (72 files, including cs1b, cs3a, cs3c, cs4a, sr1 and sr2) were read first. The quiz tests other decisions: a Key Vault certificate for CA-integrated auto-renewal, the default refresh interval (30 s), revision history by tier (7 vs 30 days), a store per environment for isolation (labels and snapshots aren't access boundaries), RBAC as the default model since API 2026-02-01, recovering (not purging) a deleted secret under purge protection, CLI `--auth-mode` (default `key`) vs Owner and Data Reader, a rotation function filtered on `SecretNearExpiry` (no loop on `SecretNewVersionCreated`), selector order + `trim_prefixes` + JSON content type, and data access under the access-policy model (RBAC data roles ignored, Key Vault Contributor self-grant).

## Chapter out of date or wrong against current Learn (not edited)

1. **Order of the single-credential rotation.** The chapter says the function "generates a new password, updates the database, then writes the new version". The Learn tutorial (Rotation tutorial for resources with one set of authentication credentials) does the opposite: the function "generates a new random password, and creates a new version for the secret with the new password in Key Vault", then "updates SQL Server with the new password". It warns that between the two steps the secret in Key Vault can't authenticate, and that Event Grid retries for two hours if a step fails. The chapter's order and its description of the failure window should be aligned with Learn. Not tested.
2. **Key Vault Purge Operator.** The chapter table says "Permanently delete soft-deleted vaults". The soft-delete page also cites it as an example of a role that grants the purge permission on soft-deleted secrets, keys and certificates. Learn is not fully consistent here. Not tested as an answer.
3. **Soft delete "can't be disabled"** is right. The chapter doesn't say whether purge protection can be disabled once enabled, and the soft-delete page I fetched doesn't say either. Q6 doesn't rely on it.
4. **CLI listing default.** The chapter says the CLI uses `--auth-mode key` by default (confirmed). Possibly worth adding: `az appconfig kv list` without `--label` lists **all** labels, while the Python provider without `selects` loads only key-values with **no** label. Not tested.
5. **Mixing a snapshot selector with other selectors.** Neither the chapter nor the provider reference says whether a `SettingSelector(snapshot_name=...)` can be combined with key/label selectors in the same `selects` list (only that `snapshot_name` can't be combined with filters *in the same selector*). I dropped a planned question on this point.

## Unverified / doubts

- Q5: Learn states that RBAC is the default access control model for new vaults starting with API version 2026-02-01, and that setting the RBAC model invalidates access policy permissions. The stem's claim that a Bicep deployment that still defines `accessPolicies` succeeds is an assumption (not documented either way). The question only relies on the policy not granting access.
- Q1: Learn's certificate renewal page states that Key Vault handles end-to-end maintenance (renewal) of DigiCert/GlobalSign certificates and of self-signed ones. The lifetime action details (percentage/days) are on a linked tutorial I did not fetch, so the options avoid action names.
- Q8: the subject of a Key Vault event equals the secret name in the Learn example (Cloud event schema). The quiz uses the Event Grid schema (`func.EventGridEvent.subject`, `event_type`), which I assume carries the same subject.
- Q9: the provider returns non-JSON values as strings (`"5"`), shown as such in the options. The `"\0"` null-label filter follows the provider reference example ("Empty label").
- Q7 s3: Data Reader "doesn't grant access to the App Configuration resource" (Learn), so `--auth-mode key`, which retrieves the access keys, fails for Lee. This inference is consistent with the CLI reference, but no Learn page states it in these exact terms.
- French: « protection contre le vidage » / « vider » for purge protection / purge, « magasin » for store, « clé-valeur », « étiquette » for label, « instantané » for snapshot, as in the chapter.
