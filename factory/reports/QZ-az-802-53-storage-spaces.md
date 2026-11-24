# QZ-az-802-53-storage-spaces — report

File: `content/az-802/quizzes/53-storage-spaces.yaml` (10 questions, `az802-qz-53-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 53-storage-spaces` → 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 5.3.2 | single | 1 | Physical disk usage HotSpare |
| 2 | 5.3.1 | single | 1 | Mount a volume in an empty NTFS folder (access path) instead of a drive letter |
| 3 | 5.3.3 | single | 2 | Two-node S2D goes down with one node: missing cluster witness |
| 4 | 5.3.4 | single | 2 | `Test-SRTopology` before creating a partnership |
| 5 | 5.3.6 | single | 2 | No DCB on the switches: iWARP rather than RoCE |
| 6 | 5.3.1 | single | 3 | Shrink blocked by the paging file (event 259): move it first |
| 7 | 5.3.7 | yesno | 3 | Aggregated sharing (about 1,000 each, minimum not per disk); Set-StorageQosPolicy updates assigned disks |
| 8 | 5.3.2 | ordering (3) | 3 | Failed disk, replacement already added: Retired → Repair-VirtualDisk → Remove-PhysicalDisk |
| 9 | 5.3.4 | multi (2) | 3 | SR replicates VSS snapshots and deletions; destination dismounted; test failover snapshot |
| 10 | 5.3.3 | dropdown | 3 | Two nodes, max capacity: two-way mirror vs nested mirror-accelerated parity (39 % vs 25 %) |

All 28 mock-exam questions of 5.3.1–5.3.4, 5.3.6, 5.3.7 (bank and case studies) were read first. Q10 differs from `az802-5b-s2d-nested` (which offers only one nested option): here both nested options are offered and capacity decides.

## Chapter issues against current Learn (chapter not edited)

- **Mount point folder (disks-volumes):** the chapter says "an empty NTFS folder"; "Assign a mount point folder path to a drive" says an empty folder on an **NTFS or ReFS** volume (the Disk Management label still says "empty NTFS folder").
- **Three-way mirror minimum:** "Deploy Storage Spaces on a stand-alone server" adds that the five disks **don't include hot spares**. Not in the chapter; a likely exam trap.
- **Storage QoS:** the overview says the policy type (Aggregated/Dedicated) **can't be changed after creation**, and that several VHDX files of one VM with the same Dedicated policy **share** its limit. Neither is in the chapter. The overview page itself is still written for Windows Server 2016.
- **Storage Replica test failover:** the overview names a `Test-Failover` cmdlet; the cmdlet reference is `Mount-SRDestination` (needs an unused NTFS/ReFS volume as temporary path). The chapter names neither; consider naming `Mount-SRDestination`.
- **Mirror-accelerated parity on two nodes:** the chapter table gives nested MAP "about 35 % to 40 %"; Learn's table confirms (39.1 % with 6 capacity drives, 10 % mirror).

## Doubts / not fully verified

- Q8 order: the chapter gives add → retire → repair → remove; Learn only says (Remove-PhysicalDisk) to add the replacement before removing the old disk. No current Learn procedure for stand-alone Storage Spaces disk replacement was found. The stem puts the Add step in the scenario to avoid an add/retire ambiguity.
- Q5: "InfiniBand adapters don't connect to Ethernet switches" (distractor rationale) is general knowledge; the iWARP/RoCE/DCB facts come from "Deploy Storage Spaces Direct on Windows Server".
- Q3: the deploy page says a two-server cluster without witness becomes unavailable when one server is offline; "loses quorum" is the usual explanation, not quoted.
- French not seen on fr-fr Learn: « miroir bidirectionnel imbriqué », « parité accélérée par miroir imbriquée » (« imbriqué(e) » for nested), « Réduire le volume » (kept with "Shrink Volume" in parentheses), « mettre hors service (Retired) ». Wizard and Disk Management labels kept in English in the French text.
