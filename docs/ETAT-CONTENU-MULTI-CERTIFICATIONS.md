# État du contenu — programme multi-certifications Azure

17/11/2026 · complète `docs/SPECS-MULTI-CERTIFICATIONS.md`

## 1. Ce qui est livré

21 certifications (toutes celles du programme sauf AZ-104, déjà en ligne, et AI-500, encore en bêta). Pour chacune, dans `content/<code>/` :

- `blueprint.yaml` et `objectives.yaml` tirés du guide d'étude officiel (titres français officiels quand la page fr-fr existe) ;
- un cours complet anglais et français (`course/course.yaml` + `course/chapters/*.md`), tous les objectifs couverts ;
- une banque de questions dimensionnée pour dix examens blancs sans répétition, avec études de cas et séries Oui/Non pour les examens qui en comportent.

Tout le contenu est en `status: draft` et toutes les certifications en `active: false`.

| Cert | Chapitres | Mots EN | Questions | Études de cas (fichiers) | Séries (fichiers) |
|---|---|---|---|---|---|
| ai-103 | 15 | 30468 | 616 | 11 | 11 |
| ai-200 | 10 | 22196 | 616 | 11 | 11 |
| ai-300 | 15 | 34480 | 618 | 11 | 11 |
| ai-901 | 8 | 9494 | 473 | 0 | 0 |
| az-120 | 11 | 26682 | 615 | 11 | 11 |
| az-140 | 15 | 35012 | 618 | 11 | 11 |
| az-305 | 13 | 29296 | 616 | 11 | 11 |
| az-400 | 17 | 36664 | 621 | 11 | 11 |
| az-700 | 23 | 54491 | 613 | 11 | 11 |
| az-802 | 21 | 47179 | 616 | 11 | 11 |
| az-900 | 12 | 11344 | 471 | 0 | 0 |
| dp-300 | 16 | 36573 | 613 | 11 | 11 |
| dp-420 | 13 | 29978 | 617 | 11 | 11 |
| dp-600 | 8 | 17205 | 619 | 11 | 11 |
| dp-700 | 11 | 24209 | 620 | 11 | 11 |
| dp-750 | 14 | 31815 | 617 | 11 | 11 |
| dp-800 | 13 | 31702 | 621 | 11 | 11 |
| dp-900 | 12 | 13168 | 473 | 0 | 0 |
| sc-100 | 15 | 33918 | 612 | 11 | 11 |
| sc-200 | 12 | 26322 | 618 | 11 | 11 |
| sc-500 | 15 | 33591 | 614 | 11 | 11 |
| sc-900 | 15 | 17792 | 472 | 0 | 0 |

Total : 304 chapitres, ~633 000 mots anglais (autant en français), 12989 questions. Les banques non-fondamentales comptent ~615 questions dont ~55 dans les études de cas et ~33 dans les séries Oui/Non ; les fondamentaux ~470 (sans étude de cas ni série).

## 2. Contrôles passés

| Contrôle | Résultat |
| --- | --- |
| `loadCertification` (référentiel) | OK pour les 21 certifications |
| `validateCourse` | 0 problème, 100 % des objectifs couverts, parité EN/FR des sections |
| Validateur de questions (`tools/validate-questions.ts` paramétré par certification) | 0 problème sur toutes les banques |
| Unicité des identifiants (clé primaire globale) | 0 doublon sur l'ensemble des certifications |
| Simulation de dix examens (`tools/questions/simulate.ts` paramétré) | 10 examens sans question réutilisée et sans manque, pondérations des domaines respectées, pour chaque certification |

## 3. Ce qui n'est PAS fait — à lire avant toute publication

1. **Aucune relecture humaine.** Tout a été rédigé par des agents à partir de Microsoft Learn. Les questions restent en brouillon jusqu'à relecture, conformément au `CLAUDE.md`.
2. **Pas de vérification à l'aveugle.** Le pipeline `export-blind` / `compare-blind` n'a pas été exécuté sur ces banques. C'est la prochaine étape, certification par certification.
3. **Faits non vérifiés.** Plusieurs agents ont épuisé leur quota de consultation web avant la fin de leur lot. Chaque lot a un rapport dans `factory/reports/<tâche>.md` qui liste les faits non revérifiés, les écarts entre sources (en-us / fr-fr, docs / modules de formation) et les choix de terminologie. Environ 300 rapports sur 415 contiennent au moins un point à revoir.
4. **Points connus sur les référentiels** :
   - pas de date « Skills measured as of » pour AI-200, AI-300, SC-500 et AZ-802 (version = date de l'article) ;
   - durées AZ-305 et AZ-400 déduites, non imprimées sur la page ;
   - DP-600 / DP-700 : la page en-us affichait un ancien plan non daté, la version du 19/10/2026 a été suivie ;
   - DP-800 : conflit de version (12/03 contre 19/10/2026) ;
   - guides fr-fr en retard ou traduits automatiquement (SC-100, DP-900, SC-900, DP-700) : titres français corrigés ou retraduits, listés en tête des `objectives.yaml` ;
   - DP-420 renommée « Building AI Applications with Azure Cosmos DB » ;
   - le statut bêta de SC-500 et AI-200 reste à confirmer.
5. **Terminologie française** : les agents ont signalé des écarts entre les cours et Microsoft Learn fr-fr (ex. « score sécurisé » / « score de sécurité », « applets de commande » / « cmdlets »). Il faut trancher et enrichir le glossaire partagé, puis harmoniser.
6. **Études de cas et séries** : le format est celui d'AZ-104 ; leur fidélité aux vraies études de cas Microsoft n'est pas vérifiable sur Learn.
7. **`references` des chapitres** : vides dans `course.yaml` (le calcul à partir des banques est à faire par l'outil). Les durées de lecture (`minutes`) ont été recalculées à partir du nombre de mots.

## 4. Ordre de mise en ligne conseillé

1. AZ-900, AI-901, DP-900, SC-900 (fondamentaux, pas d'étude de cas, volume le plus faible : relecture rapide).
2. AZ-305 et AZ-700 (prolongement naturel d'AZ-104).
3. Le reste selon la demande.

Pour chaque certification : vérification à l'aveugle → relecture des rapports `factory/reports/*-<code>-*.md` → corrections → `status: reviewed` → `active: true`.

## 5. Dossier `factory/`

Outils et traces de production, à garder hors de l'application :

- `BRIEF.md` : règles données aux agents ;
- `profiles/<code>.md` : profil d'examen par certification (à intégrer au guide de rédaction, voir specs §5) ;
- `plans/`, `tasks/` : découpage en lots ;
- `reports/` : un rapport par lot (doutes, faits non vérifiés, écarts) ;
- `validate.ts`, `simulate.ts`, `check-cert.ts` : versions paramétrées (`CERT=<code>`) des outils du dépôt, à remplacer par l'option `--cert` prévue dans les specs.
