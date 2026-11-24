Chaque service cloud transfère une partie du travail de sécurité à Microsoft, mais jamais la totalité. Pour l'examen SC-100, vous spécifiez ce que le client doit encore sécuriser pour chaque modèle de service, quelle base de référence le décrit et quels contrôles protègent les charges de travail IoT, web, conteneurs, Kubernetes et IA. Les questions donnent une charge de travail et une contrainte (aucun secret dans le code, aucune exposition publique, clusters multiclouds, effort d'administration minimal) et attendent l'ensemble d'exigences qui convient.

<!-- section: service-baselines | objectives: 3.3.1 -->
## Bases de référence de sécurité pour le SaaS, le PaaS et l'IaaS

Le **modèle de responsabilité partagée** détermine ce qu'une base de référence doit couvrir :

| Couche | SaaS | PaaS | IaaS |
| --- | --- | --- | --- |
| Informations et données, appareils, comptes et identités | Client | Client | Client |
| Infrastructure d'identité et d'annuaire | Partagée | Partagée | Client |
| Applications | Microsoft | Partagée | Client |
| Contrôles réseau | Microsoft | Partagée | Client |
| Système d'exploitation | Microsoft | Microsoft | Client |
| Hôtes physiques, réseau, centre de données | Microsoft | Microsoft | Microsoft |

Les **bases de référence de sécurité Azure** appliquent le benchmark de sécurité cloud Microsoft à chaque service Azure. Chaque entrée donne l'ID du contrôle MCSB, la fonctionnalité, si elle est **prise en charge**, si elle est **activée par défaut**, la **responsabilité de configuration** (Client, Microsoft ou Partagée), des conseils de configuration et si Defender for Cloud la surveille. Les contrôles qui ne correspondent pas à un modèle sont marqués non applicables : la gestion de la configuration du système d'exploitation ne s'applique pas à un service PaaS. Des bases de référence comme celle de Key Vault sont basées sur le MCSB v1.0 et renvoient aux recommandations de sécurité propres au service (par exemple Secure your Azure Key Vault) pour les conseils actuels.

D'où vient chaque base de référence et comment elle est appliquée :

