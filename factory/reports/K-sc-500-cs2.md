# K-sc-500-cs2 — report

3 case studies and 17 questions, all `status: draft`. Validator: `20 files, 0 problem(s)`.

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| `sc500-cs2a-nod-publishers` | Publishing; Microsoft 365 Copilot, Copilot Studio agents, Purview DSPM, Sentinel in the Defender portal | realtime-protection (3.1.3, yesno, 2), dspm-remediation (3.1.2, dragdrop, 2), item-level-scan (3.1.1, single, 2), ownerless-agent (3.1.11, single, 1), download-hunting (4.2.10, dropdown, 2), user-consent (1.1.5, multi ×3, 3) |
| `sc500-cs2b-city-power-light` | Energy distribution; PaaS portal (Front Door, App Service, Flex Consumption Functions, Storage with Defender for Storage, Key Vault CMK) | scan-results (2.1.3, multi, 2), contractor-sas (2.1.4, dropdown, 3), host-storage (3.3.5, single, 1), front-door-origin (3.3.7, single, 1), key-rotation (1.2.5, dropdown, 2) |
| `sc500-cs2c-margies-travel` | Travel agencies; Azure IaaS + on-premises datacenter (Trusted launch, agentless scanning with CMK, WEF, Bastion, Arc, Machine Configuration) | trusted-launch (3.2.8, single, 2), scanner-key-access (1.2.3, single, 3), forwarded-events (4.2.6, yesno, 2), bastion-sku (3.2.2, dragdrop, 1), machine-config (3.2.9, single, 2), arc-at-scale (3.2.4, ordering, 1) |

Mix: single 7, dropdown 3, multi 2, yes/no 2, dragdrop 2, ordering 1. Difficulty: 5 easy, 9 medium, 3 hard. Domains: compute 9, identity 4, posture 2, data-networking 2; each case covers three domains.

## Changes of plan

The first plan (Foundry + AI gateway, AKS/ACR + Sentinel roles/automation, AWS connector + Defender for Servers + JIT + SQL auditing + Backup MUA) was dropped after reading the files of the other SC-500 case-study and series agents: `sc500-cs3a/cs4a` (token limit, APIM managed identity, prompt evidence, Foundry DNS zones, Agent ID Conditional Access), `cs3b/cs3c/cs4b/cs1a` (ACR private endpoint, AKS local accounts, CEF forwarder ×3, Sentinel roles ×3, automation rule, AWS connector, direct onboarding vs Arc, Plan 2 per-resource) and the series `sr1/sr2` (JIT, SQL server-level audit, Backup MUA, AI alerts). The final questions use objectives that no other case study used when this batch was written.

## Verification

Every reference was fetched on 2026-11-17; titles are the page H1. The shared WebFetch budget ran out once during the run; no fact was taken from an unfetched page except the points below.

## Points to review

- `sc500-cs2a-realtime-protection`: real-time protection for Copilot Studio agents is marked Preview on Learn. Facts used: the Default rule audits, blocking rules stop actions before they execute, near-real-time alerts only in audit mode, BehaviorInfo table, unsafe email domain evaluated at the tool request step.
- `sc500-cs2a-dspm-remediation` / `item-level-scan`: based on the new DSPM page "Prevent oversharing with data risk assessments" (DSPM for AI is now "classic"). Option names are the Protect/Monitor tab labels of that page.
- `sc500-cs2a-download-hunting`: the `SharePointFileOperation` RecordType and `FileDownloaded` operation come from the Learn training unit "Query Purview Audit logs in Microsoft Defender XDR"; the columns were checked on the OfficeActivity table reference. "FileAccessed = file view" in a distractor explanation is general knowledge.
- `sc500-cs2a-user-consent`: Learn gives the two consent options as policy descriptions ("Allow user consent for apps", "Allow user consent for apps from verified publishers, for selected permissions"); the portal labels were not seen.
- `sc500-cs2b-front-door-origin`: the description of the AzureFrontDoor.Frontend service tag (client-facing addresses) is general knowledge, not from a fetched page.
- `sc500-cs2b-contractor-sas`: `cw` assumes "create and write" letters for a container SAS; `--https-only` and `--policy-name` are real `az storage container generate-sas` parameters (not refetched).
- `sc500-cs2c-bastion-sku`: the Developer SKU was kept only as a distractor (its regional availability wasn't checked). "Lowest cost" relies on the usual price order Developer < Basic < Standard < Premium, which the SKU page doesn't state.
- `sc500-cs2c-machine-config`: the explanation's "remediation task for existing VMs" is standard Azure Policy behaviour for DeployIfNotExists, not stated on the prerequisites page.
- `sc500-cs2c-trusted-launch`: Learn says Trusted launch can't be enabled with a Standard backup policy; the Site Recovery distractor refers to Learn's advice for Gen1 upgrades.
