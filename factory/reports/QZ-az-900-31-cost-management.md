# QZ-az-900-31-cost-management — report

File: `content/az-900/quizzes/31-cost-management.yaml` (10 questions, `az900-qz-31-01` to `-10`). `npx tsx factory/check-quiz.ts az-900 31-cost-management` → 0 problem(s), 0 warning(s).

Coverage: 3.1.1 (Q2, Q10), 3.1.2 (Q5, Q6), 3.1.3 (Q3, Q7, Q8), 3.1.4 (Q1, Q4, Q9). Positions 6–10 formats: single, dragdrop, yesno_statements, yesno_statements, multi.

All 44 mock-exam questions of 3.1.x were read first. New decisions: OS license as a resource-type factor, the "workload optimization and automation" tag purpose, several tags vs resource groups / management groups, budget scope + service filter + threshold as % of the budget, estimate vs invoice gap (outbound data not estimated), calculator for a *planned change of deployed* resources (trap: "already deployed → Cost Management"), Cost Management capability matching (forecast, budget automation, cost alerts, Advisor unused VMs), budget automation that deallocates VMs while disks keep billing, a tag policy combined with non-inheritance, and cost levers under constraints (no Software Assurance, no interruption, immediate read → Cold, not Archive).

## Verified on Learn (fetched 2026-11-24)

- Budgets: scopes management group / subscription / resource group (and billing scopes); filters "such as resource groups in a subscription or a service like virtual machines"; actual and forecasted alerts; action groups only for subscription and resource group scopes; "Resources aren't affected, and your consumption isn't stopped" (tutorial-acm-create-budgets).
- Cost Management unit 6: three cost alert types in one place, credit alerts at 90 % and 100 % (EA), budgets can trigger automation.
- Cost analysis forecast (quick-acm-cost-analysis). Advisor: VMs unused for 7 days → shut down, estimated savings shown (advisor-cost-recommendations).
- Windows Server VM base compute rate equals the Linux rate when the license is covered by Azure Hybrid Benefit; eligibility requires active Software Assurance or qualifying subscription licenses (windows-server azure-hybrid-benefit).
- Deallocated VMs: disks and networking keep incurring charges (states-billing).
- Tags: purposes, not inherited from subscriptions and resource groups (unit 7); tag policies (tag-policies). Access tiers: Cold online for rarely accessed data needing fast retrieval, Archive offline, rehydration up to 15 hours (access-tiers-overview).
- Pricing calculator: estimates without logging in; options include region, OS, tier, pricing plans (reservations, savings plans), support plan, currency; save, share link, export to Excel; nothing provisioned or charged (pricing-calculator, unit 3).

## Doubts / inferred

- Q5: "the calculator estimates only the products you add" is inferred from how the tool works (the estimate lists products you add, network costs included only if added); Learn doesn't state it in one sentence.
- Q3: the budget filter value is written "the Virtual Machines service" (Learn: "a service like virtual machines"); the exact filter property name in the portal (Service name) is not asked.

## Chapter vs current Learn

- Chapter, network traffic row: "Traffic inside a region costs less than traffic between regions." The AZ-900 unit doesn't say this; it says moving data within Europe costs less than from Europe to Asia or South America, and that outbound pricing depends on billing zones. Not verified on Learn this session: either cite a Learn page or align the sentence with the unit.
- Chapter, tags: "Resources don't inherit the tags... unless a policy applies them." Cost Management also has a **tag inheritance** setting that applies subscription and resource group tags to usage records for cost reporting (from memory, not fetched this session). Worth checking and, if confirmed, adding a nuance (cost data vs the resource itself). The quiz avoids any question that depends on resource group tags in cost analysis.
- Budgets: Learn states that cost data arrives within 8–24 hours and budgets are evaluated every 24 hours, so alerts aren't real time, and that action groups work only at subscription and resource group scopes. The chapter could add this as an exam tip; nothing in it is wrong.
- The URL of the AZ-900 calculator unit still ends with `3-compare-pricing-total-cost-of-ownership-calculators`, but its title is now "Explore the pricing calculator" (TCO calculator removed from the study guide, consistent with the profile).
- No out-of-date mock-exam question was seen while reading the 3.1.x bank (not a full review).
