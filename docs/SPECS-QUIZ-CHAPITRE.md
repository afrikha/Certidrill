# Specs — Quiz de fin de chapitre

24/11/2026 · complète « Specs — Module Cours » (`docs/SPECS-COURS.md`, §14 qui mettait les quiz hors périmètre)

## 1. Objectif

Après chaque chapitre du cours, l'élève consolide et valide ses acquis avec **10 questions de difficulté croissante** :

- questions 1 à 5 : consolidation (rappel des notions, puis application simple) ;
- questions 6 à 10 : **niveau de l'examen réel**, les plus difficiles du chapitre ;
- aucune de ces questions n'apparaît dans les examens blancs (exigence du propriétaire pour les 5 plus difficiles ; appliquée aux 10, plus simple et plus sûr).

Première certification : AZ-104 (15 quiz, `00-getting-started` n'en a pas). Puis, le 24/11/2026, les 22 autres certifications Microsoft (AI-103, AI-200, AI-300, AI-901, AZ-120, AZ-140, AZ-305, AZ-400, AZ-700, AZ-802, AZ-900, DP-300, DP-420, DP-600, DP-700, DP-750, DP-800, DP-900, SC-100, SC-200, SC-500, SC-900 : 282 quiz). Même format partout, sans code propre à une certification ; pour une certification fondamentale (AZ-900, DP-900, SC-900, AI-901), le « niveau examen » est celui de cet examen fondamental.

## 2. Contenu livré

`content/<certification>/quizzes/<chapterId>.yaml`, un fichier par chapitre (297 fichiers, 2 970 questions au 24/11/2026). Exemple AZ-104 :

```yaml
chapter: 12-rbac
questions:            # exactement 10, dans l'ordre de difficulté croissante
  - id: az104-qz-12-01
    objective: "1.2.1"
    difficulty: 1
    status: draft
    type: single
    stem: { en: "…", fr: "…" }
    body: { … }
    answer: { … }
    explanation: { … }
    references: [ … ]
  - …
```

- Chaque élément de `questions` a **exactement le format d'une question de la banque** (`questionFileSchema` de `lib/questions/schema.ts`), tous types sauf `series_yesno`, sans `caseStudy` ni `series`. Règle des langues inchangée (`certification.languages`).
- Identifiant : `<code sans tiret>-qz-<numéro du chapitre>-<position 01..10>`, unique dans tout le dépôt (même espace que les questions de la banque).
- Positions 1–5 : `difficulty` 1 puis 2, jamais décroissante. Positions 6–10 : `difficulty` 3, au moins deux formats autres que `single` (`multi`, `dropdown`, `dragdrop`, `ordering`, `yesno_statements`, `hotarea`).
- Les objectifs des questions sont ceux du chapitre (marqueurs de section) et chaque objectif du chapitre est testé au moins une fois.
- Aucune question proche d'une question d'examen blanc : identifiant différent et énoncé éloigné (contrôle par similarité, §4).
- Tout est `draft` jusqu'à relecture humaine.
- Le dossier `quizzes/` est à côté de `questions/` et de `course/`, pas dedans : la banque d'examen ne lit que `questions/`, `case-studies/` et `series/`, et la validation du cours signale tout fichier de `course/` qui n'est pas un chapitre.

Contrôle utilisé par l'atelier : `npx tsx factory/check-quiz.ts <certification>` (à intégrer à `content:validate`, §4). Consignes de rédaction : `factory/BRIEF-QUIZ.md`.

## 3. Ce que voit l'élève

### 3.1 Entrée

- En bas de chaque page de chapitre (après « Points clés », avant chapitre précédent / suivant) : un encadré « Valider le chapitre : 10 questions, environ 15 minutes », avec le meilleur résultat obtenu s'il existe.
- Sommaire du cours : à côté de chaque chapitre, son état (non tenté, à revoir, acquis) et le meilleur score.
- Le quiz se lance même si toutes les sections ne sont pas lues (on peut vouloir se tester d'abord) ; le bouton est mis en avant quand le chapitre est terminé.

### 3.2 Déroulé

- Route : `/course/[certification]/[chapter]/quiz`.
- Les 10 questions dans l'ordre du fichier (l'ordre porte la difficulté croissante) ; options mélangées comme à l'examen (`shuffle`), ordre gelé pour la tentative.
- Une question à la fois, avec un indicateur « Consolidation » (1–5) puis « Niveau examen » (6–10).
- Pas de minuteur. Bouton « Valider » : la correction s'affiche aussitôt (bonne réponse, explication, explication de chaque mauvaise option, références, lien « Revoir la section » vers la section du cours qui couvre l'objectif). Puis « Question suivante ».
- Mêmes composants d'affichage et de saisie que l'examen (tous les types), même notation (`lib/exam/scoring.ts`, règles de `blueprint.scoring`). Une question compte comme réussie si elle obtient tous ses points.
- Le corrigé et l'explication d'une question ne sont envoyés au navigateur qu'après validation de cette question (même règle que l'examen).

### 3.3 Résultat

