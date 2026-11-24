La gestion de la posture répond à une question de l'architecte : dans Azure, AWS, GCP, les serveurs locaux et le patrimoine exposé à Internet, où sont les faiblesses, et lesquelles corriger d'abord ? L'examen SC-100 attend que vous choisissiez le bon outil pour chaque couche (Defender for Cloud, Niveau de sécurité Microsoft, Azure Arc, Defender EASM, Microsoft Security Exposure Management), que vous sachiez quel plan débloque quelle fonctionnalité et que vous distinguiez les scores.

<!-- section: defender-cloud-mcsb | objectives: 3.1.1 -->
## Évaluer la posture avec Defender for Cloud et le MCSB

Microsoft Defender for Cloud est une plateforme de protection des applications cloud natives en deux moitiés : la **gestion de la posture de sécurité cloud (CSPM)**, qui trouve les erreurs de configuration avant un attaquant, et la **protection des charges de travail cloud (CWP)**, qui détecte les attaques sur les ressources en cours d'exécution (voir [protection des charges de travail](#workload-protection)).

Le **benchmark de sécurité cloud Microsoft (MCSB)** est la norme par défaut de Defender for Cloud. Il est attribué automatiquement à chaque abonnement Azure, compte AWS et projet GCP connecté à Defender for Cloud, et ses recommandations intégrées alimentent le degré de sécurisation. Les contrôles du MCSB sont regroupés par domaine de sécurité (par exemple sécurité réseau, gestion des identités, accès privilégié, protection des données, journalisation et détection des menaces, gestion de la posture et des vulnérabilités, sécurité des points de terminaison, sauvegarde et récupération, sécurité DevOps), et chaque service Azure a une **base de référence de sécurité** qui associe les contrôles du MCSB aux paramètres de ce service. Le MCSB v2 (préversion) remplace la v1 avec 12 domaines, dont un nouveau domaine Artificial Intelligence Security ; les bases de référence des services, comme celle de Key Vault, sont encore basées sur le MCSB v1.0 et renvoient aux recommandations de sécurité propres au service pour les conseils actuels.

| Fonctionnalité | Foundational CSPM (gratuit) | Defender CSPM (payant) |
| --- | --- | --- |
| Inventaire des ressources, recommandations, degré de sécurisation, MCSB | Oui | Oui |
| Automatisation des workflows, exportation continue, exemptions | Oui | Oui |
| Normes réglementaires au-delà du MCSB (PCI DSS, ISO 27001, NIST SP 800-53, CIS) | Non | Oui |
| Analyse des chemins d'attaque, explorateur de sécurité cloud, hiérarchisation des risques | Non | Oui |
| Analyse sans agent des vulnérabilités et des secrets des machines | Non | Oui |
| Découverte des données sensibles, gestion de la posture de sécurité de l'IA | Non | Oui |
| Informations sur la surface d'attaque externe (EASM) des ressources cloud | Non | Oui |
| Règles de gouvernance, ressources critiques | Non | Oui |

Les **recommandations** sont l'unité de travail (ressources concernées, gravité, correction) ; les risques acceptés deviennent des **exemptions** avec une date d'expiration. La **conformité réglementaire** associe les mêmes évaluations aux contrôles d'une norme ; les contrôles manuels doivent être attestés avec des preuves. Ajouter des normes au-delà du MCSB exige un plan payant : Defender CSPM, ou tout autre plan Defender for Cloud sauf Defender for Servers Plan 1 et Defender for APIs Plan 1. Attribuez les stratégies et les plans au **groupe d'administration** pour que les nouveaux abonnements en héritent.

> **Piège d'examen.** « Évaluer Azure, AWS et GCP selon un benchmark commun sans coût supplémentaire » correspond à Foundational CSPM avec le MCSB. Dès que l'exigence cite des **chemins d'attaque** ou le **contexte des données sensibles**, la réponse devient Defender CSPM ; **une autre norme** exige un plan payant, et Defender CSPM est le plan de posture qui l'ajoute.

<!-- section: secure-score | objectives: 3.1.2 -->
## Évaluer la posture avec le Niveau de sécurité Microsoft

