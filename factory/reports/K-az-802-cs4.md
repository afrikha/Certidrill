# K-az-802-cs4 — report

## Delivered
- `content/az-802/case-studies/az802-cs4a-trey-research.yaml` (biotech, single forest, 3 sites incl. Azure, RODC branch, Hyper-V Replica, Storage Replica) — 6 questions: rodc-staging (1.1.3), basel-site (1.2.2), app1-trust (7.3.7), protected-users (6.2.3), lims-failover (3.1.14), storage-replica (5.3.4).
- `content/az-802/case-studies/az802-cs4b-lucerne-publishing.yaml` (publisher, two-domain forest + acquired forest, Azure File Sync, SMB over QUIC, Arc) — 6 questions: artwork-groups (1.3.2), file-sync-topology (5.1.3), smb-quic (5.2.4), update-manager (2.2.4), printer-reservation (4.2.4), dcr-xpath (7.1.6).
- Difficulty 3/7/2 (easy/medium/hard). Validator: 0 problem(s).

## Deviations / decisions
- First drafts on Azure DC disks + static IP (1.1.2), PDC emulator w32tm config (7.2.4), forest-trust direction/transitivity (1.2.1) and private-endpoint conditional forwarder (4.1.4) were deleted because cs2c, cs3b and sr1 already test the same decisions with the same answers (1.1.2 already had 8 questions). Replaced by under-covered objectives (1.2.2, 7.3.7, 1.3.2, 4.2.4).
- WebSearch budget was exhausted early, and WebFetch was rate-limited; every fact used was fetched from the referenced Learn page except the items below.

## Facts not verified on a fetched page (from general knowledge, low risk)
- Distractor cmdlet names `Add-DhcpServerv4Lease` and `Add-DhcpServerv4Policy` (printer-reservation) — real DhcpServer cmdlets, but their pages were not fetched.
- "A distribution group is not security-enabled" (artwork-groups distractor explanation) — not in the fetched part of the security-groups page.
- Event ID 4740 is used only as an ID; its meaning is not stated anywhere.
- Change notification between sites via `-Replace @{'options'=1}` comes from Example 4 of the Set-ADReplicationSiteLink page.
- Selective authentication and "Deny takes precedence over Allow" in RODC PRP could not be verified, so they are not used.

## French terminology doubts
- "installation intermédiaire (staged)" for a staged RODC installation, "Réplica Hyper-V" / "Réplica de stockage" capitalised as product names, "Inversion de la réplication" for reverse replication: not checked against fr-fr pages.
