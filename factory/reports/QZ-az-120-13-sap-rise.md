# QZ-az-120-13-sap-rise — report

Quiz: `content/az-120/quizzes/13-sap-rise.yaml`, 10 questions (`az120-qz-13-01` to `-10`). `npx tsx factory/check-quiz.ts az-120 13-sap-rise`: 0 problems, 0 warnings.

Objectives: 1.3.1 (Q1, Q6), 1.3.2 (Q5, Q9), 1.3.3 (Q3, Q7), 1.3.4 (Q4, Q8), 1.3.5 (Q2, Q10). Formats in positions 6–10: yesno_statements, multi, dropdown, ordering, multi.

The mock bank already has about 50 questions on 1.3.x, so the quiz goes after angles it doesn't test: address-space overlap, Security Copilot in Defender XDR, NAT gateway for the customer's own outbound traffic, ILM as the answer to HANA growth, the optional DNS forwarder, FWaaS/subnet peering details, the support split during troubleshooting, Open Hub/ECC/table connector runtimes, a peering + DNS sequence, and LogServ + the Sentinel solution for SAP BTP.

## Out of date or wrong against current Learn (Nov. 2026)

1. **Containerized Sentinel data connector agent retired.** The Learn page "Deploy the Microsoft Sentinel solution for SAP applications" says the containerized data connector agent for SAP retired on **September 14, 2026**. It is unsupported, and its container images are removed on October 14, 2026. The agentless data connector (SAP Cloud Connector + SAP Integration Suite) is the supported path.
   - Chapter 13, section `azure-services`: the table row "Microsoft Sentinel data connector agent | Customer VM or container" should become the agentless connector (SAP Cloud Connector hosted by SAP in RISE, or by the customer when virtual network connectivity exists).
   - Chapter 13, section `identity-security`: "Collection uses a data connector agent on a VM or container in your subscription, or the agentless connector" (EN and FR), and the key point "...Sentinel collectors run on customer VMs".
   - Mock questions that use the agent as a **correct** answer or as a true statement: `az120-cs2b-identity` (item `sentinel`, "with the data connector agent in Wingtip's subscription"), `az120-cs3b-rise-responsibility` (target `sentinel`, "...and its data connector agent"), `az120-cs4a-identity-security` (s2, "deploys and manages the SAP data connector agent"). `az120-1c-rise-id-sentinel-connector` and `-sentinel-order` use the agent only as a distractor, which is fine.
2. **SAP BW Open Hub connector and BW/4HANA.** The ADF connector page says "SAP BW/4HANA isn't supported by this connector". The chapter's data-integration table lists "SAP table, SAP BW, SAP Open Hub" without that caveat. Q8 uses "SAP BW 7.5 on SAP HANA" for this reason.
3. **Purview scans of SAP ECC.** The chapter says Purview scans of SAP ECC sources "use the same runtimes", next to a table where SAP ECC supports Azure IR or self-hosted IR. Per the Purview page "Connect to and manage an SAP ECC source in Microsoft Purview", the scan needs a self-hosted IR only (standard or Kubernetes), with JDK 11, the SAP .NET connector and JCo, and at least 128 GB RAM recommended. The chapter should say so. The quiz doesn't test this.
4. **WebDAV for ILM Store.** The chapter says the ILM Store writes to Blob Storage "over WebDAV". The Learn page "SAP Information Lifecycle Management with Microsoft Azure Blob Storage" doesn't mention WebDAV, so this is unverified. The quiz doesn't rely on it.
5. **French of the chapter.** It uses "appairez", "appairé à RISE" and "réseaux appairés" (lines 33, 83, 96, 155 of `13-sap-rise.fr.md`). The writing guide asks for "peering" / "relié par peering" instead of "appairé".

## Doubts and choices

- Q5 (DNS forwarder): Learn describes it as "a private DNS forwarder within their Azure virtual networks" that pushes queries for the delegated zone to the SAP DNS servers. The quiz answer is a forwarder on the hub DNS servers (a conditional forwarder). I believe that matches the intent, but Learn doesn't name the forwarder type.
- Q6 (FWaaS): the statement "spoke traffic must go through the NVA of the peered subnet" rests on Learn's "each NVA is configured as the primary route target for all RISE communication" and "subnet peering only enables communication between the selected subnets".
- Q8: an ECC 6.0 system inside RISE/ECS is assumed. The RISE services page explicitly says the SAP ECC connector can be used with RISE/ECS through the Azure IR or a self-hosted IR.
- Q10: the BTP connector is configured per subaccount and also for the global account. Learn says that retrieving global account audits doesn't retrieve the subaccount audits.
- Learn page titles differ from their H1s ("Integrating Azure services with SAP RISE" vs "Integrate Azure services with SAP RISE"). The references use the `<title>` text, and the mock bank uses both forms.
