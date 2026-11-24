# QZ-sc-200-31-xdr-hunting — report

Quiz: `content/sc-200/quizzes/31-xdr-hunting.yaml`, 10 questions (3.1.1 ×2, 3.1.2 ×1, 3.1.3 ×3, 3.1.4 ×1, 3.1.5 ×2, 3.1.6 ×1). Check: 0 problem(s), 0 warning(s).

The bank already has 84 questions on 3.1.x (tables, join flavors, string operators, take-action columns, threat analytics tabs, hunting graph scenarios, Sentinel graph). The quiz tests decisions not covered there: DeviceImageLoadEvents; threat analytics email notification rule; Insider Risk Management data risk graph; Link to incident; Entity relationship map; Kerberoast vs AS-REP scenario; AccountObjectId / move-to-folder columns / InitiatingProcessSHA1 for quarantine; DeviceNetworkInfo, DeviceTvmSoftwareInventory, DeviceFileEvents; CPU quota cycle, timeout, separate quotas; `startswith` vs `has` on ASR ActionType, `leftouter` + `coalesce`. Only one KQL question (3.1.2) because the bank's KQL coverage is very dense.

## Chapter points out of date or to check against current Learn (chapter not edited)

- **`DisruptionAndResponseEvents` is marked (Preview)** on "Data tables in the Microsoft Defender advanced hunting schema"; the chapter's table lists it without a preview label. Not used in the quiz.
- **Sentinel MCP graph tools** (`find_blastradius`, `find_walkable_paths`, `find_exposure_perimeter`) are in a **Graph tools (Preview)** section of "Data Exploration Tool Collection in Microsoft Sentinel MCP Server"; the chapter presents them without a preview label. Not used in the quiz.
- **Custom graphs are (preview)** ("What is Microsoft Sentinel graph?"). The chapter says so, but several bank questions make a custom graph the correct answer (`sc200-3b-sg-custom-author`, `sc200-3b-sg-graph-job`, `sc200-3b-sg-custom-perms`, `sc200-3b-sg-gql-query`, `sc200-3b-sg-explore-hop`, `sc200-3b-sg-table-export`, and the "Custom graph" target of `sc200-3b-sg-experiences`). The factory rule says never to make a preview feature the correct answer: to review.
- **`EntraIdSignInEvents`**: the table page title still says "(preview)", while the page says the table replaces `AADSignInEventsBeta` on October 19, 2026 and removes its preview status; it also requires Microsoft Entra ID P2. Bank question `sc200-3a-tbl-entra-noninteractive` relies on it as the answer (probably fine after Oct. 19, 2026).
- **Hunting graph prerequisite**: the hunting graph page now says "customers who have onboarded to Sentinel data lake, before September 23rd, 2026 are eligible to access this capability". The chapter only says "onboarding to the Microsoft Sentinel data lake". The date condition is unclear (eligibility cutoff?) and should be checked.
- **Advanced hunting date range**: Learn now says "Up to 30 days for native Defender data, or up to 90 days for supported data with an eligible ISOC license". The chapter says 30 days only.
- **Take actions on Sentinel data**: "Advanced hunting with Microsoft Sentinel data in Microsoft Defender" lists as a limitation that guided mode and take actions support Defender XDR data only. Not in the chapter (useful exam trap).
- **Timestamp vs TimeGenerated**: I found no Learn statement that Sentinel tables must be filtered on `TimeGenerated` in advanced hunting (the page only says to rely on `Timestamp` for streamed Defender tables). The chapter's rule is plausible but unverified.
- **Blast radius "up to seven hops"**: not found on the hunting graph page (which doesn't cover blast radius); not verified, not used.

## Doubts

- Question 3: the Learn table gives Insider Risk Management "Map user activities to detect data exfiltration patterns" and Data Security Investigations "Trace sensitive data access and movement"; the stem ties the need to departing-employee alerts (Insider Risk Management) to separate the two. DSI is not among the options to avoid ambiguity.
- Question 7, s1: the take-action page says AccountObjectId is required "for Microsoft Entra identities" for all actions; I assume Disable user is offered for cloud-only accounts from CloudAppEvents results.
- Question 10: `coalesce(Blocks, 0)` relies on KQL integer literals being `long`, the type of `count()`; the coalesce page itself was not fetched.
