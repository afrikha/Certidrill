# FIX-az-120-2 — chapters 23, 31, 32, 41 and 42 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-120 23-storage 31-high-availability 32-disaster-recovery 41-performance-costs 42-monitoring-operations` 0 problems; `content:validate --cert az-120` 0 problems, 0 warnings; `check-quiz az-120` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers are untouched.

## 23-storage

| Finding | Learn | Change |
| --- | --- | --- |
| 1. ANF zonal placement is preview | **Not confirmed.** The SAP page hana-vm-operations-netapp (updated 2026-01-13) still says "currently in public preview". But ANF What's new says availability zone volume placement went GA in March 2024, and the feature pages (manage-availability-zone-volume-placement 2026-01-29, use-availability-zones 2026-07-07) have no preview label. The more specific, newer pages win | None. az120-cs1a-byq-latency (objective 2.2.4, not in this task) stays valid |
| 2. Application volume group needs pinning | Confirmed for the PPG method (hana-vm-operations-netapp: request through a form to pin the availability set, which limits VM type/family changes; keep it for systems that need the lowest latency). AVG extension 1 (GA March 2025) also supports zone placement without pinning | azure-netapp-files: zone placement is "enough in most regions"; one sentence on the PPG method |
| 3. Premium SSD v2 and availability sets | Learn disagrees. planning-guide-storage (2026-07-09): not supported with availability sets. use-premium-ssd-v2-with-availability-set (2026-09-22): supported in six regions without availability zones, after feature registration (`PV2WithAVSetRegionWithoutZone`). No preview/GA label | The trap was not extended to Premium SSD v2 (that would contradict the newer page). Premium SSD v2 row: "availability sets only in a few regions without availability zones, after feature registration". Human decision below |
| 4. Instant access snapshots | Confirmed (disks-instant-access-snapshots, 2026-08-20): Premium SSD v2 and Ultra Disk snapshots are usable at once if instant access is enabled at creation (60-300 min); three in-progress snapshots per disk | Incremental snapshot row |
| 5. Azure VM backup and Write Accelerator / Ultra Disk | Confirmed wrong. backup-support-matrix-iaas: WA disks backed up since May 2022; Ultra Disk and Premium SSD v2 supported with the Enhanced policy; shared disks not supported. how-to-enable-write-accelerator: snapshots supported for WA data disks only, not the OS disk | Azure VM backup row rewritten |
| 6. NFS encryption in transit setting | Confirmed. files-nfs-protocol (2026-11-17) and files-encryption-in-transit (2026-10-26): **Require Encryption in Transit for NFS**, enabled by default on portal-created accounts. While it's not selected, **Secure transfer required** controls NFS. The SAP SLES guide (2025-09-10) still has only the old "deselect secure transfer" step | NFS rules bullet rewritten |
| 7. DR of NFS on Azure Files | Confirmed (disaster-recovery-sap-guide: "Custom (like rsync)"; ANF cross-region replication) | Sentence added to the trap |
| 8. ADE migration | Confirmed (disk-encryption-migrate, 2026-07-15): no in-place conversion, new disks and VMs, ADE can't be disabled on Linux OS disks | New encryption bullet |
| Q07 Write Accelerator sizes | Confirmed: the table still lists M32ms 4/5,000 and M64s 8/10,000. Every chapter row matches | None |
| FR « appairé(s) » | Glossary: « peering » | « connecté(s) par peering » (2 places) |

## 31-high-availability

| Finding | Learn | Change |
| --- | --- | --- |
| 99.99 % zone SLA | **Not confirmed**: no fetched Learn page gives it (same as AZ-104) | None. Human decision below |
| ANF cross-zone replication: read-only destination, manual failover | Confirmed (replication-requirements, 2026-04-09: read-only until failover; break replication peering, then mount; large volumes only hourly/daily). No extra cost (replication page) | "and mount it" added. The SAP use-case wording isn't on Learn but isn't contradicted. Left as is |
| ANF cross-region replication "to a paired region" | Learn: supported region pairs, which include nonstandard pairs | Row reworded |
| Premium SSD v2 not supported in availability sets | Same conflict as 23 #3 | Storage restrictions row: Ultra Disk not supported; Premium SSD v2 only in a few regions without zones, after registration |
| Multi-SID (quiz q9) | Confirmed for SLES and RHEL: five SIDs at most; no ENSA1/ENSA2 mix; 3-node clusters only for ENSA2 | "no ENSA1/ENSA2 mix" added, because quiz q9 tests it |
| FR « appairage de réplication », « région appairée » | Learn FR: « interrompre le peering de réplication »; glossary « région jumelée » | Fixed |

