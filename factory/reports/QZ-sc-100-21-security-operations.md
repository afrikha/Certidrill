# QZ-sc-100-21-security-operations — report

File: `content/sc-100/quizzes/21-security-operations.yaml` (10 questions, `sc100-qz-21-01` to `-10`). Check: `npx tsx factory/check-quiz.ts sc-100 21-security-operations` → 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (Q1, Q8), 2.1.2 (Q2, Q5), 2.1.3 (Q3, Q9), 2.1.4 (Q10), 2.1.5 (Q4, Q7), 2.1.6 (Q6). Formats 6–10: ordering, single, yesno_statements, single, multi.

## Verified on Learn (fetched 2026-11-24)
- Defender XDR integration with Sentinel: standalone alert connectors (MDE, MDO, MDI, MDA alerts, Entra ID Protection) disconnected at onboarding; Microsoft incident creation rules turned off; correlation engine names incidents (rules matching on names may break, use tags); advanced hunting events can be streamed and kept beyond 30 days.
- Sentinel onboarding to the Defender portal: tenant-based Defender for Cloud connector streams correlated incidents to the primary workspace; disconnect the subscription-based (legacy) connector from all workspaces.
- Purview Audit: Standard 180 days; Premium 1 year for Entra ID/Exchange/OneDrive/SharePoint; retention policies by service/activity/user up to 1 year (10 with add-on); Teams `MessageRead` etc.; enabled by default.
- Defender for Identity overview, SOC optimization (data value + coverage recommendations), Sentinel data lake (12 years, notebooks/KQL jobs promote to analytics tier), MITRE ATT&CK page (preview, v18), Defender for IoT alerts (MITRE tactics/techniques in the Azure portal).
- Attack disruption: exclusions (users, device groups via automation level, IPs); configure page states Semi automation still allows attack disruption without approval, and No automated response excludes the group.

## Not verified / doubts
- GA status of the tenant-based Defender for Cloud connector (Q9) and of SOC optimization (Q4): the fetched pages don't label them preview, but don't say GA either.
- Q7 relies on the chapter's "analytics retention up to 2 years" (Log Analytics interactive retention); not re-fetched. "Livestream" (distractor) is a Sentinel hunting feature documented for the Azure portal.
- Q10's Semi-automation trap rests on one sentence of "Configure automatic attack disruption"; the fetch tool itself flagged it as counterintuitive. Worth a recheck before publishing.
- Defender for IoT alerts page says "MITRE ATT&CK tactics and techniques" without naming the ICS matrix; Q6 doesn't claim more than that.

## Chapter (and mock bank) vs current Learn
- **AIR change**: "Automation levels in automated investigation and remediation" now says that from September 1, 2026, AIR no longer runs as a separate investigation experience or can be triggered manually; its capabilities are part of the default antivirus stack. The chapter's SOAR table ("AIR, governed by the automation level of device groups"; "Remediate malicious files on servers → AIR with full automation") and mock question `sc100-2a-automation-layers` (AIR target) should be reviewed. The quiz avoids AIR as a correct answer.
- **Playbook managed identity**: "Authenticate playbooks to Microsoft Sentinel" labels managed identity authentication of the Sentinel connector **(Preview)**; the chapter recommends it as the playbook design without the caveat. The quiz doesn't test it.
- **MSSP / Azure Lighthouse**: the onboarding page says GDAP with Azure Lighthouse isn't supported for Sentinel data in the Defender portal (use Microsoft Entra B2B). The chapter recommends Azure Lighthouse for multi-tenant MSSP management without this caveat — to update now that Sentinel moves to the Defender portal.
- The chapter calls the MITRE ATT&CK page "preview" correctly; mock questions `sc100-2a-simulated-coverage` and `sc100-2a-coverage-table` make a preview feature (simulated coverage) the correct answer, which conflicts with the "no preview as correct answer" rule.
