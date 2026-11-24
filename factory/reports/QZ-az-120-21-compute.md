# QZ-az-120-21-compute — report

Quiz: `content/az-120/quizzes/21-compute.yaml`, 10 questions (`az120-qz-21-01` to `-10`). `npx tsx factory/check-quiz.ts az-120 21-compute`: 0 problems, 0 warnings.

Objectives: 2.1.1 (Q2, Q10), 2.1.2 (Q3, Q6), 2.1.3 (Q1), 2.1.4 (Q4, Q7), 2.1.5 (Q5), 2.1.6 (Q8), 2.1.7 (Q9). Formats in positions 6–10: yesno_statements, single, multi, dragdrop, single.

The mock bank has about 44 questions on 2.1.x, so the quiz goes after decisions it doesn't test:

- RHEL BYOS images not supported in CSP subscriptions
- scaling the application tier out
- SAP Support as the support channel for the extension
- cross-subscription use of gallery images through RBAC (no replication to another subscription)
- `zones` and `availabilitySet` being mutually exclusive in Bicep
- standard-version reconfiguration, new version required on SLES 15, and the Owner requirement
- generalizing a copy made from a snapshot, with drives decrypted, so the source VM stays usable
- SDAF credential and key vault separation per workload zone
- ACSS vs SDAF vs Bicep, including ACSS registration of a Windows/SQL Server system
- choosing zones when a VM size is offered in two zones only

## Facts taken from the chapter and not confirmed on a fetched Learn page

- Q10, explanation of option c: "a HANA System Replication pair with automatic failover uses the same VM size". This comes from the chapter's table. The pages I fetched ("SAP workload configurations with Azure Availability Zones", "Plan and implement an SAP deployment on Azure") don't state it. The option is also wrong for a reason that doesn't depend on that rule: the secondary has to hold the same in-memory production database on a size certified for production HANA.
- The chapter says "M family sizes ... some are available in only two of the three availability zones". Learn ("SAP workload configurations with Azure Availability Zones") says "some SKUs are available in only two of the three zones" without naming the M family. Q10 states the two-zone finding as a fact of the scenario, so it doesn't depend on the family.

## Chapter points to tighten (not errors)

- 2.1.7: "Deploy an S/4HANA infrastructure" lists the exact supported versions (S/4HANA 1909 to 2022) and images (RHEL 8.4/8.6 for SAP Applications; SLES for SAP 15 SP3/SP4, and 12 SP5 for 1909 only). It also lists custom-image constraints: the image must be in the **same subscription** as the deployment, the managed identity needs **Reader** on the gallery, and the image must use the **Standard** security type. The chapter only says "or a custom image from Azure Compute Gallery".
- 2.1.7: the registration page ("Register an existing SAP system") lists what isn't supported: HANA scale-out, MCOS/MCOD, Java and dual stack, systems spread across peered virtual networks, and IPv6. It also lists different identity roles from deployment: Azure Center for SAP solutions service role on the compute resource group, plus Reader on the virtual network resource group. The chapter's "any supported database" is close: Learn lists HANA, Db2, SQL Server, Oracle, MaxDB and SAP ASE.
- 2.1.5 (unused by the quiz): "Configure Ultra Disks for Azure virtual machines" says Ultra Disks don't support availability sets, and enabling compatibility on an existing VM needs the VM deallocated. Both are worth a line next to `ultraSSDEnabled`. I couldn't fetch the property description of `additionalCapabilities.ultraSSDEnabled`: the template reference page is too large to read past its first part.
- 2.1.2: `--set-access-to-individual-resources` (chapter, and mock `az120-2a-ext-aem-cli`) isn't on the "New version of Azure VM extension for SAP solutions" page. It belongs to the `az vm aem` CLI reference, which I didn't fetch.

## Doubts

- Q1: the claim that Red Hat Cloud Access doesn't lift the CSP restriction follows from Learn's "BYOS images are based on private plans and currently not supported in CSP subscriptions". Learn doesn't mention Cloud Access in that note.
- Q8: "one control plane serves all three workload zones" relies on the chapter, on mock `az120-2a-sdaf-topology` (s1 = Yes) and on Learn's description of the control plane as "typically a regional resource". The deciding facts, a dedicated deployment credential per workload zone and the workload zone key vault for system credentials, are verbatim on "About SAP Deployment Automation Framework".
