# QZ-az-802-12-sites-domains-forests — report

File: `content/az-802/quizzes/12-sites-domains-forests.yaml` (10 questions, `az802-qz-12-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 12-sites-domains-forests` → 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 1.2.1 | single | 1 | Automatic two-way transitive parent-child trust |
| 2 | 1.2.3 | single | 1 | The KCC creates the automatically generated connection objects |
| 3 | 1.2.2 | single | 2 | New building range without a subnet object → `New-ADReplicationSubnet` |
| 4 | 1.2.3 | single | 2 | Intersite latency is normal: site link interval, 180 min by default |
| 5 | 1.2.1 | dropdown | 2 | New Trust Wizard: forest trust, one-way outgoing, This domain only |
| 6 | 1.2.2 | single | 3 | Site still in DEFAULTIPSITELINK bypasses the new link's schedule |
| 7 | 1.2.1 | yesno | 3 | External trust nontransitive; forest trust covers all domains of the trusted forest |
| 8 | 1.2.2 | dropdown | 3 | Universal group membership caching + 15-minute interval without change notification |
| 9 | 1.2.3 | multi | 3 | GC partial replica, intersite timing, bridgeheads, KCC routing around a failed DC |
| 10 | 1.2.2 | single | 3 | Transitive path through a site without DC: link schedules must overlap |

No mock-exam decision reused with the same answer (all 28 questions of 1.2.1–1.2.3 read first).

## Chapter issues against current Learn (chapter not edited)

- **SID filtering default:** the chapter says it "is enforced on external and forest trusts". The current `netdom trust` reference describes `/quarantine:No` (accept any SID) as the default, while the archived "When to create an external trust" page says SID filter quarantining is enabled by default on new outgoing external trusts. Learn is inconsistent; not used in the quiz.
- **Minimum replication interval of 15 minutes:** not stated on the pages fetched (`Set-ADReplicationSiteLink` gives the 180-minute default only). Question 8 doesn't depend on the minimum.
- **"SMTP can't replicate domain partitions":** "Active Directory Replication Concepts" only says SMTP site links aren't recommended and won't be supported in future versions. Not used.
- **DEFAULTIPSITELINK:** the rule "remove the site from DEFAULTIPSITELINK, or the KCC routes by both links" isn't stated on the pages fetched; question 6 rests on cost/schedule rules (training module "Design sites, site links, and the replication topology") and on the observed symptom stated in the stem.
- **Possible additions to the chapter (from Learn):** the schedule of a transitive path is the overlap of its links' schedules, and site link options combine with a bitwise AND (change notification works end to end only if every link enables it); universal group membership is refreshed every 8 hours by default from the **Refresh cache from** site, and the first sign-in still needs a reachable global catalog.

## Doubts

- Question 5 keeps the New Trust Wizard labels in English in the French text ("One-way: outgoing", "This domain only"); the French UI labels weren't checked. Same for **Bridge all site links** in questions 6 and 10 (the chapter gives « Établir un pont entre tous les liens de sites », not verified).
- The trust and PRP procedures come from archived Windows Server 2003/2008 pages; no current page covers the one-side forest trust procedure.
- AD DS terms (approbation, lien de sites, serveur tête de pont, mise en cache de l'appartenance aux groupes universels) aren't in `content/glossary.yaml`, and `content/az-802/glossary.yaml` doesn't exist; the French follows the chapter.
