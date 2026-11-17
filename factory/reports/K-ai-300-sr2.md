# K-ai-300-sr2 — report

5 Yes/No series (3 questions each, 15 questions), one per domain:

| Series | Objective | Answers (1/2/3) | Difficulty |
| --- | --- | --- | --- |
| ai300-sr2-oidc-environment | 1.3.1 (mlops) | No / Yes / No | 3, 2, 1 |
| ai300-sr2-sweep-slack | 2.1.4 (ml-lifecycle) | No / No / Yes | 2, 2, 1 |
| ai300-sr2-ptu-bursts | 3.2.4 (genaiops) | Yes / No / No | 2, 3, 2 |
| ai300-sr2-ungrounded-claims | 4.1.2 (quality) | No / Yes / No | 2, 1, 2 |
| ai300-sr2-part-numbers | 5.1.3 (optimization) | No / Yes / Yes | 1, 2, 3 |

Difficulty mix: 4 easy, 8 medium, 3 hard.

## Notes and doubts

- Overlap with ai300-sr1 (written in parallel) was not checkable: no sr1 file existed when this batch was written.
- Sweep series: the current hyperparameter tuning page no longer says whether Bayesian sampling supports early termination, so the series uses random sampling and avoids that point.
- Evaluation series: Learn currently documents two syntaxes for data mapping (classic `azure-ai-evaluation` `${data.x}` and new Foundry `{{item.x}}`); the series stays syntax-neutral (evaluator choice and input mapping in prose).
- PTU series: the spillover page only says "a corresponding standard deployment" of the same model and version in the same resource; the scenario uses Data Zone Standard for a Data Zone Provisioned deployment (same processing scope, per the deployment types table), and no answer depends on that pairing.
- OIDC series, question 3: "environment secrets are readable only after reviewer approval" comes from GitHub behavior (also stated in course chapter 13), not from a Learn page.
