Un modèle sémantique transforme des tables en couche métier : mode de stockage, schéma en étoile, relations et mesures DAX. Les questions d'examen décrivent des volumes, une latence et des sources, puis demandent un mode de stockage ou un paramètre de relation, ou montrent une mesure DAX à compléter.

<!-- section: storage-modes | objectives: 3.1.1 -->
## Choisir un mode de stockage

| Mode | Où sont les données | Fraîcheur | Limites principales |
| --- | --- | --- | --- |
| Import | Copiées dans le modèle (VertiPaq, en mémoire) | À la dernière actualisation | Taille du modèle, durée et planification de l'actualisation |
| DirectQuery | Restent dans la source ; DAX traduit dans le langage de requête de la source | Au moment de la requête | Visuels plus lents, M et DAX limités, charge sur la source |
| Direct Lake | Tables Delta dans OneLake, colonnes chargées en mémoire à la demande | Au dernier cadrage (framing), automatique par défaut | Sources Delta Fabric uniquement ; garde-fous par référence SKU de capacité |
| Double (Dual) | Les deux : copie en cache et DirectQuery | Selon la requête | Mêmes restrictions que DirectQuery |

| Exigence | Réponse |
| --- | --- |
| Visuels les plus rapides, données tenant en mémoire, actualisation quotidienne acceptable, sources hors Fabric | Import |
| La source doit être interrogée en direct (quelques secondes de latence), ou les données ne peuvent pas être copiées | DirectQuery |
| Données déjà dans des tables Delta d'un lakehouse ou d'un entrepôt Fabric, gros volume, pas de fenêtre d'actualisation Import | Direct Lake |
| Dimension liée à la fois à des tables Import et DirectQuery de la même source | Double (Dual) |
| Historique importé, lignes du jour en direct | Table hybride : actualisation incrémentielle avec **Get the latest data in real time with DirectQuery**, qui ajoute une partition DirectQuery en temps réel |

