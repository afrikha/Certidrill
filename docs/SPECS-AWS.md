# Specs — Certifications AWS dans Certidrill

19/11/2026 · complète « Specs — Programme multi-certifications Azure » (`docs/SPECS-MULTI-CERTIFICATIONS.md`) et « État du contenu multi-certifications » (`docs/ETAT-CONTENU-MULTI-CERTIFICATIONS.md`)

## 1. Objectif

Ajouter un deuxième éditeur, AWS, avec le même produit que pour Azure : cours anglais et français, examens blancs réalistes, correction expliquée, suivi de progression. Première certification : **AWS Certified Solutions Architect – Associate (SAA-C03)**, la plus demandée sur le marché. Suivront Cloud Practitioner (CLF-C02) puis AI Practitioner (AIF-C01).

Règle inchangée : une certification = des fichiers dans `content/<code>/`, jamais de code propre à une certification. Ce qui varie selon l'éditeur se lit dans `certification.vendor` (`Microsoft`, `AWS`) et dans une petite table de configuration par éditeur (§3.1), pas dans des `if (code === …)`.

**Prérequis** : les adaptations du §3 des specs multi-certifications (option `--cert` des outils, glossaire partagé, blueprints sans étude de cas ni série, certification inactive invisible, Pass par certification, seed et CI sur toutes les certifications) sont faites ou faites en même temps.

## 2. Contenu livré

`content/saa-c03/` suit exactement le modèle des certifications Azure :

| Fichier | Contenu |
| --- | --- |
| `blueprint.yaml` | `vendor: AWS`, `active: false`, 130 minutes, 65 questions, score 720/1000, types `single` et `multi` uniquement, aucune étude de cas ni série (`count: 0`), 4 domaines pondérés comme le guide d'examen |
| `objectives.yaml` | Un groupe par « task statement » du guide d'examen ; objectifs = puces « Knowledge of » puis « Skills in », anglais mot pour mot, français du guide fr_fr |
| `course/` | Un chapitre par task statement + `00-getting-started`, anglais et français |
| `questions/<domaine>/` | Banque pour dix examens blancs sans répétition (≈ 680 questions), toutes `draft` |

État au 19 novembre 2026 : 23 chapitres (environ 54 500 mots en anglais, autant en français), 684 questions (567 `single`, 117 `multi`), 0 problème au validateur et à `check-cert`, aucun identifiant en double sur l'ensemble du dépôt, et 10 examens blancs simulés sans aucune question répétée (650 questions distinctes utilisées). Ce contenu n'a été relu par personne : il reste en `draft` tant qu'il n'a pas été relu. Huit rapports sur vingt (`factory/reports/*saa-c03*.md`) listent des points rédigés à partir de connaissances générales sur AWS, sans vérification sur une page récupérée : ce sont eux à relire en premier.

