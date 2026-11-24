Un modèle de chargement répond à trois questions : combien de données chaque exécution déplace (tout, ou seulement ce qui a changé), dans quel ordre les tables sont chargées pour que les clés restent cohérentes, et comment les données continues arrivent sans petits fichiers ni événements perdus. Les questions d'examen donnent une source (avec ou sans capture des changements de données, avec ou sans horodatage fiable), un modèle cible et une latence, et demandent la méthode, l'ordre des étapes ou le code qui complète le chargement.

<!-- section: full-incremental | objectives: 2.1.1 -->
## Chargements complets et incrémentiels

| | Chargement complet | Chargement incrémentiel |
| --- | --- | --- |
| Chaque exécution déplace | Toutes les lignes de la source | Seulement les lignes insérées ou modifiées depuis la dernière exécution réussie |
| Opération sur la cible | Tronquer et recharger, ou remplacer | Ajouter, ou upsert (fusion) sur une clé |
| Convient à | Petites tables, premier chargement, sources sans indicateur de changement, réinitialisation après corruption | Tables volumineuses ou en croissance, exécutions fréquentes, charge limitée sur la source |
| Suppressions à la source | Disparaissent naturellement | Perdues, sauf si la CDC ou un indicateur de suppression réversible les transporte |

Façons de détecter les changements, de la plus simple à la plus coûteuse :

1. **Filigrane haut** (high watermark) : une colonne qui ne fait qu'augmenter (datetime `LastModified`, une identité, un `rowversion`). Stockez la dernière valeur, lisez les lignes au-dessus, puis enregistrez le nouveau maximum.
2. **Capture des changements de données (CDC)** ou suivi des modifications à la source : insertions, mises à jour **et suppressions**.
3. **Flux de changements Delta** (change data feed) quand la source est elle-même une table Delta dans OneLake.
4. **Comparaison des attributs** avec la cible (hachage des colonnes) : coûteux, en dernier recours.

Le modèle de filigrane dans un pipeline (tutoriel Learn) : deux activités Lookup lisent l'ancien filigrane dans une table de contrôle et le nouveau dans la source, la copie lit les lignes entre les deux, et une procédure stockée enregistre la nouvelle valeur seulement si la copie réussit.

```text
-- Copy activity source query (old value excluded, new value included)
SELECT * FROM dbo.Orders
WHERE LastModifyTime > '@{activity('LookupOldWatermark').output.firstRow.WatermarkValue}'
  AND LastModifyTime <= '@{activity('LookupNewWatermark').output.firstRow.NewWatermarkValue}'

-- Stored procedure activity, on success of the copy
EXEC dbo.usp_write_watermark @LastModifiedtime = '...', @TableName = 'Orders';
```

`>` sur l'ancienne valeur et `<=` sur la nouvelle copient chaque ligne exactement une fois, même si des lignes arrivent pendant l'exécution du pipeline.

Le même besoin avec moins à construire :

| Méthode | Comportement incrémentiel |
| --- | --- |
| **Travail de copie** | La première exécution copie tout, les suivantes seulement les changements. Types de colonne de **filigrane** : `rowversion`, datetime, date, entier, chaîne interprétée comme datetime (insertions et mises à jour uniquement). **CDC** quand elle est activée sur la source (les tables de lakehouse Fabric sont aussi une source CDC) : insertions, mises à jour et suppressions ; un travail qui mélange des tables avec et sans CDC traite toutes les tables avec un filigrane. Méthodes de mise à jour : **Append** (par défaut), **Merge** sur une clé (la clé primaire par défaut), **Overwrite**, **SCD Type 2** (préversion, pas avec les sources CDC Oracle). Une exécution en échec reprend depuis le dernier état réussi ; une réinitialisation force une copie complète par travail ou par table |
| **Actualisation incrémentielle de Dataflow Gen2** | Filtre une colonne Date, DateTime ou DateTimeZone en **compartiments** (buckets) ; seuls les compartiments dont le maximum de la colonne de détection des changements a changé sont rechargés (suppression, puis insertion pour cette plage). Destinations : lakehouse, entrepôt, Azure SQL Database. La requête doit être entièrement repliée (query folding) ; jusqu'à 50 compartiments par requête et 150 par dataflow. La destination doit être définie explicitement (pas la destination par défaut), avec un schéma fixe ; la seule méthode de mise à jour est le remplacement (replace) ; OPTIMIZE et REORG TABLE ne sont pas pris en charge sur une table de lakehouse qui l'utilise |
| **Mise en miroir** | Réplication continue, rien à planifier |
| **Notebook** | Lire les changements, puis `MERGE` Delta dans la cible |

```text
MERGE INTO silver.customers AS t
USING staged_changes AS s
  ON t.CustomerID = s.CustomerID
WHEN MATCHED AND s.Operation = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED AND s.Operation != 'D' THEN INSERT *
```