Direct Lake existe en deux variantes : **Direct Lake sur OneLake** (Power BI Desktop ou modélisation web via le **catalogue OneLake** ; peut combiner plusieurs éléments Fabric ; pas de basculement vers DirectQuery) et **Direct Lake sur SQL** (depuis un point de terminaison d'analytique SQL avec **Nouveau modèle sémantique** ; source unique ; bascule en DirectQuery).

Le mode de stockage se définit par table dans la vue Modèle, **Propriétés > Avancé > Mode de stockage**. Une table ne peut changer de mode que si elle a été créée en mode DirectQuery ou Direct Lake sur OneLake.

> **Piège d'examen.** Passer une table de DirectQuery à Import ou Double est irréversible dans Power BI Desktop (la modélisation web et la modification en direct gardent un historique de versions qui permet de revenir en arrière). Les tables en mode Double ont les mêmes limites que les tables DirectQuery.

<!-- section: star-schema-model | objectives: 3.1.2 -->
## Implémenter un schéma en étoile pour un modèle sémantique

- **Les dimensions filtrent les faits** : relations un-à-plusieurs de la clé de dimension (côté « un ») vers la clé étrangère du fait (côté « plusieurs »), direction de filtrage croisé unique.
- **Aplatissez les flocons** en amont ou dans Power Query pour que chaque dimension soit une seule table.
- **Table de dates** : une ligne par date, sans trou, marquée avec **Marquer comme table de dates** ; reliée sur une colonne de date ou de clé de date.
- **Masquez** les clés étrangères et les colonnes numériques des faits, et exposez des mesures explicites. **Décourager les mesures implicites** est requis pour les groupes de calcul.
- **Dimension dégénérée** : un attribut comme le numéro de commande conservé dans la table de faits.
- **Dimension de rôle** (role-playing) : une table Date reliée à OrderDate (active) et ShipDate (inactive) ; une mesure active la relation inactive avec `USERELATIONSHIP`. Autre option : une seconde copie de la table quand les utilisateurs veulent les deux rôles comme champs distincts dans un même visuel.

```text
Sales by Ship Date =
CALCULATE ( [Total Sales], USERELATIONSHIP ( Sales[ShipDateKey], 'Date'[DateKey] ) )
```

> **Piège d'examen.** Une seule relation active peut exister entre deux tables (ou sur un même chemin de filtre). Deux dates dans une table de faits, c'est une relation active plus des relations inactives, pas deux relations actives.

<!-- section: relationships | objectives: 3.1.3 -->
## Relations, tables de pont et plusieurs-à-plusieurs

| Propriété | Valeurs | Recommandation |
| --- | --- | --- |
| Cardinalité | Un-à-plusieurs, plusieurs-à-un, un-à-un, plusieurs-à-plusieurs | Clé de dimension du côté « un » ; plusieurs-à-plusieurs seulement s'il n'existe aucun côté unique |
| Direction du filtrage croisé | Unique, Les deux | Unique par défaut ; Les deux seulement là où un filtre doit partir du côté « plusieurs » (pont) |
| Active | Oui ou Non | Les relations inactives sont utilisées par `USERELATIONSHIP` |
| Appliquer le filtre de sécurité dans les deux directions | Activé ou Désactivé | Permet à la sécurité au niveau des lignes d'une dimension de filtrer à travers une relation bidirectionnelle |

Les relations **régulières** (un-à-plusieurs dans un même groupe de sources) se comportent comme des jointures externes gauches : les lignes de faits sans clé de dimension correspondante sont regroupées sous un membre vide. Les relations **limitées** (cardinalité plusieurs-à-plusieurs, ou relations entre groupes de sources dans un modèle composite) se comportent comme des jointures internes, n'ajoutent pas de membre vide et ne prennent pas en charge `RELATED`.

Les trois scénarios plusieurs-à-plusieurs :

| Scénario | Exemple | Conception |
| --- | --- | --- |
| Dimensions plusieurs-à-plusieurs | Un client a plusieurs comptes, un compte a plusieurs clients | Table de pont AccountCustomer avec une ligne par paire ; relations un-à-plusieurs d'Account et de Customer vers le pont ; **Les deux** sur une relation (Account vers AccountCustomer) pour que les filtres atteignent le fait ; pont masqué |
| Faits plusieurs-à-plusieurs | Order et Fulfillment sur OrderID | Déconseillé : ajoutez des dimensions partagées (OrderLine, Product, dates) et reliez chaque fait à elles |
| Faits de grain supérieur | Objectifs par année et catégorie de produit, ventes par jour et produit | Date : stockez le premier jour de la période et reliez en un-à-plusieurs à Date. Autre grain (catégorie) : relation plusieurs-à-plusieurs, direction unique, de la dimension vers le fait des objectifs |

Pour des faits de grain supérieur, une mesure masque les résultats aux niveaux inférieurs au grain :

```text
Target Quantity =
IF (
    NOT ISFILTERED ( 'Product'[ProductID] )
        && NOT ISFILTERED ( 'Product'[Product] ),
    SUM ( Target[TargetQuantity] )
)
```

`TREATAS` applique les valeurs d'une colonne comme filtre sur une autre colonne sans relation physique ; `CROSSFILTER` change la direction d'une relation dans une seule mesure, ce qui est plus sûr que de régler Les deux dans le modèle.

> **Piège d'examen.** Les totaux plusieurs-à-plusieurs ne sont pas additifs : un client avec deux comptes est compté une fois dans le total mais apparaît sous chaque compte. C'est le comportement attendu, pas un bogue.

<!-- section: dax-calculations | objectives: 3.1.4 -->
## Variables DAX, itérateurs, filtrage de table, fenêtrage et fonctions d'informations

```text
Margin % =
VAR _Sales = SUM ( Sales[SalesAmount] )
VAR _Cost = SUMX ( Sales, Sales[Quantity] * Sales[UnitCost] )
RETURN
    DIVIDE ( _Sales - _Cost, _Sales )

Sales All Regions = CALCULATE ( [Total Sales], REMOVEFILTERS ( Store[Region] ) )
Region Share = DIVIDE ( [Total Sales], [Sales All Regions] )

Big Customer Sales =
CALCULATE (
    [Total Sales],
    FILTER ( VALUES ( Customer[CustomerKey] ), [Total Sales] > 10000 )
)
```

| Famille | Fonctions | À retenir |
| --- | --- | --- |
| Variables | `VAR ... RETURN` | Évaluées une fois, là où elles sont définies : une variable utilisée dans `CALCULATE` n'est pas recalculée dans le nouveau contexte de filtre |
| Itérateurs | `SUMX`, `AVERAGEX`, `COUNTX`, `MAXX`, `RANKX`, `CONCATENATEX` | Évaluent une expression ligne par ligne, puis agrègent ; une mesure appelée à l'intérieur déclenche une transition de contexte |
| Filtrage de table | `CALCULATE`, `FILTER`, `ALL`, `ALLEXCEPT`, `REMOVEFILTERS`, `ALLSELECTED`, `KEEPFILTERS`, `VALUES` | Un filtre booléen sur une colonne remplace le filtre existant sur cette colonne ; `KEEPFILTERS` fait l'intersection |
| Fenêtrage | `WINDOW`, `OFFSET`, `INDEX`, `RANK`, `ROWNUMBER`, avec `ORDERBY`, `PARTITIONBY`, `MATCHBY` | Lignes relatives à la ligne courante ; positions `REL` (par défaut) ou `ABS` |
| Informations | `ISBLANK`, `ISFILTERED`, `ISCROSSFILTERED`, `ISINSCOPE`, `HASONEVALUE`, `ISEMPTY`, `USERPRINCIPALNAME` | Testent le contexte d'évaluation ; `SELECTEDVALUE ( col, alternate )` renvoie la valeur unique ou la valeur de remplacement |

```text
Running Sales FY =
SUMX (
    WINDOW (
        1, ABS, 0, REL,
        ALLSELECTED ( 'Date'[Fiscal Year], 'Date'[Month Number] ),
        ORDERBY ( 'Date'[Month Number], ASC ),
        PARTITIONBY ( 'Date'[Fiscal Year] )
    ),
    [Total Sales]
)

Previous Month Sales =
CALCULATE (
    [Total Sales],
    OFFSET (
        -1,
        ALLSELECTED ( 'Date'[Year], 'Date'[Month Number] ),
        ORDERBY ( 'Date'[Year], ASC, 'Date'[Month Number], ASC )
    )
)

Level Label =
SWITCH (
    TRUE (),
    ISINSCOPE ( 'Product'[Product] ), "Product",
    ISINSCOPE ( 'Product'[Category] ), "Category",
    "Total"
)
```

`WINDOW ( 1, ABS, 0, REL, ... )` signifie « de la première ligne de la partition jusqu'à la ligne courante » : un cumul qui repart à zéro à chaque exercice. `WINDOW ( -2, REL, 0, REL, ... )` est une fenêtre glissante de trois lignes.

> **Piège d'examen.** `SUM ( Sales[Quantity] ) * SUM ( Sales[UnitPrice] )` multiplie deux totaux ; le chiffre d'affaires est `SUMX ( Sales, Sales[Quantity] * Sales[UnitPrice] )`. Utilisez un itérateur dès que le calcul doit se faire par ligne avant l'agrégation.

`ISINSCOPE` teste le niveau de hiérarchie dans une matrice ; `ISFILTERED` est aussi vrai quand un segment filtre la colonne. `DIVIDE` renvoie une valeur vide en cas de division par zéro.

<!-- section: calc-groups-format-params | objectives: 3.1.5 -->
## Groupes de calcul, chaînes de format dynamique et paramètres de champ

Les **groupes de calcul** appliquent la même logique à n'importe quelle mesure. Dans la vue Modèle de Power BI Desktop, sélectionnez **Groupe de calcul** (Décourager les mesures implicites doit être activé), puis écrivez les **éléments de calcul** ; `SELECTEDMEASURE()` représente la mesure en cours d'évaluation.

```text
Current = SELECTEDMEASURE ()
YTD = CALCULATE ( SELECTEDMEASURE (), DATESYTD ( 'Date'[Date] ) )
PY = CALCULATE ( SELECTEDMEASURE (), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
YOY% =
VAR _PY = CALCULATE ( SELECTEDMEASURE (), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
RETURN
    DIVIDE ( SELECTEDMEASURE () - _PY, _PY )

Orders YOY % = CALCULATE ( [Orders], 'Time Intelligence'[Time Calculation] = "YOY%" )
```

- Chaque élément peut avoir sa propre **Chaîne de format dynamique** (par exemple `#,##0.00%` pour YOY%).
- La **Priorité** (precedence) ordonne plusieurs groupes de calcul appliqués à la même mesure ; les éléments se réordonnent dans la section **Éléments de calcul** du volet **Propriétés** (ou en les déplaçant vers le haut ou vers le bas depuis leur menu contextuel), et la colonne **Ordinal** les trie.
- Avec un groupe de calcul, les mesures des rapports utilisent le type de données `variant`.
- Les groupes de calcul n'agissent que sur les mesures explicites.

**Chaînes de format dynamique pour les mesures** : sélectionnez la mesure, **Outils de mesure > Format > Dynamique**, et écrivez une expression DAX qui renvoie une chaîne de format. Contrairement à `FORMAT()`, qui renvoie du texte, la mesure reste numérique et les graphiques fonctionnent toujours.

```text
SELECTEDVALUE ( 'Country Currency Format'[Format], "\$#,0.00;(\$#,0.00);\$#,0.00" )
```

**Paramètres de champ** : **Modélisation > Nouveau paramètre > Champs** crée une table calculée que les lecteurs du rapport utilisent dans un segment pour changer les mesures ou les colonnes d'un visuel.

```text
Metric = {
    ("Sales", NAMEOF ( Sales[Total Sales] ), 0),
    ("Margin", NAMEOF ( Sales[Margin %] ), 1),
    ("Orders", NAMEOF ( Sales[Orders] ), 2)
}
```

| Exigence | Fonctionnalité |
| --- | --- |
| Même logique YTD, PY et YoY sur 30 mesures sans créer 90 nouvelles mesures | Groupe de calcul |
| Une mesure affichée dans la devise du pays sélectionné | Chaîne de format dynamique |
| Les lecteurs choisissent la mesure ou la dimension affichée par un graphique | Paramètre de champ |
| Un élément YoY affiché en pourcentage quelle que soit la mesure de base | Chaîne de format dynamique sur l'élément de calcul |

> **Piège d'examen.** Les paramètres de champ ne prennent en charge ni les mesures implicites, ni les visuels IA, ni Q&R, et ne rien sélectionner revient à tout sélectionner. Sur une connexion active, ils exigent un modèle local (modèle composite).

<!-- section: large-model-format | objectives: 3.1.6 -->
## Format de stockage de modèle sémantique volumineux

Le **format de stockage de modèle sémantique volumineux** (Large semantic model storage format) supprime la limite de taille par défaut d'un modèle publié : la limite devient la mémoire de la capacité ou la taille maximale fixée par l'administrateur de capacité.

| Cas d'usage | Pourquoi |
| --- | --- |
| Modèle de plus de 10 Go | Obligatoire |
| Modèle qui grossit par actualisation incrémentielle | À activer avant la première actualisation s'il peut dépasser 1 Go |
| Opérations d'écriture via le point de terminaison XMLA | Améliore les performances d'écriture XMLA, même pour des modèles plus petits |
| Disponibilité plus rapide après éviction | Chargement à la demande : seules les pages de données nécessaires sont chargées |

Comment l'activer :

- Par modèle : **Paramètres** du modèle sémantique **> Format de stockage de modèle sémantique volumineux > Activé > Appliquer** (après publication).
- Par espace de travail : **Paramètres** de l'espace de travail **> Premium > Format de stockage par défaut** : format de stockage de modèle sémantique volumineux, pour les nouveaux modèles ; un modèle existant nécessite le paramètre par modèle.
- PowerShell, en tant qu'administrateur de la capacité et de l'espace de travail :

```powershell
Set-PowerBIDataset -Id <semantic model ID> -TargetStorageMode PremiumFiles
```

Prérequis et limites : références SKU Fabric F, Premium P, Embedded A ou Premium par utilisateur. Les espaces de travail Pro ne peuvent utiliser ce format que s'ils sont attribués à Reserved Capacity for Pro Workspaces, et leur limite reste de 1 Go ; les modèles sémantiques des espaces de travail Pro ne prennent pas en charge les opérations d'écriture XMLA. La limite de chargement de Power BI Desktop reste de 10 Go : le modèle la dépasse par actualisation dans le service. Les modèles volumineux utilisent par défaut des segments de 8 millions de lignes. Les modèles sémantiques push ne prennent pas en charge ce format, et l'espace de travail ne peut ensuite plus passer sur une capacité d'une autre région.

> **Piège d'examen.** Le format ne rend pas un modèle plus gros que la mémoire de la capacité et ne relève pas la limite de chargement de 10 Go. Pour un modèle qui va grossir, publiez-le petit et chargez l'historique par actualisation incrémentielle.

<!-- section: composite-models | objectives: 3.1.7 -->
## Concevoir et créer des modèles composites

Un modèle est **composite** quand il mélange des modes de stockage (Import, DirectQuery, Direct Lake), ou des tables DirectQuery de sources différentes. Plusieurs sources Import seules ne forment pas un modèle composite.

- **Groupe de sources** : toutes les tables Import (et Direct Lake) forment un groupe ; chaque source DirectQuery est son propre groupe. Les relations entre groupes sont **limitées** et ont par défaut une cardinalité plusieurs-à-plusieurs.
- **DirectQuery pour les modèles sémantiques Power BI** : connectez-vous en direct à un modèle publié, sélectionnez **Apporter des modifications à ce modèle**, puis ajoutez des tables ou mesures locales. Le propriétaire a besoin de l'autorisation **Build** sur chaque modèle source ; les lecteurs ont en général besoin de Read sur le modèle composite et les sources (Build peut être nécessaire quand les rapports sont dans un espace de travail Pro).
- Le mode **Double** sur les dimensions partagées avec des faits DirectQuery de la même source évite les relations limitées.
- **Direct Lake sur OneLake** peut se combiner avec des tables Import (modélisation web) ou DirectQuery (outils XMLA). Direct Lake sur SQL ne peut pas faire partie d'un modèle composite.

| Limite de DirectQuery vers des modèles sémantiques | Valeur |
| --- | --- |
| Longueur de chaîne | 3 au maximum |
| Sécurité au niveau des lignes | S'applique seulement dans le modèle source où elle est définie ; ne peut pas être définie sur des tables distantes |
| Groupes de calcul sur des sources distantes | Non pris en charge (résultats de requête indéfinis) |
| Types de données des colonnes distantes | Non modifiables ; utilisez une colonne calculée |
| Sources non prises en charge | Modèles de Mon espace de travail, SSAS tabulaire antérieur à 2022, SSAS multidimensionnel, SAP HANA, SAP BW, modèles en temps réel (streaming) et modèles d'exemple, Excel Online Refresh, données importées de fichiers Excel ou CSV dans le service, métriques d'utilisation |

> **Piège d'examen.** Un modèle composite peut envoyer des valeurs d'une source dans les requêtes vers une autre (des noms venant d'Excel dans une clause `WHERE` SQL) : un risque quand les sources ont une sécurité ou un chiffrement différents.

<!-- section: key-points -->
## Points clés

- Import est le plus rapide mais figé entre deux actualisations ; DirectQuery est en direct mais plus lent ; Direct Lake lit les tables Delta Fabric à une vitesse proche d'Import ; Double sert les deux.
- Schéma en étoile : un-à-plusieurs à direction unique des dimensions vers les faits, une table de dates marquée, des relations inactives plus `USERELATIONSHIP` pour les dates de rôle.
- Les dimensions plusieurs-à-plusieurs utilisent une table de pont avec une relation Les deux ; évitez les relations entre faits.
- Itérez avec `SUMX` quand le calcul se fait par ligne ; les variables sont évaluées une fois ; `KEEPFILTERS` fait l'intersection.
- `WINDOW`, `OFFSET` et `INDEX` avec `ORDERBY` et `PARTITIONBY` gèrent cumuls et périodes précédentes.
- Groupe de calcul = logique pour toutes les mesures ; chaîne de format dynamique = format d'une mesure ; paramètre de champ = le lecteur choisit le champ.
- Format de stockage volumineux : au-delà de 10 Go, pour les écritures XMLA et la croissance par actualisation incrémentielle ; jamais au-delà de la mémoire de la capacité.
- Composite : les relations entre groupes de sources sont limitées ; autorisation Build sur les modèles sources ; chaînes de 3 au maximum.
