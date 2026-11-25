# QZ-az-802-31-hyper-v-guests — report

File: `content/az-802/quizzes/31-hyper-v-guests.yaml` (10 questions, `az802-qz-31-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 31-hyper-v-guests` → 0 problem(s), 0 warning(s).

## Sources

WebFetch hit its hourly limit at the first call (shared with other agents) and was still blocked one hour later. Facts were checked against the **source Markdown of the Learn pages**: the `MicrosoftDocs/windowsserverdocs` clone in `/tmp/C-az-802-3/wsd` (last commit 2026-11-16), `MicrosoftDocs/windows-powershell-docs` (winserver2025-ps, Hyper-V module, via raw.githubusercontent.com). Learn URLs come from the file paths and `.openpublishing.redirection*.json`; titles are the `title:` metadata. Re-check with WebFetch if you need a rendered-page check.

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.1.8 | single | 1 | Default (production) checkpoint: VM is off after apply |
| 2 | 3.1.1 | multi | 1 | Local resources (printer, smart card) need ESM; Ctrl+Alt+Del, Media menu, checkpoint don't |
| 3 | 3.1.2 | single | 2 | `Copy-Item -FromSession` (guest to host) vs -ToSession / Invoke-Command / Copy-VMFile |
| 4 | 3.1.4 | single | 2 | Runtime resize of static memory with `-StartupBytes` |
| 5 | 3.1.5 | dragdrop | 2 | Heartbeat / VSS / KVP / Time Synchronization capabilities |
| 6 | 3.1.6 | ordering | 3 | Return a DDA GPU to the host: off, Remove-VMAssignableDevice, Mount-VMHostAssignableDevice, enable in Device Manager |
| 7 | 3.1.3 | single | 3 | Nested Hyper-V: memory changes only with the VM off (runtime resize fails, Dynamic Memory frozen) |
| 8 | 3.1.7 | multi | 3 | GPU-P blockers: SR-IOV off in BIOS, Windows Server 2016 guest (Standard edition and no cluster are fine) |
| 9 | 3.1.4 | yesno | 3 | Run-time Dynamic Memory changes (max up yes, min up no) and Smart Paging on restart |
| 10 | 3.1.8 | multi | 3 | VSS integration service disabled → Production fell back to standard; re-enable VSS + ProductionOnly |

All 38 mock-exam questions of 3.1.1–3.1.8 (including case-study and series questions) were read first; no scenario or decision reused with the same answer. Q10 shares the answer `ProductionOnly` with `az802-3a-cp-dc-settings`, but the decision tested is the diagnosis (VSS integration service disabled causing a fallback), combined with it.

## Chapter or mock-exam issues against current Learn (not edited)

- **GPU partitioning, number of partitions per VM — Learn contradicts itself.** "Partition and assign GPUs to a virtual machine in Hyper-V" says "Currently, you can assign only a single GPU partition to a VM", but "Partition and share GPUs with virtual machines on Hyper-V" (Limitations, ms.date 07/18/2025) now says "If you assign more than one GPU partition to a VM, each partition appears as another GPU." The chapter ("one partition per VM") and the mock questions `az802-3a-gpup-statements` (s1 = No) and `az802-cs3c-gpu-partitioning` (s3 = No) rely on the first statement. To review; not used in this quiz.
- **SSH Direct (`hvc ssh`)**: still no Learn page (already noted in C-az-802-2 / Q-az-802-3a). Not used in this quiz, so 3.1.2 is tested through PowerShell Direct only.
- **Dynamic Memory run-time changes**: "Dynamic Memory for Hyper-V Virtual Machines" lists only "increase the maximum memory" and "decrease the minimum memory" as run-time changes. The chapter table also says buffer and weight can change while the VM runs; that isn't on the page (probably true, but unverified). Q9 uses only the two documented changes.
- **Turning Dynamic Memory on/off requires the VM off** (chapter, used in Q4 option c and Q7 option c): not stated explicitly on a current Learn page I found; consistent with the chapter.
- **Stale reference titles/URLs in mock questions** (they still work through redirects): `.../learn-more/use-local-resources-on-hyper-v-virtual-machine-with-vmconnect` now redirects to `.../use-local-resources-virtual-machine-connection` (title "Use local resources on Hyper-V with VMConnect"); `.../manage/enable-or-disable-checkpoints-in-hyper-v` now redirects to `.../checkpoints`; `.../manage/manage-windows-virtual-machines-with-powershell-direct` redirects to `.../powershell-direct`; the DDA planning page is now titled "Deploy devices by using Discrete Device Assignment" (mocks: "Plan for Deploying Devices using Discrete Device Assignment").
- **DDA and clusters**: the DDA planning page still lists "Adding the VM to a high availability (HA) cluster" as unavailable, while "Deploy graphics devices by using DDA" points to GPU pools for clustered VMs ("Use GPUs with Discrete Device Assignment in clustered VMs"). The chapter mentions both; avoided in the quiz.

## Inferences (documented separately, combined in the quiz)

- **Q10**: no Learn page says in one sentence that disabling the VSS integration service makes production checkpoints fail. Combined facts: production checkpoints use VSS inside the guest ("Using checkpoints"); the Volume Shadow Copy Requestor integration service is what makes VSS backups of a running VM possible and must be enabled on host and guest ("Hyper-V Integration Services", "Manage Hyper-V Integration Services"); `Production` falls back to standard when the production checkpoint fails (`Set-VM -CheckpointType`). The chapter's integration services table states the link directly.
- **Q6**: Learn says "stop the VM" before `Remove-VMAssignableDevice`; the action is worded "Turn off VM-Render" (the VM's automatic stop action is TurnOff with DDA).

## French

- "cmdlet" is still `undecided` in the glossary (« applet de commande » / « cmdlet »): the French texts avoid the word (« commande »).
- VMConnect menu names given as « menu Action », « menu Média », « Action > Point de contrôle » (French UI labels not verified on a French Learn page).
