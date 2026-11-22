# Q-scs-c03-3c — report

28 questions (`scsc03-3c-`), 7 per objective 3.3.2–3.3.5. Types: single 22, multi 4, ordering 1, dragdrop 1. Difficulty: 4 easy / 14 medium / 10 hard. Validator: 0 problem(s).

## Choices and deviations

- 3.3.3: 6 Verified Access questions + 1 hybrid S3 interface endpoint question (on-premises private access, Resolver inbound endpoint, `aws:SourceVpce`).
- Cedar policies are described in prose, not shown as code; one NAA scope is shown as a `json` fence (identical EN/FR).
- Multi stems follow the sap-c03 style (no "complete solution / part of the solution" sentence; NOTE only).
- French: "Verified Access", "Network Access Analyzer", "VPC Block Public Access", "Connectivity Client" kept in English; "étendue d'accès réseau (Network Access Scope)", "connexion d'appairage de VPC (VPC peering)", "attachement" for transit gateway attachment, "mode appliance".

## Facts not verifiable, left out

- Whether Inspector network reachability scans need the SSM Agent (not stated on the fetched pages).
- Whether IAM Identity Center trust providers work with Verified Access TCP endpoints / Connectivity Client (RDP question uses an OIDC provider).
- Whether MACsec can be enabled later on an existing dedicated connection (the get-started page says to turn it on at creation; the questions only rely on that).
- Exact API enum values of Site-to-Site VPN PSK storage (console labels Standard / Secrets Manager used).

## Points to double-check in review

- `scsc03-3c-va-group-endpoint-policy` option b relies on "a group without a policy blocks all requests" (auth-policies page).
- `scsc03-3c-tgw-route-table-isolation` reference URL serves a page titled "How AWS Transit Gateway works - Amazon VPC".
