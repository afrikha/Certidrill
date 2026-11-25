# QZ-sc-500-44-security-copilot — report

File: `content/sc-500/quizzes/44-security-copilot.yaml` (10 questions; check: 0 problem(s), 0 warning(s)).

Objectives: 4.3.1 (q2, q6, q7), 4.3.2 (q1, q10), 4.3.3 (q3, q4, q9), 4.3.4 (q5, q8). Positions 6–10 formats: multi, dropdown, dropdown, yesno_statements, yesno_statements.

## Sources
The en-us pages `copilot/security/manage-workspaces` and `copilot/security/workspaces-overview` now redirect to "What is Microsoft Security Copilot?". Workspace facts (capacity used by one workspace at a time, per-workspace roles and plugins, tenant-wide audit logging changeable only by a Security Administrator, immutable storage location) come from the Learn training module "Configure workspaces for Microsoft Security Copilot" (units 2–5). Check any course or bank reference to the redirected URLs.

## Chapter `44-security-copilot` against current Learn
- Default owner roles: the authentication page lists Billing Administrator, Entra Compliance Administrator, Global Administrator, Intune Administrator, Security Administrator, plus the Purview roles. **Conditional Access Administrator**, which the chapter lists, isn't on the page (page updated 2026-06-04).
- Agent identity "currently Microsoft-built agents only": I couldn't verify this. It isn't on agents-manage or on the training unit "Discover and set up Microsoft-built agents". Not used in the quiz.
- Default workspace: training unit 5 documents an owner setting, **Workspaces for Microsoft Security Copilot agents**, that routes each product (Defender XDR, Purview, Intune, Entra) to a chosen workspace tenant-wide. The default (oldest workspace) applies only when no assignment is made. The chapter mentions only the default. The unit also warns to turn off agent triggers before reassigning, because memory and feedback don't carry over.
- Security Alert Triage Agent: the Defender page labels it **(Preview)** as a whole (email and collaboration alerts GA, cloud and identity alerts preview). The chapter says only the cloud and identity part is preview.
- Mock-exam question `sc500-4c-agent-defender-map` maps requirement r1 to the Security Alert Triage Agent as the correct answer. That makes a feature labelled Preview the correct answer. Consider the Phishing Triage Agent wording, or a GA-only requirement.
- Chapter wording "the earliest-created one" matches training's "oldest workspace in your tenant".
