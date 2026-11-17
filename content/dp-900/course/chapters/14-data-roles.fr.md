Trois rôles se partagent l'essentiel du travail sur les données : l'administrateur de base de données, l'ingénieur de données et l'analyste de données. L'examen décrit une tâche, ou en énumère quelques-unes, et demande quel rôle en est responsable. Les organisations peuvent nommer ces rôles autrement, et une même personne peut en tenir plusieurs.

<!-- section: database-administrator | objectives: 1.4.1 -->
## Les administrateurs de base de données

Un **administrateur de base de données** gère les bases de données : la conception, l'implémentation, la maintenance et l'exploitation des systèmes de base de données, locaux et dans le cloud.

- Maintient les bases de données **disponibles**, avec des **performances** constantes, et les optimise.
- Définit et met en œuvre les stratégies, les outils et les processus de **sauvegarde et de récupération**, pour que les données puissent être restaurées après un sinistre ou une erreur humaine.
- Gère la **sécurité des données** dans la base de données : accorde des privilèges sur les données, accorde ou refuse l'accès aux utilisateurs.
- Sur Azure, provisionne et gère des services de base de données comme Azure SQL, Azure Database pour MySQL et Azure Database pour PostgreSQL.

Les instructions SQL `GRANT`, `DENY` et `REVOKE`, qui contrôlent les autorisations, font partie du quotidien de l'administrateur.

> **Piège d'examen.** L'administrateur restaure une base de données après une panne et décide qui peut lire une table. Il ne construit pas les pipelines qui chargent un entrepôt de données (ingénieur de données) et ne conçoit pas les rapports (analyste de données).

<!-- section: data-engineer | objectives: 1.4.2 -->
## Les ingénieurs de données

Un **ingénieur de données** gère l'infrastructure et les processus qui **intègrent les données** dans toute l'organisation.

- Conçoit et implémente les charges de travail de données avec les parties prenantes : **pipelines d'ingestion**, **nettoyage et transformation** des données, et **magasins de données pour les charges de travail analytiques**.
- Travaille avec de nombreuses technologies : bases de données relationnelles et non relationnelles, magasins de fichiers et flux de données.
- Identifie les règles de **gouvernance des données** et veille à ce que la **confidentialité des données** soit préservée dans le cloud et entre les magasins de données locaux et cloud.
- Est responsable de la gestion et de la surveillance des **pipelines de données**, pour que les chargements de données se déroulent comme prévu.

Services types de l'ingénieur de données : Azure Data Factory (définir et planifier des pipelines qui transfèrent et transforment les données), Microsoft Fabric, Azure Databricks, Azure Stream Analytics (traiter des flux de données en temps réel), le Stockage Azure (héberger des lacs de données) et Microsoft Purview (gouvernance et traçabilité des données).

<!-- section: data-analyst | objectives: 1.4.3 -->
## Les analystes de données

Un **analyste de données** aide l'organisation à tirer le maximum de valeur de ses ressources de données.

- **Explore et analyse** les données pour identifier des tendances et des relations.
- Conçoit et crée des **modèles analytiques**.
- Crée des **rapports et des visualisations** qui transforment les données brutes en informations répondant aux besoins métier, pour que les décisions soient éclairées.

L'outil principal de l'analyste de données est **Power BI** : se connecter aux sources de données, créer des rapports et des tableaux de bord interactifs, et les partager. Un analyste peut aussi interroger des données de journaux et de télémétrie dans Azure Data Explorer, ou interroger et visualiser des données dans les notebooks d'Azure Databricks.

> **Piège d'examen.** L'ingénieur de données et l'analyste de données « transforment » et « modélisent » tous deux des données. L'ingénieur le fait pour charger des données propres dans les magasins analytiques ; l'analyste le fait ensuite, pour créer les modèles et les rapports que lisent les utilisateurs professionnels.

<!-- section: matching-roles | objectives: 1.4.1, 1.4.2, 1.4.3 -->
## Associer une tâche à un rôle

| Tâche dans la question | Rôle |
| --- | --- |
| Sauvegarder une base de données et la restaurer après une panne | Administrateur de base de données |
| Accorder à un utilisateur l'autorisation de lire une table | Administrateur de base de données |
| Surveiller et ajuster les performances d'un serveur de base de données | Administrateur de base de données |
| Planifier la disponibilité d'une base de données pendant une maintenance | Administrateur de base de données |
| Créer un pipeline qui ingère des fichiers de ventes chaque nuit | Ingénieur de données |
| Nettoyer et transformer des données brutes avant leur chargement dans un entrepôt de données | Ingénieur de données |
| Surveiller les chargements de données et corriger un pipeline en échec | Ingénieur de données |
| Appliquer les règles de gouvernance et de confidentialité aux données qui circulent entre les systèmes | Ingénieur de données |
| Créer un rapport qui montre le chiffre d'affaires par région | Analyste de données |
| Explorer les données pour trouver des tendances et des relations | Analyste de données |
| Créer un modèle analytique pour des rapports en libre-service | Analyste de données |

Un même service Azure est vu différemment par chaque rôle. Pour Azure SQL :

| Rôle | Ce que le rôle fait du service |
| --- | --- |
| Administrateur de base de données | Provisionne et gère les bases de données |
| Ingénieur de données | Les utilise comme source des pipelines qui ingèrent les données transactionnelles dans les systèmes analytiques |
| Analyste de données | Les interroge pour des rapports, le plus souvent après que les données ont été combinées à d'autres sources dans un magasin de données analytique |

Microsoft Learn nomme d'autres rôles, qui ne sont pas des objectifs de cet examen : l'**ingénieur IA**, qui crée des fonctionnalités d'IA avec des outils comme Microsoft Foundry, le scientifique des données, l'architecte des données et le développeur d'applications. L'arrivée des assistants d'IA ne change pas la répartition : les outils d'IA aident à rédiger des requêtes, à générer du code de transformation ou à suggérer des visualisations, mais chaque rôle garde ses responsabilités.

> **Conseil d'examen.** Cherchez le verbe. Sauvegarder, restaurer, sécuriser, accorder : administrateur. Ingérer, pipeline, nettoyer, charger : ingénieur. Explorer, visualiser, rapport : analyste.

<!-- section: key-points -->
## Points clés

- Administrateur de base de données : disponibilité, performances, sauvegarde et récupération, sécurité et accès aux bases de données.
- Ingénieur de données : intégration des données, pipelines d'ingestion, nettoyage et transformation, magasins de données analytiques, gouvernance et confidentialité, surveillance des pipelines.
- Analyste de données : exploration des données, modèles analytiques, rapports et visualisations pour les décisions.
- Power BI est l'outil de l'analyste ; Azure Data Factory crée les pipelines de l'ingénieur ; l'administrateur provisionne et gère les services de base de données.
- Une même personne peut tenir plusieurs rôles ; la question porte sur la tâche, pas sur l'intitulé du poste.
