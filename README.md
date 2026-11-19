# Certidrill

Plateforme d'examens blancs de certifications informatiques, au plus près des conditions de l'examen réel. Première certification : **AZ-104** (Microsoft Azure Administrator).

> Site indépendant, non affilié à Microsoft ni approuvé par Microsoft. « Microsoft » et « Azure » sont des marques de Microsoft. Toutes les questions sont originales.

## Stack

Next.js 16 (App Router, TypeScript strict) · PostgreSQL 16 + Prisma 6 · Auth.js v5 (mot de passe argon2id + lien magique) · next-intl (FR/EN) · Tailwind CSS 4 · Zod 4 · Vitest · Docker Compose + Caddy.

## Principe directeur

Tout ce qui décrit une certification est de la **donnée versionnée** dans `content/<code>/`, jamais du code :

```text
content/az-104/
  blueprint.yaml     durée, nombre de questions, seuil, domaines et pondérations,
                     mix de types et de difficultés, structure (études de cas, séries)
  objectives.yaml    objectifs du guide d'étude, rattachés aux domaines
  questions/<domaine>/<id>.yaml   une question par fichier, EN + FR
  case-studies/<id>.yaml          scénarios d'études de cas (onglets)
  series/<id>.yaml                énoncés communs des séries Oui/Non
  course/course.yaml              cours : modules, ordre et titres des chapitres, statuts
  course/chapters/<id>.<en|fr>.md un chapitre par langue, découpé en sections
```

Ajouter une certification = ajouter un dossier `content/<code>/` puis `npm run seed`. Les fichiers sont validés par les schémas Zod de `lib/content/schema.ts` (pondérations sommables à 100 %, mix de difficulté = 1, codes uniques…) et `lib/questions/schema.ts` (un schéma par type de question : affichage, réponse attendue, réponse du candidat ; cohérence réponse/énoncé). `npm run content:check` valide tout le contenu sans base de données.

### Types de questions

| Code | Saisie (clavier compris) |
| --- | --- |
| `single` | boutons radio (flèches) |
| `multi` | cases à cocher « choisissez N » |
| `yesno_statements` | tableau Oui/Non par affirmation |
| `dropdown` | listes déroulantes dans une commande, un fichier ARM/Bicep/KQL (`layout: code`) ou un texte |
| `dragdrop` | glisser-déposer (souris, tactile, clavier) + liste déroulante par cible (alternative accessible, saisie principale sur mobile) |
| `ordering` | boutons « Ajouter », ↑ ↓ ✕, glisser pour réordonner |
| `hotarea` | tableau dont certaines cellules sont cliquables ; plusieurs consignes possibles |
| `series_yesno` | Oui/Non, énoncé commun à la série |

Les énoncés sont en Markdown (tableaux, blocs de code PowerShell / Azure CLI / JSON / Bicep / KQL colorés par Shiki), assainis côté serveur. Le navigateur ne reçoit qu'une projection sans réponse ni explication (`lib/questions/present.ts`). Aperçu interactif : **Administration → Questions**.

### Banque AZ-104

