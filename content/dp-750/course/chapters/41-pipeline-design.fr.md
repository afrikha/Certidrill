Un pipeline de données est une suite d'étapes d'ingestion, de validation, de transformation et de publication qui doivent s'exécuter dans le bon ordre, se remettre des échecs et pouvoir être réexécutées sans risque. Dans Azure Databricks, vous le construisez soit avec des notebooks orchestrés par un job Lakeflow, soit de façon déclarative avec les pipelines déclaratifs Lakeflow Spark (la documentation dit aussi « Lakeflow pipelines »). L'examen vous demande d'ordonner les étapes, de choisir le bon outil, de relier les dépendances des tâches et de compléter du code de gestion des erreurs.

<!-- section: order-of-operations | objectives: 4.1.1 -->
## Concevoir l'ordre des opérations

L'architecture en médaillon donne l'ordre par défaut :

| Ordre | Couche | Opérations | Objet type |
| --- | --- | --- | --- |
| 1 | Atterrissage | Les fichiers arrivent dans un volume ou un emplacement externe Unity Catalog ; les sources sont atteintes par Lakeflow Connect ou une connexion | Volume, emplacement externe |
| 2 | Bronze | Ingérer de façon incrémentielle, tel quel, avec des métadonnées d'ingestion (nom de fichier, heure de chargement) | Table de diffusion en continu, table Delta |
| 3 | Silver | Convertir les types, valider, dédoublonner, appliquer le CDC, harmoniser les clés | Table de diffusion en continu, table Delta chargée par `MERGE` |
| 4 | Gold | Joindre, dénormaliser, agréger pour les consommateurs | Vue matérialisée, table Delta |
| 5 | Exposition et maintenance | Accorder les accès, actualiser les tableaux de bord, optimiser les tables, notifier | Entrepôt SQL, tâches de job |

Règles d'ordonnancement testées à l'examen :

- **Les dimensions avant les faits** : chargez ou mettez à jour les dimensions client et produit avant la table de faits qui recherche leurs clés, sinon les nouveaux faits reçoivent des clés inconnues.
- **Valider avant de publier** : les vérifications de qualité s'exécutent avant la mise à jour de la table gold ou du partage, pas après.
- **Dédoublonner avant le merge** : un `MERGE` échoue quand plusieurs lignes sources correspondent à une même ligne cible.
- **Les branches indépendantes en parallèle** : deux ingestions bronze sans entrée commune ne dépendent pas l'une de l'autre ; donnez-leur la même tâche en aval.
- **La maintenance après les écritures** : `OPTIMIZE` et `VACUUM` s'exécutent après le chargement, hors du chemin critique.
- **Des étapes idempotentes** : chaque étape peut être réexécutée après un échec sans dupliquer les données (`MERGE`, `REPLACE WHERE`, points de contrôle de streaming).

> **Conseil d'examen.** Dans une question d'ordonnancement, partez des dépendances de données : une étape ne peut venir qu'après toutes les étapes qui produisent ce qu'elle lit. Placez ensuite la validation avant toute publication, et la notification en dernier.

<!-- section: notebook-vs-sdp | objectives: 4.1.2 -->
## Choisir entre les notebooks et les pipelines déclaratifs Lakeflow Spark

Dans un **notebook**, vous écrivez le code impératif : quoi lire, comment écrire, quand créer un point de contrôle, dans quel ordre. Dans un **pipeline**, vous déclarez des jeux de données (tables de diffusion en continu, vues matérialisées, vues), et le pipeline analyse les dépendances, ordonne et parallélise le travail, gère les points de contrôle et les nouvelles tentatives.

