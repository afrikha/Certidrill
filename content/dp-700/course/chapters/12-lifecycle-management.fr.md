La gestion du cycle de vie dans Fabric repose sur trois outils que les questions d'examen mettent côte à côte. L'**intégration Git** gère les versions des définitions des éléments d'un espace de travail dans un dépôt. Les **projets de base de données** décrivent un entrepôt ou une base de données SQL sous forme de fichiers T-SQL que l'on génère en .dacpac puis que l'on publie. Les **pipelines de déploiement** font passer des éléments d'un espace de travail de développement vers le test et la production. Les questions demandent quel outil répond à une exigence, qui peut l'utiliser et ce qu'il copie, surtout ce que deviennent les données, les raccourcis et les connexions.

<!-- section: git-integration | objectives: 1.2.1 -->
## La gestion de version avec l'intégration Git

L'intégration Git connecte **un espace de travail** à **une branche** et à un dossier d'un dépôt **Azure DevOps, GitHub ou GitHub Enterprise** (fournisseurs cloud uniquement). Tous les éléments pris en charge de l'espace de travail sont versionnés ensemble, et les dossiers de l'espace de travail sont conservés comme dossiers Git (jusqu'à 10 niveaux). Les éléments non pris en charge restent dans l'espace de travail : ils sont ignorés, pas supprimés.

Parmi les éléments d'ingénierie des données pris en charge par Git figurent les lakehouses, les notebooks, les définitions de travail Spark, les environnements, les pipelines, Dataflow Gen2, les travaux de copie, les bases de données mises en miroir, les entrepôts, les bases de données SQL, les eventhouses, les bases de données KQL, les flux d'événements et les bibliothèques de variables. Ce que Git stocke dépend de l'élément :

| Élément | Stocké dans Git | Non stocké |
| --- | --- | --- |
| Lakehouse | Métadonnées (nom, description, métadonnées du point de terminaison d'analytique SQL) et définitions des **raccourcis** OneLake (`shortcuts.metadata.json`) | Tables et fichiers : les données sont préservées par toutes les opérations Git |
| Notebook, pipeline, définition de travail Spark, environnement | La définition de l'élément (code, activités, paramètres) | L'historique des exécutions |
| Entrepôt | Un **projet de base de données** : un fichier T-SQL par objet | Les données des tables |
| Base de données SQL | Un dossier de projet SQL (`<name>.SQLDatabase`) avec un fichier `.sql` par objet | Les données, le classement (collation) et le niveau de compatibilité |

Les autorisations combinent le rôle d'espace de travail et les autorisations Git :

| Action | Rôle d'espace de travail | Autorisation Git |
| --- | --- | --- |
| Connecter, synchroniser ou déconnecter l'espace de travail | Admin | Read |
| Commit | Contributor ou plus, avec écriture sur tous les éléments | Read et Contribute ; la stratégie de branche doit autoriser les commits directs |
| Mettre à jour depuis Git (Update) | Contributor ou plus, avec écriture sur tous les éléments | Read |
| Changer ou créer une branche depuis Fabric | Admin, ou Member et Contributor si l'Admin active **Allow users with at least Contributor role to change Git branch** | Read (et Create branch pour en créer une) |
| Créer une branche vers un autre espace de travail (Branch out) | Contributor ou plus | Read et Create branch |
| Toute action Git | Viewer : aucune | |

Fonctionnement de la synchronisation :

- À la première connexion, si les deux côtés ont du contenu, vous choisissez le sens : le commit écrase la branche, la mise à jour écrase l'espace de travail (et vous perdez le contenu de l'espace de travail, d'où une demande de confirmation).
- **Update** récupère toujours **toute la branche** jusqu'au dernier commit ; impossible de choisir des éléments. Le commit et l'annulation (undo) peuvent sélectionner des éléments.
- Si Git a des commits plus récents, les commits sont désactivés jusqu'à la mise à jour. Si le même élément a changé des deux côtés, il est en **Conflict** et la mise à jour est désactivée jusqu'à la résolution.
- **Branch out** crée un nouvel espace de travail connecté à une nouvelle branche : chaque développeur travaille isolé et fusionne par une **pull request** chez le fournisseur Git ; l'espace de travail connecté récupère ensuite la fusion avec **Update**.
- Limites : 1 000 éléments par espace de travail, 25 Mo par fichier, 250 caractères par chemin de fichier, 244 par nom de branche. Mon espace de travail n'est pas pris en charge.

| État d'un élément | Signification |
| --- | --- |
| Synced | Identique dans l'espace de travail et la branche |
| Uncommitted changes | Modifié dans l'espace de travail : faites un commit |
| Update required | Modifié dans Git : mettez à jour l'espace de travail |
| Conflict | Modifié des deux côtés |
| Unsupported item | Ne peut pas être versionné |

> **Piège d'examen.** L'intégration Git ne déplace jamais les données d'un lakehouse. Un nouvel espace de travail synchronisé depuis Git obtient un lakehouse **vide** avec ses définitions de raccourcis ; les raccourcis OneLake dont la cible n'existe pas dans cet espace de travail restent invalides tant que la cible n'est pas créée.

<!-- section: database-projects | objectives: 1.2.2 -->
## Les projets de base de données

Un **projet de base de données** (projet SQL) décrit le schéma d'une base de manière déclarative : un script `CREATE` par table, vue, fonction ou procédure, plus un fichier `.sqlproj`. La génération (build) du projet valide le T-SQL et produit un **.dacpac** ; la publication compare le .dacpac à la cible et génère les instructions `ALTER` nécessaires. Dans Fabric, les projets de base de données s'appliquent à l'**entrepôt** et à la **base de données SQL** (les projets d'entrepôt sont en préversion).

Développer un projet d'entrepôt dans Visual Studio Code demande le **SDK .NET**, les extensions **SQL Database Projects** et **SQL Server (mssql)**, et le rôle Contributor ou plus sur l'entrepôt.

| Étape | Comment |
| --- | --- |
| Créer | **Database Projects: New**, plateforme cible **Synapse Data Warehouse in Microsoft Fabric**, projet de style SDK (le seul type pris en charge) ; ou **Create Project From Database** pour extraire un entrepôt existant |
| Se connecter | Serveur = la **chaîne de connexion SQL** de l'entrepôt (`*.datawarehouse.fabric.microsoft.com`), authentification Microsoft Entra ID - Universal with MFA support |
| Modifier | Modifiez les fichiers `.sql` de chaque dossier de schéma ; les changements restent locaux |
| Générer | **Build** : produit `bin/debug/<project>.dacpac` ; les erreurs de build détectent les références cassées avant tout déploiement |
| Publier | **Publish to an existing SQL server**, puis **Generate Script** (relire le T-SQL) ou **Publish** (l'appliquer) ; enregistrez un profil de publication (`.publish.xml`) par environnement |

Dans le fichier `.sqlproj`, définissez le SDK Microsoft.Build.Sql et référencez les objets système de l'entrepôt Fabric (les versions changent souvent ; sans `DatabaseVariableLiteralValue`, la publication de code qui utilise des vues `sys` peut échouer) :

```text
<Sdk Name="Microsoft.Build.Sql" Version="2.3.0" />
<ItemGroup>
  <PackageReference Include="Microsoft.SqlServer.Dacpacs.FabricDw" Version="170.0.4">
    <DatabaseVariableLiteralValue>master</DatabaseVariableLiteralValue>
    <SuppressMissingDependenciesErrors>False</SuppressMissingDependenciesErrors>
  </PackageReference>
</ItemGroup>
```

Propriétés de déploiement du profil de publication :

| Propriété | Effet | Recommandation |
| --- | --- | --- |
| `BlockOnPossibleDataLoss` | Arrête le déploiement si un changement peut perdre des données (suppression d'une colonne, type réduit) | `True` en production |
| `DropObjectsNotInSource` | Supprime les objets de la cible absents du projet | Développement et test uniquement |
| Script de prédéploiement | S'exécute avant les changements de schéma | Scripts idempotents |
| Script de post-déploiement | S'exécute après les changements de schéma, par exemple pour charger des données de référence avec `MERGE` | Évitez les opérations lourdes sur de grandes tables de production |

En CI/CD (Azure DevOps ou GitHub), le même build et la même publication s'exécutent en ligne de commande avec DacFx :

```bash
dotnet build DW_Sales.sqlproj
sqlpackage /Action:Publish /SourceFile:bin/Debug/DW_Sales.dacpac \
  /TargetConnectionString:"$TARGET_CONNECTION" /p:BlockOnPossibleDataLoss=true
```

Pour une **base de données SQL** dans Fabric, l'intégration Git stocke la base comme un projet SQL, et **Update** depuis Git exécute un build du projet suivi d'une publication SqlPackage. Les scripts de prédéploiement et de post-déploiement sont conservés dans **Shared Queries** et s'exécutent aussi lors des déploiements par pipeline de déploiement.

| Exigence | Réponse |
| --- | --- |
| Détecter une vue qui référence une colonne supprimée avant tout déploiement | Générer (build) le projet de base de données |
| Relire le T-SQL qu'un déploiement exécutera en production | Generate Script |
| Bloquer une mise en production qui supprimerait une colonne contenant des données | `BlockOnPossibleDataLoss` = True |
| Insérer les mêmes lignes de référence après chaque déploiement | Script de post-déploiement |

> **Piège d'examen.** Un projet de base de données déploie le **schéma**, pas les données des tables. Les lignes n'arrivent dans la cible que par un script de post-déploiement ou par un processus de chargement.

<!-- section: deployment-pipelines | objectives: 1.2.3 -->
## Les pipelines de déploiement

Un pipeline de déploiement comporte **2 à 10 phases** (3 par défaut : Development, Test, Production), et chaque phase est **un espace de travail** sur une capacité Fabric. Le nombre et les noms des phases ne peuvent plus être modifiés après la création. Déployer copie les éléments sélectionnés vers la phase suivante et **écrase** les éléments appariés ; un élément garde son ID, son URL et ses autorisations dans la cible. Un déploiement contient au plus **300 éléments**.

| Copié | Non copié |
| --- | --- |
| Définitions et métadonnées des éléments, relations entre éléments | Les **données** : tables, fichiers, vues Spark |
| Sources de données et paramètres (modifiés ensuite par les règles) | Les autorisations et les paramètres de l'espace de travail |
| Les dossiers qui contiennent des éléments déployés | Attributions de rôles, planification d'actualisation, informations d'identification et approbation des modèles sémantiques |

Les éléments d'ingénierie des données dans un pipeline :

| Élément | Comportement au déploiement |
| --- | --- |
| Lakehouse | Un lakehouse **vide** du même nom est créé dans la cible ; ses raccourcis sont déployés. Les raccourcis vers des cibles **externes** (ADLS Gen2, S3) gardent la même cible ; les raccourcis **OneLake** sont remappés vers la phase cible, mais les tables et dossiers cibles doivent y exister |
| Notebook, définition de travail Spark | Les références à un lakehouse de la phase sont **remappées** vers le lakehouse de la phase cible ; une **règle de lakehouse par défaut** désigne un autre lakehouse |
| Entrepôt | Définition déployée, données non copiées |
| Tout élément qui dépend d'un autre | Lié à la copie de la même phase ; si la dépendance n'est pas dans la cible, le déploiement échoue : utilisez **Select related** |

Les **règles de déploiement** fixent des valeurs propres à une phase. Elles se créent dans une phase **cible** (jamais dans la première), par le **propriétaire** de l'élément, et s'appliquent au déploiement suivant.

| Règle | Éléments |
| --- | --- |
| Règle de lakehouse par défaut | Notebooks |
| Règle de source de données | Modèles sémantiques, dataflows Gen1, rapports paginés, bases de données mises en miroir |
| Règle de paramètre | Modèles sémantiques, dataflows Gen1 |

Pour les éléments sans règles, comme les connexions des pipelines et de Dataflow Gen2, ou un raccourci qui doit pointer vers S3 en développement et vers ADLS Gen2 en production, utilisez une **bibliothèque de variables** : un élément de l'espace de travail qui contient des variables avec un **jeu de valeurs** par phase ; le jeu de valeurs actif de chaque phase décide de la valeur à l'exécution. Les pipelines, les notebooks, les raccourcis de lakehouse, Dataflow Gen2, les travaux de copie et les flux d'événements peuvent consommer des variables.

| Action | Autorisations |
| --- | --- |
| Créer un pipeline | Licence Pro, PPU ou Premium ; vous devenez Admin du pipeline |
| Affecter un espace de travail à une phase | Admin du pipeline et Admin de l'espace de travail |
| Déployer vers la phase suivante | Admin du pipeline et Contributor sur les espaces de travail source et cible |
| Créer une règle de déploiement | Admin du pipeline, Contributor ou plus sur la cible, propriétaire de l'élément |
| Comparer des phases | Admin du pipeline et Contributor sur les deux espaces de travail |

> **Piège d'examen.** Déployer un lakehouse vers Test ne copie pas une seule ligne. Chargez les données dans chaque phase avec ses propres pipelines ou notebooks, après le déploiement.

Choisir l'outil :

| Exigence | Outil |
| --- | --- |
| Suivre chaque modification des notebooks et pipelines, revenir en arrière, fusionner un travail parallèle | Intégration Git |
| Chaque développeur travaille dans un espace de travail isolé | Branch out |
| Valider et générer le script des changements de schéma d'un entrepôt, bloquer les pertes de données | Projet de base de données |
| Mettre en production des éléments testés avec le lakehouse et les connexions de production | Pipeline de déploiement avec règles ou bibliothèque de variables |

> **Conseil d'examen.** Git et les pipelines de déploiement se complètent : développez dans un espace de travail connecté à Git, puis promouvez avec un pipeline. Un pipeline seul ne donne pas d'historique, et Git seul ne change pas les connexions par phase.

<!-- section: key-points -->
## Points clés

- Git : un espace de travail, une branche, un dossier ; l'Admin connecte ; Contributor fait les commits et les mises à jour ; Update récupère toute la branche ; les données et tables d'un lakehouse ne vont jamais dans Git, seulement les métadonnées et les raccourcis.
- Projets de base de données : style SDK, plateforme cible Synapse Data Warehouse in Microsoft Fabric ; le build produit un .dacpac ; Generate Script pour relire, Publish pour appliquer ; `BlockOnPossibleDataLoss` en production ; scripts de prédéploiement et de post-déploiement.
- Pipelines de déploiement : 2 à 10 phases, un espace de travail chacune, 300 éléments par déploiement, métadonnées uniquement ; les lakehouses arrivent vides ; liaison automatique à l'intérieur de la phase.
- Les règles se trouvent dans la phase cible, sont créées par le propriétaire de l'élément et s'appliquent au déploiement suivant ; règle de lakehouse par défaut pour les notebooks ; bibliothèques de variables pour le reste.
- Déployer demande Admin du pipeline plus Contributor sur les deux espaces de travail.