| Modèle de service | Base de référence | Évaluation et application |
| --- | --- | --- |
| IaaS (machines virtuelles, disques, réseaux) | Bases de référence de service du MCSB plus la base de référence du système d'exploitation | Recommandations de Defender for Cloud, Azure Policy, configuration des machines dans l'invité |
| PaaS (App Service, Azure SQL, Stockage, Key Vault, services d'IA) | Base de référence de service du MCSB de chaque service | Recommandations de Defender for Cloud, effets Azure Policy deny et DeployIfNotExists au groupe d'administration |
| SaaS (Microsoft 365, Salesforce, ServiceNow, GitHub) | Recommandations de l'éditeur et Niveau de sécurité Microsoft | Connecteurs d'applications de **Defender for Cloud Apps** avec les recommandations de gestion de la posture de sécurité SaaS dans le Niveau de sécurité Microsoft ; SSO Microsoft Entra et accès conditionnel pour l'accès |

> **Piège d'examen.** Une ligne de base de référence dont la responsabilité est « Microsoft » ne demande aucune action ; les lignes « Client » ou « Partagée » sont vos exigences. Et la posture d'une application SaaS comme Salesforce est évaluée par Defender for Cloud Apps via le Niveau de sécurité Microsoft, pas par Defender for Cloud.

<!-- section: iot-workloads | objectives: 3.3.2 -->
## Exigences de sécurité des charges de travail IoT

Une charge de travail IoT comporte trois zones de sécurité : l'**appareil**, la **périphérie** et le **cloud** (Azure IoT Hub, Device Provisioning Service, stockage et analytique en aval).

| Zone | Exigences |
| --- | --- |
| Identité de l'appareil | Une identité par appareil dans IoT Hub ; certificats X.509 émis par une chaîne d'autorités de certification (autorité racine conservée hors ligne, autorités subordonnées qui signent les certificats des appareils) ; le sujet du certificat doit correspondre à l'ID de l'appareil ; certificats auto-signés et clés symétriques partagées réservés aux tests |
| Provisionnement | **Device Provisioning Service** avec des groupes d'inscriptions, pour provisionner les appareils à grande échelle avec leur attestation (X.509 ou TPM) sans identifiants du hub intégrés à l'image |
| Accès des services | Microsoft Entra ID et Azure RBAC pour les applications back-end au lieu des stratégies d'accès partagé ; identités managées pour le routage des messages vers Stockage ou Event Hubs |
| Réseau | Points de terminaison privés et filtrage IP sur le hub, TLS pour toutes les connexions, segmentation de l'OT et de l'IT selon les couches Purdue ou ISA-95 |
| Périphérie (Azure IoT Operations sur Kubernetes compatible Arc) | Votre propre autorité de certification pour les certificats TLS, authentification du broker MQTT et autorisation des rubriques selon le privilège minimum, secrets synchronisés depuis Azure Key Vault, images signées par Microsoft, mises à niveau d'Arc contrôlées |
| Surveillance | Defender for IoT pour les menaces sur les appareils et le réseau, Defender for Containers pour les clusters de périphérie, journaux vers Microsoft Sentinel |

Traitez les tableaux de bord cloud des données opérationnelles comme informatifs : les décisions critiques pour la sûreté ne doivent pas reposer sur eux seuls.

> **Conseil d'examen.** « Des milliers d'appareils doivent être provisionnés sans chaîne de connexion du hub dans le firmware » correspond à DPS avec une attestation X.509 ou TPM. « Les applications back-end ne doivent pas utiliser de clés partagées » correspond à Microsoft Entra ID avec Azure RBAC sur IoT Hub.

<!-- section: web-workloads | objectives: 3.3.3 -->
## Exigences de sécurité des charges de travail web

| Exigence | Contrôle |
| --- | --- |
| Bloquer l'injection SQL, le cross-site scripting et les bots en périphérie, à l'échelle mondiale | Azure Front Door **Premium** avec une stratégie WAF (ensemble de règles managé, protection contre les bots) |
| Application web régionale derrière un WAF dans un réseau virtuel | Application Gateway **WAF_v2** |
| Seul le WAF peut atteindre l'application | Point de terminaison privé sur l'application (Private Link de Front Door Premium), ou restrictions d'accès avec la balise de service `AzureFrontDoor.Backend` plus l'en-tête `X-Azure-FDID` |
| Les utilisateurs doivent se connecter avant d'atteindre le code | Authentification intégrée d'App Service avec Microsoft Entra ID |
| Transport chiffré uniquement | HTTPS uniquement, TLS 1.2 minimum |
| Aucun secret dans la configuration | Identité managée plus références Key Vault |
| Appels sortants vers des ressources privées | Intégration au réseau virtuel |
| Aucun identifiant de déploiement en clair | Authentification de base désactivée pour FTP et SCM |
| Protéger et limiter les API | Stratégies Azure API Management (validation JWT, limites de débit, filtrage IP) et Defender for APIs |
| Attaques volumétriques sur les adresses IP publiques | Azure DDoS Protection |
| Détection des menaces sur la plateforme d'hébergement | Defender for App Service |
| Vulnérabilités trouvées avant le déploiement | Sécurité DevOps dans Defender for Cloud (analyse du code, des secrets et de l'infrastructure as code dans les pipelines) |

> **Piège d'examen.** Le Pare-feu Azure ne protège pas une application web contre l'injection SQL : c'est le rôle d'un WAF de couche 7. Et un profil Front Door **Standard** n'a que des règles WAF personnalisées ; les ensembles de règles managés et la protection contre les bots exigent **Premium**.

<!-- section: containers | objectives: 3.3.4 -->
## Exigences de sécurité des conteneurs

La sécurité des conteneurs est une **chaîne d'approvisionnement** : image de base, build, registre, déploiement, exécution.

| Étape | Exigences |
| --- | --- |
| Image de base | Images de base minimales et fiables provenant d'une source approuvée ; reconstruire quand la base est corrigée |
| Build | Aucun secret dans les images ou les Dockerfiles (utiliser des identités managées et Key Vault à l'exécution) ; exécution en non-root ; analyse dans le pipeline |
| Registre | Azure Container Registry privé ; authentification Microsoft Entra avec les rôles AcrPull et AcrPush ; utilisateur administrateur désactivé ; point de terminaison privé et accès public désactivé (Premium) |
| Vulnérabilités | Defender for Containers ou Defender CSPM : analyse sans agent des images du registre et des conteneurs en cours d'exécution, réanalysés chaque jour |
| Intégrité | Signer les images avec le **Notary Project** et vérifier les signatures avant le déploiement |
| Déploiement | Déploiement contrôlé dans Defender for Containers pour auditer ou bloquer les images qui enfreignent les règles de vulnérabilité ; pris en charge uniquement sur AKS 1.31 ou version ultérieure (Linux, clouds commerciaux) |
| Exécution | Capteur Defender pour la détection des menaces à l'exécution (mineurs de cryptomonnaie, dérive des binaires) |

Docker Content Trust est déprécié dans Azure Container Registry : depuis le **31 mai 2026**, il ne peut plus être activé sur les registres qui ne l'utilisaient pas, et il est supprimé le **31 mars 2028**. Les nouvelles conceptions spécifient des signatures Notary Project.

Pour les conteneurs serverless, les mêmes règles d'identité et de réseau s'appliquent : identités managées pour extraire les images et atteindre d'autres services, déploiement dans un réseau virtuel pour les environnements Azure Container Apps, et aucune entrée publique sauf nécessité.

> **Piège d'examen.** L'analyse des vulnérabilités indique qu'une image est vulnérable ; elle ne l'empêche pas de s'exécuter. Bloquer les images vulnérables ou non signées au déploiement exige un contrôle d'admission (déploiement contrôlé ou vérification des signatures).

<!-- section: container-orchestration | objectives: 3.3.5 -->
## Exigences de sécurité de l'orchestration des conteneurs

Pour Azure Kubernetes Service (AKS) et les autres clusters Kubernetes, les exigences couvrent le plan de contrôle, les identités, le réseau, les charges de travail et la détection des menaces :

| Exigence | Contrôle |
| --- | --- |
| Serveur d'API inaccessible depuis Internet | Cluster privé, ou plages d'adresses IP autorisées pour un serveur d'API public |
| Autorisations Kubernetes gérées avec des groupes Microsoft Entra | Intégration Microsoft Entra avec Azure RBAC pour l'autorisation Kubernetes |
| Aucun identifiant d'administration statique | Comptes locaux désactivés |
| Les pods atteignent les services Azure sans secret | Microsoft Entra Workload ID |
| Restreindre le trafic est-ouest entre les pods | Stratégies réseau Kubernetes |
| Contrôler le trafic sortant du cluster | Itinéraire défini par l'utilisateur vers le Pare-feu Azure dans le hub |
| Interdire les conteneurs privilégiés et les montages de l'hôte | **Azure Policy pour Kubernetes** (initiatives Pod Security Standards) |
| Secrets dans etcd chiffrés avec une clé du client | Chiffrement etcd KMS avec Azure Key Vault |
| Détection des menaces à l'exécution et posture pour AKS, EKS, GKE | Defender for Containers (capteur, accès à l'API Kubernetes, découverte sans agent) |
| Clusters locaux ou dans d'autres clouds gouvernés depuis Azure | Kubernetes compatible Azure Arc avec Azure Policy et Defender for Containers |
| Nœuds corrigés | Mises à niveau automatiques de l'image du système d'exploitation des nœuds |

Multicloud : Defender for Containers couvre Amazon EKS et Google GKE via les connecteurs AWS et GCP, avec les mêmes recommandations, résultats de vulnérabilité et alertes à l'exécution qu'AKS.

> **Piège d'examen.** Les stratégies réseau filtrent le trafic entre les pods à l'intérieur du cluster ; les NSG filtrent le trafic vers le sous-réseau des nœuds. « Les pods de l'espace de noms A ne doivent pas parler à l'espace de noms B » correspond à une stratégie réseau, pas à un NSG. Et « refuser les pods privilégiés » est appliqué par Azure Policy pour Kubernetes, pas par le capteur Defender.

<!-- section: ai-services | objectives: 3.3.6 -->
## Évaluer la sécurité d'Azure AI services

Les services d'IA (Microsoft Foundry, modèles Azure OpenAI, Azure AI Search, Foundry Tools) suivent les mêmes règles d'identité, de réseau et de données que les autres services PaaS, plus des contrôles propres aux prompts et aux modèles.

| Domaine | Exigence et solution |
| --- | --- |
| Identité | Authentification Microsoft Entra ID avec des identités managées ; **désactiver l'authentification par clé (locale)**, imposée à grande échelle par la stratégie Azure Policy intégrée ; rôles de données comme Foundry User pour les applications qui créent avec les déploiements du projet ou les appellent, ou Foundry Agent Consumer, le rôle le moins privilégié pour les principaux qui interagissent seulement avec les points de terminaison des agents ; pas Contributor |
| Réseau | Points de terminaison privés avec l'accès au réseau public désactivé ; points de terminaison privés aussi pour Stockage, Azure Cosmos DB et Azure AI Search connectés ; les agents qui atteignent des ressources privées exigent l'injection de réseau virtuel ; pour les agents hébergés, elle doit être incluse à la création du compte Foundry, car elle ne peut pas être ajoutée à un compte existant |
| Données | Clés gérées par le client si nécessaire, étiquettes de confidentialité et DLP sur les données d'ancrage, accès aux index selon le privilège minimum |
| Contenu et prompts | **Garde-fous** dans Foundry (Azure AI Content Safety) : contenu préjudiciable, attaques par prompt utilisateur (jailbreak), injection de prompt indirecte dans les documents et la sortie des outils, contenu protégé |
| Passerelle | **AI Gateway** dans Azure API Management : authentification, limites de jetons par projet, journalisation du trafic des modèles |
| Détection des menaces | **Defender for AI services** : alertes sur les tentatives de jailbreak, la fuite de données et le vol d'identifiants, éventuellement avec les preuves de prompt, corrélées dans Defender XDR |
| Posture | **Gestion de la posture de sécurité de l'IA** dans Defender CSPM : nomenclature IA (AI BOM), recommandations sur les erreurs de configuration et chemins d'attaque dans Azure, AWS (Amazon Bedrock) et GCP (Vertex AI) |
| Sécurité des données et conformité | Gestion de la posture de sécurité des données pour l'IA de **Microsoft Purview** : classer, auditer et gouverner les prompts et les réponses |

> **Piège d'examen.** Une clé API contourne Azure RBAC : « seules les identités qui ont un rôle peuvent appeler le modèle » exige de désactiver l'authentification locale. Et Defender for AI services **alerte** sur un jailbreak ; le bloquer avant qu'il atteigne le modèle relève d'un garde-fou Foundry.

<!-- section: key-points -->
## Points clés

- La responsabilité partagée détermine la base de référence ; les bases de référence de sécurité Azure associent les contrôles du MCSB à chaque service, avec une colonne de responsabilité.
- Posture SaaS : connecteurs Defender for Cloud Apps et Niveau de sécurité Microsoft ; IaaS et PaaS : Defender for Cloud et Azure Policy.
- IoT : X.509 issu d'une chaîne d'autorités de certification, DPS, Entra ID pour l'accès back-end, points de terminaison privés, Defender for IoT.
- Web : Front Door Premium ou Application Gateway WAF_v2, points de terminaison privés, authentification intégrée, identité managée, Defender for App Service et for APIs.
- Conteneurs : ACR privé, authentification Entra, analyse des vulnérabilités, signatures Notary Project (Docker Content Trust déprécié), déploiement contrôlé, capteur d'exécution.
- Kubernetes : serveur d'API privé, Entra et Azure RBAC, identité de charge de travail, stratégies réseau, Azure Policy, Defender for Containers sur AKS, EKS, GKE et Arc.
- Services d'IA : accès sans clé, réseau privé, garde-fous, AI Gateway, Defender for AI services, AI-SPM dans Defender CSPM, Purview.
