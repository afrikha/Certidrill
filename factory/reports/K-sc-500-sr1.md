# K-sc-500-sr1 — report

6 series (18 `series_yesno` questions), prefix `sc500-sr1`, all `status: draft`. Validator: 24 files, 0 problem(s).

| Series | Objective | Domain | Answers (order 1-2-3) | Difficulty |
| --- | --- | --- | --- | --- |
| sc500-sr1-pim-approval | 1.1.1 PIM | identity | No / Yes / No | 2 / 2 / 3 |
| sc500-sr1-kv-purge | 1.2.2 Key Vault settings | identity | No / No / Yes | 2 / 3 / 1 |
| sc500-sr1-sql-audit | 2.2.2 SQL auditing | data-networking | Yes / No / No | 1 / 1 / 2 |
| sc500-sr1-avnm-rdp | 2.3.2 Virtual Network Manager | data-networking | No / Yes / No | 1 / 2 / 2 |
| sc500-sr1-jit-rdp | 3.2.3 JIT VM access | compute | Yes / No / No | 2 / 2 / 3 |
| sc500-sr1-sentinel-disable | 4.2.8 automation rules and playbooks | posture | No / No / Yes | 3 / 1 / 2 |

Mix: 5 easy, 9 medium, 4 hard. Two series in identity and two in data-networking (there are only 4 domains for 6 series). Sibling task sr2 runs in parallel: check it doesn't reuse these objectives with the same decision.

## Points inferred rather than stated verbatim on Learn

- kv-purge-1: the lock page says locks apply only to control plane operations, but it doesn't mention Key Vault. That deleting or purging a secret is a data plane operation (vault endpoint) is inferred from the general rule.
- avnm-rdp-2: the network groups page implies, but does not state outright, that VNets created later join a dynamic group automatically ("membership that changes as virtual networks are created").
- jit-rdp-3: rests on the overview sentence "If existing rules already cover those ports, they take priority over the new deny rules".
- sentinel-disable: the UI labels (When incident is created / When alert is created, Assign owner, Change status, Add tags, Run playbook) are the portal labels. The Learn page describes them in prose. The analytics-rule condition was left as plain text because the exact label wasn't verified.
- sql-audit-3: the Learn page names the plan "Defender for Azure SQL Databases". The text uses "Microsoft Defender for SQL", the name shown on the SQL server's Defender for Cloud page.

## Terminology

- "Azure Firewall" is kept in English in FR, as in content/sc-500/objectives.yaml. This differs from the AZ-104 glossary's "Pare-feu Azure".
- Purge protection = « protection contre le vidage ». Security admin rule = « règle d'administrateur de la sécurité ». Network group = « groupe réseau ». Automation rule = « règle d'automatisation ». All are taken from the fr-fr Learn pages.
- Reference titles could not be rechecked with curl because the proxy blocks it. They come from the WebFetch results.
