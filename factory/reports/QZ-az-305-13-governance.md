# QZ-az-305-13-governance — report

File: `content/az-305/quizzes/13-governance.yaml` (10 questions, `az305-qz-13-01` to `-10`). Check: `npx tsx factory/check-quiz.ts az-305 13-governance` → 0 problem(s), 0 warning(s).

Objectives: 1.3.1 (q1, q4, q7, q10), 1.3.2 (q3, q5, q9), 1.3.3 (q2, q6, q8). Positions 6–10: multi, dropdown, yesno_statements ×2, single.

The mock bank already covers most decisions of the chapter (about 50 questions). To avoid repeating them, the quiz tests: tags not inherited (q1), catalog delegation (q2), the managed identity of a remediation task (q3), reasons for a separate subscription (q4), the Mitigated exemption category, the `manual` and `auditIfNotExists` effects (q5), PIM eligible assignments combined with PIM access reviews (q6), subscription vending, subscription policies and role assignments lost on a resource move (q7), P2 vs Governance licence limits (q8), Policy as an explicit deny system with exemption expiry (q9), and hierarchy design with environments as subscriptions (q10).

## Out of date in the chapter (verified on Learn, Nov. 2026)

- **Subscription directory transfers.** "Manage Azure subscription policies" says that since **May 1, 2026**, subscriptions can no longer be moved into or out of a directory unless a Global Administrator explicitly allows it ("Allow no users" is now the default). The chapter says to "restrict directory transfers in the subscription policies", which is still correct, but it doesn't say that blocking is now the default. Only Global Administrators with a direct assignment (after elevating access) can edit these policies, and they can list exempted users. q7 uses the exempted-users list, so it doesn't depend on the default.
- **Licence table (identity governance).** The chapter says P2 brings access reviews "in their basic form". The licensing page is more precise: P2 includes reviews of active *and* inactive users with decision helpers for inactive users. A review scoped *only* to inactive users, automatic assignment policies, catalog access reviews, machine-learning-assisted reviews and lifecycle workflows require Microsoft Entra ID Governance. The chapter is consistent with this, but it could name the "decision helpers for inactive users" available with P2, because q8 s2 relies on it.

## Doubts / unverified

- q5 s1: Waiver and Mitigated both technically exempt the resource. The answer relies on the documented meaning of the categories ("intent met through another method" = Mitigated), and the stem asks for the reason to be recorded accurately.
- q9 s2: the exemption is "no longer honored" after `expiresOn`. The exact time of re-evaluation (the standard evaluation cycle) isn't stated, so the statement only says "evaluated again", not "reported non-compliant immediately".
- Not used: the exemption structure page doesn't say explicitly whether an exemption on a resource group covers resources created in it later.
