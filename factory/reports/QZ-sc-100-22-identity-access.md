# QZ-sc-100-22-identity-access — report

File: `content/sc-100/quizzes/22-identity-access.yaml` (10 questions; `npx tsx factory/check-quiz.ts sc-100 22-identity-access` → 0 problem(s), 0 warning(s)).

Coverage: 2.2.1 (q1), 2.2.4 (q2, q7), 2.2.8 (q3, q10), 2.2.2 (q4), 2.2.5 (q5), 2.2.7 (q6), 2.2.3 (q8), 2.2.6 (q9). Formats 6–10: single, yesno_statements, dropdown, multi, dropdown.

The mock bank already covers almost every decision of the chapter (55 questions on 2.2.x). The quiz deliberately tests other decisions: agent's user account, cross-tenant synchronization, workload identity federation from EKS, SSO + SCIM vs JIT, Workload ID Premium for risk-based workload policies, LDAP signing vs channel binding, outbound settings vs tenant restrictions, Connect Sync + Cloud Sync coexistence, agent users outside "All users" policies, key rotation policy.

## Facts verified on Learn (fetched 2026-11-24)
- CA for agents: policies scoped through Users (even All users) don't apply to agent's user accounts; agent identity / blueprint policies don't cover the agent user; licensing M365 E7 or Agent 365 + P1/E3.
- Cross-tenant sync (push, one-way, external members by default); automated provisioning (SCIM, deprovisioning; SAML JIT as the alternative); WIF (EKS, GitHub, GCP, AWS; app registration or user-assigned MI); workload identity risk (Workload ID Premium for risk-based CA; managed identities out of scope).
- Cloud Sync topology "existing forest with Connect Sync, new forest with Cloud Sync" is supported; group limit 50K vs 250K (decision guide).
- Cross-tenant access: org settings override defaults; tenant restrictions independent of inbound/outbound/trust; direct connect + MFA policy requires trusting the partner's MFA claims.
- LDAP signing protects against MITM/replay; LDAP channel binding applies to TLS/LDAPS sessions only.
- Key rotation policy, Event Grid near-expiry, versionless key URI, old versions kept enabled until rewrap.

## Not verified on a fetched page (from knowledge, kept because certain)
- q8: only one active Connect Sync server per tenant, staging mode server for recovery; a Connect Sync forest connector needs network connectivity. French « mode intermédiaire » for "staging mode" not checked on fr-fr Learn.
- q9: the built-in "Multifactor authentication" authentication strength accepts password + SMS.
- q3: system-assigned managed identities exist only for Azure resources.

## Chapter 22 vs current Learn
- Chapter (agent users) says agent users serve "a mailbox, a Teams presence"; Learn only says "systems that strictly require a Microsoft Entra user account". Harmless, but the quiz uses Learn's wording.
- Chapter says CA for agents can "require a compliant device for agent users"; the CA-for-agents page mentions device compliance only for agents on managed endpoints (with the "Agent execution environments" condition, in preview) and links to another article. Worth rechecking.
- Chapter should state explicitly that "All users" policies don't cover agent's user accounts (Learn's wording) — it is the key Zero Trust validation gap tested in q9.
- Not in the chapter but used in q7 (inferable, inside the study guide): tenant restrictions v2 are separate from outbound settings; B2B direct connect with an MFA policy requires inbound MFA trust. Consider adding one line each to the external-identities section.
- Not in the chapter, used as a distractor in q6: LDAP channel binding only affects TLS (LDAPS) connections. Chapter lists "LDAP signing and channel binding" without saying what each protects.
- Chapter's workload identity risk line could add "managed identities are out of scope".
