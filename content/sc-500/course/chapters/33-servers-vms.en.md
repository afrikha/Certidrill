This chapter covers the controls that protect virtual machines and servers wherever they run: encryption of disks, management access without public ports (Azure Bastion, just-in-time access), extension of Azure controls to on-premises and other clouds with Azure Arc, Defender for Servers and its components, the security type of the VM, and enforcement of OS settings with Azure Machine Configuration.

<!-- section: disk-encryption | objectives: 3.2.1 -->
## Disk encryption

| Option | What it encrypts | Keys | Notes |
| --- | --- | --- | --- |
| Server-side encryption (SSE) | OS and data disks at rest in storage. Always on | Platform-managed by default; customer-managed through a **disk encryption set** | Doesn't cover the temp disk or caches. Defender for Cloud shows the VM as unhealthy for the encryption recommendation |
| Encryption at host | Also the **temp disk**, the **caches** and the data flow between compute and storage | Disk encryption set for CMK; temp disk always platform-managed | No VM CPU used. Recommended for new VMs |
| Azure Disk Encryption (ADE) | OS and data disks inside the guest with BitLocker (Windows) or DM-Crypt (Linux) | Azure Key Vault, optional key encryption key (KEK) | Uses VM CPU. **Retires September 15, 2028** |
| Confidential disk encryption | OS disk, keys bound to the VM's TPM | Platform or customer-managed | Confidential VM sizes only |

> **Exam trap.** After September 15, 2028, ADE-encrypted disks fail to unlock after a reboot. ADE and encryption at host are mutually exclusive: a VM that has **ever** had ADE can't get encryption at host, so migration means new disks.

Encryption at host needs a one-time feature registration per subscription and a supported VM size; an existing VM must be deallocated and reallocated to be encrypted.

```bash
az feature register --namespace Microsoft.Compute --name EncryptionAtHost

az vm create -g RG1 -n VM1 --image Ubuntu2204 --size Standard_D2s_v5 \
  --encryption-at-host \
  --os-disk-encryption-set "<disk encryption set ID>"
```

Customer-managed keys for SSE: create a key vault (or Managed HSM) with **purge protection enabled**, create a key, create the disk encryption set, then give the set's managed identity access to the key (wrap, unwrap, get), and select the set on the disks.

<!-- section: bastion | objectives: 3.2.2 -->
## Azure Bastion

Azure Bastion provides RDP and SSH to VMs over TLS from the portal or a native client; the VMs need **no public IP** and no inbound RDP/SSH from the internet.

| Feature | Developer | Basic | Standard | Premium |
| --- | --- | --- | --- | --- |
| Dedicated host, `AzureBastionSubnet`, public IP | No (shared) | Yes | Yes | Yes (no public IP for private-only) |
| VMs in peered virtual networks | No | Yes | Yes | Yes |
| Native client (Azure CLI), file transfer, custom port | No | No | Yes | Yes |
| IP-based connection, shareable link | No | No | Yes | Yes |
| Host scaling (instance count) | No | No (2 instances) | Yes | Yes |
| Session recording, private-only deployment | No | No | No | Yes |

Requirements for dedicated SKUs: a subnet named exactly `AzureBastionSubnet`, /26 or larger, in the same virtual network, with no other resources; a **Standard, static** public IP (except private-only Premium). You can **upgrade** a SKU (about 10 minutes) but not downgrade: delete and recreate instead.

| Requirement | Answer |
| --- | --- |
| Connect from the `az network bastion ssh` command or upload files | Standard |
| Record sessions for audit | Premium |
| No public IP on the bastion itself | Premium, private-only |
| Reach an on-premises server by IP through the VPN | Standard (IP-based connection) |

<!-- section: jit-access | objectives: 3.2.3 -->
## Just-in-time VM access

Just-in-time (JIT) access is a **Defender for Servers Plan 2** feature. When you enable it, Defender for Cloud adds **deny-all inbound** rules for the selected ports in the NSG (and in Azure Firewall, if the VM is protected by one in the same virtual network). When an authorized user requests access, it adds a temporary **allow** rule for the requester's IP address for the requested time, then restores the previous state.

| Setting | Default |
| --- | --- |
| Ports | 22 (Linux), 3389 (Windows); Defender for Cloud also proposes 5985 and 5986 |
| Maximum request time | 3 hours |
| Allowed source IPs | Any (restrict to "my IP" or a range) |

Enable it from **Defender for Cloud** > **Workload protections** > **Just-in-time VM access** > **Not configured** tab > **Enable JIT on VMs**, from the VM's **Configuration** page, or with `Set-AzJitNetworkAccessPolicy`. Users request access from the **Configured** tab, from the VM's **Connect** page, or with `Start-AzJitNetworkAccessPolicy`.