| Exigence | Meilleur choix |
| --- | --- |
| Flux bronze-silver-gold déclaratif, dépendances résolues automatiquement | Pipeline |
| Règles de qualité avec warn, drop ou fail et métriques intégrées | Pipeline (attentes) |
| CDC avec des événements désordonnés vers une SCD de type 1 ou de type 2 | Pipeline (`AUTO CDC`) |
| Actualisation incrémentielle d'agrégats sans écrire de logique de merge | Pipeline (vue matérialisée) |
| Exploration, analyse ad hoc, corrections ponctuelles | Notebook |
| Logique Python arbitraire, appels d'API externes, effets de bord comme `collect()`, déplacements de fichiers ou envoi de messages | Notebook |
| Contrôle fin de chaque écriture (`foreachBatch` personnalisé, conditions `MERGE` complexes) | Notebook |
| Réutiliser tel quel du code Spark impératif existant | Notebook |
| Traçabilité, journal des événements et onglet de qualité des données sans code supplémentaire | Pipeline |

Les pipelines exigent le plan Premium. Les deux s'exécutent dans un job Lakeflow : une tâche **Notebook** ou une tâche **Pipeline**, si bien qu'un job peut les combiner (un notebook qui appelle une API, puis un pipeline qui actualise les tables).

> **Piège d'examen.** Le code des jeux de données d'un pipeline doit rester sans effet de bord : la source est évaluée plusieurs fois pendant la planification. Des appels comme `collect()`, `count()`, `toPandas()`, `save()`, `saveAsTable()`, `start()` ou `toTable()` n'ont pas leur place dans une fonction de jeu de données. Si l'exigence en a besoin, utilisez une tâche notebook.

<!-- section: task-logic | objectives: 4.1.3 -->
## Concevoir la logique des tâches de Lakeflow Jobs

Un job est un graphe de **tâches**. Types de tâches courants : Notebook, Python script, Python wheel, JAR, Spark Submit, SQL, Pipeline, dbt, Run Job (appelle un autre job), If/else, For each, Dashboards, Power BI.

Chaque tâche liste les tâches dont elle **dépend** (Depends on). Sa condition **Run if** décide si elle s'exécute, selon l'état de ces dépendances :

| Run if | S'exécute quand | Sinon |
| --- | --- | --- |
| All succeeded (par défaut) | Toutes les dépendances se sont exécutées et ont réussi | `Upstream failed` |
| At least one succeeded | Au moins une dépendance a réussi | `Upstream failed` |
| None failed | Aucune dépendance n'a échoué et au moins une s'est exécutée | `Upstream failed` |
| All done | Toutes les dépendances se sont exécutées, quel que soit leur état | |
| At least one failed | Au moins une dépendance a échoué | `Excluded` |
| All failed | Toutes les dépendances ont échoué | `Excluded` |

Les tâches en amont exclues comptent comme réussies lors de l'évaluation d'une condition `Run if` ; `Upstream failed` et `Upstream canceled` comptent comme des échecs. Si toutes les dépendances d'une tâche sont exclues, la tâche est exclue elle aussi, et l'exclusion se propage le long d'une chaîne.

Tâches de contrôle du flux :

| Tâche | Rôle | Faits clés |
| --- | --- | --- |
| If/else condition | Brancher selon une valeur | Opérateurs `==`, `!=` (comparaison de chaînes) et `>`, `>=`, `<`, `<=` (numériques). Les tâches en aval dépendent de `<task> (true)` ou de `<task> (false)` |
| For each | Exécuter une tâche imbriquée une fois par élément d'un tableau | Entrée : un tableau JSON, une valeur de tâche ou un paramètre de job ; `{{input}}` ou `{{input.<key>}}` dans la tâche imbriquée ; Concurrency vaut 1 par défaut ; une seule tâche imbriquée, qui ne peut pas être un autre For each |
| Run Job | Appeler un autre job | Réutiliser un job comme étape |

Transmettre des informations entre tâches :

- Les **paramètres de job** s'appliquent à toutes les tâches qui acceptent des paramètres clé-valeur ; référencez-les par `{{job.parameters.<name>}}`.
- Les **valeurs de tâche** (task values) : un notebook Python appelle `dbutils.jobs.taskValues.set(key="bad_records", value=n)` (toute valeur JSON jusqu'à 48 Kio, jusqu'à 250 valeurs par exécution) ; les tâches en aval lisent `{{tasks.<task_name>.values.<key>}}` dans leurs paramètres.
- Les **références de valeurs dynamiques** comme `{{job.run_id}}`, `{{job.start_time.iso_date}}`, `{{tasks.ingest.result_state}}` ou `{{task.execution_count}}` sont remplacées par des chaînes à l'exécution ; aucune expression n'est évaluée entre les accolades.

