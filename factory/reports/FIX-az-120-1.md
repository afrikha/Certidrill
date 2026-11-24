# FIX-az-120-1 — chapters 11, 12, 13, 21 and 22 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-120 11-target-requirements 12-azure-environment 13-sap-rise 21-compute 22-networking` 0 problems; `content:validate --cert az-120` 0 problems, 0 warnings; `check-quiz az-120` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed.

## 11-target-requirements

| Finding | Learn | Change |
| --- | --- | --- |
| 2-tier row should say "non-production" | Not confirmed. planning-supported-configurations (updated 2026-06-24) says 2-tier is supported "for production and non-production cases" for SQL Server, Oracle, Db2, MaxDB and SAP ASE. The "only for non-production cases that don't require a high availability failover cluster" sentence follows the HANA paragraph and is about HA clusters. The row already says "no HA failover cluster in this layout" | None |
| Oracle RAC not on the supported-scenarios page | The chapter is right: dbms-guide-oracle says "Oracle Real Application Cluster (RAC) isn't supported on Azure because RAC requires multicast networking" | None |
| Microsoft Entra Domain Services: table "Supported", text "still in testing" | Confirmed. The page contradicts itself (see "For a human decision") | None in 11. The chapter only says Microsoft Entra ID isn't supported as the domain, which both halves agree on |
| Step 3 "For SAP HANA, memory is the leading dimension" | Not on planning-guide ("Start with the memory and CPU requirements"). Not contradicted either | None |
| Not in the report: "Premium SSD v2 and Ultra Disk can't be used with VMs in availability sets" | Partly wrong. disks-enable-ultra-ssd: "Ultra Disks don't support availability sets". use-premium-ssd-v2-with-availability-set (2026-09-22): Premium SSD v2 works with availability sets in six regions without availability zones, after the subscription is registered for the feature. The page doesn't say whether this is GA or preview | Storage bullet: Ultra Disk no; Premium SSD v2 only in a few regions without zones, after feature registration |
| FR « réseaux virtuels appairés » | Glossary: « peering » | « réseaux virtuels reliés par peering » |

## 12-azure-environment

| Finding | Learn | Change |
| --- | --- | --- |
| Microsoft Entra Domain Services "documented as still being tested" | Confirmed contradiction on planning-supported-configurations | None. Needs a human decision |
| Q9 (quiz): move rules are not in the chapter | Confirmed (management-groups/manage): write permission on the current and target parent management groups, except when either is the root; an Owner role inherited from the current management group can move only to a management group where you're Owner; a direct Owner needs Contributor on the target; up to 30 minutes for a move to appear | management-hierarchy: new bullet |
| 1.2.1 and 1.2.6 rely on deprecated CAF SAP pages | Not refetched. The chapter has no link to them | None. For a reviewer when the pages are removed |
| "Production: a custom role" | Interpretation of "partially elevated ... like partial Virtual Machine Contributor" (CAF, deprecated) | None |
| Machine configuration `auditIfNotExists`; Update Manager effects | Not confirmed: the machine configuration overview (2026-10-30) names no policy effect (only Audit / Apply and Monitor / Apply and Autocorrect modes). Not contradicted | None |
| SAP IDM successor | rise-integration-security: SAP announced IDM retirement by 2027 and recommends Microsoft Entra; Entra ID Governance "an ideal fit". migrate-from-sap-idm gives no year in its own text | None (chapter 12 and 13 match the RISE page) |
| FR « appairé au hub » (2 places) | Glossary | « relié par peering au hub », « spokes reliés par peering au hub » |

## 13-sap-rise