Le **Niveau de sécurité Microsoft** (Microsoft Secure Score) mesure la posture des identités, applications et appareils Microsoft 365. Il se trouve dans le portail Microsoft Defender (Exposure management > Secure score). Un chiffre plus élevé signifie que davantage d'actions recommandées ont été appliquées ; c'est une mesure, pas une garantie contre une violation.

Les règles qui décident des réponses :

- Chaque action recommandée vaut **10 points ou moins**. La plupart des actions sont binaires ; certaines donnent des **points partiels** (50 utilisateurs sur 100 protégés par MFA sur une action de 10 points donnent 5 points).
- Les produits contributeurs incluent Microsoft Entra ID, les produits Defender for Endpoint, for Identity, for Office 365 et for Cloud Apps, Exchange Online, SharePoint Online, Teams, ainsi que des applications SaaS comme Salesforce, ServiceNow et Okta.
- Une action traitée autrement peut être marquée **résolue par un tiers** ou **résolue par une atténuation alternative** (par exemple, avec les paramètres de sécurité par défaut activés, Microsoft recommande cet état pour les actions des stratégies de risque de connexion et de risque utilisateur ; les paramètres de sécurité par défaut rapportent déjà tous les points des actions MFA et authentification héritée), ou son risque peut être **accepté**.
- Les recommandations apparaissent quelle que soit la licence : le score reflète la posture absolue, pas ce que vous avez acheté.
- Accès : autorisations RBAC unifié de Defender **Exposure Management (read)** et **(manage)**, ou rôles Microsoft Entra (Security Administrator ou supérieur, Exchange Administrator et SharePoint Administrator en lecture-écriture ; Helpdesk Administrator, User Administrator, Service Support Administrator, Security Reader, Security Operator et Global Reader en lecture seule).

Cinq scores que l'examen mélange :

| Score | Produit et portail | Mesure |
| --- | --- | --- |
| Niveau de sécurité Microsoft | Portail Defender | Identités, applications, appareils Microsoft 365 et SaaS connectés |
| Degré de sécurisation (classique) | Defender for Cloud, portail Azure | Ressources Azure, AWS, GCP selon les recommandations du MCSB |
| Cloud Secure Score (basé sur les risques) | Defender for Cloud dans le portail Defender (initiative Cloud) | Mêmes ressources cloud, pondérées par le risque des recommandations, les facteurs de risque et la criticité des ressources |
| Score d'initiative | Security Exposure Management | Exposition dans un domaine (par exemple les rançongiciels) |
| Score de conformité | Microsoft Purview Compliance Manager | Progression des actions d'amélioration réglementaires |

Le score classique ne compte que les recommandations intégrées du MCSB en disponibilité générale (celles en préversion sont exclues), et un contrôle ne rapporte ses points que lorsque toutes ses recommandations sont satisfaites pour toutes les ressources. Le Cloud Secure Score utilise une échelle de 0 à 100 et un autre calcul : les deux valeurs ne sont pas comparables.

> **Piège d'examen.** « Mesurer la posture d'Exchange Online, SharePoint et Entra ID » correspond au Niveau de sécurité Microsoft, pas à Defender for Cloud. « Mesurer les abonnements Azure et les comptes AWS » correspond au degré de sécurisation de Defender for Cloud. « Mesurer la progression vers le RGPD » correspond au score de conformité.

<!-- section: integrated-posture | objectives: 3.1.3 -->
## Concevoir une gestion intégrée de la posture hybride et multicloud

Une conception intégrée réunit chaque environnement dans **une seule** vue de posture et une seule logique de hiérarchisation :

| Environnement | Comment il rejoint Defender for Cloud |
| --- | --- |
| Abonnements Azure | En natif ; activer les plans au groupe d'administration |
| Comptes AWS | Connecteur AWS ; connecter le **compte de gestion** pour intégrer automatiquement les comptes membres |
| Projets GCP | Connecteur GCP au niveau du projet ou de l'**organisation** |
| Serveurs locaux et d'autres clouds | Serveurs compatibles **Azure Arc**, puis Defender for Servers |
| Code et pipelines | Connecteurs de sécurité DevOps pour Azure DevOps, GitHub et GitLab |
| Ressources exposées à Internet | Informations Defender EASM dans Defender CSPM, ou une ressource EASM autonome |

Principes de conception :

