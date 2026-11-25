The compute layer of an SAP landscape on Azure is decided by certification first and by sizing second: a virtual machine that SAP doesn't list for the workload isn't supported, however powerful it is. This chapter covers how to pick the VM, the Azure Extension for SAP that every SAP VM needs, the operating system images, custom images, and the three automation options the exam compares: Bicep or ARM templates, SAP Deployment Automation Framework and Azure Center for SAP solutions.

<!-- section: certified-vms | objectives: 2.1.1 -->
## Choosing an SAP-certified virtual machine

Two SAP sources decide what is supported:

| Workload | Where certified VM types are listed |
| --- | --- |
| SAP NetWeaver and S/4HANA application servers, central services, and every database except HANA (SQL Server, Oracle, Db2, SAP ASE, MaxDB) | SAP Note 1928533, with the SAPS value of each VM type |
| SAP HANA in production | SAP HANA hardware directory, "Certified IaaS platforms" section |
| SAP HANA outside production | VM types listed in SAP Note 1928533 |

SAPS (SAP Application Performance Standard) is the benchmark unit for CPU capacity. Certified VM types don't over-provision CPU or memory. Size in this order:

1. **The database VM first**, because the database layer doesn't scale out in most SAP systems. For HANA, memory decides: the VM must hold the database in memory, and production sizes must appear in the HANA directory (scale-up or scale-out, OLTP or OLAP).
2. **The application tier by SAPS**: add application servers rather than growing one VM, with at least two for redundancy.
3. **Check the other limits** of the candidate size: storage IOPS and throughput, number of data disks, network bandwidth, supported storage types, region and zone availability.

| Requirement | Typical answer |
| --- | --- |
| Application servers, ASCS/SCS, web dispatcher | General purpose (D family) or memory-optimized (E family) sizes listed in SAP Note 1928533 |
| HANA up to a few hundred GiB of memory | HANA-certified E family sizes |
| Large HANA (multi-terabyte memory) | M family: M, Msv2/Mdsv2, Msv3/Mdsv3, Mbsv3/Mbdsv3 (higher storage throughput), Mv3 high memory and very high memory |
| Premium SSD v1 for `/hana/log` | An M family size, because Write Accelerator exists only there |
| HANA System Replication pair with automatic failover | The same VM size on primary and secondary |

Other facts the exam uses:

- M family sizes are deployed in a subset of regions, and some sizes are available in only two of the three availability zones of a region: check before you design a zonal layout.
- Use **generation 2** VMs for all SAP deployments; a deployed VM can't be converted from generation 1 to generation 2.
- VM families don't always run on the same host hardware: an Edsv5 VM and an M family VM placed in one availability set can fail to allocate.

> **Exam trap.** A VM size listed in SAP Note 1928533 isn't automatically supported for production HANA. Production HANA requires an entry in the SAP HANA hardware directory; Note 1928533 covers HANA only for non-production.

> **Exam trap.** An E family VM can run certified HANA, but not with Premium SSD v1 for `/hana/log`: without Write Accelerator the log latency KPI isn't met. Use Premium SSD v2, Ultra Disk or Azure NetApp Files for the log.

<!-- section: vm-extension | objectives: 2.1.2 -->
## Azure VM extension for SAP solutions

SAP supports a system on Azure only if the **Azure Extension for SAP** (called "Enhanced Monitoring" in older SAP notes) is installed on every VM that runs an SAP component. It feeds Azure infrastructure data (VM size, disks, network) to the SAP Host Agent, which SAP Support reads. Support for the extension goes through SAP support channels.

| | Standard version | New version |
| --- | --- | --- |
| Status | Current default | Recommended in specific cases; planned to become the default |
| Data source | Local configuration and Azure Diagnostics | Azure Resource Manager, through `management.azure.com` |
| Identity | None | VM managed identity with **Reader** on the resource group or on the individual NICs, OS disk and data disks |
| Reconfiguration | Run `Set-AzVMAEMExtension` again after changing the VM size, data disks or NICs | |
| Required when | | Installed with ARM templates, Terraform or other tools than Azure CLI or PowerShell; SLES 15 or later; RHEL 8.1 or later; Oracle Linux 8.1 or later; Ultra Disk or Standard managed disks; asked by Microsoft or SAP Support |

```powershell
# Standard version
Set-AzVMAEMExtension -ResourceGroupName RG-SAP-PRD -VMName sapprdapp01
# New version (uninstall the standard version first)
Set-AzVMAEMExtension -ResourceGroupName RG-SAP-PRD -VMName sapprdapp01 -InstallNewExtension
Test-AzVMAEMExtension -ResourceGroupName RG-SAP-PRD -VMName sapprdapp01
```

