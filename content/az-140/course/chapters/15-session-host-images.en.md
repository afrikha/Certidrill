Session hosts are only as good as the image they start from. A custom image (often called a golden image) carries the OS settings, the applications and the optimizations, so every session host of a pool is identical and new hosts are ready in minutes. The exam tests the order of the manual steps, what Azure VM Image Builder and custom image templates automate, how to store and version images in Azure Compute Gallery, and how updated images reach the session hosts.

<!-- section: manual-image | objectives: 1.5.1 -->
## Create an image manually

The manual method uses a temporary virtual machine that you customize, generalize and capture.

1. **Choose the base image** from Azure Marketplace: Windows 11 or Windows 10 Enterprise **multi-session** (optionally with Microsoft 365 Apps) or Windows Server for pooled host pools, Windows 11 or Windows 10 Enterprise for personal host pools. Generation 2 is preferred (required for Trusted launch).
2. **Deploy the build VM** without joining it to a domain and without the **Login with Microsoft Entra ID** option.
3. **Snapshot the OS disk** right after deployment, then again after each important step, so you can roll back.
4. **Customize**: install applications, FSLogix, language packs, the latest Windows updates, optimizations; clean temporary files and extra user profiles.
5. **Before generalizing**: remove the VM from the domain if you joined it, disable antivirus and disk encryption (Sysprep needs decrypted drives), make sure Unified Write Filter isn't enabled, and take a final snapshot.
6. **Generalize with Sysprep**, which removes the machine-specific information, then mark the VM as generalized in Azure.
7. **Capture** (VM > Capture) to an **Azure Compute Gallery** image version (recommended) or a standalone managed image.
8. **Delete the build VM**: a generalized VM can't be restarted, and you never capture the same VM twice. For the next version, start from the last snapshot.

```text
rd /s /q C:\Windows\Panther
cd %windir%\system32\sysprep
sysprep.exe /generalize /shutdown
```

```powershell
# After the VM has shut down: mark it as generalized, then capture it
Set-AzVm -ResourceGroupName rg-images -Name vm-golden -Generalized
```

> **Exam trap.** Never install the Azure Virtual Desktop agent or register the build VM with a host pool before capturing it. The registration token in the image expires and hosts created from it fail to register. The agent is installed by the host pool deployment, on each new session host.

Other rules the exam likes: don't capture a VM that is already a session host, and don't build the next image by deploying an existing custom image and capturing it again without a clean source.

<!-- section: image-builder | objectives: 1.5.2 -->
## Create an image with Azure VM Image Builder

**Azure VM Image Builder** is a managed service that runs the build for you: it creates a temporary build VM from a source image, runs your customizations, generalizes it with Sysprep, distributes the result and deletes the temporary resources. The input is an **image template** (`Microsoft.VirtualMachineImages/imageTemplates`).

| Template part | Options |
| --- | --- |
| `source` | `PlatformImage` (Marketplace), `ManagedImage`, `SharedImageVersion` (Azure Compute Gallery) |
| `customize` | `PowerShell` (inline or `scriptUri`, `runElevated`), `WindowsRestart`, `WindowsUpdate` (`searchCriteria`, `filters`), `File` (small files, under 20 MB) |
| `distribute` | `SharedImage` (gallery image definition, `targetRegions`), `ManagedImage`, `VHD` |
| `buildTimeoutInMinutes` | Default 240; maximum 960 |
| `vmProfile` | Build VM size, OS disk size, optional existing virtual network and subnet |
| `identity` | **User-assigned managed identity, required** |

```json
"customize": [
  { "type": "PowerShell", "name": "installApps", "scriptUri": "https://raw.githubusercontent.com/contoso/avd/main/apps.ps1", "runElevated": true },
  { "type": "WindowsRestart", "restartTimeout": "10m" },
  { "type": "WindowsUpdate", "searchCriteria": "IsInstalled=0", "filters": [ "exclude:$_.Title -like '*Preview*'", "include:$true" ] }
],
"distribute": [
  {
    "type": "SharedImage",
    "galleryImageId": "/subscriptions/<sub>/resourceGroups/rg-images/providers/Microsoft.Compute/galleries/galAvd/images/win11-multi",
    "runOutputName": "win11-multi-out",
    "targetRegions": [ { "name": "westeurope", "replicaCount": 3, "storageAccountType": "Standard_ZRS" } ]
  }
]
```

Creating the template doesn't build the image: you start the build with the `Run` action (portal **Start build**, or the commands below). Image Builder creates a **staging resource group** named `IT_<resource group>_<template>_<GUID>`; its storage account keeps the `customization.log` (Packer output) to troubleshoot a failed build.

