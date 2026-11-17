Les modèles d'entreprise doivent rester rapides, à jour et économes en capacité. L'examen présente un rapport lent, un modèle qui bascule en DirectQuery ou une actualisation trop longue, et demande l'outil de diagnostic, la réécriture DAX, le paramètre Direct Lake ou la stratégie d'actualisation incrémentielle qui résout le problème.

<!-- section: visual-query-performance | objectives: 3.2.1 -->
## Améliorer les performances des requêtes et des visuels de rapport

Commencez par l'**Analyseur de performances** de Power BI Desktop (ruban **Optimiser** > **Analyseur de performances** > **Démarrer l'enregistrement** > **Actualiser les visuels**). Chaque visuel affiche ses durées ; copiez sa requête DAX, ou sélectionnez **Exécuter** pour l'ouvrir dans la vue de requête DAX.

| Catégorie dominante | Signification | Correction |
| --- | --- | --- |
| Requête DAX | Le modèle ou la mesure est lent | Simplifier le DAX, réduire le modèle, ajouter des agrégations |
| Affichage visuel | Le visuel affiche trop de points ou est un visuel personnalisé lent | Moins de points de données, filtre Top N, autre visuel |
| Autre | Le visuel a attendu d'autres visuels | Moins de visuels par page, pages d'extraction et d'info-bulle |

Réduisez le modèle (Import et Direct Lake utilisent tous deux le stockage en colonnes VertiPaq, dont la taille dépend de la cardinalité des colonnes) :

- Supprimez les colonnes inutilisées, surtout celles à forte cardinalité (GUID, texte libre, horodatages) ; séparez une date-heure en une colonne de date et une colonne d'heure, ou supprimez l'heure.
- Supprimez les lignes inutiles (ancien historique) et pré-agrégez quand le détail n'est pas présenté.
- Utilisez des clés entières et le plus petit type adapté ; désactivez **Date/heure automatique** et utilisez une seule table de dates.
- Préférez des colonnes calculées en amont ou dans Power Query aux colonnes calculées DAX.

Réduisez ce que demandent les visuels :

- Limitez les visuels par page ; filtrez les grandes tables avec **Top N** ; déplacez les détails dans des pages d'extraction.
- Options de **réduction des requêtes** (Options > Fichier actif) : désactiver la mise en surbrillance croisée par défaut, ajouter un bouton **Appliquer** aux segments et aux filtres pour que chaque changement n'envoie pas de requêtes.

Les **agrégations définies par l'utilisateur** accélèrent les grands modèles DirectQuery : une table d'agrégation Import (par exemple les ventes par jour et par produit) est mappée à une **table de détails** DirectQuery dans **Gérer les agrégations** (Synthèse Sum, Min, Max, Count, Count table rows, avec des colonnes GroupBy).

| Règle | Valeur |
| --- | --- |
| Mode de stockage de la table de détails | DirectQuery (obligatoire) |
| Mode de stockage de la table d'agrégation | Import (non modifiable ensuite) |
| Dimensions liées | Double (Dual), pour que les deux tables puissent les utiliser |
| Plusieurs tables d'agrégation | **Priorité** (precedence) : la plus élevée est essayée en premier |
| Visibilité | Table d'agrégation masquée ; les utilisateurs interrogent la table de détails |
| Sécurité au niveau des lignes | Doit filtrer à la fois la table d'agrégation et la table de détails pour garder les correspondances |
| Vérifier les correspondances | SQL Profiler, événement `Aggregate Table Rewrite Query` |

Les **agrégations automatiques** (capacités Premium) créent et entraînent des agrégations pour les modèles DirectQuery sans mappage manuel.

> **Piège d'examen.** Les agrégations et les tables hybrides ne sont pas prises en charge dans les modèles Direct Lake : pour accélérer Direct Lake, optimisez les tables Delta et le DAX, ou créez des tables Delta agrégées en amont.

<!-- section: dax-performance | objectives: 3.2.2 -->
## Améliorer les performances de DAX

Le moteur de stockage (VertiPaq) analyse en parallèle des colonnes compressées et met les résultats en cache ; le moteur de formules évalue la logique complexe ligne par ligne. Un DAX rapide envoie de simples filtres de colonnes au moteur de stockage.

