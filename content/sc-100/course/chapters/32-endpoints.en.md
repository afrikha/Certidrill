Endpoints are where most attacks start and where ransomware spreads. For SC-100 you specify requirements rather than configure them: which control protects which platform, which baseline applies, what covers devices that can't run an agent, and how local administrator passwords stop lateral movement. The answers come from a short list of products: Defender for Servers and Defender for Endpoint, Microsoft Intune, Defender for IoT, security baselines and Windows LAPS.

<!-- section: server-requirements | objectives: 3.2.1 -->
## Security requirements for servers across platforms

A server estate mixes Windows Server and Linux distributions, in Azure, in AWS or GCP and on-premises. The requirement is the same everywhere: one EDR, one vulnerability view, one baseline, controlled administrative access.

| Requirement | Specify |
| --- | --- |
| EDR and threat detection on Windows and Linux servers, any location | Defender for Servers, which deploys Defender for Endpoint |
| Non-Azure servers managed like Azure VMs | Azure Arc-enabled servers, then Defender for Servers |
| Vulnerability and software inventory without installing anything | Agentless scanning (Defender for Servers Plan 2 or Defender CSPM) for Azure, AWS and GCP machines |
| Detect changes to system files and registry keys | File integrity monitoring (Plan 2) |
| No management port open permanently | Just-in-time VM access (Plan 2) or Azure Bastion |
| Hardened OS configuration, audited continuously | MCSB OS baseline through Azure Policy machine configuration |
| Boot-level integrity of Azure VMs | Trusted launch (secure boot, vTPM) with integrity monitoring |
| Patch compliance across Azure and Arc servers | Azure Update Manager, with missing updates reported in Defender for Cloud |
| Unique local administrator passwords | Windows LAPS (Windows Server); for Linux, remove shared local passwords and use Microsoft Entra sign-in or SSH keys |

Platform-specific points the exam uses:

- **Linux**: Defender for Endpoint on Linux provides EDR and antivirus; machine configuration audits Linux settings (SSH, file permissions) as well as Windows.
- **Domain controllers and tier 0 servers**: Defender for Identity sensors detect identity attacks on AD DS, AD FS and AD CS; administer them only from privileged access workstations.
- **Legacy or unsupported OS**: isolate them in a dedicated network segment and monitor their traffic, because they no longer receive security updates.

> **Exam trap.** Agentless scanning snapshots cloud disks. An on-premises Arc-enabled server has no Azure disk to snapshot: its vulnerability data comes from the Defender for Endpoint sensor.

<!-- section: clients-mobile | objectives: 3.2.2 -->
## Security requirements for clients and mobile devices

For clients, Microsoft Intune manages **configuration and compliance**, Defender for Endpoint provides **protection and detection**, and Conditional Access **enforces** the result at sign-in.

