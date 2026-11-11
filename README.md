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

Les 24 questions d'exemple (3 par type) sont en statut `draft` : elles doivent être relues avant publication.

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

Les inscriptions sont fermées : les comptes se créent avec `npm run user:create` ou depuis **Administration → Utilisateurs**. Sans serveur SMTP (`EMAIL_SERVER`), mettre `AUTH_LOG_MAGIC_LINKS="true"` pour que les liens magiques s'affichent dans le journal du serveur.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:coverage` | Tests unitaires + couverture (seuil 90 % sur `lib/exam`) |
| `npm run test:e2e` | Tests Playwright sur un build de production — même contrainte de base jetable |
| `npm run content:check` | Valide `content/` (schémas et références croisées) |
| `npm run test:integration` | Tests sur une vraie base PostgreSQL — `DATABASE_URL` doit pointer vers une base **jetable** (les tables sont vidées) |
| `npm run seed` | Charge `content/` en base (idempotent ; la base est reconstructible) |
| `npm run user:create` | Crée un compte (`--email`, `--password`, `--name`, `--admin`, `--locale`) |

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
- [ ] Lot 3 — Notation et assemblage
- [ ] Lot 4 — Session d'examen
- [ ] Lot 5 — Résultats
- [ ] Lot 6 — Banque
- [ ] Lot 7 — Mise en production
