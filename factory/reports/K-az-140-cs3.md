# K-az-140-cs3 — report

3 case studies, 18 questions (6 per case), all `status: draft`. Validator: `CERT=az-140 npx tsx factory/validate.ts --prefix az140-cs3` → 21 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| az140-cs3a-trey-research | Pharma research; Microsoft Entra joined hosts, hybrid identities, Private Link over ExpressRoute, personal + pooled pools, confidential VMs | sso (2.1.7 multi 2), fslogix-kerberos (1.2.2 yesno 3), confidential-vm (2.2.7 single 1), private-link (1.1.4 dragdrop 2), start-vm (3.2.10 single 1), lab-dr (4.2.2 single 2) |
| az140-cs3b-alpine-ski-house | Ski resorts; hybrid joined hosts with SSO, RemoteApp + desktop, App attach, autoscale, external commercial users | licensing (1.3.3 single 2), autoscale (4.1.5 dropdown 2), app-groups (3.3.2 yesno 2), app-attach (3.3.9 multi 3), conditional-access (2.1.4 multi 2), rdp-properties (3.2.8 dropdown 1) |
| az140-cs3c-relecloud | Engineering/BIM; AD DS-joined GPU pools in two regions, Azure NetApp Files, Cloud Cache, RDP Shortpath, Insights | gpu-size (1.3.5 single 1), netapp-files (1.2.5 ordering 2), cloud-cache (3.1.4 dropdown 3), shortpath (1.1.3 yesno 2), insights (4.1.1 multi 1), hybrid-join (2.1.2 single 2) |

Mix: single 6, multi 4, yesno 3, dropdown 3, dragdrop 1, ordering 1; difficulty 5 easy / 10 medium / 3 hard.

## Doubts and points to check at review

- **az140-cs3b-app-attach**: the App attach page gives the permission methods for "Azure Files with Microsoft Entra joined hosts" and "Azure Files with AD DS"; it does not name hybrid joined hosts. The question assumes the AD DS method (share-level default permission Storage File Data SMB Share Reader + NTFS read for computer objects) applies to hybrid joined hosts on a storage account that uses AD DS authentication.
- **Reference title** of the App attach page taken as "App Attach in Azure Virtual Desktop" (as returned by WebFetch); check the case.
- **az140-cs3a-lab-dr**: the 5–15 min RPO for Site Recovery comes from the Architecture Center multiregion BCDR article, not from the AVD docs.
- **az140-cs3a-start-vm**: Learn says Entra joined host pools *without a session host configuration* need the VM login roles; not tested here, but a reviewer may want the case to state which kind of host pool is used.
- `redirectclipboard` default value read as 0 on the RDP properties page; the question sets every value explicitly, so it does not depend on defaults.
- Microsoft Entra Kerberos now supports cloud-only identities (public cloud); the Trey case uses hybrid identities to avoid relying on it.
