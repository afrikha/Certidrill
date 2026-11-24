# QZ-az-305-23-data-integration — report

File: `content/az-305/quizzes/23-data-integration.yaml`, 10 questions (2.3.1 ×6, 2.3.2 ×4). `npx tsx factory/check-quiz.ts az-305 23-data-integration` → 0 problem(s), 0 warning(s).

Formats in positions 6–10: dropdown ×2, yesno_statements, single ×2.

## Chapter out of date against current Learn (Nov. 2026)

- **Synapse "Data Explorer pool (preview)"** in the table of section analytics-platforms (EN and FR): *Azure Synapse Data Explorer (Preview)* was **retired on 7 October 2025** (notice on the Learn overview page: workloads deleted, migrate to Eventhouse in Microsoft Fabric). Remove the row or mark it retired. Azure Data Explorer (standalone) is unaffected.
- **Fabric Data Factory "recommended to teams that start a new integration project"**: Learn says "Data Factory in Microsoft Fabric is the next generation of Azure Data Factory" and, on the ADF introduction, "If you're new to data integration, start with Fabric Data Factory". It doesn't recommend it for every new project. Small wording nuance; no quiz question depends on it.
- The Stream Analytics output list in the chapter is incomplete (Learn also lists Azure Data Explorer, Azure Functions, Service Bus, PostgreSQL, Table storage, Kafka in preview). Not wrong, just partial.

## Unverified or inferred

- "Microsoft no longer supports Azure Synapse Link for Cosmos DB for new projects" (chapter): not re-checked in this task; no quiz question uses it.
- q8 s1: Learn doesn't explicitly say that the serverless SQL pool keeps working while a dedicated pool is paused. This follows from the serverless pool being a separate endpoint of every workspace.
- q8 s2: Learn says pausing cancels running queries, detaches storage from compute and "your data becomes available" after resume. It doesn't literally say "can't be queried while paused".
- q7: the effort of a managed private endpoint to SQL Server on a VM is taken from the Learn tutorial (Private Link service + Standard load balancer + forwarding VMs with iptables). The self-hosted IR runs on Windows only, which is why the stem gives a Windows vm-tools.

## Overlap with the mock exam

The bank has 24 questions on 2.3.x and covers most single decisions (SHIR on-premises, SHIR nodes, Azure-SSIS, managed VNet, mapping data flows for analysts, ELT into the lake, HNS + lifecycle, Fabric shortcuts/mirroring, ADX, serverless ad hoc, dedicated pause/scale, ASA on IoT Edge, data paths, IoT Hub/ASA/SQL, Event Hubs/ASA/ADX). New angles: the dataset component, Functions for stateless per-event code, the Databricks Notebook activity for existing notebooks, ELT facts, Structured Streaming for ML on the stream, services per hot/warm/cold path, SHIR for SQL Server on a VM in a private VNet, serverless vs paused dedicated pool, ETL forced by a masking rule (data flows for a reason other than no-code), Synapse pipelines lacking Azure-SSIS.