```bash
# The aem extension of Azure CLI installs itself on first use
az vm aem set --resource-group RG-SAP-PRD --name sapprdapp01 --install-new-extension
az vm aem verify --resource-group RG-SAP-PRD --name sapprdapp01
```

Rules to remember:

- Installing both versions on one VM isn't supported: remove the installed version before switching.
- The new version needs SAP Host Agent 7.21 PL 47 or later and outbound access to `management.azure.com` (directly or through a proxy: `-ProxyURI` or `--proxy-uri`). Restart the SAP Host Agent after installation.
- With `--set-access-to-individual-resources`, the VM identity gets Reader on the disks and NICs instead of the whole resource group.
- Installing the new version with PowerShell requires Owner on the resource group or on the individual resources.
- Health check: `Test-AzVMAEMExtension` or `az vm aem verify` must report OK for every check. On the VM, the new version publishes its data at `http://127.0.0.1:11812/azure4sap/metrics`, where "Provider Health Description" must be OK.

> **Exam trap.** The extension exists for SAP support, not for your monitoring: to monitor SAP workloads, the answer is Azure Monitor for SAP solutions.

<!-- section: marketplace-images | objectives: 2.1.3 -->
## Deploying the operating system from an Azure Marketplace image

Azure Marketplace provides SAP-specific Linux images, which include the SAP tuning packages and repositories:

| Image | Content |
| --- | --- |
| SUSE Linux Enterprise Server for SAP Applications | SLES with the SAP and high availability extensions (Pacemaker, SAPHanaSR, saptune) |
| `RHEL-SAP-APPS` (RHEL for SAP Applications) | RHEL with the SAP application repositories |
| `RHEL-SAP-HA` (RHEL for SAP with High Availability and Update Services) | Adds the High Availability repositories (Pacemaker) and E4S update repositories |
| Windows Server Datacenter | For SAP on Windows with SQL Server, Oracle or Db2 |

Billing models:

- **Pay-as-you-go (PAYG)**: the OS subscription is billed with the VM. PAYG SAP images add the SAP premium, and `RHEL-SAP-HA` adds the high availability premium.
- **Bring your own subscription (BYOS)**: you use an existing SUSE or Red Hat subscription. RHEL BYOS images use private plans and aren't available in CSP subscriptions. Azure Hybrid Benefit can switch a RHEL VM between PAYG and BYOS billing.

```bash
az vm image list --publisher RedHat --offer RHEL-SAP-HA --all --output table
```

The Azure VM Agent is installed by default with a Marketplace image. After deployment: configure the proxy if needed, join the domain (Windows), configure the Azure Extension for SAP, then install the SAP software. Check that the OS release is supported in SAP Note 1928533 or, for HANA, in the HANA hardware directory entry of the VM size.

> **Exam tip.** A Pacemaker cluster on RHEL needs the High Availability repositories: choose `RHEL-SAP-HA`, not `RHEL-SAP-APPS`.

<!-- section: custom-images | objectives: 2.1.4 -->
## Creating and deploying a custom image

Store custom images (hardened OS, agents, settings) in **Azure Compute Gallery**:

| Gallery object | Role |
| --- | --- |
| Gallery | Repository shared through Azure RBAC (or direct and community sharing) |
| Image definition | Publisher, offer and SKU (unique combination), OS type, OS state (generalized or specialized), Hyper-V generation |
| Image version | `Major.Minor.Patch`, replicated to target regions with a replica count per region; `latest` selects the highest version |

A **generalized** image has machine-specific data removed and can create many VMs; a **specialized** image keeps the computer name and accounts. To generalize:

```bash
# Linux, inside the VM (+user also removes the last provisioned account)
sudo waagent -deprovision+user
# Then, from a workstation
az vm deallocate --resource-group RG-IMG --name sapimg01
az vm generalize --resource-group RG-IMG --name sapimg01
```

```powershell
# Windows: run %windir%\system32\sysprep\sysprep.exe /generalize /shutdown, then
Set-AzVm -ResourceGroupName RG-IMG -Name sapimg01 -Generalized
```

Once a VM is marked generalized, it can't be restarted: snapshot the OS disk first if the source must keep working. Disable disk encryption before running Sysprep. Gallery image versions can't be replicated to another subscription; grant access with RBAC instead.

| Scenario | Approach |
| --- | --- |
| Standard OS from SUSE, Red Hat or Microsoft | Marketplace image |
| Company-hardened OS for many SAP VMs | Generalized image version in Azure Compute Gallery |
| Move one existing on-premises SAP system, keeping host name and SID | Upload the non-generalized VHDs as managed disks and create the VM from the OS disk |

