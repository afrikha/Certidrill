# FIX-sc-900-1 — chapters 11, 12, 21, 22 and 23 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-900 11-security-compliance-concepts 12-identity-concepts 21-entra-id-identities 22-authentication 23-access-management` 0 problems; `content:validate --cert sc-900` 0 problems, 0 warnings; `check-quiz sc-900` (same 5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR, with the same sections, tables and callouts. Section markers weren't touched. There are no code blocks in these chapters.

## 11-security-compliance-concepts

| Finding | Learn | Change |
| --- | --- | --- |
| Shared responsibility for AI services missing | Confirmed (training unit 2, shared responsibility): the provider secures the infrastructure, the AI model hosting environment and platform safety controls such as content filtering. The customer handles data, access, configuration, AI risks such as prompt injection, and user training | shared-responsibility: one paragraph after the "always yours" list |
| Risk-management steps and responses missing | Confirmed (unit 6, GRC): identify, assess, respond, monitor. The four responses are accept, mitigate, transfer and avoid. The goal "isn't to eliminate all risk". HIPAA, ISO 27001 and SOC 2 are named | grc: one paragraph before the data notions; key point extended |
| Key management missing; rainbow tables | Confirmed (unit 5): keys stored separately from the data, HSMs, regular rotation, tight access, Azure Key Vault. Learn uses "rainbow tables / dictionary attacks" for precomputed tables | encryption-hashing: one paragraph after the data-states table; "(rainbow tables)" after "precomputed tables" |
| Defense in depth: compute and application examples, integrity controls | Confirmed (unit 3): compute adds monitoring for unusual behavior; application adds application-level authentication and authorization; integrity controls also include audit logs and database transaction controls | Compute and Application rows extended; CIA Integrity row: "audit logs" added |
| FR « Confiance Zéro » vs objectives.yaml « confiance zéro » | The fr-fr training unit says **« Confiance nulle »** (title: « Décrire le modèle Confiance nulle »). It uses « confiance zéro » only once | None. A naming choice for a human (see below) |
| FR « faire confiance à » (writing guide: « approuver ») | Guide rule | « Le modèle traditionnel approuvait… ». The slogan « ne jamais faire confiance, toujours vérifier » was kept |

## 12-identity-concepts

| Finding | Learn | Change |
| --- | --- | --- |
| AD DS limitations omitted: VPN for remote access, no native iOS/Android/non-Windows management, OUs | Confirmed (training unit 5, directory services): remote users "can't authenticate directly to AD DS without a VPN connection"; OUs are listed as an AD DS capability. Microsoft Entra ID works "without requiring a VPN or on-premises infrastructure" | AD DS vs Entra ID table: new row "Remote access". The Device management row now mentions OUs. The cross-platform point was already in the table |
| Identity-provider benefits summarized briefly | No error (report) | None |
| FR « faire confiance à » (four times) | Guide rule: « approuver » | « approuve », « l'approuvent », « si A approuve B, B n'approuve pas A » |

## 21-entra-id-identities

| Finding | Learn | Change |
| --- | --- | --- |
| PIM "needs P2" | Licensing page: "either Microsoft Entra ID Governance licenses or Microsoft Entra ID P2 licenses" | "(P2, or Microsoft Entra ID Governance)" |
| Dynamic membership needs P1 | Confirmed (groups-dynamic-membership): P1 (or Intune for Education) for each user who is a member. No license for devices. A dynamic group can't contain both users and devices | One sentence after "assigned or dynamic" |
| Cloud Sync "recommended"; Connect Sync "being replaced" | Confirmed by the SC-900 training unit (hybrid identity): "Microsoft's recommended synchronization tool", Connect Sync "being replaced by Cloud Sync". The product docs (what-is-cloud-sync, decision guide) are less strong: "recommended path forward for most organizations", and "continue using Connect Sync" when no migration path fits. They don't contradict the unit | Table unchanged |
| PTA is not configured by Cloud Sync | Confirmed (decision guide comparison table): Pass-Through Authentication Config ✗ and ADFS Integration Setup ✗ in Cloud Sync. Both are "managed separately" with separate tools | One parenthesis before the sign-in methods table |
| "Machine identities" only in a diagram's alt text | Not re-fetched | None |

## 22-authentication

| Finding | Learn | Change |
| --- | --- | --- |
| Hardware OATH tokens are in preview | Confirmed: "(preview)" in the methods table of concept-authentication-methods, in the OATH tokens page heading and in the SSPR deep dive | Methods table, OATH row: "(hardware tokens in preview)" |
| Microsoft Authenticator split into two rows | Confirmed: passwordless = primary only (no MFA, no SSPR); push notifications = MFA and SSPR, not primary | The single row became two rows. A third row was added for Platform Credential for macOS (primary, MFA, no SSPR), which the chapter already names as phishing-resistant |
| Windows Hello for Business MFA footnote | Confirmed (footnote 1): it serves as a step-up MFA credential only if the user is enabled for passkeys (FIDO2) and has one registered | WHfB row, MFA column: "Step-up only, if the user also has a passkey (FIDO2) registered" |
| Email OTP for guests | Confirmed (footnote 2): it can be configured for sign-in by guest users | One sentence after the table |
| Security defaults: device code flow, 14-day grace period, methods | Confirmed (security-defaults): "Blocking device code flow" is in the list. The 14-day grace period was removed on July 29, 2024. Users register Microsoft Authenticator with notifications, or an OATH TOTP app | New bullet "block device code flow"; one sentence after the list |
| Password Protection licensing for synced users | Confirmed (concept-password-ban-bad licensing table): the global list is Free for cloud-only users. Users synchronized from AD DS need P1 or P2 for both lists. The custom list is limited to 1,000 terms | Global list row: "free for cloud-only users, P1 or P2 for users synchronized from AD DS" |
| SSPR for administrators | Learn disagrees with itself. concept-sspr-policy says administrator accounts are enabled for SSPR by default with a strong two-gate policy that can't be changed (two pieces of data, no security questions; one-gate only during a trial or without a custom domain). concept-sspr-howitworks says SSPR for administrators "isn't enabled on the tenant by default" | One sentence about the separate stricter policy ("in general two methods, never security questions"). Whether it is on by default is not stated. Needs a human decision |
| Lists checked at SSPR resets | Learn says "when users change or reset their passwords"; it doesn't name SSPR | None (the chapter says "changed or reset") |