1. **Une seule vue.** Defender for Cloud est intégré au portail Microsoft Defender, à côté des signaux des points de terminaison, des identités et de la messagerie ; Exposure Management les met en corrélation.
2. **Hiérarchiser selon le risque.** La hiérarchisation des risques de Defender CSPM et les **ressources critiques** placent une machine virtuelle exposée à Internet ayant accès à des données sensibles avant une machine virtuelle de test isolée.
3. **Attribuer et automatiser.** Les règles de gouvernance attribuent un propriétaire et une date d'échéance ; l'automatisation des workflows alimente la gestion des tickets ; Microsoft Sentinel ingère les alertes par ses connecteurs Defender for Cloud intégrés ; l'exportation continue vers Azure Event Hubs alimente les SIEM tiers comme Splunk et QRadar, et la stratégie intégrée qui déploie l'exportation vers un hub d'événements, attribuée au groupe d'administration racine, couvre tout le locataire.
4. **Appliquer à grande échelle.** Azure Policy (DeployIfNotExists) active les plans partout ; les stratégies de refus empêchent l'erreur de configuration de revenir.

> **Conseil d'examen.** Quand le scénario demande « un tableau de bord unique pour Azure, AWS, GCP et les serveurs locaux avec le moins d'effort d'administration », la conception attendue est Defender for Cloud avec les connecteurs AWS et GCP et Azure Arc pour les serveurs, pas un outil CSPM tiers ni un déploiement de Defender for Cloud par cloud.

<!-- section: workload-protection | objectives: 3.1.4 -->
## Sélectionner les plans de protection des charges de travail cloud

La posture trouve les faiblesses ; la **protection des charges de travail** détecte les menaces actives et génère des alertes de sécurité. Chaque plan Defender s'active par abonnement, compte AWS ou projet GCP.

| Exigence | Plan |
| --- | --- |
| EDR, évaluation des vulnérabilités et détection des menaces sur les serveurs Windows et Linux dans n'importe quel cloud ou en local | Defender for Servers (Plan 1 ou Plan 2) |
| Accès juste-à-temps aux machines virtuelles, surveillance de l'intégrité des fichiers, analyse sans agent des logiciels malveillants, évaluation de la base de référence du système d'exploitation | Defender for Servers **Plan 2** |
| Protection à l'exécution d'AKS, EKS, GKE et Kubernetes compatible Arc, évaluation des vulnérabilités des images, déploiement contrôlé (AKS uniquement) | Defender for Containers |
| Analyse des logiciels malveillants au chargement et menaces sur Stockage Blob, Azure Files, Data Lake Storage | Defender for Storage |
| Injection SQL et accès anormaux sur Azure SQL, SQL Server sur des machines, bases de données open source, Azure Cosmos DB | Defender for Databases |
| Attaques sur les applications web hébergées dans App Service | Defender for App Service |
| Accès suspects aux secrets d'Azure Key Vault | Defender for Key Vault |
| Opérations de gestion suspectes (ARM) | Defender for Resource Manager |
| Inventaire des API et attaques sur les API publiées dans API Management | Defender for APIs |
| Jailbreak, fuite de données et vol d'identifiants contre les applications d'IA générative | Defender for AI services |

> **Piège d'examen.** Les plans de protection des charges de travail n'ajoutent ni l'analyse des chemins d'attaque ni l'explorateur de sécurité cloud : ce sont des fonctionnalités de Defender CSPM. Une conception qui exige à la fois des alertes à l'exécution et des chemins d'attaque inclut **Defender CSPM plus le plan de charge de travail**.

<!-- section: azure-arc | objectives: 3.1.5 -->
## Intégrer les environnements hybrides et multiclouds avec Azure Arc

**Azure Arc** projette les ressources qui s'exécutent hors d'Azure comme des ressources Azure Resource Manager, pour qu'elles reçoivent les mêmes contrôles de gouvernance et de sécurité que les ressources natives.

