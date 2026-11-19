# Contrôle à l'aveugle — SAA-C03

Date : 2026-11-19. Banque : 684 questions (567 `single`, 117 `multi`), toutes en `draft`. Export : `npm run content:blind:export -- --cert saa-c03 all factory/blind/saa-c03/export.md --split 4`. Quatre relecteurs indépendants, un par fichier, ont répondu sans voir le corrigé. Ils n'avaient accès ni à `content/`, ni aux rapports, ni aux `.map.json`. Ensuite : `npm run content:blind:compare -- --cert saa-c03 export.<n>.answers.json --map export.<n>.md.map.json --out export.<n>.gaps.json`. Aucun statut n'a changé (pas de `--apply`).

L'export a été refait après le retrait de la remarque « Each correct selection is worth one point » des questions `multi`, qui est fausse sous la notation AWS tout ou rien.

## 1. Synthèse

| Fichier | Questions | Confirmées | Écarts | Signalements « ambigu » |
| --- | --- | --- | --- | --- |
| export.1 | 171 | 171 | 0 | 0 |
| export.2 | 171 | 171 | 0 | 0 |
| export.3 | 171 | 171 | 0 | 0 |
| export.4 | 171 | 171 | 0 | 0 |
| **Total** | **684** | **684** | **0** | **0** |

Aucun écart n'est à classer : il n'y a ni corrigé faux, ni ambiguïté signalée, ni fait à vérifier.

Remarque d'un relecteur, sans signalement (export.2) : dans `saac03-3a-memory-optimized-r`, la famille X offre plus de mémoire par vCPU que la famille R. Comme X ne figure pas parmi les options, la clé (famille R) reste la bonne réponse.

## 2. Limites

Ce sont les mêmes que pour les fondamentaux (`blind-fundamentals.md`) :

- Les relecteurs sont de la même famille de modèles que les rédacteurs. Une erreur que le rédacteur croit vraie peut donc passer. Un score de 100 % ne remplace pas la relecture humaine sur la documentation AWS.
- Seul l'anglais est exporté. Le français n'a pas été testé.
- Les questions faciles, dont les distracteurs s'éliminent d'eux-mêmes, gonflent le score.

## 3. Points des rapports de production à relire en priorité (`factory/reports/*saa-c03*`)

Ce sont les faits que les rédacteurs n'ont pas pu vérifier sur une page lue, et les cas où rédacteur et relecteur peuvent se tromper ensemble :

- **Passerelles NAT régionales** (Q-saa-c03-1c, 2a, 2c). Les questions sur une passerelle NAT par zone de disponibilité supposent une passerelle NAT **zonale**. `saac03-2d-nat-gateway-per-az` le dit explicitement, et aucune option « regional NAT gateway » n'est proposée : la clé `d` reste juste. À garder en tête si l'on durcit les distracteurs.
- **Faits écrits de mémoire, sans page lue** :
  - section « Not verified » de C-saa-c03-2, C-saa-c03-5 et Q-saa-c03-2b ;
  - dans Q-saa-c03-3c : taille des messages SNS ; tampons Firehose, que les questions évitent ;
  - dans Q-saa-c03-4c : délai de restauration des instantanés EBS archivés, formulé sans chiffre.
- **Statut des services** :
  - X-Ray SDK et démon en maintenance (C-saa-c03-2, Q-saa-c03-2d) : aucune question n'en dépend ;
  - AWS SCT remplacé par DMS Schema Conversion (Q-saa-c03-3b).
- **Savings Plans pour bases de données** (C-saa-c03-5) : offre récente, à vérifier sur la page de tarification au moment de la relecture.

## 4. Simulation

`npm run content:simulate -- --cert saa-c03 10` donne 10 examens de 65 questions, sur une banque de 684. Aucune question n'est réutilisée, aucune ne manque et aucun domaine n'est hors pondération. Il en va de même pour CLF-C02 et AIF-C01.
