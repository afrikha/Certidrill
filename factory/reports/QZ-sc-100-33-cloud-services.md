# QZ-sc-100-33-cloud-services — report

Quiz: `content/sc-100/quizzes/33-cloud-services.yaml`, 10 questions (`sc100-qz-33-01` to `-10`). Check: 0 problem(s), 0 warning(s).

Objectives: 3.3.1 (Q1), 3.3.5 (Q2, Q8), 3.3.3 (Q3, Q7), 3.3.6 (Q4, Q9), 3.3.4 (Q5, Q10), 3.3.2 (Q6). Formats 6–10: dropdown, single, multi, yesno, single.

Decisions that the 39 mock-exam questions of these objectives don't use as answers: Entra SSO + Conditional Access for SaaS, node OS auto-upgrade channel, Application Gateway WAF_v2 with public + private frontends, Search Index Data Reader, internal Container Apps environment, Azure IoT Operations production hardening (own issuer, BrokerAuthorization, secret sync), Front Door **Standard** origin lockdown (service tag + X-Azure-FDID, the reverse of `sc100-3b-web-origin-lockdown`), authorized IP ranges, Contributor without data actions, guardrail blocks vs Defender alerts, gated deployment limited to AKS.

## Chapter points to correct or check (not edited)

- **Gated deployment scope** (section containers): the support matrix lists gated deployment for **AKS 1.31 or later only** (GA, Linux, commercial clouds), not EKS/GKE/Arc, and Azure Container Apps isn't supported by Defender for Containers at all. The chapter doesn't state this limit; worth one line, since "serverless containers" are in the same section.
- **Foundry roles**: Learn now lists Foundry Agent Consumer, Foundry User (formerly Azure AI User), Foundry Project Manager, Foundry Account Owner, Foundry Owner. Chapter's "Foundry User for applications" is right; Foundry Agent Consumer is the narrowest role for apps that only call agent endpoints (not in the chapter).
- **Foundry agents network injection** (section ai-services, "decided at deployment"): Learn states it must be set at Foundry account creation **for hosted agents**; for other agents it's tied to the create flow, and capability settings use a preview API (`2026-07-15-preview`). Not tested in the quiz.
- **Azure IoT Operations default issuer**: Learn labels its root CA "Not for Production"; the chapter's "your own CA for TLS certificates" matches. Learn also calls the production configuration "secure settings" (secret sync with a user-assigned managed identity, workload identity), which the chapter could name.
- **AKS node OS default channel**: Learn is inconsistent (NodeImage default since API 2023-06-01 vs. "manual selection" in the cluster-mode table). The quiz doesn't rely on the default.
- **Application Gateway v1** is retired (April 2026); the chapter only cites WAF_v2, fine.

## Unverified / judgment calls

- Q10: pipeline image scanning as the answer relies on the chapter ("scan in the pipeline", DevOps security) rather than a fetched page on Microsoft Security DevOps container scanning.
- Q3: "Front Door can't be reached over ExpressRoute private peering" is reasoned from Front Door being a global public entry point; no page states it verbatim.
- Q1: Learn's SSO page doesn't name ServiceNow or Salesforce; both are standard Entra gallery apps.
