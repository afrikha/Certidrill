Azure Cosmos DB est le service de base de données Azure pour les données non relationnelles (NoSQL) qui doivent monter en charge et répondre vite partout dans le monde. L'examen vous demande de reconnaître les charges de travail qui lui conviennent et d'associer un modèle de données à la bonne API Azure Cosmos DB.

<!-- section: cosmos-db-basics | objectives: 3.2.1 -->
## Ce qu'est Azure Cosmos DB

Azure Cosmos DB est une **base de données NoSQL entièrement managée**, fournie en tant que plateforme en tant que service (PaaS) : Microsoft gère les serveurs, les correctifs, les mises à jour et les sauvegardes.

Elle est **indépendante du schéma** : deux éléments d'un même conteneur n'ont pas besoin des mêmes propriétés.

```json
[
  { "id": "1001", "type": "bike", "name": "Mountain bike", "price": 899.99 },
  { "id": "1002", "type": "helmet", "name": "Road helmet", "sizes": ["S", "M", "L"], "color": "red" }
]
```

Les données sont organisées en quatre niveaux :

| Niveau | Rôle |
| --- | --- |
| **Compte** | La ressource Azure ; l'API et les régions se choisissent ici |
| **Base de données** | Un espace de noms logique qui regroupe des conteneurs |
| **Conteneur** | L'unité de stockage et de mise à l'échelle ; il porte la clé de partition, le débit et la stratégie d'indexation |
| **Élément** | Une entité : un document, une ligne, un nœud ou une arête, selon l'API |

- La **clé de partition** est une propriété qui répartit les éléments entre des partitions logiques. Une partition logique contient jusqu'à 20 Go ; une bonne clé a beaucoup de valeurs distinctes.
- **Toutes les propriétés sont indexées automatiquement** par défaut : pas de schéma à déclarer, pas d'index à gérer.

<!-- section: distribution-performance | objectives: 3.2.1 -->
## Distribution mondiale, cohérence et débit

- **Distribution mondiale** : vous ajoutez des régions Azure au compte à tout moment et les données sont répliquées dans chacune. Les utilisateurs lisent le réplica le plus proche ; avec les **écritures multirégions**, ils écrivent aussi dans la région la plus proche.
- **Garanties** : les lectures et les écritures se terminent en moins de 10 millisecondes au 99e centile ; les comptes avec écritures multirégions bénéficient d'un contrat SLA de disponibilité de 99,999 %.
- Le **débit** s'exprime en **unités de requête par seconde (RU/s)**. Une RU est à peu près le coût de lecture d'un élément de 1 Ko par son ID et sa clé de partition. Lectures, écritures, requêtes et suppressions consomment toutes des RU.

| Mode de débit | Principe | Usage |
| --- | --- | --- |
| **Provisionné** | Vous réservez des RU/s pour un conteneur (dédié) ou pour une base de données (partagé) | Trafic régulier et prévisible |
| **Mise à l'échelle automatique (autoscale)** | Vous fixez un maximum de RU/s ; la capacité suit la demande en dessous | Trafic variable |
| **Sans serveur (serverless)** | Rien à provisionner ; vous payez les RU consommées. Une seule région | Trafic intermittent et imprévisible |

Comme les données vivent dans plusieurs réplicas, vous choisissez l'un des **cinq niveaux de cohérence**, du plus cohérent au plus disponible :

| Niveau | Garantie |
| --- | --- |
| **Fort (Strong)** | Chaque lecture renvoie l'écriture la plus récente |
| **Obsolescence limitée (Bounded staleness)** | Les lectures sont en retard sur les écritures d'un intervalle configuré au plus |
| **Session** | Cohérent à l'intérieur d'une session cliente ; le niveau le plus utilisé |
| **Préfixe cohérent (Consistent prefix)** | Les lectures ne voient jamais les écritures dans le désordre, mais peuvent être périmées |
| **Éventuel (Eventual)** | Les réplicas convergent avec le temps ; garantie la plus faible, disponibilité la plus élevée |

<!-- section: use-cases | objectives: 3.2.1 -->
## Cas d'usage d'Azure Cosmos DB

Choisissez Azure Cosmos DB quand une application opérationnelle a besoin d'un **schéma souple, d'une portée mondiale et d'une faible latence à n'importe quelle échelle**.

