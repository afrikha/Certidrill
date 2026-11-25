# FIX-sc-900-3 — chapters 41 to 44 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-900 41-service-trust-privacy 42-purview-compliance-management 43-information-protection-governance 44-insider-risk-ediscovery-audit` 0 problems; `content:validate --cert sc-900` 0 problems, 0 warnings; `check-quiz sc-900` (the four chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block or section marker changed. Note: the WebFetch budget ran out several times during the pass. All the pages below were fetched in the end, except `insider-risk-management` (eDiscovery naming) and `edisc`, which weren't needed for a change.

## 41-service-trust-privacy

| Finding | Learn | Change |
| --- | --- | --- |
| STP omissions: AI Resources, All Documents, Restricted Documents, My Download History, series subscriptions, 12-month availability | Confirmed (get-started-with-service-trust-portal): AI Resources sits under Reports, Whitepapers, and Artifacts; All Documents has a Cloud Service filter; My Download History covers 18 months with a CSV export; Restricted Documents are visible to Tenant Admin, Compliance Administrator, Security Administrator and Security Reader; documents stay available for at least 12 months | Reports row: AI resources added. "Two practical points" became "Practical points", with a new bullet for All Documents and My Download History. Restricted Documents, series subscriptions and the 12 months weren't added (detail beyond the objective) |
| FedRAMP tile (q8 doubt) | Confirmed: FedRAMP is only in Certifications, Regulations, and Standards | None |
| Subcontractors not tied to a principle | Confirmed (training unit "Describe Microsoft's privacy principles"): they come under "You control your data", and authorized subprocessors are audited in advance | Details bullet: principle and advance audit added |
| Government request: "provides a copy of the request" | Confirmed: "where legally permitted", Microsoft promptly notifies you, provides a copy of the request and directs the requesting party to you | Details bullet completed |

## 42-purview-compliance-management

| Finding | Learn | Change |
| --- | --- | --- |
| The Solutions page has four sections, including Core | Confirmed (purview-portal): Core (to set up and configure experiences across Purview), then Risk & Compliance, Data Governance, Data Security. The page doesn't say which solution belongs to which section | New bullet in "What the portal shows". The three-family table is unchanged |
| Compliance portal "replaced" | Purview-portal page: the compliance portal is "retired". For the classic governance portal it only says features were "relocated or retired" | None (wording is acceptable) |
| Baseline sources, 24-hour update, points per action per assessment | Confirmed (compliance-manager-scoring): baseline drawn mainly from NIST CSF and ISO, plus FedRAMP and GDPR; status updated within 24 hours; points per action per assessment, so the overall score can differ from the average of the assessment scores | Baseline bullet: sources added. Compliance Manager paragraph: "within 24 hours". Per-assessment counting not added (detail) |
| Points table 27/9/3/1/3/1 and the "no guarantee" trap | Re-checked: unchanged | None |

## 43-information-protection-governance

| Finding | Learn | Change |
| --- | --- | --- |
| Activity explorer: "copy to removable media" not on the activity explorer page | That page gives only examples and points to the portal filter. **endpoint-dlp-learn-about** lists "Copy to USB removable device" as auditable on Windows and macOS, says audited activities flow into Activity explorer, and gives "a file is copied to removable USB media" as its example | None. The chapter and `sc900-4a-expl-compare-yn` s3 (Yes) stand. The finding wasn't confirmed as an error |
| Content explorer path and "Data explorer" | Content explorer page: "Content Explorer (classic)", path Data Lifecycle Management > Explorers. Data explorer page: Information Protection > Explorers > Data explorer. Training unit "Analyze classified data with data and content explorer": under Information Protection > Explorers, Data explorer is the newer consolidated view and Content explorer (classic) is kept for continuity | The "Data explorer" sentence was rewritten: Data explorer is now the main view, and Content explorer (classic) remains available. The "under Information Protection" sentence stays (training unit) |
| Auto-labeling: client-side vs service-side | Confirmed (apply-sensitivity-label-automatically): client-side labeling in Office apps applies or recommends, and the user can reject it. Auto-labeling policies label content already in SharePoint or OneDrive, or emailed through Exchange, and don't support recommended labeling. Conditions: SITs and trainable classifiers | Label-capability table, "Be applied automatically" row |
| Custom trainable classifiers: English only | Confirmed (trainable-classifiers-learn-about: "Support for custom classifiers is limited to English") | Classification bullet: one sentence |
| Locked/unlocked records: SharePoint and OneDrive only; locked record's label removable by the container admin only | Confirmed (records-management restrictions table; Exchange records behave as locked). Regulatory record: nobody, not even a global administrator, can remove the label; its period can only be extended; the option must first be enabled with PowerShell | None (the chapter is right; detail beyond the objective) |
| DLP: Microsoft 365 Copilot location in preview | Not used by the chapter | None |

## 44-insider-risk-ediscovery-audit

