# K-dp-600-cs4 — report

## Produced
- `case-studies/dp600-cs4a-margies-travel.yaml` (online travel agency; lakehouse + eventhouse + Import model in PBIP + partner SQL endpoint) — 6 questions:
  commission-store (2.1.4 single), discovery-tools (2.1.2 dragdrop), top-destinations (2.3.2 dropdown T-SQL),
  trends-performance (3.2.1 single), pbip-repository (1.2.2 yes/no), partner-file (1.2.6 single).
- `case-studies/dp600-cs4b-lamna-healthcare.yaml` (hospital group; warehouse-centric + Import model on Azure SQL + Git client-tool flow) — 6 questions:
  research-columns (1.1.3 single), length-of-stay (2.2.1 dropdown T-SQL), moving-average (3.1.4 dropdown DAX WINDOW),
  cost-yoy-performance (3.2.2 multi), staffing-composite (3.1.7 single), client-tool-flow (1.2.1 ordering).
- Difficulty 4 / 6 / 2. Validator: 14 files, 0 problem(s).

## Deviations / overlap avoided
- Dropped a field-parameter question (cs2c Blue Yonder req. 6 tests the same decision), a Dual-mode question (cs1c Litware req. 6)
  and a FILTER -> KEEPFILTERS option (cs3a late-routes). Real-Time hub "find streams and KQL tables" replaced by Fabric/Azure event
  subscriptions (cs1c req. 3 covers the former).

## Not verified / doubts
- French UI labels not checked on a French Learn page: « Suspendre les visuels » (Pause visuals), « Tout mettre à jour » (Update all),
  « Appliquer plus tard » (Apply later). « Apporter des modifications à ce modèle » matches the course chapter 31.
- Distractors only: `TOP (10) PERCENT` and `DATE_BUCKET` support in Fabric Data Warehouse not verified (explanations do not depend on it).
- Granting column-level SELECT directly to a Microsoft Entra group (SG-Research) in a Fabric warehouse: the Learn CLS page shows a user principal and recommends roles; group principals assumed supported.
- DAX `/` by BLANK behaviour deliberately not claimed; requirement 4 of Lamna states "return a blank" so DIVIDE is decisive.