| Finding | Learn | Change |
| --- | --- | --- |
| Containerized Sentinel data connector agent retired | Confirmed. sentinel/sap/deployment-overview (2026-08-13): retired September 14, 2026, images removed October 14, 2026; the agentless connector uses SAP Cloud Connector and SAP Integration Suite and supports RISE. rise-integration-security (2026-03-09, older) still shows the agent but says that in RISE "SAP hosts the SAP Cloud Connector, or the customer hosts it ... if virtual network connectivity is established". The more recent Sentinel page was followed | azure-services table: row now the agentless connector (SAP Integration Suite, SAP Cloud Connector hosted by SAP or the customer), with the retirement date. identity-security: collection bullet. Key point on collectors rewritten |
| Open Hub connector and BW/4HANA | Confirmed (connector-sap-business-warehouse-open-hub: "SAP BW/4HANA isn't supported by this connector"; self-hosted IR only) | data-management table, Open Hub row |
| Purview scans of SAP ECC "use the same runtimes" | Confirmed wrong (register-scan-sapecc-source): self-hosted IR (standard or Kubernetes) only, JDK 11, SAP .NET connector, SAP JCo, at least 128 GB RAM recommended | data-management paragraph rewritten; Fabric CDC keeps "same runtimes" (rise-integration-services) |
| ILM Store "over WebDAV" | Not on sap-information-lifecycle-management (2026-03-13); unverifiable | "over WebDAV" removed (EN, FR) |
| FR « appairez », « appairé à RISE », « réseaux appairés » | Glossary | « reliez RISE par peering », « relié par peering à RISE » (2), « reliés par peering » |

## 21-compute

| Finding | Learn | Change |
| --- | --- | --- |
| ACSS deployment: versions, images, custom-image rules | Confirmed (deploy-s4hana, 2026-04-22): S/4HANA 1909, 2020, 2021, 2022 ISS 00; RHEL 8.4/8.6 for SAP Applications, SLES for SAP 15 SP3/SP4, 12 SP5 for 1909 only; custom image in the same subscription, Reader on the gallery for the managed identity, Standard security type, supported base OS | acss: Product and OS image bullets |
| ACSS registration: unsupported configurations, identity roles, databases | Confirmed (register-existing-system, 2026-11-17): HANA, Db2, SQL Server, Oracle, MaxDB, SAP ASE; not HLI, HANA scale-out, MCOS/MCOD, Java, dual stack, peered virtual networks, IPv6; identity needs the Azure Center for SAP solutions service role on the compute resource group and Reader on the virtual network resource group | acss: database list and a new paragraph |
| Ultra Disk: no availability sets; deallocation to enable | Confirmed (disks-enable-ultra-ssd, 2026-09-19). The `additionalCapabilities.ultraSSDEnabled` property name isn't on that page (not refetched elsewhere) | Bicep property table, ultraSSDEnabled row |
| `--set-access-to-individual-resources` | Confirmed (az vm aem reference, GA) | None |
| HSR pair uses the same VM size | Not confirmed on any fetched page; not contradicted | None |
| "M family ... only two of the three zones" | Learn says "some SKUs" without naming the family | None |

## 22-networking

| Finding | Learn | Change |
| --- | --- | --- |
| Azure NetApp Files reach "in the region" | Confirmed wrong (azure-netapp-files-network-topologies, 2026-05-06; the network-planning URL failed to load): Standard network features support global peering (with peering charges), Basic doesn't; from July 2026 new or modified volumes use Standard only | storage-endpoints: ANF bullet |
| NXDOMAIN / fallback rule imprecise | Confirmed (private-dns-fallback): NXDOMAIN from a Private Link zone when the private record is missing; `NxDomainRedirect` on the virtual network link; Private Link zones only. GA/preview isn't stated | name-resolution: rule rewritten |
| FastPath: hub ILBs work | Confirmed (about-fastpath, 2026-07-16): internal load balancers, Azure Firewall and DNS Private Resolver in the hub work with FastPath; Private Link over FastPath is limited GA | expressroute: first bullet completed. Private Link not added |
| PPG "needed" with the application volume group; "shared disks don't require one" | Confirmed: proximity-placement-scenarios says "might be necessary"; application-volume-group-considerations makes availability zone volume placement the default and recommended method (no PPG), PPG with a pinned availability set the alternative. Shared disks: not on the page | PPG paragraph rewritten; the shared-disk sentence removed |
| Accelerated Networking: 4 vCPU rule, confidential VMs | Consistent, per the QZ report; confidential VMs not relevant to the chapter | None |
| Not in the report: "different virtual networks: not supported unless peered" | Wrong (planning-guide): segregating the layers into different virtual networks "isn't supported"; if set up anyway they must be peered | vnet-subnets table row |
| FR « appairé(s) » (5 places) | Glossary | « relié(s) par peering », « Le peering de spokes via FastPath » |