```text
validate (notebook)  -- sets task value bad_records
   |
check_quality (If/else: {{tasks.validate.values.bad_records}} > 0)
   |-- true  --> quarantine_report (notebook)
   |-- false --> publish_gold (pipeline)
```

> **Piège d'examen.** `==` dans une condition If/else compare des chaînes : `12.0 == 12` est donc faux. Utilisez `>=` ou `<=` pour les tests numériques, ou faites définir un entier par la tâche en amont.

<!-- section: error-handling | objectives: 4.1.4 -->
## Concevoir la gestion des erreurs

| Niveau | Mécanisme | À utiliser pour |
| --- | --- | --- |
| Code | `try` / `except`, puis `raise` | Journaliser le contexte, nettoyer, puis faire échouer la tâche pour que le job voie l'échec |
| Appel de notebook | `dbutils.notebook.run(path, timeout_seconds, arguments)` lève une exception en cas d'échec ou de dépassement du délai | Intercepter et relancer un notebook enfant |
| Données | Attentes (warn, drop, fail), contraintes `CHECK`, tables de quarantaine | Isoler les enregistrements incorrects au lieu d'échouer, ou échouer sur une entrée corrompue |
| Tâche | Nouvelles tentatives, délai d'expiration, avertissement de durée | Absorber les échecs transitoires ; arrêter les tâches qui s'emballent |
| Graphe du job | `Run if` = At least one failed ou All failed pour une tâche d'alerte ou de compensation ; All done pour le nettoyage | N'exécuter la logique de traitement que si quelque chose a échoué |
| Notifications | En cas d'échec, avertissement de durée | Alerter les personnes (chapitre sur Lakeflow Jobs) |

```text
try:
    df = spark.read.table("contoso.bronze.orders")
    (df.write.mode("overwrite")
       .option("replaceWhere", f"order_day = '{run_date}'")
       .saveAsTable("contoso.silver.orders"))
except Exception as e:
    print(f"Load failed for {run_date}: {e}")
    raise
```

Règles de conception :

- **Relevez l'exception** après l'avoir journalisée : un notebook qui intercepte l'exception et se termine normalement est signalé comme réussi, et les tâches en aval s'exécutent sur des données incorrectes. `dbutils.notebook.exit("FAILED")` termine aussi le notebook comme réussi ; il ne fait que renvoyer une chaîne.
- **Rendez les nouvelles tentatives sûres** : une nouvelle tentative réexécute toute la tâche, donc les écritures doivent être idempotentes.
- **Le délai d'expiration s'applique à chaque tentative** quand les deux sont configurés.
- Sur le calcul serverless, l'auto-optimisation relance par défaut les tâches en échec ; désactivez-la dans la stratégie de nouvelles tentatives d'une tâche non idempotente qui doit s'exécuter au plus une fois.
- Dans un pipeline, le runtime relance les erreurs récupérables : chaque flux jusqu'à `pipelines.maxFlowRetryAttempts` (2 par défaut, soit trois tentatives au total), la mise à jour jusqu'à `pipelines.numUpdateRetryAttempts` (5 par défaut pour les pipelines déclenchés, illimité pour les pipelines continus), uniquement quand le pipeline s'exécute depuis un job, l'API ou en mode continu.

> **Piège d'examen.** Envelopper un chargement dans `try` / `except` avec un simple `print` masque l'échec : la tâche, l'exécution et les notifications signalent un succès. Gérer une erreur, c'est soit se rétablir vraiment, soit échouer de façon visible.

<!-- section: notebook-pipeline | objectives: 4.1.5 -->
## Créer un pipeline avec des notebooks et des contraintes de priorité

