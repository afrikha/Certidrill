# K-sc-100-sr1 — report

6 Yes/No series, 18 questions (prefix `sc100-sr1`), validator: 0 problem(s). Difficulty: 5 easy, 10 medium, 3 hard.

| Series | Domain | Objective | Answers (seriesOrder 1-2-3) |
| --- | --- | --- | --- |
| sc100-sr1-shadow-ai | best-practices | 1.3.1 | No (AI-SPM), No (Purview DSPM), Yes (Defender for Cloud Apps + MDE) |
| sc100-sr1-partner-guests | operations-identity | 2.3.6 | Yes (review, Remove access), No (No change), No (PIM for Groups) |
| sc100-sr1-server-events | operations-identity | 2.1.3 | No (Log Analytics agent), No (AWS S3 / CloudTrail), Yes (Arc + AMA + DCR) |
| sc100-sr1-contractor-web | infrastructure | 3.4.2 | No (Microsoft traffic profile), Yes (Internet Access + CA security profile), No (baseline profile) |
| sc100-sr1-personal-phones | apps-data | 4.1.3 | No (compliance policy), Yes (app protection + CA), No (MDCA session control) |
| sc100-sr1-card-sharing | apps-data | 4.1.4 | Yes (PCI DSS template), No (Insider Risk Management), Yes (custom DLP) |

## Doubts and deviations

- 6 series across 4 domains: two domains have two series each (only 4 domains exist).
- I chose objectives that the case studies don't use yet. The one exception is 1.1.2/1.1.3 backup: I skipped it because `sc100-cs2a-backup-guard` already tests the locked immutable vault.
- shadow-ai-3: the Learn page I fetched is "DSPM for AI (classic)", which says a new "Data Security Posture Management" replaces it. The solution names the new product. I couldn't confirm that the new version keeps the third-party AI site visit reports, but the answer (No) doesn't depend on it.
- contractor-web-3: the Learn page is unclear on whether the baseline profile covers client traffic or only remote network traffic. The answer is No either way: if it applies to all traffic, it can't be scoped to one group, and if it doesn't, the contractors aren't filtered.
- server-events-2: the page I fetched calls the Log Analytics agent "legacy" but gives no retirement date (Aug 31, 2024 is well known). The explanation says only that it "is no longer supported".
- partner-guests: the fetched page doesn't list "quarterly" as a recurrence option, so the solution says "recurs every quarter". PIM permanent eligibility and guest eligibility come from my knowledge; the fetched page doesn't cover them.
- The WebFetch budget ran out several times. I waited and retried; every reference URL was fetched.
