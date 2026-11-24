# QZ-az-104-32-virtual-machines — notes

Result: `content/az-104/course/quizzes/32-virtual-machines.yaml`, 10 questions. `check-quiz` reports 0 problems and 0 warnings.

## Task file
- The objective line in the task file is cut off. It reads "3.2.1, 3.2.2, 3.2.4, 3.2.5, 3.2.6, 3.2.7, know both." and then an unclosed `<!-- section: move-vm | objectives: 3.2.3.` comment. That looks like an extraction bug: the chapter's Exam trap text and section marker got pasted into the line. The checker reads the objectives from the chapter's section markers, so it requires 3.2.3 as well. 3.2.3 is covered by Q5 (Azure Resource Mover).

## Mix
- Q1 3.2.1 single (d1), Q2 3.2.4 single (d1), Q3 3.2.5 single (d2), Q4 3.2.6 multi (d2), Q5 3.2.3 yesno (d2).
- Q6 3.2.1 multi, Q7 3.2.2 dropdown, Q8 3.2.5 dragdrop, Q9 3.2.4 single, Q10 3.2.7 hotarea (all d3).
- I avoided the decisions the bank already tests: VM sign-in roles (i2-builtin-vm-user-login), resizing an availability set, update-domain arithmetic, the CSE details, the Spot eviction-policy choice, and the Rolling and OldestVM policy choices.

## Facts checked on Learn that the chapter does not state (suggestions for the course)
- Azure Disk Encryption is **not available on v6 sizes with temp disks, v7 and newer sizes, L-family sizes, Ultra Disk, Premium SSD v2**, and VMs with less than 2 GB of memory (disk-encryption-overview, disk-encryption-windows). The chapter only says "not Basic or A-series". Q7 uses Standard_D4s_v5 to stay supported.
- Learn says the key vault must be in the same region and **tenant** (disk-encryption-key-vault page), and in another place the same region and **subscription** (disk-encryption-overview). The chapter says subscription, and Q7 relies only on the region.
- Learn states that sizes of version 5 and later **encrypt their temp disk automatically** (managed-disks-overview). Encryption questions should keep this in mind.
- The scale-in policies NewestVM and OldestVM **balance zones first** in a zone-spanning scale set (scale-in-policy page). The chapter says this only for Default. Q10 depends on it, and its explanation says so. The same page has an ambiguous note: "within an imbalanced zone, the scale set will select the Oldest VM". It contradicts the NewestVM example table. Q10 uses OldestVM so that both readings give the same answer.
- Instance protection covers scale-ins started by autoscale (instance-protection page). Learn doesn't document a manual capacity reduction, so Q10 states "Autoscale removes".
- Learn says vCPU quotas count **deallocated** VMs (quotas page). The Increase VM-family vCPU quotas page says resizing is subject to the family quota ("Insufficient quota - family limit"). Q9 is based on these two statements.
- On Windows, a size with a temp disk can only be resized to another size with a temp disk, and a size without one only to a size without one (resize-vm page). The chapter doesn't mention this. No question uses it.
- The single-VM 99.9% SLA that the chapter's table shows isn't on the Learn pages I fetched (availability, availability-set-overview), so no question uses it. Only the 99.95% availability-set figure is used, in Q4.

## Doubts
- Q4 option d (the fault domain count can't be changed after creation) relies on the availability-set-overview sentence "These settings can't be changed after the availability set is created".
- Q7: the bare flags `--enabled-for-disk-encryption` (Learn example) and `--enable-purge-protection` are both accepted by `az keyvault create`.
