# QZ-az-305-41-compute — report

File: `content/az-305/quizzes/41-compute.yaml` (10 questions, az305-qz-41-01 to -10). `npx tsx factory/check-quiz.ts az-305 41-compute`: 0 problem(s), 0 warning(s).

Objectives: 4.1.1 (q1, q7), 4.1.2 (q2, q5, q6), 4.1.3 (q4, q8), 4.1.4 (q3, q9), 4.1.5 (q10). Positions 6-10 use dragdrop, dropdown (x2), multi and single.

## Chapter vs current Learn (chapter not edited)

- **CycleCloud schedulers.** The chapter (batch table) lists HPC Pack among the schedulers CycleCloud keeps. The CycleCloud overview page (fetched) lists Slurm, PBSPro, LSF, Grid Engine and HTCondor only. HPC Pack should be checked or removed.
- **Functions plans table.** For Container Apps hosting, Learn gives a 30-minute default and an unbounded maximum (the default depends on triggers only when min replicas is 0); the chapter says only "Depends on triggers".
- **Flex Consumption limits missing.** Learn lists no deployment slots and one app per plan for Flex Consumption. These are exam-relevant (a "slots + scale to zero" requirement) and absent from the chapter.
- **Linux Consumption.** functions-scale shows Linux Consumption as retired in its table but "retiring on 30 September 2028" in its text. The chapter only calls Consumption legacy, which is fine, but the date could be added.
- **Confidential VMs.** Learn now lists DCasv6/ECasv6 (AMD) and DCesv6/ECesv6 (Intel TDX) besides DCasv5/ECasv5. The chapter says "DC, EC", which is still right.
- **Connected registry (ACR).** The Learn page gives no GA/preview label (connected-registry billing began on 1 August 2025). I didn't use it as an answer.

## Facts used but not verified on a fetched page

- q6: Azure Hybrid Benefit on pay-as-you-go Windows VMs comes from the chapter; no AHB page was fetched. The savings plan page lists "Azure App Service" without a tier. The stem says Premium v3 to be safe.
- q8: "AKS Automatic system nodes are billed when no pod runs" is general knowledge, not from a fetched page.
- q10: "an Azure Files SMB share isn't a parallel file system for high-throughput HPC" is reasoning from the chapter (Managed Lustre / NetApp Files for shared data), not a fetched statement.
- The App Service tier table (zone redundancy from Premium v2) wasn't needed and wasn't verified.

## Overlap with mock-exam questions (deliberate, decisions differ)

- q6 brings together the reservation / savings plan / AHB / pay-as-you-go choices in one matching question. The bank tests reservation+AHB (az305-4a-vm-reservation-hybrid-benefit) and the savings plan (az305-4a-vm-savings-plan-flex) separately, each with other drivers.
- q8 has the same service as az305-4a-ctr-container-apps-microservices (Container Apps). Here the deciding requirements are private-only ingress plus no idle compute charge, against App Service, Container Instances and AKS Automatic.
