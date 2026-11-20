# Specs — Module Cours AZ-104

16/11/2026 · complète « Specs — Plateforme d'examens blancs AZ-104 »

## 1. Objectif

Ajouter à Certidrill un cours qui prépare à l'examen, en plus des examens blancs. Le candidat lit un chapitre, passe un examen blanc, puis la correction le renvoie vers la section du cours qui couvre chaque question ratée.

Le contenu est déjà rédigé (anglais et français) et validé par script. Ce document décrit ce que Claude Code doit construire autour : chargement, stockage, pages de lecture, progression, liens avec les examens et contrôle d'accès.

Principe inchangé : tout ce qui décrit une certification est de la donnée versionnée. Ajouter le cours d'une autre certification ne doit demander que des fichiers dans `content/`.

## 2. Contenu livré

À placer tel quel dans le dépôt (archive `certidrill-cours-az-104.zip`, à décompresser à la racine) :

```text
content/az-104/course/
  course.yaml                      manifeste : modules, ordre des chapitres, titres, durée, références, statut
  chapters/<id>.en.md              16 chapitres en anglais
  chapters/<id>.fr.md              les mêmes en français
```

| Élément | Valeur |
| --- | --- |
| Chapitres | 16 : 1 introduction + 1 par groupe fonctionnel du guide d'étude (15) |
| Sections | 107, chacune avec un identifiant stable |
| Objectifs couverts | 81 sur 81 (`objectives.yaml`, référentiel du 26/10/2023, revérifié le 16/11/2026) |
| Volume | environ 26 400 mots en anglais, 31 000 en français, hors blocs de code |
| Références | jusqu'à 6 pages Microsoft Learn par chapitre, reprises des questions de la banque |
| Statut | `draft` sur tous les chapitres, jusqu'à relecture humaine |

Le découpage suit les domaines de `blueprint.yaml` : `intro`, `identities`, `storage`, `compute`, `networking`, `monitoring`.

## 3. Format des fichiers

### 3.1 `course.yaml`

```yaml
version: 1
certification: az-104
blueprintVersion: '2023-10-26'
modules:
  - code: identities            # code de domaine du blueprint, ou "intro"
    title: { en: ..., fr: ... }
chapters:                       # l'ordre de la liste est l'ordre d'affichage
  - id: 12-rbac                 # = nom des fichiers chapters/12-rbac.<locale>.md
    module: identities
    status: draft               # valeurs de ContentStatus, même cycle que les questions
    free: false                 # true = lisible au niveau gratuit
    title: { en: ..., fr: ... }
    minutes: 15                 # durée de lecture estimée
    references:
      - { title: ..., url: https://learn.microsoft.com/en-us/... }
```

Les sections, leurs titres et leurs objectifs ne sont pas dans le manifeste : ils se lisent dans les fichiers Markdown, pour n'avoir qu'une source.

### 3.2 Fichiers de chapitre

```markdown
Paragraphe d'introduction du chapitre (le « chapeau », sans titre).

<!-- section: rbac-model | objectives: 1.2.1 -->
## Titre de la section

Contenu en Markdown GFM...

<!-- section: key-points -->
## Points clés
```

Règles, toutes vérifiées sur le contenu livré :

- Pas de titre H1 (le titre vient du manifeste), pas de titre sous H2.
- Chaque section commence par un marqueur `<!-- section: <id> | objectives: <codes> -->` suivi d'un H2. `objectives` est facultatif (introduction, « Points clés »). Les identifiants sont uniques dans le chapitre et identiques dans les deux langues.
- Markdown GFM uniquement : paragraphes, listes, tableaux, blocs de code, citations. Pas d'image, pas de HTML (le rendu actuel `lib/markdown.ts` les retire).
- Langages des blocs de code : `bash`, `powershell`, `json`, `bicep`, `kusto`, `yaml`, `python`, `javascript`, `typescript`, `java`, `text`. Les blocs de code sont strictement identiques en anglais et en français (commentaires compris).
- Encadrés : une citation qui commence par un libellé en gras. Deux libellés seulement : `**Exam trap.**` / `**Piège d'examen.**` et `**Exam tip.**` / `**Conseil d'examen.**`.
- Français : terminologie du glossaire partagé `content/glossary.yaml` (et de `content/<code>/glossary.yaml`) ; noms de services, de rôles, de SKU, commandes et valeurs techniques en anglais ; niveaux de stockage écrits « niveau froid (Cool) », « niveau froid (Cold) » comme dans la banque.

## 4. Chargement, validation et seed

Étendre l'existant (`lib/content/loader.ts`, `lib/content/schema.ts`, `lib/content/seed.ts`, `tools/validate-questions.ts`) :

