# QZ-sc-200-21-xdr-workloads — end-of-chapter quiz, SC-200, chapter 21-xdr-workloads

File: `content/sc-200/quizzes/21-xdr-workloads.yaml` (10 questions, draft). Check: `npx tsx factory/check-quiz.ts sc-200 21-xdr-workloads` → 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (q1, q7), 2.1.2 (q4, q9), 2.1.3 (q2), 2.1.4 (q5, q6), 2.1.5 (q10), 2.1.6 (q3, q8). Positions 6–10: single, dropdown, dropdown, dropdown, dragdrop.

Pages fetched (2026-11-24): automatic-attack-disruption, autoad-results, remediate-malicious-email-delivered-office-365, manage-respond-alerts (Defender for Cloud), concept-integration-365 (Defender for Cloud in Defender XDR), defender-for-identity remediation-actions, dlp-investigate-alerts-defender, defender-cloud-apps investigate-anomaly-alerts, entra id-protection howto-identity-protection-remediate-unblock, advanced-hunting-schema-tables, advanced-hunting-cloudprocessevents-table.

## Preview features used as current by the chapter and the mock exam (not edited)

The advanced hunting schema page marks as **Preview**: `BehaviorInfo`, `DisruptionAndResponseEvents`, `CloudProcessEvents`, `CloudStorageAggregatedEvents` (`CloudAuditEvents` is GA). Concept-integration-365 names the connector **Tenant-based Microsoft Defender for Cloud (Preview)**. The chapter doesn't flag them. Mock-exam questions whose correct answer is one of them:
- `sc200-2a-disruption-hunting-table` (DisruptionAndResponseEvents),
- `sc200-2a-dlp-behaviors-table`, `sc200-2a-kql-behavior-files`, `sc200-2a-purview-hunting-tables` (BehaviorInfo / BehaviorEntities),
- `sc200-2a-mdc-sentinel-duplicates` (tenant-based connector).
The quiz avoids all of them as correct answers.

## Chapter out of date or imprecise against current Learn

- **Attack disruption, "release a user only after resetting credentials"** (exam trap): not found on autoad-results or the main page; Learn only says to assess the risk and complete the investigation before releasing (enable user / release from containment). Disable user in Microsoft Entra ID is described for **cloud-only** accounts (Microsoft-managed app "Microsoft Defender for Identity"); the chapter says "synced or cloud accounts".
- **Defender for Cloud Apps alert names**: Learn says *Suspicious inbox forwarding* became *Suspicious email forwarding rule created by third-party app*, and *Suspicious inbox manipulation rule* was disabled and migrated (can be re-enabled on Policy management). The chapter table still lists both as current alerts.
- **Misleading OAuth app name**: Learn says you can ban the app from the App governance page on the **Google or Salesforce** tab; `sc200-2a-mdca-ban-oauth` places the scenario on the Microsoft 365 connector. Worth a check.
- **DLP alerts in the Defender portal**: the 6-month incident retention isn't on the fetched DLP page; Learn adds that `CloudAppEvents` requires connecting Microsoft 365 to Defender for Cloud Apps. The Source tab role isn't named on the page (only Download → Data Classification Content Viewer).
- **Email remediation**: Learn adds limits absent from the chapter (selected recipients must be at least 40% of the message count, otherwise max 1,000 messages to a single recipient; no new remediation while an active one exceeds 1 million messages). Not used.
- **ID Protection**: Learn also lists *Require Identity Verification* (preview). Not used.

## Facts used in the quiz that rest on inference or general knowledge

- q8: a cloud-side *Disable* on a synchronized user is overwritten by the next Microsoft Entra Connect sync (consistent with the chapter's MDCA exam trap; not on a fetched page); a hybrid identity page listing both the AD and Entra ID accounts is assumed.
- q10: *Require password change* keeps the state **At risk** until the user completes MFA and the change (Learn table: At risk → Remediated with "User performed secure password change"). Risk state names kept in English.
- q6: Learn's TP action is "Revoke all access tokens of the OAuth app and investigate whether an attacker can generate OAuth access tokens"; the exact governance control isn't described.
- q9: the Insider Risk Management role group requirement comes from the chapter (IRM integration page not fetched in this session).
- q1: the incident queue filter by tag is assumed (Learn: tag shown in queue and incident page).

## French

UI labels follow the chapter (Centre de notifications, Historique, En attente, Prendre des mesures, Afficher tous les détails); "Explorateur de menaces > Campagnes" and "Envois (Submissions)" not checked on fr-fr pages.
