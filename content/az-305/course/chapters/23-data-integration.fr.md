L'intégration de données déplace les données des sources opérationnelles vers un endroit où elles peuvent être analysées ; l'analyse de données les transforme en réponses. À l'AZ-305, vous n'écrivez jamais de pipeline : vous choisissez l'orchestrateur, le runtime qui atteint la source, le magasin qui conserve les données et le moteur qui les interroge, d'après les contraintes de latence, de compétences et de coût du scénario.

<!-- section: integration-pipelines | objectives: 2.3.1 -->
## Concevoir l'intégration de données avec Azure Data Factory

**Azure Data Factory** est le service managé des projets hybrides d'extraction-transformation-chargement (ETL) et d'extraction-chargement-transformation (ELT) : il orchestre le déplacement et la transformation des données entre des magasins, selon une planification ou sur événement, sans serveur à gérer.

| Concept | Rôle |
| --- | --- |
| Pipeline | Regroupement logique d'activités qui réalise une unité de travail |
| Activité | Une étape : déplacement de données (copie), transformation de données ou flux de contrôle |
| Service lié | Informations de connexion à un magasin de données ou à un service de calcul, comme une chaîne de connexion |
| Jeu de données | Structure des données qu'une activité lit ou écrit |
| Flux de données de mappage | Logique de transformation conçue visuellement et exécutée sur des clusters Spark que le service démarre et arrête pour vous |
| Déclencheur | Décide du moment où une exécution de pipeline démarre (planification, fenêtre bascule, événement) |
| Runtime d'intégration | Calcul qui exécute les activités, au plus près des données |

Le **runtime d'intégration** est le sujet habituel de la question, car il détermine les réseaux que la fabrique peut atteindre :

| Runtime d'intégration | Exécute | À recommander quand |
| --- | --- | --- |
| Azure | Flux de données, déplacement de données, répartition des activités | Les sources et les récepteurs ont des points de terminaison publics ; avec un réseau virtuel managé, il atteint les magasins de données par des points de terminaison privés |
| Auto-hébergé | Déplacement de données, répartition des activités | Le magasin de données est local ou dans un réseau privé sans visibilité directe depuis le cloud. Installé sur une machine derrière le pare-feu, il n'établit que des connexions sortantes |
| Azure-SSIS | Exécution de packages SSIS | Des packages SQL Server Integration Services existants sont migrés tels quels (lift-and-shift), sans réécriture |

| Exigence | Recommandation |
| --- | --- |
| Copier des tables chaque nuit d'un SQL Server local vers Azure, sans port entrant dans le pare-feu | Data Factory avec un runtime d'intégration auto-hébergé |
| Réutiliser 200 packages SSIS existants avec un minimum de retouches | Runtime d'intégration Azure-SSIS |
| Les analystes construisent des transformations sans écrire de code Spark | Flux de données de mappage |
| Transformations déjà écrites sous forme de notebooks | Pipeline qui appelle des activités de notebook Azure Databricks |
| La fabrique doit atteindre des comptes de stockage et des bases de données sans accès public | Runtime d'intégration Azure dans un réseau virtuel managé avec des points de terminaison privés managés |

**ETL ou ELT.** En ETL, les données sont transformées avant d'être chargées dans la cible, dans un moteur dédié. En ELT, les données brutes sont d'abord chargées dans un lac de données ou un entrepôt, puis transformées sur place avec le moteur scalable de la cible. L'ELT est la recommandation habituelle pour les gros volumes : les données brutes restent disponibles pour d'autres usages, et le chargement n'est pas ralenti par les transformations.

> **Piège d'examen.** Un VPN site à site ou ExpressRoute n'est pas nécessaire pour copier des données locales avec Data Factory : le runtime d'intégration auto-hébergé n'établit que des connexions sortantes. À l'inverse, le runtime d'intégration Azure seul ne peut pas atteindre un serveur situé dans le réseau local.

Azure Synapse Analytics comprend des pipelines fondés sur le même moteur d'intégration que Data Factory, pour orchestrer sans quitter l'espace de travail ; ils prennent en charge les runtimes d'intégration Azure et auto-hébergé, pas Azure-SSIS. Microsoft présente désormais Data Factory dans Microsoft Fabric comme la nouvelle génération d'Azure Data Factory : Learn conseille à ceux qui débutent en intégration de données de commencer par lui, et les charges de travail Azure Data Factory existantes peuvent y être mises à niveau.

<!-- section: data-lake-processing | objectives: 2.3.1 -->
## Le lac de données et les moteurs de traitement

**Azure Data Lake Storage** est la zone d'arrivée de la plupart des conceptions d'intégration : un compte de stockage doté de l'espace de noms hiérarchique, qui conserve tout type de données au tarif du Stockage Blob, avec des répertoires, des ACL POSIX et des niveaux d'accès. Les moteurs d'analytique le lisent sur place par le pilote ABFS : les données n'ont donc pas à être copiées avant d'être analysées. Une organisation courante sépare les données brutes, nettoyées et organisées dans des conteneurs ou des répertoires distincts, chacun avec ses autorisations et ses règles de cycle de vie.