## 32-disaster-recovery

| Finding | Learn | Change |
| --- | --- | --- |
| FR « région associée » | Glossary: « région jumelée » | Four places in FR |
| `ext3` and `xfs` for HANA snapshots | Confirmed (sap-hana-backup-support-matrix, 2026-10-09) | None |
| Production replication continues during test failover | Confirmed (site-recovery-test-failover-to-azure: "doesn't impact ongoing replication, or your production environment") | None |
| Network mapping both directions | Confirmed (azure-to-azure-network-mapping): automatic mapping creates both directions. The manual procedure has you create the opposite mapping | Sentence completed |
| Enhanced snapshot policy is preview | Confirmed ("Standard policy: Generally Available; Enhanced policy: Preview"; HSR snapshots only with Enhanced) | None (chapter already says preview). Bank question rewritten (below) |
| DB DR table | Confirmed (disaster-recovery-sap-guide) | None |

## 41-performance-costs

| Finding | Learn | Change |
| --- | --- | --- |
| Temp disk ↔ diskless resize too broad | Confirmed (azure-vms-no-temp-disk FAQ, 2026-02-26): supported for Linux; Windows only disk→disk and diskless→diskless, with a workaround (pagefile to C:, snapshot, new VM) | Bullet split and rewritten |
| Gen1 can't move to Gen2-only families | generation-2 (2026-09-25): existing Gen1 VMs can be upgraded to Gen2 only by upgrading to Trusted launch. trusted-launch-existing-vm-gen-1: VM deallocated; supported size and OS; Standard backup policy, ASR and Windows OS encryption block it; no rollback. Whether M/Mv2 sizes are in the Trusted launch size list was not checked | New bullet: Gen1 to Gen2-only sizes still not by resize; Trusted launch upgrade path, otherwise a new VM |
| FR « appairés » | Glossary | « connectés par peering » |

## 42-monitoring-operations

| Finding | Learn | Change |
| --- | --- | --- |
| Data Disk Latency is preview | Confirmed (disks-metrics, 2026-09-19: Data Disk Latency (Preview), OS Disk Latency (Preview), SCSI only) | "(preview)" in the metric row. Bank question rewritten (below) |
| NSG flow logs after retirement | Confirmed (nsg-flow-logs-overview): Azure deletes the NSG flow log resources and stops traffic analytics on them; stored records are kept | Sentence added |
| Connection troubleshoot needs no agent | Confirmed (connection-troubleshoot-overview, 2026-11-17: agentless). Connection monitor still needs the Network Watcher Agent extension on Azure VM sources, not on destinations (connection-monitor-overview) | Both table rows completed |
| ACSS start/stop cluster software | Confirmed (start-stop-sap-systems, 2026-03-26): SUSE/RHEL Pacemaker and WSFC; other cluster software isn't supported | Prerequisites sentence |
| VM insights / OpenTelemetry | **Not confirmed**: neither "Monitor virtual machines with Azure Monitor" nor "Monitor Azure Virtual Machines" mentions OpenTelemetry or logs-based metrics | None |
| vm-extension-for-sap details (Reader, Host Agent 7.21 PL 47, 11812 URL) | Not re-verified (version-specific pages not fetched) | None |
| FR « appairés » | Glossary | « connectés par peering » |

## Mock-exam bank questions changed

