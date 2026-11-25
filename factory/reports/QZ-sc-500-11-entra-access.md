# QZ-sc-500-11-entra-access — notes

`content/sc-500/quizzes/11-entra-access.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.1 (q2, q10), 1.1.2 (q3, q8), 1.1.3 (q1, q6), 1.1.4 (q7), 1.1.5 (q4, q9), 1.1.6 (q5). Positions 6–10: multi, single, yesno_statements, dragdrop, dropdown.

## Chapter or mock exam vs current Learn (fix in the chapter or bank, not done here)

- **User consent settings role.** The chapter says the setting is "set by a Privileged Role Administrator". "Configure how users consent to applications" lists Privileged Role Administrator, and adds that "a Global Administrator role is only required when using the Microsoft Entra admin center". The mock question `sc500-cs4a-user-consent` has the statement "A cloud security engineer who has only the Privileged Role Administrator role can change the setting" = **Yes**. That answer only holds outside the admin center (Microsoft Graph / PowerShell). Review the statement, and add the nuance to the chapter. q9 of this quiz says "by using Microsoft Graph PowerShell" for this reason.
- **Microsoft Graph application permissions through the admin consent workflow.** "Configure the admin consent workflow" says "only Global Administrators can approve admin consent requests for apps requesting for Microsoft Graph app roles". "Grant tenant-wide admin consent" says Privileged Role Administrator can grant consent for any permission of any API. The chapter's key point "Only a Privileged Role Administrator grants Microsoft Graph application permissions" matches the grant page but not the workflow page. Check `sc500-1a-consent-workflow-reviewers` against both pages. I kept Graph application permissions out of q9.
- **Register security information** (Learn, policy page): from **July 6, 2026**, policies that target this user action also apply to Windows Hello for Business and macOS Platform SSO credential registration. The chapter doesn't say this.
- **Windows Azure Service Management API**: Learn still uses this name. The grouping covers the Azure portal, which "also covers the Microsoft Entra admin center", and it no longer covers Azure DevOps. The chapter table is correct, but these two details could be added.
- **PIM for Groups**: Learn says a group doesn't need to be role-assignable to be enabled in PIM for Groups (only to receive a Microsoft Entra role), and recommends requiring approval for eligible members of groups used to elevate into Microsoft Entra roles. The chapter is consistent with this.

## Not verified on a fetched page

- q4, option a (Assignment required): the explanation says Assignment required = Yes would stop unassigned users but not the app's own app-only tokens for Microsoft Graph. "Properties of an enterprise application" says Assignment required controls who can obtain a token **for the application**, and that only Enabled for users to sign-in = No also stops service principals that use application permissions. The point that it doesn't stop the app as a client of Graph is an inference from this wording.
- q5: "Manage user-assigned managed identities" only links Managed Identity Operator to read/list. The assign permission comes from the built-in roles page (`userAssignedIdentities/*/assign/action`, "Read and Assign User Assigned Identity") and the Azure Policy built-in identity page ("Required to assign the built-in identity to VMs").
- q9, Security Administrator distractor: I didn't check its directory permissions. The explanation only says it isn't one of the roles that Learn lists for these consent tasks.
- q7: Learn says a wrong subject makes the token exchange fail "without error". The stem only says the sign-in step fails.

## Design notes

- I avoided the decisions of the 47 mock questions on 1.1.x. The new decisions are: TAP Maximum lifetime, which groups PIM for Groups supports, the Register security information user action with a location exclusion, blocking all tokens of a malicious app while keeping its grants, Managed Identity Operator, which methods meet both the MFA and the Passwordless strengths, the GitHub environment subject of federated credentials, how several CA policies combine (block, report-only, all controls required), the least-privileged role per consent task, and role-assignable group + PIM for Groups with approval in the member settings.
- No preview feature is an answer. The Medium and High permission classifications (preview) aren't used.