```text
-- Slow: FILTER evaluates the condition for every row of Product
Red Sales =
CALCULATE ( [Sales], FILTER ( 'Product', 'Product'[Color] = "Red" ) )

-- Fast: Boolean column filter; KEEPFILTERS keeps existing filters on Color
Red Sales =
CALCULATE ( [Sales], KEEPFILTERS ( 'Product'[Color] = "Red" ) )

-- FILTER is needed when the condition uses a measure: iterate a small table
Sales for Profitable Months =
CALCULATE ( [Sales], FILTER ( VALUES ( 'Date'[Month] ), [Profit] > 0 ) )

-- Variables: each measure is evaluated once instead of twice
Sales Growth % =
VAR _Current = [Sales]
VAR _PY = CALCULATE ( [Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
RETURN
    DIVIDE ( _Current - _PY, _PY )
```

Un argument de filtre booléen ne peut référencer ni une mesure, ni des colonnes de plusieurs tables, ni un `CALCULATE` imbriqué, ni une fonction de table : ces cas exigent `FILTER`, idéalement sur `VALUES` d'une colonne plutôt que sur une table entière.

| Modèle à éviter | Mieux |
| --- | --- |
| `FILTER ( FactTable, ... )` comme argument de `CALCULATE` | Prédicat booléen sur une colonne, ou `FILTER` sur `VALUES ( column )` |
| Répéter la même mesure dans une expression | `VAR` |
| `IF ( ISBLANK ( [M] ), 0, [M] )` sur chaque ligne | Laisser les vides : les convertir en 0 fait renvoyer toutes les combinaisons aux visuels |
| `IFERROR` ou `ISERROR` autour d'un calcul | `DIVIDE`, ou tester la condition d'abord |
| `COUNT ( Table[Key] )` pour compter des lignes | `COUNTROWS ( Table )` |
| `IF ( HASONEVALUE ( c ), VALUES ( c ) )` | `SELECTEDVALUE ( c )` |
| Itérateur sur une grande table de faits appelant une mesure (transition de contexte à chaque ligne) | Itérer une table plus petite (dimension ou `VALUES`), ou agréger d'abord |

`DIVIDE` gère un dénominateur nul ; l'opérateur `/` convient quand le dénominateur est une constante non nulle.

> **Piège d'examen.** Les deux versions renvoient en général les mêmes chiffres ; la question porte sur la vitesse. Choisissez le prédicat booléen sauf si la condition référence une mesure ou plusieurs tables.

<!-- section: direct-lake-config | objectives: 3.2.3 -->
## Configurer Direct Lake : cadrage, actualisation et basculement

Le **cadrage** (framing) est l'actualisation Direct Lake : il ne lit que le journal Delta et fait pointer le modèle vers les derniers fichiers Parquet, ce qui prend en général quelques secondes. Les requêtes montrent ensuite les données telles qu'au dernier cadrage réussi. Les colonnes sont chargées en mémoire (**transcodage**) quand une requête en a besoin pour la première fois, restent résidentes, puis sont évincées après un cadrage sur des tables modifiées, après une période sans utilisation ou sous pression mémoire.

