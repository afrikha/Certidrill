# FIX-az-900-1 — chapters 11, 12, 13, 21, 22, 23 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-900 11-cloud-computing 12-cloud-benefits 13-service-types 21-core-architecture 22-compute-networking 23-storage` 0 problems; `content:validate --cert az-900` 0 problems, 0 warnings (471 files, course 57/57 objectives); `check-quiz az-900` (the six chapters) 0 problems, 0 warnings.

Every change was made in EN and FR, with the same sections, tables and callouts. No code block changed. No section marker changed.

Fetch budget: the shared WebFetch budget ran out twice during the pass, and then the hourly limit was reached. Pages I couldn't fetch are listed under "Checked and left unchanged" as not re-verified.

## 11-cloud-computing

| Finding | Learn | Change |
| --- | --- | --- |
| Shared responsibility matrix: client devices Shared in SaaS, applications Shared in PaaS and SaaS, no "identity and directory infrastructure" row | Confirmed that the pages disagree. *Shared responsibility in the cloud* (azure/security/fundamentals, updated 2026-08-24) has this matrix: client devices Customer/Customer/Customer/**Shared**, applications Customer/Customer/Shared/**Shared**, network controls Shared in PaaS and Microsoft in SaaS. But the same page's prose, "Responsibilities you always retain", lists **endpoints** (client devices) as always the customer's. The AZ-900 training unit *Describe the shared responsibility model* says devices are always the consumer's, and identity and access is shared in PaaS and SaaS. It gives the per-model split for applications only in an image | None. Learn is ambiguous, and the security page contradicts itself. For a human decision (below) |
| Consumption-based unit no longer covers pricing models or serverless | Confirmed (training unit 6 covers pay-as-you-go only) | None. 1.1.6 and 1.1.7 are still in the study guide (July 20, 2026) |
| Functions: Consumption plan is legacy, Flex Consumption recommended | Confirmed (*Azure Functions Overview*, updated 2026-09-21: Consumption = "Legacy serverless plan (Windows only)"). *Flex Consumption plan hosting*: in on-demand mode you're billed only while code runs; scale to zero; always-ready instances (default 0) are billed as a baseline | None. "Pay per use: billed for executions and consumed resources, not for idle time" and "down to zero" stay correct for on-demand billing. No bank question names the Consumption plan |
| Spot: an existing VM can't be converted; "deep discount" with no percentage | Not re-fetched. The chapter makes neither claim wrong | None |

## 12-cloud-benefits

| Finding | Learn | Change |
| --- | --- | --- |
| "Elasticity" isn't on the Learn unit | Confirmed: the word isn't on *Describe the benefits of high availability and scalability in the cloud*. The unit says horizontal scaling can be automatic or manual | None. The definition doesn't contradict Learn. For a human decision whether to keep it |
| Sustainability unit not in objectives.yaml | Confirmed: the module has the unit `5a-describe-sustainability-cloud`, but the study guide (skills measured as of July 20, 2026) has no sustainability item | None |
| Reliability: a pillar of the Well-Architected Framework | Confirmed (*Describe the benefits of reliability and predictability in the cloud*) | One clause in the reliability paragraph. The unit's other sentence ("your cloud environment itself will automatically shift to a different region") was not added: *Azure region pairs and nonpaired regions* says not to rely on Microsoft-managed failover |
| Cost predictability, security and governance, manageability | Confirmed: they match the units; "cost analysis" is consistent with "apply data analytics" | None |

## 13-service-types

| Finding | Learn | Change |
| --- | --- | --- |
| PaaS: the customer side is "application code, data, and access controls"; some settings are shared | Confirmed (*Describe Platform as a Service*: "Depending on service configuration, some networking and application security settings are shared") | PaaS section: access controls, and the sentence on shared settings |
| SaaS and devices | *Describe Software as a Service*: you manage "your data, identity and access settings, and device access posture". The chapter's "data, devices, accounts" is consistent | None (see the devices point in 11) |
| q6 App Service admin rights, q4/q8 serverless billing | Not re-verified (no App Service page fetched). The Flex Consumption page confirms billing for execution time in on-demand mode | None |

## 21-core-architecture

| Finding | Learn | Change |
| --- | --- | --- |
| "Most regions are paired" | Wrong per *Azure region pairs and nonpaired regions* (updated 2026-10-15): "many regions aren't paired, and instead use availability zones", and many newer regions have no pair | "Many regions are paired"; the bullet now says many regions, especially newer ones, have no pair |
| No automatic DR in a pair; Microsoft-managed GRS failover only in catastrophic cases | Confirmed (same page) | New bullet in the region pairs list |
| "A resource can be moved to another group" | Training unit *Describe Azure management infrastructure*: "You can move *some* resources between groups" | Bullet: "at a time", some resources, not every type supports moving |
| Resource groups can't be renamed | Confirmed (same unit) | New bullet and Key points |
| Data residency (Brazil South), staggered updates, recovery priority, West Europe ↔ North Europe | Confirmed (regions-paired) | None |
| Management groups: 6 levels, 10,000, one parent, root | Confirmed (training unit 6) | None |
| "At least 300 miles" | Not on regions-paired; training unit 5 not re-fetched (fetch limit) | None |

## 22-compute-networking

| Finding | Learn | Change |
| --- | --- | --- |
| ExpressRoute "worldwide with Global Reach" | Wrong per *What is Azure ExpressRoute?*: you reach the regions of the same geopolitical region; **ExpressRoute Premium** extends this across geopolitical boundaries (national clouds excluded); **Global Reach** links your on-premises sites to each other through their circuits | VPN/ExpressRoute table, Notes cell |
| Azure Virtual Desktop with Entra ID and MFA | Not re-verified (the QZ writer says the AZ-900 module states it) | None |
| FR « (appairage) » after « peering » | Glossary: « peering », avoid « appairage » | Removed |

## 23-storage

| Finding | Learn | Change |
| --- | --- | --- |
| Data Box "holds about 80 terabytes" | Out of date per *What is Azure Data Box?*: next-gen devices have 120 TB and 525 TB of usable capacity; the 80 TB device is being retired as next-gen expands (no new orders after retirement); Data Box Heavy is retired | Migration-options paragraph: 120 or 525 TB usable; 80 TB device being retired region by region |
| Premium file shares now called "SSD file shares" on some pages | Not re-fetched | None. Naming choice for the owner (below) |
| Smart tier, geo priority replication | Not needed for AZ-900 | None |
| Premium page blobs LRS/ZRS (account overview) vs LRS only (redundancy page) | Not re-fetched | None |
| FR tier names | Guide: « niveau chaud (Hot) », « niveau froid (Cool) », « niveau froid (Cold) », « niveau archive (Archive) » | storage-tiers bullets and Key points: bare "Hot, Cool, Cold, Archive" replaced by the glossary forms |

## Mock-exam bank questions changed

- `questions/architecture/az900-2a-region-pair-limits.yaml` (EN + FR explanation): "Most regions are paired, but several newer regions (for example Italy North or Poland Central) have no pair" became "Many regions, especially newer ones, have no pair and rely on availability zones instead". This follows regions-paired. The two examples were dropped because I couldn't re-check them in the nonpaired table. The answers didn't change.
- `questions/architecture/az900-2a-region-pair-sentence.yaml` (EN + FR template): "Most Azure regions are paired with another region located in [[scope]]" became "When an Azure region has a pair, the paired region is usually located in [[scope]]". Same answer (`geo`), same slots. Regions-paired: "almost all regions reside within the same geography as their pair".

## Checked and left unchanged

- Shared responsibility: `az900-1a-sr-always-customer`, `az900-1c-saas-responsibility-statements` (s3 devices = Yes), `az900-1c-saas-provider-task`, `az900-1a-sr-match`, `az900-1a-sr-shift-yn`, `az900-1a-sr-saas-accounts`. They follow the training unit, and the security page's own prose ("endpoints" always retained). No bank question says applications in SaaS are the provider's alone.
- Resource groups: `az900-2a-rg-statements` (d "can be renamed" = wrong, now taught by the chapter; e "A resource can be moved" = correct, and its explanation already says "many resource types"); `az900-2a-sub-subtle` s2 (same generic wording, explanation precise).
- Region pairs: `az900-2a-region-pair-benefit`, `az900-2a-az-limits`, `az900-2c-red-yn-secondary`.
- ExpressRoute: no bank question relies on Global Reach or geography reach.
- Data Box: `az900-2c-mig-databox-order` (70 TB fits every device), `az900-2c-mig-yn-databox`, `az900-2c-mig-databox-scenarios`. None states a capacity.
- Pricing and serverless: the Spot, reservation and savings plan questions (`az900-1b-price-*`, `az900-3a-cost-*`); none says a VM can be converted to Spot, gives a Spot percentage or names the Functions Consumption plan.
- Quizzes: none changed. Quiz 22 q10 s3 ("regions of the same geography" through ExpressRoute = Yes) is still true: France Central's geography is inside the geopolitical region. Quiz 21 and 13 agree with the new resource group and PaaS sentences.

## For a human decision

1. **Shared responsibility, devices and applications (chapters 11 and 13).** The AZ-900 training unit (devices always yours; per-model split for applications only in an image) and *Shared responsibility in the cloud* (matrix: devices Shared in SaaS, applications Shared in PaaS and SaaS; prose: endpoints always yours) disagree, and the security page contradicts itself. The chapter keeps the training-unit version (devices always You, applications SaaS = Provider). Decide which source to follow.
2. **Elasticity** (12): not a Learn term in the unit. Keep it as a side note or drop it.
3. **Sustainability** (12): Learn added a unit, but the study guide of July 20, 2026 has no objective for it. Nothing written.
4. **"Premium file shares" vs "SSD file shares"** (23): Learn is moving to SSD/HDD file shares on some pages; the account-overview type name is still "Premium file shares". Naming choice.
5. **Not re-verified because of the fetch limit**: "at least 300 miles" (21), AVD with Entra ID and MFA (22), premium page blob redundancy (23), App Service admin rights (quiz 13 q6).
6. Word counts: 22 (1,263 EN words) and 23 (1,311) were already above the 1,200-word fundamentals target before this pass; the additions add about 20 words each.

## French terms not settled (not in the glossary)

- « région géopolitique » (geopolitical region), « module complémentaire ExpressRoute Premium » (Premium add-on): used in 22.
- « appareils de nouvelle génération » (Data Box Next-gen), « données utiles » (usable capacity): used in 23.
- « Azure Well-Architected Framework » kept in English, as in the AZ-305 course.
- Out of scope, not changed: `objectives.yaml` FR 2.2.5 says « l'appairage » (study guide wording).
