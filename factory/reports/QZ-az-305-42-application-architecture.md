# QZ-az-305-42-application-architecture — report

File: `content/az-305/quizzes/42-application-architecture.yaml` (10 questions, az305-qz-42-01 to -10). `npx tsx factory/check-quiz.ts az-305 42-application-architecture`: 0 problem(s), 0 warning(s).

Objectives: 4.2.1 (q3, q10), 4.2.2 (q7), 4.2.3 (q4, q6), 4.2.4 (q5, q8), 4.2.5 (q2), 4.2.6 (q1, q9). Positions 6-10 use single, multi and dropdown (x2).

## Chapter vs current Learn (chapter not edited)

- **Service Bus queue size.** The chapter table says "No: 1 to 80 GB per queue". The quotas page gives 1–5 GB in Basic and Standard (80 GB only with partitioning) and 80 GB natively in Premium. It's worth stating that precisely.
- **Managed Redis active geo-replication.** Learn excludes Flash Optimized, as the chapter says, and also the Balanced B0 and B1 SKUs, which the chapter doesn't mention. Learn describes CRDT-based sync with eventual consistency and no SLA on sync time. "Automatic conflict resolution" is right, but the lack of a sync-time guarantee could be added.
- **Exposing a legacy system through Logic Apps + API Management.** Learn's automated "import a logic app as an API" supports Logic App (Consumption) resources only, and not workspaces. The chapter doesn't say which logic app type to front.
- **App Configuration.** Learn's FAQ confirms the chapter's tier table. It adds revision history of 7 days (Free, Developer) and 30 days (Standard, Premium), and soft delete that is always on in Standard and Premium. Both could feed point-in-time questions.
- **Service Bus.** All tiers are zone redundant automatically at no extra cost, and Basic has no transactions (reliability and transactions pages). The chapter is consistent with both.

## Facts used but not verified on a fetched page

- q10: "Geo-Disaster Recovery requires Premium" comes from the chapter. The Premium messaging page only links to Geo-DR.
- q8: the passive (read-only secondary) geo-replication of Azure Cache for Redis Premium is from memory. The retirement date (30 September 2028) was verified on the retirement FAQ.
- q9: "Microsoft-hosted agents provide no agent-assigned managed identity" is inferred from the service connection page, which ties that option to Azure VMs and calls it not recommended.

## Overlap with mock-exam questions (deliberate, decisions differ)

- q9 asks for secretless sign-in through workload identity federation in Azure Pipelines. az305-4b-dep-github-oidc tests the same principle for GitHub Actions. q9 adds an environment approval check and an AKS rolling update.
- q10 combines tier, transactions and zone redundancy for Service Bus. The bank tests sessions, duplicate detection and Premium separately, but has no question on transactions or on zone redundancy by tier.
