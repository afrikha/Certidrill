# QZ-az-400-41-authentication-authorization — end-of-chapter quiz, AZ-400, chapter 41

File: `content/az-400/quizzes/41-authentication-authorization.yaml` (10 questions, draft). Check: `npx tsx factory/check-quiz.ts az-400 41-authentication-authorization` → 0 problem(s), 0 warning(s).

Positions: 1 single 4.1.1 (d1) · 2 single 4.1.6 (d1) · 3 single 4.1.2 (d2) · 4 single 4.1.5 (d2) · 5 single 4.1.7 (d2) · 6 yesno 4.1.4 · 7 dragdrop 4.1.3 · 8 single 4.1.3 · 9 multi 4.1.2 · 10 multi 4.1.1 (d3).
The 34 mock-exam questions of 4.1.x were read first; new decisions: FIC audience value, Basic vs Stakeholder for code review, `id-token: write`, object-level Deny for one team, separate project for another process, Maintain vs Admin + base permission vs outside collaborator, PAT policies, manual WIF connection when Convert isn't possible, OIDC + GitHub App combined, two user-assigned identities (deployment + pre-authorized app identity).

## Chapter out of date or imprecise against current Learn (fetched 2026-11-24)

- **Azure DevOps issuer retirement (4.1.3)**: Learn ("Set a Resource Manager workload identity service connection", "Convert service connections from the Azure DevOps issuer to the Microsoft Entra issuer") says workload identity federation connections that use the Azure DevOps issuer `https://vstoken.dev.azure.com` must be converted to the Microsoft Entra issuer with the **Update** button before **July 1, 2027**. Not in the chapter; worth an exam tip.
- **Visual Studio subscribers (4.1.6)**: chapter says "Enterprise gives Basic + Test Plans". Learn "About access levels": Visual Studio Enterprise maps to the **VS Enterprise** level; Test Professional and MSDN Platform map to Basic + Test Plans; best practice is to assign **Visual Studio Subscriber** (no Basic charge before first sign-in); users assigned Basic or Stakeholder also get their subscription benefits at sign-in.
- **Global PATs "being retired" (4.1.3)**: the fetched PAT policy page doesn't mention any retirement; it still lists "Restrict global personal access token creation" (off by default). Not confirmed in this session.
- **Scope levels**: Learn lists Subscription, Management Group or Machine Learning Workspace for automatic and managed-identity connections, but only Subscription or Management Group for an existing service principal (manual). Chapter doesn't make that distinction.
- **Moderate repository role**: confirmed on docs.github.com (Read, Triage, Moderate, Write, Maintain, Admin). The Learn training page on GitHub repository permissions lists five roles and is inconsistent on which plan allows custom roles; docs.github.com says custom repository roles need GitHub Enterprise Cloud (as the chapter says).

## Doubts / references

- GitHub facts (GITHUB_TOKEN scope and events, fine-grained PAT limitations) were checked on docs.github.com, but references must be on learn.microsoft.com and no Learn page covers GITHUB_TOKEN permissions: Q3 and Q9 cite the Learn OIDC page and the "Identify supported Access Tokens" training unit (which covers the 1-hour installation token and PATs tied to a user). "id-token accepts only write or none" comes from the chapter; the GitHub workflow-syntax page was not fetched this session.
- Mock-exam issue: `az400-4a-gh-token-facts` and other `az400-4a-gh-*` questions cite the training unit "Identify supported Access Tokens", which doesn't mention GITHUB_TOKEN (the page covers only GitHub App installation tokens and PATs): the reference doesn't cover their point.
- Q8: the Learn "Use an Azure Resource Manager service connection" URL returned an error once without `?view=azure-devops` and loaded with it; the reference keeps the canonical URL.
- Q10: attaching a user-assigned identity in Bicep needs the assign action on the identity (Managed Identity Operator), not a role assignment; consistent with the requirement but not stated in the stem.
