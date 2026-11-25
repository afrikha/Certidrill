# QZ-sc-900-23-access-management

File: `content/sc-900/quizzes/23-access-management.yaml`, 10 questions (`sc900-qz-23-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts sc-900 23-access-management` → 0 problem(s), 0 warning(s).
Objectives: 2.3.1 = 5 (q1, q3, q5, q7, q8), 2.3.2 = 5 (q2, q4, q6, q9, q10). Types: single 4, yesno 3, dropdown 1, multi 1, dragdrop 1. Positions 6–10: single, yesno, multi, dragdrop, yesno.

Read first and avoided: the 22 mock questions of 2.3.1/2.3.2 (`sc900-2b-ca-*`, `sc900-2b-roles-*`) and `sc900-2b-mfa-ca-granular` (MFA outside the corporate network), so "MFA only outside the office", admin units for one office, report-only, multiple policies MFA + compliant device, Billing/User Administrator, elevation, role categories, authentication strength are not retested.

## Sources fetched (learn.microsoft.com, 2026-11-24)

conditional-access/overview, concept-conditional-access-session, concept-conditional-access-grant, concept-conditional-access-cloud-apps, concept-conditional-access-users-groups, concept-conditional-access-policies, policy-block-legacy-authentication, defender-cloud-apps/proxy-intro-aad, role-based-access-control/custom-overview, concept-understand-roles, best-practices, azure/role-based-access-control/rbac-and-directory-admin-roles.

## Chapter issues against current Learn

- **"Require approved client app" is retired.** The Grant page says this grant control retired in early March 2026 and that new policies should use "Require app protection policy". Chapter 23 (EN and FR) still lists "require an approved client app" among the grant controls (table "Access controls"). The quiz never uses it. Suggest removing it from the chapter.
- The Grant page now also lists **Require identity verification** and a separate **Require risk remediation** control; the chapter doesn't mention them (not needed at SC-900 level, but the list in the chapter is no longer exhaustive).
- Groups in role assignments: Learn says a group must be a **role-assignable group**; the chapter only says "a user, a group or a service principal". q4 s3 is true either way; the explanation mentions role-assignable groups.

## Doubts / unverified

- q7 s2: Conditional Access for workload identities (single-tenant service principals) is documented on the Users page; its licensing (Workload ID Premium) was not verified, and the statement deliberately says nothing about licensing.
- q7 s3: "block wins" relies on the policies page sentence "If there's a policy that is configured with the block grant control, enforcement stops here and the user is blocked".
- q8: "block downloads on unmanaged devices" comes from the Defender for Cloud Apps Conditional Access app control page (not from the Entra session page). Session controls apply to browser sessions only; the stem says the app is opened in a browser.
- q10 s1 (Owner can assign the Reader role) uses the Owner definition of the Azure RBAC page; the chapter names Owner only as an example of an Azure role, so a reviewer may judge it slightly beyond the chapter.
- French UI terms not checked on fr-fr pages: « Inscrire des informations de sécurité », « Inscrire ou joindre des appareils » (user actions), « emplacements approuvés », « Session de navigateur persistante », « Contrôle d'application par accès conditionnel » (course wording kept). Role names stay in English as in the course.
