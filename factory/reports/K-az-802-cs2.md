# K-az-802-cs2 — notes

Output: 3 case studies and 16 questions (prefix `az802-cs2`), all `status: draft`. Validator: 0 problem(s).

| Case study | Questions | Domains |
| --- | --- | --- |
| az802-cs2a-coho-winery (wine producer, hub and RODC branches, Hyper-V cluster) | rodc-prp 1.1.4, revealed-accounts 1.1.4, kiosk-loopback 1.4.1, dhcp-standby 4.2.5, press-replica 3.1.14, arc-onboarding 2.2.1 | ad-ds, networking, vms, hybrid |
| az802-cs2b-lamna-healthcare (hospital group, Azure Files + File Sync, file servers) | cloud-tiering 5.1.3, share-roles 5.1.2, dedup-usage 5.3.5, laps-operations 6.1.7, firmware-recovery 7.2.7 | storage, security, monitoring |
| az802-cs2c-graphic-design-institute (design school, Azure labs, render farm, training Hyper-V) | outbound-resolution 4.1.4, lab-jit 3.2.4, vmconnect-session 3.1.1, password-protection 6.2.2, insights-forecast 7.1.4 | networking, vms, security, monitoring |

Types: dropdown 6, single 5, yes/no 2, dragdrop 2, ordering 1. Difficulty: 5 easy, 8 medium, 3 hard.

## Deviations and overlaps with parallel agents

- cs3 created `az802-cs3a-bellows-college` a few minutes before me, so I renamed my third company to Graphic Design Institute.
- I dropped seven drafts because another case study or series already tested the same decision with the same answer. Each was replaced by a different objective:
  - DC disks and static IP in Azure (cs3b-azure-dc, cs4a-azure-dc)
  - PDC emulator time source (cs4a-pdc-time)
  - Resultant PSO precedence (cs3a-pso-precedence)
  - SMB over QUIC UDP 443 + SAN certificate (cs3c and cs4b)
  - GPU partitioning on Rome CPUs and Datacenter clustering (cs3c-gpu-partitioning)
  - Nested virtualization on AMD with version 9.3 and MAC spoofing (sr1-nested-amd, sr2-nested-virt)
  - Subnet object to site mapping (cs4a-basel-site)
- I also rewrote my LAPS question from setup cmdlets to day-to-day operations because of cs3a-laps-helpdesk, and I changed my dedup VDI slot because of cs1b-vdi-dedup.
- `cs1b-vdi-dedup` (not mine) seems to enable the HyperV usage type on the Hyper-V host itself (VDI-HV1). The Enable-DedupVolume reference says that with HyperV, the deduplicating computer cannot be the computer that runs Hyper-V. Worth a check by its owner.
- Same-objective pairs remain inside a case: cs2a has two 1.1.4 questions, on different decisions (PRP precedence vs revealed list). The question bank (1a) also has `az802-1a-prp-stolen-rodc`, which may test the same revealed-accounts decision as `az802-cs2a-revealed-accounts`.

## Facts to watch (all fetched from Learn on 2026-11-17)

- The RODC PRP default lists and Denied-over-Allowed precedence come from the archived Windows Server 2008 R2 page "Password Replication Policy" (previous-versions), because I found no current page with that content.
- Hyper-V Replica: certificate-based authentication is used when the traffic must be encrypted, and the Replica Broker is used for clustered replica servers (overview page). The HTTP 80 / HTTPS 443 ports aren't stated on that page, so the question doesn't test them.
- Enhanced session mode: the page lists the two host settings, Windows 10 / Windows Server 2016 or later on client and guest, and Remote Desktop Services enabled in the guest. Two claims rest on general knowledge, not on the page: (a) the Guest Service Interface distractor's role (`Copy-VMFile`), and (b) that enhanced session mode doesn't need a network path to the guest. For (b), the page only suggests it.
- System Insights: the cmdlet names (`Set-InsightsCapabilitySchedule`, `Set-InsightsCapabilityAction -Type Critical`), the default 3:00 AM schedule and the `-At 2:00AM` format come from the "Manage System Insights capabilities in Windows Admin Center" page.
- WebFetch and WebSearch budgets ran out several times (shared hourly limits). Every fact used was fetched after that.
