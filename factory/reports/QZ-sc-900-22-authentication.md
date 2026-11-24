# QZ-sc-900-22-authentication — report

File: `content/sc-900/quizzes/22-authentication.yaml` (10 questions, `sc900-qz-22-01`…`10`). `npx tsx factory/check-quiz.ts sc-900 22-authentication` → 0 problem(s), 0 warning(s).

Objectives: 2.2.1 (q2, q5, q6, q10), 2.2.2 (q3, q7, q9), 2.2.3 (q1, q4, q8). Formats 6–10: multi, single, single, yesno_statements, hotarea.

## Decisions kept away from the mock bank
New angles: smart lockout default threshold/duration, WHfB "something you have" = device-protected private key, security defaults "MFA when necessary" for non-admins, SSPR reset checked by banned lists + custom list needs P1, Platform Credential for macOS, methods usable for both MFA and SSPR (voice, software OATH), Free + security defaults → P1 + Conditional Access + turn defaults off, on-prem Password Protection DC agents vs writeback/PHS, number matching is not phishing-resistant, user table (SSPR-capable user, QR-code-only user).

## Doubts / unverified
- q4 s1: Learn says the lists are checked "when a password is changed or reset for any user"; it does not name SSPR explicitly. Treated as covering SSPR resets (the chapter says the same).
- q5: the correct option is the only one containing "macOS" (the stem says Mac). Unavoidable with the product name; distractors are the plausible neighbours (WHfB, push with number matching, SMS).
- q1 states "Azure public cloud" because Learn's default threshold is 10 there but 3 for Azure US Government.

## Chapter (and mock bank) vs current Learn (no edit made)
- **Hardware OATH tokens are marked "(preview)"** in the methods table of "Microsoft Entra authentication overview" and in the SSPR deep dive. The chapter lists "OATH tokens, software or hardware" as MFA + SSPR with no note, and mock question `sc900-2a-auth-methods-match` uses "Hardware OATH token" as a correct answer (target t1). Not used in the quiz; to review.
- Learn now splits Microsoft Authenticator into "passwordless" (primary only: not MFA, not SSPR) and "push notifications" (MFA + SSPR, not primary); the chapter merges them in one row.
- Windows Hello for Business: Learn's footnote says it serves as MFA (step-up) only if the user is enabled for passkeys and has one registered; the chapter says MFA "Yes".
- Email OTP: Learn adds that it can be configured for guest sign-in; the chapter says MFA "No" (fine for members).
- Security defaults: Learn's list now also includes **blocking device code flow**; the 14-day MFA registration grace period was removed (July 29, 2024); users register Microsoft Authenticator notifications (or OATH TOTP apps). The chapter's list omits device code flow.
- Password Protection licensing: for users synchronized from AD DS, **both** lists need P1/P2 (global list is Free only for cloud-only users). The chapter only says the custom list needs P1 (q4 therefore states cloud-only users).
- SSPR deep dive: administrators get a two-gate policy, and the page says SSPR for administrators isn't enabled by default; not in the chapter (q10 states that no user is an administrator).