- `questions/infrastructure/az120-2c-afs-nfs-settings.yaml` (2.3.3): statement s1 said you must clear "Require secure transfer for REST API operations" or the mount times out. For portal-created accounts, **Require Encryption in Transit for NFS** now controls NFS and takes precedence, so s1 was wrong or ambiguous. The stem now states that the account was created in the portal with default settings. s1 is now "To mount without encryption in transit, you must disable Require Encryption in Transit for NFS" (still Yes). The explanation is rewritten. The second reference is now "Configure encryption in transit for Azure Files" (fetched).
- `questions/hadr/az120-3c-pol-snapshot-hsr.yaml` (3.2.5): the correct answer was the **Enhanced (preview)** snapshot subtype, and objective 3.2.5 doesn't name it. Rewritten with the same id, type (dropdown), objective and difficulty. The scenario is now a single-node HANA (no HSR). The subtype slot is replaced by instant restore retention (2 / 30 / **35** days, max 1-35 per sap-hana-database-instances-backup; 30 = Enhanced VM policy max per backup-azure-vms-enhanced-policy). The daily frequency and weekly full + logs slots are kept. The id still contains "hsr" because ids can't change.
- `questions/maintenance/az120-4b-sto-metric-statements.yaml` (4.2.3): s2 was a Yes statement about Data Disk Latency, which is in preview. It's replaced by a GA metric statement: "When Data Disk IOPS Consumed Percentage reaches 100%, the I/O is capped by the VM's uncached IOPS limit" (No; disks-metrics). The answers are now No/No/Yes. The SCSI/NVMe sentence was removed from the stem and the explanation updated.

## Checked and left unchanged

- az120-2c-avg-facts (AVG atomic call, manual QoS, separate endpoints: matches application-volume-group-introduction).
- az120-2c-storage-combinations and az120-2c-sapmnt-shared-services: availability-set claims concern Ultra Disk only.
- The ANF zone-placement questions.
- az120-2c-encryption-at-host and az120-2c-encryption-mapping.
- az120-4a-rs-limitations and az120-cs1b-resize: already Windows/Linux-correct for temp-disk resizes.
- The 3.2.4/3.2.5 backup questions using the Enhanced **VM** policy (GA). Also 3c-pol-snapshot-prereq, cs1a-hana-snapshots, 2c-hana-snapshot-backup and cs2b-bw-backup: none uses the HSR snapshot as an answer.
- az120-3b-region-asymmetric-pair: already says ANF uses supported, including nonstandard, pairs.
- 4b-net-statements, 4b-net-cm-dropdown and cs4a-latency-monitor: Connection monitor agent on sources, not destinations, is still correct.
- 4b-net-flowlog-order and 4b-net-traffic-analytics.
- No in-scope question or quiz uses « appairé » or « région associée ».

## Quiz files

None changed. Quiz 23 Q08 already handles instant access ("default settings"). Quiz 41 q7 is Windows-only, quiz 42 q6 matches the agentless note, and quiz 31 q9 matches the ENSA rule. check-quiz 0/0.

## For a human decision

- **Premium SSD v2 with availability sets**: the SAP storage page says "not supported"; the newer disk page says supported in six non-zonal regions after feature registration (no preview/GA label). The chapters (23, 31) now follow the newer page. The exam may still follow the SAP page.
- **ANF zonal placement**: the SAP HANA/ANF page still says "public preview", while ANF What's new says GA since March 2024. The chapters treat it as GA. If you prefer the SAP page, az120-cs1a-byq-latency (2.2.4, another chapter) would need rewriting.
- **SLA figures**: 99.99 % for VMs across zones (chapter 31 table, trap and key points; quiz 31 q1/q10) isn't on any fetched Learn page. 99.9 % and 99.95 % are on the SAP HA architecture page.
- Out of scope, not changed: `az120-2a-vm-selection-facts` (2.1.1) s3 says a Gen1 VM must be redeployed to reach Gen2. Learn now documents an upgrade through Trusted launch; whether it applies to M/Mv2 sizes wasn't checked.

## French terms not settled (not in the glossary)

- « lancement fiable (Trusted launch) », « machine virtuelle libérée » (deallocated): 41.
- « accès instantané » (instant access snapshot): 23, also used by quiz 23.
- « stratégie Enhanced »: 23. The bank uses it nine times and « stratégie améliorée » once.
- « Exiger le chiffrement en transit pour NFS », « Transfert sécurisé requis »: portal labels from fr-fr files-encryption-in-transit. Used in 23 and in az120-2c-afs-nfs-settings.
- « peering de réplication » (ANF, from fr-fr replication-requirements): 31.
- « paire de réplication » (ANF region pair): 31.
- « épingler » (pin an availability set to hardware): 23.