```bash
az resource invoke-action --resource-group rg-images \
  --resource-type Microsoft.VirtualMachineImages/imageTemplates \
  -n tpl-win11-multi --action Run
```

**Custom image templates** in Azure Virtual Desktop (**Azure Virtual Desktop > Custom image templates**) are the same service with a portal wizard tailored to session hosts. Prerequisites:

- Register the resource providers, including `Microsoft.VirtualMachineImages`, `Microsoft.DesktopVirtualization`, `Microsoft.Compute`, `Microsoft.Network`, `Microsoft.Storage`, `Microsoft.KeyVault` and `Microsoft.ContainerInstance`.
- Create a **user-assigned managed identity** and give it a **custom role** with the gallery and image actions (`Microsoft.Compute/galleries/images/versions/write`, `Microsoft.Compute/images/write` and the matching reads and delete), scoped to the image resource group. With an existing virtual network, the identity also needs access to it.
- For gallery distribution, create the gallery and the **image definition** first, with the same generation as the source image; the service creates the image versions.

The wizard tabs are Basics, Source image, Distribution targets, Build properties (build timeout, build VM size, which must match the source generation) and Customizations. **Built-in scripts** cover the usual session host settings: install language packs and set the default language, time zone redirection, disable Storage Sense, install FSLogix and configure Profile Container, FSLogix with Kerberos, RDP Shortpath for managed networks, screen capture protection, Teams optimizations, session timeouts, disable automatic updates of MSIX apps, add or remove Microsoft 365 Apps, and apply Windows updates. Your own scripts must be reachable by URI (for example GitHub or a storage account the identity can read).

> **Exam tip.** "Repeatable", "no manual build VM", "same steps every month" and "install language packs or Windows updates during the build" all point to Image Builder or a custom image template. The answer to "what must you create first" is usually the user-assigned managed identity and its role, then the gallery image definition.

<!-- section: modify-update | objectives: 1.5.3, 1.5.5 -->
## Modify an image and apply OS and application updates

An image is never patched in place: you produce a **new image version** and redeploy session hosts from it.

| Method | How you modify or update |
| --- | --- |
| Manual | Create a VM from the last snapshot (or the latest version), apply the changes and updates, Sysprep, capture as the next image version, delete the VM |
| Image Builder or custom image template | Change the scripts, or simply rerun the build: a `PlatformImage` source with version `latest` picks up the newest Marketplace build, and the `WindowsUpdate` customizer or the **Apply Windows Updates** built-in script installs pending updates |

Content to put in the image versus outside it:

| Item | Where |
| --- | --- |
| OS cumulative updates, language packs, FSLogix, Teams optimizations | In the image, refreshed every month |
| Large, stable line-of-business apps used by everyone | In the image |
| Apps that change often or differ by user group | App attach (outside the image), so they're updated without a new image |
| Microsoft 365 Apps | In the image (Marketplace images exist with Microsoft 365 Apps preinstalled), or added and removed with the built-in script |
| MSIX app automatic updates | Disabled in the image so that apps don't change on pooled hosts |
| Per-host changes made by hand after deployment | Avoid: they're lost when hosts are re-created |

To roll the update out on a host pool:

- **Standard management**: deploy new session hosts from the new version, put the old hosts in **drain mode**, wait for users to sign out (or send a message and sign them out), then remove the old hosts from the pool and delete the VMs.
- **Session host configuration**: update the configuration with the new image, then schedule a **session host update**. The service updates one host first, then batches of the size set in the management policy (default 1); it notifies users, waits the logoff delay (0 to 60 minutes, default 2), signs them out, re-creates the VMs from the new image under the same computer names and rejoins them to the pool. Disable autoscale during the update.

> **Exam trap.** Session host update exists only for host pools created with a **session host configuration** (pooled only). On a standard host pool the answer is drain mode plus redeployment, or your own pipeline.

<!-- section: image-storage | objectives: 1.5.7 -->
## Store images in Azure Compute Gallery

Two places store an image you can deploy session hosts from:

| Capability | Managed image | Azure Compute Gallery |
| --- | --- | --- |
| Versioning | No (one image per resource) | Yes: definitions and versions |
| Replication to other regions | No | Yes, per version, with a replica count per region |
| Zone-redundant storage | No | `Standard_ZRS` replicas where available |
| Sharing | Azure RBAC on the image | Azure RBAC, direct shared gallery, community gallery |
| Trusted launch and confidential VMs | No | Yes, with a Gen2 definition and a supporting security type |
| Recommended for production | No (legacy) | **Yes** |

Gallery hierarchy:

