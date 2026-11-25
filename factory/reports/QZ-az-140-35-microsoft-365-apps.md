# QZ-az-140-35-microsoft-365-apps — report

Quiz: `content/az-140/quizzes/35-microsoft-365-apps.yaml` (10 questions; check: 0 problem(s), 0 warning(s)).
Objectives: 3.3.5 (q1, q5, q6), 3.3.6 (q3, q7), 3.3.7 (q2, q9, q10), 3.3.8 (q4, q8).
Formats 6–10: single, hotarea, single, dropdown, yesno_statements.

## Doubts and unverified facts

- **q5** assumes that the Marketplace image "Windows 11 Enterprise multi-session + Microsoft 365 Apps" is ready for shared use. Learn confirms that the image exists, but I didn't check whether shared computer activation is preconfigured in it.
- **q6**: "HKEY_USERS\.DEFAULT is the LocalSystem profile, not the default user profile" is general Windows knowledge. It isn't on a fetched page.
- **q7**: that `KFMSilentOptIn` is ignored outside `HKLM\SOFTWARE\Policies\Microsoft\OneDrive` comes from the documented location (Install Office on a custom VHD image). No page says it in so many words.
- **q10 s1** relies on the WebRTC fallback (see below). It's true today, but it stops being true when WebRTC reaches end of availability (April 1, 2027).

## Chapter (and mock exam) vs current Learn (Nov 2026)

- **WebRTC end of support — important.** "Microsoft Teams for Virtualized Desktop Infrastructure (VDI)" gives a WebRTC deprecation timeline: on Windows endpoints (AVD/W365), end of support was **Oct 1, 2026** and end of availability is **Apr 1, 2027**. After that, WebRTC stops working, and Teams falls back to server-side rendering when SlimCore fails. The chapter (and the AVD Teams page) present this as the "classic Teams" end of support, and the chapter still recommends WebRTC as a fallback. Mock questions where installing the WebRTC Redirector Service is a correct answer (`az140-3c-teams-webrtc-location`, `az140-cs4a-teams` option a) now depend on an out-of-support component. Review them before April 2027, and add the timeline to the chapter.
- **FSLogix for new Teams**: the AVD Teams page says 2210 hotfix 3 (2.9.8716.30241) or later. The Teams VDI page recommends 2210 hotfix 4 (2.9.8884.27471) or later. The chapter quotes hotfix 4 (Teams documentation), which is fine, but Learn is inconsistent.
- **Clients**: the Teams pages say the Remote Desktop client for Windows and Mac is no longer supported for new Teams. The AVD Teams page still lists Remote Desktop client 1.2.1026.0+ for media optimization. Minimum Windows App versions also differ: 1.3.252 (AVD page), 2.0.352.0 (vdi-2), 2.0.360.0 (Teams VDI page). The chapter avoids the numbers, which is good.
- **SlimCore plugin**: the chapter says the plugin is "bundled with Windows App and downloaded automatically". Learn says the plugin is **bundled** with Windows App, and the plugin downloads **SlimCore** (the media engine MSIX) from the Microsoft CDN. Reword this.
- **disableAutoUpdate** (missing from the chapter): it works only on Teams builds above 23306.3314.2555.9628. When it's set, the MSIX installer doesn't install or upgrade the Teams Meeting Add-in (TMA), so provision TMA separately (`teamsbootstrapper.exe -p --installTMA` or `--installTMA`).
- **teamsbootstrapper -o** (missing from the chapter): a UNC path can fail with error 0x80070032, so copy the MSIX locally. The chapter already says a full path is required.
- **Outlook settings**: the Install Office page also sets `CalendarSyncWindowSetting` and `CalendarSyncWindowSettingMonths` in the default user hive. The chapter's code block leaves them out.
- **OneDrive on virtual desktops** ("Use the sync app on virtual desktops"): the supported OS list now shows Windows 11 and Windows Server 2025 only. Silent sign-in needs the machine connected to Microsoft Entra ID; the chapter says so.

No mock-exam question was found factually wrong today, apart from the WebRTC dependency above.
