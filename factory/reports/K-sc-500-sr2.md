# K-sc-500-sr2 — CASES, SC-500, 5 Yes/No series

All 20 files written in this run (5 series + 15 questions).
Check: `CERT=sc-500 npx tsx factory/validate.ts --prefix sc500-sr2` -> 20 files, 0 problem(s).

| Series | Domain / objective | Answers (1-2-3) | Difficulty |
| --- | --- | --- | --- |
| sc500-sr2-backup-mua | identity / 1.3.8 | No, No, Yes | 1, 3, 2 |
| sc500-sr2-avnm-deny | data-networking / 2.3.2 | Yes, No, No | 2, 2, 1 |
| sc500-sr2-host-encryption | compute / 3.2.1 | No, Yes, No | 2, 3, 1 |
| sc500-sr2-ai-alerts | compute / 3.1.8 | No, No, Yes | 1, 2, 2 |
| sc500-sr2-signin-retention | posture / 4.2.9 | Yes, No, No | 2, 2, 3 |

Mix: 4 easy, 8 medium, 3 hard. Compute has two series (3.1 and 3.2 groups) because there are 5 series for 4 domains.

## Points to review

- **Overlap with K-sc-500-sr1**: its series did not exist when this batch was written; check that the two batches do not use the same objectives or decisions.
- **Backup MUA**: built on the how-to page (Resource Guard in the same region as the vault, Reader for the backup admin, eligible Backup MUA Operator in PIM with approvers, all protected operations enabled by default). Questions 2 and 3 differ only by the Resource Guard region (deliberate trap). The page names no built-in role for the security admin, so the series names none.
- **AVNM**: dynamic membership is described as "Azure Policy with a tag condition"; the Learn example of the `addToNetworkGroup` policy matches on `Name`, not on tags. Tag conditions are standard Azure Policy fields but are not shown on the AVNM page. The instance "Security Admin feature" label was not checked on a Learn page.
- **Encryption at host**: temp disk is encrypted with platform-managed keys only; the requirements ask only for "encrypted at rest" for the temp disk, so the Yes holds. Portal path for enabling on an existing VM (Disks > Additional settings) is taken from the disable procedure on the same page.
- **Defender for AI Services**: Learn does not state the default of "Suspicious prompt evidence"; the No/Yes answers do not depend on it. The portal label is given as "Suspicious prompt evidence" (Learn also says "user prompt evidence"). The guardrail question relies on Learn saying guardrails return results in the API response and on the threat protection page saying alerts come from the plan; no page says explicitly "guardrails do not create Defender alerts".
- **Sentinel retention**: free 90-day analytics retention for Sentinel tables is from the Sentinel data tiers page; CLI ranges (4–730, up to 2,556) from the CLI reference.
- **French**: portal labels kept in English (Properties, Multi-User Authorization, Manage table, Data retention settings, Suspicious prompt evidence). "Resource Guard" rendered as « protection des ressources (Resource Guard) » as on the fr-fr page.
