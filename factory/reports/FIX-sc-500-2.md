# FIX-sc-500-2 — chapters 23, 31, 32, 33 and 34 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-500 23-network-security 31-ai-data-agents 32-ai-foundry-defender 33-servers-vms 34-app-platform` 0 problems; `content:validate --cert sc-500` 0 problems, 0 warnings; `check-quiz sc-500` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The WebFetch budget (shared by all agents) ran out several times; I waited and retried. The pages that were never fetched are listed under "not confirmed".

## 23-network-security (QZ report: no error, notes)

| Finding | Learn | Change |
| --- | --- | --- |
| Security admin rule exclusions incomplete | Confirmed (concept-security-admins): Application Gateway (unless every gateway in the subnet uses network isolation), Bastion, Firewall, Route Server, VPN Gateway, Virtual WAN, ExpressRoute Gateway; other subnets still get the rules; private endpoints in a managed virtual network aren't covered | avnm-security-admin paragraph |
| Connector group load-balancing modes (Random, session persistence, Performance preview) | Not fetched | None (not wrong, not needed for the objective) |
| FR « appairés » (2 places) | Guide: « peering » | « réseaux connectés par peering » (default rule table, private endpoint trap) |

## 31-ai-data-agents

| Finding | Learn | Change |
| --- | --- | --- |
| Copilot Studio Defender onboarding retires | Confirmed (Protect AI agents in real time, updated 2026-11-23): existing onboarding retires December 23, 2026; blocking settings don't migrate; disable under Settings > Security for AI > Get started > Copilot Studio, then re-create rules under Policies & rules > Real-time protection; automatic tenant-level onboarding in public preview from November 22, 2026; afterwards, agents without an enabled blocking rule run in audit mode (alerts, no block) | New intro sentence before the 3 steps (now "the existing procedure"); Exam trap rewritten; Key point rewritten |
| Platforms covered | Confirmed: Copilot Studio (preview, tool invocations only), Foundry agents (preview), Agent 365 Tooling Servers WorkIQ and Custom MCP (GA) | Same sentence |
| Role and connector | Confirmed (Enable security for AI agents): Security Administrator or higher; connector needs at least Microsoft Entra ID Management events and Microsoft 365 activities | Fact table, two rows |
| Agent user sponsors; assigned security groups | Confirmed (agent-owners-sponsors-managers): agent user account up to 5 sponsors, any group type, not required; assigned security groups and role-assignable groups not allowed for identities and blueprints | Relationship table, Sponsor row |
| Second policy "All Service principals" | Confirmed (agent-id-governance-overview) | agent-id-access paragraph |
| Agent management rules, Sharing = No users | Confirmed (agent-settings): 5 bulk actions; No users still allows direct sharing with specific individuals; reassign rule only for Agent Builder agents | m365-admin-agents paragraph |
| DSPM for AI licence "E5 or Purview Suite, E3 doesn't qualify" | **Not confirmed**: the considerations page names only Copilot licences, the Purview enterprise data governance version and pay-as-you-go billing | Added pay-as-you-go to the Licenses row; E5/Purview Suite claim left unchanged. Flag |
| "Applies to new sessions only" | **Not confirmed** (external-security-provider page says nothing about sessions) | None. Flag |

## 32-ai-foundry-defender