For a custom Linux image, the Linux VM Agent must already be installed in the image. When you create a VM from an uploaded non-generalized disk, the VM Agent isn't installed automatically: install it yourself (`sudo zypper install WALinuxAgent` on SLES), then configure the Azure Extension for SAP. Azure Center for SAP solutions also accepts custom images from Azure Compute Gallery.

> **Exam trap.** Generalizing destroys the identity of the source VM. If the requirement is to keep the host name and SAP SID of a migrated server, don't generalize: deploy from the uploaded disk.

<!-- section: iac-bicep-arm | objectives: 2.1.5 -->
## Automating deployment with Bicep and ARM templates

Bicep compiles to ARM JSON (`az bicep build`); both are declarative. A fragment for a zonal HANA VM:

```bicep
resource hanaVm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: 'hdbprd01'
  location: location
  zones: [ '1' ]
  properties: {
    hardwareProfile: { vmSize: 'Standard_M64ms' }
    storageProfile: {
      imageReference: { id: galleryImageVersionId }
      osDisk: { createOption: 'FromImage', caching: 'ReadWrite', managedDisk: { storageAccountType: 'Premium_LRS' } }
      dataDisks: [
        { lun: 0, createOption: 'Empty', diskSizeGB: 512, caching: 'ReadOnly', managedDisk: { storageAccountType: 'Premium_LRS' } }
        { lun: 1, createOption: 'Empty', diskSizeGB: 256, caching: 'None', writeAcceleratorEnabled: true, managedDisk: { storageAccountType: 'Premium_LRS' } }
      ]
    }
    networkProfile: { networkInterfaces: [ { id: hanaNic.id } ] }
  }
}
```

```bash
az deployment group what-if --resource-group RG-SAP-PRD --template-file main.bicep --parameters @prd.parameters.json
az deployment group create --resource-group RG-SAP-PRD --template-file main.bicep --parameters @prd.parameters.json
```

| Property | Use for SAP |
| --- | --- |
| `zones` | Zonal deployment; can't be combined with `availabilitySet` |
| `availabilitySet` / `proximityPlacementGroup` | Placement at creation time |
| `imageReference` | Marketplace image (publisher, offer, SKU, version) or `id` of a gallery image version |
| `caching`, `writeAcceleratorEnabled` | Per-disk settings (see the storage chapter) |
| `storageAccountType` | `Premium_LRS`, `PremiumV2_LRS`, `UltraSSD_LRS` |
| `additionalCapabilities.ultraSSDEnabled` | Must be `true` to attach Ultra Disks; enabling it on an existing VM needs the VM deallocated, and Ultra Disks don't support availability sets |
| NIC `enableAcceleratedNetworking` | Set on the network interface, not on the VM |

> **Exam tip.** Bicep and ARM templates deploy infrastructure only. Installing SAP software needs another layer: Ansible in SAP Deployment Automation Framework, or the installation step of Azure Center for SAP solutions.

<!-- section: sdaf | objectives: 2.1.6 -->
## SAP Deployment Automation Framework

SAP Deployment Automation Framework (SDAF) is an **open-source** orchestration tool (GitHub repository `Azure/sap-automation`) that uses **Terraform** to deploy the infrastructure and **Ansible** to configure the OS and install SAP (HANA and NetWeaver with AnyDB) on any SAP-supported OS, in any region.

| Component | Content | Typical location |
| --- | --- | --- |
| Control plane: deployer | VM(s) running Terraform and acting as Ansible controller | Hub subscription |
| Control plane: SAP library | Storage for Terraform state files and downloaded SAP media; Key Vault for deployment credentials | Hub subscription |
| Workload zone | Virtual network, subnets, NSGs, Key Vault for system credentials, storage for boot diagnostics and cloud witness, optional Azure NetApp Files, Azure Files NFS and Azure Monitor for SAP solutions | Spoke subscription, one per environment (DEV, QA, PRD) |
| System | One SAP SID in its own resource group: database VMs and Standard load balancer, central services VMs and load balancer, application servers, web dispatchers | Workload zone |

Deployment order: control plane (`deploy_controlplane.sh`), workload zone (`install_workloadzone.sh`), SAP system (`installer.sh --type sap_system`), then the Ansible playbooks. Each step reads a `.tfvars` parameter file.

```bash
${SAP_AUTOMATION_REPO_PATH}/deploy/scripts/installer.sh \
    --parameterfile DEV-WEEU-SAP01-X01.tfvars \
    --type sap_system --auto-approve
```

