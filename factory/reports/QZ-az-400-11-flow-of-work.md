# QZ-az-400-11-flow-of-work — report

Quiz: `content/az-400/quizzes/11-flow-of-work.yaml` (10 questions). `npx tsx factory/check-quiz.ts az-400 11-flow-of-work`: 0 problem(s), 0 warning(s).

Objectives: 1.1.1 (q1, q4, q6, q8), 1.1.2 (q3, q9), 1.1.3 (q2, q7), 1.1.4 (q5, q10). Positions 6–10: dropdown, yesno_statements, ordering, multi, dropdown.

Mock-exam questions of 1.1.1–1.1.4 were read first (GitHub Flow order, board column settings, Agile backlog levels, CMMI, watch releases, ADO subscriptions, issue forms/config.yml, Projects roadmap/workflows, mention syntax, delivery plans, resolution mentions, linked work items policy, YAML build traceability, link types). The quiz tests other decisions: inherited process copy, area paths per team, Working with bugs / swimlane / custom state, subscribe to one issue, notification delivery by role + Skip initiator, connection limits and Server/Services support, Requirements quality linking, `AB#` transitions with keyword repetition and `Closed`.

## Facts checked on Learn (pages fetched)

- `AB#` parsed in commit messages, PR descriptions, issue descriptions; not in PR title or comments; one keyword transitions only the first reference; transitions only on merge into the default branch; `fix` keywords go to the first Resolved-category state, valid state names (`Closed`) to that state (link-to-from-github).
- Up to 2,000 repositories per connection; Azure DevOps Server 2020+ = GitHub Enterprise Server only; Services = GitHub.com + GHES (connect-to-github).
- System processes locked; changes to an inherited process apply immediately to every project using it; "Create copy of process" exists and the documented rollout is copy → customize → test project → change projects (manage-process, inheritance-process-model).
- Working with bugs (as requirements / as tasks / not on backlogs), swimlanes, columns mapped to states, new state via process customization (show-bugs-on-backlog, expedite-work, add-columns).
- Team subscription delivery "Members of <team> by role" with Reviewers role; Skip initiator selected by default; team subscriptions by Team Administrators, project subscriptions need Project Administrators/PCA (manage-team-group-global-organization-notifications, about-notifications).
- Requirements quality widget and linking from the Tests tab, Requirements category only (requirements-traceability).
- Agile Bug: Resolved state in the Resolved category, Closed in Completed (workflow-and-state-categories).

## Doubts / unverified

- q8 relies on a copy of an inherited process keeping its customizations. manage-process documents "Create copy of process" and the bundled rollout through a copy, but does not say explicitly that customizations are copied (implied by the word "copy" and by the rollout procedure).
- q3 distractor c explanation ("reading an issue doesn't subscribe her"): the Learn training unit lists commenting, opening and being assigned as automatic subscriptions; reading isn't listed. Not stated in so many words.
- GitHub-specific facts with only docs.github.com sources (closing keywords `Fixes #214` only on default branch, `CODEOWNERS` review requests, issue forms) were avoided: references to docs.github.com raise a checker warning, and no Learn page covering them was found.

## Chapter issues against current Learn (chapter not edited)

- Exam trap "query macros `@CurrentIteration`, `@Follows`… don't work in notification filters": not found on the notifications pages fetched (about-notifications, manage-team-group-global-organization-notifications do not mention macros). Unverified, not used.
- workflow-and-state-categories contradicts itself for Agile User Story: its intro says New, Active, Resolved, Closed, but its category table lists a Resolved-category state only for Bug. The chapter's `Fixes AB#` rule ("first state of the Resolved category, or Completed if none") is correct, but a question that applies `Fixes AB#` to an Agile user story would be ambiguous (Resolved or Closed). The quiz uses only bugs for that reason; worth checking the mock question `az400-1a-mention-syntax` (slot ghfix, "resolves it") which is on a generic work item and stays fine.
- manage-team-group-global-organization-notifications says "Azure DevOps doesn't support organization-wide notifications" (suggesting distribution lists or a banner), while about-notifications still lists Global subscriptions managed by Project Collection Administrators. The chapter's Global row matches about-notifications; the two pages are worded inconsistently.
- link-to-from-github adds that the automatic branch link is removed when the branch is deleted; the chapter doesn't mention it (minor).
