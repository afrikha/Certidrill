# QZ-az-900-21-core-architecture — report

File: `content/az-900/quizzes/21-core-architecture.yaml` (10 questions, az900-qz-21-01..10). `npx tsx factory/check-quiz.ts az-900 21-core-architecture` → 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (q1, q8), 2.1.2 (q5), 2.1.3 (q7), 2.1.4 (q3, q10), 2.1.5 (q4), 2.1.6 (q2, q9), 2.1.7 (q6). Formats 6–10: yesno_statements, multi, dragdrop, yesno_statements, single.

## Pages fetched (Nov. 2026)
- training/modules/describe-core-architectural-components-of-azure/5- (physical infrastructure) and 6- (management infrastructure)
- azure/reliability/regions-paired
- azure/governance/management-groups/overview

## Chapter / mock exam vs current Learn
- **Region pairs.** The chapter says "Most regions are paired". The training unit still says so, but "Azure region pairs and nonpaired regions" now says that **many regions aren't paired** and use availability zones instead (13 nonpaired regions listed). It also says that deploying to a paired region gives no automatic high availability, DR or failover, and that Microsoft-managed GRS failover happens only in catastrophic cases. Suggest changing "Most regions" to "Many regions" and adding the "no automatic DR" point. Note: the training unit's sentence "services would automatically fail over to the other region" contradicts the reliability page. Don't rely on it.
- **Moving resources.** The chapter says "A resource can be moved to another group". The training unit says "You can move **some** resources between groups", because not every resource type supports moving. Minor.
- **Renaming.** The training unit says resource groups can't be renamed after creation. The chapter doesn't mention this. Mock question `az900-2a-rg-statements` (option d, "can be renamed" = wrong) relies on a fact the chapter doesn't teach.
- Management groups page: the root can't be moved or deleted, and new subscriptions go to the root by default. Both match the bank.

## Doubts / not verified on a fetched page (hourly fetch limit reached)
- q5: a zonal public IP pinned to zone 1 is unavailable when zone 1 fails, and Azure doesn't move it. This follows from the zonal definition in the training unit, but the availability-zones overview page couldn't be fetched.
- q6: a role assigned directly on a subscription stays after the subscription moves to another management group. The inherited roles and policies change.
- q10: after a move, a resource gets the RBAC of its new resource group and loses that of the old one. This follows from "granting access to a resource group applies to all its resources". The move-resources page wasn't fetched.
- q8: West Europe isn't in France (it's in the Netherlands). France Central belongs to the France geography (regions-paired table: France Central ↔ France South).
- French: "Tenant Root Group" is translated as « Groupe racine du locataire » (glossary). Region names stay in English, except Europe Ouest / Europe Nord in q3, as in the FR chapter.
