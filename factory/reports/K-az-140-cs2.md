# K-az-140-cs2 — report

## Produced
- Case studies (content/az-140/case-studies/): `az140-cs2a-munsons` (food manufacturing, AD DS hybrid, ExpressRoute, Azure Firewall hub, pooled + personal GPU), `az140-cs2b-bellows` (education, cloud-only identities, Microsoft Entra joined hosts, Intune, BYOD), `az140-cs2c-humongous` (insurance, Private Link, two regions, Cloud Cache, confidential VMs, per-user access pricing for external brokers).
- 17 questions: cs2a = 6, cs2b = 5, cs2c = 6. Types: single 5, multi 3, yesno_statements 3, dropdown 3, dragdrop 2, ordering 1. Difficulty: 4 easy, 10 medium, 3 hard.
- Domains per case: cs2a infrastructure/identity-security/monitoring; cs2b all four; cs2c all four.
- Validator: `CERT=az-140 npx tsx factory/validate.ts --prefix az140-cs2` → 20 files, 0 problem(s).

## Sources and verification
All facts fetched from Microsoft Learn on 2026-11-17 (RDP Shortpath, Start VM on Connect, AVD RBAC roles, autoscale, Azure Files + AD DS FSLogix, GPU acceleration, SSO, Entra joined hosts, RDP properties and custom RDP properties, Entra Kerberos for cloud-only identities, licensing, Insights, Private Link, Azure Firewall for AVD, Cloud Cache, Defender for Endpoint non-persistent VDI, security recommendations). Reference titles = page H1 as fetched.

## Points to review
- `Update-AzWvdHostPool -CustomRdpProperty` (az140-cs2b-rdp): the fetched Learn pages did not render the PowerShell tab; the cmdlet and parameter come from the Az.DesktopVirtualization module as known, not re-read on Learn.
- az140-cs2a-profiles (ordering): RBAC before NTFS follows Microsoft's documented sequence; the two steps have no strict technical dependency.
- az140-cs2b-signin option d: states that Intune local-group membership alone does not authorize sign-in to Entra joined hosts (Learn says the VM User/Administrator Login roles are required for host pools without a session host configuration).
- Entra Kerberos for cloud-only identities: Learn describes it without a preview label; supported only in Azure public cloud, Windows 11 24H2+ recommended (the case uses 24H2 with latest updates).
- Portal labels used verbatim: "Enable RDP Shortpath for managed networks", "RDP Shortpath for managed networks using NAT traversal", "RDP Shortpath for public networks (via TURN)", "Allow Direct UDP network path over Private Link", "VDI onboarding scripts for non-persistent endpoints".
- French: portal/enum values kept in English (Pooled, Personal, OS names); "étiquette de service", "Pare-feu Azure", "mode drainage", "phase de ralentissement" (ramp-down) used.
- Parallel agents cs1/cs3/cs4 started at the same time with an empty case-studies folder; overlap of decisions across their cases could not be checked.
- The WebFetch budget ran out once during research (shared limit); the app-groups page was not fetched, so no question relies on it.
