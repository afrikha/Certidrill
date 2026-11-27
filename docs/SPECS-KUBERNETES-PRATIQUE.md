# Specs — Préparation pratique CKAD et CKA (exercices sans cluster)

27/11/2026 · complète « Specs — Certifications Kubernetes » (`docs/SPECS-KUBERNETES.md`, §4)

## 1. Objectif et positionnement

La CKAD et la CKA sont des examens pratiques : 2 heures, 15 à 20 tâches en ligne de commande sur de vrais clusters Kubernetes v1.37, réussite à 66 %, correction automatique. Les tâches existent en anglais, japonais et chinois simplifié, pas en français. L'achat de l'examen inclut deux sessions du simulateur killer.sh.

Certidrill ne fait **pas** tourner de cluster. Pour ces deux certifications, il propose une **préparation pratique sans cluster** :

- un cours en anglais (même format que les autres cours) ;
- des quiz de fin de chapitre (spec `docs/SPECS-QUIZ-CHAPITRE.md`) : questions 1 à 5 à choix multiple, questions 6 à 10 en exercices pratiques ;
- une banque d'**exercices pratiques** de deux nouveaux types, `command` et `manifest`, corrigés sans cluster ;
- des **séries d'entraînement chronométrées** : 17 exercices en 120 minutes, assemblés par le moteur d'examen actuel.

