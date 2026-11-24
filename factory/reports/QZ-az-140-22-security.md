# QZ-az-140-22-security — report

File: `content/az-140/quizzes/22-security.yaml` (10 questions, `az140-qz-22-01` to `-10`). `npx tsx factory/check-quiz.ts az-140 22-security`: 0 problem(s), 0 warning(s).

Coverage: 2.2.1 (05), 2.2.2 (03, 06), 2.2.3 (04), 2.2.4 (10), 2.2.5 (09), 2.2.6 (01, 07), 2.2.7 (02, 08). Formats 6–10: single, yesno_statements, single, multi, single.

The mock bank already covers almost every decision in the chapter (59 questions on 2.2.x). To avoid repeating them, the quiz tests these points: KMS on TCP 1688 through Azure Firewall (network rule plus DNS proxy), the JIT requester permissions, the managed installer, confidential OS disk encryption fixed at creation, and moved Cloud Cache folders with antivirus exclusions.

## Chapter (22-security) out of date or inaccurate against current Learn

1. **FSLogix antivirus exclusions** (section defender-antivirus). The current *Prerequisites for FSLogix* list is longer. It adds the drivers `frxdrv.sys`, `frxdrvvt.sys` and `frxccd.sys`, the folders `C:\Program Files\FSLogix\Apps\`, `C:\ProgramData\FSLogix\` and `%LOCALAPPDATA%\FSLogix\`, the registry keys `HKLM\SOFTWARE\FSLogix\` and `HKLM\SOFTWARE\Policies\FSLogix\`, and the mount points. The share files are written `*.VHDX.lock`, `*.VHDX.meta` and `*.VHDX.metadata`. Learn also says to adjust the exclusions when the cache or proxy folder is moved. The chapter's table is a subset, and the same table is in 31-fslogix.
2. **"Scan after a security intelligence update"**. The chapter says it "can be disabled only for images already scanned". Learn says to disable it only while you build the base image and to keep it enabled in production. The chapter wording can be read as allowing production hosts made from a scanned image.
3. **"Quick Fix"**. Learn (*Remediate recommendations in Microsoft Defender for Cloud*) now calls it the **Fix** button. The quiz uses "Fix".
4. **Defender for Endpoint on Windows multi-session through Defender for Servers**. Not verified.
   - The chapter, like the AVD security page, says the integration deploys MDE on server OS only, and that client OS (multi-session included) need MDE or a third-party EDR.
   - The mock questions `az140-2b-dfc-mde-licensing` (answer: Defender for Servers Plan 1) and `az140-2b-dfc-plans-statements` s2 assume that Plan 1 licenses and auto-deploys MDE on Windows 11 Enterprise multi-session.
   - The current Defender for Cloud pages I fetched (support matrix, integration, enable integration) list only Windows Server. One of them says client OS need an MDE user license.
   - Please check both mock questions. The quiz avoids this point.
5. **JIT prerequisites**. Learn says VMs behind an Azure Firewall controlled by Azure Firewall Manager aren't supported. The chapter says only "an NSG or Azure Firewall in front of the VM".
6. **Required endpoints**. The Learn table now also lists `*.service.windows.cloud.microsoft` (tag `WindowsVirtualDesktop`), `*.windows.cloud.microsoft`, `*.windows.static.microsoft`, the certificate endpoints on TCP 80 and `51.5.0.0/16` UDP 3478. The chapter table is partial but still correct.
7. **Trusted launch**. Learn says existing Gen1 VMs can be upgraded to Gen2 with Trusted launch. Managed images remain unsupported, so the chapter's trap still holds for managed images.
8. **Confidential VMs**.
   - Learn adds that encrypted OS disks cost more since March 30, 2026, that Azure Backup support is in preview, and that Windows Server 2025 is supported by confidential VMs.
   - The AVD page still lists only Windows Server 2022 and 2019 for session hosts.
   - The chapter is consistent with the AVD page.
9. **French chapter**. The admin-access table says « réseau appairé ». The writing guide asks for « peering » and not « appairé », so it should read « un réseau virtuel connecté par peering ».

## Unverified or borderline facts in the quiz

- Q02, option b (encryption at host covers the temp disk and the disk caches) is from memory. It is a distractor; I didn't fetch the encryption-at-host page.
- Q08, explanation d ("Azure Disk Encryption is scheduled for retirement") comes from the writing guide (15 Sept 2028); I didn't re-fetch it.
- Q07 (the managed installer tags only apps that IME installs after the policy is in effect, not retroactively; device scope only) comes from the Intune page, not from the chapter. The reference uses the canonical URL `intune/device-configuration/endpoint-security/manage-app-control`; I fetched the old `mem/intune/protect/...` URL, which shows the same page.
- Q09 needs `Microsoft.Security/locations/jitNetworkAccessPolicies/*/read`, which the chapter doesn't list (it says "reads on the VM, NICs and public IPs"). The answer can still be found by elimination, because every other option is a write.
- Glossary: "Secure Score" is `undecided` in French, so the quiz avoids the term.
