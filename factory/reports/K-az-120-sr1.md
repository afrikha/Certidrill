# K-az-120-sr1 — report

6 series × 3 questions (prefix az120-sr1), all `status: draft`; validator: 0 problem(s).

| Series | Objective | Domain | Answers |
| --- | --- | --- | --- |
| az120-sr1-rise-network | 1.3.1 | migration | N Y N |
| az120-sr1-hana-log | 2.3.6 | infrastructure | N Y Y |
| az120-sr1-app-db-traffic | 2.2.6 | infrastructure | N N Y |
| az120-sr1-hana-vip | 3.1.3 | hadr | N Y N |
| az120-sr1-dr-region | 3.2.1 | hadr | N N Y |
| az120-sr1-commitments | 4.1.3 | maintenance | Y N N |

Difficulty: 5 easy / 9 medium / 4 hard. Only 4 domains exist, so two domains carry two series each.

## Points to review

- hana-log: Standard_M96ds_2_v3 is called "SAP HANA-certified" in the scenario; the Write Accelerator page lists it (8 WA disks), but its HANA certification was not checked in the SAP HANA hardware directory (not on Learn).
- hana-log-2 (Yes): Premium SSD v2 for /hana/data and /hana/log on M-series relies on the Learn statement that the Premium SSD v2 configuration applies to certified M-series VMs of the same memory size (table rows by memory, M96ds_2_v3 not named). The VM is put in an availability zone to avoid the zonal-deployment question.
- hana-vip: floating IP is in the documented configuration but Learn does not say "required", so no question relies on floating IP being disabled.
- Reference titles use the page H1 (as the AZ-104 examples do).
- Possible overlap with the parallel task K-az-120-sr2 (same exam, same format); objectives were not coordinated.
