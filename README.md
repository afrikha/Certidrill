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

598 questions originales, en anglais et en français, de quoi faire **10 examens blancs sans aucune question en double** (`npx tsx tools/questions/simulate.ts 10`). Elles se répartissent en 16 études de cas, 11 séries Oui/Non et 8 types de questions. Par domaine, la répartition suit les pondérations du rapport de score Microsoft. La terminologie française reprend celle de Microsoft Learn (`content/az-104/glossary.yaml` : 564 termes en-us → fr-fr, intitulés officiels du guide d'étude). Les règles de rédaction sont dans `tools/questions/WRITING_GUIDE.md`.

Toutes les questions ont été vérifiées à l'aveugle : un agent indépendant y a répondu sans voir le corrigé, puis on a comparé ses réponses au corrigé (`tools/questions/export-blind.ts` puis `compare-blind.ts`). Les écarts ont été corrigés ou justifiés à partir de Learn.

Toutes les questions sont en statut `draft`, car une **relecture humaine reste nécessaire** avant la publication (§7 des specs) :

```bash
npm run content:status -- reviewed <préfixe-id>         # après relecture
npm run content:status -- published all --from reviewed
npm run seed
```

Une question signalée par 3 utilisateurs différents passe en `needs_review` en base et sort des examens. `npm run seed` ne la republie pas tant que son fichier n'a pas changé : après correction, incrémenter son `version` dans le YAML. Les questions, études de cas et séries supprimées du dépôt passent en `retired`.

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
npm run seed                    # charge content/ : référentiel et 598 questions
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
| `npm run content:check` | Valide `content/` (schémas et références croisées) |
| `npm run content:validate -- --prefix <p>` | Valide des fichiers de questions et liste tous les problèmes |
| `npm run content:status -- <statut> <préfixe\|all> [--from <statut>]` | Change le statut de questions en masse |
| `npm run test:integration` | Tests sur une vraie base PostgreSQL — `DATABASE_URL` doit pointer vers une base **jetable** (les tables sont vidées) |
| `npm run seed` | Charge `content/` en base (idempotent ; la base est reconstructible) |
| `npm run user:create` | Crée un compte (`--email`, `--password`, `--name`, `--admin`, `--locale`) |

## Tests et qualité

| Niveau | Outil | Dossier | Ce qui est vérifié |
| --- | --- | --- | --- |
| Unitaires | Vitest | `tests/unit` | Notation, assembleur, schémas, rendu de toute la banque, sécurité (CSRF, limitation de débit, mots de passe), journaux |
| Composants | Vitest + Testing Library (jsdom) | `tests/components` | Saisie des 8 types de questions, écran d'examen (chrono, sauvegarde hors ligne, sections, série, révision, soumission) en FR/EN |
| Intégration | Vitest + PostgreSQL réel | `tests/integration` | Routes `app/api/**` (authentification, CSRF, propriété, aucune réponse avant soumission), server actions, Auth.js (mots de passe, limitation), inscription et confirmation d'adresse, droits (quota, Pass, correction filtrée, attribution manuelle, journal d'audit), session d'examen, résultats |
| End-to-end | Playwright (build de production) | `tests/e2e` | Parcours complets dans Chromium : examen, reprise, expiration, résultats, saisie au clavier ; inscription, attribution d'un Pass, écran d'offre |
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

```bash
cp .env.example .env    # AUTH_SECRET, POSTGRES_PASSWORD, SITE_DOMAIN, EMAIL_SERVER…
docker compose up -d --build
docker compose run --rm migrate npm run user:create -- --email vous@example.com --admin
```

Services : `db` (PostgreSQL), `migrate` (migrations + seed à chaque déploiement), `app` (Next.js standalone), `caddy` (HTTPS), `backup` (pg_dump quotidien dans `./backups`, 14 jours). Cloudflare en frontal pour le DNS et le cache.

Caddy fait confiance aux plages d'adresses de Cloudflare (liste dans `deploy/Caddyfile`, à mettre à jour si Cloudflare la change) : pour ces requêtes, l'adresse du visiteur est lue dans `CF-Connecting-IP` et transmise à l'application dans `X-Real-IP`. Sans cela, les limites par IP (connexion, inscription) compteraient ensemble tous les visiteurs d'un même nœud Cloudflare. Après une modification du Caddyfile, le valider avant de recharger :

