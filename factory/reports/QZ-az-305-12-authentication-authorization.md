# QZ-az-305-12-authentication-authorization — report

File: `content/az-305/quizzes/12-authentication-authorization.yaml` (10 questions, `az305-qz-12-01` to `-10`). Check: `npx tsx factory/check-quiz.ts az-305 12-authentication-authorization` → 0 problem(s), 0 warning(s).

Objectives: 1.2.1 (q2, q6, q8), 1.2.2 (q1, q7), 1.2.3 (q5), 1.2.4 (q4), 1.2.5 (q3, q9, q10). Positions 6–10: yesno_statements, single ×3, dropdown.

The mock bank has 75 questions on these objectives. To avoid repeating them, the quiz tests: B2B collaboration for suppliers (q1), the What If tool compared with report-only mode (q2), a Key Vault private endpoint compared with service endpoints and IP rules (q3), connectors shared by application proxy and Private Access, and authorization with Microsoft Entra Kerberos (q4), Policy deny against Owner, control plane against data plane, and inheritance from a management group (q5), PTA with PHS as a backup that doesn't fail over automatically (q6), Domain Services with federated users, which needs PHS (q7), `sAMAccountName` sign-in, which needs federation, with PHS as a backup (q8), dual-credential rotation with versionless Key Vault references cached for 24 hours (q9), and Managed HSM with Key Vault Standard and the purge protection that Storage requires (q10).

## Out of date or imprecise in the chapter (verified on Learn, Nov. 2026)

- **Key Vault tiers and FIPS.** "How to choose the right Azure key management solution" lists Key Vault Standard as FIPS 140-2 Level 1, not just "Software". Premium is FIPS 140-3 Level 3 only for keys created on HSM Platform 2; keys on HSM Platform 1 are FIPS 140-2 Level 2. Premium symmetric keys are in preview. The chapter states "FIPS 140-3 Level 3" for Premium without this nuance.
- **Key Vault references.** The App Service page says that any configuration change restarts the app and refetches the secrets immediately. It also documents a `configreferences/appsettings/refresh` endpoint that forces resolution. The chapter only gives the 24-hour pickup. q9 uses the 24-hour cache and the restart.
- **Federation reasons.** The choose-ad-authn page still lists third-party MFA, third-party authentication solutions and `sAMAccountName` sign-in as reasons for federation, which matches the chapter. That page doesn't mention Microsoft Entra external authentication methods. I didn't check their current status, so q8 relies only on `sAMAccountName`.
- **Microsoft Entra Kerberos.** The on-premises passkey page requires domain controllers on Windows Server 2016 or later and a writable DC per site. It supports both Microsoft Entra joined and hybrid joined devices. The chapter doesn't state these prerequisites.

## Doubts / unverified

- q1: the claim that B2B direct connect is limited to Teams shared channels between Microsoft Entra organizations comes from the chapter and the mock bank. I didn't fetch the B2B direct connect overview.
- q5 s3 (inheritance of the Reader assignment from MG1): the chapter teaches it, but neither reference covers it (the limit is two references).
- q7: the Domain Services tutorial doesn't name AD FS. It says Microsoft Entra Connect doesn't synchronize the legacy NTLM and Kerberos hashes unless password hash synchronization is configured. The federated-users trap is derived from that. The answer assumes the full password sync makes existing users usable without a password change. The tutorial implies this but doesn't state it.
- q9: the answer assumes that "no request fails" excludes even the short gap between regenerating a key and calling the refresh endpoint. That's why the refresh endpoint isn't among the options.
- q10: the Managed HSM overview page doesn't cover purge protection. The Storage CMK page requires soft delete and purge protection on "the key vault or managed HSM".
