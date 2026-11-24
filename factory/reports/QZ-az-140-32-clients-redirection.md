# QZ-az-140-32-clients-redirection — report

File: `content/az-140/quizzes/32-clients-redirection.yaml` (10 questions). `npx tsx factory/check-quiz.ts az-140 32-clients-redirection` → 0 problem(s), 0 warning(s).

Objectives: 3.2.1 (q1, q6), 3.2.2 (q3), 3.2.3 (q4, q8), 3.2.4 (q2, q10), 3.2.5 (q5, q9), 3.2.6 (q7). Positions 6–10 formats: multi, single, ordering, dropdown ×2.

## Chapter out of date or wrong against Learn (Nov. 2026)

The source is "Compare Windows App features across platforms and devices" (Learn, updated 2026-11-12). The chapter's feature table differs from it on these points:
- **Multiple monitors on Android/Chrome OS**: Learn now supports it on ChromeOS devices only. The chapter says No. (q6 uses "Android tablets" so the answer stays valid.)
- **RDP Shortpath for public networks (STUN/TURN) on iOS/iPadOS**: not supported according to Learn. The chapter merges managed and public networks and says Yes for iOS. Shortpath for managed networks is supported on iOS.
- **RDP Multipath with UDP on macOS**: Learn shows it as supported, but only in the Windows App for macOS Beta. The chapter says No. That still holds for GA, but the chapter should say so.
- **Preview features in the redirection table that the chapter doesn't flag**:
  - RAW printing (`SmartRawPrinters`) is "in preview for Azure Virtual Desktop only".
  - TWAIN scanner redirection is in preview.
  - Camera redirection in a web browser is in preview.
  - WebAuthn redirection is in preview on macOS, iOS and Android.
  - macOS printer redirection supports only the Publisher Imagesetter driver.
- **New host pool defaults**: the drive redirection page says drive redirection is also disabled by default on new host pools. The chapter names only clipboard and printers.
- **Learn contradicts itself on new host pool defaults**: the "Set custom RDP properties" page lists defaults that include `redirectclipboard:i:1`, `redirectprinters:i:1`, `drivestoredirect:s:*` and `usbdevicestoredirect:s:*`, while the per-redirection pages say these are disabled for newly created host pools. The USB page is inconsistent with itself too (the portal default is "Don't redirect", but its text says all devices are redirected by default). I avoided default-dependent answers.
- **MSI client and on-premises RDS**: the "Get started with Windows App" page still tells users to keep the Remote Desktop app (MSI) for on-premises RDS, but the MSI client is no longer available for download. The chapter's Exam tip is consistent with this, but it could mention it.

## Mock-exam questions to check (not edited)

- `az140-3b-print-controls`, target t2: the correct answer is `SmartRawPrinters:s:*`. RAW printing is in preview for Azure Virtual Desktop, per the compare page, so a preview feature is the correct answer here.
- `az140-3b-rdp-sso-window`: the requirements are "opens in a window" (`screen mode id:i:1`) and "use all local monitors" (`use multimon:i:1`). The RDP properties page says that `screen mode id` is overridden when `use multimon` is on, because the session then opens across all monitors. These two requirements conflict.

## Unverified or partly verified facts

- The biometric device setup class GUID `{53d29ef7-377c-4d14-864b-eb3a85769359}` in q10 is given in the stem. I didn't verify it on Learn, and the answer doesn't depend on its value.
- q4: the Experience Estimator measures round-trip time "from your location", per the basic troubleshooting page. The claim that Network Watcher connection troubleshoot runs from Azure sources is from memory; it is only used as a distractor.
- q8 order: the dependencies are installed before the Windows App package. That order comes from the "Basic troubleshooting for Windows App" offline-install steps.