| Ressource Arc | Usage de sécurité typique |
| --- | --- |
| Serveurs compatibles Arc (Windows et Linux, en local ou dans d'autres clouds) | Defender for Servers, Azure Policy et bases de référence de configuration des machines, données de l'Agent Azure Monitor pour Microsoft Sentinel, Azure Update Manager |
| Kubernetes compatible Arc | Defender for Containers, Azure Policy pour Kubernetes, configuration GitOps |
| SQL Server compatible Arc | Defender for SQL sur les machines, inventaire |

Un serveur projeté reçoit un ID de ressource, Azure RBAC, des étiquettes, Azure Policy, des extensions et une **identité managée affectée par le système** (accès à Azure sans secret stocké).

Choix de conception :

| Exigence | Conception |
| --- | --- |
| Intégrer des milliers de serveurs | Intégration par script avec un principal de service qui ne détient que **Azure Connected Machine Onboarding** |
| Aucun chemin Internet public depuis le centre de données | **Étendue de liaison privée** Azure Arc avec des points de terminaison privés via ExpressRoute ou VPN |
| Machines virtuelles AWS EC2 ou GCP avec Defender for Servers | Le connecteur multicloud de Defender for Cloud déploie Arc automatiquement |
| Appliquer la même base de référence du système d'exploitation aux serveurs Azure et Arc | Configuration des machines Azure Policy au groupe d'administration |

> **Piège d'examen.** Un serveur local intégré **directement** à Defender for Endpoint, sans Arc, reçoit la protection des points de terminaison mais pas les fonctionnalités de Defender for Cloud qui exigent une ressource Azure : les fonctionnalités du Plan 2 comme la surveillance de l'intégrité des fichiers et la base de référence du système d'exploitation, Azure Policy et les recommandations.

<!-- section: defender-easm | objectives: 3.1.6 -->
## Concevoir une solution avec Defender EASM

**Microsoft Defender External Attack Surface Management (Defender EASM)** regarde l'organisation de l'extérieur, comme un attaquant. À partir de **graines de découverte** (domaines, blocs IP, hôtes, contacts e-mail, ASN, organisations Whois), il découvre de façon récursive les ressources exposées à Internet, y compris le **shadow IT**, les analyse et signale les vulnérabilités, les services exposés et les problèmes d'hygiène.

| Option | À choisir quand |
| --- | --- |
| Informations EASM dans **Defender CSPM** | Le périmètre est l'exposition à Internet des ressources Azure, AWS et GCP, utilisée dans les chemins d'attaque et l'explorateur de sécurité cloud ; pas de ressource EASM distincte |
| Ressource **Defender EASM** autonome | Le périmètre est toute l'empreinte externe : domaines, sites web, adresses IP et hôtes hors des clouds, acquisitions, filiales, shadow IT |

Les états des ressources déterminent ce qui est surveillé : les ressources **Approved Inventory** vous appartiennent, apparaissent dans les tableaux de bord et sont réanalysées chaque jour ; les ressources **Candidate** et **Requires Investigation** doivent être examinées ; **Dependency** et **Monitor Only** couvrent une infrastructure tierce ou liée que vous ne contrôlez pas.

> **Piège d'examen.** Defender EASM découvre ce qui est exposé **à Internet**. Découvrir des appareils OT ou IoT non gérés **à l'intérieur** du réseau relève de Defender for IoT ; découvrir des ordinateurs portables non gérés sur le réseau de l'entreprise relève de la découverte d'appareils de Defender for Endpoint.

<!-- section: exposure-management | objectives: 3.1.7 -->
## Gérer la posture avec Microsoft Security Exposure Management

**Microsoft Security Exposure Management** (Sécurité Microsoft - Gestion de l'exposition) donne une vue unifiée de la posture sur les points de terminaison, les identités, les ressources cloud (Azure, AWS et GCP via Defender for Cloud), le SaaS et la surface d'attaque externe. Il se trouve dans la section **Exposure management** du portail Defender, ne demande aucune installation et n'est disponible que dans le cloud public. Il suit l'approche de **gestion continue de l'exposition aux menaces (CTEM)** : définir le périmètre, découvrir, hiérarchiser, valider, mobiliser.

| Brique | Rôle |
| --- | --- |
| Graphe d'exposition d'entreprise | Met en corrélation les ressources et leurs relations de toutes les charges de travail ; interrogé dans le repérage avancé (`ExposureGraphNodes`, `ExposureGraphEdges`) |
| Carte de la surface d'attaque | Exploration visuelle des ressources et de leurs connexions, y compris les ressources cloud |
| Gestion des ressources critiques | Classifications prédéfinies et personnalisées qui marquent des appareils, des identités et des ressources cloud comme critiques |
| Chemins d'attaque | Itinéraires de bout en bout d'un point d'entrée jusqu'à une ressource critique, avec points d'étranglement et rayon d'impact |
| Informations sur l'exposition : initiatives | Programmes pilotés par des métriques pour un domaine de sécurité (par exemple les rançongiciels), chacun avec un score, une cible et des recommandations liées |
| Informations sur l'exposition : métriques, recommandations, événements | Mesures au sein des initiatives, correctifs issus du Niveau de sécurité Microsoft et de Defender for Cloud, alertes sur les baisses de score |
| Connecteurs de données | Sources tierces comme ServiceNow CMDB, Tenable, Qualys et Rapid7 |

Chemins d'attaque et réduction de la surface d'attaque :

- Les **points d'étranglement** (choke points) sont des nœuds où de nombreux chemins convergent : en sécuriser un coupe plusieurs chemins à la fois. Le **rayon d'impact** montre ce qu'un attaquant atteint si un point d'étranglement tombe.
- Les chemins locaux se terminent sur des ressources « end game » (Domain Admins, Enterprise Admins, contrôleurs de domaine) ; les **chemins hybrides** peuvent partir d'une machine virtuelle cloud, pivoter par une identité et atteindre un contrôleur de domaine.
- Les chemins sont incomplets quand les ressources critiques ne sont pas définies ou qu'une charge de travail n'est pas sous licence.
- Réduire la surface d'attaque = supprimer l'exposition : exposition à Internet, privilèges permanents, points d'étranglement vulnérables, durcissement manquant des points de terminaison comme les règles de réduction de la surface d'attaque.

Un processus de gestion de la posture à spécifier :

1. **Classer les ressources critiques** (règles plus classifications personnalisées).
2. Connecter les sources : Defender for Endpoint, Defender for Identity, Defender CSPM, Gestion des vulnérabilités Microsoft Defender, scanners tiers.
3. Choisir les **initiatives** qui correspondent au risque métier et définir des **scores cibles**.
4. Hiérarchiser les points d'étranglement et les chemins vers les ressources critiques, puis les recommandations selon leur impact.
5. Corriger dans la charge de travail d'origine ; enregistrer les **exemptions** avec justification et période de révision.
6. Suivre les tendances des initiatives et les événements de baisse de score.

Accès : **Exposure Management (read)** ou **(manage)** dans le RBAC unifié de Defender (manage définit les scores cibles), ou Security Administrator dans Entra ID. Licences : Microsoft 365 E5, E3 avec des modules complémentaires ou licences de la suite Defender ; la pleine valeur exige Defender CSPM et la Gestion des vulnérabilités Microsoft Defender.

> **Piège d'examen.** L'analyse des chemins d'attaque de Defender for Cloud ne couvre que les ressources **cloud**. Un chemin qui combine un point de terminaison, une identité locale et une ressource cloud relève de l'expérience des chemins d'attaque d'Exposure Management dans le portail Defender.

<!-- section: key-points -->
## Points clés

- Le MCSB est la norme gratuite par défaut de Defender for Cloud ; les autres normes, les chemins d'attaque, les données sensibles et les informations EASM exigent Defender CSPM.
- Niveau de sécurité Microsoft : posture Microsoft 365 dans le portail Defender ; degré de sécurisation de Defender for Cloud : ressources cloud ; score de conformité : Purview.
- Posture intégrée : connecteurs AWS et GCP, Arc pour les serveurs, connecteurs DevOps, une seule vue dans le portail Defender, hiérarchisation selon le risque.
- Les plans de charge de travail génèrent des alertes ; Defender CSPM hiérarchise la posture. L'accès juste-à-temps et la surveillance de l'intégrité des fichiers exigent Servers Plan 2.
- Azure Arc transforme les serveurs et clusters hors Azure en ressources Azure pour Policy, RBAC, Defender et l'identité managée.
- Defender EASM : découverte de l'extérieur à partir de graines ; autonome pour toute l'empreinte, Defender CSPM pour l'exposition cloud.
- Exposure Management : d'abord les ressources critiques, puis les initiatives, les chemins d'attaque, les points d'étranglement et les recommandations sur toutes les charges de travail.
