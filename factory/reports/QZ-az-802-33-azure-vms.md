# QZ-az-802-33-azure-vms — report

File: `content/az-802/quizzes/33-azure-vms.yaml` (10 questions, `az802-qz-33-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 33-azure-vms` → 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.2.1 | single | 1 | 4-TiB data disk: GPT (MBR limited to 2 TiB, dynamic disk doesn't help) |
| 2 | 3.2.2 | single | 1 | Mix Spot and regular instances: Flexible orchestration |
| 3 | 3.2.5 | single | 2 | Accelerated Networking on a running VM: deallocate first |
| 4 | 3.2.4 | single | 2 | Bastion Basic fails on a /27 AzureBastionSubnet: resize to /26 (Developer excluded by peering) |
| 5 | 3.2.1 | single | 2 | Temporary IOPS on a 128-GiB Premium SSD: performance tier (no bursting below 512 GiB, no shrink) |
| 6 | 3.2.2 | dropdown | 3 | Default scale-in policy across zones: zone balance first, then highest instance ID |
| 7 | 3.2.3 | single | 3 | 120,000 IOPS on one disk + rack failure: Ultra Disk in two zones (no Ultra in availability sets, Premium SSD v2 max 80,000) |
| 8 | 3.2.4 | yesno | 3 | JIT eligibility (Azure Firewall classic rules OK, Firewall Manager not) + Reader can't initiate a request |
| 9 | 3.2.5 | dropdown | 3 | Secondary NIC has no default gateway: persistent `route add` via the .1 of its subnet |
| 10 | 3.2.1 | multi | 3 | Premium SSD 2 TiB → 8 TiB: deallocate the VM and detach the disk before expanding beyond 4 TiB |

All 18 mock-exam questions of 3.2.1–3.2.5 (including case-study questions cs1c, cs2c, cs3b) were read first; no decision reused with the same answer.

## Sources

The hourly WebFetch limit was already used up when the task started (shared with other agents). Facts were read from the Learn source repositories on GitHub (MicrosoftDocs/azure-compute-docs, azure-docs) and the JIT, disk bursting and private DNS link pages were then fetched on learn.microsoft.com. Reference titles are the `title:` metadata of the Learn pages.

## Chapter issues against current Learn (chapter not edited)

- **French chapter, Bastion table:** « Machines virtuelles de réseaux virtuels appairés » and « un réseau appairé » — the glossary says « peering », avoid « appairage ».
- **Scale-in policies:** the chapter describes zone balancing only for the Default policy. Learn ("Use scale-in policies…") says NewestVM and OldestVM also balance zones first in zone-spanning scale sets. Worth one sentence (question 6 avoids depending on it).
- **JIT prerequisites:** Learn ("Enable Just-in-Time Access") states the supported Azure Firewall case as "protected by Azure Firewall on the same virtual network as the VM"; the chapter omits "same virtual network".
- **Bursting:** the chapter mentions only the performance tier. Credit-based bursting (≤ 512 GiB, best effort, 30 min) and on-demand bursting (> 512 GiB) are the classic distractors; consider one line.
- **Learn inconsistency (not the chapter):** "Resize a virtual machine" warns that deallocating a VM releases its dynamic IP addresses, while "Private IP addresses in Azure" says dynamic private IPs are released only when the NIC is deleted, moved to another subnet or set to static. Not used in the quiz; the chapter doesn't take a position.
- **Uniform instance limit:** the orchestration modes page shows two different Uniform maxima (200 in the first comparison table, 100 "with FD guarantees" in the detailed one). The chapter's 100 matches the detailed table. Not used.

## Doubts / unverified

- Question 6: Learn describes the Default policy as zone balance → fault-domain balance (best effort) → highest instance ID; the stem neutralizes fault domains explicitly. The instance IDs are those that the scale set shows; for Flexible scale sets the doc still speaks of instance IDs.
- Question 9: the Windows interface index (7) and the route syntax follow the Learn example (`route add -p … METRIC 5015 IF 7`); the metric value is the doc's, not a requirement.
- Question 3: assumes Standard_D8s_v5 supports Accelerated Networking (Dsv5 series does per its size page; not refetched).