| Finding | Learn | Change |
| --- | --- | --- |
| AI Gateway Foundry flow out of date | Confirmed (Configure Azure AI Gateway in your Foundry resources, updated 2026-11-17): two resource types (API Management, Azure AI Gateway); API Management configured in Azure/code, consumed in Foundry through Connections > Add connection > Model > Gateway (resource or project scope); "You can no longer create new API Management links from Foundry"; existing links keep working, token-limit settings visible but changed in policy XML; all tiers v1 and v2 can be the hub; direct backend or tool URLs bypass the gateway; management access isn't runtime access. Azure AI Gateway Foundry integration "rolling out gradually" | ai-gateway section: prerequisites table, portal steps, scope rules, "Add project to gateway" trap and Token management removed; new path table, retirement paragraph, bypass Exam trap; token-limit table now describes `llm-token-limit` (429 / 403, periods Hourly to Yearly, from llm-token-limit-policy). Key points 1-2 rewritten |
| Backend role | Confirmed (Authenticate and authorize to LLM APIs): Cognitive Services OpenAI User on the Foundry resource; `authentication-managed-identity` for `https://cognitiveservices.azure.com`; caller validation before backend auth | Bullet rewritten |
| Policy name `llm-content-safety` | Confirmed: element `<llm-content-safety>`, 403, `shield-prompt`, MCP and A2A, not in Consumption | Policy table row |
| Logging category | Confirmed (Monitor Azure API Management): "Logs related to generative AI gateway", 32 KB chunks, 2 MB max; gateway logs don't include bodies by default, 8,192 bytes per payload | Logging paragraph |
| Defender for AI services role | Confirmed (ai-onboarding): Owner or Contributor | Sentence |
| Data security for AI interactions limits | Confirmed: no Foundry agent data; data security policies need Entra ID calls with a user-context token; current Purview configuration method for Foundry being deprecated | Components table, Notes cell (deprecation not added) |
| Guardrails: egress controls, groundedness retirement, Off, output approval | Confirmed (guardrails-overview, updated 2026-11-17): egress controls for hosted agents GA except Transform rules; Groundedness in Azure OpenAI retires April 30, 2027; Off blocks nothing; turning off output content harms only for approved customers | One sentence after the risk table; actions sentence |
| Tools supporting tool-point moderation (Fabric Data Agent, Bing Custom Search) | **Not confirmed**: the overview page lists no tools | None (chapter says "such as") |
| Dashboard minimum role "Security explorer" | Not fetched | None |

## 33-servers-vms

| Finding | Learn | Change |
| --- | --- | --- |
| ADE → encryption at host: UDE flag | Confirmed (disk-encryption-migrate): UDE flag persists after decryption, kept by snapshots and Copy-based copies; Upload method with AzCopy | disk-encryption Exam trap: one sentence |
| Trusted launch default for templates | Confirmed (trusted-launch): portal/CLI/PowerShell by default; ARM/Bicep/Terraform with `TrustedLaunchByDefaultPreview` registered, or API 2025-11-01+ with compatible image, disk and size | vm-security-type bullet |
| Integrity monitoring: CLI flag, AzureAttestation | Confirmed: outbound to `AzureAttestation` (boot-integrity-monitoring-overview); portal Configuration > Security type > Integrity monitoring installs the extension; `--enable-integrity-monitoring` exists in `az vm create` (description not readable: page truncated, so the system-assigned identity is not stated) | Integrity monitoring bullet |
| Agentless scanning plans | Contradiction confirmed: concept-agentless-data-collection says Defender CSPM or Plan 2 (malware Plan 2 only); auto-deploy-vulnerability-assessment says "Agentless scanning is available in Defender for Servers Plan 2 only" | None (chapter follows the specific agentless page). Flag |
| FR « appairés » | Guide | « réseaux virtuels connectés par peering » |

## 34-app-platform

| Finding | Learn | Change |
| --- | --- | --- |
| `rate-limit` in Consumption | Confirmed: `rate-limit` all tiers; `rate-limit-by-key` Developer to Premium v2, not Consumption | APIM table row |
| Quota tiers (not checked by QZ) | `quota`: all tiers, product scope only; `quota-by-key` APPLIES TO lists only Developer, Basic, Standard, Premium (but Gateways include "v2") | APIM table row. Flag the v2 inconsistency |
| No upgrade from/to Consumption | Confirmed (upgrade-and-scale) | Sentence after the policy example |
| ACR ABAC: legacy roles and 401 | Confirmed: AcrPull/AcrPush/AcrDelete not honored; credentials issued before the switch get 401 until refreshed; AcrPull = Repository Reader + Catalog Lister | acr-security paragraph |
| Repository roles recommended | Confirmed (roles overview): Repository Reader for orchestrators, Writer for CI/CD, Contributor to delete; the page doesn't mention AcrPull/AcrPush/AcrDelete | One sentence. AcrPull kept elsewhere (Container Apps row, key point). Flag |
| Front Door (classic) retires March 31, 2027 | Not fetched | None (chapter only uses Standard/Premium) |

## Mock-exam bank questions changed

All five were built on the removed Foundry-portal API Management link (Manage > AI Gateway > Add AI Gateway, Create new = Basic v2, Use existing list, Add project to gateway, Token management). Rewritten on GA facts, same id, type, objective and difficulty, `status: draft`:

