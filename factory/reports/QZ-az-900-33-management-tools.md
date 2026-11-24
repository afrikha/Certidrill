# QZ-az-900-33-management-tools — report

File: `content/az-900/quizzes/33-management-tools.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).
Objectives: 3.3.1 (q5), 3.3.2 (q1, q3), 3.3.3 (q4, q7), 3.3.4 (q10), 3.3.5 (q2, q6, q8, q9). Formats 6–10: dragdrop, multi, yesno_statements, dropdown, single.

## Facts verified on Learn (fetched 2026-11-24)
- Cloud Shell overview: browser-accessible, authenticated; opened from portal.azure.com, shell.azure.com, the mobile app, VS Code, docs; "permissions of a regular Linux user". Training unit: "inherently knows who you are and what permissions you have".
- Azure mobile app overview: status/health, **start and stop** VMs, Cloud Shell, alerts. Restart isn't mentioned, so q5 uses "stop".
- Arc overview: servers, Kubernetes clusters anywhere, Azure data services (SQL Managed Instance on-premises/edge/other clouds), SQL Server; Defender for Cloud and Azure Monitor on Arc-enabled servers; projection into Azure Resource Manager.
- ARM overview, ARM templates overview (orchestration in parallel when possible, modular files, deployment scripts), Bicep overview (all resource types, converted to JSON template, idempotent), Azure PowerShell overview.
- Deployment modes: redeploying in incremental mode reapplies all properties (the template is the final state) — basis of q10. The page says complete mode "will be gradually deprecated" in favour of deployment stacks (not in the chapter, not needed at AZ-900).
- IaC page: "To make changes, the team edits the source, not the target."

## Doubts / chapter gaps (chapter not edited)
- q10 (drift) combines the chapter's "declarative = final state / repeatable" with the incremental-mode rule above; the chapter never says that a redeployment overwrites a manual change. One sentence in the IaC or ARM section would make it explicit.
- The chapter pairs Cloud Shell shells with tools ("Bash (with the Azure CLI) or PowerShell (with Azure PowerShell)"); Learn's unit says Cloud Shell supports both tools, and both are preinstalled. Slightly misleading if read as "the CLI is unavailable in the PowerShell experience"; not tested.
- The chapter lists only the portal and shell.azure.com as entry points to Cloud Shell; Learn also lists the mobile app and VS Code (q1 stays correct: its option says "only in the mobile app").
- Glossary: "cmdlet" is `undecided` (« applet de commande » vs « cmdlet »). The FR chapter uses « cmdlets »; the quiz French avoids the word (« commandes PowerShell »). To settle.
- Bank references cite "What is Azure PowerShell" without the "?" of the current H1.
