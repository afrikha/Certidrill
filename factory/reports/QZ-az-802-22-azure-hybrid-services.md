# QZ-az-802-22-azure-hybrid-services — end-of-chapter quiz, AZ-802, chapter 22

File: `content/az-802/quizzes/22-azure-hybrid-services.yaml` (10 questions, draft).
Check: `npx tsx factory/check-quiz.ts az-802 22-azure-hybrid-services` → 0 problem(s), 0 warning(s).

| # | Objective | Difficulty | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.2.1 | 1 | single | `azcmagent check --location` before connecting |
| 2 | 2.2.2 | 1 | single | ApplyAndMonitor (apply once, report drift, no auto-correct) |
| 3 | 2.2.5 | 2 | single | Fair share stops cloud jobs after 3 h → Hybrid Runbook Worker group |
| 4 | 2.2.4 | 2 | single | One-time update with include KB + Reboot if required |
| 5 | 2.2.3 | 2 | dropdown | `az connectedmachine extension create`, Microsoft.Azure.Monitor, `--enable-auto-upgrade` |
| 6 | 2.2.2 | 3 | dragdrop | Machine configuration / Custom Script / Change Tracking and Inventory / DeployIfNotExists (DSC extension trap) |
| 7 | 2.2.1 | 3 | single | Agent upgrade through WSUS: sync and approve the Azure Connected Machine Agent product |
| 8 | 2.2.4 | 3 | hotarea | Windows Server Management enabled by Azure Arc eligibility (SA, agent ≥ 1.47, Connected) |
| 9 | 2.2.5 | 3 | multi | Draft vs Published, Test pane runs real actions, HRW jobs as Local System, one worker per job |
| 10 | 2.2.3 | 3 | yesno | Allowlist + monitor mode: installed extensions stay, CSE blocked in monitor mode, no change from Azure |

Mock-exam questions of 2.2.x (az802-2a-arc-*, az802-2b-*, cs1a, cs2a, cs3b, cs4b, sr2) read first; none of their decisions reused with the same answer.

## Learn pages fetched (2026-11-24)

Connected Machine agent network requirements; CLI reference for azcmagent check; azcmagent config; Understand machine configuration assignment resources; Remediation options for machine configuration; Windows Server Management enabled by Azure Arc; Run Azure Automation Runbooks on a Hybrid Runbook Worker; Deploy an extension-based Hybrid Runbook Worker; Runbook execution in Azure Automation; az connectedmachine extension; Azure Key Vault VM extension for Windows; VM Extension Management with Azure Arc-Enabled Servers; Overview of Dynamic Scoping; Use Azure Private Link to connect servers to Azure Arc; Extensions security for Azure Arc-enabled servers; Manage runbooks in Azure Automation; Deploy updates and track results in Azure Update Manager; Change Tracking and Inventory overview (AMA); Manage Azure Connected Machine agent versions.

## Doubts / not confirmed

- The list of extensions allowed in monitor mode isn't published on Learn (the page says to run `azcmagent config list`). Q10 only relies on what the page says: monitor mode blocks extensions that can change the configuration or run arbitrary scripts (Custom Script Extension). A first draft statement on MDE.Windows being allowed in monitor mode was removed for that reason.
- Q22-01 `azcmagent check` before connection: the page implies it (location/cloud defaults when not connected) without saying it explicitly.

## Chapter and bank issues against current Learn (nothing edited)

- **Automatic agent upgrade is preview** (meta description of "Manage Azure Connected Machine agent versions"); the chapter lists it among the upgrade methods without saying so.
- **Monitor mode**: Learn adds that the allowlist and blocklist can't be modified while in monitor mode; the chapter's "allow only monitoring and security extensions" is a paraphrase of "blocks any extensions that could change the system configuration or run arbitrary scripts".
- **Publisher names are inconsistent on Learn**: the Arc extension table gives `Microsoft.Azure.Key.Vault/KeyVaultForWindows` and `Microsoft.Compute/HybridWorkerForWindows`, while the Key Vault extension page uses `Microsoft.Azure.KeyVault` and the Hybrid Worker install and extension security pages use `Microsoft.Azure.Automation.HybridWorker`. Avoid testing these publisher strings.
- **Key Vault extension 4.0** page covers Azure VMs and scale sets only (no Arc mention) and says 4.0 doesn't install on Windows Server 2019 or earlier; the chapter row "with the server's managed identity" is an extrapolation for Arc.
- **Extension-based Hybrid Runbook Worker** supported OS list on Learn stops at Windows Server 2022 (no 2025), and requires Windows PowerShell 5.1 on the worker ("PowerShell Core isn't supported"). Mock or case questions that place a worker on Windows Server 2025 should be checked.
- **Managed identity on a Hybrid Runbook Worker**: Learn says that once the Automation account's managed identity is enabled, the VM's or Arc server's own identity can no longer be used by runbooks on the worker. The chapter's "to reach Azure, use a managed identity" could say which one.
- **Customer Managed Schedules for Arc**: the dynamic scoping page lists "Patch Orchestration must be set to Customer Managed Schedules" under prerequisites for Azure VMs and Azure Arc-enabled VMs, whereas az802-2b-um-orchestration-hotarea (and the 2b report) state it isn't required for Arc-enabled machines. Worth re-checking the scheduled-patching page before publication.
- **Windows Server Management enabled by Azure Arc**: WAC in Azure for Arc, Best Practices Assessment, Remote Support, etc. are not available at all to non-SA / non-pay-as-you-go customers (only Update Manager, Change Tracking and Inventory and machine configuration can be bought). Change Tracking and Inventory still incurs Log Analytics ingestion. Consistent with the chapter, but chapter 21 says WAC in Azure is "at no cost" without that condition.
- One-time updates: up to 20 machines per selection at scale and a maximum duration of 235 minutes (not in the chapter; not tested).
