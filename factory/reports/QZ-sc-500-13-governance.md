# QZ-sc-500-13-governance — notes

`content/sc-500/quizzes/13-governance.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.3.1 (q2, q8), 1.3.2 (q5), 1.3.3 (q7), 1.3.4 (q1), 1.3.5 (q3), 1.3.6 (q9), 1.3.7 (q6), 1.3.8 (q10), 1.3.9 (q4). Positions 6–10: dragdrop, yesno_statements ×2, single, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Regulatory compliance roles**: the chapter says adding a standard needs "Owner or Policy Contributor". The current "Improve regulatory compliance" page says "At a minimum, you need to have Resource Policy Contributor and Security Admin roles assigned", and that the Reader role (not Security Reader) gives access to the compliance data. There is no built-in role named "Policy Contributor". The quiz doesn't test this point.
- **Compliance over time workbook**, greyed-out controls: not found on the regulatory compliance page (it describes manual assessments under "Manual attestation and evidence", and continuous export for history). The chapter's wording may come from an older page.
- **Immutable vault**: Learn now offers two enablement options, "Enable based on backup policy" (default) and "Enable for specific duration" (fixed number of days, retention can be reduced down to that duration). The chapter only describes the policy-based behavior. q10 states the policy-based option explicitly.
- **Backup security levels** (Excellent, Good, Fair, Poor): Learn's page is titled "About Security levels (preview)". The chapter presents them without the preview mark; I didn't test them.
- **Secure score**: Learn (June 30, 2026) says that over 200 AWS and GCP recommendations now contribute to the secure score, and a separate risk-based "Cloud secure score" exists in the Defender portal. The chapter only mentions the MCSB built-in rule.
- **Exemption expiration**: the exemption page says expiry is optional in the Azure portal flow but mandatory in the Defender portal flow, without reconciling them.
- **Elevate access**: the page warns that portal removal of other users' elevated access is rolling out in stages and that the audit log entries are preview. Nothing tested depends on it.
- Confirmed as written: no lock on management groups; locks act on the control plane; Owner and User Access Administrator manage locks; `modify` and `append` are evaluated before `deny`, `denyAction` last and only for `delete`; Deny/Disabled recommendation effects are Azure-only; preview recommendations don't count in the secure score; waiver excludes from the score, mitigated counts as healthy; exemptions don't support custom recommendations; RBAC Administrator has no `roleDefinitions/write`; `/` isn't allowed in `AssignableScopes`; Entra custom roles need Privileged Role Administrator and P1, and built-in Entra roles can't be cloned or modified; MUA mandatory operations are "Disable soft delete or security features" and "Remove MUA protection"; Disable immutability is optional and protected by default.

## Doubts

- Terminology: "secure score" is still `undecided` in `content/glossary.yaml`. q7 writes « score de sécurité (secure score) », as the chapter does. To settle in the glossary.
- q10 s3 assumes that once immutability is disabled, the retention reduction is allowed (Modify policy excluded from MUA). Learn doesn't say whether disabling immutability takes effect instantly.
- q6 (t2) relies on the CIEM 45-day inactivity rule (identity recommendations page); the page doesn't say which plan is needed, the chapter says Defender CSPM.