| Paramètre ou comportement | Détail |
| --- | --- |
| **Keep your Direct Lake data up to date** (paramètres du modèle sémantique, section Actualisation) | Activé par défaut : les modifications Delta déclenchent le cadrage des tables concernées |
| Quand le désactiver | Les nouvelles données ne doivent pas être visibles avant la fin d'un processus ETL ; actualisez alors à la fin (portail, planification, API REST, TOM) |
| Après une erreur d'actualisation non récupérable | Les mises à jour automatiques sont suspendues jusqu'à ce qu'une actualisation à la demande réussisse |
| Prérequis du cadrage | Le propriétaire du modèle (ou l'identité fixe) doit avoir l'accès en lecture aux tables sources |

Le **basculement vers DirectQuery** n'existe que pour Direct Lake sur SQL. Une requête reste en Direct Lake seulement si aucune table n'a de sécurité au niveau des lignes, de sécurité au niveau de l'objet ou de masquage dynamique des données SQL au point de terminaison d'analytique SQL, si aucune table n'est une vue non matérialisée, si aucune table ne dépasse les garde-fous, et si le modèle a été cadré après la modification des tables.

| `DirectLakeBehavior` | Comportement | Usage |
| --- | --- | --- |
| `Automatic` (par défaut) | Bascule en DirectQuery sans prévenir | Production |
| `DirectLakeOnly` | La requête échoue avec une erreur | Développement : trouver et corriger les causes de basculement |
| `DirectQueryOnly` | Toujours DirectQuery | Développement : mesurer les performances en basculement |

Définissez-le dans le volet **Propriétés** du modèle (**Direct Lake behavior**) ou avec TOM :

```text
database.Model.DirectLakeBehavior = DirectLakeBehavior.DirectLakeOnly;
database.Model.SaveChanges();
```

Diagnostiquez en DAX : la colonne `[DirectLakeFallbackInfo]` donne la raison pour chaque table, `None` signifiant Direct Lake.

```text
EVALUATE TABLETRAITS ()
```

Les garde-fous par table dépendent de la référence SKU (extrait) :

| Référence SKU Fabric | Fichiers Parquet et groupes de lignes par table | Lignes par table | Taille max. du modèle dans OneLake |
| --- | --- | --- | --- |
| F2 à F8 | 1 000 | 300 millions | 10 Go |
| F32 | 1 000 | 300 millions | 40 Go |
| F64 | 5 000 | 1,5 milliard | Illimitée |
| F512 | 10 000 | 12 milliards | Illimitée |

| Cause | Correction |
| --- | --- |
| Trop de fichiers Parquet ou de groupes de lignes | `OPTIMIZE` (et `VACUUM`) sur la table Delta ; sinon une référence SKU plus grande |
| Vue SQL | La matérialiser en table Delta (par exemple une vue matérialisée de lakehouse) |
| RLS ou OLS au point de terminaison SQL | Définir plutôt la sécurité dans le modèle sémantique |
| Table non cadrée | Actualiser le modèle |

```text
OPTIMIZE gold_sales;
VACUUM gold_sales RETAIN 168 HOURS;
```

> **Piège d'examen.** En cas de dépassement d'un garde-fou, Direct Lake sur SQL bascule en DirectQuery (l'actualisation réussit avec un avertissement, les requêtes sont plus lentes), alors que Direct Lake sur OneLake fait échouer l'actualisation et ne peut plus être interrogé tant que les tables Delta ne sont pas optimisées.

<!-- section: direct-lake-onelake-vs-sql | objectives: 3.2.4 -->
## Direct Lake sur OneLake ou sur le point de terminaison d'analytique SQL

| Domaine | Direct Lake sur OneLake | Direct Lake sur SQL |
| --- | --- | --- |
| Sources | Un ou plusieurs éléments Fabric avec des tables Delta (natives ou via des raccourcis) | Un élément Fabric doté d'un point de terminaison d'analytique SQL |
| Basculement vers DirectQuery | Aucun : la requête échoue | Oui, contrôlé par Direct Lake behavior |
| Vues SQL | Non prises en charge (utilisez des vues matérialisées de lakehouse) | Prises en charge, via le basculement |
| RLS, OLS, CLS du point de terminaison SQL | Non appliquées : l'accès dépend des autorisations OneLake (sécurité OneLake) | RLS via le basculement ; OLS et CLS prises en charge, erreurs quand l'accès est refusé |
| RLS du modèle sémantique | Prise en charge (connexion à identité fixe recommandée) | Prise en charge (idem) |
| Colonnes et tables calculées | Préversion (colonnes calculées en contexte utilisateur uniquement) | Non (sauf groupes de calcul, paramètres de simulation et paramètres de champ) |
| Composite avec des tables Import ou DirectQuery | Oui | Non |
| Date/heure automatique | Prise en charge | Non prise en charge |
| Créé depuis | Power BI Desktop ou modélisation web, catalogue OneLake | **Nouveau modèle sémantique** sur le point de terminaison d'analytique SQL |

| Exigence | Réponse |
| --- | --- |
| Tables d'un lakehouse et d'un entrepôt dans un même modèle | Direct Lake sur OneLake |
| Réutiliser la sécurité au niveau des lignes T-SQL définie dans l'entrepôt | Direct Lake sur SQL (les requêtes basculent en DirectQuery) |
| Modèle construit sur des vues SQL sans les matérialiser | Direct Lake sur SQL |
| Ne jamais subir les performances DirectQuery ; des erreurs sont préférables | Direct Lake sur OneLake, ou Direct Lake sur SQL avec `DirectLakeOnly` |
| Ajouter des tables Import à un modèle Direct Lake | Direct Lake sur OneLake |

Limites communes : pas de passerelle (connexions cloud uniquement), pas de modèle dans Mon espace de travail, types identiques sur les colonnes reliées, valeurs uniques du côté « un », pas de colonnes binaires ou GUID.

> **Piège d'examen.** Avec Direct Lake sur OneLake, une stratégie RLS T-SQL de l'entrepôt n'est pas appliquée : la requête réussit sans le filtre SQL, et l'accès dépend des autorisations OneLake de l'utilisateur. Placez la sécurité au niveau des lignes dans le modèle sémantique ou dans la sécurité OneLake.

<!-- section: incremental-refresh | objectives: 3.2.5 -->
## Implémenter l'actualisation incrémentielle

L'actualisation incrémentielle partitionne une table Import (ou hybride) par date pour que chaque actualisation ne recharge que les périodes récentes.

1. Dans Power Query, créez deux paramètres **Date/Heure** nommés exactement `RangeStart` et `RangeEnd` (réservés, sensibles à la casse).
2. Filtrez la colonne de date avec eux, `>=` sur une borne et `<` sur l'autre, dans une étape **repliée** vers la source.
3. Dans Power BI Desktop, définissez la **stratégie d'actualisation incrémentielle** de la table, puis publiez.
4. Lancez la première actualisation dans le service : elle crée les partitions et charge l'historique.

```text
let
    Source = Sql.Database("contoso-sql.database.windows.net", "SalesDb"),
    Sales = Source{[Schema = "dbo", Item = "FactSales"]}[Data],
    Filtered = Table.SelectRows(Sales, each [OrderDate] >= RangeStart and [OrderDate] < RangeEnd)
in
    Filtered
```

| Paramètre de la stratégie | Sens |
| --- | --- |
| Archive data starting before refresh date (archiver les données) | Fenêtre historique conservée (par exemple 5 ans), en partitions annuelles, trimestrielles ou mensuelles |
| Incrementally refresh data starting before refresh date (actualiser de façon incrémentielle) | Fenêtre rechargée à chaque actualisation (par exemple 10 jours) |
| Get the latest data in real time with DirectQuery | Ajoute une partition DirectQuery après la fenêtre d'actualisation (table hybride) ; Premium, PPU ou Embedded uniquement |
| Only refresh complete days | Exclut le jour partiel en cours ; obligatoire avec le DirectQuery en temps réel |
| Detect data changes | N'actualise que les partitions dont la valeur maximale d'une colonne d'audit (comme `LastModified`, pas la colonne de partition) a changé |

| Fait | Valeur |
| --- | --- |
| Licences | Pro, Premium par utilisateur, Premium, Embedded (partition en temps réel : pas Pro) |
| Durée maximale d'actualisation | 2 heures avec Pro, 5 heures avec Premium ; pas de limite via le point de terminaison XMLA |
| Gestion des partitions | SSMS ou TMSL via le point de terminaison XMLA : actualiser une partition historique, amorcer un gros chargement initial |
| Source de données | Une seule source pour toutes les partitions ; les filtres doivent être repliables (les sources relationnelles conviennent le mieux) |
| Modèle pouvant dépasser 1 Go | Activer le format de stockage de modèle sémantique volumineux avant la première actualisation |

> **Piège d'examen.** Utiliser `>=` (ou `<=`) sur les deux bornes charge les lignes limites dans deux partitions et les duplique. De plus, republier le modèle depuis Power BI Desktop remplace les partitions et leurs données, et un modèle avec actualisation incrémentielle ne peut pas être retéléchargé en `.pbix` : modifiez-le plutôt avec des outils XMLA (TMSL, ALM Toolkit).

Les modèles Direct Lake n'utilisent ni partitions de modèle ni actualisation incrémentielle : le cadrage évite déjà de recharger les données, et le partitionnement se fait au niveau des tables Delta.

<!-- section: key-points -->
## Points clés

- Analyseur de performances : Requête DAX, Affichage visuel ou Autre indique s'il faut corriger le modèle, le visuel ou la page.
- Un modèle plus petit est plus rapide : supprimez les colonnes à forte cardinalité, séparez les dates-heures, désactivez Date/heure automatique.
- Agrégations : table d'agrégation Import sur une table de détails DirectQuery, dimensions en mode Double ; pas en Direct Lake.
- Les filtres booléens battent `FILTER` sur des tables ; utilisez des variables, `DIVIDE`, `COUNTROWS`, `SELECTEDVALUE` ; ne transformez pas les vides en zéros.
- Le cadrage ne copie que des métadonnées ; Keep your Direct Lake data up to date est activé par défaut ; désactivez-le pour exposer les données après l'ETL.
- `DirectLakeBehavior` : Automatic, DirectLakeOnly, DirectQueryOnly ; `TABLETRAITS()` montre les raisons de basculement.
- OneLake : plusieurs sources, pas de basculement, sécurité OneLake. SQL : une source, vues et RLS SQL via le basculement.
- Actualisation incrémentielle : paramètres Date/Heure `RangeStart` et `RangeEnd`, `>=` et `<`, filtre repliable, première actualisation dans le service, XMLA pour les partitions.
