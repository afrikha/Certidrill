# QZ-sc-500-33-servers-vms — report

File: `content/sc-500/quizzes/33-servers-vms.yaml` (10 questions, `sc500-qz-33-01` to `-10`). Check: `npx tsx factory/check-quiz.ts sc-500 33-servers-vms` → 0 problem(s), 0 warning(s).

Objectives: 3.2.8 (Q1, Q9), 3.2.2 (Q2), 3.2.1 (Q3), 3.2.4 (Q4), 3.2.6 (Q5), 3.2.3 (Q6 multi), 3.2.5 (Q7), 3.2.7 (Q8 yes/no), 3.2.9 (Q10 yes/no). Q9 is a dropdown.

## Chapter issues against current Learn (chapter not edited)

- **FR wording**: the Bastion table of `33-servers-vms.fr.md` says « réseaux virtuels appairés »; the glossary and writing guide require « peering » (« réseaux virtuels reliés par peering »).
- **ADE → encryption at host** (3.2.1): Learn's migration page (Migrate from Azure Disk Encryption to encryption at host) explains the block as "no in-place migration" and a Unified Data Encryption flag that persists on the disk after decryption, **kept by snapshots and Copy-based disk copies**. You have to use the Upload method (AzCopy to a new upload-enabled disk). The chapter only says "migration means new disks". A learner could think a snapshot is enough. Worth adding.
- **Trusted launch default** (3.2.8): Learn now says portal, CLI and PowerShell create Trusted launch by default. ARM/Bicep/Terraform need the `TrustedLaunchByDefaultPreview` feature registration, or API 2025-11-01+ with a compatible image, disk and size. The chapter's sentence is right but incomplete for template deployments.
- **Integrity monitoring** (3.2.8): the chapter doesn't mention `az vm create --enable-integrity-monitoring`, which installs Guest Attestation and enables a system-assigned identity (used in Q9). It also doesn't say that guest attestation needs outbound access to the `AzureAttestation` service tag (boot integrity monitoring overview). Both are worth adding.
- **Agentless scanning plans**: the agentless pages list Defender CSPM or Defender for Servers Plan 2. The page "Vulnerability scanning in the Defender for Servers plan" says "Agentless scanning is available in Defender for Servers Plan 2 only". This is a contradiction inside Learn, and the chapter follows the agentless pages. No quiz question depends on it.

## Doubts / partly verified facts

- Q4: Learn documents only a system-assigned identity for Arc-enabled servers. The quiz uses only that identity and says nothing about user-assigned identities.
- Q8 s2 (agentless malware scanning on AWS EC2 with Plan 2): Learn lists AWS among the supported environments and says malware scanning needs Plan 2. It has no explicit per-cloud malware table.
- Q10 s3: the agent overview says the Connected Machine agent includes the machine configuration agent (GCArcService). It doesn't literally say "no extension needed on Arc servers". The chapter states it implicitly ("Arc-enabled servers already have the identity").
- Q10 s2 assumes the prerequisites initiative's DeployIfNotExists/Modify policies apply automatically to VMs created after the assignment, as the chapter says. I didn't check the exact list of policies in the initiative.
- Q2: Learn's comparison table says Developer can't reach peered VNets. I wrote "connects only to VMs of its own virtual network".
