# K-az-802-cs1 — report

3 case studies, 16 questions, validator: 0 problem(s).

- az802-cs1a-munsons (food manufacturing, Hyper-V cluster + Arc plants): 3.1.13, 3.1.5, 2.2.4, 2.2.3, 1.2.2
- az802-cs1b-southridge (video production, file/storage servers + Azure File Sync): 5.3.5, 5.3.2, 5.3.10, 4.2.1, 5.1.4, 7.1.4
- az802-cs1c-humongous (insurance, two forests + Azure): 1.2.1, 6.1.3, 2.1.3, 7.3.4, 3.2.4

Types: single 6, dropdown 4, yesno 4, multi 1, ordering 1. Difficulty: 4 easy, 9 medium, 3 hard.

## Deviations

- Sibling CASES agents (cs2/cs3/cs4/sr*) wrote the same decisions in parallel: RODC PRP, DHCP hot standby, PDC time, checkpoint ProductionOnly, DCR XPath, DHCP reservation, Entra Password Protection order, secure channel repair, LAPS, PSO, Protected Users, Azure DC disks, AFS DFS-R migration, SMB over QUIC, FSRM, Azure Files RBAC, private endpoint DNS forwarder. I dropped or replaced my questions on those and moved to objectives nobody had used yet. The trust question keeps the forest-trust type and adds root domain and third-forest slots. az802-cs3b-forest-trust already tests trust direction, so mine doesn't.
- WebSearch budget was exhausted at the start, and WebFetch was rate-limited for a time. Every page was fetched directly by its URL.

## Facts not stated on the pages I fetched (general knowledge; check during review)

- Integration service display names other than "Guest Service Interface" (Data Exchange, Volume Shadow Copy Requestor) appear only in explanations.
- `Enable-DedupVolume -UsageType HyperV` (the page names the usage type "Hyper-V"; it doesn't show the parameter value).
- `Unlock-BitLocker -Password`, `Disable-BitLocker` decrypts the volume, and that KeyProtector[1] is the protector added after the password protector. That last point is stated as an assumption in the item.
- repadmin `/kcc` and `/syncall` semantics in the explanations (the repadmin reference page failed to load).
- External, shortcut and realm trust definitions in the explanations.
- `-NetAdapterInterfaceDescription` expects descriptions, not names (this follows from the parameter name).