L'interface ne présente jamais ces séries comme des examens blancs réalistes. Elle dit ce qu'elles entraînent (commandes impératives, manifestes, vitesse) et ce qu'elles n'entraînent pas (dépannage d'un cluster réel). Elle renvoie vers le simulateur fourni avec l'examen pour la mise en condition. La CKS n'est pas couverte (elle demande un cluster pour presque toutes ses tâches).

## 2. Contenu livré

| Certification | Dossier | Domaines (poids) | Contenu |
| --- | --- | --- | --- |
| **CKAD** | `content/ckad/` | `design` 20 %, `deployment` 20 %, `observability` 15 %, `environment` 25 %, `networking` 20 % | 61 objectifs, 13 chapitres, 268 exercices `ckad-*`, 12 quiz `ckad-qz-*` (dont 60 exercices) |
| **CKA** | `content/cka/` | `storage` 10 %, `troubleshooting` 30 %, `workloads` 15 %, `cluster` 25 %, `networking` 20 % | 59 objectifs, 12 chapitres, 236 exercices `cka-*`, 11 quiz `cka-qz-*` (dont 55 exercices) |

- `vendor: CNCF`, `languages: [en]`, `active: false`, tout en `draft`.
- `blueprint.version: 'v1.37'` (pages Linux Foundation du 27/11/2026).
- **`blueprint.yaml` est livré sous le nom `blueprint.next.yaml`**. Tant que le code ne connaît pas les types `command` et `manifest`, un `blueprint.yaml` ferait échouer le chargement (schéma), la validation et le seed. Le dossier n'est donc pas encore vu comme une certification. Renommer le fichier à l'étape B (§7).
- Nouveau champ `certification.format: performance` (§5).
- Correctif local qui a servi à valider le contenu : `factory/k8s-practice-local.diff` (ajout des deux types dans `lib/`). Implémentation de référence du moteur : `factory/exercise.ts` ; contrôle du contenu : `factory/check-exercise.ts`.
- Hôtes de référence à ajouter à l'éditeur `cncf` (`lib/vendors.ts`) : `kubectl.docs.kubernetes.io` (documentation de Kustomize), `docs.docker.com` et `docs.podman.io` (images, CKAD 1.1). Sans eux, `content:validate` donne 20 avertissements sur `ckad`.
- Contrôles au 27/11/2026 (avec le correctif local) : `content:validate` 0 problème sur `ckad` et `cka` ; `check-exercise` 0 problème (328 et 291 exercices, quiz compris) ; `check-quiz` 0/0 ; 9 séries CKAD et 10 séries CKA de 17 exercices sans répétition.

## 3. Les deux types d'exercice

### 3.1 `command` : une ligne de commande

Le candidat tape **une** commande (champ texte monoligne, police à chasse fixe, invite `$`). Schémas : `commandBody`, `commandAnswer`, `commandResponse` de `factory/exercise.ts`.

- `body.mode` :
  - `object` : la commande crée ou modifie des objets. La correction porte sur les objets que kubectl produirait ;
  - `invocation` : la commande lit ou opère (`logs`, `exec`, `top`, `rollout undo`, `scale`, `auth can-i`, `helm upgrade --install`, `kubeadm upgrade apply`, `etcdctl snapshot save`…). La correction porte sur la commande analysée.
- `body.tools` : outils permis en premier mot (défaut `kubectl` ; `k` vaut `kubectl` ; `sudo` en tête est ignoré).
- `body.namespace` : namespace du contexte courant, affiché au candidat.
- `body.files` : fichiers du répertoire de travail, affichés au candidat (manifestes à modifier, fichiers de propriétés…).
- `answer.checks` : vérifications (§3.3).
- `answer.solution` : variantes correctes, la première est montrée en correction. En mode `object`, chacune porte `output`, la sortie attendue de kubectl.
- `answer.negatives` : erreurs plausibles, chacune doit échouer à au moins une vérification. Elles ne sont jamais envoyées au navigateur et servent aux tests (§6).

### 3.2 `manifest` : un fichier YAML

Le candidat écrit un ou plusieurs documents YAML dans un éditeur (coloration YAML, tabulation = 2 espaces, `body.starter` pré-rempli). Schémas : `manifestBody`, `manifestAnswer`, `manifestResponse`. La correction porte sur les documents analysés.

### 3.3 Vérifications

`{ id, label, select?, path, op, value? }`.

- `label` est affiché après validation, avec ✓ ou ✗ pour chaque vérification.
- `select: {kind, name}` désigne un document parmi plusieurs.
- `path` : clés pointées, `[0]`, `[name=app]`, `["app.kubernetes.io/name"]`. En mode `invocation`, le chemin porte sur `tool`, `verb`, `subverb`, `resource`, `names`, `args`, `flags.<nom long>` ou `rest`.
- Opérateurs : `equals`, `notEquals`, `quantity`, `exists`, `absent`, `contains`, `subset`, `matches`, `length`, `oneOf`. La sémantique exacte est celle de `evalCheck` dans `factory/exercise.ts` (comparaison des nombres et des chaînes numériques, quantités Kubernetes, sous-ensembles sans ordre).

### 3.4 Moteur de correction (serveur)

Porter `factory/exercise.ts` dans `lib/exercises/` (même API, tests unitaires), puis ajouter l'exécution réelle pour le mode `object` :

1. **Analyse** : `splitWords` refuse les opérateurs du shell (`| ; & < > $ ( )` et l'accent grave ; les accolades restent permises, pour `-o jsonpath={…}`). `parseCommand` normalise l'outil, le verbe, la ressource, les noms et les options courtes. Une commande refusée vaut 0 point, avec le message d'erreur affiché.
2. **Mode `object`** : exécuter le binaire **kubectl v1.37**, embarqué dans l'image, avec `execFile` sans shell, les arguments analysés et :
   - un kubeconfig factice et `--validate=false` : aucun accès réseau ;
   - `--dry-run=client -o yaml` ajouté s'il manque ; une valeur `server` ou `none` est remplacée par `client` ;
   - si la commande vise un objet donné dans `body.files` (`set image deployment/web`, `label`, `annotate`, `expose`) : réécriture en `-f <fichier> --local -o yaml` ;
   - `cwd` = répertoire temporaire contenant `body.files`, délai de 5 secondes, sortie limitée à 1 Mo, environnement vidé (`HOME` temporaire, pas de `KUBECONFIG` réel) ;
   - liste blanche des sous-commandes : celles du §3.1 de `factory/BRIEF-PRACTICE.md`. Toute autre commande vaut 0 point en mode `object`.

   Vérifier une à une, dans des tests, que chaque sous-commande de la liste fonctionne sans serveur. `kubectl expose` sur un objet nommé interroge le serveur : il ne se joue qu'avec `-f`. Si une sous-commande ne peut pas fonctionner hors ligne, la retirer de la liste et le signaler.
3. **Mode `invocation`** et **`manifest`** : pas d'exécution ; analyse puis `checkInvocation` ou `parseDocs` + `checkDocs`. Un YAML invalide vaut 0 point, avec l'erreur et sa ligne affichées.
4. **Notation** : `blueprint.scoring.command` et `.manifest` valent `per_check` (1 point par vérification réussie, les points maximum sont le nombre de vérifications) ou `all_or_nothing`. CKAD et CKA : `per_check`. La correction est asynchrone (kubectl) ; `scoreItem` reçoit le résultat déjà calculé. Les résultats par vérification sont stockés avec la réponse, pour la revue.

### 3.5 Sécurité

- Jamais de shell. Une seule ligne de 2 000 caractères au plus, manifeste de 50 Ko au plus.
- kubectl tourne sans identifiants, sans réseau (`--server` refusé, `--kubeconfig` et `--token` retirés), dans un répertoire temporaire supprimé après usage.
- Limiter la concurrence : 4 exécutions simultanées par instance, file d'attente, réponse « réessayez » au-delà de 10 secondes.
- Rien ne tourne sur le serveur hors du conteneur de l'application. Pas de nouveau service : le VPS est partagé avec ClaiRH (README, « Serveur actuel »).

## 4. Interface

- **Exercice `command`** : énoncé, fichiers (onglets en lecture seule), invite `$` avec le namespace du contexte, champ de commande. Après validation : liste des vérifications ✓/✗, solution, explication, références.
- **Exercice `manifest`** : énoncé, fichiers, éditeur YAML (léger : textarea à chasse fixe avec numéros de ligne ; CodeMirror si déjà présent). Après validation, même affichage, plus l'erreur YAML le cas échéant.
- Le corrigé n'est jamais envoyé au navigateur avant la validation (même règle que l'examen).
- **Série chronométrée** : le moteur d'examen actuel avec `typeMix` `command`/`manifest`, 17 exercices, 120 minutes, réussite à 66 %. Titre « Série d'entraînement pratique », jamais « Examen blanc ».

## 5. Certifications au format « performance »

`certification.format: performance` (`multiple-choice` par défaut) change :

- les libellés : « Série d'entraînement pratique » au lieu d'« Examen blanc », dans le catalogue, le tableau de bord, les résultats et les e-mails ;
- un bandeau sur la fiche de la certification et en tête de chaque série : « L'examen réel se passe sur de vrais clusters. Ces exercices entraînent les commandes et les manifestes sans cluster. Pour la mise en condition, utilisez aussi les deux sessions du simulateur fournies avec l'examen. » (et la version anglaise) ;
- l'indice de préparation, affiché « Préparation aux commandes et manifestes », pour ne pas promettre la réussite.

## 6. Validation du contenu

Dans `tools/validate-questions.ts`, pour chaque exercice :

- schéma ;
- chaque `solution` réussit toutes les vérifications. En mode `object`, contre la **sortie réelle de kubectl** quand le binaire est disponible (CI), sinon contre `output` ;
- chaque `negative` échoue à au moins une vérification ;
- `select` désigne un document ;
- les `apiVersion`/`kind` sont servis par Kubernetes v1.37 (table de `factory/check-exercise.ts`).

En CI, installer kubectl v1.37 (version épinglée, somme de contrôle vérifiée). Le contenu a été contrôlé localement contre `output`, sans kubectl : un écart entre `output` et la sortie réelle est un défaut de contenu à me signaler, pas une raison d'assouplir le test.

## 7. Procédure

| Étape | Terminé quand |
| --- | --- |
| A. `lib/exercises/` : port de `factory/exercise.ts`, exécution kubectl (§3.4), sécurité (§3.5), tests | Tests verts, dont un test par sous-commande de la liste blanche |
| B. Types `command` et `manifest` dans les schémas (`factory/k8s-practice-local.diff` comme point de départ), notation `per_check`, `certification.format`, renommage `blueprint.next.yaml` → `blueprint.yaml` pour `ckad` et `cka` | `content:validate` : 0 problème sur toutes les certifications ; les solutions de tous les exercices passent avec le vrai kubectl |
| C. Interface (§4, §5), quiz de fin de chapitre avec exercices | e2e : un exercice de chaque type et une série CKAD de bout en bout, en anglais avec l'interface en français |
| D. Relecture humaine et publication | Décision du propriétaire |

## 8. Critères d'acceptation

- Aucune commande du candidat n'est exécutée dans un shell ; kubectl n'a ni réseau ni identifiants (tests).
- Toutes les solutions de la banque passent, toutes les « négatives » échouent, avec le vrai kubectl v1.37 en CI.
- Une série CKAD de 17 exercices se passe de bout en bout. Le score s'affiche en pourcentage avec le détail par vérification.
- Aucun libellé « examen blanc » pour une certification `format: performance`.
- Aucune régression sur les autres certifications.

## 9. Points à confirmer par le propriétaire

- Prix et niveau d'accès de la préparation CKAD et CKA (proposition : mêmes règles que les autres certifications, premier chapitre et son quiz gratuits).
- Notation `per_check` : la Linux Foundation ne publie ni crédit partiel ni poids des tâches. `per_check` récompense le travail partiel ; `all_or_nothing` est plus sévère.
- Ordre de mise en ligne : CKAD d'abord, CKA quand son contenu sera relu.
