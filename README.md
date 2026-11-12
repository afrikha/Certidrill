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

Les inscriptions sont fermées : les comptes se créent avec `npm run user:create` ou depuis **Administration → Utilisateurs**. Sans serveur SMTP (`EMAIL_SERVER`), mettre `AUTH_LOG_MAGIC_LINKS="true"` pour que les liens magiques s'affichent dans le journal du serveur.

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
| Intégration | Vitest + PostgreSQL réel | `tests/integration` | Routes `app/api/**` (authentification, CSRF, propriété, aucune réponse avant soumission), server actions, Auth.js (mots de passe, limitation, inscriptions fermées), session d'examen, résultats |
| End-to-end | Playwright (build de production) | `tests/e2e` | Parcours complets dans Chromium : examen, reprise, expiration, résultats, saisie au clavier |
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

## Avancement (plan du §12 des specs)

- [x] **Lot 1 — Socle** : Next.js, Prisma (schéma complet), Auth.js, i18n FR/EN, CI, Docker, `blueprint.yaml` et 81 objectifs AZ-104
- [x] **Lot 2 — Questions** : schémas Zod des 8 types, composants de saisie accessibles, 24 questions d'exemple, aperçu
- [x] **Lot 3 — Notation et assemblage** : `lib/exam/scoring.ts` et `lib/exam/assembler.ts` (fonctions pures, graine déterministe), couverture > 90 %
- [x] **Lot 4 — Session d'examen** : API des tentatives, chrono serveur, sections à sens unique et verrouillage, série Oui/Non sans retour, révision, soumission, expiration, reprise, sauvegarde avec file hors ligne

### Moteur d'examen (lot 4)

| Route | Rôle |
| --- | --- |
| `POST /api/attempts` | Assemble un examen et crée la tentative (ou renvoie celle en cours) |
| `POST /api/attempts/:id/start` | Démarre le chrono (clic sur « Démarrer ») |
| `GET /api/attempts/:id` | Sections, questions **sans** réponses, réponses saisies, temps restant |
| `PUT /api/attempts/:id/items/:itemId` | Enregistre une réponse et/ou le marquage |
| `POST /api/attempts/:id/sections/:sectionId/lock` | Quitte et verrouille la section courante |
| `POST /api/attempts/:id/submit` | Note et clôt la tentative |
| `GET /api/attempts/:id/results` | Rapport et correction (après soumission uniquement, `?lang=fr`) |
| `GET /api/me/progress` | Historique, niveau par domaine, indice de préparation (0–100, verdict, conditions) |
| `POST /api/questions/:id/report` | Signaler une question vue dans un examen terminé |

Règles appliquées par le serveur (`lib/exam/session.ts`) : le temps fait foi côté serveur (`deadlineAt`, 5 s de tolérance réseau) ; seule la section courante accepte des écritures ; une section quittée est verrouillée ; dans une série, chaque réponse est définitive et donnée dans l'ordre ; à l'échéance, la tentative passe en `expired` avec les réponses enregistrées ; les questions ne sont envoyées qu'une fois le chrono lancé ; les routes vérifient la propriété de la tentative et l'origine des requêtes (CSRF). Les études de cas sont tirées au début ou à la fin ; la dernière section se termine par « Terminer l'examen ».
- [x] **Lot 5 — Résultats** : rapport de score (sur 1000, réussite à 700, barres par domaine face au seuil, temps, types), correction détaillée (réponse donnée, bonne réponse, explications, liens Microsoft Learn, filtres ratées / marquées / domaine, FR ou EN), signalement (3 signalements → retour en relecture), tableau de bord (dernier score, courbe, niveau par domaine, indicateur « prêt »)
- [x] **Indice de préparation** : indicateur central du tableau de bord, de 0 à 100, avec quatre verdicts (pas prêt, en progression, presque prêt, prêt). Il combine le niveau des examens récents, la régularité, le domaine le plus faible et la fraîcheur (questions nouvelles, examen récent). « Prêt » exige en plus au moins 3 examens, les 3 derniers à 800 ou plus et aucun domaine sous 650. La liste de ce qui manque est affichée, et le rapport de score montre l'évolution de l'indice. Tous les seuils sont dans `structure.readiness` du `blueprint.yaml` ; calcul dans `lib/progress/readiness.ts`.
- [x] **Lot 6 — Banque** : 598 questions EN/FR, 16 études de cas, 11 séries, glossaire Learn, vérification à l'aveugle (statut `draft`, relecture humaine à faire)
- [ ] Lot 7 — Mise en production
