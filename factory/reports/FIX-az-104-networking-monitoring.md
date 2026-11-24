# FIX-az-104-networking-monitoring — chapters 41, 42, 43, 51, 52

Sources: findings of `QZ-az-104-41/42/43/51/52-*.md`. Each fact was checked on learn.microsoft.com (en-us) on 2026-11-24. EN and FR were edited the same way (same sections, tables, callouts and code blocks).

Checks: `check-cert az-104 <5 chapters>` 0 problems; `content:validate --cert az-104` 0 problems, 0 warnings; `check-quiz az-104` 0 problems, 0 warnings.

## 41-virtual-networks

| Finding | Learn page | Result | Change |
| --- | --- | --- | --- |
| Standard isn't "the only current SKU" (Standard v2 exists) | Public IP addresses | Confirmed: Standard v2 is always zone-redundant and works only with the Standard v2 NAT gateway for now | Table header is now "Standard SKU". Added one sentence on Standard v2 after the Basic retirement |
| "or no zone" is wrong | Public IP addresses | Confirmed: non-zonal only in regions without availability zones | Zones row reworded: zone-redundant (regions with 3 zones) or zonal; non-zonal only in regions without zones |
| Default outbound access date | Default outbound access | Partly. The date applies to API versions released after 31 March 2026, for **new** virtual networks; the portal already defaults to private subnets; existing VNets are unchanged | Sentence reworded |
| FR « appairé(s) » | glossary (peering) | Applied | 5 occurrences become « relié(s) par peering » |
| No Exam trap callouts; routing preference limits | — | Not done | Adding material isn't a correction, and the quiz doesn't depend on it. Routing preference limits weren't verified |

## 42-secure-access

| Finding | Learn page | Result | Change |
| --- | --- | --- | --- |
| Reader on the target VM's virtual network when Bastion is in a peered VNet | Azure Bastion FAQ | Confirmed | Added to the roles sentence. Also added: Bastion works with peerings across subscriptions of one tenant, not across tenants (FAQ). Peering isn't transitive |
| SQL virtual network rules in another subscription | Virtual Network Endpoints and Rules (Azure SQL) | Confirmed: same Microsoft Entra tenant, `Microsoft.Sql` registered in both subscriptions; subnets in the server's region | The SQL bullet now covers both rules |
| On-premises forwarder targets the Private Resolver **inbound endpoint** | DNS Private Resolver overview; Resolve Azure and on-premises domains | Confirmed. The zone must also be linked to the resolver's VNet | The DNS bullet is reworded. I left out the claim that 168.63.129.16 can't be reached from on-premises because Learn doesn't state it |
| Storage portal option is **Disable**, not "Disabled" | Set the default public network access rule | Confirmed | Sentence now says "disable public network access (option **Disable** …)" |
| FR « appairé(s) » | glossary | Applied | 7 occurrences replaced |

## 43-dns-load-balancing

| Finding | Learn page | Result | Change |
| --- | --- | --- | --- |
| A backend VM reaching its own ILB frontend "can be sent back to the same machine" | Load Balancer components, Limitations | Confirmed: Learn says the flow fails, with no condition | Symptom row reworded to match Learn |
| Private Resolver inbound/outbound (shared with the 42 finding) | DNS Private Resolver overview | Confirmed | The private DNS bullet now says what each endpoint does (inbound + conditional forwarder; outbound + DNS forwarding ruleset) |
| FR « réseaux appairés » | glossary | Applied | 1 occurrence |

## 51-azure-monitor

| Finding | Learn page | Result | Change |
| --- | --- | --- | --- |
| VM insights Map / Dependency agent deprecated | View app dependencies with VM insights | Confirmed: deprecated; since 30 Sept 2025 no portal onboarding of new VMs; retire 30 June 2028 | Map removed from the VM insights row. A paragraph says it is deprecated, gives the dates and says not to choose it |
| OpenTelemetry metrics recommended for new VM insights deployments | Enable VM monitoring; VM insights overview; Metrics experience for VMs | Confirmed: default in the portal, recommended, Azure Monitor workspace, PromQL; no preview label | Sentence added; `InsightsMetrics` kept for the classic logs-based experience |
| DCR in the same region as every workspace it sends to | Collect data from VMs (data collection) | Confirmed | One sentence added to DCR step 2 |
| Log search alert dimensions (quiz q9) | Create or edit a log search alert rule | Confirmed: up to 6 dimensions (string/numeric); Azure Resource ID column; each group fires its own alert; "Automatically resolve alerts" = stateful | Bullet added in the alerts section (5.1.4) |

