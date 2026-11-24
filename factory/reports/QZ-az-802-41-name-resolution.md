# QZ-az-802-41-name-resolution — report

File: `content/az-802/quizzes/41-name-resolution.yaml` (10 questions, `az802-qz-41-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 41-name-resolution` → 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 4.1.1 | single | 1 | Re-register DC locator SRV records: restart Net Logon (not `ipconfig /registerdns`) |
| 2 | 4.1.2 | single | 1 | Only changed records to the secondary: IXFR |
| 3 | 4.1.3 | single | 2 | Conditional forwarder refused because a stub zone of the same name exists: delete the stub zone |
| 4 | 4.1.2 | dropdown | 2 | `-CreatePtr` (no `-AgeRecord` so never scavenged), `-Srv`, `-Port` |
| 5 | 4.1.5 | single | 2 | Two matching zone-level policies: processing order 1 wins |
| 6 | 4.1.4 | single | 3 | Spoke VMs use hub DCs that forward to 168.63.129.16: link the private zone to the hub VNet |
| 7 | 4.1.5 | dropdown | 3 | Selective recursion: disable recursion on scope `.`, `-ApplyOnRecursion`, internal interface IP |
| 8 | 4.1.6 | yesno | 3 | Trust anchor distribution: all DCs of the forest yes, member server no; no NRPT = clients don't require validation |
| 9 | 4.1.1 | single | 3 | Stale secured A record of a rebuilt server: delete it so the new computer account becomes owner |
| 10 | 4.1.6 | single | 3 | Signed child zone under a signed parent: DS record in the parent zone (not created by signing) |

All 38 mock-exam questions of 4.1.1–4.1.6 (including case-study and series questions) were read first; no decision reused with the same answer.

## Sources

The hourly WebFetch limit was used up when the task started. Facts were read from the Learn source repositories on GitHub (MicrosoftDocs/windowsserverdocs, windows-powershell-docs, azure-docs); the conflict, AD DS DNS verification and private DNS link pages were then fetched on learn.microsoft.com. Reference titles are the `title:` metadata of the Learn pages.

## Chapter issues against current Learn (chapter not edited)

- **Conditional forwarder below a hosted zone:** the new page "Fix a DNS Forwarder Conflict in Windows Server" (October 2026) adds that a conditional forwarder for a child namespace of a zone the server hosts is refused unless it sits at or below a delegation in that zone. The chapter only states the same-name rule. Worth adding.
- **Hybrid DNS:** "Azure Virtual Network Name Resolution Guide" now has an Important note: when Azure VPN Gateway is used with custom DNS servers on the virtual network, 168.63.129.16 must be added to the DNS server list. The chapter (and the mock question `az802-4a-vnet-dns-dcs`, which sets only the two DCs) don't mention it. To check: it conflicts with the classic "VNet DNS = domain controllers only" design; not used in the quiz (question 6 has no VPN gateway).
- **Terminology:** the chapter and bank use « ancres d'approbation » for trust anchors; kept in the quiz.

## Doubts / unverified

- Question 4: that a record created without `-AgeRecord` has no timestamp (static, never scavenged) is stated by the chapter and implied by the `-AgeRecord` parameter description; the PTR created by `-CreatePtr` is assumed to be static too.
- Question 8: Learn says trust anchors on DCs "can be replicated to all domain controllers in the forest"; the stem selects the wizard option "Enable the distribution of trust anchors for this zone" to make that happen. The English option name is kept in the French stem (portal/wizard label).
- Question 10: "minimize administrative effort" separates the DS record from adding trust anchors for the child zone on every validating server; that second, heavier solution was left out of the options so that only one option works.
- "cmdlet" (undecided in the glossary) isn't used in French.
