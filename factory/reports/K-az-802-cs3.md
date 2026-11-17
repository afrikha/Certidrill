# K-az-802-cs3 — report

3 case studies, 16 questions, all `status: draft`. Validator: `CERT=az-802 npx tsx factory/validate.ts --prefix az802-cs3` → 19 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| az802-cs3a-bellows-college | Education, single forest, DFS-R + Azure File Sync, FSRM, DNS policy, LAPS | dfsr-migration (5.1.5 ordering), fsrm-rules (5.2.2 dragdrop), dns-policy (4.1.5 dropdown), laps-helpdesk (6.1.7 multi), pso-precedence (6.2.1 yes/no), restore-ou (7.3.1 single) |
| az802-cs3b-blue-yonder | Airline, two forests, Azure DCs, Arc, DNS Private Resolver | forest-trust (1.2.1 yes/no), azure-dc (1.1.2 multi), hybrid-dns (4.1.4 single), patch-orchestration (2.2.4 single), bastion-native (3.2.4 single) |
| az802-cs3c-lucerne-publishing | Publishing, Hyper-V cluster with GPU-P, SMB over QUIC, Storage Replica | gpu-partitioning (3.1.7 yes/no), smb-quic (5.2.4 single), storage-replica (5.3.4 single), checkpoint-types (3.1.8 dragdrop), dcr-xpath (7.1.6 dropdown) |

Difficulty: 5 easy / 8 medium / 3 hard.

## Deviations and overlap avoidance

- cs2 already used Coho Winery with RODC password replication, a site/subnet problem, DHCP hot standby and Hyper-V Replica; sr2 covers gMSA and Hybrid Runbook Worker. I dropped those topics from my plan to avoid testing the same decisions.

## Facts not fetched on Learn (from long-standing knowledge; please review)

- Selective authentication / "Allowed to Authenticate": no Learn page loaded (several URLs failed), so the trust question doesn't use it.
- Password settings in a GPO linked to an OU don't apply to domain accounts (pso-precedence s3).
- Restore-ADObject needs the parent OU restored before its children (restore-ou). The Learn page fetched covers Recycle Bin prerequisites only.
- Standard checkpoints capture the memory state (checkpoint-types). The checkpoint Learn page didn't load; the CheckpointType values come from the Set-VM reference.
- Azure Bastion Developer SKU = browser-only connections from the portal (bastion-native explanation). Only "native client needs Standard or higher" was fetched.
- 168.63.129.16 can't be reached from on-premises (hybrid-dns explanation).
- A DNS recursion scope can't hold zone records (dns-policy explanation).
- French FSRM terms « limite inconditionnelle / conditionnelle » and « filtrage actif / passif » were not checked on fr-fr pages.
- The WebFetch budget (shared) ran out twice during the task.
