# K-az-120-cs4 — report

Two case studies with six questions each, all `status: draft`. `CERT=az-120 npx tsx factory/validate.ts --prefix az120-cs4` gives 14 files and 0 problems.

## az120-cs4a-wideworld (Wide World Importers: distribution, RISE with SAP S/4HANA Cloud private edition, customer hub-and-spoke)

| Question | Objective | Type | Difficulty |
| --- | --- | --- | --- |
| az120-cs4a-rise-peering | 1.3.1 | single | 1 |
| az120-cs4a-identity-security | 1.3.5 | yesno_statements | 2 |
| az120-cs4a-data-integration | 1.3.4 | single | 2 |
| az120-cs4a-rise-dns | 2.2.8 | dropdown | 3 |
| az120-cs4a-expressroute | 2.2.9 | dropdown | 2 |
| az120-cs4a-latency-monitor | 4.2.4 | single | 1 |

## az120-cs4b-treyresearch (Trey Research: pharma/GxP, SAP ECC on Windows Server 2019 + SQL Server 2019, zonal HA, cross-region DR)

| Question | Objective | Type | Difficulty |
| --- | --- | --- | --- |
| az120-cs4b-migration-method | 1.1.9 | single | 2 |
| az120-cs4b-ascs-cluster | 3.1.4 | dropdown | 2 |
| az120-cs4b-sql-listener | 3.1.5 | single | 3 |
| az120-cs4b-dr-components | 3.2.1 | dragdrop | 2 |
| az120-cs4b-sql-backup | 4.2.6 | yesno_statements | 3 |
| az120-cs4b-commitments | 4.1.3 | dropdown | 2 |

## Notes and doubts

- Objective 1.3.4 (data archiving with RISE): none of the Learn RISE pages covers archiving (SAP ILM, Content Server). The question tests data integration with Azure Data Factory (self-hosted versus Azure integration runtime), which `rise-integration-services` does cover.
- Objective 1.1.8 was not used. The Learn pages use the terms "lift and shift" and "lift-shift-migrate" inconsistently: unit 4 of the "Explore migration options" module calls classical heterogeneous migration "lift and shift". The migration question therefore tests the method (homogeneous copy through an Always On replica), not the labels.
- RISE DNS: the Learn page describes subdomain delegation plus zone transfer, with an optional "private DNS forwarder". It does not use the term "conditional forwarder". Requirement 3 of the case says DC1 and DC2 must keep a copy of the records, which rules out the forwarder.
- DNN listener: the Learn page lists SQL Server 2019 CU8, 2017 CU25 and 2016 SP3 "and later". The case uses SQL Server 2019 so that it matches the page exactly.
- ASCS load-balancer values (HA ports, floating IP, 30-minute idle timeout) come from the shared-disk infrastructure page. The file-share pages link to that page for the load balancer.
- I could not find a Learn page that confirms Site Recovery support for WSFC ASCS nodes that use an Azure Files share. The DR drag-and-drop question therefore leaves ASCS/ERS out.
- I took the reference titles from the page `<title>` element with WebFetch. curl to learn.microsoft.com is blocked by the proxy.
