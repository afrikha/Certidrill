# QZ-sc-100-23-privileged-access — report

File: `content/sc-100/quizzes/23-privileged-access.yaml` (10 questions; `npx tsx factory/check-quiz.ts sc-100 23-privileged-access` → 0 problem(s), 0 warning(s)).

Coverage: 2.3.2 (q1, q8), 2.3.7 (q2, q6), 2.3.1 (q3, q9), 2.3.4 (q4), 2.3.5 (q5), 2.3.3 (q7), 2.3.6 (q10). Formats 6–10: multi, dragdrop, yesno_statements, multi, yesno_statements.

The mock bank has 52 questions on 2.3.x; the quiz tests other decisions: separation of duties (incompatible access packages), PAW provisioning with Autopilot, RBAC Administrator with an ABAC condition, elevate access persisting after PIM deactivation, CIEM vs PIM vs access reviews, intermediaries (Bastion portal level, second person in PAM), Credential Guard / DCSync / AD CS templates, PIM security alerts, escalation paths (app owners with RoleManagement.ReadWrite.Directory, GPOs on the DC OU), PIM role review mechanics.

## Facts verified on Learn (fetched 2026-11-24)
- Incompatible access packages (one-way, block requests and admin assignments); delegation with conditions (roles, principal types); elevate access (UAA at `/`, persists, PIM deactivation doesn't reset the toggle); CIEM identities per cloud and recommendation categories; PIM alerts (outside-PIM = High; Global Administrator alert needs both number and percentage); Helpdesk Administrator can't reset Global Administrator passwords; Security Operator limited to non-admin accounts; Credential Guard (NTLM hashes, TGTs, not on DCs); intermediaries page (Bastion portal security level, second person in business-critical workflows, PAM doesn't fix device risk, direct RDP to be converted); PIM role reviews (role-assignable groups not expanded, denied users not removed from groups in Azure role reviews, service principals need Workload ID Premium).

## Not verified on a fetched page (from knowledge or the chapter)
- q9: owners of an app registration can add credentials; RoleManagement.ReadWrite.Directory lets an app assign any directory role, including Global Administrator; GPOs linked to the Domain Controllers OU control the DCs.
- q7: DCSync relies on replication rights (Replicating Directory Changes All); template "enrollee supplies subject" abuse. The fetched MDI page only names "misconfigured certificate templates".

## Chapter 23 vs current Learn
- PAW section: TPM 2.0, Secure Boot and VBS requirements are not on "Deploying a privileged access solution" (last updated 2024-06, still mentions Windows 10 and a Self-Deploying (Preview) Autopilot mode); find the current source.
- Access reviews section: "a second reviewer stage for privileged roles" — the PIM role review page describes no multi-stage option (multi-stage exists for group/app reviews). Probably inaccurate for PIM roles: check and fix.
- Access reviews section doesn't mention, though q10 tests it (inside 2.3.6): role-assignable groups aren't expanded in Entra role reviews, denied users aren't removed from groups in Azure role reviews, service principal reviews need Workload ID Premium. Worth adding.
- PIM section: the "too many Global Administrators" alert criteria (number and percentage) aren't in the chapter (q8 s2).
- CIEM section: the CIEM page gives no retirement timeline for Permissions Management (only "deprecation doesn't affect CIEM in Defender for Cloud"); the chapter's dates (April 1 / November 1, 2025) come from elsewhere.
- Intermediaries guidance page dates from 2024-01 and still names Windows Virtual Desktop.
