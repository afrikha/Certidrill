# K-sc-200-sr1 — report

6 series, 18 `series_yesno` questions, all `status: draft`. Validator: `CERT=sc-200 npx tsx factory/validate.ts --prefix sc200-sr1` → 24 files, 0 problem(s).

| Series | Objective | Domain | Answers (1/2/3) | Difficulty |
| --- | --- | --- | --- | --- |
| sc200-sr1-pentest-close | 1.1.10 | environment | N / N / Y | 2 / 3 / 1 |
| sc200-sr1-anomaly-threshold | 1.4.5 | environment | Y / N / N | 2 / 1 / 3 |
| sc200-sr1-timeline-export | 2.2.1 | incidents | N / Y / N | 2 / 1 / 2 |
| sc200-sr1-file-block | 2.2.3 | incidents | Y / N / N | 2 / 2 / 1 |
| sc200-sr1-hash-hunt | 3.1.2 | hunting | Y / N / Y | 1 / 2 / 3 |
| sc200-sr1-ta-exposure | 3.1.4 | hunting | N / Y / N | 1 / 2 / 2 |

Mix: 6 easy / 9 medium / 3 hard.

## Deviations and coordination

- I first wrote an alert tuning series (1.1.2) and a "hunting query → scheduled analytics rule" series (3.2.1). The parallel task sr2 had written near-identical series (`sc200-sr2-scanner-tuning`, `sc200-sr2-hunt-schedule`), so I deleted mine and replaced them with 1.4.5 (anomaly rules) and 3.1.4 (threat analytics).
- I also skipped Defender for Cloud Apps unsanctioning, summary rules and live response because case-study questions already test those decisions (`sc200-cs1c-block-app`, `sc200-cs3a-denied-summary`, `sc200-cs3a-live-response`, `sc200-cs2a-live-response-script`).

## Facts to double-check

- **Automation rule entity condition name "Host name"** (pentest-close-2/3). The automation rule reference page couldn't be fetched (client error). The name comes from the course chapter and the automation rules page, which confirms entity-property conditions for incident triggers.
- **Timeline export limit (seven days)** comes from `defender-endpoint/device-timeline-event-flag`, which resolves to the "Investigate devices in Microsoft Defender for Endpoint" page (canonical `investigate-machines`). That page is the reference I used.
- **Threat analytics permissions**: the page says exposure data and recommended actions need "Vulnerability management (read)" and "Exposure Management (read)". ta-exposure-2 adds both.
- **Hash in hash-hunt**: a made-up SHA-256 value, not a real IOC.