- `sc500-3a-gw-create-new` (single, 1): an existing API Management instance → add a Model connection with the Gateway source. The legacy Add AI Gateway path is now a distractor.
- `sc500-3a-gw-existing-instance` (single, 2): workload table → the agent whose MCP tool uses the direct backend URL bypasses the gateway.
- `sc500-3a-gw-existing-project` (single, 2): project-scope connection → create it at the resource scope (minimize effort).
- `sc500-3a-gw-limit-responses` (dropdown, 1): enforce with `llm-token-limit` keyed on the subscription; 429 / 403 kept. Reference "Enforce token limits for models" (not fetched) replaced by the llm-token-limit page.
- `sc500-3a-gw-private-foundry` (multi, 3): `llm-content-safety` with `shield-prompt` + "Logs related to generative AI gateway" with message logging (gateway log bodies capped at 8,192 bytes). The old answer (private APIM tiers for a private Foundry resource) came only from the legacy page.

## Checked and left unchanged

- 3.1.7: `sc500-cs1c-token-limit`, `sc500-cs3a-token-limit` (llm-token-limit attributes and codes match the policy page); `sc500-cs1c-gateway-identity`, `sc500-cs3a-apim-identity` (1.1.6, already Cognitive Services OpenAI User).
- 3.1.3: `sc500-3a-rtp-defender-rules`, `sc500-cs2a-realtime-protection` (audit vs block rules, alerts in audit mode, unsafe email domain at tool request: match the updated page); `sc500-3a-rtp-classic-agent`, `-new-environment`, `-provider-order`, `-entra-app` (custom provider in Power Platform, not the retiring Defender onboarding; match external-security-provider). No bank question uses the retiring Defender + App ID flow.
- 3.1.6 / 3.1.11: `sc500-3a-aid-sponsor-group` (group types match), `sc500-3a-aid-access-package`, `sc500-3b-m365-*`, `sc500-cs2a-ownerless-agent`.
- 3.1.8: `sc500-3a-d4ai-enable` (Owner or Contributor), `sc500-sr2-ai-alerts-3` ("Owner is enough", still true).
- 2.3.2: `sc500-2b-avnm-deploy-statements` (exclusion list matches Learn).
- 3.2.1: `sc500-3b-enc-*`, `sc500-sr2-host-encryption-*` (none relies on snapshot-based migration).
- 3.3.3 / 3.3.9: `sc500-3c-acr-abac-roles`, `sc500-3c-apim-anon-throttle`, `sc500-cs1b-apim-orders` (no quota-by-key on a v2 tier).

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 32 q4 and the chapter now both use `llm-content-safety`.

## For a human decision

- Objective 3.1.3 depends on preview features (Copilot Studio support is preview), and the documented Defender + Power Platform onboarding retires on December 23, 2026. The chapter keeps the 3 steps, labeled as the existing procedure that is retiring. After that date, remove them.
- Objective 3.1.7 still says "AI Gateway in Azure API Management for Microsoft Foundry". Learn now separates API Management from a new Azure AI Gateway product, whose Foundry integration is still rolling out. The chapter teaches API Management as the main path.
- DSPM for AI licence (E5 / Purview Suite, E3 not enough) and "applies to new sessions only" (Copilot Studio): not on any fetched Learn page. Keep or remove?
- Agentless scanning: Defender CSPM or Plan 2 (agentless page) vs Plan 2 only (vulnerability scanning page).
- `quota-by-key`: APPLIES TO lists classic tiers only, while Gateways includes v2.
- ACR: Learn's roles overview now presents the Repository roles as the data plane roles. Should the course and bank move from AcrPull to Container Registry Repository Reader?

## French terms not settled

- « Gestion des API Azure » (bank stems, kept in the rewritten questions) vs « Azure API Management » (chapters): not in the glossary.
- « passerelle IA », « connexion à l'étendue de la ressource / du projet », « modèle connecté », « point de terminaison d'exécution », « contrôles de sortie réseau », « isolement réseau » (Application Gateway network isolation), « indicateur UDE », « facturation à l'utilisation » (pay-as-you-go): not in the glossary.
- « groupes ... à appartenance affectée »: built from the glossary term « Affecté » (assigned membership type).
- Out of scope, not changed: `sc500-3c-acr-abac-roles` FR uses « dépôt » (glossary « référentiel »).
