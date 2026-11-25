# QZ-az-900-24-identity-security — report

File: `content/az-900/quizzes/24-identity-security.yaml` (10 questions, `az900-qz-24-01` to `-10`). `npx tsx factory/check-quiz.ts az-900 24-identity-security` → 0 problem(s), 0 warning(s).

Coverage: 2.4.1 (Q1, Q8), 2.4.2 (Q2, Q7), 2.4.3 (Q9), 2.4.4 (Q10), 2.4.5 (Q6), 2.4.6 (Q5), 2.4.7 (Q4), 2.4.8 (Q3). Positions 6–10 formats: single, dragdrop, multi, yesno_statements, multi.

All 49 mock-exam questions of 2.4.x were read first. The quiz tests decisions that the bank doesn't: smart lockout, management group scope for current and future subscriptions, Key Vault as an application-layer control, Defender for Cloud with Google Cloud (the bank only has AWS), passwordless method chosen by device situation, Entra Connect + Domain Services together for a hybrid legacy app, Azure roles for B2B guests vs B2B direct connect users, and a Conditional Access policy evaluated across several users (exclusion, location, guest included in "all users").

## Verified on Learn (fetched 2026-11-24)

- Smart lockout: always on for all Microsoft Entra customers; recognizes valid users (howto-password-smart-lockout).
- Windows Hello for Business "ideal for information workers that have their own designated Windows PC", credentials tied to that PC; FIDO2 keys are hardware devices (USB, Bluetooth, NFC); Authenticator turns an iOS or Android phone into a passwordless credential (AZ-900 unit 3).
- Domain Services: one-way sync from Microsoft Entra ID; in hybrid environments on-premises identities are synchronized to Entra ID, then to the managed domain; the managed domain is a stand-alone domain, not an extension of the on-premises domain (domain-services/overview).
- Conditional Access "All users: All users in the directory, including B2B guests"; exclusion overrides inclusion (concept-conditional-access-users-groups).
- B2B direct connect: users have no presence in the resource directory, only Teams shared channels, no access to the Azure portal (b2b-direct-connect-overview). External tenant is separate from the employee directory (external-identities-overview). Azure roles can be assigned to B2B guest users (role-assignments-external-users).
- Defense in depth, application layer: "Store sensitive application secrets in a secure storage medium, such as Azure Key Vault" (unit 8). Zero Trust principles (unit 7). RBAC management group scope and inheritance (scope-overview). Defender for Cloud connects AWS and GCP resources (defender-for-cloud-introduction).

## Doubts / not stated verbatim on Learn

- Q7 (workshop technicians on shared PCs → FIDO2 keys): Learn doesn't say in words "FIDO2 for shared PCs"; the answer rests on WHfB being "ideal for a designated PC, credentials tied to the user's PC" and FIDO2 being a portable hardware key, phones being excluded by the stem. The comparison graphic of the unit ("best-fit scenario") isn't readable as text.
- Q3: Advisor is said to give recommendations for Azure resources only (well known, not re-fetched).
- "Secure score" was avoided: the French term is still `undecided` in `content/glossary.yaml`.

## Chapter vs current Learn

- The passwordless page `entra/identity/authentication/concept-authentication-passwordless` is now titled "Passkeys (FIDO2) authentication method in Microsoft Entra ID" and recommends **synced passkeys** for most users and device-bound passkeys / FIDO2 keys for regulated or privileged users. The chapter says "FIDO2 security keys or passkeys": not wrong, but it could name synced vs device-bound passkeys.
- Defender for Cloud overview now presents it as a CNAPP and says it is "expanding to the Defender portal" (unified experience). The chapter doesn't mention it; not wrong for AZ-900. The overview page no longer names Azure Arc (the AZ-900 unit 9 and the chapter still do).
- No out-of-date mock-exam question was seen while reading the 2.4.x bank (not a full review).
