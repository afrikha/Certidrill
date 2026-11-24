# QZ-az-900-12-cloud-benefits — report

File: `content/az-900/quizzes/12-cloud-benefits.yaml` (10 questions, `az900-qz-12-01` to `-10`). `npx tsx factory/check-quiz.ts az-900 12-cloud-benefits`: 0 problem(s), 0 warning(s).

Objectives: 1.2.1 (Q1, Q5, Q6), 1.2.2 (Q3, Q7), 1.2.3 (Q4, Q9, Q10), 1.2.4 (Q2, Q8). Positions 6–10: yesno_statements, single, dragdrop, yesno_statements, dragdrop.

## Chapter vs current Learn (units of "Describe the benefits of using cloud services", fetched 2026-11-24)

1. **Elasticity.** The chapter defines it ("Elasticity is scalability made automatic"), but the Learn unit "Describe the benefits of high availability and scalability in the cloud" never uses the words "elasticity" or "elastic". It only says "scaling can be automatic or manual". Not tested. The chapter could keep it as a side note, or drop it.
2. **New Learn unit not in objectives.yaml.** The module now has a unit named "Describe sustainability considerations in the cloud" (`5a-describe-sustainability-cloud`). `content/az-900/objectives.yaml` (study guide of 2026-07-20) has no sustainability objective. Someone should check whether the study guide added one; I couldn't verify it here.
3. **Reliability.** Learn also says reliability is a pillar of the Azure Well-Architected Framework, and that in some cases the cloud environment shifts to another region automatically. The chapter leaves both out (minor).
4. **Cost predictability.** Learn lists real-time tracking, monitoring for efficient use, data analytics on patterns and trends, and the pricing calculator. The chapter's "cost analysis" isn't named on the page, but it's consistent with it.
5. **Security and governance.** Learn adds that establishing governance early keeps the environment updated and secure. The chapter omits this (minor). Otherwise the chapter matches: templates, update at scale, auditing with mitigation, IaaS = maximum control, PaaS/SaaS for automatic patching, DDoS.
6. **Manageability.** It matches Learn exactly: of the cloud = autoscale, templates, health monitoring with automatic replacement, alerts; in the cloud = portal, CLI, APIs, PowerShell.

## Doubts

- Q10 (dragdrop: situation → benefit) is filed under 1.2.3, but it also exercises predictability (1.2.2) and manageability (1.2.4). Its alert target relies on Learn listing metric alerts under management of the cloud: a candidate could argue for performance predictability, but neither the chapter nor Learn supports that.
- Q4 (patching load → PaaS or SaaS) tests the same fact as the Yes/No statement s3 of the mock question `az900-1b-gov-yn-control`. Here it's a scenario whose distractors are other governance features (templates, auditing, private cloud). The bank already covers every fact of chapter 12 (about 37 questions for 1.2.1–1.2.4), so some fact-level overlap couldn't be avoided.
- Q1 (scale down) uses the same four option labels as `az900-1b-ha-largest-size`, but the answer is different (scale-down, not scale-out).
