# QZ-az-104-13-governance — notes

File: `content/az-104/course/quizzes/13-governance.yaml` (10 questions, check-quiz: 0 problem(s), 0 warning(s)).

| # | Objective | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 01 | 1.3.1 | 1 | single | Owner is still denied by a `deny` policy |
| 02 | 1.3.5 | 1 | single | Resource providers are registered per subscription |
| 03 | 1.3.3 | 2 | yesno | `Replace` semantics, tag names case-insensitive, 128-char name limit on storage accounts |
| 04 | 1.3.4 | 2 | single | Region change = Azure Resource Mover, not a resource group/subscription move |
| 05 | 1.3.6 | 2 | multi | Deallocate vs OS shutdown, Azure Hybrid Benefit (budget/tags/move do not lower cost) |
| 06 | 1.3.7 | 3 | single | Default management group for new subscriptions (hierarchy settings) |
| 07 | 1.3.6 | 3 | yesno | Budget never blocks, 8–24 h data latency, anomaly alerts subscription-only |
| 08 | 1.3.2 | 3 | ordering | Read-only lock on source RG blocks a move; a resource's own Read-only lock does not |
| 09 | 1.3.1 | 3 | dropdown | Exemption (not exclusion) on one resource, one reference ID, category Mitigated |
| 10 | 1.3.1 | 3 | hotarea | Cumulative assignments + exclusion + DoNotEnforce |

## Doubts / findings

- **Chapter inaccuracy (13-governance, section resource-groups):** the chapter says "A lock on the source or destination blocks the move." Learn (move-resource-group-and-subscription, fetched Nov. 2026) says only *read-only* locks on the source or destination resource group or subscription block a move. The lock page says a read-only lock on a resource group prevents moving resources in or out of it, and that you *can* move a resource that has its own read-only lock. Learn says nothing about Delete (CanNotDelete) locks and moves. Q08 relies only on the read-only behavior. Suggest that the chapter owner make that sentence more precise (EN and FR).
- Learn (exemption-structure, scope) does not say explicitly that an exemption stops a `deny` from being enforced on later updates. Q09 relies only on "not evaluated / shown as Exempt / assignment not modified / Mitigated meaning", which Learn does state.
- For Q05, Azure Hybrid Benefit requires at least 8 core licenses per VM. The stem says the licenses are "enough to cover the 12 virtual machines".
- For Q06, Learn names a built-in role, Hierarchy Settings Administrator, for hierarchy settings. The chapter doesn't mention it, so the quiz doesn't test it.