## 23-access-management

| Finding | Learn | Change |
| --- | --- | --- |
| "Require approved client app" retired | Confirmed (concept-conditional-access-grant): "retiring in early March 2026". Policies must move to "Require Approved Client App or Application Protection Policy", and new policies use only "Require application protection policy". The page still lists the control | Grant row: "require an app protection policy (the older "require approved client app" control retired in early March 2026)" |
| Require identity verification / risk remediation not listed | On the grant page. Identity verification is described as "During preview"; risk remediation is a separate control | None (outside the SC-900 level; identity verification is in preview) |
| Groups in role assignments must be role-assignable | Confirmed (groups-concept): only groups created with `isAssignableToRole` = true; P1 or P2; the property can't be changed afterwards; the membership must be Assigned, not dynamic | Role-assignment sentence: "a role-assignable group" plus one sentence on the conditions |

## Mock-exam bank questions changed

- `questions/entra/sc900-2a-auth-methods-match.yaml` (2.2.1, dragdrop): the correct answer of t1 was "Hardware OATH token", a preview feature. The item became "Software OATH token" (id `sw`). The t1 description became "An authenticator app on the phone generates a time-based one-time code that changes at a fixed interval". The correct explanation and the `sms` / `tap` option explanations were adapted (EN + FR). The id, type, objective, difficulty, the other targets and the references are unchanged.
- `questions/entra/sc900-2b-mfa-defaults-protections-multi.yaml` (2.2.2): the explanation lists the security-defaults baseline as if it were complete. It now includes "device code flow is blocked" (EN + FR). The answer doesn't change. "Block device code flow" isn't among the options.

## Checked and left unchanged

- 1.1.x: `sc900-1a-grc-risk-yn` (s1 "eliminate every risk" = No agrees with unit 6), `sc900-1a-cia-goals-complete`, `sc900-1a-did-layers-match`, `sc900-1a-shared-retained-yn`. No other 1.1.x or 1.2.x question relies on a changed fact.
- 2.1.x: `sc900-2a-hybrid-cloud-sync-sentences` and `sc900-2a-hybrid-sync-tools-yn` ("recommended", "Cloud Sync is replacing" agree with the training unit), `sc900-2a-ident-groups-yn` (dynamic membership; it says nothing about licensing). No question states PIM licensing.
- 2.2.x: `sc900-2a-auth-primary-secondary-yn`, `-roles-sentences` (email OTP "SSPR, not MFA, for a tenant member" still true), `-authenticator-yn`, `-whfb`, `-tap`, `-methods-sentences` and `-phishing-resistant-multi`. In the last four, hardware OATH tokens are only distractors or explanation text, never a correct answer. `sc900-2b-pwd-banned-lists-yn` (s2 "applied automatically to the users of every tenant" agrees with the global-list section; licensing is a separate matter). No question offers "approved client app".
- 2.3.x: `sc900-2b-ca-grant-controls-match`, `-ca-controls-yn`, `sc900-2b-roles-scope-multi`. `sc900-2b-roles-assignment-sentence` explains a principal as "a user, a group or a service principal". That is not contradicted; a reviewer may want "role-assignable group".

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 22 q4 states cloud-only users and q10 states no administrators, so neither depends on the new licensing or administrator-policy sentences.

## For a human decision

- **French name of Zero Trust.** objectives.yaml has « modèle de confiance zéro », the chapters and quiz have « Confiance Zéro (Zero Trust) », and fr-fr Learn (training unit 4) has « Confiance nulle ». Nothing was changed; this needs a glossary decision.
- **SSPR for administrators enabled by default?** concept-sspr-policy says yes and concept-sspr-howitworks says no. The chapter now avoids the question.
- **Hardware OATH tokens.** Learn labels them preview, even though they have long been usable through the legacy MFA policy. The chapter notes the preview and the bank no longer uses them as a correct answer. Decide whether to keep the note.
- **Windows Hello for Business as MFA.** Learn's footnote limits it to a step-up credential when the user also has a passkey. The chapter now says so; the quiz and bank don't test it.

## French terms not settled (not in the glossary)

- « injection de prompt », « tables arc-en-ciel », « gestion des clés », « modules de sécurité matériels (HSM) », « rotation » (chapter 11).
- « unités d'organisation (UO) » (chapter 12).
- « flux de code d'appareil », « délai de grâce », « renforcement (step-up) », « Platform Credential pour macOS » (the product name was kept in English), « notifications Push » (chapter 22).
- « groupe assignable à un rôle », « appartenance affectée » (glossary: « Affecté ») (chapter 23).
- « Confiance Zéro » vs « Confiance nulle » (see above).
