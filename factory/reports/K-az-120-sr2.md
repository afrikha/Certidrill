# K-az-120-sr2 — report

5 Yes/No series (15 questions, all `status: draft`), prefix `az120-sr2`:

| Series | Objective | Domain | Answers (order 1-2-3) |
| --- | --- | --- | --- |
| az120-sr2-rise-network | 1.3.1 | migration | Yes / No / No |
| az120-sr2-app-db-traffic | 2.2.5 | infrastructure | No / Yes / No |
| az120-sr2-dr-region | 3.2.1 | hadr | No / No / Yes |
| az120-sr2-compute-commitment | 4.1.3 | maintenance | No / Yes / No |
| az120-sr2-acss-weekend-stop | 4.2.7 | maintenance | Yes / No / No |

Difficulty: 4 easy, 8 medium, 3 hard. Validator: 20 files, 0 problem(s).

## Deviations and doubts

- AZ-120 has only 4 domains, so maintenance carries two series (different objectives and groups: 4.1 and 4.2).
- Written in parallel with K-az-120-sr1 without seeing its files: check that the two tasks do not test the same decision.
- 4.2.7: the combination `--deallocate-vm` + `--soft-stop-timeout-seconds` is not documented, so no solution relies on it. VIS stop = ASCS + application servers only (REST reference "Sap Virtual Instances - Stop"); the database has its own stop action.
- 1.3.1 question 2 (VNet-to-VNet VPN) is "No" on the latency/throughput requirement only (Learn: throughput limited by the gateway SKU; peering gives minimized latency and maximum throughput).
- French terms not in the AZ-104 glossary, to check against fr-fr Learn: « plan d'économies Azure pour le calcul », « instances de machines virtuelles réservées », « flexibilité de taille d'instance », « libérer » (deallocate), « instance virtuelle pour solutions SAP (VIS) », « réplication entre régions » (Azure NetApp Files), « arrêt progressif (soft stop) ».
