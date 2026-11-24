# QZ-sc-200-24-m365-activities — report

Quiz: `content/sc-200/quizzes/24-m365-activities.yaml`, 10 questions (2.3.1 ×4, 2.3.2 ×3, 2.3.3 ×3). Check: 0 problem(s), 0 warning(s).

The 38 mock-exam questions of 2.3.x cover nearly every decision of the chapter (roles, limits, KeyQL, purge steps, Graph joins, license, destinations, filtering). The quiz tests the remaining ones: Audit (Standard) default retention, where Content search lives now, how Graph activity logs are turned on, Defender for Office 365 Plan 2 remediation, Management Activity API, operation names (Set-InboxRule / FileSyncDownloadedFull / FileAccessed / "Add member to role."), resource-tenant scope (third-party app consented in the tenant, Teams client, token requests), purge + hold + role split, E5-vs-E3 Premium retention and non-retroactivity, Graph KQL (429, Scopes, parse_url, bin).

## Chapter points to check against current Learn (chapter not edited)

- **"Consent to application."**: the chapter lists it as a unified audit log operation (Microsoft Entra ID). I could not find it on the Purview page "Audit log activities" (the Application administration table lists "Add service principal.", "Add delegation entry." and so on, but no consent operation). It is an Entra audit log activity; whether the unified audit log exposes it with this name is unverified. Not used in the quiz.
- **eDiscovery (Premium) table**: Learn "Learn about eDiscovery" lists "Review set KQL queries" as **(preview)**. The chapter shows it as a plain Premium feature.
- **Content Search case default access**: Learn says members of the *eDiscovery Manager* **and Administrator** role groups; the chapter mentions only the eDiscovery Manager role group (eDiscovery Administrator is a subgroup, so it is not wrong, just incomplete).
- **Audit (Premium) 1-year default**: Learn adds that it applies only to the activities of users with an E5 (or Purview Suite / E5 eDiscovery and Audit add-on) license; non-E5 and guest users stay at 180 days. The chapter's table doesn't say this condition (the quiz tests it in question 9).
- **Purge on mailboxes on hold**: Learn adds that on a mailbox under Litigation Hold or In-Place Hold only 10 items are removed from the user's view and those are the only ones processed. The chapter only says items are kept until the hold ends.
- **Graph purge (100 items per location)**: the `purgeData` Graph page confirms the limit and covers mailboxes and Teams messages, but does not state that a Premium case is required (the chapter says "Premium cases").
- The pages "Get started with Content search" and "Keyword queries and search conditions for eDiscovery" now say they apply only to 21Vianet organizations. The chapter's KeyQL examples remain valid, but course references, if any, should point to the new `edisc-*` pages.

## Doubts

- Question 4 option "Submit the message ... from the Submissions page": I consider that a submission doesn't remove delivered copies (not stated explicitly on the fetched page).
- Question 10: `Scopes` is filled only for delegated tokens (scp claim), `Roles` for app-only tokens; the Graph page only says "The scopes / roles in token claims". The mock question sc200-2d-graph-record-fields relies on the same reading.
