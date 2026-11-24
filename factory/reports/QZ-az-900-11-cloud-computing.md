# QZ-az-900-11-cloud-computing — report

File: `content/az-900/quizzes/11-cloud-computing.yaml` (10 questions, `az900-qz-11-01` to `-10`). `npx tsx factory/check-quiz.ts az-900 11-cloud-computing`: 0 problem(s), 0 warning(s).

Objectives: 1.1.1 (Q1), 1.1.2 (Q2, Q8), 1.1.3 (Q6), 1.1.4 (Q9), 1.1.5 (Q5), 1.1.6 (Q3, Q10), 1.1.7 (Q4, Q7). Positions 6–10: yesno_statements, yesno_statements, dropdown, single, multi.

## Learn pages that disagree with the chapter (or with each other)

1. **Shared responsibility matrix, devices and SaaS applications.** The page "Shared responsibility in the cloud" (`azure/security/fundamentals/shared-responsibility`, fetched 2026-11-24) now has this matrix: customer data, configurations and settings, identities and users = customer everywhere; **client devices = Shared in SaaS**; **applications = Shared in PaaS and in SaaS**; network controls = Shared in PaaS, Microsoft in SaaS; OS = Microsoft in PaaS/SaaS. It has no "identity and directory infrastructure" row.
   - The AZ-900 training unit "Describe the shared responsibility model" still says devices are **always** the consumer's, and says identity and access is shared in PaaS and SaaS.
   - The chapter table (11, `shared-responsibility`) follows the old diagram: devices always "You", applications in SaaS "Provider". The two Learn pages contradict each other, so I left both points out of the quiz (Q2 was rewritten for that reason). Someone should decide which source the chapter follows; for the exam, the training unit is the safer source.
   - Mock questions that rely on "devices always customer" and may be challenged with the security page: `az900-1a-sr-always-customer` (explanation), `az900-1c-saas-responsibility-statements` (s3 = Yes), `az900-1c-saas-provider-task` (option d explanation). Not edited.
2. **Training unit 6 "Describe the consumption-based model"** no longer covers pricing models or serverless (only pay-as-you-go is named). Objectives 1.1.6 and 1.1.7 therefore rely on product pages (Spot, Reservations, Azure Hybrid Benefit, Functions overview).
3. **Azure Functions Overview**: the Consumption plan is now called legacy and Windows-only; Flex Consumption is recommended. The page no longer says "pay per execution" (it says pay-as-you-go for Flex Consumption). The chapter's "pay per use: billed for executions and consumed resources" is still right. Q4 and Q7 just say "a serverless plan", and Q7's stem says that instances are created only when events arrive (Flex Consumption can also keep always-ready instances, which are billed).
4. **Spot VMs**: you can't convert an existing VM to Spot (or Spot back to standard). The chapter doesn't say otherwise; I worded the Q4 distractor "Redeploy the API on a Spot virtual machine" because of this. The page says "significant cost savings", without a percentage; the chapter says "deep discount".

## Checked facts

- Reservations: 1 or 3 years, up to 72 % off pay-as-you-go. They cover compute only, not Windows software costs, and the page says "You can cover the licensing costs with Azure Hybrid Benefit". This supports the combination in Q10.
- Azure Hybrid Benefit for Windows Server: you need active Software Assurance or qualifying subscription licenses, and you then pay the base compute rate. The AHB page itself doesn't mention reservations; the combination is confirmed only by the Reservations page.
- Define cloud models: private cloud = single entity, can be hosted offsite or by a third party, organization maintains the hardware; public cloud = no CapEx to scale up; multicloud = several public providers; Arc manages hybrid and multicloud environments together (Q9).

## Doubts

- Q9 counts a bank datacenter that holds a "private cloud" plus Azure as hybrid, and Azure plus another provider as multicloud, so "hybrid and multicloud". This follows Learn's definitions (the Arc paragraph names both), but the exam has never, to my knowledge, asked about the two labels together. The answer depends on the stem saying "private cloud" explicitly.
- Q3: the savings plan distractor is wrong because its hourly commitment is billed even when the nightly job doesn't run. That reasoning goes slightly beyond the chapter, which groups reservations and savings plans together as "reserved capacity".
- The bank (`questions/`) already covers almost every fact of chapter 11 (45+ questions for 1.1.1–1.1.7). The quiz uses different decisions and combinations, but some facts necessarily recur: the physical layers are always the provider's, and Spot suits interruptible work.
