# QZ-az-900-13-service-types — report

File: `content/az-900/quizzes/13-service-types.yaml` (10 questions, az900-qz-13-01..10). `npx tsx factory/check-quiz.ts az-900 13-service-types` → 0 problem(s), 0 warning(s).

Objectives: 1.3.1 (q1, q5, q9), 1.3.2 (q3, q6), 1.3.3 (q2, q7), 1.3.4 (q4, q8, q10). Formats 6–10: single, yesno_statements, dragdrop, multi, single.

## Pages fetched (Nov. 2026)
- training/modules/describe-cloud-service-types/2-, 3-, 4- (IaaS, PaaS, SaaS units)
- azure/security/fundamentals/shared-responsibility

## Chapter / mock exam vs current Learn
- **SaaS and devices.** The "Shared responsibility in the cloud" page's text table now lists *Client devices* as **Shared** for SaaS (Customer for IaaS/PaaS) and *Applications* as **Shared** for PaaS and SaaS. The chapter table says SaaS customers manage "Data, devices, accounts" and PaaS customers manage "Applications and data". Acceptable at AZ-900 level, and the SaaS training unit says the customer manages "device access posture", but the chapter could add that some application and network settings are shared in PaaS (the PaaS unit says so too). Mock question `az900-1c-saas-responsibility-statements` s3 (devices = Yes) still holds because the customer keeps a share. I wrote no question on devices.
- The PaaS unit now describes the customer side as "application code, data, and access controls". q3 relies on this.

## Doubts / not verified on a fetched page
- q6: that App Service doesn't let you install software with administrator rights in the operating system. This follows the chapter ("full control of the OS → IaaS") and the PaaS unit, but no App Service page was fetched (hourly fetch limit reached).
- q8/t4 and q4: "billed only while it runs / per execution → PaaS (serverless)" comes from the chapter's sentence on Azure Functions. I didn't fetch a Learn page that says it.
