# FIX-az-140-1 — chapters 11 to 15 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-140 11-networking 12-storage 13-plan-host-pools 14-implement-host-pools 15-session-host-images` 0 problems; `content:validate --cert az-140` 0 problems, 0 warnings; `check-quiz az-140` (the five chapters) 0 problems, 0 warnings.

Every change was made in EN and FR, with the same sections, tables and callouts. No code block changed.

## 11-networking

| Finding | Learn | Change |
| --- | --- | --- |
| "RDP" renamed "Direct Stream (DS)" on some pages | Partly confirmed. rdp-bandwidth's H1 is now "Direct Stream (DS) bandwidth requirements". The en-us rdp-shortpath and configure-rdp-shortpath pages still say only "RDP Shortpath". The fr-fr pages (rdp-shortpath, rdp-quality-of-service-qos, both machine-translated) write « DS Shortpath » | Chapter keeps RDP. The reference titles of 8 bank questions were updated to the page's current H1 (see below). Naming needs a human decision |
| Host pool RDP Shortpath options "default to Enabled" | configure-rdp-shortpath: each option shows "Default (enabled)", and "Default corresponds to Enabled". The other drop-down values aren't listed | rdp-shortpath rules: the options are set to **Default**, which means enabled |
| Facts listed as confirmed (150 ms, bandwidth table, 10 ms gateway groups, TLS, Private Link, QoS, proxy) | Bandwidth table re-checked (rdp-bandwidth), and symmetric NAT and TURN (rdp-shortpath) | None |
| FR « QoS basée sur la stratégie » / « basée sur une stratégie » | fr-fr QoS page (MT) uses three forms: « basée sur des stratégies », node « QoS basé sur une stratégie », dialog « QoS basée sur une stratégie » | None. Glossary decision (see below) |
| FR « réseaux gérés » (chapter) vs « réseaux managés » (bank) | fr-fr rdp-shortpath uses both: « réseaux managés » (tab label, one sentence), « réseaux gérés » (more often) | None. Glossary decision |

## 12-storage

