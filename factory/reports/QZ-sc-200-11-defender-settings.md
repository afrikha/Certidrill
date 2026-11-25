# QZ-sc-200-11-defender-settings — notes

`content/sc-200/quizzes/11-defender-settings.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.1 (q7), 1.1.2 (q3, q6), 1.1.3 (q1), 1.1.4 (q4, q8), 1.1.5 (q2, q9), 1.1.6 (q5, q10). Positions 6–10: yesno, dropdown, multi, yesno, multi.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Manual incident merge.** The chapter says "You can merge up to five incidents manually". The Learn page "Merge incidents manually in the Microsoft Defender portal (Legacy)" describes merging two incidents at a time, gives no maximum, and says Defender chooses the target incident. It also says incident cases (preview) are now the recommended experience. Merge candidates must have the same or null values for Assigned to, Classification and Determination. I didn't use manual merge in the quiz.
- **Indicator timing.** The "15 to 30 minutes, up to 2 hours" figure applies to file indicators only. For IP and URL indicators, Learn (indicator-ip-domain) says a block can take up to 48 hours and in most cases takes effect in under two hours.
- **Web content filtering** in Chrome, Firefox, Brave and Opera needs network protection in block mode (Edge uses SmartScreen). The chapter doesn't say so.
- **File indicators** also need file hash computation (`EnableFileHashComputation`). The chapter doesn't mention it. q8 states it in the stem.
- **ASR precedence.** Learn also documents **Controlled configuration**: when it's on, only Intune or Defender security settings management apply, and conflicting GP, Configuration Manager and local settings are ignored. The chapter only covers `MDMWinsOverGP`. q5 doesn't offer Controlled configuration as an option, so q5 has only one valid answer.
- **Per-source severity** in incident notification rules: the Learn page says it's possible ("set the severity per detection or service source"), but its wizard steps show a single Alert severity setting. The chapter states it as fact. The quiz doesn't test it.
- Confirmed as written: Hide alert covers Defender for Endpoint alerts only; Set as behavior doesn't cover Defender for Cloud or Defender for Office 365; built-in tuning rules don't affect AIR or email notifications and don't apply to custom detection or custom TI alerts; disable a built-in rule from its details pane; a domain indicator covers its subdomains; there are no wildcards or ranges; Microsoft-signed apps can't be blocked; file indicators apply to PE files only on Windows; `Set-MpPreference` overwrites the ASR rule list; only the LSASS rule and the Office code injection rule lack Warn mode; deleting a device group removes it from notification rules and deletes a rule whose only group it was.

## Doubts and unverified facts

- **Custom data collection preview status.** Both Learn pages carry a "prereleased product" notice, but neither labels the feature "Preview". q2 and q9 use it as the correct answer because objective 1.1.5 is about this feature. The mock questions do the same.
- **q7, slot `an`.** The answer (Analyst1 can now edit NR-Office) is an inference from the RBAC rule "you can only create, edit, delete … for device groups you're allowed to manage". No page describes this exact case.
- **q7, deletion rule.** The rule comes from the Defender for Endpoint device groups page ("email notification rules"). I applied it to Defender XDR incident notification rules, as the chapter does.
- **Mock question `sc200-1a-ind-edge-path`.** Its distractor c ("URL indicators need up to 48 hours to apply to non-Microsoft browsers") is close to Learn's general "up to 48 hours" statement. The stem's "three days ago" still makes it wrong, but a reviewer could argue it.

## Design notes

- I avoided the decisions of the mock questions. The new decisions are: the web content filtering feature, the `DeviceCustomImageLoadEvents` table, disabling a built-in tuning rule, one domain indicator for subdomains, `MDMWinsOverGP`, built-in tuning versus custom detections and Hide alert sources, the effect of deleting a device group on notification rules and RBAC editing, file types and signed files for indicators, supported OS and the single-workspace limit of custom data collection, and `Set-MpPreference` overwrite with a global ASR exclusion.
- No preview feature is an answer (see the custom data collection doubt above).
