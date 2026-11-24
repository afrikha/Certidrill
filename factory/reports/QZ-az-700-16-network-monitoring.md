# QZ-az-700-16-network-monitoring — notes

`content/az-700/quizzes/16-network-monitoring.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.4.1 (q1, q6), 1.4.2 (q3, q10), 1.4.3 (q4), 1.4.4 (q2, q8), 1.4.5 (q5), 1.4.6 (q7), 1.4.7 (q9). Positions 6–10: yesno, multi, dropdown, dragdrop, dropdown (CLI).

## Chapter vs current Learn (fix in the chapter, not done here)

- **DDoS custom thresholds** (section ddos-protection): "Azure DDoS Protection Overview" now says you can fine-tune detection thresholds for specific protocols with a **DDoS Protection custom policy**. The chapter only says "three auto-tuned mitigation policies". I didn't check whether custom policies are GA. The quiz doesn't use them.
- **DDoS on NAT gateway IPs**: the chapter says a public IP attached to a NAT gateway can't be protected. "What Is Azure NAT Gateway?" lists DDoS Protection for StandardV2 NAT gateway IPs as **Preview**. The statement is still right for GA features, but it could mention the preview.
- **DDoSMitigationReports**: "Tutorial: View Azure DDoS Protection logs…" says it is retiring (around mid-August 2026, full deprecation September 2026). It also says DDoSMitigationFlowLogs field names change. The chapter says "being retired", which is fine. q8 uses this.
- **Connection monitor, on-premises sources**: "Connection Monitor Overview" also requires the **Network Performance Monitoring** solution in the workspace (Connection monitor > + Enable Non-Azure). The portal installs the Azure Monitor Agent, but Arc must be enabled manually. The chapter omits this.
- **VNet flow logs precedence NIC > subnet > VNet** and **NSG flow logs retirement on 30 September 2027**: neither is on the "Virtual Network Flow Logs" page I fetched. Not verified, not used. The page does warn that NSG and VNet flow logs on the same workloads can duplicate records (q6 s3).
- **Secure score**: "Cloud Secure Score in Microsoft Defender for Cloud" says the new risk-based Cloud Secure Score is in the Defender portal. The classic score stays in the Azure portal (Recommendations > Switch to classic view), and the subscription score is a **weighted** sum across controls. The chapter only describes the classic score. q5 asks for control points, not the overall percentage, to stay unambiguous.
- **VPN troubleshoot via CLI**: the gateway and the storage account must be in the same resource group; otherwise use PowerShell or the portal ("VPN Troubleshoot Overview"). This isn't in the chapter.
- **Cloud security explorer**: with only Defender for Servers P2 you can query keys and secrets, but the full explorer needs Defender CSPM. This is a minor nuance.

## Facts checked for the quiz (pages fetched)

- q1: Arc agent + Azure Monitor Agent for on-premises sources, and the Log Analytics agent no longer supported.
- q2: DDoS Protection covers layers 3–4. For layer 7, use a WAF.
- q3: VPN troubleshoot fault types: Authentication = PSK mismatch, PeerReachability, IkePolicyMismatch, GatewayCPUUsageExceeded.
- q4: Network health search returns a resource with its associated resources (example: a public IP and its application gateway). The Traffic tab's IP search finds NSGs ("Network Insights").
- q5: per-resource points = max ÷ (healthy + unhealthy), and potential increase = per-resource × unhealthy. The max scores of the controls come from the page; "Encrypt data in transit" (4) is also mentioned there.
- q6: records carry the rule (NSG or AVNM security admin). CMK rotation stops flow logs until you disable and re-enable them. Duplicates with NSG flow logs.
- q7: paths start at external entry points. The quiz also uses the chapter's typical breaks (remove public IP, restrict NSG rule) ("Identify and remediate attack paths…").
- q8: categories DDoSProtectionNotifications (MitigationStarted/Stopped) and DDoSMitigationFlowLogs (dropped/forwarded flows), set on the public IP, in the AzureDiagnostics table ("Azure DDoS Protection monitoring data reference").
- q9: Defender CSPM needed for attack path analysis and cloud security explorer; secure score in foundational CSPM.
- q10: `az network watcher test-ip-flow`: `--direction Inbound|Outbound`, `--protocol TCP|UDP`. `*` is allowed in `--local` only for outbound and in `--remote` only for inbound ("az network watcher" CLI reference).

## Design notes

- Mock-exam decisions avoided: Network Watcher auto-enablement, flow log storage region/tier, TA interval/table, VNet flow logs vs NSG flow logs, connection troubleshoot vs monitor, packet capture prerequisites, tool matching, VPN troubleshoot scope, network insights tabs/statements/connectivity, DDoS alert rule, enable order, cross-subscription plan, tier choice, JIT plan, recommendation matching, secure score statements, subnet NSG exemptions, attack path plan/choke points/statements/internet exposure, CSE templates/DEASM/prerequisites/roles.
- q7 deliberately excludes "remove the identity's permission", which the mock question az700-1c-apa-internet-exposure uses and which the stem forbids.
- No preview feature is a correct answer.