> **Piège d'examen.** Un filigrane sur `LastModified` ne voit jamais une ligne supprimée. « Les lignes supprimées doivent être retirées de la cible » demande la CDC (travail de copie avec CDC et Merge, ou fusion des lignes CDC dans un notebook), un indicateur de suppression réversible à la source, ou une comparaison complète périodique.

> **Piège d'examen.** Dans l'actualisation incrémentielle de Dataflow Gen2, utilisez une colonne différente pour filtrer (par exemple `OrderDate`) et pour détecter les changements (par exemple `ModifiedDate`). Utiliser la même colonne déclenche un avertissement et peut manquer des changements ou créer des doublons.

<!-- section: dimensional-model | objectives: 2.1.2 -->
## Préparer les données pour un modèle dimensionnel

Recommandations Fabric pour charger un schéma en étoile dans un entrepôt :

1. Chargez éventuellement des tables de **mise en lots** (staging) : un schéma `staging` aux colonnes proches de la source, tronqué au début de chaque exécution, jamais exposé aux utilisateurs métier. Si les données sont déjà dans un lakehouse (bronze, argent ou or), la mise en lots dans l'entrepôt peut être inutile.
2. Traitez les **dimensions**, dans l'ordre des dépendances (une dimension géographique utilisée par les dimensions client et fournisseur en premier).
3. Traitez les **faits** : recherchez la clé de substitution de chaque dimension.
4. Post-traitement : actualiser le modèle sémantique, journaliser l'exécution, notifier.

Transformations en chemin : combiner (fusion sur des clés, ajout de sources similaires), convertir les types de données, calculer des valeurs (nom complet, montant brut), détecter les changements historiques, agréger au grain déclaré.

Le **traitement des dimensions** rapproche les lignes entrantes des lignes existantes sur la **clé métier** :

| Type de changement | Action |
| --- | --- |
| Nouveau membre | Insérer avec une nouvelle clé de substitution |
| Attribut SCD de type 1 modifié | Mettre à jour la ligne sur place |
| Attribut SCD de type 2 modifié | Expirer la ligne courante (date de fin, `IsCurrent = 0`), insérer une nouvelle version avec une nouvelle clé de substitution |
| SCD de type 3 | Mettre à jour la colonne « valeur précédente », sans nouvelle ligne |
| Supprimé à la source | Suppression réversible (`IsDeleted = 1`), jamais de suppression physique si des faits le référencent |

```text
-- SCD type 2 in a warehouse: expire, then insert the new versions
UPDATE d
SET d.ValidTo = CAST(GETDATE() AS date), d.IsCurrent = 0
FROM dbo.DimCustomer AS d
JOIN stg.Customer AS s ON s.CustomerID = d.CustomerID
WHERE d.IsCurrent = 1 AND d.City <> s.City;

INSERT INTO dbo.DimCustomer (CustomerID, CustomerName, City, ValidFrom, ValidTo, IsCurrent)
SELECT s.CustomerID, s.CustomerName, s.City, CAST(GETDATE() AS date), NULL, 1
FROM stg.Customer AS s
LEFT JOIN dbo.DimCustomer AS d ON d.CustomerID = s.CustomerID AND d.IsCurrent = 1
WHERE d.CustomerID IS NULL;
```