- `loadCourse(dir)` : lit `course.yaml` (schéma Zod), puis chaque fichier de chapitre, et découpe sur les marqueurs. Résultat par section : `id`, `objectives`, `title {en, fr}`, `body {en, fr}` (Markdown sans la ligne H2). Le chapeau devient le `summary {en, fr}` du chapitre. Un dossier de certification sans `course/` n'a simplement pas de cours.
- `npm run content:validate` vérifie aussi le cours et échoue sinon :

| Contrôle | Détail |
| --- | --- |
| Fichiers | Les deux langues existent pour chaque chapitre du manifeste ; aucun fichier orphelin |
| Parité EN/FR | Même suite d'identifiants de section, mêmes objectifs, mêmes blocs de code, même nombre de lignes et de colonnes de tableau, même nombre d'encadrés |
| Objectifs | Chaque code existe dans `objectives.yaml` et appartient au domaine du chapitre ; chaque objectif du référentiel est couvert par au moins une section |
| Markdown | Marqueur + H2 pour chaque section ; pas de H1, d'image ni de `<` hors code ; langages de code autorisés ; blocs de code fermés |
| Références | URL en `https://learn.microsoft.com/` |

- `npm run seed` charge le cours en base, de façon idempotente : le dépôt fait foi. Une section ou un chapitre retiré des fichiers est supprimé en base (la progression associée part avec).
- `content:status` gère aussi le statut des chapitres.
- Créer `tools/course/WRITING_GUIDE.md` à partir du paragraphe 3.2.

## 5. Modèle de données

Trois tables, sur le modèle des tables de contenu existantes :

| Table | Rôle | Champs principaux |
| --- | --- | --- |
| `course_chapter` | Un chapitre | id, certificationId, code, module, order, title (JSON en/fr), summary (JSON), minutes, references (JSON), status (`ContentStatus`) ; unique (certificationId, code) |
| `course_section` | Une section | id, chapterId, code, order, title (JSON), body (JSON en/fr, Markdown) ; unique (chapterId, code) ; relation n-n avec `objective` |
| `course_progress` | Lecture d'une section par un utilisateur | userId, sectionId, readAt ; unique (userId, sectionId) ; suppression en cascade |

`course_progress` est une donnée personnelle : l'ajouter à l'export et à la suppression de compte.

## 6. Pages et parcours

Toutes dans le groupe `(app)` (utilisateur connecté), dans la langue de l'utilisateur.

| Route | Contenu |
| --- | --- |
| `/course/[certification]` | Sommaire : modules, chapitres avec durée, nombre de sections lues, barre de progression globale, bouton « Reprendre » (première section non lue), mise en avant des chapitres des domaines faibles du dernier examen |
| `/course/[certification]/[chapter]` | Chapeau, table des matières du chapitre (fixe sur grand écran, repliable sur mobile), sections, références « Pour aller plus loin », chapitre précédent et suivant |
| `/course/[certification]/[chapter]#<section>` | Même page, ancrée sur la section |

Dans une page de chapitre :

- Chaque section est un `<section id="<code>">` avec son H2, ses objectifs sous forme de pastilles (code + intitulé dans la langue) et un bouton « Marquer comme lu » (action serveur, réversible). Un chapitre est terminé quand toutes ses sections sont lues.
- Le Markdown passe par `renderMarkdown` existant ; mettre le HTML en cache par (section, langue, version du contenu).
- Tableaux et blocs de code défilent horizontalement sur petit écran, sans casser la mise en page. Lecture confortable sur téléphone : c'est l'usage principal attendu du cours.
- Encadrés stylés (citation avec libellé en gras). Bouton « Copier » sur les blocs de code.
- Les références pointent vers Microsoft Learn dans la langue de l'utilisateur (`/en-us/` remplacé par `/fr-fr/`).

Entrée « Cours » dans la navigation, et carte sur le tableau de bord (progression, chapitre suivant).

## 7. Liens avec les examens