Least-privilege permissions:

| Task | Actions |
| --- | --- |
| Configure a JIT policy | `Microsoft.Security/locations/jitNetworkAccessPolicies/write` and `Microsoft.Compute/virtualMachines/write` |
| Request access | `Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action` plus read on the policy, the VM, its NICs and public IPs |

> **Exam trap.** JIT doesn't support classic VMs, and doesn't support VMs protected by an Azure Firewall managed by **Azure Firewall Manager** (firewall policy); it needs classic firewall rules. Without Plan 2, the JIT page isn't available.

<!-- section: arc-defender-onboarding | objectives: 3.2.4, 3.2.5 -->
## Hybrid and multicloud servers with Azure Arc and Defender for Servers

**Azure Arc-enabled servers** project a non-Azure machine as an Azure resource through the **Connected Machine agent** (`azcmagent`). Once projected, the machine gets Azure controls: Azure Policy and Machine Configuration, RBAC, tags, extensions and Defender for Servers. The agent also gives the machine a system-assigned managed identity.

Onboarding options:

| Scenario | Method |
| --- | --- |
| One server | Script generated in the portal (Azure Arc > Add) |
| Many servers | Script with a **service principal** holding **Azure Connected Machine Onboarding** |
| No public internet path | Connectivity method **Private endpoint** with an Azure Arc **private link scope** |
| AWS EC2 or GCP VMs | The Defender for Cloud multicloud connector deploys Arc automatically |

```bash
azcmagent connect --service-principal-id "<app ID>" --service-principal-secret "<secret>" \
  --tenant-id "<tenant ID>" --subscription-id "<subscription ID>" \
  --resource-group RG-Arc --location westeurope
```

Enable Defender for Servers: **Environment settings** > subscription (or AWS account, GCP project) > **Defender plans** > **Servers** On. **Plan 2 is the default**; **Change plans** selects Plan 1. A non-cancellable 30-day trial starts.

| Capability | Plan 1 | Plan 2 |
| --- | --- | --- |
| Defender for Endpoint EDR, automatic onboarding | Yes | Yes |
| Agent-based vulnerability scanning, software inventory | Yes | Yes |
| Agentless vulnerability, malware and secrets scanning | No | Yes |
| Defender Vulnerability Management premium features | No | Yes |
| JIT VM access, file integrity monitoring, OS baseline (MCSB) | No | Yes |
| 500 MB free data ingestion (Log Analytics) | No | Yes |
| Enable at resource level | Yes | No (disable only) |

Recommended scope is the subscription. Resource-level settings (REST API, or the built-in policies of the **Security Center – Granular Pricing** category selected by tag) let you enable Plan 1 on tagged machines or exclude machines.

> **Exam trap.** An on-premises server onboarded **directly** to Defender for Endpoint, without Arc, gets only Plan 1 capabilities. Plan 2 features such as file integrity monitoring and OS baseline need the machine onboarded through **Azure Arc**.

<!-- section: servers-settings | objectives: 3.2.6 -->
## Defender for Servers settings: vulnerability scanning and EDR

Plan components are under **Environment settings** > subscription > **Servers** > **Settings** (Settings and monitoring):

| Component | Default | Comment |
| --- | --- | --- |
| Vulnerability assessment for machines | On | Solution: Microsoft Defender Vulnerability Management (**Edit configuration**) |
| Endpoint protection | On | Deploys Defender for Endpoint automatically |
| Agentless scanning for machines | On with Plan 2 or Defender CSPM | See next section |
| File integrity monitoring | Off | Plan 2 only, enable manually |

**EDR**: the **Endpoint protection** setting onboards supported machines to Microsoft Defender for Endpoint with the `MDE.Windows` or `MDE.Linux` extension (Windows Server 2012 R2 and 2016 use the unified solution). A device already onboarded to another Defender for Endpoint tenant must be offboarded first.

**Vulnerability scanning** with Defender Vulnerability Management works agent-based (through the Defender for Endpoint sensor, Plan 1 or 2) and agentless (Plan 2 or Defender CSPM). Findings appear as recommendations in Defender for Cloud and in the Microsoft Defender portal.

> **Exam trap.** Turning off **Endpoint protection** doesn't uninstall the sensor: remove the `MDE.Windows`/`MDE.Linux` extension and offboard the device from Defender for Endpoint.

<!-- section: agentless-scanning | objectives: 3.2.7 -->
## Agentless scanning

Agentless scanning takes a **snapshot of the OS and data disks**, analyzes it out of band in the same region, then deletes it. It needs no agent, no network connectivity to the VM and no VM resources. It finds vulnerabilities and software inventory (Defender Vulnerability Management), plaintext **secrets**, **malware** (Microsoft Defender Antivirus engine) and missing or misconfigured EDR.

