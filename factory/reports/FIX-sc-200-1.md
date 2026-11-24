# FIX-sc-200-1 — chapters 11, 12, 13, 14, 15 and 21 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-200 11-defender-settings 12-automation 13-sentinel-platform 14-data-ingestion 15-detections 21-xdr-workloads` 0 problems; `content:validate --cert sc-200` 0 problems, 0 warnings; `check-quiz sc-200 …` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The shared WebFetch budget ran out several times; each fetch was retried later, and the findings below say which ones couldn't be confirmed.

## 11-defender-settings

| Finding | Learn | Change |
| --- | --- | --- |
| Manual merge "up to five" | alerts-incidents-correlation: "five incidents at a time can be merged manually". merge-incidents-manually (Legacy) describes selecting two incidents, gives no maximum, says Defender decides the target, and requires same or null Assigned to / Classification / Determination | "Five" kept. New sentence: same-or-null rule, Defender picks the target. The two-vs-five wording is flagged below |
| Indicator timing applied to all indicators | indicator-file: within 15 min, 30 on average, up to 2 h. indicator-ip-domain: up to 48 h, usually under 2 h | Timing bullet split by indicator type |
| Web content filtering prerequisite | web-content-filtering: SmartScreen for Edge; network protection in block mode for non-Microsoft browsers on Windows (Edge too on macOS/Linux) | New sentence after the Rules table |
| Network indicators in non-Microsoft browsers | indicator-ip-domain: other browsers and apps need network protection in **block mode**; Edge uses SmartScreen | IP/URL bullet |
| File indicators also need file hash computation | indicator-file: Windows requirement `EnableFileHashComputation` | File-indicator bullet |
| ASR precedence: controlled configuration | enable-attack-surface-reduction (note) + secure-controlled-configuration: now called **configuration protection**, **Preview**; only Intune and MDE policies apply; GPO, scripts, ConfigMgr, local changes ignored | New sentence, labelled preview |
| `BehaviorInfo` / `BehaviorEntities` | advanced-hunting-behaviorinfo-table: "BehaviorInfo (Preview)"; the schema list also marks BehaviorEntities preview. Set as behavior itself isn't labelled preview (investigate-alerts) | Set as behavior row: "(preview tables)" |
| Per-source severity in incident notifications | m365d-notifications-incidents: the overview says it's possible; the wizard shows one Alert severity setting only | None. Flagged |
| Custom data collection preview status | custom-data-collection: "prereleased product" notice, no "Preview" label. Supported OS, license and one-workspace limit aren't on that page | None. Flagged (objective 1.1.5 names the feature) |

## 12-automation

