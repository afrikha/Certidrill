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

## Démarrage en local

Prérequis : Node 22, PostgreSQL 16.

```bash
cp .env.example .env            # renseigner DATABASE_URL et AUTH_SECRET
npm install
npx prisma migrate deploy       # crée le schéma
npm run seed                    # charge content/ (référentiel AZ-104)
npm run user:create -- --email vous@example.com --password 'au-moins-12-caracteres' --admin --locale fr
npm run dev
```

Pour essayer le moteur d'examen avant que la banque soit relue et publiée, mettre `EXAM_INCLUDE_UNPUBLISHED="true"` : les questions `draft` entrent alors dans les examens (l'écran d'accueil signale qu'il y a moins de questions qu'à l'examen réel).

Les inscriptions sont fermées : les comptes se créent avec `npm run user:create` ou depuis **Administration → Utilisateurs**. Sans serveur SMTP (`EMAIL_SERVER`), mettre `AUTH_LOG_MAGIC_LINKS="true"` pour que les liens magiques s'affichent dans le journal du serveur.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:coverage` | Tests unitaires + d'intégration avec couverture (seuil 90 % sur `lib/exam`) — base jetable requise |
| `npm run test:e2e` | Tests Playwright sur un build de production — même contrainte de base jetable |
| `npm run content:check` | Valide `content/` (schémas et références croisées) |
| `npm run content:validate -- --prefix <p>` | Valide des fichiers de questions et liste tous les problèmes |
| `npm run content:status -- <statut> <préfixe\|all> [--from <statut>]` | Change le statut de questions en masse |
| `npm run test:integration` | Tests sur une vraie base PostgreSQL — `DATABASE_URL` doit pointer vers une base **jetable** (les tables sont vidées) |
| `npm run seed` | Charge `content/` en base (idempotent ; la base est reconstructible) |
| `npm run user:create` | Crée un compte (`--email`, `--password`, `--name`, `--admin`, `--locale`) |

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
| `GET /api/me/progress` | Historique, niveau par domaine, indicateur « prêt » |
| `POST /api/questions/:id/report` | Signaler une question vue dans un examen terminé |

Règles appliquées par le serveur (`lib/exam/session.ts`) : le temps fait foi côté serveur (`deadlineAt`, 5 s de tolérance réseau) ; seule la section courante accepte des écritures ; une section quittée est verrouillée ; dans une série, chaque réponse est définitive et donnée dans l'ordre ; à l'échéance, la tentative passe en `expired` avec les réponses enregistrées ; les questions ne sont envoyées qu'une fois le chrono lancé ; les routes vérifient la propriété de la tentative et l'origine des requêtes (CSRF). Les études de cas sont tirées au début ou à la fin ; la dernière section se termine par « Terminer l'examen ».
- [x] **Lot 5 — Résultats** : rapport de score (sur 1000, réussite à 700, barres par domaine face au seuil, temps, types), correction détaillée (réponse donnée, bonne réponse, explications, liens Microsoft Learn, filtres ratées / marquées / domaine, FR ou EN), signalement (3 signalements → retour en relecture), tableau de bord (dernier score, courbe, niveau par domaine, indicateur « prêt »)
- [x] **Lot 6 — Banque** : 598 questions EN/FR, 16 études de cas, 11 séries, glossaire Learn, vérification à l'aveugle (statut `draft`, relecture humaine à faire)
- [ ] Lot 7 — Mise en production
