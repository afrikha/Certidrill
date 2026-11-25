# QZ-az-900-32-governance-compliance — report

File: `content/az-900/quizzes/32-governance-compliance.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).
Objectives: 3.2.1 (q3), 3.2.2 (q1, q4, q7, q8), 3.2.3 (q2, q5, q6, q9, q10). Formats 6–10: dragdrop, single, dropdown, yesno_statements, multi.

## Facts verified on Learn (fetched 2026-11-24)
- Purview training unit: two areas "risk and compliance" (Microsoft 365: Teams, OneDrive, Exchange) and "unified data governance" (map with classification and lineage, where sensitive data is stored, Azure/SQL/Hive/on-premises/Amazon S3).
- Locks (lock-resources + training unit): Delete/ReadOnly, subscription/RG/resource only ("You can't add a lock to management groups"), inherited including resources added later, "The most restrictive lock in the inheritance chain takes precedence", a Delete lock on a resource blocks the deletion of its resource group (no partial deletion).
- Azure Policy (overview + training unit): exclusions of child scopes, remediation of existing resources, add a missing tag, Azure DevOps pre/post-deployment, applies whoever makes the change.
- Tags: "Resources don't inherit the tags you apply to a resource group or a subscription" (tag-resources).

## Doubts / chapter gaps (chapter not edited)
- q9 s1 and s3 rely on two Learn facts that the chapter doesn't state explicitly: the most restrictive inherited lock wins, and a Delete lock on a resource blocks the deletion of its resource group. Both are derivable from "locks are inherited" but the chapter could add one line each (and "locks can't be applied to management groups", only implied today).
- The chapter doesn't say that locks protect only control plane operations (a lock on a storage account doesn't protect its blob data). Not tested here; worth an `Exam tip` since Learn stresses it.
- q7 relies on "tags are not inherited", taught in another chapter (exam profile classic trap), not in chapter 32.
- Reference title: the Policy overview page has H1 "What is Azure Policy?" and HTML title "Overview of Azure Policy - Azure Policy"; the bank uses both forms. I used "Overview of Azure Policy" like the AZ-104 model quiz.
- The initiative example in the chapter (*Enable Monitoring in Azure Security Center*) is still the one on the Learn unit, even though Security Center is now Defender for Cloud; fine as quoted, not tested.