**Azure Databricks** est la plateforme d'analytique fondée sur Apache Spark pour l'ingénierie des données, le machine learning et le streaming :

- ETL écrit en SQL, Python ou Scala, avec des travaux planifiés.
- Le **lakehouse** : des tables Delta Lake stockées dans le lac de données allient le faible coût d'un lac aux transactions et aux performances de requête d'un entrepôt.
- Structured Streaming pour les données incrémentielles et en flux, entrepôts SQL pour les analystes, MLflow pour le machine learning.
- Unity Catalog pour une gouvernance unifiée des données et des autorisations.

| Exigence | Recommandation |
| --- | --- |
| Stocker à bas coût des fichiers bruts de tout format, avec des ACL au niveau des répertoires | Azure Data Lake Storage |
| Ingénieurs de données et scientifiques des données travaillent dans des notebooks sur la même plateforme Spark | Azure Databricks |
| Orchestrer l'ingestion, puis appeler les transformations Spark, selon une planification | Pipeline Data Factory avec des activités Databricks |
| Spark, entrepôt SQL et pipelines dans un seul espace de travail géré avec les outils Azure | Azure Synapse Analytics |

> **Conseil d'examen.** Data Factory orchestre et copie ; ce n'est pas là que l'on code les transformations lourdes. Quand un scénario mentionne des « scientifiques des données », des « notebooks », du « machine learning » ou « Delta Lake », le moteur de traitement est Azure Databricks, et Data Factory, s'il est présent, ne fait que le planifier.

<!-- section: analytics-platforms | objectives: 2.3.2 -->
## Choisir une solution d'analyse de données

**Azure Synapse Analytics** réunit plusieurs moteurs dans un même espace de travail :

| Moteur | Ce que c'est | Facturation et usage |
| --- | --- | --- |
| Pool SQL dédié | Entrepôt de données qui répartit les requêtes sur des nœuds de calcul, avec des données chargées dans des tables distribuées par hachage, par tourniquet (round-robin) ou répliquées | Calcul réservé, dimensionné en Data Warehouse Units ; peut être mis en pause pour que seul le stockage soit facturé. Pour des performances prévisibles sur un entrepôt modélisé |
| Pool SQL serverless | Point de terminaison T-SQL, présent dans chaque espace de travail, qui interroge sur place les fichiers du lac de données (Parquet, Delta Lake, texte délimité) | Facturé selon les données traitées par chaque requête, rien à provisionner. Pour l'exploration, un entrepôt de données logique au-dessus du lac, les charges de travail non planifiées ou en rafales |
| Pool Apache Spark | Spark managé pour la préparation des données, l'ingénierie des données et le machine learning | Aucun cluster à gérer vous-même |
| Pool Data Explorer (mis hors service) | Ancien moteur en préversion pour les journaux et les séries chronologiques, mis hors service le 7 octobre 2025 : ses charges de travail ont été supprimées | Ne le recommandez pas ; Learn oriente ses charges de travail vers Eventhouse dans Microsoft Fabric |

> **Piège d'examen.** Un pool SQL serverless n'a pas de stockage propre et ne prend en charge ni les tables ni les instructions de modification de données : il lit les fichiers là où ils se trouvent. « Réduire le coût de requêtes occasionnelles sur des fichiers Parquet » le désigne ; « des performances constantes pour des centaines de rapports simultanés sur un schéma en étoile » désigne un pool SQL dédié.

**Azure Data Explorer** est la plateforme d'analyse interactive de gros volumes de journaux, de télémétrie et de séries chronologiques en quasi-temps réel : il ingère des millions d'événements par seconde, et les requêtes écrites en langage de requête Kusto (KQL) répondent en quelques secondes. Recommandez-le pour la télémétrie IoT, les journaux d'applications et l'analytique exploratoire sur des données brutes qui arrivent vite, plutôt que sur un modèle organisé.

**Microsoft Fabric** est une plateforme d'analytique en mode software as a service qui couvre l'ingestion, la transformation, le traitement en temps réel, l'entrepôt de données et les rapports. Toutes les charges de travail (Data Factory, Data Engineering, Data Warehouse, Data Science, Real-Time Intelligence, Databases, Power BI) partagent **OneLake**, un lac de données logique unique construit sur Azure Data Lake Storage. Deux fonctionnalités évitent les pipelines de copie : les **raccourcis** donnent un accès sans copie à des données qui restent dans Azure Data Lake Storage, Amazon S3 ou Google Cloud Storage, et la **mise en miroir** réplique en continu dans OneLake des sources comme Azure SQL Database, Azure Cosmos DB, Azure Databricks ou Snowflake.

