# K-az-700-sr2 — CASES, AZ-700, 5 Yes/No series

No files from the earlier attempt existed; all 20 files written in this run.
Check: `CERT=az-700 npx tsx factory/validate.ts --prefix az700-sr2` -> 20 files, 0 problem(s).

| Series | Domain / objective | Answers (1-2-3) | Difficulty |
| --- | --- | --- | --- |
| az700-sr2-natgw | core / 1.3.10 | No, Yes, No | 1, 1, 2 |
| az700-sr2-globalreach | connectivity / 2.3.4 | No, Yes, No | 2, 2, 2 |
| az700-sr2-afd-privatelink | delivery / 3.3.9 | No, No, Yes | 3, 1, 2 |
| az700-sr2-sep | private-access / 4.2.3 | No, Yes, No | 2, 1, 2 |
| az700-sr2-fw-fqdn | security / 5.2.5 | No, No, Yes | 3, 2, 3 |

Mix: 4 easy, 8 medium, 3 hard.

## Points to review

- **Front Door + App Service private endpoint**: the Front Door how-to for App Service says public access is disabled once the private endpoint is enabled, while the App Service private endpoint page says private endpoints and public access coexist and public network access must be disabled. The Yes solution sets **Public network access** to **Disabled** explicitly, so it holds under both readings.
- **Portal labels** kept in English: App Service "Public network access" / "Disabled", storage "Enabled from selected virtual networks and IP addresses".
- **Firewall series**: built on the rule processing page (network rules always before application rules, whatever the rule collection group priority) and on the DNS settings page (FQDNs in network rules need DNS proxy plus clients using the firewall as DNS). The requirement only asks for reachability, so the FQDN network rule limitation on shared IP addresses does not change the answer.
- **Overlap**: the series of K-az-700-sr1 did not exist when this batch was written; check that the two batches do not test the same decision.
