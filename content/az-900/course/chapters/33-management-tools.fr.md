Azure se gère en cliquant, en tapant des commandes ou en décrivant dans un fichier le résultat voulu. Tous ces outils s'adressent au même service, Azure Resource Manager, et c'est pourquoi ils donnent le même résultat.

<!-- section: azure-portal | objectives: 3.3.1 -->
## Le portail Azure

Le **portail Azure** est une console web unifiée. Vous pouvez y créer, gérer et surveiller aussi bien une simple application web qu'un déploiement complexe, par une interface graphique.

- Créer et gérer des ressources, avec des formulaires guidés.
- Construire des **tableaux de bord** personnalisés pour une vue organisée des ressources et de leur état.
- Présent dans chaque centre de données Azure, il résiste donc à la panne d'un centre de données ; il se met à jour en continu, sans interruption pour maintenance.
- Bien adapté à l'exploration et aux tâches occasionnelles ; pour les tâches répétitives ou à grande échelle, les outils en ligne de commande et les modèles sont plus rapides et moins sujets aux erreurs.

L'**application mobile Azure** donne accès aux ressources, aux alertes et à une ligne de commande depuis un téléphone.

<!-- section: command-line-tools | objectives: 3.3.2 -->
## Azure Cloud Shell, Azure CLI et Azure PowerShell

| Outil | Ce que c'est | Style de commande |
| --- | --- | --- |
| **Azure PowerShell** | Un module de **cmdlets** pour PowerShell ; fonctionne sous Windows, Linux et macOS | `New-AzVM`, `Get-AzResourceGroup` |
| **Azure CLI** | Une interface en ligne de commande avec des commandes de **style Bash** ; fonctionne sous Windows, Linux et macOS | `az vm create`, `az group list` |
| **Azure Cloud Shell** | Un shell **dans le navigateur**, ouvert depuis le portail, sur shell.azure.com ou depuis l'application mobile Azure, avec les deux outils déjà installés | Bash ou PowerShell, au choix |

Azure PowerShell et Azure CLI font les mêmes choses ; seule la syntaxe diffère. Tous deux appellent l'API REST d'Azure en arrière-plan, et tous deux permettent d'écrire des scripts pour automatiser la création d'une ressource ou de toute une infrastructure.

Caractéristiques de Cloud Shell :

- Rien à installer ni à configurer en local : il s'exécute dans le navigateur.
- **Authentifié** automatiquement avec le compte utilisé pour se connecter au portail.
- Vous choisissez **Bash** (avec Azure CLI) ou **PowerShell** (avec Azure PowerShell).

<!-- section: azure-arc | objectives: 3.3.3 -->
## Azure Arc

Gérer des environnements hybrides et multiclouds devient vite compliqué. **Azure Arc** étend la gestion et la conformité d'Azure aux ressources situées **hors d'Azure** : dans votre centre de données, en périphérie ou dans un autre cloud. Grâce à Azure Resource Manager, ces ressources apparaissent et se gèrent comme si elles étaient dans Azure.

Ce qu'Azure Arc permet :

- Gérer tout l'environnement en **projetant** les ressources non Azure dans Azure Resource Manager.
- Gérer des machines virtuelles, des clusters Kubernetes et des bases de données multiclouds et hybrides comme s'ils s'exécutaient dans Azure.
- Utiliser les services et capacités de gestion Azure habituels où que soient les ressources : Azure Policy, étiquettes, Azure RBAC, Azure Monitor, Defender pour le cloud.
- Continuer d'utiliser les opérations informatiques traditionnelles tout en introduisant des pratiques DevOps.

Types de ressources gérables hors d'Azure : **serveurs**, **clusters Kubernetes**, **services de données Azure**, **SQL Server** et machines virtuelles.

<!-- section: iac | objectives: 3.3.4 -->
## L'infrastructure en tant que code

L'**infrastructure en tant que code** (IaC) consiste à gérer l'infrastructure avec des **lignes de code** au lieu d'étapes manuelles. Le code décrit les ressources ; un outil les déploie.