| Finding | Learn | Change |
| --- | --- | --- |
| `\program files\` listed as a temporary folder | automation-levels: the example temp list includes `\program files\` and `\program files (x86)\*` | Non-temp row now says so. Bank question fixed (below) |
| Unified RBAC scope | create-custom-rbac-roles: an assignment selects users/groups, data sources and Sentinel data collections; device groups govern per-device visibility and are configured separately. Permission groups: Security operations, Security posture, Authorization and settings, Data operations (Preview) | Unified RBAC sentence |
| Who grants playbook permissions | run-playbooks: **Owner or User Access Administrator**. The automation rules page and the roles page say only Owner | Table row + exam trap. Learn inconsistency flagged |
| Playbook run history | run-playbooks: **Runs** tab of the Run playbook panel on an incident, besides the logic app | One sentence added |
| Attack disruption: isolate device, Semi level | configure-attack-disruption: "Automatic device isolation is currently in preview"; "Selecting the Semi automation level allows triggering … without the need for manual approval" | Action row "(automatic isolation in preview)"; prerequisites row mentions Semi |
| Enhanced Alert Trigger for Defender XDR alerts | automate-incident-handling-with-automation-rules recommends it; no page says whether it's GA | None. Flagged |
| Role to create automation rules | Not named on the automation rules or roles pages | None (chapter keeps Microsoft Sentinel Contributor). Not confirmed |
| Automation Contributor "required for users" | Automation rules page vs roles page ("not used for user accounts") | None. The QZ report's inconsistency still stands |
| FR « règle(s) d'analyse » | FR study guide (objectives.yaml 1.4.3): « règles d'analytique » | 4 occurrences harmonised |

## 13-sentinel-platform

| Finding | Learn | Change |
| --- | --- | --- |
| Table-level RBAC | azure-monitor/logs/manage-access: granular RBAC (Log Analytics Data Reader with conditions) "is the recommended method"; best practice for new configurations. Only the per-table permission strings are "legacy method". Release status not stated | Restrict-a-team row |
| Grant permission on a playbook resource group | run-playbooks: Owner or User Access Administrator | Row |
| Data (manage) / Table insights | manage-table-tiers-retention: Data (manage) or workspace write (Log Analytics Contributor); changing tier or retention from Table insights needs Microsoft Sentinel Contributor + Log Analytics Contributor | Row |
| Workbook permissions | roles: narrative "Sentinel Contributor or a lesser role AND Workbook Contributor" vs task matrix "Contributor ✓" | None. Flagged |
| Basic Logs tables managed only from Log Analytics | Not on manage-table-tiers-retention | None. Not confirmed |
| Analytics retention default (30 vs 90 days) | Not on manage-table-tiers-retention; not used by the chapter | None |
| FR « règle(s) d'analyse » | Study guide wording | 5 occurrences harmonised |

## 14-data-ingestion

| Finding | Learn | Change |
| --- | --- | --- |
| XPath "100 boxes per rule" | data-collection-windows-events: only "DCRs support up to 20" expressions (Get-WinEvent 23); no 100 limit | Limit sentence and key point |
| Azure Activity retention cost | activity-log: no ingestion charge; retention charged only beyond the default 90 days | One clause |
| Syslog/CEF duplicate transformation | cef-syslog-ama-overview: since AMA 1.41 `ProcessName` may not contain "CEF" for non-RFC-compliant vendors; filter both `ProcessName` and `SyslogMessage` | Exam trap |
| DCE and `sc200-1d-ct-ingestion-steps` | tutorial-logs-ingestion-portal: the portal custom log wizard requires a DCE, same region | Chapter now says the portal wizard always asks for one. Question consistent (its stem says Azure portal): unchanged |
| ThreatIntelIndicators / ThreatIntelObjects status | understand-threat-intelligence: "publicly previewed" April 3, 2025; GA not stated; legacy table stopped July 31, 2025; object types of ThreatIntelObjects not listed | None. Flagged |
| TLS 1.2 for the Logs Ingestion API | QZ: fine | None |

## 15-detections

| Finding | Learn | Change |
| --- | --- | --- |
| User action columns | custom-detection-rules: Mark user as compromised = `AccountObjectId`/`InitiatingProcessAccountObjectId`/`RecipientObjectId`; Disable user and Reset user authentication = a SID column (`AccountSid`, `InitiatingProcessAccountSid`, `RequestAccountSid`, `OnPremSid`), plus `AccountObjectId` for Entra identities. Quarantine also accepts `InitiatingProcessSHA1/256`; Allow/Block needs Remediate | User row split in two (both languages), File row |
| Permissions | Security Operator with MDE RBAC also needs Manage Security Settings; permissions checked per data source (Email* vs Identity*) | Permissions paragraph |
| Continuous restrictions | GA columns only; EmailEvents except LatestDeliveryLocation/Action; `matches regex` as encoded literals; `ingestion_time()` | Sentences after the frequency table |
| Custom lookback for Sentinel data | Under 48 h when more often than hourly; 14 or 30 days otherwise (Learn's wording on the 14-day case is unclear) | Row: "up to 30 days depending on frequency; under 48 hours when more often than hourly" |
| Include/exclude from correlation | custom-detection-manage: public preview for custom detections | Row |
| MDTI Analytics indicator types | use-matching-analytics-to-detect-threats: domain and IPv4; URL only in CEF `RequestURL` | Rule-type row |
| Anomaly `Score` 0–1 | Anomalies table reference: `real`, "The score of the anomaly", no range | Sentence removed; replaced with `RuleStatus` (Production/Flighting), confirmed on the same page |
| MITRE ATT&CK page is preview | Not re-fetched; chapter already says "(Preview)" | None. Flagged (objective 1.4.4 names it) |
| TI map templates on the legacy table | Not re-fetched this session | None |
| "Migrate now" | Not on custom-detection-manage | None. Not confirmed (not contradicted) |

## 21-xdr-workloads

| Finding | Learn | Change |
| --- | --- | --- |
| Preview hunting tables | advanced-hunting-schema-tables marks BehaviorInfo, BehaviorEntities, DataSecurityEvents, DataSecurityBehaviors, CloudProcessEvents, CloudStorageAggregatedEvents preview (BehaviorInfo's own page confirms). CloudAuditEvents, CloudAppEvents not preview | "(both in preview)" after each pair |
| Tenant-based Defender for Cloud connector | connect-defender-for-cloud and ingest-defender-for-cloud-incidents: connector in PREVIEW; in the Defender portal it isn't listed because Defender XDR already ingests the alerts; disable the legacy connector and the Scheduled/Microsoft security rules | Exam tip rewritten; key point |
| "Release a user only after resetting credentials" | autoad-results: release after you mitigate the risk and complete the investigation; nothing about credentials | Exam trap |
| Disable user for cloud-only accounts | automatic-attack-disruption: synced accounts are disabled in AD **and** in Entra ID; cloud-only through the Microsoft-managed app | None: the chapter ("synced or cloud accounts") is right. Not confirmed |
| MDCA alert names | investigate-anomaly-alerts: Suspicious inbox forwarding renamed **Suspicious email forwarding rule created by third-party app**; Suspicious inbox manipulation rule disabled, migrated, can be re-enabled in Policy management | Table row |
| CloudAppEvents prerequisite | dlp-investigate-alerts-defender: needs Microsoft 365 connected to Defender for Cloud Apps | One clause |
| DLP retention 6 months / 30 days | purview/dlp-learn-about-dlp: confirmed | None |
| Email remediation limits, ID Protection "Require Identity Verification" | Not used | None |

## Mock-exam bank questions changed

- `environment/sc200-1b-dg-folder-levels` (1.1.9): File2 moved from `C:\Program Files\KioskApp` to `C:\ProgramData\KioskApp` (EN, FR, explanations). Learn lists `\program files\` as a temporary folder, so the old answer (pending) contradicted the page. Answer unchanged.
- `environment/sc200-cs3c-team-roles`, `environment/sc200-1b-rl-other-roles` (1.2.1), `environment/sc200-cs2b-playbook-automation` (1.1.11): explanations now say Owner **or User Access Administrator** (run-playbooks). User Access Administrator isn't an option in any of them, so the answers stand.
- `environment/sc200-1d-ar-mdti-rule` (1.4.3): explanation now says domains and IPv4, plus URLs in CEF logs.
- Rewritten because the correct answer was a preview feature (same id, type, objective, difficulty; `status: draft`):
  - `environment/sc200-1a-tune-behavior-table` (1.1.2, single, 2): was "query BehaviorInfo" (preview table). Now: why an alert suppressed by a built-in tuning rule came back → AIR found malicious activity and Defender reactivated it (investigate-alerts). The id no longer matches the content.
  - `incidents/sc200-2a-dlp-behaviors-table` (2.1.2, single, 1): was BehaviorInfo. Now: review an email DLP alert's message → Actions > Download email.
  - `incidents/sc200-2a-kql-behavior-files` (2.1.2, dropdown, 3): was a BehaviorInfo/BehaviorEntities join. Now an AlertInfo/AlertEvidence inner join on AlertId with the tuning rule disabled (alert titles filtered on a string stated in the stem, because AlertInfo's ServiceSource values aren't listed on Learn).
  - `incidents/sc200-2a-purview-hunting-tables` (2.1.2, dragdrop, 2): 3 of 4 answers were preview tables. Now 3 targets: AlertInfo, AlertEvidence, CloudAppEvents (distractors BehaviorInfo, EmailEvents). It partly overlaps the KQL question above (same tables, different decision). That insider risk alerts are rows of AlertInfo is an inference (alerts in the queue), not stated on a fetched page.
  - `incidents/sc200-2a-mdc-sentinel-duplicates` (2.1.3, multi, 3): was "configure the tenant-based connector" (preview, and not listed in the Defender portal). Now choose 2: disconnect the legacy connector + turn off the incident rule. The tenant-based connector is a distractor. New reference: "Ingest Microsoft Defender for Cloud incidents with Microsoft Defender XDR integration".
  - `environment/sc200-1d-mg-rules-as-code` (1.4.2, single, 2): was the Microsoft Security Bicep extension (preview, as its own explanation said). Now: list only failed rules → Add filter on Last run status (custom-detection-manage). The id no longer matches the content.

## Checked and left unchanged

- `sc200-1a-merge-statements`, `sc200-1a-merge-blockers` (merge rules, Defender picks the target), `sc200-1a-ind-edge-path` (stem's "three days ago" rules out the 48-hour distractor), `sc200-1a-ind-block-fail`, `sc200-1a-af-allowblock-prereq`, `sc200-1a-af-network-indicators` (no file-hash-computation option makes a second answer right), `sc200-1a-asr-intune-assign`.
- `sc200-cs2a-device-groups`, `sc200-1b-ad-exclusion-types`, `sc200-1b-ad-contain-user-sensor` (match configure-attack-disruption).
- `sc200-1d-ct-ingestion-steps` (portal wizard needs a DCE), `sc200-1c-cef-transform` (already filters both fields).
- `sc200-1d-cd-response-actions`, `sc200-1d-cd-permissions`, `sc200-1d-mg-correlation` (Rule-VIP is an analytics rule, where the setting isn't preview), `sc200-1d-ar-mdti-tables`.
- `sc200-2a-disruption-hunting-table`: DisruptionAndResponseEvents is marked preview in the schema list, but its own page and autoad-results don't label it. The most specific page wins, so unchanged; flagged.
- `sc200-2a-dlp-restore-alerts` (answer is disabling the tuning rule, GA), `sc200-2a-dlp-alert-retention` (6 months / 30 days confirmed), `sc200-1a-tune-hidden-tables`, `sc200-1a-tune-hide-scanner`, `sc200-sr2-scanner-tuning-*` (BehaviorInfo only as a distractor or in "No" explanations).
- `sc200-2a-mdca-ban-oauth`: investigate-anomaly-alerts describes the ban on the Google or Salesforce tabs of App governance; banning Microsoft 365 OAuth apps isn't contradicted. Left; flagged.

## Quiz files

None changed. All six quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- Manual merge: "five at a time" (correlation page) vs a two-incident procedure with no maximum (merge-incidents-manually, Legacy; incident cases are the recommended preview experience).
- Preview features named by the objectives: custom data collection (1.1.5, "prereleased" notice), MITRE ATT&CK page (1.4.4), ThreatIntelIndicators/ThreatIntelObjects (1.3.6; the legacy table no longer receives data, so there's no GA alternative). Bank questions answering with them were kept.
- Schema list vs table page for DisruptionAndResponseEvents (preview vs no label).
- Playbook permission grant: Owner (automation rules and roles pages) vs Owner or User Access Administrator (run-playbooks). The course and bank now follow run-playbooks.
- Workbook create/delete permissions: the roles page contradicts itself.
- Enhanced Alert Trigger: Learn recommends it for Defender XDR alerts, release status unknown. Not added.
- Per-source severity in incident notification rules: overview yes, wizard doesn't show it.
- Custom detection lookback for Sentinel data: Learn's "higher than one day → up to 14 days" is ambiguous. The chapter gives only the safe part.
- FR terms not in the glossary: « règle d'analytique » (now the only form in these six chapters, as in the FR study guide; the bank still has 38 « règle(s) d'analyse », out of this task's scope); « protection de la configuration » (configuration protection); « RBAC granulaire »; « collections de données Sentinel »; incident tag: « étiquette » (ch. 11, bank `Redirected`) vs « balise » (ch. 21 `Attack Disruption`); « Centre de notifications » for Action center (existing).