```bash
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Caddy redirige `www.<SITE_DOMAIN>` vers `<SITE_DOMAIN>` (301, chemin et paramètres conservés). Il faut pour cela un enregistrement DNS `www` (CNAME vers le domaine, proxifié comme l'apex) : sans lui, Caddy ne peut pas obtenir le certificat de `www` (le site principal n'est pas affecté).

## E-mails (liens magiques)

Les liens de connexion partent par SMTP (`EMAIL_SERVER`), dans la langue du compte, en texte et en HTML. Ils expirent au bout de 15 minutes. La connexion SMTP est toujours chiffrée : `smtps://` (port 465), ou `smtp://` avec STARTTLS obligatoire (port 587).

Il faut un service d'envoi transactionnel (Brevo, Scaleway TEM, Amazon SES…). Un envoi direct depuis le VPS finit en spam, et le port 25 y est souvent bloqué.

1. **Déclarer le domaine** chez le fournisseur, puis ajouter dans Cloudflare les enregistrements qu'il donne, en *DNS only* (nuage gris) :
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

Cloudflare Email Routing (gratuit) peut rediriger `dmarc@` ou `contact@<domaine>` vers une boîte personnelle, pour recevoir les rapports DMARC et les réponses.

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
- [x] **Lot 5 — Résultats** : rapport de score (sur 1000, réussite à 700, barres par domaine face au seuil, temps, types), correction détaillée (réponse donnée, bonne réponse, explications, liens Microsoft Learn, filtres ratées / marquées / domaine, FR ou EN), signalement (3 signalements → retour en relecture), tableau de bord (dernier score, courbe, niveau par domaine, indice de préparation)
- [x] **Indice de préparation** : indicateur central du tableau de bord, de 0 à 100, avec quatre verdicts (pas prêt, en progression, presque prêt, prêt). Il combine le niveau des examens récents, la régularité, le domaine le plus faible et la fraîcheur (questions nouvelles, examen récent). « Prêt » exige un indice d'au moins 85 et, en plus, au moins 3 examens, les 3 derniers à 800 ou plus, aucun domaine sous 650, au moins 50 % de questions jamais vues dans les 3 derniers examens (un score sur des questions déjà vues surestime le niveau), et un dernier examen d'au plus 90 jours (valeurs AZ-104 de `structure.readiness`, qui font foi) : remplir ces cinq conditions ne suffit pas si les scores restent justes, et la liste dit alors quel critère coûte le plus de points. La liste de ce qui manque est affichée, et le rapport de score montre l'évolution de l'indice. Tous les seuils sont dans `structure.readiness` du `blueprint.yaml` ; calcul dans `lib/progress/readiness.ts`.
- [x] **Progression (côté « jeu »)** : XP gagnés à chaque examen (examen terminé, score, réussite, meilleur score, domaines en progrès ; moitié moins de points de score sur des questions déjà vues), 10 niveaux aux titres Azure (on peut en gagner plusieurs d'un coup), maîtrise bronze / argent / or par domaine, 7 badges. Privé, recalculé depuis l'historique, sans table dédiée. Ne dit jamais « prêt » : c'est le rôle de l'indice de préparation. Règles dans `structure.progression` du `blueprint.yaml` ; calcul dans `lib/progress/progression.ts`.
- [x] **Animation des résultats** : une fois par examen, quand les cartes de résultat apparaissent à l'écran, la jauge de l'indice part de l'ancienne valeur (repère pointillé) et change de couleur en franchissant les paliers. Les règles validées par cet examen se cochent une à une. Chaque source d'XP remplit la barre, avec disque qui pivote et confettis au passage de niveau, puis les nouveaux badges apparaissent. Environ 4 s ; un clic saute à la fin. Rien ne bouge avec « réduire les animations ». Le serveur affiche les valeurs finales, l'animation est purement décorative, et seul le navigateur retient qu'elle a déjà été jouée. Code dans `components/progress/celebration.tsx` et `lib/progress/celebration.ts`.
- [x] **Résultat de l'examen réel** : sur le tableau de bord, le candidat déclare la date, le résultat et, s'il le souhaite, le score de son examen réel ; il voit et peut supprimer ses déclarations. Chaque déclaration garde ce que disait l'indice de préparation la veille (examens blancs terminés avant ce jour). La page **Administration → Calibrage** donne, par verdict de l'indice, le nombre de déclarations et le taux de réussite, sans nom (avertissement sous 20 déclarations). Aucun taux n'est montré aux candidats tant que les données ne suffisent pas. Table `exam_outcome` (supprimée avec le compte) ; code dans `lib/progress/outcomes.ts` et `calibration.ts`.
- [x] **Lot 6 — Banque** : 598 questions EN/FR, 16 études de cas, 11 séries, glossaire Learn, vérification à l'aveugle (statut `draft`, relecture humaine à faire)
- [x] **Offres, lot A1 — Droits** (specs des offres) : catalogue des tarifs (table `plan`, prix et limites modifiables sans déploiement), droits de type Pass (`entitlement`), interrupteurs (`app_setting` : offres Tout accès, Équipes et packs, inscriptions publiques, tous fermés au départ) et `certification.freeAccess`. Une seule fonction décide de l'accès à une certification, `getAccess` (règles pures dans `lib/access/rules.ts`) : administrateur, certification gratuite, siège d'équipe, abonnement, puis Pass ; sinon niveau gratuit. Le niveau gratuit donne un examen blanc complet par certification (`plan.examQuota` du tarif `free`), compté dès que son chrono démarre, même s'il est abandonné. Le contrôle se fait à la création et au démarrage d'un examen : `POST /api/attempts` répond 402 avec la raison (`quota_exhausted`, `pass_expired`, `subscription_inactive`), et un examen déjà démarré peut toujours être terminé. `GET /api/me/access` donne le niveau d'accès par certification et les examens gratuits restants.
- [x] **Offres, lot A2 — Correction filtrée et écran d'offre** : au niveau gratuit, la correction (page et `GET /api/attempts/:id/results`) ne contient que les questions ratées, sans l'explication de chaque mauvaise option ; les questions réussies ne sont pas envoyées, la page les montre floutées à leur place avec un bandeau « Débloquer la correction complète ». Le rapport de score reste complet. Le niveau suit l'accès du jour : une correction repasse au niveau gratuit quand un Pass prend fin. Un refus (402) mène à l'écran d'offre `/offer` : la raison, ce que donne l'accès complet, et les offres en vente avec leurs prix tirés de la table `plan` (Tout accès, Équipes et packs n'apparaissent que si leur interrupteur `app_setting` est activé). Le paiement en ligne arrive au lot B. Le tableau de bord affiche le niveau d'accès par certification : examens gratuits restants, ou jours restants d'un Pass.
- [x] **Offres, lot A3 — Inscriptions et back-office des droits** :
  - **Inscription publique** (`/signup`), ouverte tant que l'interrupteur `signup.open` est activé : e-mail et mot de passe (12 caractères minimum), puis un lien de confirmation valable 24 heures, envoyé dans la langue choisie. Le compte n'est créé qu'en suivant le lien, avec le mot de passe choisi : la demande attend dans `signup_request` (mot de passe haché, jeton haché). Ainsi personne ne peut créer de compte, ni en fixer le mot de passe, sur une adresse qu'il ne contrôle pas. La réponse est la même pour une adresse déjà inscrite, dont le titulaire reçoit à la place un rappel avec un lien de connexion : le formulaire ne révèle pas qui a un compte. Limitation à 5 inscriptions par heure, par IP et par adresse.
  - **Adresse vérifiée** obligatoire pour démarrer un examen blanc (403 `email_unverified`). Les comptes créés par un administrateur, et ceux qui existaient avant ce lot, sont considérés comme vérifiés.
  - **Administration → Droits** (`/admin/billing`) : recherche d'un utilisateur par e-mail ; son accès par certification et ses Pass ; attribution manuelle ou prolongation d'un Pass (durée, origine « attribution manuelle » ou « prolongation après échec », motif obligatoire), qui prend la suite du Pass en cours comme un achat ; révocation immédiate ; interrupteurs des offres et des inscriptions.
  - **Journal d'audit** (`audit_log`), écrit dans la même transaction que l'action : attribution et révocation d'un droit, changement d'interrupteur, création de compte (depuis l'administration ou la ligne de commande). Les entrées restent quand l'utilisateur est supprimé. Les demandes de prolongation déposées par les candidats arrivent avec le lot C.
- [ ] Lot 7 — Mise en production
