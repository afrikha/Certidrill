# QZ-az-140-15-session-host-images — report

Quiz: `content/az-140/quizzes/15-session-host-images.yaml` (10 questions). `npx tsx factory/check-quiz.ts az-140 15-session-host-images` → 0 problem(s), 0 warning(s).

The mock exam already holds about 60 questions on 1.5.x (prefixes `az140-1d-*`, `az140-1e-*`, `cs4a`, `sr2`), so the quiz deliberately targets decisions they don't test: antivirus before Sysprep, `buildTimeoutInMinutes` default/max, the MSIX auto-update built-in script, OS disk size with session host update, new version vs new definition vs version update, custom script in a private storage account + existing VNet, the cross-subscription gallery limitation of session host configurations, `sha256Checksum` / `validExitCodes` / `File`, and the gallery DR rule (no publishing while the gallery's region is down).

## Facts checked on Learn (fetched 2026-11-24)

- Golden image page: disable all antivirus programs before Sysprep; UWF not supported; deploy build VM without "Login with Microsoft Entra ID"; Gen1 or Gen2 both allowed.
- Image Builder JSON page: `buildTimeoutInMinutes` default 240 (0 = default), min 6, max 960; `osDiskSizeGB` can only increase (0 = source size); `sha256Checksum`, `validExitCodes`, `runAsSystem` on the PowerShell customizer; File customizer < 20 MB, Windows destination path must exist.
- Custom image templates pages: managed identity needs Storage Blob Data Reader (or similar) for scripts in a storage account; with an existing VNet the identity needs access to the VNet or its resource group, and the subnet's private service policy must be disabled; "Disable automatic updates for MSIX applications" is among the built-in features.
- Session host update page: OS disk size can't be changed during an update, it follows the gallery image; session host configurations don't support a gallery image in another subscription.
- Host pool management approaches: session host configuration is pooled only and the approach can't be changed after creation.
- Compute Gallery overview: not a global resource; best practice two galleries in separate regions for DR; if a gallery's region is down you can't create or update its resources; 1 replica per 20 concurrent VMs, minimum 3 for production.

## Doubts and chapter discrepancies (chapter not edited)

- Chapter, custom image template prerequisites: with an existing virtual network, Learn also requires the subnet's **private service policy** (`privateLinkServiceNetworkPolicies`) to be disabled, and a staging resource group you name yourself must be empty. The chapter omits both. The quiz (Q7) states that the subnet already has the required network settings, to stay unambiguous.
- Chapter, replicas: "up to 100 replicas per version". The Learn overview says 100 per version, but its best-practices section also says "maximum of 50 replicas per region". Learn contradicts itself here. Not used in the quiz.
- Chapter, session host update: "re-creates the VMs … under the same computer names". Learn: the OS hostname stays the same, but the new Azure VM, disk and NIC resources are named `<SessionHostName>-<DateTime>`, and the old VMs are deleted. The chapter could say this more precisely.
- Chapter: logoff delay "0 to 60 minutes, default 2" and batch size "default 1". The session host update page I fetched doesn't give these numbers. Not verified, and not used.
- Chapter: "Sysprep needs decrypted drives" (BitLocker). This isn't on the AVD golden image page. Not used in the quiz (the mock exam uses it).
- Copying an image version from a gallery in another subscription: the "Create an image definition and image version" page lists sources "in the same gallery or another gallery in the same subscription" but shows a cross-tenant flow. Because of this ambiguity, Q8's correct answer is "publish each image to a gallery in Sub-AVD as well" (for example a second Image Builder distribution target), not a cross-subscription copy.
- Built-in script names: the Learn pages list the features of the built-in scripts, not their exact portal names. Q4 uses the feature wording ("Disable automatic updates for MSIX applications", "Apply Windows Updates", "Disable Storage Sense", "Configure session timeouts").
