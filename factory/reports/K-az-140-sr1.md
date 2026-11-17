# K-az-140-sr1 — report

6 Yes/No series (18 `series_yesno` questions), prefix `az140-sr1`, all `status: draft`. Validator: 24 files, 0 problem(s).

| Series | Objective | Domain | Answers (order 1-2-3) | Difficulty |
| --- | --- | --- | --- | --- |
| az140-sr1-saas-licensing | 1.3.3 | infrastructure | No / Yes / No | 2-1-3 |
| az140-sr1-profile-auth | 1.2.3 | infrastructure | No / No / Yes | 2-3-2 |
| az140-sr1-mfa-offsite | 2.1.4 | identity-security | No / Yes / No | 2-1-3 |
| az140-sr1-confidential | 2.2.7 | identity-security | No / No / Yes | 2-2-1 |
| az140-sr1-start-vm | 3.2.10 | user-apps | No / Yes / No | 3-2-1 |
| az140-sr1-host-perf | 4.1.1 | monitoring | No / Yes / No | 1-2-2 |

Difficulty mix: 5 easy, 9 medium, 4 hard.

## Notes and deviations

- "Each on a different objective and domain": there are only 4 domains, so the 6 series cover 6 different objectives across all 4 domains (2 infrastructure, 2 identity-security, 1 user-apps, 1 monitoring).
- Created the folder `content/az-140/series/` (did not exist).
- Facts verified on Learn (Nov. 2026): licensing (per-user access pricing, no external use on Windows Server), Azure Files identity sources (AD DS line of sight, Entra DS join, Entra Kerberos prerequisites), Conditional Access app IDs and Windows Cloud Login only with SSO, portal security types and "Confidential compute encryption", Start VM on Connect scope, Insights session host data settings (1,000-host limit).
- Not verified on Learn (general knowledge, low risk): the Log Analytics workspace blade name **Legacy agents management** (host-perf-3) and the exact retirement date of the Log Analytics agent (not stated in the question).
- Parallel task K-az-140-sr2 may pick overlapping objectives; no coordination was possible. Existing case studies already test 2.1.4 (cs3b) and 4.1.6 helpdesk RBAC; the series here test different decisions.
- The FSLogix Entra ID reference uses `https://learn.microsoft.com/en-us/azure/virtual-desktop/create-profile-container-azure-ad` (fetched; Learn now titles it "Store FSLogix profile containers on Azure Files using Microsoft Entra ID").