| Exigence | Recommandation |
| --- | --- |
| Entrepôt de données d'entreprise, T-SQL, performances réservées et prévisibles | Pool SQL dédié Synapse |
| Requêtes T-SQL ad hoc sur des fichiers du lac de données, paiement à la requête | Pool SQL serverless Synapse |
| Ingénierie des données et machine learning fondés sur Spark, sur un lakehouse | Azure Databricks |
| Analyse interactive de journaux, de télémétrie et de séries chronologiques en KQL | Azure Data Explorer |
| Une seule plateforme managée de l'ingestion aux rapports Power BI, le moins d'infrastructure possible à exploiter | Microsoft Fabric |
| Analyser en quasi-temps réel les données opérationnelles d'Azure Cosmos DB, sans ETL et sans consommer le débit transactionnel | Magasin analytique avec Azure Synapse Link dans les conceptions existantes ; mise en miroir d'Azure Cosmos DB dans Microsoft Fabric pour les nouveaux projets |

Azure Synapse Link pour Azure Cosmos DB maintient un magasin analytique orienté colonnes synchronisé avec le magasin transactionnel et isolé de lui. Microsoft ne le prend plus en charge pour les nouveaux projets et les oriente vers la mise en miroir dans Fabric, mais le raisonnement testé à l'examen ne change pas : les requêtes analytiques ne doivent pas s'exécuter sur le magasin opérationnel.

<!-- section: data-paths | objectives: 2.3.2 -->
## Chemins de données chaud, tiède et froid

Une conception analytique sert généralement plusieurs latences à la fois. Identifiez le chemin que décrit l'exigence :

| Chemin | Latence | Conception type |
| --- | --- | --- |
| Chaud | Quelques secondes ou moins | Alertes et tableaux de bord en temps réel, calculés sur le flux à l'arrivée des événements |
| Tiède | Quasi-temps réel | Traitement de flux avec agrégations fenêtrées et jointures ; données récentes conservées dans Azure SQL Database ou Azure Cosmos DB |
| Froid | Traitement par lots | Couche de traitement par lots : stockage à long terme dans Stockage Blob ou Azure Data Lake Storage, transformation avec Data Factory et Spark, vues précalculées |

**Azure Stream Analytics** est le moteur de traitement de flux entièrement managé, programmé dans un langage SQL enrichi de sémantiques temporelles.

- Entrées de streaming : Azure Event Hubs et Azure IoT Hub ; Stockage Blob ou Azure Data Lake Storage pour les données historiques. Des données de référence issues de Stockage Blob ou d'Azure SQL Database peuvent être jointes au flux pour des recherches.
- Sorties : Stockage Blob et Azure Data Lake Storage, Azure SQL Database, Azure Cosmos DB, Azure Synapse Analytics, Azure Data Explorer, Azure Database for PostgreSQL, Stockage Table, Event Hubs, files d'attente et rubriques Service Bus, Azure Functions, Power BI pour des tableaux de bord en direct.
- Fenêtres bascules (tumbling), récurrentes (hopping) et glissantes (sliding) pour les agrégations dans le temps.
- La capacité s'exprime en unités de streaming, sans cluster à provisionner ; le service garantit une disponibilité de 99,9 %.
- Les mêmes requêtes peuvent s'exécuter sur Azure IoT Edge pour traiter les données au plus près des appareils.

| Exigence | Recommandation |
| --- | --- |
| Agréger la télémétrie d'appareils sur des fenêtres de 5 minutes avec des compétences SQL, alimenter Power BI | Azure Stream Analytics |
| Transformations de streaming complexes, machine learning sur le flux, Delta Lake | Spark Structured Streaming sur Azure Databricks |
| Exécuter du code personnalisé pour chaque événement, sans état entre les événements | Azure Functions |
| Routage et transformation de flux avec peu de code dans Microsoft Fabric | Flux d'événements (eventstreams) Fabric |
| Filtrer et agréger sur l'appareil, avec une connectivité intermittente | Stream Analytics sur Azure IoT Edge |

> **Piège d'examen.** Event Hubs et IoT Hub ingèrent les événements ; ils ne les analysent pas. Une exigence de détection d'une condition sur une fenêtre de temps demande un moteur de traitement derrière le service d'ingestion, en général Stream Analytics.

<!-- section: key-points -->
## Points clés

- Data Factory orchestre et copie ; le runtime d'intégration détermine la portée réseau : Azure pour les points de terminaison publics ou privés managés, auto-hébergé pour les réseaux locaux et privés (connexions sortantes uniquement), Azure-SSIS pour les packages SSIS existants.
- L'ELT vers Azure Data Lake Storage est le choix par défaut pour les gros volumes ; Azure Databricks est le moteur Spark de l'ingénierie des données, du machine learning et du lakehouse.
- Pool SQL dédié pour un entrepôt provisionné (peut être mis en pause) ; pool SQL serverless pour interroger les fichiers du lac et payer selon les données traitées.
- Azure Data Explorer pour les journaux, la télémétrie et les séries chronologiques en KQL ; Microsoft Fabric pour une plateforme software as a service intégrée sur OneLake.
- Chemin chaud en quelques secondes ou moins, chemin tiède en quasi-temps réel, chemin froid par lots ; Stream Analytics pour du SQL sur les flux d'Event Hubs ou d'IoT Hub.
- Ne jamais exécuter l'analytique sur le magasin opérationnel : utilisez un réplica, un magasin analytique, la mise en miroir ou un pipeline.