La seconde instruction insère à la fois les clients entièrement nouveaux et les nouvelles versions des clients expirés par la première (ils n'ont plus de ligne courante).

**Clés de substitution** : utilisez le plus petit type entier adapté. L'entrepôt propose `IDENTITY` (`bigint` uniquement, valeurs uniques mais non séquentielles). Les faits stockent les clés de substitution ; pour une dimension SCD de type 2, recherchez la version **courante** (ou la version valide à la date de la transaction quand vous chargez l'historique). Les clés de date sont calculées (`YYYYMMDD`). Une dimension de date qui contient des attributs de décalage relatif (jours ou mois depuis aujourd'hui) doit être mise à jour chaque jour, avec une logique T-SQL dans une procédure stockée, et étendue au début de chaque année.

**Membres manquants** : quand un fait référence une clé métier qui n'est pas encore dans la dimension, faites-le pointer vers un membre **Unknown** (clé `-1`), puis exécutez un processus périodique qui relit la source pour ces lignes de faits et met à jour leurs clés, ou insérez un **membre déduit** (inferred member : clé métier seule, attributs « Unknown », `IsInferredMember = 1`). Quand les vrais attributs arrivent, mettez à jour cette ligne sur place et effacez l'indicateur : c'est un détail arrivé en retard, pas un changement SCD de type 2.

> **Piège d'examen.** Ne tronquez et ne rechargez jamais entièrement une dimension dont les clés de substitution sont générées : de nouvelles clés cassent tous les faits qui référencent les anciennes, et l'historique SCD de type 2 peut être impossible à reconstruire. Rechargez les dimensions de façon incrémentielle.

> **Conseil d'examen.** L'entrepôt n'applique pas les clés étrangères (`NOT ENFORCED`). Le chargement des faits doit gérer lui-même les recherches en échec (membre Unknown ou déduit) ; une ligne de fait est insérée avec une clé valide, jamais écartée silencieusement.

<!-- section: streaming-pattern | objectives: 2.1.3 -->
## Modèles de chargement pour les données de diffusion en continu

| Modèle | Chemin | À utiliser quand |
| --- | --- | --- |
| Événements bruts vers KQL | Flux d'événements, **Ingestion directe** vers une table d'eventhouse | Effort minimal, interroger les événements frais en KQL, transformer plus tard dans l'eventhouse |
| Événements remodelés vers KQL | Opérateurs du flux d'événements (filtre, gestion des champs, agrégation), **Traitement des événements avant l'ingestion** vers un eventhouse | Écarter ou remodeler des événements avant leur stockage |
| Événements vers Delta | Flux d'événements, destination Lakehouse | Les utilisateurs Spark et SQL ont besoin du flux sous forme de tables Delta |
| Flux par le code vers Delta | Streaming structuré Spark (notebook pour développer, définition de travail Spark avec stratégie de nouvelle tentative en production) | Logique complexe, bibliothèques, jointures flux-statique |
| Médaillon dans l'eventhouse | Table brute, **stratégie de mise à jour** vers une table typée, **vue matérialisée** pour les dernières valeurs ou les agrégats | Bronze-argent-or en KQL uniquement, transformé au moment de l'ingestion |

Règles que l'examen vérifie :

- L'**ingestion directe** se rattache au flux par défaut ou à un flux dérivé et stocke les événements sans traitement ; vous terminez la configuration (table, mappage) depuis la destination eventhouse en mode Live. Le **traitement des événements avant l'ingestion** se rattache après un opérateur ou un flux dérivé.
- Les destinations sans prise en charge des opérateurs reçoivent les données traitées via un **flux dérivé**.
- Pour ne pas perdre les premiers événements (par exemple l'instantané CDC initial) sur une destination Eventhouse (traitement des événements) ou Lakehouse, décochez **Activate ingestion** en l'ajoutant, publiez, puis activez l'ingestion avec une **heure personnalisée** (Custom time) antérieure au démarrage.
- Un flux Spark vers Delta demande un **emplacement de point de contrôle** (suivi de la progression exactement une fois et redémarrage) et en général un **intervalle de déclencheur** dimensionné pour produire des fichiers de bonne taille au lieu d'un petit fichier par micro-lot :

```text
(events.writeStream
    .format("delta")
    .option("checkpointLocation", "Files/checkpoints/telemetry")
    .outputMode("append")
    .trigger(processingTime="1 minute")
    .toTable("bronze_telemetry"))
```

- Une stratégie de mise à jour avec `IsTransactional: true` garantit qu'une transformation en échec n'ingère pas non plus dans la table source ; avec la valeur par défaut `false`, la source garde les lignes et la cible les manque.
- Pour alimenter des consommateurs lakehouse et Direct Lake depuis un eventhouse sans second pipeline, activez la **disponibilité OneLake de l'eventhouse** (copie Delta écrite par lots, jusqu'à 3 heures de latence par défaut).

> **Piège d'examen.** Un tableau de bord en temps réel sur des événements de moins de quelques secondes lit l'**eventhouse**, pas un lakehouse alimenté par des micro-lots Spark. À l'inverse, « joindre le flux à des tables Delta de référence et écrire du Delta pour les utilisateurs Spark » oriente vers le streaming structuré Spark ou une destination Lakehouse du flux d'événements.

<!-- section: key-points -->
## Points clés

- Chargement complet = tout à chaque exécution ; incrémentiel = seulement les changements, détectés par un filigrane, la CDC ou le flux de changements.
- Filigrane : `>` l'ancienne valeur, `<=` la nouvelle, enregistrer la nouvelle valeur en cas de réussite ; il ne capture jamais les suppressions.
- Travail de copie : filigrane ou CDC, Append, Merge, Overwrite ou SCD Type 2 (préversion) ; actualisation incrémentielle de Dataflow Gen2 : compartiments, colonne de détection des changements distincte.
- Chargement dimensionnel : mise en lots, dimensions dans l'ordre des dépendances, puis faits avec recherche des clés de substitution ; pas de troncature et rechargement des dimensions.
- Membres de dimension manquants : membre Unknown ou membre déduit mis à jour sur place plus tard.
- Streaming : ingestion directe ou traitement avant l'ingestion vers un eventhouse, destination Lakehouse, ou Spark avec point de contrôle et déclencheur ; stratégies de mise à jour et vues matérialisées dans l'eventhouse.
