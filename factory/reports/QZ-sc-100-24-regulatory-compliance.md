# QZ-sc-100-24-regulatory-compliance — report

File: `content/sc-100/quizzes/24-regulatory-compliance.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).

Coverage: 2.4.1 (q1, q4, q6), 2.4.2 (q2, q10), 2.4.3 (q3, q7, q8), 2.4.4 (q5, q9). Hard formats: single (q6, q7, q10), multi (q8), yesno_statements (q9).
Decisions chosen to avoid the 24 mock-exam questions of these objectives: EU Data Boundary, Compliance Manager shared controls, initiative vs separate assignments, Audit (Premium) retention, Deny vs Enforce on a recommendation, Customer Key vs DKE, Azure Policy for Kubernetes on AKS + Arc, Modify + remediation task, GCP defaults/DORA/EU AI Act/portal split, Compliance Manager + Defender for Cloud integration.

## Chapter out of date or imprecise against current Learn

1. **Purview Data Map and Unified Catalog (2.4.2 table, last row).** "Data sources that connect to Microsoft Purview Data Map" (fetched Nov 2026) says the Unified Catalog and the classic data governance capabilities (formerly Azure Purview) are being retired, governance is consolidated into Microsoft Fabric, new Purview data governance accounts can't be created, and existing ones stay in maintenance mode until November 12, 2027. The chapter still recommends them for inventorying data in Azure, AWS and on-premises databases. Not used in the quiz. The same issue affects mock-exam questions whose correct answer is the Data Map: `sc100-4b-discovery-tools` (slot `datamap`) and `sc100-cs4b-data-discovery` (option c); they also appear as distractors in `sc100-4b-cspm-data`, `sc100-4c-multicloud-data-risk`, `sc100-4b-sql-classification`, `sc100-1a-critical-asset-discovery`. To review against https://aka.ms/DG-Deprecation.
2. **Compliance Manager and other clouds (2.4.2).** The chapter says Compliance Manager "can assess other clouds through connectors". Learn ("Multicloud support in Microsoft Purview Compliance Manager") says Azure, AWS and GCP are assessed **through the integration with Defender for Cloud, not through connectors**; connectors are for non-Microsoft services such as Salesforce and Zoom. Suggest rewording. Q10 follows Learn.
3. **Compliance Manager control types.** The chapter mentions Microsoft-managed actions and "your own"; Learn lists three control types (Microsoft managed, customer managed, shared). Q2 tests the shared type; consider adding it to the chapter table.

## Facts verified (pages fetched)

- Defender for Cloud standards per cloud, defaults (GCP: MCSB + GCP Default), DORA and EU AI Act for Azure/AWS/GCP, configuration in the Azure portal vs read-only monitoring in the Defender portal (concept-regulatory-compliance-standards, update-regulatory-compliance-packages).
- Deny vs Enforce (DeployIfNotExists) on recommendations, Azure only (prevent-misconfigurations).
- Remediation only for deployIfNotExists and modify, with the assignment's managed identity; enforcementMode DoNotEnforce (remediate-resources, assignment-structure).
- Azure Policy for Kubernetes: AKS add-on, Arc extension, Gatekeeper installed outside the add-on not supported; Defender for Containers gated deployment = vulnerability policy (policy-for-kubernetes, defender-for-containers-introduction).
- Audit (Standard) 180 days, Audit (Premium) 1 year for Exchange/SharePoint/OneDrive/Entra, retention policies (audit-solutions-overview).
- Customer Key workloads including Copilot interactions, revocation and purge, authorization for search/eDiscovery; DKE breaks search, eDiscovery and Copilot (customer-key-overview, double-key-encryption).
- EU Data Boundary scope for Microsoft 365 (EU sign-up location, no Multi-Geo) and Azure regional services (eu-data-boundary-learn).

## Doubts and terminology

- q10: the explanation states that Compliance Manager pulls automated results "when the selected subscriptions are in scope of the same regulation in Defender for Cloud" (Learn wording). Learn doesn't say which Defender plan Compliance Manager requires; the scenario has Defender CSPM, so it isn't decisive.
- French: chapter 24 FR writes « Defender pour le cloud » while chapter 31 FR writes « Defender for Cloud »; the quiz follows chapter 24. "Secure Score" is still `undecided` in `content/glossary.yaml`; the quiz uses « Niveau de sécurité Microsoft » as the chapter does. DKE written « chiffrement à double clé (DKE) » (Learn FR form, not in the glossary).
