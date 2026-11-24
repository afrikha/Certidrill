# QZ-sc-200-22-xdr-incidents — notes

`content/sc-200/quizzes/22-xdr-incidents.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.1.7 (q2, q4, q6, q8), 2.1.8 (q1, q7), 2.1.9 (q3, q10), 2.1.10 (q5, q9). Positions 6–10: single ×2, multi, dropdown (text), dropdown (KQL).

## Chapter vs current Learn (fix in the chapter, not done here)

- **Blast radius analysis is restricted.** The Defender "Investigate incidents (Legacy)" page says that it is available only to customers who onboarded to the Sentinel data lake **before September 23, 2026**. The chapter, and the mock questions `sc200-2b-cx-blast-radius` and `sc200-2b-cx-blast-radius-permission`, present it as generally available whenever the tenant is onboarded to the data lake. The page also no longer describes a "Group similar nodes" feature. The graph filters are severity, status and service sources. It also gives no risk ordering for the Assets tab. Both items in the chapter's table should be checked.
- **Similar incidents is preview** ("Transition your Microsoft Sentinel environment to the Defender portal"). The chapter's Azure portal table doesn't say so.
- **Incident page now "(legacy)".** "Manage incidents" and "Investigate incidents" are titled (legacy). They say that incident cases are the recommended experience and that the legacy page stays available during the incident cases preview. Legacy incidents accept one user **or group** as owner. Assigning an incident also assigns its alerts. The chapter mentions neither point.
- **Preview features as correct answers in the mock exam:** `sc200-2b-cop-defender-chat` (Defender Chat, preview) and `sc200-2c-case-incident-resolve` (incident cases, preview).
- **Copilot in advanced hunting**: the page "Microsoft Security Copilot in advanced hunting" now has a prerelease notice. It describes a threat hunting assistant with "Rich insights" and "Query only" modes. The chapter's "Generate KQL queries" row may need an update.
- Cases: deleting a case, linking indicators and attaching files to comments are preview (cases-overview). The chapter labels the last two. Case deletion isn't mentioned, which is fine.

## Not verified / doubts

- q2: the French classification labels (« Vrai positif », « Faux positif », « Activité informationnelle attendue », « Non défini ») come from the chapter. I didn't check them on fr-fr Learn.
- q3: the IdentityLogonEvents page says `DeviceName` is the "FQDN of the device" without saying source or destination. The question assumes that it is the device the authentication came from, and `DestinationDeviceName` is the domain controller.
- q4 s1 ("might run several minutes after"): based on "up to 10 minutes" from the transition page.
- q6: Ana's permission to run the playbook is stated in the stem (the playbook ran an hour earlier), so the distractors on Playbook Operator and Automation Contributor rest on that.
- q10: the `join kind=leftanti` baseline pattern is general KQL (join operator page), not taken from a Defender page.

## Design notes

- I avoided the mock decisions. The new decisions are: Copilot file analysis, the red team classification, IdentityLogonEvents without MDE, the automation rule delay, the provider name and alert resolution, a case owner plus task owners, the "not yet synchronized" playbook message, the Phishing Triage Agent versus a tuning rule or an automation rule, playbook procedures that break after onboarding (entity runs, alert removal from playbooks), case archiving (Contributor for statuses, Responder for updates) and a leftanti lateral movement hunt.
- No preview feature is a correct answer.
