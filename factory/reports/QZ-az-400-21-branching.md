# QZ-az-400-21-branching — notes

`content/az-400/quizzes/21-branching.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.1.1 (q3, q7), 2.1.2 (q2, q4, q6, q8), 2.1.3 (q1, q5, q9, q10). Positions 6–10: single, multi, dropdown (text), yesno_statements, dragdrop.

## Chapter vs current Learn / GitHub docs (fix in the chapter, not done here)

- **Restrict who can push to matching branches**: GitHub's docs say "People and apps with admin permissions to a repository are always able to push to a protected branch" (unless *Do not allow bypassing the above settings* is on). The chapter's table presents it as "only the release team" without this caveat. q10 limits the requirement to users with the Write role for that reason.
- **Rulesets "Evaluate (report only, GitHub Enterprise)"**: GitHub's "About rulesets" and "Creating rulesets for a repository" pages list only Active and Disabled as enforcement statuses; Evaluate is mentioned only for metadata restrictions, with no plan stated. The chapter's Exam tip relies on Evaluate; to check. Not used in the quiz.
- **Organization rulesets** are documented as a GitHub Enterprise feature ("organization-wide rulesets are for organizations on the GitHub Enterprise plan"); the chapter says "Also at organization level" without the plan.
- **Merge queue availability**: public repositories owned by an organization, and private ones only on GitHub Enterprise Cloud (q8 states Enterprise Cloud). The chapter doesn't give the plan.
- **Deployment branches**: Learn's branching guidance treats deployment/environment branches (`deploy/...`) like release branches, except for continuous deployment, where Azure Pipelines promotes builds of `main`. The chapter's Exam trap ("not a branch per environment") is consistent but more absolute than Learn.
- **Required group reviewers**: Learn adds "If only one group is required, the minimum number of members you specify approve the changes". The chapter's "one member's approval satisfies it" is true for several groups; q2 uses two groups to avoid this case.
- **Branch deletion**: Learn says Force push is required to delete a branch, and branch creators get Force push on their own branches (q10). The chapter mentions Force push "also deletes branches and tags" only in passing.
- Learn's governance training unit shows a CODEOWNERS example with `*` on the **last** line, which (last match wins) would make `@core-team` the owner of every file, including `/security/`. Not a chapter issue, but a misleading Learn example.

## Not verified on a Learn page

- GitHub facts (Lock branch, Restrict who can push, most recent reviewable push, merge queue and `merge_group`, CODEOWNERS last-match precedence, ruleset bypass list with GitHub Apps, Require signed commits) were checked on docs.github.com. The Learn training units used as references cover these settings only in general terms (no Learn page states the CODEOWNERS precedence rule).

## Design notes

- Mock questions read: all `2.1.x` files in `questions/source-control/` (including cs1a, cs2a, cs2c, cs3b, cs4a, cs4b). Avoided their decisions: trunk-based for CD, GitHub flow start, hotfix from tag, Release Flow hotfix, cherry-pick port, workflow matching, feature flags for long work, min reviewers/creator vote, last pusher (Azure Repos), dismiss stale approvals, CODEOWNERS on base branch, policy matching, build validation, build expiration, squash-only, linear history methods, bypass when pushing, rulesets aggregation, strict checks + no bypass hotarea, org ruleset + CODEOWNERS.
- New decisions: GitHub Lock branch, two required groups, environment branches vs pipeline promotion, CODEOWNERS last match (non-specific pattern wins), Rebase with merge commit, cross-repo default-branch policy, SaaS + on-premises strategy, merge queue + `merge_group` + most recent reviewable push, bypass defaults and opt-in behavior, ruleset bypass for a GitHub App, Force push to delete branches, signed commits.
