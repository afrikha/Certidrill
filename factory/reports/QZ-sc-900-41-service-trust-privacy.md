# QZ-sc-900-41-service-trust-privacy

File: `content/sc-900/quizzes/41-service-trust-privacy.yaml`, 10 questions (`sc900-qz-41-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts sc-900 41-service-trust-privacy` → 0 problem(s), 0 warning(s).
Objectives: 4.1.1 = 6 (q1, q3, q5, q6, q7, q8), 4.1.2 = 4 (q2, q4, q9, q10). Types: single 4, yesno 3, dropdown 1, multi 1, dragdrop 1. Positions 6–10: single, yesno, multi, yesno, dragdrop.

The 16 mock questions `sc900-4a-stp-*` / `sc900-4a-priv-*` cover almost every fact of the chapter. The quiz tests other decisions: NDA for compliance materials (q1), who produces the audit reports (q3), category of healthcare / privacy / tenant documents (q5), why two tenants see different lists (q6), STP reports certify Microsoft and not the customer + STP is not a monitoring tool (q7), FedRAMP (Certifications…) vs US Government resources (Industry and Regional) (q8), no direct government access even with a valid demand + Key Vault (q9), commitments → principles with reuse (q10).

## Sources fetched (learn.microsoft.com, 2026-11-24)

Training units "Describe the offerings of the Service Trust portal" and "Describe Microsoft's privacy principles"; docs "Get started with the Microsoft Service Trust Portal".

## Chapter against current Learn (not errors, omissions; not tested)

- The STP get-started page now also lists: an **AI Resources** entry under Reports, Whitepapers, and Artifacts; **All Documents**; **Restricted Documents** (visible to Tenant Admin, Compliance Administrator, Security Administrator, Security Reader); **My Download History** (18 months, CSV export); series subscriptions in My Library; documents kept at least 12 months. The chapter mentions none of them.
- Privacy unit: subcontractors are listed under "You control your data" (and authorized subprocessors are audited in advance); Microsoft notifies the customer "and provides a copy of the request". The chapter keeps these as "details" without a principle: q10 doesn't map subcontractors to a principle for that reason.

## Doubts / overlaps

- q8: FedRAMP as a tile of Certifications, Regulations, and Standards comes from the get-started page (the chapter lists FedRAMP in that row; the training unit doesn't name it).
- q9 s2 (subcontractors bound by the same commitments) re-tests a fact that `sc900-4a-priv-subcontractors` uses as a distractor; q10 has the format of `sc900-4a-priv-principles-match` with four other commitments, reuse allowed and one principle unused.
- French not checked on fr-fr pages: « comité social et économique » for "works council" (q4), « accord de confidentialité de Microsoft pour les documents de conformité » and category names follow chapter 41.
