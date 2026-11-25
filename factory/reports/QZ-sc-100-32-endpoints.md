# QZ-sc-100-32-endpoints — report

Quiz: `content/sc-100/quizzes/32-endpoints.yaml`, 10 questions (`sc100-qz-32-01` to `-10`). Check: 0 problem(s), 0 warning(s).

Objectives: 3.2.4 (Q1, Q8), 3.2.6 (Q2, Q10), 3.2.2 (Q3, Q7), 3.2.1 (Q4, Q9), 3.2.3 (Q5), 3.2.5 (Q6). Formats 6–10: yesno, dropdown, single, multi, dropdown.

The mock bank already covers this chapter densely (39 questions). The quiz avoids their decisions: sensor engines, legacy LAPS on new Windows, tamper protection, Trusted launch, Windows Hello for Business, web content filtering, Linux sign-in on Arc servers, JIT scope, CA vs custom roles for LAPS recovery, LAPS metadata readers and post-authentication actions are not answers in the bank.

## Chapter points to correct or check (not edited)

- **Windows LAPS, legacy LAPS blocked on 23H2** (section windows-laps): Learn (laps-overview) says legacy Microsoft LAPS is *deprecated* as of Windows 11 23H2 and that *newer* OS versions block its MSI installation; it doesn't say 23H2 itself blocks it. The quiz uses 24H2 devices to stay safe. Also Windows 10 reached end of support on Oct 14, 2025 (LAPS stays on ESU devices only): the chapter lists Windows 10 without that caveat.
- **Tamper protection**: Learn doesn't say explicitly that it blocks local administrators; the quiz says "attackers" and "changes to the settings". On Linux it is preview, audit only — the chapter table says "Prevent users from disabling protection" without platform nuance.
- **Defender for IoT in the Defender portal** is marked preview in the chapter; the quiz doesn't use it.
- **Post-authentication actions** in the chapter ("reset the password, sign out or reboot after a grace period") match the policy reference (values 1, 3, 5, 11; default 3; delay 0–24 h, default 24 h).
- Application Gateway WAF_v1 / AG v1 retirement is not relevant here.

## Unverified / judgment calls

- Q8: no Learn page documents a specific Sentinel playbook that blocks on an OT firewall; the answer relies on the chapter's principle (blocking done by firewalls driven by Defender for IoT findings) and on generic Sentinel playbooks. The Defender for IoT Sentinel solution includes playbooks (unnamed on the page).
- Q8 distractor d: "Enterprise IoT discovery can actively probe devices" relies on Defender for Endpoint standard discovery (active probing), not fetched this session; the main reason given (not OT protocol analysis) is from the chapter.
- Q10: "Cloud Device Administrator grants less than Intune Administrator" is a judgment (Intune Administrator has full Intune rights); both are built-in and CA-targetable.
- Q7: Learn's app protection overview doesn't list macOS; explanation says macOS isn't supported, based on that page.
- Q5: Learn's "Secure your IoT solutions" page doesn't state "outbound-only connections" (chapter row "Network"); I couldn't find a current Learn page for it, so the quiz doesn't test it.
