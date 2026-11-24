# QZ-az-120-23-storage — report

File: `content/az-120/quizzes/23-storage.yaml` (10 questions, `az120-qz-23-01` to `-10`). `npx tsx factory/check-quiz.ts az-120 23-storage` → 0 problem(s), 0 warning(s).

## Doubts and unverified facts

- **Q07 (Write Accelerator)**: it uses Standard_M32ms (4 disks / 5,000 WA IOPS) and Standard_M64s (8 / 10,000), from the current *Azure Write Accelerator* page. I found no retirement announcement for M-series v1 sizes (only Msv2/Mdsv2 M192i* sizes retire on March 31, 2027). Please recheck before publishing.
- **Q04 (ANF export policy)**: the "root access On is needed for root to chown" reasoning combines the root-access and chown-mode descriptions of the export policy page. Learn doesn't spell out the root-squash behavior in one sentence.
- **Q10 (ANF throughput)**: the auto QoS throughput is quota × service-level rate (64 MiB/s per TiB for Premium) and volumes resize online (ANF HANA page). The service-levels page doesn't explicitly say that a quota increase raises the limit immediately. I relied on "limit based on the quota assigned".

## Chapter issues (23-storage, EN and FR), against current Learn

1. **ANF zonal placement is preview** (section azure-netapp-files): the chapter says to "place volumes in the same availability zone as the VM" as the standard way to stay under 1 ms. The current *NFS v4.1 volumes on Azure NetApp Files for SAP HANA* page labels zonal placement "(in preview)". The mock-exam question **az120-cs1a-byq-latency** makes "availability zone volume placement" the correct answer. This conflicts with the rule "never a preview feature as the correct answer" and needs checking.
2. **Application volume group** (same section): Learn now describes the application volume group with PPGs as needing a Microsoft request to pin VMs to hardware, which limits VM SKU and family changes, and recommends it only when truly needed. The chapter presents it as a simple alternative to zonal placement.
3. **Premium SSD v2 and availability sets** (section storage-types): *Azure storage types for SAP workload* states that Premium SSD v2 isn't supported with VMs deployed in availability sets. The chapter only says "zonal VMs in most regions". The exam trap covers Ultra Disk only. Add Premium SSD v2 to the callout.
4. **Incremental snapshots** (section data-protection): the chapter says Premium SSD v2 / Ultra Disk snapshots are usable only after the background copy completes. Current Learn adds an exception: **instant access** can be enabled when the snapshot is created. Learn also gives a limit of three pending snapshots during background copy.
5. **Azure VM backup limits** (data-protection table): the chapter says Azure VM backup "doesn't back up Write Accelerator OS disks or Ultra Disks". The *Azure storage types for SAP workload* page lists Azure Backup VM snapshots as supported for Premium SSD, Premium SSD v2 and Ultra Disk. The Write Accelerator page says snapshots are supported for WA data disks (not the OS disk), and Azure Backup protects them. The Ultra Disk part looks out of date. I didn't test it in the quiz.
6. **Azure Files NFS encryption in transit** (section azure-files): the chapter says to "deselect Require secure transfer for REST API operations (otherwise the mount times out)". Current *NFS file shares in Azure Files* says classic accounts now have a separate **Require Encryption in Transit for NFS** setting, enabled by default for new accounts created in the portal, and Microsoft.FileShares shares require encryption in transit by default. The chapter and the mock question az120-2c-afs-nfs-settings (statement s1) should be checked against this.
7. **Disaster recovery of NFS Azure Files**: the chapter's trap ("needs another mechanism") is right. Learn's SAP DR guide lists "Custom (like rsync)" for NFS on Azure Files and native cross-region replication for ANF. The chapter could name these.
8. **ADE migration** (section encryption): the chapter says to migrate to encryption at host but doesn't say how. Current Learn (*Migrate from ADE to encryption at host*) states that in-place conversion isn't supported, that ADE can't be disabled on Linux OS disks, and that migration means new disks and new VMs. This is worth one line in the chapter. The quiz doesn't test it, because the chapter doesn't teach it.

## Mock-exam overlap

I read the 54 mock, case-study and series questions of 2.3.x first. The quiz tests other decisions: LRS without RAID, Windows SMB on ZRS, the Mbv3 read-cache effect, the ANF export policy, HANA data volume partitioning, ADE retirement and temp-disk keys, the per-VM WA IOPS cap, open HANA snapshots and the PSSD v2 background copy, cross-region DR for sapmnt, and ANF quota computation on Premium.
