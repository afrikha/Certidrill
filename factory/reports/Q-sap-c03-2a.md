# Q-sap-c03-2a — QUESTIONS SAP-C03, domain security (2026-11-20)

## Output
- 53 questions in `content/sap-c03/questions/security/`, prefix `sapc03-2a-`: 2.1.1 ×9, 2.1.2 ×9, 2.1.3 ×9, 2.1.4 ×9, 2.1.5 ×9, 2.2.1 ×8.
- Types: single 44, multi 9 (8 "Choose two", 1 "Choose three" with 6 options). Difficulty: 8 easy / 26 medium / 19 hard.
- Correct option positions (single): a 12, b 10, c 11, d 11. Option lengths rebalanced so the correct option is not systematically the longest.
- `CERT=sap-c03 npx tsx factory/validate.ts --prefix sapc03-2a-` → 53 files, 0 problem(s).
- Checked against chapters 21-identity-security and 22-encryption-keys (written in parallel): no contradiction found (role chaining 1 h, rotation 90–2,560 days, 25 on-demand rotations, data perimeter keys).

## Deviations / conventions
- Multi stems keep "NOTE: Each correct selection is worth one point." (WRITING_GUIDE rule and every existing AWS bank), although the profile says multi-response is scored all or nothing on the real exam.
- No answer depends on closed services or on Lambda timeouts.

## Facts not fully verified (phrased to avoid depending on them)
- Verified Access TCP endpoints: the Connectivity Client page confirms non-HTTP access with continuous authorization, but does not say explicitly that device trust providers apply to TCP endpoints (`sapc03-2a-verified-access-tcp-databases` assumes they do).
- `CheckNoPublicAccess` resource-type list not fetched (WebFetch hourly limit reached); the question uses S3 bucket policies only.
- Role chaining from ECS task role credentials: IAM defines role chaining as "using a role to assume a second role"; the page does not mention ECS/EC2 credentials explicitly.
- Transitive session tags: assumed that the chained role's trust policy must allow `sts:TagSession` (standard IAM guidance, not re-read on the page).
- Microsoft Entra managed identity token claims (aud/sub) and Okta inbound federation with Entra ID: described generically, not verified on Microsoft/Okta docs.
- Cognito app client attribute write permissions (read-only custom attribute) not re-fetched.
- `Athena` resource-based policy support: removed from an explanation because not verified.
