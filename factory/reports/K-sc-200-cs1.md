# K-sc-200-cs1 — report

3 case studies, 17 questions (prefix `sc200-cs1`), all `status: draft`.

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| sc200-cs1a-lamna-healthcare | Hospitals, hybrid AD + MDI v3.x + MDE device groups + Sentinel | dc-events (1.3.2 single), automation-levels (1.1.9 dragdrop), tier1-roles (1.2.1 multi), forensics (2.2.2 single), ad-disable (2.1.6 single), spray-hunt (3.1.2 dropdown KQL) |
| sc200-cs1b-city-power-light | Electricity utility, OT syslog/CEF via Linux forwarder, Azure + data lake | cef-syslog (1.3.4 yesno), keyvault-policy (1.3.5 single), ot-rule (1.4.3 single), retention (1.2.2 dropdown), kql-job (3.2.2 single), scanner-suppression (2.1.3 single) |
| sc200-cs1c-tailwind-traders | Retail, Microsoft 365 E5 (MDO P2, MDCA, Entra ID P2), Sentinel | email-remediation (2.1.1 ordering), block-app (1.1.3 multi choose 3), user-risk (2.1.5 yesno), graph-activity (2.3.3 single), click-hunt (3.1.3 dropdown KQL) |

Types: single 8, dropdown 3, multi 2, yesno 2, dragdrop 1, ordering 1. Validator: 0 problem(s).

## Notes / doubts

- WebFetch budget (shared) ran out mid-task; one planned question on incident email notifications (1.1.1) was dropped because its Learn page could not be fetched. The Defender XDR incident email notification page URL `defender-xdr/m365d-notifications-incidents-email` returned a client error.
- `ActionType == "LogonFailed"` in IdentityLogonEvents (spray-hunt template, not a slot) is from Microsoft sample queries; the table page does not list ActionType values. Verify in a tenant.
- Case B states that the Sentinel Azure Key Vault connector is policy-managed (Launch Azure Policy Assignment wizard); the general diagnostic-settings page confirms the mechanism but does not list which connectors are policy-managed.
- Microsoft Sentinel data lake: retention values (analytics up to 2 years, total up to 12 years) and the lake limitations (no analytics rules, hunting queries, workbooks) come from "Manage data tiers and retention in Microsoft Sentinel" (fetched 2026-11-17).
- Course chapters for SC-200 did not exist yet when the questions were written; check consistency once they land.
