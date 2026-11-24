# QZ-sc-500-42-sentinel-workspace

File: `content/sc-500/quizzes/42-sentinel-workspace.yaml` (10 questions, `sc500-qz-42-01`…`10`, draft). Check: `0 problem(s), 0 warning(s)`.

- Positions/objectives: 1 4.2.1 (d1 single), 2 4.2.2 (d1 single), 3 4.2.3 (d2 single), 4 4.2.9 (d2 single), 5 4.2.8 (d2 single), 6 4.2.1 (d3 single), 7 4.2.1 (d3 yesno), 8 4.2.2 (d3 dropdown), 9 4.2.8 (d3 multi), 10 4.2.9 (d3 single).
- The mock questions of 4.2.1/2/3/8/9 (including cs1a, cs3b, sr1, sr2) were read; the quiz tests other decisions (Defender portal connection path, Security Operator for data lake jobs, whole-solution install, Basic plan fixed window, stateless Standard workflow, UAA at subscription for a secondary workspace, primary vs secondary behaviour, analyst roles Responder + Playbook Operator, Defender-portal automation facts, KQL job promotion from the data lake).

## Sources fetched (2026-11-24, en-us)

unified-secops/microsoft-sentinel-onboard, sentinel/workspaces-defender-portal, sentinel/roles, sentinel/automate-incident-handling-with-automation-rules, sentinel/automation/automate-responses-with-playbooks, sentinel/automation/logic-apps-playbooks, sentinel/manage-data-overview, sentinel/sentinel-solutions-deploy, azure-monitor/logs/data-retention-configure.

## Chapter points to review against Learn

- **Primary workspace onboarding**: the multiple-workspaces table reads "At least a Security Administrator in Microsoft Entra ID; Owner (unconditional); OR User Access Administrator and Microsoft Sentinel Contributor", and the onboarding page presents them as alternatives, adding that Security Administrator is required when the tenant has more than one Sentinel workspace. The chapter (and its Exam trap) says Security Administrator **plus** Owner or UAA + Sentinel Contributor. Ambiguous; not tested (Q6 uses the secondary-workspace rule, which is unambiguous).
- **Playbook templates** are labelled "(preview)" on the playbooks page; the chapter's content hub table presents "Create playbook" from templates without that caveat.
- **Running playbooks**: the playbooks page also says "Running playbooks also requires Logic App Contributor on the resource group", which conflicts with the roles page (Playbook Operator to run; recommended analysts = Responder + Playbook Operator). Q8 follows the roles page.
- **Alert trigger**: Learn's note also lists Microsoft security analytics rules besides Scheduled and NRT; Defender XDR alerts aren't available as alert trigger in the Defender portal (an "Enhanced Alert Trigger" is mentioned; Simple Flows actions are preview). The chapter says Scheduled and NRT only.
- **Data lake mirroring cost**: the chapter says analytics data is available in the lake "without extra charge"; manage-data-overview states free storage explicitly only for XDR data when total = analytics retention. The same page is inconsistent on the analytics default (30 days vs "90 days for Microsoft Sentinel").
- **CLI limit**: `--total-retention-time` of `az monitor log-analytics workspace table update` supports up to 2,556 days; 12 years needs the portal, REST or PowerShell. Not in the chapter; relevant if a question uses the CLI for more than 7 years.

## Doubts

- Q10: KQL jobs promoting data-lake data to an Analytics tier table on a schedule (daily) comes from manage-data-overview ("scheduled KQL or Spark jobs", "KQL and notebook jobs can promote data to the analytics tier"); the KQL jobs page itself wasn't fetched.
- Q4: switching a table from Basic to Analytics is stated on manage-data-overview (Defender portal management); plan-switch frequency limits not checked.
- French: aligned with the chapter (data lake kept in English, « niveau d'analyse », « travail de recherche », « travaux KQL », translated portal paths « Système > Paramètres > Microsoft Sentinel > Connecter un espace de travail », « Données et connecteurs », « Gérer », « Installer/Mettre à jour »). The writing guide prefers portal labels in English; the chapter translates them — to harmonise.
