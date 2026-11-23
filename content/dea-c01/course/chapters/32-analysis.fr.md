Les questions d'analyse se situent au bout du pipeline : les données sont dans S3, Redshift ou une base de données, et quelqu'un doit les vérifier, les nettoyer, les interroger, les résumer ou les afficher dans un tableau de bord. Vous choisissez l'outil adapté à l'utilisateur (analyste, ingénieur, utilisateur métier), la construction SQL qui produit le résultat attendu, et le modèle de capacité (provisionné ou sans serveur) adapté au profil de la charge de travail et au budget.

<!-- section: visualization | objectives: 3.2.1 -->
## Visualiser les données avec les services AWS

**Quick Sight**, la fonctionnalité de business intelligence d'**AWS Quick** (le service anciennement appelé Amazon QuickSight), crée des tableaux de bord interactifs sur Athena, Redshift, RDS, Aurora, des fichiers S3, des sources SaaS et d'autres. Un **jeu de données (dataset)** importe les données dans **SPICE**, le moteur en mémoire (rapide, actualisé selon une planification ou de façon incrémentielle, sans charge sur la source à l'affichage), ou utilise la **requête directe** (toujours à jour, chaque visuel exécute une requête sur la source).

| Besoin | Outil |
| --- | --- |
| Tableaux de bord pour les utilisateurs métier, intégrés à un portail, sécurité au niveau des lignes par utilisateur | Quick Sight (AWS Quick) |
| Tableaux de bord rapides pour de nombreux lecteurs, sur des données actualisées chaque jour | Quick Sight avec un jeu de données SPICE |
| Chiffres qui doivent refléter la source à quelques secondes près | Requête directe Quick Sight |
| Premier aperçu des distributions, valeurs manquantes et corrélations d'un nouveau jeu de données | Profil de données DataBrew (tâche de profil), consulté dans la console DataBrew |
| Exploration de journaux et de texte | OpenSearch Dashboards |
| Métriques opérationnelles et séries chronologiques de nombreuses sources | Amazon Managed Grafana ou tableaux de bord CloudWatch |
| Graphiques ad hoc pendant une exploration en code | Blocs-notes (matplotlib et bibliothèques similaires) |

Quand Quick Sight lit les données via Athena, son rôle de service doit accéder aux compartiments S3 des données et des résultats de requêtes Athena, et disposer des autorisations Lake Formation si les tables sont gouvernées.

> **Piège d'examen.** Un tableau de bord ouvert par des centaines d'utilisateurs sur Athena en requête directe exécute (et paie) une analyse pour chaque visuel. « Réduire le coût et la latence ; une fraîcheur quotidienne suffit » : jeu de données SPICE avec actualisation planifiée.

<!-- section: verify-clean | objectives: 3.2.2 -->
## Vérifier et nettoyer les données

La vérification répond à « les données sont-elles complètes, uniques, valides et cohérentes ? » avant que quiconque s'y fie ; le nettoyage corrige ce qui échoue.

| Outil | Usage typique |
| --- | --- |
| SQL **Athena** | Compter les lignes par partition et comparer à la source, trouver les doublons (`GROUP BY key HAVING COUNT(*) > 1`), les valeurs nulles dans les colonnes obligatoires, les valeurs hors plage ; écrire une table nettoyée avec CTAS |
| **Lambda** | Valider chaque fichier ou enregistrement à son arrivée (schéma, champs obligatoires, somme de contrôle) et envoyer les échecs vers un préfixe de quarantaine ou une file d'attente de lettres mortes |
| **Quick Sight** | Contrôles visuels des tendances et des valeurs aberrantes par les responsables métier ; champs calculés pour signaler les anomalies |
| **Blocs-notes Jupyter** | Contrôles exploratoires en pandas ou PySpark : JupyterLab de SageMaker Unified Studio, blocs-notes SageMaker AI, EMR Studio, sessions interactives Glue, blocs-notes Spark d'Athena |
| **SageMaker Data Wrangler** (désormais dans **SageMaker Canvas**) | Flux de données low-code avec transformations, rapport Data Quality and Insights, export vers S3, Feature Store, SageMaker Pipelines ou un script Python |
| **Glue DataBrew** | Recettes de nettoyage visuelles et tâches de profil avec des règles de qualité des données |

```sql
SELECT order_id, COUNT(*) AS copies
FROM raw.orders
WHERE dt = '2026-11-21'
GROUP BY order_id
HAVING COUNT(*) > 1;
```

> **Conseil d'examen.** Dans la version actuelle de SageMaker Studio, Data Wrangler s'ouvre depuis SageMaker Canvas. Une option qui parle de « Data Wrangler dans SageMaker Studio Classic » renvoie à l'ancienne expérience.

<!-- section: sql-views | objectives: 3.2.3 -->
## Interroger et créer des vues en SQL dans Redshift et Athena

| Objet | Athena | Redshift |
| --- | --- | --- |
| Vue | `CREATE OR REPLACE VIEW` ; stockée dans le catalogue de données Glue ; recalculée à chaque requête | `CREATE VIEW` ; recalculée à chaque requête |
| Vue à liaison tardive (late-binding) | Sans objet | `WITH NO SCHEMA BINDING` : non vérifiée par rapport aux objets sous-jacents avant d'être interrogée ; obligatoire pour les vues sur des tables externes Spectrum, survit à la suppression et à la recréation des tables |
| Vue matérialisée | Conserver les résultats avec CTAS ou `INSERT INTO` | `CREATE MATERIALIZED VIEW` : résultat stocké, actualisation incrémentielle ou complète, `AUTO REFRESH YES`, réécriture automatique des requêtes |
| Interroger S3 | Natif (tables du catalogue de données) | Schéma externe Redshift Spectrum sur le catalogue de données |

```sql
CREATE MATERIALIZED VIEW mv_daily_sales
AUTO REFRESH YES
AS
SELECT store_id, sale_date, SUM(amount) AS total_amount, COUNT(*) AS orders
FROM sales_fact
GROUP BY store_id, sale_date;

CREATE VIEW v_recent_clicks AS
SELECT user_id, page, ts
FROM spectrum_lake.clicks
WHERE dt >= '2026-11-01'
WITH NO SCHEMA BINDING;
```

Les vues matérialisées Redshift s'actualisent de façon **incrémentielle** quand la définition n'utilise que des constructions prises en charge (jointures internes, filtres, `GROUP BY`, `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`) ; les jointures externes, fonctions de fenêtrage, agrégats `DISTINCT`, `UNION` ou sous-requêtes imposent un recalcul complet. L'actualisation automatique s'exécute à intervalle régulier (300 secondes par défaut), uniquement quand la vue est obsolète ; `REFRESH MATERIALIZED VIEW ... CASCADE` actualise les vues imbriquées.

> **Piège d'examen.** Une vue standard n'économise aucun calcul : chaque requête relance l'agrégation. « Un tableau de bord répète la même agrégation coûteuse toutes les quelques minutes » : vue matérialisée Redshift à actualisation automatique, pas une vue.

<!-- section: athena-spark | objectives: 3.2.4 -->
## Explorer les données avec les blocs-notes Athena pour Apache Spark

Athena exécute aussi **Apache Spark** sans serveur pour l'exploration en Python :

- Créez un groupe de travail dont le **moteur d'analyse est Apache Spark** ; le moteur d'un groupe de travail ne peut plus être modifié ensuite. Les groupes de travail Spark utilisent l'**éditeur de blocs-notes**, pas l'éditeur de requêtes SQL.
- Un bloc-notes (compatible Jupyter) démarre une **session** ; chaque cellule s'exécute comme un **calcul (calculation)**. La capacité se compte en **DPU** (4 vCPU, 16 Go) : le coordinateur et chaque exécuteur font 1 DPU, le nombre maximal de DPU simultanées vaut 20 par défaut (de 3 à 60), le délai d'inactivité 20 minutes par défaut (de 1 à 480).
- Fermer l'onglet du bloc-notes ne met pas fin à la session : arrêtez-la, ou comptez sur le délai d'inactivité.
- Les blocs-notes de la console s'exécutent sur la **version 3 du moteur PySpark** ; la version **Apache Spark 3.5** s'exécute depuis les blocs-notes de SageMaker Unified Studio ou des clients Spark Connect.
- Les tables du catalogue de données Glue se lisent avec Spark SQL ; les résultats et sorties de calcul sont écrits dans un emplacement S3 du groupe de travail.

```python
sales = spark.read.parquet("s3://example-lake-curated/sales/")
sales.printSchema()
sales.filter(sales.amount < 0).count()
spark.sql("SELECT store_id, SUM(amount) AS total FROM curated.sales GROUP BY store_id").show(10)
```

| Exigence | Réponse |
| --- | --- |
| Exploration PySpark interactive de données S3, sans cluster | Bloc-notes Athena avec un groupe de travail Spark |
| Analyse en SQL uniquement | Groupe de travail SQL Athena |
| ETL Spark longue et planifiée | Tâche Glue ou EMR Serverless |

> **Piège d'examen.** Les réservations de capacité ne s'appliquent pas aux groupes de travail Spark, et un groupe de travail SQL ne peut pas passer à Spark. Créez un nouveau groupe de travail avec le moteur Apache Spark.

<!-- section: provisioned-serverless | objectives: 3.2.5 -->
## Services provisionnés ou sans serveur

| Service | Provisionné | Sans serveur |
| --- | --- | --- |
| Redshift | Clusters de nœuds RA3 : nœuds réservés pour un usage régulier, pause et reprise, mise à l'échelle de la concurrence (concurrency scaling) | Redshift Serverless : RPU (16 Go chacune), capacité de base de 128 par défaut (à partir de 4), limites de capacité maximale et de RPU-heures, facturé seulement pendant l'exécution des requêtes, mise à l'échelle pilotée par l'IA |
| EMR | Clusters sur EC2 : choix des instances, Spot, configuration complète | EMR Serverless : ressources par tâche, capacité pré-initialisée facultative |
| Kinesis Data Streams | Shards que vous dimensionnez (1 Mo/s ou 1 000 enregistrements/s en écriture chacun) | Mode à la demande : mise à l'échelle automatique (débute à 4 Mo/s en écriture) |
| MSK | Brokers que vous dimensionnez et fenêtres de correctifs à prévoir | MSK Serverless : aucun broker à dimensionner |
| DynamoDB | Capacité provisionnée avec auto scaling, capacité réservée | À la demande : paiement par requête |
| Athena | Réservations de capacité (DPU dédiées) | Par octet analysé |
| OpenSearch Service | Domaines gérés (types d'instances, shards) | Collections OpenSearch Serverless (OCU) |

Compromis :

- Le **sans serveur** l'emporte pour les charges en pics, intermittentes ou imprévisibles, les petites équipes et les nouveaux projets : aucune planification de capacité, aucun coût à vide (hormis une capacité minimale sur certains services), mise à l'échelle automatique. Les coûts croissent linéairement avec l'usage et certains paramètres ne sont pas exposés.
- Le **provisionné** l'emporte pour les charges régulières à forte utilisation (avec réservations ou Savings Plans), pour un contrôle strict des versions, types d'instances et de la configuration, et pour un coût mensuel prévisible.
- Latence de démarrage : les ressources sans serveur peuvent mettre du temps à monter en charge depuis zéro ; une capacité pré-initialisée (EMR Serverless) ou une capacité de base (Redshift Serverless) la réduit.

> **Conseil d'examen.** « Des requêtes quelques heures par semaine, à des moments imprévisibles, coût et administration minimaux » : Redshift Serverless ; « un entrepôt 24 h/24 à charge constante avec un engagement de trois ans » : RA3 provisionné avec nœuds réservés.

<!-- section: aggregation | objectives: 3.2.6 -->
## Agrégation, moyennes mobiles, regroupement et pivotement

| Concept | Signification | SQL |
| --- | --- | --- |
| Agrégation | Réduire de nombreuses lignes à une valeur | `SUM`, `COUNT`, `AVG`, `MIN`, `MAX` ; comptages distincts approximatifs avec `approx_distinct` (Athena) ou `APPROXIMATE COUNT(DISTINCT ...)` (Redshift) |
| Regroupement | Un agrégat par groupe | `GROUP BY` ; sous-totaux avec `ROLLUP`, `CUBE`, `GROUPING SETS` ; filtrer les groupes avec `HAVING` |
| Moyenne mobile (rolling average) | Moyenne sur une fenêtre glissante de lignes, qui lisse le bruit quotidien | Fonction de fenêtrage `AVG(...) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` |
| Pivotement | Transformer des valeurs de lignes en colonnes (une colonne par mois) | `PIVOT` et `UNPIVOT` dans Redshift ; agrégation conditionnelle dans Athena |

```sql
SELECT store_id,
       sale_date,
       total_amount,
       AVG(total_amount) OVER (
         PARTITION BY store_id
         ORDER BY sale_date
         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ) AS avg_7_days
FROM daily_sales;

SELECT *
FROM (SELECT region, sale_month, amount FROM monthly_sales)
PIVOT (SUM(amount) FOR sale_month IN ('2026-09', '2026-10', '2026-11'));

SELECT region,
       SUM(CASE WHEN sale_month = '2026-10' THEN amount ELSE 0 END) AS oct_2026,
       SUM(CASE WHEN sale_month = '2026-11' THEN amount ELSE 0 END) AS nov_2026
FROM monthly_sales
GROUP BY region;
```

Le `PIVOT` de Redshift prend en charge `SUM`, `COUNT`, `AVG`, `MIN` et `MAX`, et sa liste `IN` accepte des littéraux, pas des colonnes ni des sous-requêtes.

> **Piège d'examen.** Une fonction de fenêtrage conserve chaque ligne et y ajoute la valeur calculée ; `GROUP BY` regroupe les lignes. « Afficher les ventes de chaque jour avec leur moyenne mobile sur 7 jours » demande `OVER (... ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`, pas `GROUP BY` ; s'il manque des dates, la fenêtre couvre 7 lignes, pas 7 jours calendaires.

<!-- section: key-points -->
## Points clés

- Quick Sight dans AWS Quick pour les tableaux de bord ; SPICE pour la rapidité et un coût source réduit, requête directe pour la fraîcheur ; profils DataBrew pour les premières statistiques.
- Vérifier avec du SQL Athena (comptages, doublons, valeurs nulles), une validation Lambda à l'arrivée, des blocs-notes, Data Wrangler (dans SageMaker Canvas) et DataBrew.
- Les vues se recalculent ; les vues matérialisées Redshift stockent les résultats avec actualisation incrémentielle et automatique ; vues à liaison tardive pour les tables Spectrum.
- Athena Spark : groupe de travail Spark, sessions de bloc-notes en DPU, arrêter les sessions inactives ; Spark 3.5 via SageMaker Unified Studio ou Spark Connect.
- Sans serveur pour les charges en pics et intermittentes ; provisionné avec réservations pour les charges régulières et un contrôle complet.
- Agréger avec `GROUP BY`, `ROLLUP`, `GROUPING SETS` ; moyennes mobiles avec des cadres de fenêtre ; pivoter avec le `PIVOT` de Redshift ou une agrégation conditionnelle dans Athena.