| Avantage | Sens |
| --- | --- |
| Reproductible | Le même fichier donne le même environnement à chaque fois : développement, test et production sont cohérents |
| Rapide et scalable | Dix ou mille ressources se déploient de la même façon |
| Versionné | Les fichiers sont stockés dans le contrôle de code source avec le code applicatif, relus et suivis |
| Moins d'erreurs | Aucune étape manuelle oubliée |

Les formes simples d'IaC sont des scripts dans Cloud Shell, Azure CLI ou Azure PowerShell. Les formes plus complètes sont les **modèles ARM**, **Bicep** et des outils tiers comme **Terraform**.

<!-- section: arm-templates | objectives: 3.3.5 -->
## Azure Resource Manager et les modèles ARM

**Azure Resource Manager** (ARM) est le service de déploiement et de gestion d'Azure. **Toute requête** de création, de mise à jour ou de suppression d'une ressource passe par lui, qu'elle vienne du portail, de la CLI, de PowerShell, d'un SDK ou de l'API REST. ARM reçoit la requête, l'authentifie et l'autorise, puis l'envoie au service Azure.

Ce qu'ARM apporte :

- Gérer l'infrastructure par des **modèles déclaratifs** plutôt que par des scripts.
- Déployer, gérer et surveiller toutes les ressources d'une solution **comme un groupe**.
- Redéployer une solution tout au long de son cycle de vie avec un résultat cohérent.
- Définir des **dépendances** pour que les ressources soient déployées dans le bon ordre.
- Appliquer le **contrôle d'accès** (RBAC) à tous les services, puisqu'il est intégré à la couche de gestion.
- Appliquer des **étiquettes** et des **verrous**, et suivre la facturation par groupes de ressources partageant une étiquette.

Un **modèle ARM** est un fichier **JSON** qui décrit les ressources à déployer.

| Avantage | Sens |
| --- | --- |
| **Syntaxe déclarative** | Vous indiquez ce que vous voulez, pas les commandes pour l'obtenir |
| **Résultats reproductibles** | Déployer plusieurs fois le même modèle donne les mêmes ressources : il est idempotent |
| **Orchestration** | ARM ordonne les opérations et déploie en parallèle quand c'est possible |
| **Fichiers modulaires** | Un modèle peut être découpé en modèles plus petits et réutilisables |
| **Extensibilité** | On peut y ajouter des scripts de déploiement en PowerShell ou en Bash |

**Bicep** est un langage qui décrit lui aussi les ressources de façon déclarative, avec une syntaxe plus simple et plus concise que le JSON. Il prend en charge tous les types de ressources, il est modulaire et donne des résultats reproductibles ; un fichier Bicep est converti en modèle ARM au déploiement.

Quand un modèle ou un fichier Bicep est redéployé, ARM réapplique toutes les propriétés de chaque ressource qu'il décrit, car le fichier décrit toujours l'état final : une modification manuelle faite depuis le dernier déploiement, par exemple dans le portail, est écrasée.

> **Piège d'examen.** Déclaratif signifie décrire l'état final (« un compte de stockage nommé X existe »). Les scripts sont impératifs : une liste de commandes à exécuter dans l'ordre. Les modèles ARM et Bicep sont déclaratifs.

<!-- section: key-points -->
## Points clés

- Portail : console web graphique, tableaux de bord, adapté aux tâches occasionnelles.
- Azure PowerShell (cmdlets) et Azure CLI (style Bash) font les mêmes choses et sont scriptables. Cloud Shell : les deux, dans le navigateur, déjà authentifié.
- Azure Arc : gérer avec les outils Azure des serveurs, des clusters Kubernetes et des services de données situés hors d'Azure.
- Infrastructure en tant que code : des déploiements reproductibles et versionnés. Les modèles ARM (JSON) et Bicep sont déclaratifs et idempotents.
- Azure Resource Manager est la couche de gestion unique derrière tous les outils ; il apporte RBAC, étiquettes, verrous et groupes de ressources.
