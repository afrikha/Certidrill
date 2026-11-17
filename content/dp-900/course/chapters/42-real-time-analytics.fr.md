Certaines données doivent être analysées dès leur arrivée : relevés de capteurs, clics, paiements, journaux. L'examen vous demande de distinguer le traitement par lots du traitement de flux et de choisir le service Microsoft qui ingère, traite ou affiche des données de streaming.

<!-- section: batch-vs-stream | objectives: 4.2.1 -->
## Traitement par lots et traitement de flux

- **Traitement par lots** : les enregistrements sont collectés et stockés, puis traités ensemble en une seule opération. Le lot démarre selon une planification (toutes les heures, chaque nuit), quand une certaine quantité de données est arrivée, ou sur un autre événement.
- **Traitement de flux** : chaque nouvelle donnée est traitée à son arrivée, en temps réel, sans attendre un lot.

| | Lots | Flux |
| --- | --- | --- |
| **Étendue des données** | Toutes les données du jeu de données | Les données les plus récentes, ou une fenêtre temporelle glissante (les 30 dernières secondes) |
| **Taille des données** | Gros jeux de données, traités efficacement | Enregistrements individuels ou micro-lots de quelques enregistrements |
| **Latence** | Généralement quelques heures | Secondes ou millisecondes |
| **Analyse** | Analytique complexe | Réponses simples, agrégats, moyennes mobiles |
| **Exemple** | Relevé mensuel de carte de crédit, chargement nocturne d'un entrepôt de données | Cours de bourse, détection des fraudes, capteurs de fumée et de chaleur qui déclenchent une alarme |

La latence est le délai entre l'arrivée des données et la disponibilité du résultat. Le traitement par lots traite de gros volumes à un moment opportun, par exemple la nuit, mais toutes les données d'entrée doivent être prêtes avant le démarrage du travail et une seule erreur peut arrêter tout le lot.

La plupart des solutions à grande échelle **combinent les deux** : le traitement de flux alimente des tableaux de bord en temps réel et écrit aussi ses résultats dans un magasin de données, où ils rejoignent les données traitées par lots pour l'analyse historique. Une technologie de streaming peut aussi simplement capturer les données pour un traitement par lots ultérieur.

> **Piège d'examen.** Des données qui arrivent en continu ne sont pas forcément traitées en flux. Si les ventes du jour sont chargées et analysées chaque nuit, c'est un traitement par lots : ce qui décide, c'est le moment où les données sont traitées, à l'arrivée ou regroupées, plus tard.

<!-- section: stream-architecture | objectives: 4.2.1, 4.2.2 -->
## Éléments d'une solution de traitement de flux

1. Un **événement** génère des données : le signal d'un capteur, une publication sur un réseau social, une entrée de journal.
2. Les données sont capturées dans une **source de streaming**. Dans les solutions robustes, c'est une file d'attente, qui conserve l'ordre des événements.
3. Une **requête perpétuelle** s'exécute sur les événements entrants : elle sélectionne, projette et agrège des valeurs sur des périodes appelées **fenêtres** (le nombre de relevés par minute).
4. Les résultats sont écrits dans une sortie, appelée **récepteur** (sink) : un fichier, une table de base de données, un tableau de bord en temps réel ou une autre file d'attente.

| Étape | Services |
| --- | --- |
| **Sources** | **Azure Event Hubs** : ingestion de gros volumes d'événements. **Azure IoT Hub** : similaire, optimisé pour les appareils de l'Internet des objets (IoT). **Apache Kafka** : solution d'ingestion open source, souvent utilisée avec Spark. **Azure Data Lake Storage Gen2** : en général pour les lots, utilisable aussi comme source de streaming |
| **Récepteurs** | Azure Event Hubs, pour mettre les résultats en file d'attente en vue d'un autre traitement. Azure Data Lake Storage Gen2, OneLake ou le Stockage Blob Azure, pour les conserver sous forme de fichiers. Azure SQL Database, Azure Databricks ou Microsoft Fabric, pour les conserver dans des tables. **Power BI**, pour les afficher en temps réel |

<!-- section: real-time-services | objectives: 4.2.2 -->
## Services Microsoft pour l'analytique en temps réel

**Real-Time Intelligence** est la charge de travail de Microsoft Fabric pour les données en mouvement, de l'arrivée des événements jusqu'aux tableaux de bord et aux actions automatisées.

| Composant de Real-Time Intelligence | Rôle |
| --- | --- |
| **Real-Time hub** (hub en temps réel) | Catalogue central où l'organisation découvre et partage ses flux de données |
| **Eventstream** | Ingérer, transformer et router des événements de streaming vers des destinations, sans code |
| **Eventhouse** | Stocker des données d'événements et de séries chronologiques dans des bases de données KQL, interrogées en Kusto Query Language (KQL) |
| **KQL queryset** | Écrire et exécuter des requêtes sur les données d'un eventhouse |
| **Real-Time Dashboard** (tableau de bord en temps réel) | Visualiser les données en direct |
| **Activator** | Déclencher automatiquement une action, comme une alerte, quand les données remplissent une condition |

Deux autres technologies figurent dans le périmètre de l'examen :

| Technologie | Ce que c'est | À choisir quand |
| --- | --- | --- |
| **Spark Structured Streaming** | Bibliothèque d'Apache Spark qui lit un flux dans un dataframe qui grandit sans cesse, l'interroge et écrit les résultats dans un récepteur. Disponible dans **Azure Databricks** et Microsoft Fabric | Vous traitez déjà des données avec Spark et du code ; une table Delta Lake peut recevoir le flux et servir en même temps des requêtes par lots |
| **Azure Stream Analytics** | Plateforme en tant que service (PaaS) dans laquelle un travail de streaming lit une source, applique une requête perpétuelle et écrit dans une sortie | Une solution de streaming autonome ou hybride en dehors de Fabric |

| Exigence | Réponse |
| --- | --- |
| Recevoir de gros volumes d'événements provenant d'applications | Azure Event Hubs |
| Recevoir la télémétrie d'appareils IoT | Azure IoT Hub |
| Router des événements de streaming sans code dans Microsoft Fabric | Eventstream |
| Interroger des journaux et des séries chronologiques en KQL | Eventhouse |
| Envoyer une alerte quand une valeur franchit un seuil | Activator |
| Traiter un flux avec du code Spark | Spark Structured Streaming dans Azure Databricks ou Microsoft Fabric |

> **Conseil d'examen.** Séparez l'ingestion du traitement. Event Hubs, IoT Hub et Kafka reçoivent les événements ; ils ne les analysent pas. Eventhouse, Spark Structured Streaming et Azure Stream Analytics le font.

<!-- section: key-points -->
## Points clés

- Lots : données collectées, puis traitées ensemble, latence de plusieurs heures, analyse complexe sur toutes les données.
- Flux : données traitées à l'arrivée, latence de quelques secondes ou millisecondes, agrégats sur des fenêtres de temps.
- Architecture : événement, source de streaming, requête perpétuelle, récepteur.
- Sources : Azure Event Hubs, Azure IoT Hub (appareils IoT), Apache Kafka.
- Microsoft Fabric Real-Time Intelligence : Real-Time hub, Eventstream, Eventhouse (KQL), Real-Time Dashboard, Activator.
- Spark Structured Streaming : streaming avec Spark dans Azure Databricks ou Microsoft Fabric. Azure Stream Analytics : travaux de streaming PaaS en dehors de Fabric.
