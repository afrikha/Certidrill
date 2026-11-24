# QZ-sc-200-14-data-ingestion — report

Quiz: `content/sc-200/quizzes/14-data-ingestion.yaml`, 10 questions (1.3.1 ×2, 1.3.2 ×1, 1.3.3 ×1, 1.3.4 ×2, 1.3.5 ×1, 1.3.6 ×1, 1.3.7 ×2). Check: 0 problem(s), 0 warning(s).

The 71 mock-exam questions of 1.3.x cover nearly every decision of the chapter. The quiz tests the remaining ones: Defender XDR alerts synced to the primary workspace only, and table ingestion for a secondary workspace; WEF over HTTPS with certificates for workgroup servers; ingestion rule order (Delete stops processing); EventTime vs TimeGenerated with a time zone offset; DCR not updated after a schema change; XPath entries with an `EventData` filter, missing log name, unsupported `contains`, wrong log; AzureActivity cost (free ingestion, retention beyond 90 days) and no DCR transformation support; forwarder scale set behind a round-robin load balancer, TLS in the daemon, full disk; table plan, DCE not needed with a `kind: Direct` DCR, `_CF` suffix on an Azure table.

## Chapter points to check against current Learn (chapter not edited)

- **XPath limits**: the chapter says "up to 20 expressions per box and up to 100 boxes per rule". The current Learn page ("Collect Windows events ... with Azure Monitor Agent") only says DCRs support up to 20 expressions (Get-WinEvent 23); it no longer states a 100-box limit. Not used.
- **ThreatIntelIndicators / ThreatIntelObjects**: "Threat intelligence - Microsoft Sentinel" still says these tables were "publicly previewed" on April 3, 2025, and the STIX objects page is titled "(Preview)"; the legacy table stopped on July 31, 2025. The ThreatIntelObjects reference page doesn't list which object types it stores (the chapter says threat actors, attack patterns, identities, relationships). I avoided making ThreatIntelObjects a correct answer.
- **Logs Ingestion API and DCE**: Learn: a DCE is needed only with private link or when the DCR lacks the logs ingestion endpoint (DCRs without `"kind": "Direct"`, or created before March 31, 2024). The chapter agrees. The mock question `sc200-1d-ct-ingestion-steps` makes "Create a data collection endpoint" a required first step; it is consistent only with the portal wizard (which asks for a DCE) — worth a look.
- **TLS for the Logs Ingestion API**: Learn now says TLS 1.2+ is enforced from March 1, 2026 (chapter: "requires TLS 1.2 or later" — fine).
- **Azure Activity cost**: Learn: no ingestion charge for activity logs; retention charged only beyond 90 days. The chapter says the first part only.
- **Duplicate Syslog/CEF transformation**: Learn notes that since AMA 1.41 `ProcessName` may not contain "CEF" for non-RFC-compliant vendors, so filter on both `ProcessName` and `SyslogMessage`. The chapter's trap callout doesn't mention it (the mock question `sc200-1c-cef-transform` already filters on both).

## Doubts

- Question 5: the fix "update the DCR stream declaration and output" follows Learn's "Azure Monitor doesn't update data collection rules automatically when you make table schema changes"; the exact symptom (column empty rather than ingestion error) is my inference.
- Question 9: option c (reconnect the standalone Defender for Endpoint connector) — Learn says standalone Defender connectors are disconnected at onboarding to avoid duplicate tenant alerts; that these connectors never provided advanced hunting tables is from general knowledge.
- Question 10: assumes CommonSecurityLog accepts a custom column through a DCR transformation (the table supports DCR transformations per the table feature reference; `_CF` rule from the custom-table and Logs Ingestion API pages).