| Requirement | Specify |
| --- | --- |
| Corporate devices fully managed | Intune enrollment: configuration profiles, compliance policies, security baselines |
| Personal phones (BYOD) with corporate data, no enrollment | Intune **app protection policies** (MAM): encrypt app data, block copy to personal apps, wipe corporate data only |
| Only healthy devices reach Microsoft 365 | Compliance policy + Conditional Access "Require device to be marked as compliant" |
| A device with active malware loses access automatically | Defender for Endpoint device risk level in the Intune compliance policy (mobile threat defense) |
| EDR and antivirus on Windows, macOS, Linux | Defender for Endpoint |
| Phishing and malicious app protection on Android and iOS | Defender for Endpoint on Android and iOS (web protection, and app scanning on Android) |
| Block common malware behaviors (Office child processes, credential theft from LSASS) | Attack surface reduction rules |
| Block unknown applications | App Control for Business |
| Protect credentials from theft | Credential Guard, Windows Hello for Business |
| Encrypt lost devices | BitLocker (Windows), FileVault (macOS), device encryption required by compliance policy |
| Prevent users from disabling protection | Tamper protection (Windows; macOS in Block mode; on Linux it is in preview and Audit mode only: it reports changes but doesn't block them) |

Hardening principles to state: remove local administrator rights from users, keep the OS and apps updated (Windows Update for Business through Intune), enable network protection and web content filtering, and use security baselines as the starting configuration.

> **Exam trap.** App protection policies protect data **inside apps** and don't require enrollment, so they fit BYOD. A compliance policy needs an enrolled device. "Personal devices, users refuse enrollment, protect corporate email" is MAM plus Conditional Access "Require app protection policy".

<!-- section: iot-embedded | objectives: 3.2.3 -->
## Security requirements for IoT devices and embedded systems

IoT devices and embedded systems (cameras, sensors, printers, badge readers, building management controllers) usually can't run an EDR agent, run old firmware and are rarely inventoried. The requirements fall into four groups:

| Area | Requirements |
| --- | --- |
| Identity | A **unique identity per device**, preferably an X.509 certificate from a CA chain, with keys in a hardware root of trust (TPM or HSM); no shared or default credentials |
| Integrity | Secure boot, signed firmware, secure over-the-air updates, tamper detection; disable unused ports and services (USB, debug interfaces) |
| Network | Segmentation of IoT devices away from user and server networks, outbound-only connections to the cloud, TLS for all traffic |
| Visibility | An inventory of every device, vulnerability assessment and network-based threat detection |

Which product gives visibility:

| Device type | Solution |
| --- | --- |
| Enterprise IoT on the corporate network (printers, VoIP phones, smart TVs, conferencing systems) | Enterprise IoT security with **Defender for Endpoint** (agentless discovery from onboarded endpoints) |
| OT and industrial devices (PLCs, HMIs, controllers) | **Defender for IoT** OT network sensors |
| Devices that connect to an Azure IoT solution | Device identities in IoT Hub (see the cloud services chapter), with Defender for IoT and Defender for Containers on the edge |

> **Exam tip.** "Devices that can't host an agent" points to **network-based**, agentless monitoring: Defender for IoT sensors for OT, Defender for Endpoint discovery for enterprise IoT. Never answer "install Defender for Endpoint on the PLC".

<!-- section: defender-iot-ot | objectives: 3.2.4 -->
## Securing OT and ICS with Defender for IoT

**Microsoft Defender for IoT** discovers OT and IoT devices, assesses their vulnerabilities and detects threats without agents. An **OT network sensor** (physical appliance or VM) connects to a **SPAN port or network TAP**, inspects traffic with OT-aware deep packet inspection (layer 6) and does all collection, analysis and alerting locally, so it suits sites with low bandwidth.

| Sensor engine | Detects |
| --- | --- |
| Protocol violation | Packets that break ICS protocol specifications (for example an illegal Modbus function code) |
| Policy violation | Deviations from the learned or configured baseline |
| Industrial malware | Known OT malware behavior (Triton, Havex, Black Energy) |
| Anomaly | Unusual machine-to-machine communication |
| Operational | Operational problems such as a device that stops responding |

Management choices:

| Requirement | Design |
| --- | --- |
| Central view of many plants, Microsoft Sentinel integration, automatic threat intelligence updates | **Cloud-connected** sensors, managed in the Azure portal |
| Air-gapped plant, no data may leave the site | **Locally managed** sensors: alerts in each sensor console, threat intelligence uploaded manually, forwarding to an on-premises SIEM |
| Mixed estate | Hybrid: some sensors cloud-connected, others local only |
| One SOC view of IT and OT incidents | Defender for IoT in the Microsoft Defender portal (preview) alongside Defender XDR |

Design points: place sensors where they see the traffic of the control network segments you must monitor, map devices to sites and zones, keep the sensor network separate from the production network, and send cloud-connected alerts to Microsoft Sentinel for correlation with IT signals. The legacy **on-premises management console** isn't available for download after **January 1, 2025**: new designs use cloud or sensor-level management and the APIs. Devices are counted once per unique IP and MAC pair; inactive devices (60 days without traffic in OT networks) and devices already managed by Defender for Endpoint aren't counted.

> **Exam trap.** Defender for IoT monitors **passively** from a mirror port: it doesn't sit inline and doesn't block OT traffic, so it never risks stopping a production line. Blocking is done by firewalls and segmentation, driven by its findings.

<!-- section: security-baselines | objectives: 3.2.5 -->
## Specifying security baselines for servers and clients

A security baseline is Microsoft's recommended set of security settings for a platform. The architect specifies **which baseline**, **which tool** deploys it and **how drift is detected**:

| Endpoints | Baseline and tool |
| --- | --- |
| Windows and Linux servers in Azure, AWS, GCP and Arc | MCSB OS baseline, audited by Azure Policy **machine configuration** and shown in Defender for Cloud |
| Domain-joined Windows servers and clients | Windows security baselines (Group Policy) from the **Security Compliance Toolkit** |
| Windows Server 2025 | **OSConfig** security baselines with drift control |
| Intune-managed Windows devices | Intune security baselines: Windows, Defender for Endpoint, Microsoft Edge, Microsoft 365 Apps, Windows 365 |
| Industry benchmark required (CIS, NIST) | Regulatory standards in Defender for Cloud (Defender CSPM) to assess against them |

Rules to remember:

- The same Microsoft team builds the Group Policy and Intune baselines; Intune leaves out settings that apply only to on-premises domain controllers.
- Microsoft baselines aren't one-to-one CIS or NIST mappings. If the requirement names CIS, assess against the CIS standard.
- Baseline defaults are restrictive: deploy to a pilot ring first, review per-setting status, document exceptions.
- When a new Intune baseline version is released, older profiles become read-only for settings: plan the update to the new version.
- Manage each setting from **one** source: Group Policy, Intune and OSConfig setting the same value differently create conflicts.

> **Exam trap.** The Security Compliance Toolkit helps migrate on-premises Group Policy baselines to cloud management; it doesn't enforce anything by itself. For cloud-managed devices the answer is an Intune security baseline; for hybrid server fleets, machine configuration.

<!-- section: windows-laps | objectives: 3.2.6 -->
## Evaluating Windows LAPS

**Windows LAPS** (Local Administrator Password Solution) is built into Windows 11 23H2 and later and Windows Server 2025, and was added to Windows 10, Windows 11 21H2 and 22H2, Windows Server 2019 and 2022 by the April 11, 2023 update. Windows 10 reached end of support on October 14, 2025: Windows LAPS remains available only on Windows 10 devices that still receive updates, such as through Extended Security Updates, and new deployments use Windows 11 or a supported Windows Server. It rotates the password of one local administrator account per device and backs it up, which defeats pass-the-hash and lateral movement with a shared local password.

| Device join state | Backup directory |
| --- | --- |
| Microsoft Entra joined | Microsoft Entra ID |
| Active Directory joined | Active Directory (also the DSRM password of domain controllers) |
| Microsoft Entra hybrid joined | Either Microsoft Entra ID or Active Directory, **never both** |
| Microsoft Entra registered (workplace-joined) | Not supported |

Evaluation criteria:

| Requirement | Answer |
| --- | --- |
| Licensing | Windows LAPS is free; Entra ID backup needs Microsoft Entra ID Free or higher; custom roles need Microsoft Entra ID P1 or P2 |
| Who can read passwords in Entra ID | Cloud Device Administrator or Intune Administrator, or a custom role with the `deviceLocalCredentials/password/read` permission |
| Help desk sees metadata but not passwords | Roles with metadata read only (Helpdesk Administrator, Security Reader) |
| Regional help desks limited to their devices | Cloud Device Administrator scoped to an **administrative unit** |
| Password read in AD only by a specific group | AD password **encryption** with an authorized decryptor group (also enables password history) |
| Audit who retrieved a password | Microsoft Entra audit logs ("Recover device local administrator password") or AD event logs |
| Rotate after use | Post-authentication actions: reset the password, sign out or reboot after a grace period |
| Policy deployment | Intune Windows LAPS policy (Entra joined or hybrid), Group Policy (AD and hybrid) |

Migration: **legacy Microsoft LAPS** is deprecated as of Windows 11 23H2, and newer OS versions block the installation of its MSI package. Emulation mode lets Windows LAPS honor legacy policies during transition, but it stores passwords in clear text in AD, without encryption or history, so treat it as temporary.

> **Exam trap.** If a device is deleted from Microsoft Entra ID, its LAPS password is lost with it. And Conditional Access can target the built-in roles that recover passwords, but not roles scoped to an administrative unit or custom roles.

<!-- section: key-points -->
## Key points

- Servers in any location: Defender for Servers (Defender for Endpoint), Arc for non-Azure, Plan 2 for FIM and JIT, machine configuration for the baseline.
- Clients: Intune for configuration and compliance, Defender for Endpoint for protection, Conditional Access for enforcement; MAM for BYOD without enrollment.
- IoT and embedded: unique hardware-backed identity, signed firmware, segmentation, agentless visibility.
- Defender for IoT: passive OT sensors on SPAN or TAP, cloud-connected or locally managed for air-gapped sites, Sentinel integration.
- Baselines: MCSB through machine configuration, Group Policy baselines from the Security Compliance Toolkit, Intune baselines, OSConfig for Windows Server 2025.
- Windows LAPS: Entra ID or AD backup (not both), free, administrative units for scoped recovery, legacy LAPS deprecated.
