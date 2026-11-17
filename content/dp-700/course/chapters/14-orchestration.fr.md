L'orchestration décide quel élément fait le travail (Dataflow Gen2, pipeline, notebook), quand il s'exécute (planification, événement, autre élément) et comment les valeurs circulent entre les étapes (paramètres, variables, sorties d'activité, valeurs de sortie des notebooks). Les questions d'examen décrivent les compétences d'une équipe, un volume de données et une exigence de délai, ou montrent une expression de pipeline à compléter, et demandent l'élément, le déclencheur ou l'expression.

<!-- section: choose-item | objectives: 1.4.1 -->
## Choisir entre Dataflow Gen2, un pipeline et un notebook

Les trois éléments se recoupent, mais chacun a un rôle principal :

| | Dataflow Gen2 | Pipeline | Notebook |
| --- | --- | --- | --- |
| Rôle principal | Ingérer et transformer avec Power Query | Orchestrer des activités et copier des données à grande échelle | Ingestion, transformation et traitement par le code |
| Code | Sans code ou low-code (M en arrière-plan) | Sans code ou low-code (canevas, expressions JSON) | Code : PySpark, Scala, Spark SQL, R |
| Compétences | ETL, M, SQL | ETL, SQL, JSON | Spark |
| Connecteurs | Plus de 150 | Plus de 50 sources, plus de 40 destinations pour la copie | Des centaines de bibliothèques Spark |
| Transformations | Faibles à élevées : plus de 300 fonctions de transformation | Faibles : conversion de type, mappage de colonnes, fusion ou fractionnement de fichiers, aplatissement de hiérarchie | Faibles à élevées : Spark natif et bibliothèques open source |
| Flux de contrôle | Aucun (une actualisation) | ForEach, If condition, Switch, Until, Wait, Fail, Invoke pipeline... | Code Python, `notebookutils.notebook.run` et `runMultiple` |
| Profil type | Analyste métier, intégrateur de données | Ingénieur données, intégrateur de données | Ingénieur données |

Deux voisins complètent le tableau : le **travail de copie** (copy job : copie complète ou incrémentielle pilotée par un Assistant, avec prise en charge de la CDC, sans pipeline à concevoir) et la **définition de travail Spark** (code Spark non interactif, préférable à un notebook pour les flux de production de longue durée).

| Exigence | Élément |
| --- | --- |
| Des analystes nettoient et fusionnent des données Excel, SharePoint et SQL, sans code | Dataflow Gen2 |
| Copier des pétaoctets depuis des sources locales et cloud selon une planification, avec un minimum de code | Pipeline avec une activité Copy data |
| Exécuter un dataflow, puis un notebook, puis une procédure stockée, et envoyer un e-mail en cas d'échec | Pipeline qui appelle les trois éléments |
| Analyser du JSON imbriqué à grande échelle, appeler une bibliothèque Python, écrire des tables Delta | Notebook |
| Copie incrémentielle depuis un SQL Server où la CDC est activée, avec un chargement complet initial, Assistant uniquement | Travail de copie |
| Boucler sur une liste de 200 tables et copier chacune | Pipeline : Lookup, puis ForEach avec une activité Copy data |

> **Piège d'examen.** Un pipeline orchestre ; ce n'est pas un moteur de transformation. « Transformations complexes avec un minimum de code » relève de Dataflow Gen2 ; « transformations complexes par des développeurs Python » relève d'un notebook. Le pipeline ne fait que les appeler dans l'ordre, avec nouvelles tentatives et alertes.

<!-- section: schedules | objectives: 1.4.2 -->
## Concevoir des planifications

Les pipelines, les notebooks, Dataflow Gen2 et d'autres éléments utilisent le **planificateur de travaux** de Fabric. Les éléments ne sont pas planifiés par défaut : ouvrez **Planifier** et ajoutez une ou plusieurs planifications, chacune avec un début, une fin, une récurrence et un fuseau horaire.

| Récurrence | Options |
| --- | --- |
| Par minute | Toutes les 1 à 720 minutes |
| Toutes les heures | Toutes les 1 à 72 heures |
| Quotidienne | Jusqu'à 10 fois par jour |
| Hebdomadaire | Jours de semaine choisis, jusqu'à 10 fois par semaine |
| Mensuelle | Tous les 1 à 12 mois, ou à des dates ou jours de semaine précis du mois |

Règles à retenir :

- Les planifications sans fin ne sont pas prises en charge : définissez une date de fin lointaine comme `01/01/2099` pour une planification permanente. Le planificateur gère l'heure d'été et ignore les dates invalides comme le 30 février.
- Un pipeline accepte jusqu'à **20 planifications**, chacune avec sa propre récurrence. Une planification peut transmettre des valeurs aux **paramètres** du pipeline, directement ou depuis une **bibliothèque de variables** ; un nom qui ne correspond pas exactement est ignoré.
- Les **planifications par intervalle** (préversion) s'exécutent sur des fenêtres fixes sans chevauchement et exposent **Window start time** et **Window end time** comme paramètres de déclencheur, ce qui convient aux chargements incrémentiels par tranche de temps. Elles ne se modifient pas : supprimez-les et recréez-les.
- Créer ou modifier une planification demande le rôle **Contributor** dans l'espace de travail ou **Write** sur l'élément ; les Viewers voient seulement les planifications.
- Les **notifications d'échec** partent par e-mail vers des utilisateurs ou groupes du locataire, uniquement pour les exécutions **planifiées**, jamais pour les exécutions à la demande.
- Limites : 100 travaux simultanés par élément, 24 jours au maximum par travail, et la planification est désactivée après des échecs consécutifs répétés (en général 10) jusqu'à ce que quelqu'un la relance.
- Une planification **expire** si son propriétaire ne se connecte pas à Fabric pendant 90 jours consécutifs. Les pipelines de déploiement emportent les planifications, et Git les stocke dans un fichier `.schedules` de la définition de l'élément.

> **Piège d'examen.** « Envoyer un e-mail quand l'exécution nocturne échoue » relève de la notification d'échec de la planification. « Envoyer un message Teams quand une exécution manuelle échoue aussi » demande une activité sur le chemin d'échec du pipeline (activité Teams), car les notifications ignorent les exécutions à la demande.

Les **conditions d'exécution** (préversion) retiennent une exécution jusqu'à ce que des exécutions de pipelines en amont, des données requises ou une fenêtre de temps soient prêtes. Elles s'ajoutent aux planifications et aux déclencheurs, elles ne les remplacent pas.

<!-- section: event-triggers | objectives: 1.4.2 -->
## Déclencheurs basés sur un événement

Un déclencheur d'événement lance un pipeline quand quelque chose se produit plutôt qu'à heure fixe. Sélectionnez **Déclencheur** dans l'onglet Accueil du pipeline (ou créez la règle dans Activator) : Fabric crée un **élément Activator (Reflex)** et un **flux d'événements** dans l'espace de travail, et la règle exécute le pipeline.

| Source d'événements | Exemples |
| --- | --- |
| Événements OneLake | Un fichier est créé ou supprimé dans un dossier de lakehouse |
| Événements Stockage Blob Azure | `Microsoft.Storage.BlobCreated` dans un conteneur d'un compte de stockage |
| Événements de travaux | Le travail d'un élément a réussi ou échoué |
| Événements d'éléments d'espace de travail | Un élément est créé, modifié ou supprimé |

Filtrez les événements de stockage sur le champ **Subject** (conteneur, dossier, nom de fichier, extension). Le déclencheur expose des paramètres intégrés extraits de l'événement, comme les noms de fichier et de dossier, dans le générateur d'expressions. Ils sont nuls lors d'une exécution de test manuelle : utilisez donc l'opérateur `?` :

```text
@pipeline()?.TriggerEvent?.FileName
@concat('Files/landing/', pipeline()?.TriggerEvent?.FileName)
```

Pour consulter ou modifier un déclencheur, ouvrez l'élément Reflex, ou utilisez **Triggers > View triggers** sur le pipeline. L'activité de travail de copie peut être lancée par les mêmes déclencheurs d'événements.

| Exigence | Réponse |
| --- | --- |
| Charger chaque fichier CSV dès qu'il arrive dans un compte de stockage | Déclencheur sur les événements Stockage Blob Azure, filtré sur le dossier et `.csv` |
| Exécuter toutes les 15 minutes entre deux dates | Planification par minute, intervalle 15 |
| Traiter des tranches horaires exactes, sans trou ni chevauchement | Planification par intervalle avec Window start time et Window end time |
| Lancer le pipeline B seulement après la réussite du pipeline A | Activité Invoke pipeline à la fin de A, ou condition d'exécution sur B |

> **Conseil d'examen.** « Dès qu'un fichier arrive » ou « sans interrogation périodique » signifie un déclencheur d'événement. Une planification qui s'exécute chaque minute pour chercher des fichiers gaspille de la capacité et ajoute de la latence.

<!-- section: parameters-expressions | objectives: 1.4.3 -->
## Paramètres, variables et expressions dynamiques

| Élément | Portée et comportement | Syntaxe |
| --- | --- | --- |
| Paramètre de pipeline | Défini au démarrage de l'exécution (par l'appelant, une planification ou un déclencheur), constant pendant l'exécution | `@pipeline().parameters.SourceTable` |
| Variable | Modifiée pendant l'exécution avec Set variable ou Append variable | `@variables('FileList')` |
| Variable système | Fournie par Fabric | `@pipeline().RunId`, `@pipeline().Pipeline`, `@pipeline().TriggerTime`, `@pipeline().DataFactory` (nom de l'espace de travail) |
| Sortie d'activité | Résultat d'une activité précédente | `@activity('Lookup1').output.firstRow.MaxDate` |
| Élément courant d'un ForEach | Un élément du tableau Items | `@item()`, `@item().TableName` |

Règles des expressions :

- Une valeur qui commence par `@` est une expression. Si toute la valeur est une seule expression, son type est conservé (`@pipeline().parameters.myNumber` renvoie un nombre).
- `@{...}` est l'**interpolation de chaîne** : elle renvoie toujours une chaîne et peut se placer au milieu d'un texte. `@@` échappe un `@` littéral.
- Les fonctions couvrent les chaînes (`concat`, `replace`, `split`, `substring`, `toLower`), les dates (`utcNow`, `formatDateTime`, `addDays`, `startOfDay`, `convertFromUtc`), les collections (`length`, `first`, `contains`, `union`), la logique (`if`, `equals`, `and`, `or`, `not`) et la conversion (`int`, `string`, `json`).

```text
@concat('sales_', formatDateTime(utcNow(), 'yyyyMMdd'), '.parquet')
Files/raw/@{pipeline().parameters.Region}/@{formatDateTime(pipeline().TriggerTime, 'yyyy/MM/dd')}
@if(equals(pipeline().parameters.LoadType, 'full'), 'overwrite', 'append')
@pipeline()?.TriggeredByPipelineName
```

L'activité **Lookup** renvoie `output.firstRow` quand **First row only** est sélectionné, sinon `output.value`, un tableau qui alimente un ForEach. Limites : 5 000 lignes, 4 Mo de sortie, et une requête doit renvoyer exactement un jeu de résultats.

**ForEach** itère sur son expression **Items** ; les activités enfants s'exécutent l'une après l'autre pour chaque élément, et les éléments s'exécutent en parallèle sauf si **Sequential** est sélectionné (**Batch count** plafonne le parallélisme).

Les activités se relient par quatre conditions : **En cas de réussite**, **En cas d'échec**, **À l'achèvement** (quel que soit le résultat) et **En cas d'omission**. Chaque activité a un délai d'expiration (12 heures par défaut, 7 jours au maximum, format `D.HH:MM:SS`), des nouvelles tentatives facultatives avec un intervalle (30 secondes par défaut), et **Secure input** et **Secure output** pour garder des valeurs comme des secrets hors des journaux d'exécution. Un pipeline contient au plus **120 activités**, activités internes des conteneurs comprises.

> **Piège d'examen.** `'@{pipeline().parameters.Year}'` dans une chaîne de requête SQL est une interpolation et fonctionne ; `@pipeline().parameters.Year` écrit au milieu d'un texte sans accolades est pris littéralement. Quand la valeur doit rester un nombre ou un booléen, écrivez toute la valeur comme une seule expression, sans accolades.

<!-- section: notebook-orchestration | objectives: 1.4.3 -->
## Orchestrer des notebooks et des pipelines

**Activité Notebook dans un pipeline.** Sélectionnez le notebook et une connexion, puis définissez les **Base parameters** (nom, type, valeur). Le notebook doit avoir une cellule marquée comme **cellule de paramètres** (bascule de cellule de paramètres) : seules les variables qui y sont définies sont détectées et remplacées à l'exécution ; sans elle, aucun paramètre n'est transmis. Le notebook renvoie une valeur avec `notebookutils.notebook.exit()`, que le pipeline lit dans les activités suivantes :

```text
# Parameter cell of the notebook (defaults, overridden by the pipeline)
load_date = "2026-01-01"
source_table = "orders"

# Last cell, outside any try/except block
notebookutils.notebook.exit(str(rows_written))
```

```text
@activity('Notebook1').output.result.exitValue
@greater(int(activity('Notebook1').output.result.exitValue), 0)
```

- La valeur de sortie est toujours une **chaîne** ; convertissez-la (`int()`) avant de comparer des nombres.
- Pour exécuter plusieurs notebooks d'un même pipeline sur une session Spark partagée, activez **High concurrency mode for pipeline running multiple notebooks** dans les paramètres Spark de l'espace de travail et donnez aux activités Notebook la même **balise de session** (session tag) : le temps de démarrage diminue.
- Une activité Notebook peut s'exécuter sous une **identité d'espace de travail** : créez-la dans l'espace de travail du pipeline, activez le paramètre de locataire *Service principals can call Fabric public APIs*, et donnez-lui au moins Contributor sur l'espace de travail du notebook.

**Notebook qui appelle des notebooks.** `notebookutils` (le nouveau nom de `mssparkutils`) exécute des notebooks enfants sur la session Spark de l'appelant :

```text
result = notebookutils.notebook.run("Clean_Orders", 600, {"load_date": "2026-11-01"})

DAG = {
    "activities": [
        {"name": "Extract", "path": "Extract_Orders", "args": {"load_date": "2026-11-01"}},
        {"name": "Clean", "path": "Clean_Orders", "dependencies": ["Extract"],
         "retry": 1, "retryIntervalInSeconds": 10},
        {"name": "Customers", "path": "Load_Customers"}
    ],
    "timeoutInSeconds": 3600,
    "concurrency": 4
}
notebookutils.notebook.validateDAG(DAG)
results = notebookutils.notebook.runMultiple(DAG)
```

| Fait | Valeur |
| --- | --- |
| Délai par défaut de `run()` | 90 secondes (`timeout_seconds`) |
| `run()` renvoie | La chaîne passée à `exit()` dans l'enfant, ou `""` |
| Délai du DAG de `runMultiple()` | 43 200 secondes (12 heures) par défaut |
| Concurrence de `runMultiple()` | 3 fois le nombre de cœurs CPU disponibles par défaut ; `0` signifie illimité |
| Délai par cellule d'une activité | 90 secondes par défaut (`timeoutPerCellInSeconds`) |
| Enfant avec un autre lakehouse par défaut | Bloqué, sauf si `useRootDefaultLakehouse: True` est passé dans les arguments |
| Contrôles de `validateDAG()` | Noms en double, dépendances manquantes, références circulaires |

**Pipeline qui appelle des pipelines.** L'activité **Invoke pipeline** appelle un pipeline enfant, désormais entre espaces de travail et aussi des pipelines Azure Data Factory et Synapse, avec les exécutions enfants visibles dans la supervision. Elle demande une **connexion** (compte professionnel, principal de service ou identité d'espace de travail). La version héritée (Legacy) n'appelle que des pipelines du même espace de travail et propose **Wait on completion** : décochée, l'enfant s'exécute en parallèle des activités suivantes.