Il existe deux façons d'enchaîner des notebooks :

| | `%run ./notebook` | `dbutils.notebook.run(path, timeout, args)` |
| --- | --- | --- |
| Exécution | En ligne, dans la session de l'appelant ; fonctions et variables deviennent disponibles | Exécution éphémère séparée |
| Paramètres | Valeurs par défaut des widgets (ou valeurs passées aux widgets) | `arguments` définit les widgets de la cible (chaînes) |
| Valeur de retour | Aucune | Une chaîne passée à `dbutils.notebook.exit()` |
| Usage | Partager du code utilitaire | Orchestrer les étapes depuis un notebook pilote |

`%run` doit être seul dans sa cellule. Un `timeout_seconds` de 0 signifie aucun délai d'expiration. Les exécutions créées avec `dbutils.notebook` doivent se terminer en 30 jours au plus.

```text
# Driver notebook: bronze, then silver only if bronze succeeded
import json

result = dbutils.notebook.run("./01_bronze_orders", 1800, {"run_date": run_date})
if json.loads(result)["status"] != "OK":
    raise RuntimeError(f"Bronze load failed: {result}")

dbutils.notebook.run("./02_silver_orders", 1800, {"run_date": run_date})

# In 01_bronze_orders, the last cell:
# dbutils.notebook.exit(json.dumps({"status": "OK", "rows": n}))
```

Les **contraintes de priorité** (precedence constraints) d'un tel pipeline sont les conditions qui décident si l'étape suivante s'exécute. Dans un notebook pilote, ce sont des tests `if` sur les valeurs de retour et la gestion des exceptions. Dans un job Lakeflow, elles sont déclaratives : la liste **Depends on** et la condition **Run if** de chaque tâche, visibles dans le graphe du job et dans chaque exécution.

| Exigence | Conception |
| --- | --- |
| B ne s'exécute qu'après la réussite de A | B dépend de A, Run if All succeeded |
| C s'exécute après A et B, quel que soit leur résultat (nettoyage) | C dépend de A et B, Run if All done |
| Une tâche d'alerte ne s'exécute que si une étape a échoué | L'alerte dépend des étapes, Run if At least one failed |
| D s'exécute si au moins l'une des deux sources a été chargée | D dépend des deux, Run if At least one succeeded |
| Chaque étape visible, relancée et alertée séparément | Une tâche de job par notebook, pas un notebook pilote |

> **Conseil d'examen.** Préférez une tâche de job par notebook à un notebook pilote : chaque tâche a ses propres nouvelles tentatives, son délai d'expiration, son calcul et ses notifications, et une exécution en échec peut être réparée à partir de la tâche en échec au lieu de tout relancer.

<!-- section: sdp-pipeline | objectives: 4.1.6 -->
## Créer un pipeline avec les pipelines déclaratifs Lakeflow Spark

Créez-le depuis **Jobs & Pipelines > New > ETL pipeline** (ou **New > ETL pipeline** dans la barre latérale) : donnez un nom unique, un **catalogue et un schéma par défaut** pour les noms de jeux de données non qualifiés, et partez d'un exemple de code, d'une transformation unique, de ressources existantes ou d'un projet sous contrôle de code source. Valeurs par défaut : Unity Catalog, le canal **Current** et le calcul **serverless**. Les fichiers sources (SQL ou Python) se placent dans le dossier `transformations` du dossier racine du pipeline, dans n'importe quel ordre : les dépendances sont analysées automatiquement.

| Jeu de données | SQL | Python | Usage |
| --- | --- | --- | --- |
| Table de diffusion en continu | `CREATE OR REFRESH STREAMING TABLE` | `@dp.table` | Sources en ajout seul ou incrémentielles ; chaque enregistrement traité une fois |
| Vue matérialisée | `CREATE OR REFRESH MATERIALIZED VIEW` | `@dp.materialized_view` | Jointures, agrégats, sources avec mises à jour et suppressions ; résultats maintenus cohérents |
| Vue | `CREATE TEMPORARY VIEW` | `@dp.temporary_view` | Étape intermédiaire ou vérifications, non publiée |
| Flux | `CREATE FLOW ... AS AUTO CDC INTO` | `dp.create_auto_cdc_flow` | CDC vers une SCD de type 1 ou de type 2 |

