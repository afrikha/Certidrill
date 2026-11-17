# K-az-802-sr1 — report

6 Yes/No series (18 `series_yesno` questions), prefix `az802-sr1`, all `status: draft`. Validator: 24 files, 0 problem(s).

| Series | Objective | Domain | Answers (order 1-2-3) | Difficulty |
| --- | --- | --- | --- | --- |
| az802-sr1-rid-seize | 1.1.5 | ad-ds | Yes / No / No | 2-1-3 |
| az802-sr1-share-hop | 2.1.2 | hybrid | No / Yes / No | 3-2-1 |
| az802-sr1-nested-amd | 3.1.3 | vms | No / No / Yes | 3-2-2 |
| az802-sr1-two-shares | 5.1.3 | storage | No / Yes / No | 1-2-1 |
| az802-sr1-admin-pso | 6.2.1 | security | Yes / No / No | 2-1-2 |
| az802-sr1-sales-ou | 7.3.1 | monitoring | No / No / Yes | 3-2-2 |

Difficulty mix: 5 easy, 9 medium, 4 hard. Domain `networking` not used (6 series, 7 domains).

## Notes and deviations

- Created `content/az-802/series/` and the six `questions/<domain>/` folders used.
- Verified on Learn (Nov. 2026): transfer vs seize and ntdsutil syntax; `Move-ADDirectoryServerOperationMasterRole` (`-Identity` = server receiving the roles, `-Force` = seize); second-hop options (RBKCD set on the resource server via `PrincipalsAllowedToDelegateToAccount`, `klist purge -li 0x3e7`, CredSSP delegates credentials); `Enable-WSManCredSSP` syntax; nested virtualization prerequisites (AMD: host WS2022+, config version 9.3+; Intel: 8.0+; VM off; MAC address spoofing); `Update-VMVersion` (latest host version, WS2025 supports 8.0-12.0, irreversible); Azure File Sync topology rules (one cloud endpoint per sync group, one server endpoint per registered server per sync group, one Storage Sync Service per server, same region); FGPP targets (users and global security groups only, not OUs; shadow groups) and cmdlet parameters; ADAC Recycle Bin restore order (parent first, nested tree not restored in one action, group memberships preserved).
- Not verified: the exact ntdsutil `q` line after `connect to server` matches the Learn sequence as summarized; `Update-VMVersion VM1` uses the positional form shown on the Learn page (Update-VMVersion reference page could not be fetched: web-fetch budget exhausted). The statement that a password policy in a GPO linked to an OU does not affect domain accounts relies on the Learn sentence "This group policy is applied on the domain level".
- A DSRM nonauthoritative-restore distractor was dropped because the forest-recovery page could not be fetched.
- No coordination with K-az-802-sr2 (parallel); it may pick some of the same objectives.
- French: "seize" rendered as « saisir (seize) »; no AZ-802 glossary exists yet, terms not checked against fr-fr pages (fetch budget).
