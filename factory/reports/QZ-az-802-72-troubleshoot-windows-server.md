# QZ-az-802-72-troubleshoot-windows-server — report

File: `content/az-802/quizzes/72-troubleshoot-windows-server.yaml` (10 questions; check: 0 problem(s), 0 warning(s)).

## Chapter issues against current Learn (Nov 2026)

- **7.2.4, VMICTimeProvider for virtualized DCs.** The chapter tells you to disable `VMICTimeProvider` (registry `Enabled` = 0) on a virtualized DC / Azure PDC emulator. None of the pages I fetched supports this: *Time sync for Windows VMs in Azure* documents only enabling VMICTimeProvider and disabling NtpClient, and says that for domain-joined machines the domain sets the hierarchy; *Virtualizing domain controllers with Hyper-V* recommends clearing the **Time synchronization** integration service (Hyper-V); *Accurate Time for Windows Server 2016* doesn't mention it. I left it out of the quiz. Find a Learn source or remove it from the chapter.
- **7.2.3, Update Manager.** *Troubleshoot Known Issues with Azure Update Manager* still calls the option "**Customer Managed Schedules (Preview)**" in one passage. The chapter (and mock question `az802-7a-um-schedule-fix`) present it as the required setting. Check whether it is GA before keeping it as a correct answer.
- **7.2.3, WSUS registry.** The `WUServer` / `WUStatusServer` values under `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate` aren't on *Step 4 - Configure Group Policy Settings for Automatic Updates* (it covers only the GPO setting). I didn't verify them on another page, so the quiz tests only the GPO setting.
- **7.2.6, azcmagent.** The chapter shows only `azcmagent config set extensions.allowlist` (which replaces the list). The *azcmagent config* reference also has `clear` and the `--add` / `--remove` flags of `set`. Q8 uses `clear` (from the CLI reference) for the blocklist: consider adding `clear`, `--add` and `--remove` to the chapter. Also add the precedence rule (an extension in both lists is blocked; with an allowlist, unlisted extensions are blocked).
- **7.2.7, ADE.** The chapter matches Learn (retirement Sept 15, 2028, v6 and later unsupported, no TPM-enforcing GPO, AES-CBC). Learn also requires "Allow 256-bit recovery key" in custom BitLocker GPOs and says MBAM isn't compatible: could be added.

## Doubts / unverified

- Q6: the VM size is described only by its uncached limit (6,400 IOPS), so no SKU limit to verify. P10/P15/P20/P30 IOPS, the 30-minute burst of P20 and smaller, and tier changes without resizing (128 GiB → P15…P50) come from *Azure managed disk types* and *Change the performance of Azure managed disks* (the tier page is not cited as a reference because I didn't get its exact title). I wasn't sure of the exact title of the disk types page ("Azure managed disk types"): check it.
- Q8: reference title "azcmagent config CLI reference" is my guess at the H1 of `azcmagent-config`.
- Q10: Learn doesn't say in so many words that on-premises servers can't query 168.63.129.16. The explanation relies on the documented rule that private endpoint queries must come from the linked virtual network.
- Q1: *Find-NetRoute* doesn't say explicitly that it sends no traffic. The stem therefore says only that no connection exists yet.
- The hourly WebFetch limit was hit once (waited for the next hour).