- Credentials: a managed identity (recommended) or a service principal, typically with Contributor on the target subscription, and a dedicated credential per workload zone.
- Software acquisition: an Ansible playbook reads an SAP application manifest (YAML bill of materials) and downloads the media with an SAP user account into the SAP library.
- Architectures: standalone (one VM), distributed, and distributed highly available (Pacemaker for database and central services).
- It runs from the deployer or through Azure DevOps pipelines.

<!-- section: acss | objectives: 2.1.7 -->
## Azure Center for SAP solutions

Azure Center for SAP solutions (ACSS) is a managed Azure service that makes SAP a top-level workload. Every system it deploys or registers is represented by a **Virtual Instance for SAP solutions (VIS)** named after the SID, with child resources for the central services instance, the database instance and the application server instances.

Deploying a new system is a guided portal experience, in two stages: infrastructure first, then SAP software installation.

| Prerequisite | Detail |
| --- | --- |
| Resource provider | `Microsoft.Workloads` registered on the subscription |
| User | Contributor on the subscriptions and resource groups used |
| User-assigned managed identity | Contributor on the subscription (or on the compute, network and storage resource groups); Storage Blob Data Reader and Reader and Data Access on the storage account that holds the SAP media |
| Network | Existing virtual network in the target region, application and database subnets that can communicate, outbound connectivity (internet, or the SUSE/Red Hat endpoints and the Storage, AzureKeyVault, AzureActiveDirectory and AzureResourceManager service tags) |
| Quota | Enough vCPU quota for the recommended VM sizes |

Deployment choices:

- **Deployment type**: single server (non-production only), distributed, or distributed with high availability (recommended for production; availability zones for the 99.99% SLA option, availability sets for 99.95%).
- **Product**: S/4HANA on HANA scale-up, versions 1909, 2020, 2021 and 2022 (ISS 00).
- **OS image**: RHEL 8.4 or 8.6 for SAP Applications, or SLES for SAP Applications 15 SP3 or SP4 (12 SP5 for S/4HANA 1909 only), from the Marketplace; or a custom image from Azure Compute Gallery, in the same subscription as the deployment, with the **Standard** security type and a supported base OS, the user-assigned managed identity having **Reader** on the gallery.
- **Sizing**: enter the SAPS for the application tier and the database memory, and ACSS recommends VM sizes; in a high availability deployment, the ASCS and database VM counts are fixed at two.
- **Transport directory**: create one, use an existing one, or none.

Once the VIS exists (deployed, or registered for an existing SAP NetWeaver or ABAP system on Windows, SLES or RHEL with HANA, Db2, SQL Server, Oracle, MaxDB or SAP ASE), ACSS shows status and health, starts and stops the SAP system, provides quality checks and insights, shows infrastructure metrics and analyzes cost.

Registration doesn't support HANA Large Instances, HANA scale-out, MCOS or MCOD, Java or dual-stack systems, systems spread across peered virtual networks, or IPv6. For registration, the user-assigned managed identity needs the **Azure Center for SAP solutions service role** on the resource group of the VMs, disks and load balancers, and **Reader** on the resource group of the virtual network.

| Requirement | Tool |
| --- | --- |
| Guided, Azure-native deployment of S/4HANA with management after deployment | Azure Center for SAP solutions |
| Customizable open-source pipeline for many landscapes, including AnyDB and existing Terraform/Ansible skills | SAP Deployment Automation Framework |
| Infrastructure only, in the company's existing template pipeline | Bicep or ARM templates |

> **Exam trap.** ACSS uses a **user-assigned** managed identity for deployment. A system-assigned identity, or giving roles only to the signed-in user, doesn't satisfy the prerequisite.

<!-- section: key-points -->
## Key points

- NetWeaver and AnyDB: SAP Note 1928533 (SAPS). Production HANA: SAP HANA hardware directory.
- Size the database VM first; scale the application tier out by SAPS; check disk, throughput, network and zone availability.
- Write Accelerator exists only on M family VMs; E family HANA log needs Premium SSD v2, Ultra Disk or Azure NetApp Files.
- The Azure Extension for SAP is mandatory for SAP support; the new version uses a managed identity with Reader and reaches `management.azure.com`.
- `RHEL-SAP-HA` for Pacemaker clusters; PAYG or BYOS; Marketplace images include the VM Agent.
- Generalize (`waagent -deprovision+user`, Sysprep) for reusable gallery images; deploy from the uploaded disk to keep a host name and SID.
- SDAF = open source, Terraform + Ansible, control plane then workload zone then system; ACSS = VIS resource, user-assigned identity, guided S/4HANA deployment and operations.
