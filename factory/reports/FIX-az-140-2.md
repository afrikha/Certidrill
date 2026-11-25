# FIX-az-140-2 — chapters 21, 22, 31, 32 and 33 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-140 21-identity 22-security 31-fslogix 32-clients-redirection 33-user-settings` 0 problems; `content:validate --cert az-140` 0 problems, 0 warnings; `check-quiz az-140` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers untouched.

## 21-identity

| Finding | Learn | Change |
| --- | --- | --- |
| Desktop Virtualization Virtual Machine Contributor "for the managed identity of a session host configuration" | Confirmed: create-host-pool prerequisites assign this role to the host pool's managed identity (resource group or subscription of the session hosts). The rbac page only names the AVD resource provider. configure-managed-identity (preview page) says host pools with a session host configuration require a managed identity since Nov 1, 2025 to add session hosts | None |
| Workspace Contributor needs Application Group Reader to see the apps | Confirmed (rbac) | azure-rbac: sentence after the role table |
| Domain Services: cloud-only users must change their password, synced users need PHS, Cloud Sync unsupported | Confirmed (domain-services/tutorial-create-instance: cloud-only users change passwords; on-premises users synced with Connect Sync; Cloud Sync not supported). The page says nothing about federated users, so not added | session-host-requirements: Domain Services row |
| Every time: prompt when a new connection is launched 5-10 min after last authentication | Confirmed (set-up-mfa) | conditional-access paragraph |
| Dynamic device groups need Microsoft Entra ID P1 (or Intune for Education) | Confirmed (configure-single-sign-on) | single-sign-on step 2 |
| Q8 FIDO2 as MFA, FR portal labels | Quiz-only points, not chapter findings | None |

## 22-security