| Finding | Learn | Change |
| --- | --- | --- |
| Patient data misuse is a preview template | Confirmed (insider-risk-management-policy-templates). Risky Agents and Risky browser usage are preview too. Risky AI usage, Data leaks, Security policy violations and Data theft by departing users aren't marked preview | Template sentence: patient data misuse is now said to be "still in preview" and is no longer listed as a template to recognize |
| Departing users trigger | Confirmed: an HR connector resignation or termination date **or** Microsoft Entra account deletion (the HR connector is optional) | Template sentence |
| "eDiscovery (Premium)" on the insider risk page | Not re-fetched (budget). The templates page doesn't mention eDiscovery | None. The chapter says "escalate the case to eDiscovery", in line with the unified eDiscovery experience |
| Audit: Premium enabled by default, intelligent insights, retention | Confirmed (audit-solutions-overview): enabled by default in both tiers; intelligent insights, audit log retention policies, and 1-year and 10-year retention are Premium only; default 1-year policy for AzureActiveDirectory, Exchange, OneDrive, SharePoint; policies by service, activity or user; up to one year, and up to 10 years with the per-user add-on | None |

## Mock-exam bank questions changed

None. No bank question of objectives 4.1.1–4.4.3 (106 files) contradicts a verified Learn fact.

Checked and left unchanged:
- Explorers: `sc900-4a-expl-*`. Removable media is confirmed by the endpoint DLP page; the 30 days, the audit-log source and the two Content Explorer role groups match.
- Auto-labeling and labels: `sc900-4b-sl-*` (none claims that an auto-labeling policy recommends a label).
- Classifiers: `sc900-4a-class-*`.
- Records and retention: `sc900-4b-rec-*` and `-ret-*`. `rec-regulatory` (option a, site admin can remove a locked record's label) and `rec-record-labels-yn` (records can be auto-applied; regulatory labels can't be, but the statement is about records) match the restrictions table.
- Insider risk: `sc900-4b-irm-*`. `irm-departing-user` says the template "can use" HR resignation dates (still true); no question uses Patient data misuse as an answer.
- Audit: `sc900-4b-audit-*`. `audit-ten-years`: 7 years is beyond the 1-year limit, so it needs the 10-year add-on, which agrees with "up to one year, and up to 10 years with the add-on". `audit-premium-adds-multi` (b, e) agrees with the comparison table.
- eDiscovery: `sc900-4b-edisc-*`.
- Portal, Compliance Manager, score, STP and privacy: `sc900-4a-portal-*`, `-cm-*`, `-score-*`, `-stp-*`, `-priv-*`. `priv-subcontractors` already ties subcontractors to "You control your data"; `priv-government-yn` already has "a copy of the request".

Notes for a reviewer:
- `sc900-4a-class-custom-classifier-steps` and `sc900-4a-class-trainable-contracts` (custom trainable classifier as the answer) don't state the language of the documents. Learn limits custom classifiers to English, so adding "written in English" to the stems would remove any doubt, especially for French readers. They weren't changed, because they don't contradict Learn.
- `sc900-4a-portal-sections-match` maps eDiscovery to Risk & Compliance with three sections only. The portal now also has a Core section, and Learn doesn't list which solution sits in which section. Not changed (see below).

## Quiz files

None changed. All four quizzes still agree with the corrected chapters (check-quiz 0/0). `sc900-qz-44-09` already states the HR-or-Entra trigger, and `sc900-qz-43-03` relies on the client-side vs auto-labeling-policy distinction that the chapter now makes.

## For a human decision

- **Solutions page sections**: Learn doesn't say which solutions are in Core vs Risk & Compliance / Data Governance / Data Security. The chapter's three-family table, `sc900-4a-portal-sections-match` (eDiscovery → Risk & Compliance) and `sc900-qz-42-01` (Compliance Manager → Risk & Compliance, from the training unit) rely on the training modules. To be checked in a live portal.
- **Content explorer path**: Learn is inconsistent. The content explorer (classic) page says Data Lifecycle Management > Explorers; the data explorer page and the training unit say Information Protection > Explorers. The chapter follows the training unit.
- **Explorer role-group names**: the data explorer page says "Data Explorer List viewer / Content viewer"; the training unit and the content explorer page say "Content Explorer List viewer / Content viewer". The chapter and `sc900-4a-expl-content-viewer-role` keep the Content Explorer names.
- **Chapter length**: 43 is 1,368 English words (fundamentals range 600–1,200). It was already 1,328 before this pass.

## French terms not settled (not in the glossary, or undecided)

- « Degré de sécurisation Microsoft » (42, existing text and bank): the glossary lists Secure Score as **undecided** (« score sécurisé » / « score de sécurité »), and neither form is used. Not changed.
- « cmdlet PowerShell » (44, existing text): cmdlet is **undecided** in the glossary. Not changed.
- New in this pass, fr-fr pages not fetched: « ressources sur l'IA », « Tous les documents (All Documents) », « Mon historique de téléchargement (My Download History) », « sous-traitants ultérieurs » (subprocessors), « stratégie d'étiquetage automatique » (auto-labeling policy), « Explorateur de contenu (classique) », « date de fin de contrat » (termination date, as in quiz 44), « en préversion ».
- Solutions-page section names (Core, Risk & Compliance, Data Governance, Data Security) are kept in English in FR (portal labels). Other chapters and the bank translate the last three (« Risque et conformité (Risk & Compliance) »).
