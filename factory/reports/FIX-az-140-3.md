# FIX-az-140-3: chapters 34, 35, 41 and 42 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-140 34-app-delivery 35-microsoft-365-apps 41-monitoring 42-updates-backup-dr` 0 problems; `content:validate --cert az-140` 0 problems, 0 warnings (640 files, 15 chapters, 78/78 objectives); `check-quiz az-140 …` 0 problems, 0 warnings.

Every change was made in EN and FR, with the same sections, tables and callouts. Section markers didn't change. Code blocks changed only in two places, both identically in EN and FR: two `reg add` lines in 35 and one KQL comment in 41.

## 34-app-delivery

| Finding | Learn | Change |
| --- | --- | --- |
| CimFS "recommended with Windows 11 hosts" | app-attach-overview: "We only recommend using CimFS … if your session hosts are running Windows 11" | Disk images row: "recommended only if the session hosts run Windows 11" |
| Registration label "Register at log on" | Confirmed. app-attach-setup (portal) says **Register at log on**, app-attach-overview says **Log on blocking**, and the cmdlet uses `-IsLogonBlocking` | Registration row: Log on blocking, "shown as **Register at log on** in the portal" |
| Direct user assignment needs hybrid accounts | Confirmed (app-attach-setup, Assign note: user accounts must be hybrid, groups don't) | New bullet in app-attach |
| Entra joined + Azure Files: storage account in the same subscription as the session hosts; the ARM Provider assignment exposes all the data in the account | Confirmed (app-attach-setup prerequisites; overview warning: store only App attach apps there) | Share permissions row |
| An application group is registered to one workspace only | Confirmed (terminology: "An application group can only be assigned to a single workspace") | application-groups lead paragraph |
| Deployment scope (regional or geographical) must match and can't be changed | app-attach-setup states it with no preview label. regional-host-pools says the feature is **preview** (portal "Deployment Scope (Preview)", East US 2 and Central US only, module 5.4.5-preview) | Not added (preview). See "For a human decision" |
| q6: App attach doesn't support Microsoft Entra Domain Services | app-attach-overview contradicts itself: the identity table says "Not supported", but the Azure NetApp Files paragraph says hosts "joined to AD DS or Microsoft Entra Domain Services" | None (the chapter follows the identity table). See "For a human decision" |
| `-HostPoolReference` replaces the list; an empty array unassigns everything | **Not confirmed**. The Update-AzWvdAppAttachPackage page says only "List of Hostpool resource Ids". The REST App Attach Package - Update page (2026-04-16) doesn't give the PATCH semantics. The app-attach-setup PowerShell tab didn't load | None. See "For a human decision" |
| Publishing role, "Create desktop shortcut (Preview)" | Not re-checked. The report says it matches the chapter | None |

## 35-microsoft-365-apps

| Finding | Learn | Change |
| --- | --- | --- |
| WebRTC retirement | Confirmed (teams-client-vdi-requirements-deploy). For Windows endpoints on AVD/W365: end of support Oct 1, 2026 (it still works but isn't supported) and end of availability Apr 1, 2027 (it stops working; if SlimCore fails, Teams falls back to server-side rendering). macOS: Apr 1, 2027 and Sep 1, 2027. Supported Linux thin clients aren't affected. teams-on-avd still gives the same dates for classic Teams and still recommends installing the WebRTC Redirector Service with new Teams | Teams section: the retirement sentence follows the classic Teams sentence. Key points: the fallback bullet notes the retirement. The recommendation to install the redirector was kept, because teams-on-avd still makes it |
| SlimCore plugin wording | Confirmed (vdi-2): MsTeamsPluginAvd.dll is bundled with Windows App, and the plugin downloads SlimCore (an MSIX package) from Microsoft's public CDN | SlimCore row reworded |
| FSLogix version for new Teams | Learn is inconsistent: teams-on-avd says 2210 hotfix 3 (2.9.8716.30241) or later, the Teams deploy page recommends hotfix 4 (2.9.8884.27471) | Step 5 row: hotfix 4 kept as the Teams recommendation, and hotfix 3 named as the minimum on the AVD page |
| `disableAutoUpdate` details | Confirmed (Teams deploy page): it works only on builds higher than 23306.3314.2555.9628. When it's set, the MSIX installer doesn't install or upgrade TMA. Use `teamsbootstrapper.exe -p --installTMA`, or `--installTMA` alone if Teams is already provisioned | New sentence after the code block |
| `teamsbootstrapper -o` with a UNC path | Confirmed: error `0x80070032` means a probable UNC path error; copy the MSIX to a local folder | Same sentence |
| `CalendarSyncWindowSetting` / `CalendarSyncWindowSettingMonths` | Confirmed: install-office-on-wvd-master-image sets both to 1 under `cached mode` in the default user hive. The page doesn't explain them | Two `reg add` lines added to the code block (EN and FR identical). Prose says they're set to 1, without giving a meaning |
| OneDrive supported OS | Confirmed (sync-vdi-support): non-persistent with FSLogix is supported on Windows 11 and on Windows Server 2025 or newer | OneDrive paragraph: OS added |
| Client minimum versions | Learn gives different values: 1.3.252 (teams-on-avd, plugin bundling), 2.0.352.0 (vdi-2 and teams-for-vdi). The RD client is "No longer supported" for new Teams | None (the chapter gives no version) |

## 41-monitoring

| Finding | Learn | Change |
| --- | --- | --- |
| Latency "up to about 15 minutes" | Both true. troubleshoot-insights: "Azure Monitor has a 15-minute latency period". diagnostics-log-analytics: "It might take a few hours after first set-up" | Sentence covers both |
| Sizing: 4–24 or 6–24 vCPUs | Confirmed contradiction on the same page (session-host-virtual-machine-sizing-guidelines): "between 6 vCPUs and 24 vCPUs", and "The recommended range between 4 and 24 cores". It also says four cores are the lowest recommended | None. See "For a human decision" |
| Dynamic autoscaling needs an extra role | Confirmed (autoscale-scaling-plan, autoscale-create-assign-scaling-plan): Power On Off Contributor **and** Desktop Virtualization Virtual Machine Contributor for the AVD service principal at subscription scope | "Scaling methods" paragraph |
| Two autoscale logging mechanisms | Confirmed. autoscale-monitor-operations-insights: host pool category **Autoscale logs for pooled host pools**, table `WVDAutoscaleEvaluationPooled`, pooled only. autoscale-diagnostics: diagnostic setting on the **scaling plan** (*Autoscale logs*) to a storage account or Event Hubs; this is the option for personal host pools | New sentences after the Insights categories |
| `count(UserName)` comment overstates | Confirmed. Learn's heading is "To find out whether a specific error occurred for other users". The KQL reference documents only `count()`, with no argument | KQL comment (EN and FR identical): "Whether a specific error occurred for other users". The query is still Learn's sample. See "For a human decision" |
| FR « workbook » | Shared glossary: « classeur » (confirmed). Learn fr-fr insights uses « classeurs Azure Monitor » and « classeur de configuration » | FR 41: « workbook(s) » became « classeur(s) » in prose and in the section title. Portal labels in italics (*Workbooks*), the role name Workbooks Contributor and the section id are unchanged |
| Reference titles/URLs in the bank | Page title is now "Send diagnostic data to Log Analytics for Azure Virtual Desktop". The sizing page's canonical URL is `…/remote-desktop-services/session-host-virtual-machine-sizing-guidelines` (the old `virtual-machine-recs` URL serves the same page) | See bank changes |

## 42-updates-backup-dr

| Finding | Learn | Change |
| --- | --- | --- |
| Azure Files restore from the vault | Confirmed. restore-afs: "Vaulted backup currently supports only full share recovery". Original location needs a Snapshot or Snapshot and Vault-tier point, and the restore fails if the snapshot is gone. azure-file-share-backup-overview: from the vault, you can restore the complete share to an alternate location | backup-restore: the "snapshot otherwise vault" sentence is replaced. Item Level Restore and original-location restores need the snapshot; from the vault, only Full Share Restore to an alternate location |
| Vault in the same region **and subscription** | Confirmed (backup-azure-files prerequisites; Cross Subscription Backup is the exception) | Exam tip: subscription added for Azure Files. The VM part is unchanged (not re-fetched) |
| Session host update: power state, drain mode, purchase plan | Confirmed (session-host-update): existing power state and drain mode are honored, an update works with all hosts deallocated, and the purchase plan of a gallery image isn't retained | update-strategy, item 3 |
| FR « capture instantanée » | Glossary: « instantané », « instantané de partage » | FR 42: every « capture(s) (instantanée(s)) » meaning snapshot became « instantané(s) », in the tables, the limits paragraph and the key points |

## Mock-exam bank questions changed

References only. No stem, answer or explanation changed.

- `monitoring/az140-4a-kql-session-duration`, `az140-4a-remoteapp-usage`, `az140-4a-feed-category`, `az140-4a-error-alert`, `az140-4a-diag-statements` (4.1.1, 4.1.2, 4.1.6): reference title "Azure Virtual Desktop diagnostics log analytics" became "Send diagnostic data to Log Analytics for Azure Virtual Desktop", the current page title.
- `monitoring/az140-4a-sizing-medium`, `az140-4a-sizing-statements` (4.1.4): reference URL `…/virtual-machine-recs` became the canonical `…/session-host-virtual-machine-sizing-guidelines`. The title was already right.

## Checked and left unchanged

- App attach questions (`az140-3c-appattach-*`, `az140-3c-package-*`, `az140-cs1a-app-attach-share`, `az140-cs3b-app-attach`, `az140-cs4b-app-attach-package`, `az140-3b-appdeploy-*`). `az140-3c-package-msixmgr` says CimFS is "recommended with Windows 11 session hosts", which agrees with Learn. `az140-3c-appattach-conditions` already makes User1 a hybrid identity. None relies on the deployment scope or on `-HostPoolReference`.
- Application group questions (`az140-3b-appgroup-*`, `az140-3c-assign-*`, `az140-cs1c-app-groups`, `az140-cs3b-app-groups`): consistent with the one-workspace rule.
- Teams questions `az140-3c-teams-config` and `az140-3c-teams-verify`: not affected. OneDrive and ODT questions: not affected (the CalendarSync values aren't tested).
- `az140-3c-teams-webrtc-location` and `az140-cs4a-teams`: not changed. teams-on-avd still recommends installing the WebRTC Redirector Service with new Teams, and the fallback still works until April 1, 2027. See "For a human decision".
- Autoscale questions (`az140-cs3b-autoscale` and the other 4.1.5 questions): they are about power management, so Power On Off Contributor alone is right.
- 4.2.x backup and restore questions: consistent with the corrected chapter. `az140-4b-rs-profile-rollback` uses a Snapshot tier policy for its Item Level Restore to the original location. `az140-4b-bk-files-tiers`, `az140-4b-bk-cross-region` and `az140-4b-bk-files-limits` agree with Learn.
- Quizzes: none changed. All four still agree with the corrected chapters (check-quiz 0/0). Quiz 42 q10 now matches the chapter's vault restore rule.

## For a human decision

1. **WebRTC fallback in the bank (3.3.7).** `az140-cs4a-teams` (answer a) and the case-study text `case-studies/az140-cs4a-woodgrove-bank.yaml` are a problem. The Liège thin clients run "a version of the Remote Desktop client that doesn't support SlimCore", and they must get optimization through WebRTC. If those clients are Windows-based, WebRTC there has been unsupported since Oct 1, 2026 and stops working on Apr 1, 2027. The case-study text isn't in my scope. Suggested fix: make them Linux-based thin clients, which aren't affected, or drop the requirement. `az140-3c-teams-webrtc-location` (Windows devices, WebRTC as fallback) is still right today but becomes obsolete on Apr 1, 2027. Quiz 35 q10 depends on the same point (unspecified thin clients).
2. **App attach and Microsoft Entra Domain Services:** app-attach-overview contradicts itself (identity table vs the Azure NetApp Files paragraph). The chapter and quiz 34 q6 follow the table.
3. **`-HostPoolReference` replaces the list / an empty array unassigns everything** (chapter 34, bullet and code): not documented on Learn. Keep it, verify it in a lab, or remove the bullet.
4. **Deployment scope (regional or geographical):** app-attach-setup states the matching rule without a preview label, while regional-host-pools marks the feature as preview. It wasn't added to 34. Chapter 42 already calls regional host pools "(preview)".
5. **Dynamic autoscaling status:** Learn has no explicit preview banner. Power management is "already generally available" and the PowerShell module is 5.4.2-preview. The chapter keeps "(preview)".
6. **Sizing range 4–24 vs 6–24 vCPUs** (same Learn page). The chapter and the key points keep 4–24.
7. **`count(UserName)`** in Learn's sample query (chapter 41) isn't documented KQL syntax: the KQL reference documents `count()` only. The query was kept as Learn's sample, and only the comment changed.
8. **FR terms in the bank (not in my scope to change without a factual error):**
   - 4.2.x questions use « capture(s) instantanée(s) »; the glossary says « instantané ». Examples: `az140-4b-bk-files-tiers`, `az140-4b-bk-cross-region`, `az140-4b-bk-files-limits`.
   - Quiz 41 and the AZ-140 French study guide (`objectives.yaml`) use « workbook »; chapter 41 now uses « classeur », as the glossary and Learn fr-fr do.
9. **French terms not in the glossary, used in my changes:**
   - « points de terminaison » for Teams endpoints (glossary "endpoint" → « point de terminaison »)
   - « complément Teams Meeting »
   - « rendu côté serveur »
   - « sauvegarde inter-abonnements (Cross Subscription Backup) »
   - « Bloquante à l'ouverture de session » (existing text, for Log on blocking)
   - « Archivée » (existing text, for the vaulted tier)