```text
Gallery (galAvd)                       regional resource, can be shared with RBAC
└── Image definition (win11-multi)     publisher/offer/SKU, OS type, OS state,
    │                                  Hyper-V generation, security type
    ├── Image version 1.0.0            major.minor.patch, target regions, replicas
    └── Image version 1.1.0            the newest version is "latest"
```

Rules to know:

- An **image definition** is fixed for OS type, **OS state** (generalized for images captured after Sysprep; specialized keeps machine-specific information) and **Hyper-V generation** (V1 or V2). New definitions default to V2 and `TrustedLaunchSupported`.
- Trusted launch session hosts need a Gen2 definition whose security type supports Trusted launch (`TrustedLaunchSupported`, or the value that supports both Trusted launch and confidential VMs).
- **Replicas**: Microsoft recommends one replica per 20 virtual machines created at the same time, and at least three for production images; up to 100 replicas per version. Replicas in a target region are required to deploy session hosts in that region.
- `excludeFromLatest` (global) or `regionalExcludeFromLatest` keeps a version from being picked as "latest".
- A gallery is a regional resource: for disaster recovery keep images replicated to, or a second gallery in, the recovery region.
- Protect the gallery with a resource lock; `BlockDeletionBeforeEndOfLife` blocks deleting a version before its end-of-life date.

```bash
az sig create -g rg-images --gallery-name galAvd
az sig image-definition create -g rg-images --gallery-name galAvd \
  --gallery-image-definition win11-multi --publisher Contoso --offer avd --sku win11-multi \
  --os-type Windows --os-state Generalized --hyper-v-generation V2
```

> **Exam trap.** A scenario that needs session hosts in several regions, many simultaneous deployments, versions to roll back to, or Trusted launch rules out the managed image: the answer is Azure Compute Gallery.

<!-- section: lifecycle | objectives: 1.5.4 -->
## Plan and implement image lifecycle management

A lifecycle plan answers four questions: how often a new version is built, how it's tested, how hosts move to it, and when old versions are removed.

| Stage | Practice |
| --- | --- |
| Build | Monthly after Patch Tuesday, or when apps change; an image builder trigger can start builds automatically |
| Version | One definition per OS and purpose (for example `win11-multi-m365`), a new **version** for each build: `1.0.0`, `1.1.0`, `1.1.1` |
| Test | Deploy the new version to a **validation host pool** or test hosts first; keep it excluded from latest until approved |
| Release | Remove the exclusion, replicate to every region with enough replicas, redeploy or update session hosts |
| Roll back | Redeploy hosts from the previous version, kept in the gallery |
| Retire | Set an end-of-life date, then delete versions no host or pool references any more; keep the last known-good versions |

Snapshots of the build VM (manual method) and the template (Image Builder) are part of the lifecycle: they make the next build reproducible.

> **Exam tip.** If a question asks how to make sure new session hosts never pick an untested image, the answer is **exclude from latest** on the new version (or reference an explicit version number), not deleting the previous version.

<!-- section: session-host-custom-image | objectives: 1.5.6 -->
## Create a session host from a custom image

In the host pool wizard or **Session hosts > + Add**, on the **Image** field select **See all images**, then **My items** (managed images and shared gallery images). With a gallery you can pick an image definition (the latest version not excluded) or a specific version. Then:

- The **VM size** must support the image generation (a Gen2 image needs a size that supports Gen2).
- The **security type** must match the definition: Trusted launch or Confidential needs a definition that supports it.
- The image must have a **replica in the region** of the session hosts.
- The image must be **generalized**: each host gets a new computer name, joins the domain or Microsoft Entra ID, then receives the agent and registers with the token.

In a template, the session host references the gallery by ID; the definition ID without `/versions/...` means latest:

```bicep
imageReference: {
  id: resourceId('rg-images', 'Microsoft.Compute/galleries/images/versions', 'galAvd', 'win11-multi', '1.1.0')
}
```

With a session host configuration, keep the gallery in the same subscription: session host update doesn't support gallery images from another subscription, and the OS disk size follows the image.

<!-- section: key-points -->
## Key points

- Manual image: build VM, snapshots, customize, remove from domain, Sysprep `/generalize`, capture to a gallery, delete the VM; never install the agent in the image.
- Image Builder: image template with source, customize, distribute, and a required user-assigned managed identity; the build starts with the Run action.
- Custom image templates = Image Builder in the Azure Virtual Desktop portal, with built-in scripts (language packs, FSLogix, Teams, Windows updates).
- Images are updated by building a new version, then redeploying hosts or running session host update (session host configuration only).
- Azure Compute Gallery: definitions and versions, replicas per region, ZRS, exclude from latest, Trusted launch support; managed images are legacy.
- Session hosts from a custom image need a matching generation, security type and a replica in their region.