- Score sur 10, détail consolidation (x/5) et niveau examen (y/5).
- **Chapitre acquis** : au moins 8/10 dont au moins 4/5 sur les questions 6 à 10. Sinon « À revoir », avec la liste des sections à relire (celles des objectifs des questions ratées, dans l'ordre du cours).
- On peut recommencer autant de fois qu'on veut ; on conserve le meilleur résultat et la date. Une nouvelle tentative remélange les options, pas l'ordre des questions.
- Les quiz n'entrent pas dans le score de préparation ni dans les statistiques d'examen ; ils peuvent donner de l'XP si la progression le prévoit (à décider, §8).

## 4. Données, chargement et validation

### 4.1 Base

- Les questions de quiz vont dans la table `Question` existante, pour réutiliser rendu, notation, signalement (`QuestionReport`) et publication, avec trois colonnes nouvelles :
  - `usage QuestionUsage @default(exam)` (`enum QuestionUsage { exam quiz }`) ;
  - `chapterId String?` (relation vers `CourseChapter`) ;
  - `quizPosition Int?` (1..10), avec `@@unique([chapterId, quizPosition])`.
- **Garantie « absent des examens blancs »** : toute requête qui alimente un examen ou un entraînement (`lib/exam/bank-query.ts` et tout autre point de sélection, statistiques de la banque, export à l'aveugle, simulation) filtre `usage: exam`. Centraliser ce filtre en un seul endroit, et ajouter des tests : un examen assemblé ne contient jamais de question `quiz`, même avec `EXAM_INCLUDE_UNPUBLISHED=true` ; les compteurs de la banque par type, difficulté et domaine ignorent les quiz.
- Tentatives : nouvelle table `QuizAttempt` (`id`, `userId`, `chapterId`, `locale`, `optionOrder Json`, `responses Json`, `results Json` par position, `score Int?`, `hardScore Int?`, `passed Boolean?`, `startedAt`, `completedAt`). Ne pas réutiliser `Attempt` : son index partiel « une tentative en cours par utilisateur et certification » bloquerait l'examen pendant un quiz.

### 4.2 Seed et publication

- `lib/content/seed.ts` lit `quizzes/*.yaml` après les chapitres : chaque question est créée ou mise à jour avec `usage: quiz`, `chapterId`, `quizPosition`, et les mêmes règles de statut et de version que les questions de la banque.
- Un quiz est visible des élèves quand ses 10 questions sont `published` (sinon seulement en aperçu administrateur). Back-office : liste des quiz par chapitre, aperçu question par question avec bascule EN/FR, même parcours de relecture que la banque.

### 4.3 Validation (`content:validate`)

Reprendre les règles de `factory/check-quiz.ts` dans `tools/validate-questions.ts` (option `--course` ou nouvelle option `--quizzes`) :

- schéma de question et règle des langues pour chaque élément ;
- `chapter` égal au nom du fichier, chapitre existant et non `00-getting-started` ;
- exactement 10 questions ; identifiants attendus ; identifiants uniques dans tout le dépôt ;
- positions 1–5 en difficulté 1–2 non décroissante (la première en 1), positions 6–10 en difficulté 3 ; au moins deux formats autres que `single` en 6–10 ;
- objectifs du chapitre seulement, et tous testés ;
- explication de chaque mauvaise option (`single`, `multi`) ; références sur les hôtes de l'éditeur (avertissement) ; terminologie (avertissement) ;
- **similarité avec la banque** : similarité de Jaccard sur les 4-grammes de mots de l'énoncé anglais < 0,35 avec chaque question d'examen de la même certification (problème bloquant au-delà).

## 5. Accès

- Même règle que le chapitre : quiz des chapitres gratuits (`free: true`) accessible au niveau gratuit, les autres avec l'accès complet. Contrôle côté serveur.
- Pendant un examen blanc, aucun lien vers les quiz.

## 6. Procédure

| Étape | Terminé quand |
| --- | --- |
| A. Schéma Prisma (`usage`, `chapterId`, `quizPosition`, `QuizAttempt`), migration, filtre `usage: exam` centralisé et testé | Tests verts ; un examen assemblé ne contient aucune question de quiz |
| B. Validation (§4.3) et seed (§4.2) | `content:validate` : 0 problème sur toutes les certifications qui ont des quiz ; seed idempotent |
| C. Parcours élève (§3) et accès (§5) | e2e : un quiz AZ-104 de bout en bout en français et en anglais, correction après chaque question, résultat et meilleur score |
| D. Back-office et relecture | Les quiz se relisent et se publient comme la banque |
| E. Relecture humaine des 2 970 questions (AZ-104 d'abord), publication | Décision du propriétaire |

## 7. Critères d'acceptation

- Chaque chapitre des 23 certifications Microsoft (sauf `00-getting-started`) propose un quiz de 10 questions dans l'ordre de difficulté, les 5 dernières au niveau de l'examen.
- Aucune question de quiz ne peut sortir dans un examen blanc ni dans un entraînement (test automatisé).
- Le corrigé n'est jamais envoyé avant la validation de la question.
- Le sommaire du cours montre l'état de chaque quiz ; le meilleur résultat est conservé.
- Aucune régression sur les examens blancs (assemblage, notation, rapports).

## 8. Points à confirmer par le propriétaire

- Seuil « acquis » (proposé : 8/10 dont 4/5 au niveau examen).
- XP de progression pour un quiz réussi (proposé : oui, une seule fois par chapitre).
- Quiz des chapitres gratuits ouverts au niveau gratuit (proposé : oui, comme vitrine).