- **Correction** (`results/[id]/review`) : sous l'explication de chaque question, un lien « Revoir le cours : <titre de la section> » vers la ou les sections qui couvrent l'objectif de la question (dans l'ordre du cours, deux au plus).
- **Rapport de score** : pour chaque domaine sous le seuil, la liste des chapitres à revoir.
- **Tableau de bord** : après un examen, suggestion des trois sections les plus liées aux questions ratées.
- **Pendant un examen** : aucun lien vers le cours dans l'interface d'examen. Le cours ne donne jamais la réponse d'une question précise ; il n'y a donc rien d'autre à verrouiller.

La correspondance question → section se calcule à partir de `objective` ; aucune donnée à saisir.

## 8. Accès

À appliquer avec `getAccess` existant (niveau `free` ou `full` sur la certification) :

| Contenu | Niveau gratuit | Accès complet |
| --- | --- | --- |
| Sommaire, titres des chapitres et des sections | Oui | Oui |
| Chapitres `00-getting-started` et `11-entra-users-groups` | Oui | Oui |
| Autres chapitres | Titres seulement + renvoi vers l'offre | Oui |

- Le contrôle est côté serveur : le corps d'une section verrouillée n'est jamais envoyé au navigateur.
- La liste des chapitres gratuits est une donnée (`free: true` dans `course.yaml`, déjà renseigné pour ces deux chapitres), pas du code.
- Un chapitre `draft` ou `reviewed` n'est visible que des administrateurs (aperçu). Seuls les chapitres `published` sont visibles des utilisateurs, comme pour les questions.
- Les liens depuis la correction suivent la même règle : pour un utilisateur gratuit, le lien vers une section verrouillée mène à l'écran d'offre.

## 9. Back-office

- Liste des chapitres avec statut, nombre de sections, date de dernière modification du contenu.
- Aperçu d'un chapitre tel qu'affiché, avec bascule EN/FR et vue côte à côte pour la relecture.
- Changement de statut (journalisé dans le journal d'audit).
- Statistiques simples par chapitre : lecteurs, sections lues.

## 10. Exigences

- **Sécurité** : rendu assaini existant, contrôle d'accès sur chaque route et chaque action, limitation de débit sur « Marquer comme lu ».
- **Accessibilité** : WCAG 2.1 AA, hiérarchie de titres correcte, tableaux avec en-têtes, table des matières navigable au clavier, blocs de code focalisables.
- **Performance** : page de chapitre servie en moins de 300 ms (HTML en cache), aucun JavaScript nécessaire pour lire.
- **Internationalisation** : libellés dans `messages/en.json` et `messages/fr.json` ; le changement de langue garde le chapitre et l'ancre.
- **Tests** : unitaires sur le chargeur et le validateur (un cas par contrôle du tableau du paragraphe 4) ; intégration sur le seed (idempotence, suppression d'une section) et sur l'accès (gratuit, complet, brouillon) ; Playwright : lire un chapitre, marquer une section, suivre un lien depuis la correction.
- **Qualité** : mêmes règles que le reste du dépôt (TypeScript strict, ESLint, SonarQube, couverture).

## 11. Lots

| Lot | Contenu | Terminé quand |
| --- | --- | --- |
| A. Contenu | Fichiers du cours dans le dépôt, schéma Zod, chargeur, validation, migration Prisma, seed, guide de rédaction | `content:validate` passe avec les contrôles du paragraphe 4 ; `seed` charge 16 chapitres et 107 sections |
| B. Lecture | Sommaire, page de chapitre, progression, navigation, tableau de bord | Parcours Playwright de lecture vert, sur ordinateur et sur mobile |
| C. Examens et accès | Liens depuis la correction et le rapport, règles d'accès, chapitres gratuits | Un utilisateur gratuit ne reçoit jamais le corps d'un chapitre payant, même par appel direct |
| D. Back-office | Aperçu, statuts, statistiques | Un chapitre passe de `draft` à `published` depuis l'interface et devient visible |

Travailler lot par lot, tests verts avant le lot suivant, une PR par lot.

## 12. Critères d'acceptation

- [ ] Les 16 chapitres s'affichent en anglais et en français, tableaux et code compris, sur ordinateur et sur téléphone.
- [ ] Chaque section a une ancre stable ; l'URL d'une section reste valable après un nouveau seed.
- [ ] `content:validate` échoue si une section manque dans une langue, si un objectif n'est plus couvert ou si un bloc de code diffère entre les langues.
- [ ] Depuis la correction, chaque question mène à une section qui traite son objectif.
- [ ] La progression est conservée, visible sur le sommaire et le tableau de bord, exportée et supprimée avec le compte.
- [ ] Un chapitre non publié est invisible hors administration ; un chapitre payant n'est lisible qu'avec un accès complet.
- [ ] Ajouter le cours d'une autre certification ne demande que des fichiers dans `content/<code>/course/`.

## 13. Points à confirmer par le propriétaire

1. **Périmètre gratuit** : les chapitres 00 et 11 gratuits, le reste réservé à l'accès complet (proposition du paragraphe 8).
2. **Pages publiques** : rendre le sommaire et le chapitre d'introduction indexables (`/en/course/az-104`, `/fr/course/az-104`) pour le référencement. Non inclus dans les lots ci-dessus.
3. **Publication** : relecture humaine des 16 chapitres avant passage à `published`, chapitre par chapitre.

## 14. Hors périmètre

Quiz en fin de section (à relier au mode entraînement prévu en V2), schémas et images, recherche dans le cours, export PDF, fiches de révision.

## 15. Maintenance du contenu

- À chaque mise à jour du guide d'étude : resynchroniser `objectives.yaml`, puis `content:validate` signale les objectifs non couverts.
- Faits datés à revoir à chaque révision : retrait d'Azure Disk Encryption (15/09/2028), sous-réseaux privés par défaut pour les réseaux virtuels créés après le 31/03/2026, retrait des journaux de flux NSG (30/09/2027), SKU Basic retirés (IP publique et équilibreur de charge, 30/09/2025), limites et niveaux tarifaires App Service et Azure Bastion.