```text
-- transformations/orders.sql
CREATE OR REFRESH STREAMING TABLE orders_bronze
AS SELECT *, _metadata.file_path AS source_file
FROM STREAM read_files('/Volumes/contoso/landing/orders/', format => 'json');

CREATE OR REFRESH STREAMING TABLE orders_silver (
  CONSTRAINT valid_amount EXPECT (amount >= 0) ON VIOLATION DROP ROW
)
AS SELECT CAST(order_id AS BIGINT) AS order_id, customer_id,
          CAST(amount AS DECIMAL(12, 2)) AS amount, CAST(order_ts AS TIMESTAMP) AS order_ts
FROM STREAM(orders_bronze);

CREATE OR REFRESH MATERIALIZED VIEW sales_by_day
AS SELECT DATE(order_ts) AS order_day, sum(amount) AS revenue
FROM orders_silver
GROUP BY DATE(order_ts);
```

`STREAM` donne une sémantique de streaming : la source doit être en ajout seul, sinon utilisez l'option `skipChangeCommits`. La vue matérialisée lit `orders_silver` sans `STREAM`, en mode batch.

Paramètres et comportement d'exécution :

| Paramètre | Valeurs |
| --- | --- |
| Mode du pipeline | **Triggered** (par défaut) : traite les données disponibles, puis s'arrête. **Continuous** : traite les données à leur arrivée sur un cluster toujours actif |
| Run as | Identité qui exécute le pipeline et possède ses tables ; un principal de service est recommandé |
| Configuration / paramètres | Paramètres Spark et paramètres clé-valeur référencés par le code source |
| Calcul classique (si non serverless) | Stratégie, mise à l'échelle automatique améliorée, nombre minimal et maximal de workers, Photon |

Un **Run now** manuel depuis l'éditeur réutilise le cluster et désactive les nouvelles tentatives, pour un débogage rapide. Les mises à jour lancées par un job, l'API ou en mode continu arrêtent le cluster après l'exécution, **relancent** certaines erreurs et redémarrent le cluster pour les erreurs récupérables. Une **actualisation complète** (full refresh) vide les tables de diffusion en continu et leurs points de contrôle, puis retraite toutes les données sources ; bloquez-la sur une table avec `pipelines.reset.allowed = false`. Planifiez un pipeline déclenché avec une tâche **Pipeline** dans un job.

> **Piège d'examen.** Une table de diffusion en continu qui lit une source recevant des mises à jour ou des suppressions échoue avec `STREAM`. Utilisez une vue matérialisée quand la source change, ou `skipChangeCommits` quand seules les nouvelles lignes comptent.

<!-- section: key-points -->
## Points clés

- Ordre : atterrissage, bronze, silver, gold, exposition ; les dimensions avant les faits, la validation avant la publication, la maintenance en dernier.
- Les pipelines déclarent des jeux de données et gèrent dépendances, points de contrôle, attentes et CDC ; les notebooks gèrent la logique arbitraire et les effets de bord.
- Run if : All succeeded par défaut ; All done pour le nettoyage ; At least one failed pour l'alerte ; les tâches exclues comptent comme réussies.
- Transmettez des valeurs par les valeurs de tâche (`{{tasks.<task>.values.<key>}}`) et les paramètres de job ; `==` dans If/else compare des chaînes.
- Gérez les erreurs de façon visible : relever l'exception, écritures idempotentes pour les nouvelles tentatives, délai d'expiration par tentative.
- `dbutils.notebook.run` renvoie la chaîne de `dbutils.notebook.exit` et lève une exception en cas d'échec ; `%run` intègre le code en ligne.
- Pipelines : tables de diffusion en continu pour les sources en ajout seul, vues matérialisées pour les jointures et les agrégats ; déclenché et serverless par défaut.