**CLF-C02 (AWS Certified Cloud Practitioner)**, livré ensuite dans `content/clf-c02/` sur le même modèle : guide d'examen v1.3 (29 octobre 2026), 90 minutes, 65 questions, 700/1000, 4 domaines (`concepts` 24 %, `security` 30 %, `technology` 34 %, `billing` 12 %), 135 objectifs, 22 chapitres (environ 27 700 mots en anglais), 683 questions (603 `single`, 80 `multi`, préfixe `clfc02-`). Résultats : 0 problème au validateur et à `check-cert`, 10 examens simulés sans répétition. Sept rapports sur dix-sept (`factory/reports/*clf-c02*.md`) signalent des points non vérifiés sur une page. Points d'actualité intégrés : nouveaux plans AWS Support de 2026 (Basic, Business Support+, Enterprise, Unified Operations), Amazon AppStream 2.0 désormais documenté sous le nom Amazon WorkSpaces Applications (le guide garde l'ancien nom), AWS Migration Hub et Application Discovery Service fermés aux nouveaux clients. Le travail de code décrit plus bas vaut pour les deux certifications sans adaptation particulière.

**AIF-C01 (AWS Certified AI Practitioner)**, dans `content/aif-c01/` : guide d'examen v1.2 (29 octobre 2026), 90 minutes, 65 questions, 700/1000, 5 domaines (`aiml` 20 %, `genai` 24 %, `foundation` 28 %, `responsible` 14 %, `governance` 14 %), 69 objectifs, 15 chapitres (environ 20 500 mots en anglais), 684 questions (préfixe `aifc01-`) : 526 `single`, 85 `multi`, 32 `ordering` (mise en ordre AWS) et 41 `dragdrop` (association AWS, « matching »). Le guide ne prévoit pas d'étude de cas. Résultats : 0 problème au validateur et à `check-cert`, 10 examens simulés sans répétition. Quatre rapports sur seize signalent des points non vérifiés sur une page. Points d'actualité intégrés : SageMaker Clarify et SageMaker Model Monitor fermés aux nouveaux clients (jamais bonne réponse pour un nouveau projet), Amazon Q Business et Amazon Q Developer fermés (successeurs Amazon Quick et Kiro), le guide écrit « Amazon Quick », la documentation « AWS Quick ».

**DVA-C03 (AWS Certified Developer – Associate)**, dans `content/dva-c03/` : nouvelle version qui remplace la DVA-C02 à partir du 1er décembre 2026 (la DVA-C02 est utilisée jusqu'au 30 novembre 2026, d'après la page de comparaison AWS). Guide sans numéro de version (`blueprint.version: 'DVA-C03'`), 130 minutes, 65 questions, 720/1000, 4 domaines (`development` 30 %, `security` 26 %, `deployment` 22 % « Testing and Deployment », `troubleshooting` 22 %), 72 objectifs, 13 chapitres (environ 30 800 mots en anglais), 683 questions (567 `single`, 116 `multi`, préfixe `dvac03-`), avec du code Python/JavaScript dans certaines questions. Il n'existe pas de guide en français : les objectifs français sont une traduction à faire relire. Résultats : 0 problème au validateur et à `check-cert`, 10 examens simulés sans répétition. Onze rapports sur dix-huit signalent des points non vérifiés sur une page. Points d'actualité : Amazon Q Developer fermé (successeur Kiro), Cloud9 fermé, SDK X-Ray en maintenance (fin de support février 2027, OpenTelemetry), AWS Copilot CLI hors support depuis juin 2026 (encore cité par le guide), CodeCommit de nouveau ouvert.

**Durée maximale d'une fonction Lambda** : la page des quotas Lambda indique 30 minutes (90 minutes pour certaines invocations de Lambda Managed Instances), la FAQ et la référence de l'API encore 15 minutes. Aucune question des quatre banques AWS ne dépend de cette valeur (scénarios d'au moins 2 heures) ; les cours donnent les deux valeurs. Détail : `factory/reports/F-lambda-timeout.md`.

Préfixe des identifiants de questions : `saac03-` (les identifiants restent une clé primaire globale, toutes certifications confondues).

Points propres à AWS dans le contenu :

- **Références** : pages `https://docs.aws.amazon.com/...` ou FAQ `https://aws.amazon.com/<service>/faqs/`, toujours l'URL anglaise.
- **Énoncés** : scénario de 2 à 5 phrases et un critère qui départage les réponses (« with the LEAST operational overhead », « MOST cost-effective »...). Choix multiple : 4 options. Réponse multiple : « Choose two. » sur 5 options ou « Choose three. » sur 6 options, avec `choose: 2` ou `3`.
- **Terminologie française** : noms de services et de fonctionnalités en anglais, noms communs comme dans la documentation AWS fr_fr (compartiment, groupe de sécurité, passerelle NAT, zone de disponibilité, Région). Les règles de rédaction sont dans `factory/BRIEF-AWS.md`.

## 3. Adaptations du code

### 3.1 Configuration par éditeur

Créer `lib/vendors.ts` : une entrée par éditeur, choisie à partir de `certification.vendor`.

| Clé | Microsoft | AWS |
| --- | --- | --- |
| `docsName` (libellé du lien « En savoir plus ») | Microsoft Learn | AWS Documentation |
| `docsHosts` (hôtes autorisés pour les références) | `learn.microsoft.com` | `docs.aws.amazon.com`, `aws.amazon.com` |
| `localizeDocsUrl(url, locale)` | `/en-us/` ↔ `/fr-fr/` (existant) | `docs.aws.amazon.com/...` → `docs.aws.amazon.com/fr_fr/...` en français ; `aws.amazon.com` inchangé |
| `trademark` (mention en pied de page) | texte actuel | « AWS, Amazon Web Services et les noms de services AWS sont des marques d'Amazon.com, Inc. ou de ses filiales. » |
| `scoreNote` (texte sous le score) | texte actuel (« Microsoft uses a scaled score… ») | « AWS publie un score pondéré de 100 à 1 000 (720 pour réussir) dont la formule n'est pas publique ; l'examen réel contient aussi 15 questions non notées. Ici, score = 1 000 × points obtenus / points possibles. » |
| `multiScoring` | `per_option` (existant) | `all_or_nothing` (voir §3.3) |

### 3.2 Références et liens

| Endroit | Aujourd'hui | À faire |
| --- | --- | --- |
| `lib/content/course.ts` | `LEARN` : les références de chapitre doivent être sur Learn | Vérifier contre `docsHosts` de l'éditeur de la certification |
| `lib/content/course.ts` (empreinte EN/FR des liens) | Normalise seulement `/en-us/`, `/fr-fr/` de Learn | Normaliser aussi `docs.aws.amazon.com/fr_fr/` ; le contenu AWS livré utilise déjà la même URL anglaise dans les deux langues |
| `lib/markdown.ts` `localizeUrl` | Learn seulement | Passer par `localizeDocsUrl` de l'éditeur |
| `lib/questions/schema.ts` | Message « at least one Microsoft Learn reference » | Message neutre (« at least one documentation reference ») et, dans `tools/validate-questions.ts`, avertissement si l'hôte n'est pas dans `docsHosts` |
| Écran de correction | Lien « Microsoft Learn » | Libellé `docsName` |

### 3.3 Notation des réponses multiples et des associations

L'examen AWS ne donne aucun point partiel sur une question à réponses multiples : il faut cocher toutes les bonnes réponses, et seulement elles. Aujourd'hui, `lib/exam/scoring.ts` donne un point par bonne option (règle Microsoft).

- Ajouter dans `blueprint.yaml` une clé facultative `blueprint.scoring.multi: per_option | all_or_nothing`, `per_option` par défaut. Le blueprint SAA-C03 livré contient déjà `all_or_nothing` (le schéma actuel l'ignore sans erreur).
- En `all_or_nothing`, une question `multi` compte pour 1 point, obtenu seulement si la réponse est exacte. Adapter `maxPoints`, `scoreItem`, les ventilations par domaine et par type, et le rapport.
- Même règle pour les questions d'association (matching) de l'AIF-C01, modélisées en `dragdrop` : clé `blueprint.scoring.dragdrop: per_element | all_or_nothing` (`per_element` par défaut, règle Microsoft actuelle : 1 point par élément bien placé). Le blueprint AIF-C01 contient `dragdrop: all_or_nothing`. Les questions `ordering` sont déjà notées tout ou rien dans `scoring.ts` : rien à changer.
- Écrire le code de façon générique (une règle par type lue dans `blueprint.scoring`) plutôt qu'un cas particulier AWS.
- Tests : une même question notée selon les deux règles (`multi` et `dragdrop`), et non-régression sur AZ-104.

### 3.4 Interface et textes

- **Catalogue** : regrouper les certifications par éditeur (accueil, tarifs, sélecteur du tableau de bord, menu des cours), avec un filtre éditeur s'il y a plus d'une certification active. Aucun logo AWS ou Microsoft, aucun badge officiel : on nomme seulement l'éditeur et l'examen.
- **Textes `messages/*.json`** : remplacer les mentions en dur de Microsoft ou Azure par des paramètres (`{vendor}`, `{docsName}`), ou par des clés propres à chaque éditeur. Sont concernés `common.disclaimer`, `home.learnText`, la FAQ « dumps », `report.approx`, `correction.learnMore`, `meta.homeDescription`. `homeDescription` cite les études de cas et les séries Oui/Non : ne les mentionner que si la structure de l'examen en contient.
- **Pied de page** : la mention de marque liste les éditeurs des certifications actives.
- **Examen** : rien de nouveau. L'interface sait déjà afficher `single` et `multi` (« Choose two. » est dans l'énoncé, `choose` dans le corps). L'écran de revue et le marquage des questions existent déjà, comme dans l'examen AWS.
- **SEO** : page d'accueil et page de tarifs de la certification ; `sitemap.ts` et l'image OG prennent l'éditeur en compte.

### 3.5 Outils et guides de rédaction

- `tools/questions/WRITING_GUIDE.md` : ajouter une section AWS reprenant `factory/BRIEF-AWS.md` (types, style des énoncés, références, terminologie).
- Glossaire : créer `content/_shared/glossary-aws.yaml` avec les termes AWS fr_fr retenus (compartiment, groupe de sécurité, passerelle NAT, sous-réseau, zone de disponibilité, Région, point de terminaison, politique…), puis l'utiliser dans les contrôles de terminologie.
- Langages de code : la DVA-C03 (Developer) montre du code applicatif. Ajouter `python`, `javascript`, `typescript` et `java` à `COURSE_CODE_LANGUAGES` (`lib/content/course.ts`) et à `LANGUAGES` (`lib/markdown.ts`, coloration Shiki), avec les alias `py`, `js`, `ts`. En attendant, les exemples Python et JavaScript des chapitres DVA-C03 sont dans des blocs `text` : une fois les langages ajoutés, passer ces blocs au bon langage (même bloc en EN et en FR). Les questions utilisent déjà des blocs `python` et `javascript`.
- `export-blind` / `compare-blind` / `simulate` : aucun changement en dehors de `--cert`. Vérifier que `simulate` respecte `all_or_nothing` pour le calcul de score.

### 3.6 Offres

Le Pass reste vendu par certification. Le prix SAA-C03 est à fixer (examen associate, même niveau qu'AZ-104). La page de tarifs regroupe les Pass par éditeur.

## 4. Procédure

| Étape | Terminé quand |
| --- | --- |
| A. Committer `content/saa-c03/`, `docs/SPECS-AWS.md`, `factory/BRIEF-AWS.md` et les rapports sur une branche | `content:validate` passe (le blueprint et le cours se chargent) |
| B. Configuration par éditeur, références et liens (§3.1, §3.2) | Les tests des URL localisées passent pour Learn et pour AWS ; liens AWS en français vers `fr_fr` |
| C. Notation `all_or_nothing` (§3.3) | Tests verts ; rapport SAA-C03 correct sur une tentative de test |
| D. Interface et textes (§3.4) | Aucune mention de Microsoft sur les pages SAA-C03 ; AZ-104 inchangé |
| E. Simulation et vérification à l'aveugle de SAA-C03 | 10 examens de 65 questions sans répétition ; écarts de la vérification à l'aveugle classés avec `factory/reports/*saa-c03*` |
| F. Relecture humaine, puis `reviewed` et `active: true` | Décision du propriétaire |

## 5. Critères d'acceptation

- SAA-C03 apparaît dans le catalogue sous « AWS » seulement quand `active: true`.
- Un examen blanc SAA-C03 dure 130 minutes, compte 65 questions de types `single` et `multi` uniquement, sans section d'étude de cas ni de série, et respecte les pondérations des domaines.
- Le rapport affiche un score sur 1 000 avec la note AWS (§3.1) ; une réponse multiple partiellement juste vaut 0.
- Les liens de correction et de cours ouvrent la documentation AWS en français pour un lecteur francophone.
- La mention de marque AWS figure dans le pied de page dès qu'une certification AWS est active.
- Aucune régression sur les certifications Microsoft (tests existants, notation `per_option`).
