# K-az-140-sr2 — report

5 Yes/No series (15 questions), all `status: draft`. Yes positions: 1, 2, 3, 2+3, 3 (the Office series has two Yes). The four domains are covered (infrastructure 1, identity-security 1, user-apps 2, monitoring 1), because five series can't each be in a different domain out of four. I picked objectives that no existing AZ-140 question covers, except 4.1.6 (one case-study question, on a different decision). I couldn't check which objectives az140-sr1 uses: it hadn't written any files when I started.

| Series | Domain | Objective | Topic | Answers |
| --- | --- | --- | --- | --- |
| az140-sr2-gallery-region | infrastructure | 1.5.7 | Compute Gallery: add a target region with replicas (80 concurrent VMs → 4) / no replica in the region / too few replicas | Y N N |
| az140-sr2-bastion-native | identity-security | 2.2.5 | mstsc via `az network bastion rdp`: Basic / Standard + Native Client Support / JIT without a network path | N Y N |
| az140-sr2-idle-sessions | user-apps | 3.2.9 | Session Time Limits: active limit / scaling plan force logoff / idle + disconnected limits | N N Y |
| az140-sr2-office-activation | user-apps | 3.3.5 | Shared computer activation: none / ODT `SharedComputerLicensing` / GPO "Use shared computer activation" after install | N Y Y |
| az140-sr2-host-maintenance | monitoring | 4.1.6 | Drain mode only / exclusion tag only / exclusion tag + drain mode under a scaling plan | N N Y |

Difficulty: 4 easy, 8 medium, 3 hard.

## Notes and doubts

- I couldn't run web searches because the shared search budget was used up. Every fact was checked with WebFetch on these Learn pages: azure-compute-gallery, bastion-sku-comparison, native-client, connect-vm-native-client-windows, just-in-time-access-usage, autoscale-scaling-plan, autoscale-scenarios, drain-mode, overview-shared-computer-activation, install-office-on-wvd-master-image, policy-csp-admx-terminalserver.
- Gallery: Learn implies, but doesn't state outright, that a VM needs a replica in its own region ("after replication is complete in a region, you can deploy... in the region"). The replica rules are "one per 20 concurrent VMs" and "minimum three for production". The limits on the page conflict (100 per version vs 50 per region); no question depends on them.
- Bastion: the SKU comparison says the Azure CLI native client needs Standard or Premium. Learn doesn't say that JIT requires a public IP. The No answer rests on the scenario: no public IP, no VPN and no ExpressRoute, so the workstation has no network path.
- Session time limits: the behaviours come from the ADMX_TerminalServer CSP page (idle limit → disconnect with a 2-minute warning; disconnected limit → session deleted). The GPO values ("1 hour") are left in English, like portal values.
- Office series question 3: the page says a reinstall isn't needed, only a restart. Group Policy isn't supported for Microsoft 365 Apps for business; the scenario uses E3. The scenario says nobody opened Office on the image, so no activation reset is needed.
- Maintenance: "autoscale overwrites drain mode for pooled host pools" is quoted from autoscale-scenarios. The ramp-down timing (17:00) is in the scenario because that is when autoscale turns off hosts with no sessions.
- French: « mode drainage », « étiquette d'exclusion », « baisse de charge » and « activation d'ordinateurs partagés » follow the az-140 FR course chapters; they weren't rechecked on fr-fr pages. Times are written as « 17 h » in French.
