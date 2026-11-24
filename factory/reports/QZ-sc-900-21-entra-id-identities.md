# QZ-sc-900-21-entra-id-identities — report

File: `content/sc-900/quizzes/21-entra-id-identities.yaml` (10 questions, `sc900-qz-21-01`…`10`). `npx tsx factory/check-quiz.ts sc-900 21-entra-id-identities` → 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (q1, q5), 2.1.2 (q2, q3, q6, q7, q8), 2.1.3 (q4, q9, q10). Formats 6–10: single, dragdrop, yesno_statements, multi, yesno_statements.

## Decisions kept away from the mock bank
The bank (33 questions on 2.1.x) already covers nearly every fact of the chapter. The quiz tests decisions the bank does not make: Workload ID as the answer, machine identities (device + workload), security group + dynamic *device* membership, "synchronization does not decide where passwords are validated", identity secure score in the Free edition, internal guest as the answer, system- vs user-assigned MI vs service principal by lifecycle, application object vs service principal in a consenting tenant, Cloud Sync + PHS for least infrastructure, and a combined scenario (PHS outage + B2B guests + system-assigned MI lifecycle).

## Doubts / unverified
- q7 (Sync1): relies on "managed identities are assigned to Azure resources", so an app in a partner datacenter outside Azure uses a service principal. Azure Arc-enabled servers can also have managed identities; the stem says the app runs outside Azure in a partner datacenter, which I consider enough, but a reviewer may want "not connected to Azure Arc".
- "Machine identities" (device + workload) appears on Learn only in the alt text of a diagram (training unit "Describe types of identities"); the chapter states it in prose.
- Not verified on Learn, so not used: whether a managed identity can be a member of a security group.

## Chapter vs current Learn (no edit made)
- Chapter says PIM needs P2; the licensing page says P2 **or Microsoft Entra ID Governance** licenses.
- Cloud Sync: the training unit says Connect Sync "is being replaced" and Cloud Sync is recommended for new deployments; the Cloud Sync docs are more nuanced ("Otherwise, continue using Connect Sync" when no migration path fits). Also, pass-through authentication configuration is not part of Cloud Sync (managed separately, decision guide). The chapter doesn't mention this; fine at SC-900 level but worth a sentence if a question ever combines Cloud Sync and PTA.
- Dynamic membership groups require P1 (for users); the chapter doesn't say so (q3 states P1 in the stem).
