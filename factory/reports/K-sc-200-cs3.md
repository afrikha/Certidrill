# K-sc-200-cs3 — report

Case studies: `sc200-cs3a-trey-research` (pharma, hybrid on-premises + Sentinel ingestion), `sc200-cs3b-humongous-insurance` (insurer, Defender XDR), `sc200-cs3c-relecloud` (cloud-native Azure, Sentinel platform). 18 questions (6 + 6 + 6), each case covering the three domains. Validator: 21 files, 0 problem(s).

Avoided overlaps with cs1/cs2 (already in the repo): no rank-based device group membership, no "No automated response blocks containment", no Responder + Playbook Operator pairing, no facility-separation CEF/Syslog answer (cs3a uses the transformation case where the facility cannot change).

## Facts not verified word for word on the fetched pages (checked from general knowledge, please review)

- `sc200-cs3c-activity-policy`: the Learn page says the wizard scope is a subscription (optionally a resource group); setting the scope to a management group (MG-Prod) relies on standard Azure Policy assignment behavior, not on that page.
- `sc200-cs3a-live-response`: the page speaks of "basic" and "advanced" live response roles but does not give the exact RBAC permission label ("Live response capabilities: Advanced").
- Distractor descriptions not on a fetched page: IdentityLogonEvents (Defender for Identity / Entra authentication), EmailUrlInfo, EmailPostDeliveryEvents, EmailEvents, AADServicePrincipalSignInLogs, AuditLogs `Result` column, SigninLogs `ResultType`.
- `sc200-cs3b-unmanaged-contain` option a: automation levels apply to onboarded devices (inferred, not stated).
- Automation level labels differ between "Create and manage device groups" (e.g. "Full remediation") and "Automation levels in automated investigation and remediation" ("Full - remediate threats automatically"); the questions use the latter, as the attack disruption page does.

## Notes

- The automation levels page says that from September 1, 2026, AIR no longer runs as a separate investigation experience; no question relies on pending AIR approvals.
- The WebFetch budget ran out once during the task (shared across agents); 2.1.3 (Defender for Cloud workload alerts) was not used because nothing about it could be fetched.
