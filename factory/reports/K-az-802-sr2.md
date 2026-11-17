# K-az-802-sr2 — report

5 Yes/No series (15 questions), prefix `az802-sr2`, all `status: draft`. Validator: `CERT=az-802 npx tsx factory/validate.ts --prefix az802-sr2` → 20 files, 0 problem(s).

| Series | Objective (domain) | Answers (order 1-2-3) | Difficulty |
| --- | --- | --- | --- |
| az802-sr2-gmsa-farm | 1.3.3 (ad-ds) | N Y N | 2 1 2 |
| az802-sr2-hybrid-worker | 2.2.5 (hybrid) | N N Y | 2 1 2 |
| az802-sr2-nested-virt | 3.1.3 (vms) | Y N N | 2 1 3 |
| az802-sr2-dns-subnet-policy | 4.1.5 (networking) | N Y N | 3 2 2 |
| az802-sr2-fsrm-screen | 5.2.2 (storage) | N N Y | 3 1 1 |

Mix: 5 easy / 7 medium / 3 hard.

## Notes and doubts

- Overlap risk: K-az-802-sr1 writes series in parallel; I could not see its objectives. If sr1 also uses 1.3.3 (gMSA), 4.1.5, 5.2.2 or 3.1.3, check that the decisions differ.
- Hybrid worker: the extension-based worker page lists Windows Server 2016–2022 as supported (no 2025), so FS1 runs Windows Server 2022. The page also says not to install the extension on a domain controller (not used here). Linking a schedule with "Run on = Hybrid Worker" is not on the fetched pages (only starting a runbook with Run on / `-RunOn`); standard portal behaviour, not verified on Learn.
- DNS policy: `-Fqdn`, `-Condition AND`, `-ServerInterfaceIP`, `-ApplyOnRecursion`, `-RecursionScope` checked on the cmdlet reference. That a zone scope answers only from its own records (why the FQDN criterion is added in solution "Yes") is not stated on the fetched pages, so the explanation does not claim it.
- FSRM: French Learn uses both « écran de fichiers » and « filtre de fichiers »; I used « filtre de fichiers » / « exception de filtre de fichiers ». UI options kept in English (Active screening / Passive screening). « filtrage actif/passif » used only in stems ("filtre de fichiers actif/passif").
- Nested virtualization: "the setting cannot be applied while VM1 runs" rests on the Learn step "while the virtual machine is in the OFF state".
- The shared WebFetch budget (800/hour) ran out twice during the task; every fact used was fetched before or after.