598 questions originales, en anglais et en français, de quoi faire **10 examens blancs sans aucune question en double** (`npm run content:simulate -- --cert az-104 10`). Elles se répartissent en 16 études de cas, 11 séries Oui/Non et 8 types de questions. Par domaine, la répartition suit les pondérations du rapport de score Microsoft. La terminologie française reprend celle de Microsoft Learn (glossaire partagé `content/glossary.yaml` : 564 termes en-us → fr-fr, typographie, termes à trancher ; `content/az-104/glossary.yaml` : intitulés officiels du guide d'étude). Les règles de rédaction sont dans `tools/questions/WRITING_GUIDE.md`.

Toutes les questions ont été vérifiées à l'aveugle : un agent indépendant y a répondu sans voir le corrigé, puis on a comparé ses réponses au corrigé (`tools/questions/export-blind.ts` puis `compare-blind.ts`). Les écarts ont été corrigés ou justifiés à partir de Learn.

Toutes les questions sont en statut `draft`, car une **relecture humaine reste nécessaire** avant la publication (§7 des specs) :

```bash
npm run content:status -- --cert az-104 reviewed <préfixe-id>         # après relecture
npm run content:status -- --cert az-104 published all --from reviewed
npm run seed
```

Une question signalée par 3 utilisateurs différents passe en `needs_review` en base et sort des examens. `npm run seed` ne la republie pas tant que son fichier n'a pas changé : après correction, incrémenter son `version` dans le YAML. Les questions, études de cas et séries supprimées du dépôt passent en `retired`.

### Cours AZ-104

Le cours (`docs/SPECS-COURS.md`) est rédigé en anglais et en français dans `content/az-104/course/` : 16 chapitres, 107 sections, les 81 objectifs du guide d'étude couverts. Chaque section commence par un marqueur `<!-- section: <id> | objectives: <codes> -->` suivi d'un titre de niveau 2 ; les règles de rédaction sont dans `tools/course/WRITING_GUIDE.md`. `npm run content:validate` vérifie le cours (fichiers des deux langues, parité EN/FR, objectifs, Markdown autorisé, références Learn) et donne chaque problème avec son fichier et sa ligne.

`npm run seed` charge le cours (tables `course_module`, `course_chapter`, `course_section`) : le dépôt fait foi, et un chapitre ou une section retiré des fichiers est supprimé en base avec la progression de lecture associée (`course_progress`, supprimée aussi avec le compte). Les chapitres restent en `draft` jusqu'à relecture humaine :

```bash
npm run content:status -- --cert az-104 reviewed 12-rbac --course      # un chapitre (préfixe d'id)
npm run content:status -- --cert az-104 published all --from reviewed --course
```

Le seed affiche le nombre de sections lues par les utilisateurs qu'il supprime : un identifiant de section renommé par erreur s'y voit tout de suite. Un dossier `course/` retiré supprime le cours de la certification.

**Back-office** (**Administration → Cours**, `/admin/course`) :
- la liste des chapitres donne pour chacun son module, son accès (gratuit ou complet), son statut, son nombre de sections, la date de dernière modification de son contenu (chapitre ou section), ses lecteurs et ses sections lues ;
- l'aperçu (`/admin/course/az-104/12-rbac`) affiche le chapitre tel que les lecteurs le voient, en anglais, en français ou les deux côte à côte, section par section, pour la relecture ;
- le statut se change depuis la liste ou l'aperçu. Le changement est inscrit au journal d'audit (`course.status`, avec le chapitre et les statuts avant et après, sans donnée personnelle) et apparaît dans « Derniers changements de statut ». Un chapitre publié est visible des lecteurs aussitôt.

**Statut et déploiement** : un statut fixé dans le back-office survit au seed (donc au déploiement). La colonne `fileStatus` garde le statut lu dans `course.yaml` au dernier seed, et le seed n'applique le statut du fichier que s'il a changé depuis. La dernière décision l'emporte donc : un clic dans le back-office, ou un `content:status --course` suivi d'un seed. Quand les deux divergent, la liste affiche « course.yaml : … » sous le statut, et le seed affiche le nombre de chapitres concernés. Pour que le dépôt reflète la publication, lancer ensuite `content:status` sur les mêmes chapitres.

**Lecture** (`/course`, groupe `(app)`, dans la langue de l'utilisateur) : sommaire avec progression, bouton « Reprendre » et chapitres à revoir après le dernier examen blanc (domaines sous le seuil), puis une page par chapitre (`/course/az-104/12-rbac#scopes` : l'ancre est l'identifiant de la section, stable d'un seed à l'autre). Chaque section a ses objectifs et un bouton « Marquer comme lu » (action serveur réversible, 60 par minute et par utilisateur). Le HTML d'une section est mis en cache en mémoire par (section, langue, version du contenu) ; les liens Learn s'ouvrent dans la langue du lecteur. Les lecteurs ne voient que les chapitres `published` ; un administrateur voit aussi ceux en relecture, avec un bandeau d'aperçu. L'entrée « Cours » du menu n'apparaît qu'une fois un chapitre ouvert à l'utilisateur.

**Accès** (§8) : au niveau gratuit, seuls les chapitres `free: true` de `course.yaml` sont lisibles ; les autres montrent leurs titres de sections et leurs objectifs, un cadenas et un lien vers l'écran d'offre (`/offer?reason=course`). Le corps d'une section verrouillée n'est jamais lu en base pour ce lecteur, donc jamais envoyé au navigateur, et une telle section ne peut pas être marquée comme lue. Le Pass, l'abonnement ou le rôle administrateur ouvrent tout le cours ; l'écran d'offre mentionne le cours dès qu'un chapitre est publié.

**Liens avec l'examen** : sous l'explication de chaque question de la correction, « Revoir le cours : … » mène aux sections qui couvrent son objectif (deux au plus, dans l'ordre du cours, avec un cadenas si le chapitre est payant) ; le rapport de score liste les chapitres des domaines sous le seuil ; le tableau de bord suggère les trois sections non lues qui couvrent le plus de questions manquées au dernier examen blanc. Rien de tout cela n'apparaît pendant l'examen.

### Autres certifications

`content/` contient 26 certifications : AZ-104 (en ligne), 21 autres certifications Microsoft, dont l'état est décrit dans `docs/ETAT-CONTENU-MULTI-CERTIFICATIONS.md`, et 3 certifications AWS (SAA-C03, CLF-C02, AIF-C01, voir « Plusieurs éditeurs »), toutes livrées en brouillon (`active: false`, tout en `status: draft`). Une certification inactive est invisible partout : accueil, tarifs, offre, tableau de bord, cours, plan du site, démarrage d'un examen, achat et déclaration d'un résultat réel. Seul le back-office (cours, prix) la montre.

- **Outils par certification** : `--cert <code>` (ou une liste, ou `all`) pour `content:validate`, `content:simulate`, `content:status`, `content:blind:export` et `content:blind:compare`. La CI valide et simule 10 examens sur toutes les certifications.
- **Fondamentaux** (AZ-900, AI-901, DP-900, SC-900) : le blueprint n'a ni `caseStudies` ni `series` ; l'examen n'a alors qu'une section, et `content:check` refuse un fichier d'étude de cas ou de série pour un tel blueprint.
- **Glossaire partagé** : `content/glossary.yaml` (typographie, termes en-us → fr-fr, termes à trancher sous `undecided`), complété par `content/<code>/glossary.yaml` (intitulés du guide d'étude, termes propres). `content:check` refuse un terme anglais avec deux traductions.
- **Vérification à l'aveugle** : `npm run content:blind:export -- --cert az-900 all out.md --split 4` découpe la banque en 4 fichiers sans corrigé (une étude de cas ou une série reste dans un seul fichier), chacun avec son `.map.json` ; un relecteur répond dans `out.1.answers.json`, puis `npm run content:blind:compare -- out.1.answers.json --map out.1.md.map.json --out ecarts.json`. Sans `--apply`, rien ne change de statut.
- **`factory/`** : traces de production des certifications (consignes, dont `BRIEF-AWS.md` pour AWS, profils d'examen, lots, rapports) et, dans `factory/blind/` et `factory/reports/blind-*.md`, la vérification à l'aveugle des fondamentaux et de SAA-C03.

**Progression par certification** : chaque certification garde son échelle, son indice de préparation, son XP, ses badges et sa maîtrise par domaine. Le tableau de bord montre d'abord l'indicateur global « Toutes mes certifications » (certifications travaillées, examens blancs passés et réussis, certifications prêtes, XP et badges cumulés, examens réels réussis, puis une ligne par certification), et ensuite la progression d'une seule certification : celle de `?certification=`, à défaut la dernière travaillée. Un sélecteur permet de passer de l'une à l'autre.

### Plusieurs éditeurs (Microsoft, AWS)

Spécification : `docs/SPECS-AWS.md` (§3). Ce qui dépend de l'éditeur se lit dans `certification.vendor` du `blueprint.yaml` et dans `lib/vendors.ts`, une entrée par éditeur ; aucun test sur un code de certification.

| Clé | Microsoft | AWS |
| --- | --- | --- |
| `docsName` (libellé des liens de correction) | Microsoft Learn | AWS Documentation |
| `docsHosts` (références autorisées) | `learn.microsoft.com` | `docs.aws.amazon.com`, `aws.amazon.com` |
| `localizeDocsUrl` (lecteur francophone) | `/en-us/` ↔ `/fr-fr/` | `docs.aws.amazon.com/…` → `docs.aws.amazon.com/fr_fr/…` ; `aws.amazon.com` inchangé |
| `scoring` (règle de l'examen réel) | `per_option`, `per_element` | `all_or_nothing` |

Les textes propres à chaque éditeur sont dans `messages/*.json`, sous `vendors.<clé>` : mention de marque (`trademark`) et note sous le score (`scoreNote`). Ajouter un éditeur, c'est une entrée dans `lib/vendors.ts` et ces deux textes.

- **Notation** : `blueprint.scoring.multi: per_option | all_or_nothing` et `blueprint.scoring.dragdrop: per_element | all_or_nothing`, facultatifs, à `per_option` / `per_element` par défaut (la règle Microsoft). En `all_or_nothing`, la question vaut 1 point, obtenu seulement si la réponse est exacte (toutes les bonnes options, et seulement elles ; tous les éléments bien placés). Les questions `ordering` sont déjà notées tout ou rien. La règle est enregistrée avec le blueprint (colonne `blueprint.scoring`) et appliquée au rendu de l'examen ; points, ventilations par domaine et par type, et rapport en découlent. `content:validate` signale (⚠, sans échec) un éditeur absent de `lib/vendors.ts`, une règle différente de celle de l'examen de l'éditeur, et une référence de question hors des `docsHosts` de l'éditeur (une vingtaine de questions AZ-400 citent `docs.github.com`). Les références de chapitre, elles, doivent être sur la documentation de l'éditeur : c'est une erreur.
- **Liens** : les liens de cours (corps et références) et les références de la correction ouvrent la documentation dans la langue du lecteur, quel que soit l'éditeur (`localizeDocsUrl`, choisi d'après l'hôte du lien). Le contrôle de parité EN/FR des chapitres compare les liens sans leur langue (Learn `/fr-fr/`, AWS `/fr_fr/`).
- **Catalogue** : accueil (« Certifications disponibles »), tarifs (liste des prix et cases du panier), sélecteur du tableau de bord (`optgroup`) et menu des cours sont groupés par éditeur, avec un filtre éditeur, dès que les certifications actives ont plusieurs éditeurs. Avec un seul éditeur, rien ne change. On nomme l'éditeur et l'examen, sans logo ni badge.
- **Textes** : la mention du pied de page cite les éditeurs des certifications actives et leurs marques (aucun quand aucune certification n'est active). Le texte de l'accueil sur la correction, la FAQ « dumps », la note sous le score et le libellé des liens de correction suivent l'éditeur. La description de l'accueil (`seo.homeDescription`) ne cite les études de cas et les séries Oui/Non que si un examen actif en contient, et nomme la documentation des éditeurs proposés. L'image de partage nomme les éditeurs proposés (servie à la demande) ; le plan du site date les pages aussi du dernier blueprint d'une certification active.
- **Contenu AWS** (branche `contenu-aws`) : SAA-C03, CLF-C02 et AIF-C01, chacun avec 683 ou 684 questions et un cours complet, en brouillon et inactifs. Les blueprints notent en `all_or_nothing`. Les questions `multi` et `dragdrop` n'ont pas la remarque « chaque sélection correcte vaut un point », que `content:validate` refuse sous cette règle. Vérification à l'aveugle de SAA-C03 : 684 réponses sur 684 conformes au corrigé (`factory/reports/blind-saa-c03.md`). Simulation de 10 examens sans répétition pour les trois certifications. Avertissements restants : références `repost.aws` (CLF-C02), `kiro.dev` et `strandsagents.com` (AIF-C01), hors des domaines de documentation AWS.
- **Terminologie** : chaque éditeur nomme son glossaire dans `lib/vendors.ts`. Microsoft : `content/glossary.yaml` (Microsoft Learn). AWS : `content/_shared/glossary-aws.yaml`, 130 termes vérifiés sur `docs.aws.amazon.com/fr_fr/` (`confirmed`, `source`), avec les noms gardés en anglais et, pour chaque terme, les variantes françaises à éviter (`avoid`). `content:validate` signale (⚠) ces variantes dans les questions et les chapitres français, hors code et hors « terme (variante) » : 23 avertissements à la livraison, à corriger à la relecture. `content:check` charge le glossaire et refuse ses conflits. Les termes où la documentation AWS hésite sont expliqués dans leur `note`.
- **Mentions légales et CGV** : elles nomment Microsoft et AWS (absence d'affiliation, marques) ; CGV en version du 20/11/2026.
- **Prix** : le Pass d'une certification AWS a le prix du tarif, comme AZ-104, tant qu'aucune ligne `plan_price` ne lui donne un autre prix (*Administration → Droits → Prix du Pass par certification*).

Mise en ligne d'une certification : vérification à l'aveugle, relecture des rapports `factory/reports/*-<code>-*.md` et corrections, puis, après relecture humaine, publication et activation, au choix :

- **dans le back-office**, *Administration → Certifications* : pour chaque certification, sa visibilité, ses questions et chapitres par statut, et si ses questions publiées permettent des examens complets (cinq examens d'essai assemblés comme pour un candidat). Les questions se publient par lot depuis *Administration → Questions* : le lot porte sur les questions des filtres affichés (certification, type, statut, domaine), après avoir coché la case de confirmation, sauf les questions `retired` et `needs_review` (signalées par des utilisateurs : elles ne reviennent qu'avec une nouvelle `version` de leur fichier, une fois corrigées). La case de confirmation porte le nombre de questions que le lot changera (celles qui ne sont pas déjà au statut choisi). Un examen tire une étude de cas ou une série entière ou pas du tout : un lot de publication publie celles de ses questions dont toutes les questions (hors `retired`) sont désormais publiées, y compris une étude de cas restée en brouillon sous des questions déjà publiées (la case de confirmation les compte : le lot peut alors être lancé même si aucune question ne change), et une question qui quitte `published` (retour en brouillon ou en relue) la retire des examens avec elle. Le cours se publie d'un bloc depuis la page Certifications. Le bouton *Activer* est refusé tant que les questions publiées ne permettent pas des examens complets. Chaque action est notée dans le journal d'audit (`question.status` avec la liste des questions, études de cas et séries changées, `course.status`, `certification.active`) ;
- **dans les fichiers** : `content:status -- --cert <code> published …` (et `--course`), puis `active: true` dans son `blueprint.yaml`, et `npm run seed`.

Ce qui est fait dans le back-office survit aux déploiements : le seed garde le statut d'une question, d'une étude de cas, d'une série ou d'un chapitre, et la visibilité d'une certification, tant que le fichier ne change pas la même valeur (colonnes `fileStatus` et `fileActive` : ce que disait le fichier au dernier seed). Le fichier reprend la main quand il change cette valeur, ou quand une question reçoit une nouvelle `version` (correction après relecture : elle revient au statut de son fichier, à republier). Les fichiers restent donc en `draft` sans empêcher une publication faite dans le back-office. Le seed ne refuse rien : après un déploiement qui renvoie des questions en brouillon, vérifier sur la page Certifications que chaque certification active permet encore des examens complets (colonne *Examen*). Quel que soit le statut de son groupe, une étude de cas ou une série dont une question ne peut pas entrer dans un examen (brouillon, signalée) n'est pas tirée : elle ne l'est jamais amputée.

Le seed charge toutes les certifications (environ 50 s sur le serveur, même sans changement : la lecture et la validation des ~13 000 questions dominent ; une question inchangée n'est pas réécrite). Le conteneur le lance à chaque démarrage, avant l'application.

## Démarrage en local

Prérequis : Node 22 et Docker Desktop (ou un PostgreSQL 16 déjà installé).

```bash
cp .env.example .env            # Windows (PowerShell) : copy .env.example .env
#   puis dans .env : AUTH_SECRET = une valeur aléatoire (openssl rand -base64 32)
#                    EXAM_INCLUDE_UNPUBLISHED="true"   (la banque est encore en draft)
#                    AUTH_LOG_MAGIC_LINKS="true"       (pas de SMTP en local)
npm install
npm run db:up                   # PostgreSQL 16 dans Docker (docker-compose.dev.yml)
npx prisma migrate deploy       # crée le schéma
npm run seed                    # charge content/ : référentiel, 598 questions et le cours
npm run user:create -- --email vous@example.com --password "au-moins-12-caracteres" --admin --locale fr
npm run dev                     # http://localhost:3000
```

Si le port 5432 est déjà pris (autre PostgreSQL sur le poste), `npm run db:up` échoue avec « port is already allocated » : mettre `DB_PORT=5433` dans `.env` et `localhost:5433` dans `DATABASE_URL`.

Se connecter sur http://localhost:3000/login avec ce compte, puis **Nouvel examen blanc** depuis le tableau de bord. **Administration → Questions** permet de prévisualiser chaque question en FR/EN. `npm run db:down` arrête la base (les données restent dans le volume `certidrill-dev`). Après une modification de `content/`, relancer `npm run seed`.

Pour essayer le moteur d'examen avant que la banque soit relue et publiée, mettre `EXAM_INCLUDE_UNPUBLISHED="true"` : les questions `draft` et `reviewed` entrent alors dans les examens (jamais celles signalées, en `needs_review`) (l'écran d'accueil signale qu'il y a moins de questions qu'à l'examen réel).

Les comptes se créent avec `npm run user:create` ou depuis **Administration → Utilisateurs** ; les inscriptions publiques (`/signup`) s'ouvrent depuis **Administration → Droits** (interrupteur `signup.open`, fermé par défaut). Sans serveur SMTP (`EMAIL_SERVER`), mettre `AUTH_LOG_MAGIC_LINKS="true"` pour que les liens magiques et les liens de confirmation d'inscription s'affichent dans le journal du serveur.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:components` | Tests des composants React (Testing Library, jsdom) |
| `npm run test:coverage` | Unitaires + intégration + composants avec couverture (≥ 80 % global, ≥ 90 % sur `lib/exam`, rapport `coverage/`) — base jetable requise |
| `npm run test:e2e` | Tous les tests Playwright (parcours + non-régression) sur un build de production — même contrainte de base jetable |
| `npm run test:regression` | Seulement la suite de non-régression Playwright (`tests/e2e/regression`) |
| `npm run content:check` | Valide `content/` (schémas et références croisées, cours compris) |
| `npm run content:validate -- --cert <code\|all> [--prefix <p>] [--course] [--chapters <ids>]` | Valide les fichiers de questions (toute la banque avec `--cert` seul) et le cours, et liste tous les problèmes ; sans argument, valide les cours |
| `npm run content:simulate -- --cert <code\|all> [n=10]` | Simule `n` examens d'un même candidat avec le vrai assembleur : aucune question répétée, aucun manque, pondérations des domaines respectées |
| `npm run content:blind:export -- --cert <code> <préfixe\|all> <out.md> [--split <n>]` | Exporte des questions sans corrigé pour une vérification à l'aveugle (`compare-blind.ts` compare ensuite, `--out` écrit les écarts) |
| `npm run content:status -- --cert <code\|all> <statut> <préfixe\|all> [--from <statut>] [--course]` | Change le statut de questions en masse, ou de chapitres avec `--course` |
| `npm run test:integration` | Tests sur une vraie base PostgreSQL — `DATABASE_URL` doit pointer vers une base **jetable** (les tables sont vidées) |
| `npm run seed` | Charge `content/` en base (idempotent ; la base est reconstructible) |
| `npm run user:create` | Crée un compte (`--email`, `--password`, `--name`, `--admin`, `--locale`) |
| `npm run stripe:sync-prices` | Crée ou retrouve dans Stripe le prix de chaque tarif actif et l'enregistre dans `plan` (`-- --dry-run` pour voir sans rien changer) |

## Tests et qualité

| Niveau | Outil | Dossier | Ce qui est vérifié |
| --- | --- | --- | --- |
| Unitaires | Vitest | `tests/unit` | Notation, assembleur, schémas, rendu de toute la banque, sécurité (CSRF, limitation de débit, mots de passe), journaux |
| Composants | Vitest + Testing Library (jsdom) | `tests/components` | Saisie des 8 types de questions, écran d'examen (chrono, sauvegarde hors ligne, sections, série, révision, soumission) en FR/EN |
| Intégration | Vitest + PostgreSQL réel | `tests/integration` | Routes `app/api/**` (authentification, CSRF, propriété, aucune réponse avant soumission), server actions, Auth.js (mots de passe, limitation), inscription et confirmation d'adresse, droits (quota, Pass, correction filtrée, attribution manuelle, journal d'audit), paiement (session Checkout, webhooks signés localement : rejoués, simultanés, dans le désordre, en échec), file d'e-mails, session d'examen, résultats |
| End-to-end | Playwright (build de production) | `tests/e2e` | Parcours complets dans Chromium : examen, reprise, expiration, résultats, saisie au clavier ; inscription, attribution d'un Pass, écran d'offre ; achat d'un Pass, puis de deux Pass en une fois, de bout en bout contre un faux Stripe local (`tests/e2e/fake-stripe.mjs`) |
| Non-régression | Playwright | `tests/e2e/regression` | Instantanés de l'arbre d'accessibilité (ARIA) de chaque type de question et des pages publiques en FR/EN, contrôle d'accès des pages, contrat HTTP de l'API, en-têtes de sécurité |

**Couverture** : la CI échoue sous **80 %** (lignes, instructions, fonctions ; 70 % des branches) sur `lib/`, `components/` et `app/api/`, et sous 90 % sur `lib/exam`. Les pages Next.js (`app/**/page.tsx`, layouts) sont couvertes par Playwright, pas par la mesure lcov.

**Non-régression** : les instantanés ARIA (`tests/e2e/regression/__snapshots__/*.aria.yml`) sont versionnés. Ils ne dépendent ni des polices ni du système, contrairement aux captures d'écran. Un changement d'interface voulu se valide avec `npm run test:regression -- --update-snapshots`, puis la relecture et le commit du diff. En CI, un instantané absent ou différent fait échouer le build. Chaque bug corrigé doit être accompagné du test qui l'aurait détecté.

**Sonar (SonarQube Cloud)** : `sonar-project.properties` et l'étape Sonar du job `check`. L'analyse reprend la couverture lcov de Vitest. La CI attend le résultat de la *quality gate* (par défaut « Sonar way » : couverture du nouveau code ≥ 80 %, pas de nouveau bug ni de vulnérabilité, duplication ≤ 3 %, hotspots de sécurité relus) et échoue si elle est rouge. Mise en place :
1. Sur https://sonarcloud.io, se connecter avec GitHub, importer l'organisation et le dépôt (offre gratuite : jusqu'à 50 000 lignes de code privé).
2. Dans le projet, *Administration → Analysis Method* : désactiver *Automatic Analysis* (l'analyse passe par la CI).
3. Créer un jeton (*My Account → Security*) et l'ajouter comme secret de dépôt GitHub `SONAR_TOKEN`.
4. Si la clé de projet ou l'organisation diffère de `afrikha_Certidrill` / `afrikha`, définir les variables de dépôt `SONAR_PROJECT_KEY` / `SONAR_ORGANIZATION`. Pour un SonarQube auto-hébergé, définir `SONAR_HOST_URL`.

Sans `SONAR_TOKEN`, l'étape est ignorée et un avertissement s'affiche. L'offre gratuite n'analyse que la branche principale `main` et les pull requests qui la visent : sur toute autre branche, l'étape est ignorée.

## Revue automatique des PR

Le workflow `.github/workflows/claude-review.yml` fait relire chaque pull request par Claude. La relecture porte en priorité sur l'intégrité de l'examen, les bugs dans `lib/exam`, la sécurité et le RGPD, et la qualité des questions. Les problèmes sont signalés en commentaires sur les lignes concernées, avec une synthèse en français. Il faut définir **un** secret de dépôt : `ANTHROPIC_API_KEY`, ou bien `CLAUDE_CODE_OAUTH_TOKEN` (obtenu avec `claude setup-token`). Il faut aussi installer l'application GitHub Claude sur le dépôt. Sans secret, la revue est simplement ignorée.

## Production (VPS)

Services du `docker-compose.yml` : `db` (PostgreSQL), `migrate` (migrations + seed à chaque déploiement), `app` (Next.js standalone), `caddy` (HTTPS), `backup` (pg_dump quotidien dans `./backups`, 14 jours). Le DNS est chez Ionos et pointe directement sur le serveur.

### Serveur actuel : partagé avec ClaiRH

Depuis le 14/11/2026, Certidrill (`/opt/certidrill`) partage son VPS avec ClaiRH (`/opt/clairh`), un autre projet qui a des clients. Les ports 80 et 443 n'ont qu'un propriétaire : c'est le **Caddy de ClaiRH** (`clairh-caddy-1`) qui sert les deux sites. Procédure complète du serveur : runbook ClaiRH `docs/runbooks/vps-deployment.md`, § 4 bis.

- **Le service `caddy` de Certidrill est désactivé** par `/opt/certidrill/compose.override.yml`, qui le range dans un profil jamais activé (`profiles: ["disabled"]`). `app`, `db`, `migrate` et `backup` tournent comme avant. `deploy/Caddyfile` et `SITE_ALIASES` ne servent donc pas sur ce serveur.
- **La configuration HTTPS de Certidrill** est dans `/opt/clairh/deploy/vps/sites/certidrill.caddy`, qui n'est versionné dans aucun dépôt. Elle reprend `deploy/Caddyfile` : bloc `certidrill.com` (compression, HSTS, `-Server`, limites de corps de 64 KiB sur `/api/*` et de 256 KiB sur le webhook Stripe, `reverse_proxy certidrill-app-1:3000` avec `header_up X-Real-IP {client_ip}`), puis `www.certidrill.com`, `certidrill.fr` et `www.certidrill.fr` redirigés en 301 vers `https://certidrill.com{uri}`. Toute modification de `deploy/Caddyfile` (en-têtes, limites, routes, domaines) doit y être reportée à la main, puis appliquée :
  ```bash
  cd /opt/clairh/deploy/vps
  docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
  ```
- **Réseau** : `clairh-caddy-1` est branché sur le réseau `certidrill_default` (déclaré `external` dans `/opt/clairh/deploy/vps/compose.override.yml`) et joint l'application par son nom de conteneur, `certidrill-app-1`, port 3000. Ces deux noms sont écrits en dur côté ClaiRH.
- **Certificats** : obtenus et renouvelés par le Caddy de ClaiRH (volume `clairh_caddy-data`).
- **Adresse des visiteurs** : le bloc global `trusted_proxies` de Cloudflare n'a pas été repris, car le bloc global du Caddy de ClaiRH vaut pour tout le serveur. Tant que les noms pointent directement sur le serveur, `{client_ip}` est bien l'adresse du visiteur. Si Cloudflare passe en mode proxy, ce serait l'adresse de Cloudflare et les limites par IP compteraient ensemble les visiteurs d'un même nœud : à régler avec ClaiRH.

Déployer une nouvelle version, après une sauvegarde :

```bash
cd /opt/certidrill
docker compose exec backup pg_dump -h db -U certidrill -d certidrill -Fc -f /backups/avant-maj-$(date +%F-%H%M).dump
git pull --ff-only origin main
docker compose up -d --build        # migrate applique les migrations, puis app redémarre
docker compose ps -a                # migrate : Exited (0) ; app (certidrill-app-1), db, backup : Up
curl -sI https://certidrill.com | head -3   # 200, ou 307 (redirection de langue)
```

À ne **jamais** faire dans `/opt/certidrill` sans coordination avec ClaiRH :

- `docker compose down` : Docker essaierait de supprimer le réseau `certidrill_default`, où le Caddy de ClaiRH est branché. Mettre à jour avec `docker compose up -d` (ou `docker compose build && docker compose up -d`) ;
- renommer le projet compose, le service `app` ou le réseau, ou passer `app` à plusieurs répliques. Si c'est indispensable, mettre à jour dans la foulée `certidrill.caddy` et `/opt/clairh/deploy/vps/compose.override.yml` ;
- retirer l'override, réactiver le Caddy de Certidrill ou publier quoi que ce soit sur les ports 80 et 443 : cela couperait les deux sites ;
- `docker system prune -a --volumes`, `docker volume prune` ou `docker network prune` : les volumes de ClaiRH (`clairh_*`) sont sur la même machine. Pour faire de la place, se limiter à `docker image prune` sur les images de Certidrill ;
- redémarrer Docker ou le VPS sans prévenir.

La mémoire est partagée : ClaiRH en utilise une bonne partie, davantage quand son instance de démonstration tourne. Les sauvegardes de ClaiRH sont à part ; le service `backup` de Certidrill n'est pas concerné.

**Si Certidrill ne répond plus** : un 502 sur `certidrill.com` signifie presque toujours que `certidrill-app-1` est arrêté, renommé, ou plus sur le réseau `certidrill_default`.

```bash
curl -sI https://certidrill.com | head -3
cd /opt/clairh/deploy/vps && docker compose ps caddy                 # le Caddy commun doit être Up
docker compose logs --tail 100 caddy | grep -i certidrill            # erreurs de proxy ou de certificat
docker inspect clairh-caddy-1 --format '{{json .NetworkSettings.Networks}}' | grep -o certidrill_default
cd /opt/certidrill && docker compose ps                              # app doit être Up et s'appeler certidrill-app-1
```

Revenir à un Caddy propre à Certidrill coupe ClaiRH le temps de la bascule : à faire avec ClaiRH. Arrêter son Caddy (`cd /opt/clairh/deploy/vps && docker compose stop caddy`), retirer le profil `disabled` de `/opt/certidrill/compose.override.yml`, puis `cd /opt/certidrill && docker compose up -d caddy`.

### Serveur dédié (installation autonome)

Sur un serveur où Certidrill est seul, son propre Caddy sert le site avec `deploy/Caddyfile` :

```bash
cp .env.example .env    # AUTH_SECRET, POSTGRES_PASSWORD, SITE_DOMAIN, SITE_ALIASES, EMAIL_SERVER…
docker compose up -d --build
docker compose run --rm migrate npm run user:create -- --email vous@example.com --admin
```

L'application lit `X-Real-IP` sans vérifier qui l'envoie : c'est sûr parce que seul Caddy publie des ports (80 et 443) et qu'il remplace toujours cet en-tête. Ne jamais publier le port 3000 de `app` (pas de `ports:` sur ce service), sinon n'importe qui pourrait choisir son adresse et contourner les limites par IP (connexion, inscription). Cela vaut aussi sur le serveur partagé. Si Cloudflare est placé en frontal, `deploy/Caddyfile` fait déjà confiance à ses plages d'adresses (liste à mettre à jour si Cloudflare la change) : pour ces requêtes seulement, l'adresse du visiteur est lue dans `CF-Connecting-IP`. Après une modification du Caddyfile, le valider avant de recharger :

```bash
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

### Domaines

`www.certidrill.com`, `certidrill.fr` et `www.certidrill.fr` redirigent en 301 vers `https://certidrill.com`, chemin et paramètres conservés : les moteurs de recherche n'indexent qu'une adresse. Sur le serveur partagé, ces redirections sont dans `certidrill.caddy` ; sur un serveur dédié, `deploy/Caddyfile` redirige `www.<SITE_DOMAIN>` et les domaines de `SITE_ALIASES` (`.env` : `SITE_ALIASES="certidrill.fr www.certidrill.fr"`, jamais `SITE_DOMAIN` ni `www.<SITE_DOMAIN>`, sinon Caddy refuse de démarrer ; puis `docker compose up -d caddy`). Sur les alias, HSTS est envoyé sans `includeSubDomains` dans `deploy/Caddyfile` : leurs sous-domaines restent libres.

Chaque nom doit avoir un enregistrement DNS vers le serveur, sinon Caddy ne peut pas obtenir son certificat (le site principal n'est pas affecté). Zone DNS Ionos :

| Domaine | Enregistrement |
|---|---|
| `certidrill.com` | `A @` → adresse du serveur ; `CNAME www` → `certidrill.com` |
| `certidrill.fr` | `A @` → adresse du serveur (à la place de la page de parking Ionos) ; `CNAME www` → `certidrill.fr` |

Supprimer tout enregistrement `AAAA @` laissé par Ionos : le serveur n'a pas d'adresse IPv6 déclarée, et un `AAAA` vers la page de parking enverrait les visiteurs en IPv6 chez Ionos et ferait échouer le certificat (Let's Encrypt essaie l'IPv6 d'abord). Un domaine qui n'envoie pas d'e-mail se protège contre l'usurpation avec `TXT @` `v=spf1 -all` et `TXT _dmarc` `v=DMARC1; p=reject`, à la place des enregistrements de messagerie Ionos par défaut, s'il n'y a pas de boîte sur ce domaine.

### Référencement

Les pages publiques ont une adresse par langue : `/en`, `/fr`, `/en/pricing`, `/fr/pricing` (`lib/i18n/routing.ts`). `proxy.ts` sert `/fr/pricing` avec la page `/pricing` en français, et redirige `/` et `/pricing` (307), paramètres conservés, vers la langue du visiteur : celle de la dernière page publique ouverte pendant la session, sinon celle choisie avec le sélecteur, sinon `Accept-Language`, sinon l'anglais. Ouvrir `/fr` puis taper `certidrill.com` ramène donc sur `/fr`, même si le choix enregistré est l'anglais : le choix revient à la fermeture du navigateur. Deux cookies (`lib/i18n/cookie.ts`) : `NEXT_LOCALE`, le choix fait avec le sélecteur de langue, gardé un an et seul à changer la langue du compte (celle des e-mails) ; `NEXT_LOCALE_PAGE`, cookie de session posé en ouvrant `/fr` ou `/en`, pour que la connexion et l'application suivent la langue lue, sans jamais remplacer le choix. Chaque page publique déclare son adresse canonique, ses traductions (hreflang, `x-default` = anglais) et ses cartes Open Graph et X ; l'accueil décrit aussi le site en JSON-LD (`Organization`, `WebSite`). Le reste du site (connexion, application, admin) garde une seule adresse, sa langue vient de ces cookies, et porte `noindex`.

`/robots.txt` et `/sitemap.xml` sont construits à partir de `AUTH_URL`, qui doit donc être l'adresse publique (`https://certidrill.com`). Après un déploiement, déclarer `certidrill.com` dans Google Search Console (validation par un enregistrement `TXT` dans la zone Ionos) et y soumettre `https://certidrill.com/sitemap.xml`.

## E-mails (liens magiques)

Les liens de connexion partent par SMTP (`EMAIL_SERVER`), dans la langue du compte, en texte et en HTML. Ils expirent au bout de 15 minutes. La connexion SMTP est toujours chiffrée : `smtps://` (port 465), ou `smtp://` avec STARTTLS obligatoire (port 587).

Il faut un service d'envoi transactionnel (Brevo, Scaleway TEM, Amazon SES…). Un envoi direct depuis le VPS finit en spam, et le port 25 y est souvent bloqué.

1. **Déclarer le domaine** chez le fournisseur, puis ajouter dans la zone DNS (Ionos) les enregistrements qu'il donne :
   - **SPF** : `TXT @`, `v=spf1 include:<valeur du fournisseur> ~all`. Un seul enregistrement SPF par domaine : fusionner les `include:` s'il en existe déjà un.
   - **DKIM** : les `CNAME` ou `TXT` fournis.
   - **DMARC** : `TXT _dmarc`, `v=DMARC1; p=none; rua=mailto:dmarc@<domaine>`. Passer à `p=quarantine` quand les rapports sont propres.
2. **Renseigner `.env`** sur le serveur, jamais dans un dépôt ni une conversation. Encoder les caractères spéciaux de la clé : `%40` pour `@`, `%23` pour `#`, `%25` pour `%`, et `%24` pour `$`. Docker Compose interprète `$` dans `.env` : `p$w` deviendrait `p`.
   ```bash
   EMAIL_SERVER="smtp://<login>:<clé SMTP>@<serveur SMTP>:587"
   EMAIL_FROM="Certidrill <no-reply@certidrill.com>"
   AUTH_LOG_MAGIC_LINKS="false"
   ```
3. **Vérifier**, puis recharger l'application :
   ```bash
   docker compose run --rm migrate npm run email:test -- --to vous@example.com   # --locale fr en option
   docker compose up -d --force-recreate app
   ```
   `email:test` se connecte, s'authentifie et envoie un message de test. Le mot de passe n'apparaît jamais dans la sortie, ni l'identifiant s'il fait au moins 3 caractères, que ce soit en clair, décodé ou en base64. En cas d'échec, le code d'erreur indique l'étape fautive : `EAUTH` (identifiants), `ECONNECTION` ou `ETIMEDOUT` (serveur ou port), `ESOCKET` (TLS). Dans le message reçu, les en-têtes doivent montrer `spf=pass`, `dkim=pass` et `dmarc=pass`.

Une boîte ou une redirection Ionos sur `dmarc@` ou `contact@<domaine>` permet de recevoir les rapports DMARC et les réponses.

## Paiement (Stripe)

Le Pass s'achète par Stripe Checkout, en paiement unique. Aucune donnée de carte ne passe par le serveur, qui ne garde que les références Stripe. Le navigateur n'envoie que le code du tarif et les certifications : le prix est relu sur le serveur (table `plan`, ou `plan_price` pour une certification qui a son propre prix).

**Panier** : on peut acheter en une fois le Pass de plusieurs certifications (10 au plus), en les cochant sur `/pricing` ou l'écran d'offre, qui affichent le total. Une seule session Stripe porte une ligne par Pass, dans une seule devise ; la base garde une ligne `payment` par Pass, reliées par `checkoutId`. Le webhook traite l'achat en entier : tous les Pass sont accordés, ou, si Stripe a encaissé moins que la somme des prix (ou dans une autre devise), tout l'achat est retenu. Le montant encaissé et la TVA sont répartis entre les Pass au prorata de leur prix, au centime près. Chaque Pass a son e-mail de confirmation, et l'historique de facturation montre une ligne par Pass. Un remboursement partiel (un seul Pass) se fait dans le tableau de bord Stripe, sur le paiement commun, puis le Pass concerné se révoque à la main (voir *Remboursements et litiges*). Si l'acheteur quitte la page de paiement, il retrouve son panier coché. Le droit n'est accordé que par le webhook signé de Stripe, jamais par la page de retour.

Le paiement en ligne reste **fermé** tant que l'interrupteur « Paiement en ligne ouvert » (`billing.checkout.enabled`, dans *Administration → Droits*) est désactivé. Avec une clé live (`sk_live_…` ou `rk_live_…`), il reste aussi fermé, quel que soit l'interrupteur, tant que les CGV contiennent un passage entre crochets (le médiateur de la consommation, à choisir) : `lib/billing/terms.ts`, vérifié par `tests/unit/terms.test.ts`. Le paiement en mode test n'est pas concerné.

**CGV et droit de rétractation** (lot C) : les conditions générales de vente sont sur `/terms` (messages `terms`, en français et en anglais, la version française faisant foi), liées dans le pied de page et dans le formulaire d'achat. Le Pass étant fourni dès le paiement, l'acheteur doit cocher une case qui accepte les CGV, demande l'accès immédiat et reconnaît perdre son droit de rétractation (art. L221-28, 13° du Code de la consommation) : sans elle, le bouton reste grisé et l'API refuse l'achat (400). Le texte exact coché, dans la langue de la page (déterminée par le serveur comme pour l'affichage, d'après les cookies de langue puis `Accept-Language` ; le corps de la requête n'en décide pas), sa date et la version des CGV (`TERMS_VERSION`, à changer avec le texte) sont gardés sur chaque ligne `payment` (`waiverText`, `waiverAcceptedAt`, `termsVersion`), puis rappelés dans l'e-mail de confirmation, avec le lien des CGV. Les Pass ne sont pas remboursables, sauf défaut de conformité.

**TVA** : Square-soft relève de la franchise en base (`VAT_EXEMPT` dans `lib/billing/terms.ts`). Les prix s'affichent avec « TVA non applicable, art. 293 B du CGI » au lieu de « TTC », et chaque achat demande à Stripe une facture (`invoice_creation`) dont le pied de page porte le vendeur et cette mention. Le nom affiché en tête de facture est celui du compte Stripe (*Paramètres → Informations sur l'entreprise*) : y mettre Square-soft et son adresse. Le lien de la facture apparaît dans *Mon compte → Facturation* dès que Stripe l'a finalisée. En cas de dépassement des seuils de la franchise, passer `VAT_EXEMPT` à `false` avec le comptable, et vérifier les seuils de la TVA sur les ventes à distance dans l'Union européenne pour les clients hors de France.

Mise en place, d'abord en **mode test** :

1. Créer le compte Stripe. Dans *Développeurs → Clés API*, copier la clé secrète (`sk_test_…`), puis la mettre **dans `.env` sur le serveur**, jamais dans un dépôt ni une conversation :
   ```bash
   STRIPE_SECRET_KEY="sk_test_…"
   ```
2. Créer les prix depuis la table `plan`. Chaque prix porte le code du tarif comme *lookup key*, donc relancer la commande ne crée rien de plus :
   ```bash
   docker compose run --rm migrate npm run stripe:sync-prices -- --dry-run
   docker compose run --rm migrate npm run stripe:sync-prices
   ```
   Un prix ne se modifie pas dans Stripe : un nouveau tarif est une nouvelle ligne `plan`, avec un nouveau code. Si le prix trouvé dans Stripe ne correspond plus au tarif, la commande le signale (`mismatch`) et ne touche à rien.
3. Dans *Développeurs → Webhooks*, ajouter un point de terminaison `https://<domaine>/api/webhooks/stripe` qui écoute `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.finalized`, `invoice.paid`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated` et `charge.dispute.closed`. Copier son secret de signature dans `.env` :
   ```bash
   STRIPE_WEBHOOK_SECRET="whsec_…"
   ```
4. Recharger l'application (`docker compose up -d --force-recreate app`), puis activer l'interrupteur. Faire un achat avec la carte de test `4242 4242 4242 4242`.

En local, `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (outil en ligne de commande de Stripe) relaie les événements et affiche le secret `whsec_…` à utiliser.

Chaque événement est enregistré dans `stripe_event`, dans la même transaction que ses effets. Un événement reçu deux fois, ou deux fois en même temps, ne crée donc qu'un droit et qu'un paiement. Un traitement en échec est annulé en entier : le webhook répond 500, l'erreur est gardée dans `stripe_event.error`, et Stripe renvoie l'événement plus tard.

**Prix par certification** : le prix du Pass est celui du tarif (`plan`), sauf pour une certification qui a son propre prix (table `plan_price`, *Administration → Droits → Prix du Pass par certification*, chaque changement est dans le journal d'audit). Les pages publiques affichent alors « À partir de … » et la liste des prix, et le formulaire d'achat le prix de la certification choisie. Un nouveau prix n'est en vente en ligne qu'après `npm run stripe:sync-prices`, qui crée son prix Stripe (lookup key `<tarif>.<certification>.<montant><devise>` : un nouveau montant est un nouveau prix Stripe).

**Paiement retenu** : si Stripe a encaissé moins que le tarif, ou dans une autre devise (un prix Stripe modifié à la main, par exemple), le paiement passe au statut `held`. Aucun Pass n'est accordé, et l'acheteur voit « En vérification ». La liste « Paiements à vérifier » d'*Administration → Droits* (les 100 plus anciens, chaque panier en entier) les montre avec le tarif, le montant encaissé et la référence du paiement Stripe. Les Pass d'un même panier y sont côte à côte, avec le total débité : ils partagent un seul paiement Stripe, et le rembourser rembourse tout le panier. Il faut alors rembourser dans le tableau de bord Stripe (le webhook passe alors le paiement en `refunded` et le retire de la liste), ou accorder le Pass à la main depuis la fiche de l'utilisateur, avec le motif « Paiement retenu vérifié ».

**Remboursements et litiges** (lot C) : un remboursement se fait dans le tableau de bord Stripe. Remboursé en entier (`charge.refunded`), le paiement passe en `refunded` et ses Pass sont révoqués aussitôt ; pour un panier, le paiement Stripe est commun, donc tous ses Pass. Un remboursement partiel ne change rien automatiquement, car il peut ne porter que sur un Pass d'un panier, ou être un geste : il est noté dans `stripe_event.error` et les journaux (`billing.review`), et le Pass concerné se révoque à la main depuis la fiche de l'utilisateur, avec le motif « Remboursement ». Un litige bancaire (`charge.dispute.created`, ou `charge.dispute.updated` quand une simple demande d'information de la banque devient un litige) passe les paiements payés en `disputed` (« Contesté ») et révoque leurs Pass ; un paiement retenu reste `held`, dans la liste à vérifier. Perdu, les Pass restent révoqués (ou le sont alors, si la clôture arrive avant l'ouverture) ; gagné (`charge.dispute.closed`), les paiements restent `disputed` (« payé » voudrait dire « Pass actif ») et l'événement est signalé de même pour qu'un administrateur accorde de nouveau le Pass s'il y a lieu (motif « Geste commercial » ou « Autre ») ; la ligne de l'achat reste « Contesté ». Stripe ne garantit pas l'ordre des événements : un paiement n'ayant qu'un litige, sa clôture est notée (`disputeClosedAt`) et un événement d'ouverture arrivé après ne change plus rien. Chaque révocation automatique est dans le journal d'audit, avec « Stripe » pour auteur, le motif `refund` ou `dispute` et l'identifiant de l'événement. Un e-mail de confirmation pas encore parti n'est pas envoyé.

**E-mails de facturation** : confirmation d'achat, rappel 7 jours avant la fin d'un Pass, puis avis d'expiration. Ils passent par la file `email_outbox`, envoyée chaque minute par l'application, avec de nouveaux essais espacés en cas d'échec SMTP (8 essais au plus). Au moment de l'envoi, un rappel est vérifié contre l'accès du jour : un Pass prolongé, révoqué ou remplacé entre-temps ne déclenche pas d'e-mail.

## Avancement (plan du §12 des specs)

- [x] **Lot 1 — Socle** : Next.js, Prisma (schéma complet), Auth.js, i18n FR/EN, CI, Docker, `blueprint.yaml` et 81 objectifs AZ-104
- [x] **Lot 2 — Questions** : schémas Zod des 8 types, composants de saisie accessibles, 24 questions d'exemple, aperçu
- [x] **Lot 3 — Notation et assemblage** : `lib/exam/scoring.ts` et `lib/exam/assembler.ts` (fonctions pures, graine déterministe), couverture > 90 %
- [x] **Lot 4 — Session d'examen** : API des tentatives, chrono serveur, sections à sens unique et verrouillage, série Oui/Non sans retour, révision, soumission, expiration, reprise, sauvegarde avec file hors ligne

### Moteur d'examen (lot 4)

| Route | Rôle |
| --- | --- |
| `POST /api/attempts` | Assemble un examen et crée la tentative (ou renvoie celle en cours). 402 si l'accès le refuse : `quota_exhausted`, `pass_expired`, `subscription_inactive` |
| `POST /api/attempts/:id/start` | Démarre le chrono (clic sur « Démarrer »). Même contrôle d'accès, même 402 |
| `GET /api/attempts/:id` | Sections, questions **sans** réponses, réponses saisies, temps restant |
| `PUT /api/attempts/:id/items/:itemId` | Enregistre une réponse et/ou le marquage |
| `POST /api/attempts/:id/sections/:sectionId/lock` | Quitte et verrouille la section courante |
| `POST /api/attempts/:id/submit` | Note et clôt la tentative |
| `GET /api/attempts/:id/results` | Rapport et correction (après soumission uniquement, `?lang=fr`). Au niveau gratuit, seulement les questions ratées (`correction.level`, `correction.locked`) |
| `GET /api/me/access` | Niveau d'accès par certification (`free` ou `full`, source, fin), examens gratuits restants |
| `GET /api/me/progress` | Historique, niveau par domaine, indice de préparation (0–100, verdict, conditions), progression (XP, niveau, maîtrise, badges) |
| `POST /api/questions/:id/report` | Signaler une question vue dans un examen terminé |

Règles appliquées par le serveur (`lib/exam/session.ts`) : le temps fait foi côté serveur (`deadlineAt`, 5 s de tolérance réseau) ; seule la section courante accepte des écritures ; une section quittée est verrouillée ; dans une série, chaque réponse est définitive et donnée dans l'ordre ; à l'échéance, la tentative passe en `expired` avec les réponses enregistrées ; les questions ne sont envoyées qu'une fois le chrono lancé ; les routes vérifient la propriété de la tentative et l'origine des requêtes (CSRF). Les études de cas sont tirées au début ou à la fin ; la dernière section se termine par « Terminer l'examen ».
- [x] **Lot 5 — Résultats** : rapport de score (sur 1000, réussite à 700, barres par domaine face au seuil, temps, types), correction détaillée (réponse donnée, bonne réponse, explications, liens vers la documentation de l'éditeur, filtres ratées / marquées / domaine, FR ou EN), signalement (3 signalements → retour en relecture), tableau de bord (dernier score, courbe, niveau par domaine, indice de préparation)
- [x] **Indice de préparation** : indicateur central du tableau de bord, de 0 à 100, avec quatre verdicts (pas prêt, en progression, presque prêt, prêt). Il combine le niveau des examens récents, la régularité, le domaine le plus faible et la fraîcheur (questions nouvelles, examen récent). « Prêt » exige un indice d'au moins 85 et, en plus, au moins 3 examens, les 3 derniers à 800 ou plus, aucun domaine sous 650, au moins 50 % de questions jamais vues dans les 3 derniers examens (un score sur des questions déjà vues surestime le niveau), et un dernier examen d'au plus 90 jours (valeurs AZ-104 de `structure.readiness`, qui font foi) : remplir ces cinq conditions ne suffit pas si les scores restent justes, et la liste dit alors quel critère coûte le plus de points. La liste de ce qui manque est affichée, et le rapport de score montre l'évolution de l'indice. Tous les seuils sont dans `structure.readiness` du `blueprint.yaml` ; calcul dans `lib/progress/readiness.ts`.
- [x] **Progression (côté « jeu »)** : XP gagnés à chaque examen (examen terminé, score, réussite, meilleur score, domaines en progrès ; moitié moins de points de score sur des questions déjà vues), 10 niveaux aux titres Azure (on peut en gagner plusieurs d'un coup), maîtrise bronze / argent / or par domaine, 7 badges. Privé, recalculé depuis l'historique, sans table dédiée. Ne dit jamais « prêt » : c'est le rôle de l'indice de préparation. Règles dans `structure.progression` du `blueprint.yaml` ; calcul dans `lib/progress/progression.ts`.
- [x] **Animation des résultats** : une fois par examen, quand les cartes de résultat apparaissent à l'écran, la jauge de l'indice part de l'ancienne valeur (repère pointillé) et change de couleur en franchissant les paliers. Les règles validées par cet examen se cochent une à une. Chaque source d'XP remplit la barre, avec disque qui pivote et confettis au passage de niveau, puis les nouveaux badges apparaissent. Environ 4 s ; un clic saute à la fin. Rien ne bouge avec « réduire les animations ». Le serveur affiche les valeurs finales, l'animation est purement décorative, et seul le navigateur retient qu'elle a déjà été jouée. Code dans `components/progress/celebration.tsx` et `lib/progress/celebration.ts`.
- [x] **Résultat de l'examen réel** : sur le tableau de bord, le candidat déclare la date, le résultat et, s'il le souhaite, le score de son examen réel ; il voit et peut supprimer ses déclarations. Chaque déclaration garde ce que disait l'indice de préparation la veille (examens blancs terminés avant ce jour). La page **Administration → Calibrage** donne, par verdict de l'indice, le nombre de déclarations et le taux de réussite, sans nom (avertissement sous 20 déclarations). Aucun taux n'est montré aux candidats tant que les données ne suffisent pas. Table `exam_outcome` (supprimée avec le compte) ; code dans `lib/progress/outcomes.ts` et `calibration.ts`.
- [x] **Lot 6 — Banque** : 598 questions EN/FR, 16 études de cas, 11 séries, glossaire Learn, vérification à l'aveugle (statut `draft`, relecture humaine à faire)
- [x] **Offres, lot A1 — Droits** (specs des offres) : catalogue des tarifs (table `plan`, prix et limites modifiables sans déploiement), droits de type Pass (`entitlement`), interrupteurs (`app_setting` : offres Tout accès, Équipes et packs, inscriptions publiques, tous fermés au départ) et `certification.freeAccess`. Une seule fonction décide de l'accès à une certification, `getAccess` (règles pures dans `lib/access/rules.ts`) : administrateur, certification gratuite, siège d'équipe, abonnement, puis Pass ; sinon niveau gratuit. Le niveau gratuit donne un examen blanc complet par certification (`plan.examQuota` du tarif `free`), compté dès que son chrono démarre, même s'il est abandonné. Le contrôle se fait à la création et au démarrage d'un examen : `POST /api/attempts` répond 402 avec la raison (`quota_exhausted`, `pass_expired`, `subscription_inactive`), et un examen déjà démarré peut toujours être terminé. `GET /api/me/access` donne le niveau d'accès par certification et les examens gratuits restants.
- [x] **Offres, lot A2 — Correction filtrée et écran d'offre** : au niveau gratuit, la correction (page et `GET /api/attempts/:id/results`) ne contient que les questions ratées, sans l'explication de chaque mauvaise option ; les questions réussies ne sont pas envoyées, la page les montre floutées à leur place avec un bandeau « Débloquer la correction complète ». Le rapport de score reste complet. Le niveau suit l'accès du jour : une correction repasse au niveau gratuit quand un Pass prend fin. Un refus (402) mène à l'écran d'offre `/offer` : la raison, ce que donne l'accès complet, et les offres en vente avec leurs prix tirés de la table `plan` (Tout accès, Équipes et packs n'apparaissent que si leur interrupteur `app_setting` est activé). Le paiement en ligne arrive au lot B. Le tableau de bord affiche le niveau d'accès par certification : examens gratuits restants, ou jours restants d'un Pass.
- [x] **Offres, lot A3 — Inscriptions et back-office des droits** :
  - **Inscription publique** (`/signup`), ouverte tant que l'interrupteur `signup.open` est activé : e-mail et mot de passe (12 caractères minimum), puis un lien de confirmation valable 24 heures, envoyé dans la langue choisie. Le compte n'est créé qu'en suivant le lien **et** en saisissant de nouveau le mot de passe choisi : la demande attend dans `signup_request` (mot de passe haché, jeton haché). Il faut donc la boîte de réception et le mot de passe : quelqu'un qui s'inscrit avec l'adresse d'un autre n'obtient pas le compte, même si le titulaire clique sur le lien reçu sans l'avoir demandé. Ouvrir le lien seul (un antivirus de messagerie, par exemple) ne change rien. Cinq essais de mot de passe par lien et par quart d'heure. La réponse est la même pour une adresse déjà inscrite, dont le titulaire reçoit à la place un rappel avec un lien de connexion, et le mot de passe est haché dans les deux cas : ni la réponse ni son temps ne révèlent qui a un compte. Limitation à 5 inscriptions par heure, par IP et par adresse. Une demande non confirmée expire au bout de 24 heures. Elle est alors supprimée à la première inscription qui suit, et dans tous les cas par le service `backup`, qui purge les demandes expirées chaque jour avant la sauvegarde : elle reste donc au plus un jour de plus en base, puis 14 jours dans les sauvegardes. Les limites d'essais sont tenues en mémoire du processus : elles repartent de zéro au redémarrage de `app` et supposent une seule instance, ce qui est le cas sur le VPS.
  - **Adresse vérifiée** obligatoire pour démarrer un examen blanc (403 `email_unverified`). Les comptes créés par un administrateur, et ceux qui existaient avant ce lot, sont considérés comme vérifiés.
  - **Administration → Droits** (`/admin/billing`) : recherche d'un utilisateur par e-mail ; son accès par certification et ses Pass ; attribution manuelle ou prolongation d'un Pass (durée, origine « attribution manuelle » ou « prolongation après échec », motif obligatoire choisi dans une liste), qui prend la suite du Pass en cours comme un achat ; révocation immédiate ; interrupteurs des offres et des inscriptions.
  - **Journal d'audit** (`audit_log`), écrit dans la même transaction que l'action : attribution et révocation d'un droit, changement d'interrupteur, création de compte (depuis l'administration ou la ligne de commande), et, depuis le lot D du cours, changement de statut d'un chapitre. Les entrées restent quand l'utilisateur est supprimé, sans donnée personnelle : l'utilisateur n'y figure que par son identifiant, et son adresse disparaît avec son compte (elle reste dans les sauvegardes jusqu'à leur rotation, 14 jours). Le motif d'une attribution ou d'une révocation est donc un code choisi dans une liste (`lib/access/reasons.ts` : geste commercial, incident technique, paiement retenu vérifié, remboursement, litige bancaire, attribution par erreur, test, autre), et rien d'autre : aucun texte libre, ni numéro de ticket (une suite de chiffres peut être un numéro de téléphone ou une date de naissance), donc rien de personnel. Les détails restent dans l'échange avec le support. Les entrées antérieures gardent leur motif en texte libre. Les demandes de prolongation déposées par les candidats ne sont pas encore prévues : elles passent par l'adresse de contact.
- [x] **Offres, lot B — Pass** (voir « Paiement (Stripe) ») :
  - **Achat** : Stripe Checkout en paiement unique depuis `/pricing` ou l'écran d'offre (`POST /api/billing/checkout`, au plus 10 sessions par heure et par utilisateur), pour un Pass ou plusieurs à la fois (panier, 10 Pass au plus). L'adresse doit être vérifiée.
  - **Retour de paiement** : `/billing/success` attend le webhook et affiche l'état enregistré (`GET /api/billing/status`). `/billing/cancel` confirme qu'aucun montant n'a été débité.
  - **Pass enchaînés** : un Pass acheté pendant qu'un autre court commence à la fin de celui-ci.
  - **Compte** : `/account/billing` montre l'accès par certification et l'historique des paiements.
  - **Tables** : `billing_customer`, `payment`, `stripe_event` et `email_outbox`. Les paiements restent quand le compte est supprimé, comme pièces comptables, sans lien vers l'utilisateur.
  - **Effacement chez Stripe** : le client Stripe, créé au premier achat, porte l'adresse e-mail. Quand le compte est supprimé, quelle que soit la façon, sa ligne `billing_customer` perd son lien vers l'utilisateur, et le client Stripe est supprimé dans la minute (`lib/billing/erase.ts`, lancé par le même processus que la file d'e-mails ; `EMAIL_WORKER=off` arrête les deux). En cas d'échec, nouvel essai après 2, 4, 8… minutes, au plus un jour d'attente, jusqu'à réussite. Un échec qui dure (clé Stripe révoquée, par exemple) ne se voit que dans les journaux de `app` (événement `billing.erase`, niveau `error`) : à surveiller. Les paiements restent chez Stripe (ses propres obligations légales) et chez nous, sans lien vers la personne ; la ligne garde seulement l'identifiant Stripe du client supprimé et la date de suppression (`stripeDeletedAt`), son pays et son numéro de TVA étant effacés. Un client créé chez Stripe que la base n'a pas pu enregistrer, ou en double par deux achats lancés en même temps, est supprimé aussitôt chez Stripe, pour qu'aucune adresse n'y reste sans rien pour l'effacer ; chaque achat envoie à Stripe une clé d'idempotence nouvelle, pour qu'un nouvel essai ne reçoive jamais le client supprimé. Seul cas non rattrapé : un arrêt brutal du processus entre la création chez Stripe et l'écriture en base (rare) ; ce client sans ligne se repère dans le tableau de bord Stripe (aucun paiement, absent de `billing_customer`) et se supprime à la main.
- [x] **Suivi de l'activité** (`lib/activity/`) :
  - **Connexions** (`login_event`) : chaque connexion par mot de passe ou par lien magique, mot de passe erroné, connexion bloquée par la limite d'essais et changement de mot de passe, avec l'**adresse IP complète** (`X-Real-IP` posé par Caddy, `unknown` sinon). Seuls les événements d'un compte existant sont gardés : une adresse e-mail inconnue tapée à la connexion n'est pas enregistrée. Conservation **un an** (`LOGIN_RETENTION_DAYS`), choix du propriétaire : le worker de l'application supprime les plus anciennes une fois par heure (événement `activity.purge` dans les journaux ; après un échec, nouvel essai l'heure suivante). Ce worker est celui des e-mails : avec `EMAIL_WORKER=off`, **aucune connexion n'est plus supprimée** et la durée annoncée n'est plus tenue, sauf à lancer la purge ailleurs (`purgeLogins`). Elles disparaissent avec le compte. Seuls les administrateurs les voient (choix du propriétaire) : l'utilisateur n'a pas d'historique de ses connexions. Une tentative sur un compte est inscrite à ce compte avec l'adresse IP de son auteur. L'adresse est gardée si c'est une IPv4 ou une IPv6 valide, sinon `unknown`.
  - **Activité d'un utilisateur** (`/admin/users/[id]`, depuis la liste des utilisateurs ou la fiche *Droits*) : les 200 derniers événements, du plus récent au plus ancien. On y trouve la création du compte et la vérification de l'adresse, les connexions, les examens blancs et entraînements (lancés, puis rendus ou expirés, avec le score) et le cours lu (une ligne par chapitre et par jour). Les tentatives refusées (mot de passe erroné, blocage) sont listées à part, les 50 dernières avec leur nombre total, pour qu'une rafale d'essais d'un tiers ne chasse pas les vraies connexions de la chronologie. S'y ajoutent les questions signalées, les résultats d'examen réel déclarés, les paiements, les Pass accordés ou révoqués et les gestes des administrateurs (journal d'audit). Tout vient des tables existantes, sauf les connexions : rien d'autre n'est collecté.
  - **Vue d'ensemble** (*Administration → Activité*, `/admin/activity`) : sur les 30 derniers jours, par jour UTC, les inscriptions, les utilisateurs actifs (connectés, ayant lancé un examen ou lu le cours), les examens lancés et terminés, et les Pass vendus. Elle donne aussi les actifs sur 7 et 30 jours et le montant des Pass vendus par devise.
  - Le journal d'audit reste réservé aux gestes des administrateurs : l'activité des utilisateurs n'y est pas écrite.
  - **Politique de confidentialité** (`/privacy`, lien dans le pied de page de chaque page publique et sous le formulaire d'inscription) : données collectées, finalités, destinataires, durées, droits et cookies, d'après ce que le site fait réellement (messages `privacy`, en anglais et en français). Le texte est complet : responsable du traitement (Square-soft), adresse de contact (`contact@certidrill.com`), hébergeur (IONOS), service d'e-mail (Brevo) et paiement (Stripe). Reste à y ajouter le numéro RCS une fois la société immatriculée. Mettre à jour la date `UPDATED` de la page à chaque modification du texte.
  - **Mentions légales** (`/legal`) et **CGV** (`/terms`), liées dans le même pied de page.
- [ ] Lot 7 — Mise en production