- Enable it: **Environment settings** > subscription > **Defender CSPM** or **Defender for Servers Plan 2** > **Settings** > **Agentless scanning for machines** On. Malware scanning requires Plan 2.
- Works for Azure VMs, AWS EC2 and GCP instances. Scans run **every 24 hours**, not configurable; a stopped or deallocated VM isn't scanned that cycle.
- Azure assigns the built-in **VM scanner operator** role (read disks, `beginGetAccess`). For **CMK-encrypted disks**, grant the Defender for Cloud scanner key vault key permissions (read, wrap, unwrap).
- Not scanned: VMs with an Ultra disk (`UltraSSD_LRS`) or Premium SSD v2 attached, more than 14 disks, or file systems such as ReFS.

> **Exam trap.** On-premises Arc-enabled servers have no Azure disk to snapshot: agentless scanning covers Azure, AWS and GCP machines. For on-premises servers, vulnerability scanning relies on the Defender for Endpoint sensor.

<!-- section: vm-security-type | objectives: 3.2.8 -->
## VM security type: Trusted launch, secure boot and vTPM

| Security type | What you get |
| --- | --- |
| Standard | No secure boot or vTPM |
| Trusted launch | **Secure boot** (only signed boot loaders, kernels and drivers start) and **vTPM** (TPM 2.0 for keys and measured boot), optional boot integrity monitoring. **Generation 2** VMs only |
| Confidential VM | Hardware-based trusted execution environment, confidential disk encryption; confidential sizes |

- Portal, CLI and PowerShell create **Trusted launch** by default; it costs nothing extra. Not supported on some sizes (for example A-family, Dv2, Dv3, M-series) and not with managed images (use Azure Compute Gallery).
- A Gen1 VM can be upgraded to Gen2 with Trusted launch; Trusted launch can be enabled on an existing Gen2 VM.
- **Integrity monitoring**: with secure boot and vTPM on, install the **Guest Attestation** extension; Defender for Cloud then validates boot health remotely and raises *VM attestation failure* if the boot chain deviates from the baseline.

```json
"securityProfile": {
  "securityType": "TrustedLaunch",
  "uefiSettings": { "secureBootEnabled": true, "vTpmEnabled": true }
}
```

> **Exam trap.** Integrity monitoring needs all three: secure boot, vTPM **and** the Guest Attestation extension. Attestation fails when secure boot is off.

<!-- section: machine-configuration | objectives: 3.2.9 -->
## Azure Machine Configuration

**Azure Machine Configuration** (formerly Guest Configuration) extends Azure Policy inside the guest OS: registry values, services, local security policy, SSH settings, file permissions. It works on Azure VMs and Azure Arc-enabled servers; results appear in **Azure Policy** compliance.

Prerequisites on each Azure VM: the **Machine Configuration extension** (`AzurePolicyforWindows` or `AzurePolicyforLinux`) and a **system-assigned managed identity**, with outbound HTTPS 443 or a private path. Arc-enabled servers already have the identity through the Connected Machine agent.

Order of operations:

1. Assign the initiative **Deploy prerequisites to enable Guest Configuration policies on virtual machines** (DeployIfNotExists), ideally at management group scope.
2. Create a **remediation task** so existing VMs get the extension and identity (new VMs get them automatically).
3. Assign the baselines in audit mode, for example **Windows machines should meet requirements of the Azure compute security baseline** (AuditIfNotExists).
4. Review compliance, document exceptions, then enforce selected settings with custom configuration packages.

| Assignment mode | Behavior |
| --- | --- |
| Audit | Reports only |
| Apply and Monitor | Applies once, then reports drift |
| Apply and Autocorrect | Applies and corrects drift |

> **Exam trap.** Without the extension and the system-assigned identity, a baseline assignment can't evaluate the guest. Assigning the prerequisites initiative isn't enough for **existing** VMs: they need a remediation task.

<!-- section: key-points -->
## Key points

- Temp disk and caches encrypted = encryption at host; ADE retires September 15, 2028 and blocks encryption at host.
- Bastion: Standard for native client, IP-based connection and shareable link; Premium for session recording and private-only.
- JIT = Defender for Servers Plan 2; deny rule in the NSG, temporary allow rule on request, 3 hours maximum by default.
- Non-Azure servers: Azure Arc first, then Defender for Servers; Plan 2 is the default, Plan 1 is the only plan enabled per resource.
- Agentless scanning = disk snapshots every 24 hours (Plan 2 or Defender CSPM), malware scanning needs Plan 2.
- Integrity monitoring = secure boot + vTPM + Guest Attestation extension.
- Machine Configuration = extension + system-assigned identity + remediation task, then baseline assignments.