## 52-backup-recovery

| Finding | Learn page | Result | Change |
| --- | --- | --- | --- |
| Enhanced "required" for Trusted Launch | Back up Azure VMs with the Enhanced policy | Confirmed: Standard supports Trusted Launch only through CLI 2.73.0+, Az PowerShell 14.0.0+, REST API 2025-01-01+; Standard doesn't support Ultra / Premium SSD v2 | "Required for" cell and key point reworded. Inference: the portal still needs Enhanced, since the portal isn't in Learn's list of clients |
| Backup center → Resiliency | Backup center overview (legacy); What is Resiliency? | Confirmed: legacy, no longer in portal search; Resiliency extends Azure Business Continuity Center | Section 5.2.4 entry point and the 5.2.7 table now name Resiliency |
| Blob vaulted backup always on | Overview of Azure Blobs backup | Confirmed: vaulted is selected by default and can't be turned off; no operational-only policy | Sentence added after the Backup vault workload table |
| Default VM policy "30 days" | Back up Azure VMs in a Recovery Services vault; Quickstart (portal); VM backup FAQ | Partly confirmed. Two pages say the Standard default is daily, 30 days, instant restore 2 days. The FAQ says "7 days in snapshot and 180 days in vault" (not explained) | Sentence now says "default policy (Standard): daily, 30 days, instant restore 2 days". The FAQ contradiction is unresolved: worth checking in a portal |
| Preview backup metrics taught in 5.2.7 | Azure Backup Metrics (preview); Azure Monitor Logs in Azure Backup | Confirmed preview | Custom conditions now point to log search alerts on the workspace (`AddonAzureBackupJobs`). The metrics are only named as preview |
| (checked while editing) Security alerts include shorter-retention policy changes | Monitoring and alerts overview | Confirmed (Modify Policy with Shorter Retention). Security alerts can't be turned off; job failure alerts can | No change |

## Mock-exam bank and quizzes

- Bank: I read the questions on Bastion roles and peering, SQL endpoints, public IP SKU/zones, ILB, Private Resolver, VM insights, the Enhanced policy, blob backup tiers, Backup center/Resiliency and backup metrics. None contradicts the corrected facts: `m2-rpt-configure-reports` already uses Resiliency, and `m1-vminsights-facts` / `m1-vminsights-table` match the OpenTelemetry / classic split. **No bank question changed.**
- Quizzes 41, 42, 43, 51, 52: they still agree with the chapters (42 q10 s2 and 51 q9 now have their fact in the chapter). **No quiz changed.**

## French terms not settled (absent from the glossary or undecided)

- Syslog "facilities": the chapter and quiz 51 q7 say « facilités ». The fr-fr page *Collecter des événements Syslog* says « installations ». Not in the glossary, kept as is.
- "split by dimensions": « fractionner par dimensions » (the chapter, quiz and bank use « fractionnement / fractionnée »). Not in the glossary.
- "Azure Monitor workspace": « espace de travail Azure Monitor ». "OpenTelemetry metrics" / "logs-based metrics": « métriques OpenTelemetry » / « métriques basées sur les journaux ». Not in the glossary; same forms as the bank.
- "deprecated": « déprécié(e) » (bank uses the same). Not in the glossary.
- Private Resolver: « point de terminaison entrant / sortant », « ensemble de règles de transfert DNS », « redirecteur conditionnel » (wording from the 43 quiz writer's fr-fr fetch). Not in the glossary.
- "Resiliency": kept in English, as the bank does. The glossary still lists only "Backup center / Business Continuity Center" → « Centre de sauvegarde ».
- **Health Probe Status**: the chapter keeps the English metric name. `n3-lbt-nsg-probe` translates it « État de la sonde d'intégrité ». Needs a decision.
- "peering" phrasing: the glossary gives the noun (« peering de réseaux virtuels ») but no adjective for "peered". The chapters now use « relié(s) par peering », as the quizzes do. The bank still uses « appairé(s) » (for example `cs2-alpineski-05`, `n2-bastion-basic-features`); I didn't change it because it is terminology, not a fact.
- Typography: `content/glossary.yaml` says to use the typographic apostrophe, while BRIEF rule 5 says straight apostrophes. I used straight ones.