## Mock-exam bank questions changed

- `questions/migration/az120-cs2b-identity.yaml` (1.3.5): item `sentinel` now "Microsoft Sentinel solution for SAP in Wingtip's subscription, with the agentless data connector"; explanation names the agentless connector; reference to the Sentinel deployment page added. Answer unchanged. Why: the agent retired.
- `questions/migration/az120-cs3b-rise-responsibility.yaml` (1.3.5): target `sentinel` now "Deployment and management of the Microsoft Sentinel solution for SAP" (customer); explanation: agentless connector through SAP Cloud Connector hosted by SAP in RISE (or the customer). Reference added. Answer unchanged.
- `questions/migration/az120-cs4a-identity-security.yaml` (1.3.5): s2 no longer mentions the agent ("deploys and manages the Microsoft Sentinel solution for SAP applications in one of its own subscriptions", still Yes); explanation rewritten; reference added.
- `questions/migration/az120-1a-req-eseries-log.yaml` (1.1.3): the stem now places the system in West Europe. The explanation of option b says that Premium SSD v2 with availability sets works only in a few regions without zones. Why: without a region, option b could also be correct.
- `questions/migration/az120-1a-req-nva-path.yaml` (1.1.3): explanation of option c changed from "isn't recommended" to "isn't supported" (planning-guide).

Checked and left unchanged: `az120-1c-rise-id-sentinel-connector`, `-sentinel-order`, `-sentinel-yesno`, `-soar` (the agent is only a distractor, or isn't used); the case-study texts of cs2b, cs3b and cs4a (no agent mentioned; they aren't mine anyway); the ANF and peering questions on 2.2.x (`az120-cs1a-byq-latency` already prefers zone volume placement; `az120-2b-lat-separate-vnets`, `az120-sr1-app-db-traffic-2`, `az120-sr2-app-db-traffic-3` already say "not supported even when peered"); `az120-1a-cost-peering`; the 2.1.7 ACSS questions (none relies on custom images or registration limits); the Ultra Disk and Premium SSD v2 questions (`az120-1a-req-pv2-facts`, `-req-storage-dd`, `az120-2a-bicep-hana-log-disk`); the Purview and data-gateway questions (`az120-1c-rise-data-abap-sdk`, `-svc-data-gateway`).

## Quiz files

None changed. The five quizzes agree with the corrected chapters (13 Q8 already uses BW 7.5 for Open Hub, 13 Q10 already says the agent retired, 22 Q09 matches the new NXDOMAIN wording).

## For a human decision

- **Microsoft Entra Domain Services for SAP on Windows.** planning-supported-configurations marks it "Supported" in its table but "still in testing" in its text. Chapter 12 (1.2.3, Windows guest OS row) follows the text; `az120-1a-sup-windows-ad` (1.1.2) makes Entra Domain Services the correct answer, following the table. Not changed: pick one reading and align the chapter and the question.
- **Product name.** register-existing-system (updated 2026-11-17) says "Azure Workload Center for SAP" in its body, while the overview and deployment pages (Feb. and Apr. 2026) still say "Azure Center for SAP solutions". This may be a rename in progress. The course and bank keep "Azure Center for SAP solutions". Watch it.
- **Premium SSD v2 with availability sets.** It needs feature registration (`PV2WithAVSetRegionWithoutZone`), and the page doesn't say GA or preview. The chapter states it neutrally. Decide whether to mention it at all.
- **Fallback to internet for private DNS zones**: no preview or GA label on the page (quiz 22 Q09 and the chapter rely on it).
- **HSR pair with the same VM size** (21 table, quiz 21 Q10 explanation): not found on Learn.
- CAF SAP landing-zone pages (deprecated, removal announced for 2026-10-30) still underlie 12's 1.2.1 and 1.2.6 tables.

## French terms not settled (not in the glossary)

- « connecteur de données sans agent », « agent conteneurisé » (Sentinel), « placement de volume en zone de disponibilité », « fonctionnalités réseau de base (Basic) » / « Standard », « groupe à haute disponibilité épinglé » (pinned), « double pile » (dual stack), « inscription » (ACSS registration). The first three already appear in the bank.