| Finding | Learn | Change |
| --- | --- | --- |
| ODFC registry path | how-to-configure-odfc-containers: the steps say `HKLM\SOFTWARE\Policies\FSLogix\ODFC`, but its PowerShell example writes `HKLM:\SOFTWARE\FSLogix\ODFC\`. reference-configuration-settings lists `Policies\FSLogix\ODFC` as the base key | None (the chapter keeps the Policies path, which the reference page gives). The bank (az140-1b-fslogix-registry-ps) matches |
| ODFC with profile containers | Confirmed: "Using the ODFC container in a dual container configuration isn't necessary or recommended"; ODFC alone is recommended with third-party roaming profile solutions. Learn doesn't say ODFC goes on a separate share | Data table: ODFC is "alongside a third-party profile solution (the recommended use of ODFC)". FSLogix table: "often a separate share" removed, and says ODFC isn't needed with profile containers and a dual container configuration isn't recommended |
| Azure NetApp Files Flexible service level | Confirmed (azure-netapp-files-service-levels): manual QoS capacity pools only, throughput set independently of capacity, minimum 128 MiB/s per pool. No preview label (Elastic is the level marked preview) | Service level table: new Flexible row |
| Cloud-only identities with Microsoft Entra Kerberos: GA or preview? | **Ambiguous.** entra/identity/authentication/kerberos labels "Cloud only identity (Preview)". The Azure Files pages (storage-files-identity-auth-hybrid-identities-enable, storage-files-active-directory-overview) and the AVD page create-profile-container-azure-ad describe cloud-only support with no preview label (Azure public cloud only) | None. For a human decision |
| Storage options page lists no Microsoft Entra Kerberos | Not re-fetched. The QZ report says the chapter is more current than that page | None |
| Personal host pools: profiles "can stay on the OS disk" | **Not confirmed** (no fetched page says so) | None |

## 13-plan-host-pools

| Finding | Learn | Change |
| --- | --- | --- |
| NVv3 and NVv4 retired | retired-sizes-list: both "Announced" on 04/15/25, planned retirement date 09/30/26 (now past). The AVD GPU page (graphics-enable-gpu-acceleration) still lists them without a note. NCv3 is listed as Retired (09/30/25) | GPU table: one row, NVadsA10 v5 and NCasT4_v3. New bullet: NVv3 and NVv4 are still on the AVD page, but their retirement was planned for September 30, 2026, so don't plan new hosts on them. "AMD sizes need the AMD driver" replaced by "only drivers distributed by Azure are supported" (no AMD size is left in the table) |
| HEVC needs Windows 10 or 11 session hosts | Confirmed (GPU page; also GRID 16.2 or later) | New bullet |
| Per-user pricing: "Microsoft 365 Apps" excluded | Licensing page says "Microsoft Office, Microsoft Defender XDR, or Universal Print" | Wording follows Learn: "Microsoft Office" |
| Name prefix 11 characters | deploy-azure-virtual-desktop: 11 for standard management, **10** for a session host configuration | Rules bullet and Key points: "(10 with a session host configuration)" |
| Sizing page: "6 to 24 vCPUs" vs "4 to 24" | Not re-fetched. The QZ report says Learn contradicts itself | None. Flag |
| FR « spokes appairés » | Glossary: « peering », never « appairé » | « spokes connectés au hub par peering » |

## 14-implement-host-pools

| Finding | Learn | Change |
| --- | --- | --- |
| Roles to add session hosts to an existing pool | Confirmed (add-session-hosts-host-pool): Desktop Virtualization Host Pool Contributor + Virtual Machine Contributor on the resource group | Prerequisites table: new row |
| "Trusted launch (default)" | deploy-azure-virtual-desktop states the default only for the session host configuration path. trusted-launch: "Creating VMs defaults to Trusted Launch for Azure portal, CLI, or PowerShell" | None (consistent with trusted-launch) |
| Name prefix 10 vs 11 | Confirmed (see chapter 13) | VM tab bullet: "(10 with a session host configuration)" |
| Validation environment needs Desktop Virtualization Host Pool Contributor | Confirmed (configure-validation-environment: "As a minimum") | None |
| Multiple personal desktops | Confirmed: Direct assignment only, and it "can't be disabled" once enabled. PowerShell needs Az.DesktopVirtualization 5.3.0-preview (the chapter shows no PowerShell for it). The page gives no preview or GA label for the feature | Basics table: "which can't be disabled once enabled" |
| Per-user pricing "doesn't include Microsoft 365 Apps" | Licensing page: "Microsoft Office" | "Microsoft Office" |
| Bicep API `2024-04-03` (latest non-preview `2025-10-10`) | Not re-fetched; still valid per the QZ report | None |

## 15-session-host-images

| Finding | Learn | Change |
| --- | --- | --- |
| Existing virtual network: private service policy | Confirmed (create-custom-image-templates): the identity needs access to the virtual network or its resource group, and a private service policy must be disabled | Prerequisites bullet |
| Staging resource group you name yourself must be empty | Confirmed (same page: it "needs to be empty before the image build starts") | Image Builder paragraph: new sentence |
| Session host update "under the same computer names" | session-host-update: the OS hostname doesn't change, the new VMs are named `<SessionHostName>-<DateTime>`, and the original VMs are deleted | Sentence rewritten |
| Logoff delay 0-60 min, default 2; batch size default 1 | Confirmed (host-pool-management-approaches, policy table: Max VMs removed during update `1`, Logoff delay `2`, 0-60 minutes) | None |
| Sysprep needs decrypted drives | Not on the AVD golden image page. Confirmed on virtual-machines/generalize: "Sysprep requires the drives to be fully decrypted" | None |
| Replicas: 100 per version vs 50 per region | Learn contradicts itself (azure-compute-gallery: Limits say 100 per version; Best practices say a maximum of 50 per region) | None. For a human decision |
| Gallery disaster recovery | azure-compute-gallery: at least two galleries in separate regions. If a gallery's region is down, you can't create or update its resources, but image versions in other regions stay usable | Bullet rewritten (the old text offered "replicas in the recovery region" as an alternative to a second gallery) |

## Mock-exam bank questions changed

- `az140-1a-bw-activity-figures`, `az140-1a-bw-factors`, `az140-1a-bw-estimate-method`, `az140-1a-bw-behavior`, `az140-1a-bw-avc444`, `az140-1a-bw-throttle-prereq`, `az140-1a-bw-throttle-cmd`, `az140-1a-bw-branch-estimate` (all 1.1.1): reference title "Remote Desktop Protocol (RDP) bandwidth requirements" became "Direct Stream (DS) bandwidth requirements". This is the page's current H1, and the guide requires the current page title. Stems, answers and explanations didn't change.

No stem, answer or explanation changed.

## Checked and left unchanged

- ODFC: az140-1b-odfc-not-needed (already follows "not necessary or recommended"), az140-1a-st-data-placement (ODFC with a third-party profile solution), az140-1b-fslogix-registry-ps (Policies path).
- GPU: az140-cs3c-gpu-size, az140-1c-perf-cad-gpu, az140-1c-perf-hevc-prereqs, az140-cs2a-gpu, az140-1c-perf-gpu-driver. The correct answers are NVadsA10 v5 or NCasT4_v3 (still supported). Note for a reviewer: two distractors are now retired sizes, NVv4 in cs3c-gpu-size and NCv3 in cs3c-gpu-size and 1c-perf-cad-gpu. They stay wrong for the reasons their explanations give, but they could be swapped for current sizes.
- Per-user pricing: az140-1d-lic-peruser-facts ("Microsoft 365 Apps must be licensed separately" is still true under "Microsoft Office").
- Name prefix and roles: az140-1c-portal-name-prefix (already gives 11 / 10), az140-1e-add-hosts-roles (Host Pool Contributor + VM Contributor).
- RDP Shortpath defaults: az140-1a-sp-* and az140-cs1a/cs2a/cs3c-shortpath ("default values", no reliance on an "Enabled" label).
- Session host update: az140-1e-shu-batch-capacity, az140-1e-shu-order, az140-4b-update-shu-* (not my objectives for 4b; read only), no "same names" claim. Gallery DR: az140-1e-gallery-facts matches the new bullet.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 11 q10 uses "Enabled"/"Disabled" as explicit states, which is still valid.

## For a human decision

- **RDP vs Direct Stream (DS)**: rdp-bandwidth and the fr-fr pages now say "Direct Stream (DS)" / « DS Shortpath ». The en-us Shortpath pages and the July 2026 study guide still say RDP. The course and bank keep RDP.
- **Cloud-only identities with Microsoft Entra Kerberos on Azure Files**: preview on the Entra Kerberos page, unlabelled on the Azure Files and AVD pages. Several items depend on it: the chapter 12 choice and identity tables, quiz 12 q7, and the bank question `az140-1a-st-cloud-only` (as the QZ report says; not re-read here). If it's preview, those need rewriting, unless the objective requires it.
- **Compute Gallery replicas**: 100 per version (Limits) vs a maximum of 50 per region (Best practices). The chapter keeps 100.
- **Sizing page**: "6 to 24 vCPUs" vs "4 to 24 cores". The chapter keeps 4 to 24.
- **Personal host pool profiles on the OS disk** (chapter 12 table, quiz 12 q9): not on a fetched Learn page.
- **French terms not in the glossary**: « réseaux gérés » (chapters 11 and 32, quiz 11) vs « réseaux managés » (chapter 15, about 43 bank occurrences). Learn fr-fr uses both. « pool d'hôtes regroupé » (~215) vs « partagé » (~60) across az-140. Policy-based QoS: the chapter has « QoS basée sur une stratégie » and the GPO path « QoS basée sur la stratégie »; the fr-fr page (MT) has « QoS basé/basée sur une stratégie ». « stratégie de service privé » (private service policy, chapter 15) and « mise hors service » (retirement, chapter 13) are not in the glossary either.