| Modèle | Implémentation |
| --- | --- |
| Copie pilotée par les métadonnées de nombreuses tables | Lookup sur une table de contrôle, ForEach sur `output.value`, Copy data avec des valeurs `@item()` |
| Répartition de travaux Spark indépendants sur une seule session | `runMultiple` sans dépendances, ou activités Notebook partageant une balise de session |
| Pipeline parent qui pilote des pipelines enfants réutilisables | Invoke pipeline avec des paramètres |
| Arrêter l'exécution avec une erreur claire quand un contrôle échoue | If condition, puis activité Fail avec un message et un code |
| Journaliser chaque échec | Chemin En cas d'échec (ou À l'achèvement) vers une activité Stored procedure, Teams ou Web |

> **Piège d'examen.** `notebookutils.notebook.exit()` dans un bloc `try`/`except` ne prend pas effet. Appelez-le au niveau supérieur, dans sa propre dernière cellule.

<!-- section: key-points -->
## Points clés

- Dataflow Gen2 = Power Query, sans code ; pipeline = orchestration et copie en masse ; notebook = code Spark ; travail de copie = copie incrémentielle par Assistant.
- Planifications : de la minute au mois, jusqu'à 20 par pipeline, date de fin obligatoire, e-mails d'échec pour les exécutions planifiées uniquement, expiration après 90 jours sans connexion du propriétaire.
- Les déclencheurs d'événements créent un élément Activator (Reflex) et un flux d'événements ; les valeurs du déclencheur viennent de `@pipeline()?.TriggerEvent?...`.
- `@` conserve le type, `@{}` renvoie une chaîne ; Lookup `firstRow` ou `value` ; ForEach `@item()`.
- Les paramètres de notebook demandent une cellule de paramètres ; `exit()` renvoie une chaîne lue avec `output.result.exitValue`.
- `runMultiple` exécute un DAG de notebooks sur une session ; Invoke pipeline appelle des pipelines enfants via une connexion.
