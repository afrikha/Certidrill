# FIX-az-900-2 — chapters 24, 31, 32, 33, 34 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-900 24-identity-security 31-cost-management 32-governance-compliance 33-management-tools 34-monitoring` 0 problems; `content:validate --cert az-900` 0 problems, 0 warnings; `check-quiz az-900` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block, section marker or callout count changed. The shared WebFetch budget ran out several times during the pass. The points that could not be fetched are listed as "not confirmed" and were left unchanged.

## 24-identity-security

| Finding | Learn | Change |
| --- | --- | --- |
| The passwordless page now covers passkeys (FIDO2): synced and device-bound | Confirmed (concept-authentication-passwordless, H1 "Authentication methods in Microsoft Entra ID - passkeys (FIDO2)"): device-bound = FIDO2 security keys and Microsoft Authenticator, recommended for highly regulated industries and privileged users; synced = Apple iCloud Keychain and Google Password Manager, for most users | authentication-methods: one sentence after the list of passwordless options |
| The Defender for Cloud overview no longer names Azure Arc | Confirmed (defender-for-cloud-introduction doesn't name Arc). But AZ-900 unit 9 still says to deploy Azure Arc to extend protection to on-premises machines | None |
| The Defender for Cloud overview now calls it a CNAPP that is "expanding to the Defender portal" | Confirmed (overview). It doesn't contradict the chapter, and the AZ-900 unit still uses assess / secure / defend | None |
| Quiz Q7 (FIDO2 for shared PCs) | The passkeys page says nothing about shared PCs or kiosks | None (quiz only, see "For a human decision") |

## 31-cost-management

| Finding | Learn | Change |
| --- | --- | --- |
| "Traffic inside a region costs less than traffic between regions" isn't on Learn | Confirmed: unit 2 of the cost module gives only the Europe example ("less expensive to move information within Europe than … to Asia or South America") and says outbound pricing depends on billing zones | Network traffic row: the sentence now follows the unit |
| Cost Management tag inheritance | Confirmed (enable-tag-inheritance): applies billing, subscription and resource group tags to child resource usage records, "not the resources themselves"; EA, MCA, MPA | Tags bullet: one sentence (cost data only, resources unchanged) |
| Budgets: data delay and evaluation every 24 h; action groups only at subscription and resource group scope | Confirmed (tutorial-acm-create-budgets): data within 8-24 hours, evaluated every 24 hours; "Resources aren't affected"; action groups only for subscription and resource group | Budgets row: one sentence on the delay. The action-group scope limit wasn't added (too detailed for AZ-900) |
| Facts re-checked | Reservations "up to 72%", one or three years (save-compute-costs-reservations). Free trial: 12 months of free products and a credit for the first 30 days (unit 2) | None |

## 32-governance-compliance

| Finding | Learn | Change |
| --- | --- | --- |
| Most restrictive lock wins; can't lock a management group | Confirmed (lock-resources): "The most restrictive lock in the inheritance chain takes precedence"; "You can't add a lock to management groups"; resources added later inherit the lock | resource-locks: the scope and inheritance bullet now says all three |
| A Delete lock on a resource blocks deletion of its resource group | Confirmed (lock-resources: "the whole delete operation" is blocked, no partial deletion) | resource-locks: new bullet |
| Locks protect only control plane operations | Confirmed (lock-resources: a lock on a storage account doesn't protect the data in a blob, queue, table or file) | resource-locks: new bullet. Key points updated (not on management groups, the most restrictive wins, control plane only) |
| Initiative example *Enable Monitoring in Azure Security Center* | Still the example in the AZ-900 Policy unit (3-describe-purpose-azure-policy), even though Security Center is now Defender for Cloud | None (flagged) |
| FR glossary | The portal lock level is « Suppression » (glossary). The FR key points said « Supprimer » | FR key points: « Suppression ou Lecture seule » |

## 33-management-tools

| Finding | Learn | Change |
| --- | --- | --- |
| The chapter never says that a redeployment overwrites a manual change | Confirmed (deployment-modes): on redeployment, all properties are reapplied, properties missing from the template are reset to defaults, and the template "always contains the final state". The page doesn't mention portal changes; the overwrite follows from those rules | arm-templates: one paragraph after the Bicep paragraph |
| Cloud Shell entry points: the chapter lists only the portal and shell.azure.com | Confirmed (cloud-shell/overview): portal.azure.com, shell.azure.com, the Azure mobile app, the CLI and PowerShell docs, VS Code | Cloud Shell row: adds the Azure mobile app |
| "Bash (with the Azure CLI) or PowerShell (with Azure PowerShell)" could suggest a tool isn't available in the other shell | Not confirmed: cloud-shell/features says both tools are preinstalled, but not that each works in both shells. The AZ-900 unit uses the same pairing as the chapter ("the Azure CLI (which uses Bash)") | None |
| "cmdlet" | Still `undecided` in the glossary | None (flagged) |

## 34-monitoring

| Finding | Learn | Change |
| --- | --- | --- |
| "Official reports that explain the cause of an incident" (Service Health history) | Confirmed: health-history-overview, the Service Health overview and the AZ-900 unit don't mention post-incident reviews or root-cause reports. health-history-overview: past events are shown for 90 days, and the API keeps them up to a year | Service Health paragraph: replaced by the 90-day and one-year retention |
| Log Analytics "from simple record retrieval to statistical analysis" | Confirmed (log-analytics-overview): Simple mode (point and click to filter, sort, aggregate) and KQL mode (full KQL for deeper analysis) | Log Analytics row |
| Application Insights "installed with an SDK or with an agent" | Confirmed (app-insights-overview, now titled "…OpenTelemetry observability"): automatic instrumentation on some platforms, or code-based instrumentation with a Microsoft OpenTelemetry Distro. Users of the older SDKs migrate to Azure Monitor OpenTelemetry | Application Insights row |
| "Advisor is free" | Not confirmed: advisor-overview and the AZ-900 Advisor unit don't mention pricing, and advisor-faq couldn't be fetched (site error, then fetch budget) | None (flagged) |
| Alert severity | Not confirmed: alerts-overview doesn't mention severity, and no other alert page could be fetched | None (flagged) |
| Service Health panes (security advisories, billing updates); action groups reused by Service Health and Advisor alerts | Not confirmed: the Service Health overview names only outages, planned maintenance and health advisories; the Azure Monitor unit couldn't be fetched. alerts-overview confirms that Service Health and Resource Health alerts are activity log alerts | None |

## Mock-exam bank questions changed

- `questions/management/az900-3b-cli-match-tools.yaml` (objective 3.3.2), EN + FR explanation: "The portal and the mobile app are graphical tools, not command lines" became "…graphical tools: both can open Cloud Shell, but neither is a command-line tool itself". Why: cloud-shell/overview lists portal.azure.com and the Azure mobile app as ways to open Cloud Shell. Added the reference "What is Azure Cloud Shell?" (fetched). The answer doesn't change.

## Checked and left unchanged

- Read for each finding, by grep across `questions/` (all 205 questions with objectives 2.4.x and 3.1.x to 3.4.x), not a full review:
- 2.4.8 Arc (`az900-2d-dfc-onprem-arc`, `az900-2d-dfc-capabilities`): agree with AZ-900 unit 9.
- 3.1.1 network and region questions (`az900-3a-cost-network-yn`, `az900-3a-cost-region-price`, `az900-3a-cost-factors-drag`): already follow the unit.
- 3.1.4 tag questions (`az900-3a-tag-inherit-policy`, `az900-3a-tag-table-hotarea`, `az900-3a-tag-cost-report`): they're about the tags on resources, which Cost Management tag inheritance doesn't change. Still correct.
- 3.2.3 lock questions (`az900-3b-lock-scopes`, `az900-3b-lock-match-config`, `az900-3b-lock-delete-type`, …): nothing depends on data-plane protection. `lock-scopes` already says management groups can't be locked.
- 3.3.2 Cloud Shell questions (`az900-3b-cli-cloudshell-choice`, `az900-3b-cli-dd-equivalent`): already say both tools are available in Cloud Shell.
- 3.3.4 `az900-3b-iac-drift`: agrees with the new redeployment paragraph.
- 3.4.2 Service Health questions (`az900-3c-sh-*`): none relies on root-cause reports.
- 3.4.3 `az900-3c-mon-appinsights-statements`: s2 ("an SDK is the only way" → No) stays correct. The explanation ("an SDK added to the code or an agent") doesn't contradict Learn, although Learn now speaks of the OpenTelemetry Distro and automatic instrumentation.
- Reference titles "What is Azure PowerShell" without "?" (QZ-33 note): a title nit, not a fact. Not changed.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 32 q9 and quiz 33 q10 now rest on facts the chapters state (most restrictive lock, Delete lock blocking deletion of the resource group, redeployment overwriting a change).

## For a human decision

- 34: keep or remove "It is free" (Advisor): not found on the two Advisor pages fetched; the FAQ couldn't be read.
- 34: "An alert has a severity": not on alerts-overview. Needs a fetch of an alert-rule page.
- 34: Service Health post-incident reviews: the claim was removed because no fetched page documents them. If the owner wants to keep them, cite a Learn page that does.
- 32: the initiative example *Enable Monitoring in Azure Security Center* is still on the AZ-900 unit, but Security Center is now Defender for Cloud. Keep it as quoted, or replace it with a current built-in initiative (not verified here).
- 24: quiz Q7 (FIDO2 keys for shared PCs) is still only inferred: no fetched page says it in words.
- 33: whether each tool (CLI, PowerShell) runs in both Cloud Shell experiences isn't stated on the fetched pages. The chapter keeps the unit's pairing.
- French terms not in the glossary: « clés d'accès liées à l'appareil » / « synchronisées » (device-bound / synced passkeys), « héritage des étiquettes » and « enregistrements d'utilisation » (Cost Management tag inheritance, usage records), « mode simple » / « mode KQL » (Log Analytics), « instrumentation automatique » and « distribution OpenTelemetry (Distro) », « volet Health history » (pane name kept in English). Still `undecided`: « cmdlet » (FR chapter 33 uses « cmdlets ») and « secure score » (FR chapter 24).