| Finding | Learn | Change |
| --- | --- | --- |
| FSLogix antivirus exclusions list incomplete | Confirmed (fslogix/overview-prerequisites): drivers `frxdrv.sys`, `frxdrvvt.sys`, `frxccd.sys`; folders `C:\Program Files\FSLogix\Apps\`, `C:\ProgramData\FSLogix\`, `C:\Users\%username%\AppData\Local\FSLogix\`; keys `HKLM\SOFTWARE\FSLogix\`, `HKLM\SOFTWARE\Policies\FSLogix\`; mount points; share files `*.VHD(X).lock/.meta/.metadata`; adjust if cache/proxy folders move | defender-antivirus exclusions table: share row reworded, Cloud Cache row note, processes row now "Processes and drivers", new row for folders, keys and mount points |
| "Scan after a security intelligence update" wording | Confirmed (deployment-vdi-microsoft-defender-antivirus): disable only when creating the base image after a quick scan; disabling lowers protection | Settings table row |
| "Quick Fix" now "Fix" | Defender for Cloud page (implement-security-recommendations) says **Fix** (Take action > Fix); FR page « Corriger » (Prendre des mesures > Corriger). The AVD security-recommendations page still says "Quick Fix options" | Foundational CSPM bullet |
| MDE on multi-session through Defender for Servers | Confirmed for licensing: onboard-windows-multi-session-device says multi-session VMs "can be licensed through Microsoft Defender for Servers" or per-user licenses (MDE P1/P2, Windows E3/E5, M365 E3, Defender Suite, M365 E5). Auto-deployment by the integration: the support matrix lists only Windows Server, as the chapter says | defender-for-cloud EDR bullet: licensing sentence |
| JIT and Azure Firewall Manager | Confirmed (just-in-time-access-usage and -overview): VMs behind an Azure Firewall controlled by Azure Firewall Manager unsupported; requesting access also needs `jitNetworkAccessPolicies/*/read` | admin-access JIT row and permissions sentence |
| Required endpoints partial | Confirmed (required-fqdn-endpoint): `*.service.windows.cloud.microsoft` (tag WindowsVirtualDesktop), `*.windows.cloud.microsoft`, `*.windows.static.microsoft` (no tag), `51.5.0.0/16` UDP 3478 (relayed RDP), certificate endpoints TCP 80 | Two table rows, one sentence |
| Trusted launch: Gen1 upgrade | Confirmed (virtual-machines/trusted-launch): Gen1 VMs can be upgraded to Gen2-Trusted launch; managed images still unsupported | trusted-launch paragraph: one sentence. The Exam trap (Gen1 managed image) still holds |
| Confidential VMs: Windows Server 2025, backup preview, OS disk price | The AVD security-recommendations page still lists only Windows Server 2022/2019 for confidential session hosts | None (chapter follows the AVD page) |
| FR « réseau appairé » | Guide: « peering » | « réseau virtuel connecté par peering » |

## 31-fslogix

| Finding | Learn | Change |
| --- | --- | --- |
| "Exclude list wins over include list" | **Not confirmed**: concepts-include-exclude-groups only gives default memberships; the FAQ says nothing; how-to page failed to load | None. For a human decision |
| Rule Set "last match decides" | **Not confirmed as stated**: concepts-fslogix-apps-rule-editor-rule-sets says top-to-bottom processing and shows two results (Everyone at top: applies to Domain Users only; Everyone at bottom: applies to nobody). Consistent with last-match, but not stated | None. For a human decision (quiz Q10 and the Exam tip rely on it) |
| Cloud Cache registration nuances | Confirmed (reference-configuration-settings, Cloud Cache tab, read through the `?accept=text/markdown` version): with `HealthyProvidersRequiredForUnregister` = 0, `CcdUnregisterTimeout` and `ClearCacheOnForcedUnregister` have no effect; after a forced sign-out the local cache is kept even if `ClearCacheOnLogoff` is set, and must be deleted manually | Registration table: two rows |
| HA example: two providers of different kinds in the VMs' region, or ZRS | Confirmed (concepts-configuration-examples) | Recommendation table, same-region HA row |
| Object-specific settings details | Confirmed (how-to-configure-object-specific-settings): precedence user > group > system; not configurable with GP templates; no Entra cloud-only identities; keys under Profiles and ODFC | Sentence after the "Other settings" table |
| Antivirus exclusions | Same as 22 | Recommendations bullet extended |
| Kerberos RC4 to AES-SHA1 notice (April 2026 Windows Server update) | Confirmed (notice on every FSLogix page fetched) | New recommendations bullet (it may also belong in 12-storage, not mine) |
| Bank reference title "Configuration Setting Reference" | Page title metadata is "Configuration Settings - FSLogix" | 12 bank questions on 3.1.x (below) |

## 32-clients-redirection

| Finding | Learn | Change |
| --- | --- | --- |
| Multiple monitors on Android/Chrome OS | Confirmed (windows-app/compare-platforms-features): ChromeOS devices only | Feature table cell "ChromeOS only" |
| RDP Shortpath public networks on iOS/iPadOS | Confirmed: not supported (STUN and TURN); macOS public networks only with the Windows App for macOS Beta | Row split: managed networks / public networks (STUN/TURN) |
| RDP Multipath on macOS | Confirmed: Beta app only | Cell "Beta app only"; key point |
| Preview features not flagged | Confirmed on the compare page: camera in browser, TWAIN scanner redirection (redirection-configure-scanners also says "Scanner redirection over RDP is in preview"), WebAuthn on macOS/iOS/Android, smart cards on iOS (YubiKey only); macOS printers: Publisher Imagesetter driver only | Scanner row "(TWAIN, preview)", macOS printer cell, one sentence after the table |
| RAW printing (`SmartRawPrinters`) in preview | **Learn disagrees**: compare page (updated 2026-11-12) says preview for AVD; redirection-configure-printers (updated 2026-08-10) and rdp-properties have no preview note | None. For a human decision |
| Drive redirection disabled on new host pools | Confirmed (redirection-configure-drives-storage). customize-rdp-properties (updated 2025-06) still lists defaults `drivestoredirect:s:*`, `redirectclipboard:i:1`, `redirectprinters:i:1`, `usbdevicestoredirect:s:*`; the per-redirection pages are more specific and more recent, so they were followed | device-redirection paragraph and key point: "clipboard, printer and drive" |
| MSI client and on-premises RDS | Not a chapter error | None |

## 33-user-settings

| Finding | Learn | Change |
| --- | --- | --- |
| Unassign/reassign by REST `PATCH` with `force=true`, `MultiplePersistent` | Confirmed (configure-host-pool-personal-desktop-assignment-type, read through `?accept=text/markdown`). Note: the REST path uses `api-version=2022-02-10-preview` | None |
| Multiple personal desktops in PowerShell need the preview module | Confirmed: Az.DesktopVirtualization 5.3.0-preview or later | personal-desktops paragraph |
| Device credentials | Intune multi-session page: user-credential enrollment isn't supported for Windows Enterprise multi-session; the chapter bullet is already in the multi-session section | Bullet: "for multi-session" made explicit. The GP enrollment page (personal pools may use user credentials) wasn't fetched, so not added |
| Intune limits | Confirmed (Intune azure-virtual-desktop-multi-session): update rings unsupported, web apps don't apply, system-context app with a user-context dependency not installed, RemoteApp and MSIX app attach unsupported in Intune, six remote actions greyed out, VMs "in pooled host pools that have been deployed through Azure Resource Manager" | Two bullets extended / added |
| `screen mode id` overridden by `use multimon` | Confirmed (rdp-properties) | RDP table row |
| "Intune user-scope policy filtered to the multi-session devices" (Exam trap) | **Not confirmed**: the Intune page describes user-scope settings catalog policies assigned to user groups, not a filter | None. For a human decision |
| Default RDP properties contradiction | See 32 | None |

## Mock-exam bank questions changed

- `questions/user-apps/az140-3b-rdp-sso-window.yaml` (3.2.8): the requirements "open in a window" and "use all local monitors" conflicted (Learn: `screen mode id` is overridden when `use multimon` is 1). Third requirement became "The remote desktop uses only one local monitor" (EN + FR), template `use multimon:i:0`, explanation (EN + FR) explains the override. Answer unchanged (custom, rdsaad, window).
- `questions/user-apps/az140-3a-client-ipad.yaml` (3.2.1): explanation of option e (EN + FR) said multiple monitors are Windows and macOS only; now Windows, macOS and ChromeOS, not iOS/iPadOS. The unverified "external monitor" remark was removed. Answer unchanged.
- `questions/user-apps/az140-3a-client-statements.yaml` (3.2.1): explanation (EN + FR) said "the installed clients support it" (RDP Shortpath; iOS lacks public networks) and "not on mobile platforms" (ChromeOS supports multiple monitors). Rewritten. Answers unchanged.
- `questions/identity-security/az140-cs1b-mfa-policy.yaml` (2.1.4): explanation (EN + FR) said Every time "prompts for MFA each time a connection is opened"; now "when a user launches a new connection 5 to 10 minutes or more after the last authentication". Answer unchanged.
- Reference title "Configuration Setting Reference" → "Configuration Settings" (current page title) in 12 questions on 3.1.x: `az140-3a-ccd-signout-timeout`, `-ccd-registry`, `-ccd-cache-dir`, `-ccd-read-write`, `-ccd-page-blob`, `-fsl-prof-script`, `-fsl-prof-block-temp`, `-fsl-prof-flipflop`, `-odfc-exclusions`, `-odfc-concurrent`, `-odfc-statements`, `-odfc-script`.

## Checked and left unchanged

- `az140-2b-dfc-mde-licensing` (answer Defender for Servers Plan 1): confirmed by onboard-windows-multi-session-device.
- `az140-2b-dfc-plans-statements` s2 ("MDE is installed automatically on supported session hosts" = Yes): true by its "supported" wording, but the stem doesn't name the OS and the integration only covers Windows Server; a reviewer may want "supported Windows Server session hosts".
- `az140-2b-dfc-feature-match`, `az140-2b-dfc-remediate-image`: still say "Quick fix" (Defender for Cloud now labels the button **Fix**, but still speaks of applying "a quick fix"); no answer depends on it.
- `az140-2b-tl-gen1-image`: still right (managed images unsupported; Gen2 gallery image).
- `az140-2b-av-fslogix-exclusions`, `-av-cloud-cache-exclusions`, `-av-vdi-statements`, `-av-settings-match`: consistent with the current exclusion list and VDI guidance.
- `az140-2a-rbac-team-roles`, `-rbac-portal-deploy`, `az140-2a-ca-policy-settings`, `az140-2a-sso-consent-prompt`: consistent.
- `az140-3a-redir-statements` s1 (clipboard disabled on new host pools): follows the per-redirection pages.
- `az140-3a-client-private-link`, `-client-serial`, `-client-browser`, `az140-3b-rdp-hotarea`, `az140-3b-policy-intune-rules`, `az140-3b-personal-multi-order`, `az140-3a-fsl-prof-pilot-group` (doesn't depend on exclude-wins), `az140-3a-ccd-signout-timeout`: consistent.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- `az140-3b-print-controls` (3.2.6), target t2 = `SmartRawPrinters:s:*`: the compare page (2026-11-12) says RAW printing is in preview for AVD; the printer redirection page (2026-08-10) and rdp-properties don't. Not rewritten. If it's preview, the question and the chapter's RAW bullet (32) must change. `az140-3b-print-restrictive` also mentions RAW.
- 31: "membership in an exclude list wins over the include list" isn't on current Learn. Keep or remove?
- 31: "the last match decides" for Rule Set assignments is inferred from Learn's two figures, not stated (quiz 31 Q10 and the Exam tip rely on it).
- 33 Exam trap: "an Intune user-scope policy filtered to the multi-session devices" not verified.
- New host pool RDP defaults: customize-rdp-properties lists redirection-enabled defaults, the per-redirection pages say disabled for new host pools. The chapters follow the per-redirection pages.
- Confidential VMs: Windows Server 2025 support (confidential VM docs) vs the AVD page listing only 2022/2019.
- `case-studies/az140-cs1b-lucerne-publishing.yaml` requirement 3 ("MFA each time they open a connection") is slightly stronger than Learn's Every time behavior (5-10 minutes); not mine to edit.
- Out of scope: 7 questions on 1.2.2 still cite "Configuration Setting Reference"; `quizzes/12-storage.yaml` too. The Kerberos RC4 to AES-SHA1 notice may belong in 12-storage.
- Mock-bank note from QZ-33 (`az140-3b-svmoc-commands`, unquoted option id `on`): 3.2.10 is mine, but it isn't a Learn fact and the repository parser reads it as a string; left as is.

## French terms not settled (not in the glossary, or not decided)

- « degré de sécurisation (secure score) » in 22 (existing text, also in the bank): the glossary lists "Secure Score" as `undecided` (« score sécurisé » / « score de sécurité »). Not changed.
- « Corriger » (Fix button; fr-fr Learn uses « Correctif » and « Corriger »), « Prendre des mesures » (Take action).
- « synchronisation de hachage de mot de passe », « préversion », « application bêta », « points de montage », « pilotes », « connectivité RDP relayée », « points de terminaison de certificats », « paramètres propres à un objet » (already used in the bank), « anneaux de mise à jour Windows ».