| Scénario | Pourquoi Azure Cosmos DB convient |
| --- | --- |
| **IoT et télémétrie** | Ingestion rapide de données d'appareils à haute fréquence, disponibles pour un traitement en quasi temps réel |
| **Jeux** | Profils de joueurs, classements et statistiques de jeu avec des lectures et des écritures à faible latence |
| **Vente au détail et e-commerce** | Catalogues de produits aux attributs variés, paniers d'achat, pipelines de commandes |
| **Applications web et mobiles** | Personnalisation, fonctions sociales, utilisateurs répartis dans le monde entier |

| Exigence | Meilleure réponse |
| --- | --- |
| Jointures complexes entre de nombreuses tables, schéma relationnel fixe | Azure SQL Database |
| Charges de travail analytiques à grande échelle | Microsoft Fabric |
| Stockage clé-valeur simple dans un compte de stockage, sans distribution mondiale | Stockage Table Azure |
| Fichiers, images, vidéos | Stockage Blob Azure |

> **Piège d'examen.** Azure Cosmos DB est un service NoSQL, même si son API native s'interroge avec un langage proche de SQL. Une exigence de base de données relationnelle désigne la famille Azure SQL.

<!-- section: cosmos-db-apis | objectives: 3.2.2 -->
## API Azure Cosmos DB

Azure Cosmos DB expose plusieurs API compatibles avec le protocole filaire de bases de données connues : les outils, les pilotes et les compétences existants continuent de servir. **Vous choisissez l'API à la création du compte** ; elle décide du modèle de données et du langage de requête.

| API | Modèle de données | Langage de requête | À choisir quand |
| --- | --- | --- | --- |
| **Azure Cosmos DB for NoSQL** | Documents JSON | Syntaxe proche de SQL | Nouvelles applications ; l'API native (anciennement API SQL) |
| **Azure Cosmos DB for MongoDB** | Documents au format BSON (JSON binaire) | Langage de requête MongoDB (MQL) | L'équipe utilise les pilotes et les compétences MongoDB |
| **Azure Cosmos DB for Table** | Paires clé-valeur : lignes retrouvées par `PartitionKey` et `RowKey` | Même modèle de programmation que le Stockage Table Azure | Une application du Stockage Table Azure a besoin de distribution mondiale, de plus de performances ou d'indexation automatique |
| **Azure Cosmos DB for Apache Cassandra** | Famille de colonnes : les lignes d'une table peuvent contenir des colonnes différentes | Langage de requête Cassandra (CQL), proche de SQL | Migration d'une charge de travail Apache Cassandra vers un service managé |
| **Azure Cosmos DB for Apache Gremlin** | Graphe : des sommets (nœuds) reliés par des arêtes (relations) | Gremlin | Les relations comptent autant que les données : réseaux sociaux, recommandations, détection des fraudes, organigrammes |

> **Conseil d'examen.** Lisez le modèle de données dans l'énoncé. Documents : NoSQL ou MongoDB. Clé-valeur : Table. Famille de colonnes : Apache Cassandra. Graphe, ou les mots sommets et arêtes : Apache Gremlin.

> **Piège d'examen.** « Table » existe deux fois. Le Stockage Table Azure est un service d'un compte de stockage ; Azure Cosmos DB for Table offre le même modèle avec la distribution mondiale et un index sur toutes les propriétés.

Pour migrer une application MongoDB existante, ou pour utiliser toutes les fonctionnalités du langage de requête MongoDB, Microsoft recommande **Azure DocumentDB**, un service distinct compatible avec le protocole filaire MongoDB.

Azure Cosmos DB for PostgreSQL est une offre relationnelle distincte, en voie de mise hors service ; ce n'est pas l'une des cinq API NoSQL.

<!-- section: key-points -->
## Points clés

- Azure Cosmos DB : entièrement managé (PaaS), NoSQL, indépendant du schéma, toutes les propriétés indexées automatiquement.
- Compte, base de données, conteneur, élément ; la clé de partition répartit les éléments entre des partitions logiques.
- Distribution mondiale avec écritures multirégions, lectures et écritures en moins de 10 ms au 99e centile, SLA de disponibilité de 99,999 % avec les écritures multirégions.
- Cinq niveaux de cohérence, de fort à éventuel ; Session est le plus utilisé.
- Débit en RU/s : provisionné, mise à l'échelle automatique ou sans serveur.
- Cas d'usage : IoT, jeux, vente au détail, web et mobile. Pas pour les jointures complexes (Azure SQL Database) ni l'analytique à grande échelle (Microsoft Fabric).
- API : NoSQL (documents JSON, proche de SQL), MongoDB (BSON, MQL), Table (clé-valeur), Apache Cassandra (famille de colonnes, CQL), Apache Gremlin (graphe).
