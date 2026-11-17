# K-sc-100-sr2 — report

5 Yes/No series (15 series_yesno questions), prefix `sc100-sr2`, all `status: draft`.

| Series | Objective | Domain | Answers (order 1-2-3) | Difficulty |
| --- | --- | --- | --- | --- |
| sc100-sr2-zt-remote-work | 1.2.4 | best-practices | No / No / Yes | 1 / 2 / 1 |
| sc100-sr2-guest-reviews | 2.3.6 | operations-identity | Yes / No / No | 2 / 1 / 3 |
| sc100-sr2-web-filtering | 3.4.2 | infrastructure | No / Yes / No | 1 / 2 / 2 |
| sc100-sr2-dlp-card-numbers | 4.1.4 | apps-data | No / Yes / No | 2 / 2 / 2 |
| sc100-sr2-storage-entra-auth | 4.3.6 | apps-data | No / No / Yes | 3 / 1 / 2 |

Mix: 5 easy, 8 medium, 2 hard. Validator: 20 files, 0 problem(s).

## Notes and doubts

- The WebFetch budget (shared by all agents) ran out during the task. Every reference was fetched, but some facts were not re-checked on Learn:
  - Endpoint DLP action wording "upload to restricted cloud service domains" (sc100-sr2-dlp-3): from memory.
  - The storage account setting that disallows anonymous blob access (sc100-sr2-stg-3): from memory; the fetched Shared Key page confirms that anonymous requests still succeed when Shared Key is disallowed.
  - That the "All Microsoft 365 groups with guest users" recurring review picks up groups created after the review (sc100-sr2-ar-1): the fetched page says it creates recurring reviews of all guests across Teams and Microsoft 365 groups; inclusion of new groups at each recurrence is inferred.
- sc100-sr2-ar-3: Learn does not state the recommendation given to an active guest; the explanation says such a guest "can be" approved (only inactivity over 30 days triggers a Deny recommendation), which is enough for the No answer.
- Zero Trust business scenario names are kept in English in French texts (as in course chapter 12), because the fr-fr names were not verified.
- Overlap avoided on purpose: immutable vault + Resource Guard is already tested by sc100-cs2a-backup-guard, so the best-practices series uses 1.2.4 instead of 1.1.2/1.1.3. Series sr1 (parallel task) may choose some of the same objectives.
