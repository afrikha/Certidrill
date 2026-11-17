La sécurité des applications à l'examen SC-100 couvre toute la vie d'une application : évaluer le portefeuille déjà en production, modéliser les menaces sur les applications critiques, intégrer la sécurité à chaque phase du développement, puis choisir les contrôles d'exécution : des identités pour le code, une porte d'entrée gérée pour les API et un pare-feu d'applications web. Les questions demandent quel outil, quel framework ou quel service répond à une exigence avec le moins d'effort ou le moins de privilèges.

<!-- section: portfolio-posture | objectives: 4.2.1 -->
## Évaluer la posture d'un portefeuille d'applications

Commencez par un inventaire classé par criticité métier, puis mesurez chaque application par rapport à une base de référence (le benchmark de sécurité cloud Microsoft (MCSB) et le pilier sécurité d'Azure Well-Architected Framework).

| Exigence | Outil |
| --- | --- |
| Mauvaises configurations des ressources Azure, AWS ou GCP qui hébergent les applications | **CSPM de base** (foundational CSPM) de Defender for Cloud (recommandations, score de sécurité, MCSB) |
| Chemins exploitables depuis Internet jusqu'aux données d'une application, risque hiérarchisé selon le contexte | **Defender CSPM** : analyse des chemins d'attaque, explorateur de sécurité cloud |
| Résultats sur le code, les secrets, les dépendances et l'infrastructure as code dans Azure DevOps, GitHub et GitLab | **Sécurité DevOps** de Defender for Cloud (connecteurs) |
| Relier un conteneur ou une ressource de production au dépôt et au pipeline qui l'ont produit | **Mappage du code au cloud** (code to cloud mapping) de Defender CSPM |
| Inventaire des API, y compris celles non authentifiées ou inutilisées | **Defender for APIs** ; Azure API Center pour les API hors d'API Management |
| Applications SaaS utilisées par l'organisation et applications OAuth dotées de trop de privilèges | Defender for Cloud Apps : Cloud Discovery, gouvernance des applications |
| Menaces à l'exécution contre App Service, les conteneurs ou les API | Defender for App Service, Defender for Containers, Defender for APIs |

Sécurité DevOps dans Defender for Cloud :

| Fonctionnalité | CSPM de base | Defender CSPM |
| --- | --- | --- |
| Inventaire des ressources DevOps, recommandations sur les mauvaises configurations de l'environnement DevOps | Oui | Oui |
| Recommandations sur les vulnérabilités du code, les mauvaises configurations IaC, les secrets exposés, les vulnérabilités open source | Oui (nécessite un analyseur : GitHub Advanced Security, Microsoft Security DevOps ou l'analyse du code sans agent) | Oui |
| Annotations des demandes de tirage (Azure DevOps), requêtes SBOM, mappage du code au cloud | Non | Oui |
| Analyse des chemins d'attaque et explorateur de sécurité cloud avec le contexte DevOps | Non | Oui |

> **Piège d'examen.** Connecter GitHub à Defender for Cloud n'analyse rien en soi : les résultats sur les secrets et les dépendances viennent de GitHub Advanced Security, et les annotations des demandes de tirage et les chemins d'attaque exigent Defender CSPM.

<!-- section: threat-modeling | objectives: 4.2.2 -->
## Modéliser les menaces des applications vitales pour l'entreprise

La modélisation des menaces est l'activité de **conception** du Security Development Lifecycle (SDL) : vous dessinez l'application sous forme de diagramme de flux de données (processus, magasins de données, entités externes, flux de données), vous marquez les **limites d'approbation** (trust boundaries) où les données changent de niveau de privilège, vous énumérez les menaces sur chaque élément, puis vous les évaluez et les atténuez. La conception est le moment le moins coûteux pour corriger une faille. **Microsoft Threat Modeling Tool** est conçu pour des non-spécialistes de la sécurité : il guide le dessin, génère les menaces avec **STRIDE par élément** et suit les atténuations et les rapports.

| Menace STRIDE | Propriété violée | Atténuation typique sur Azure |
| --- | --- | --- |
| Usurpation d'identité (Spoofing) | Authentification | Microsoft Entra ID, MFA, identités managées, authentification par certificat |
| Falsification (Tampering) | Intégrité | TLS, artefacts signés, stockage immuable, validation des entrées |
| Répudiation (Repudiation) | Non-répudiation | Journaux d'audit, Azure Monitor, Microsoft Sentinel, rétention des journaux inviolable |
| Divulgation d'informations (Information disclosure) | Confidentialité | Chiffrement, Key Vault, points de terminaison privés, étiquettes de confidentialité |
| Déni de service (Denial of service) | Disponibilité | Azure DDoS Protection, limitation du débit du WAF, limitation d'API Management, mise à l'échelle automatique |
| Élévation de privilèges (Elevation of privilege) | Autorisation | RBAC à privilèges minimum, PIM, validation des entrées, isolation (sandboxing) |

Hiérarchisez les menaces sur les ressources les plus critiques et sur les limites d'approbation exposées à Internet ; revoyez le modèle à chaque changement d'architecture (nouvelle intégration, nouveau flux de données, composant d'IA qui lit du contenu non fiable).

> **Conseil d'examen.** « Identifier les menaces pendant la conception, avant que le code existe » relève de la modélisation des menaces. L'analyse du code, les tests d'intrusion et Defender for Cloud trouvent les problèmes plus tard, à l'implémentation, à la vérification ou en production.

<!-- section: app-lifecycle | objectives: 4.2.3 -->
## Une stratégie de cycle de vie complet pour la sécurité des applications

Le SDL de Microsoft organise le travail de sécurité en phases ; une stratégie de cycle de vie associe un contrôle à chaque phase et le rend obligatoire par des stratégies et des pipelines.

| Phase | Activité de sécurité | Technologies Microsoft |
| --- | --- | --- |
| Formation | Formation à la sécurité et à la confidentialité selon le rôle | Parcours Microsoft Learn, normes internes |
| Exigences | Exigences de sécurité et de confidentialité, obligations de conformité | MCSB, pilier sécurité de Well-Architected, Compliance Manager |
| Conception | Modèle de menaces, décisions d'architecture sécurisée | Microsoft Threat Modeling Tool, MCRA |
| Implémentation | Codage sécurisé, outils approuvés, aucun secret dans le code | GitHub Advanced Security, Key Vault, identités managées |
| Vérification | Analyse statique, contrôle des dépendances, analyse IaC, tests dynamiques, revues | Analyse du code, revue des dépendances, Microsoft Security DevOps, contrôles sur les demandes de tirage |
| Mise en production | Déploiement progressif par anneaux (processus de déploiement sûr), artefacts signés | Anneaux de déploiement, environnements avec approbations, Azure Policy |
| Réponse | Journalisation, supervision, réponse aux incidents, correctifs réinjectés dans le backlog | Defender for Cloud, Microsoft Sentinel, Defender XDR |

Principes qui orientent les réponses de conception : **décaler à gauche** (shift left : trouver les problèmes là où ils coûtent le moins à corriger), automatiser les contrôles dans les pipelines au lieu de compter sur des revues manuelles, appliquer la **défense en profondeur** à l'exécution, et boucler en transformant les constats de production en éléments de backlog confiés à l'équipe de développement.

<!-- section: secure-development | objectives: 4.2.4 -->
## Normes pour un processus de développement sécurisé

| Norme | Mise en œuvre |
| --- | --- |
| Aucune information d'identification dans le code source | Secrets dans **Azure Key Vault**, charges de travail utilisant des **identités managées** ou la **fédération d'identité de charge de travail** ; **analyse des secrets** avec protection des envois (push protection) |
| Trouver les vulnérabilités de son propre code | **Analyse du code** (analyse statique, par exemple CodeQL) à chaque demande de tirage |
| Contrôler les dépendances open source | **Revue des dépendances** et alertes, nomenclature logicielle (SBOM) |
| Détecter les modèles mal configurés avant le déploiement | Analyse IaC de Bicep, ARM et Terraform dans le pipeline |
| Seul du code revu atteint la branche principale | Protection de branche : relecteurs requis, vérifications d'état requises |
| Les pipelines ne peuvent pas être détournés pour atteindre la production | Connexions de service avec fédération d'identité de charge de travail, rôles à privilèges minimum par environnement, approbations et vérifications |
| Les développeurs voient les résultats là où ils travaillent | Annotations des demandes de tirage (Defender CSPM, Azure DevOps), alertes dans le dépôt |
| Les équipes de sécurité voient tous les résultats au même endroit | Sécurité DevOps de Defender for Cloud pour Azure DevOps, GitHub et GitLab |

GitHub Advanced Security s'exécute dans GitHub ; **GitHub Advanced Security for Azure DevOps** apporte l'analyse du code, l'analyse des secrets et l'analyse des dépendances à Azure Repos. Les deux alimentent Defender for Cloud par les connecteurs DevOps.

> **Piège d'examen.** Stocker un secret dans une variable de pipeline ou une référence Key Vault laisse toujours un secret à faire tourner. « Aucun secret à gérer » signifie une identité managée (charge de travail hébergée dans Azure) ou la fédération d'identité de charge de travail (pipeline, GitHub Actions, autre cloud).

<!-- section: map-technologies | objectives: 4.2.5 -->
## Associer les technologies aux exigences de sécurité des applications

| Exigence | Technologie |
| --- | --- |
| Les employés se connectent à une application métier | Microsoft Entra ID, accès conditionnel |
| Les clients se connectent avec des comptes sociaux ou locaux | Microsoft Entra External ID |
| L'application lit des secrets, des clés ou des certificats | Azure Key Vault avec Azure RBAC |
| L'application s'authentifie auprès des services Azure sans informations d'identification | Identité managée |
| Bloquer l'injection SQL et le scripting intersite en périphérie | Azure WAF sur Front Door ou Application Gateway |
| Publier, authentifier, limiter et versionner des API | Azure API Management |
| Absorber les attaques réseau volumétriques | Azure DDoS Protection |
| Supprimer l'exposition publique des services PaaS principaux | Points de terminaison privés, accès au réseau public désactivé |
| Restreindre les clients qui atteignent une application App Service | Restrictions d'accès, point de terminaison privé, intégration au réseau virtuel pour le trafic sortant |
| Détecter les attaques contre la charge de travail en cours d'exécution | Defender for App Service, Defender for Containers, Defender for APIs |
| Imposer des normes de configuration à chaque déploiement | Azure Policy (`Deny`, `DeployIfNotExists`) |
| Protéger les données que stocke l'application | Chiffrement avec des clés gérées par le client, étiquettes de confidentialité, Defender for Storage et Defender for Databases |

<!-- section: workload-identities | objectives: 4.2.6 -->
## Identités de charge de travail pour les applications

Une **identité de charge de travail** est l'identité d'un logiciel : une **application** (objet global), son **principal de service** (instance dans un locataire) ou une **identité managée** (un principal de service dont Azure gère les informations d'identification).

| Exigence | Recommandation |
| --- | --- |
| Du code sur Azure (App Service, Functions, machines virtuelles, AKS, Container Apps) appelle des ressources Azure | **Identité managée** avec un rôle Azure RBAC à l'étendue la plus restreinte |
| Une identité partagée par plusieurs ressources, des autorisations accordées avant que la ressource existe, des ressources souvent recréées | Identité managée **affectée par l'utilisateur** (type recommandé pour les services Microsoft) |
| Une identité qui doit disparaître avec son unique ressource | Identité managée **affectée par le système** |
| GitHub Actions, Kubernetes, Google Cloud, AWS ou Azure Pipelines accèdent à Azure | **Fédération d'identité de charge de travail** : approuver le jeton externe sur une inscription d'application ou une identité managée affectée par l'utilisateur (aucun secret) |
| Rien d'autre n'est possible | Inscription d'application avec un **certificat** (pas un secret client), stocké dans Key Vault et renouvelé |

La fédération échange un jeton du fournisseur d'identité externe contre un jeton d'accès Microsoft Entra ; l'émetteur, le sujet et l'audience doivent correspondre exactement aux informations d'identification fédérées.

Protéger les identités de charge de travail (Microsoft Entra Workload ID) :

| Contrôle | Fait |
| --- | --- |
| Accès conditionnel pour les identités de charge de travail | Licence **Workload Identities Premium** ; **principaux de service monolocataires** uniquement (ni identités managées, ni applications multilocataires) ; conditions : emplacement et risque du principal de service ; octroi : **Block** uniquement |
| ID Protection pour les identités de charge de travail | Détecte des risques comme des informations d'identification divulguées |
| Révisions d'accès | Réviser les principaux de service affectés à des rôles d'annuaire privilégiés ; le moyen de gouverner les identités managées |

Les **identités d'agent** (Microsoft Entra Agent ID) sont une catégorie distincte pour les agents d'IA : créées à partir d'un blueprint d'identité d'agent, avec un **sponsor** humain obligatoire et un cycle de vie gouverné. Utilisez une identité de charge de travail pour du code déterministe ; utilisez une identité d'agent pour un agent d'IA autonome.

> **Piège d'examen.** Une stratégie d'accès conditionnel qui bloque l'accès hors des plages IP de l'entreprise ne peut pas protéger une identité managée. Restreignez une identité managée par un RBAC à privilèges minimum et des contrôles réseau, et gouvernez-la par des révisions d'accès.

<!-- section: api-security | objectives: 4.2.7 -->
## Gestion et sécurité des API

**Azure API Management** est la passerelle placée devant les API : un seul endroit pour authentifier, autoriser, limiter, valider et journaliser. Associez le Top 10 OWASP de la sécurité des API à ses contrôles :

| Menace | Contrôle API Management |
| --- | --- |
| Authentification défaillante (broken authentication) | Valider les jetons Microsoft Entra (`validate-azure-ad-token`) ou d'autres JWT (`validate-jwt`) ; certificats clients ; sécuriser le portail des développeurs avec Microsoft Entra ID |
| Autorisation défaillante au niveau des fonctions | Exiger des abonnements ou une stratégie d'autorisation sur toutes les API, aucune opération générique, listes d'autorisation `ip-filter` |
| Autorisation défaillante au niveau des propriétés d'objet | `validate-content` par rapport au schéma, stratégies de transformation qui retirent les propriétés inutiles |
| Consommation de ressources sans restriction | `rate-limit-by-key`, `quota-by-key`, limites de taille des charges utiles, mise en cache ; WAF Front Door ou Application Gateway en amont contre les bots |
| Mauvaise configuration de sécurité | TLS 1.2, point de terminaison privé ou mode réseau virtuel interne, secrets dans des valeurs nommées Key Vault, Azure Policy |
| Gestion inappropriée de l'inventaire | Instances distinctes par environnement, versions et révisions, **Azure API Center** comme inventaire central |
| Consommation non sécurisée des API | Identité managée ou gestionnaire d'informations d'identification pour appeler les back-ends, validation des réponses |

L'autorisation au niveau des objets reste le travail du back-end : la passerelle ne peut pas savoir si l'utilisateur A a le droit de lire la commande 42.

**Defender for APIs** est un plan distinct de Defender for Cloud pour les **API publiées dans Azure API Management** : inventaire, constats sur les API externes, non authentifiées ou inactives (aucun trafic depuis 30 jours), classification des API qui traitent des données sensibles et détection à l'exécution des menaces, y compris le Top 10 OWASP des API. Avec Defender CSPM, ses données apparaissent dans l'explorateur de sécurité cloud.

> **Piège d'examen.** Defender for APIs détecte et recommande ; il n'applique rien. La limitation, la validation des jetons et la validation du schéma sont des stratégies d'API Management.

<!-- section: azure-waf | objectives: 4.2.8 -->
## Sécuriser les applications avec Azure Web Application Firewall

Azure WAF protège les applications HTTP et HTTPS contre les attaques courantes (injection SQL, scripting intersite) avec des stratégies centrales, de sorte qu'une vulnérabilité est atténuée une seule fois pour toutes les applications placées derrière lui.

| Plateforme | À choisir quand | Fonctionnalités WAF |
| --- | --- | --- |
| Azure Front Door **Premium** | Utilisateurs dans le monde entier, origines multirégions, bloquer les attaques en périphérie | Default Rule Set managé, Bot Manager, règles personnalisées et de limitation du débit, filtrage géographique |
| Azure Front Door **Standard** | Distribution mondiale avec des règles personnalisées uniquement | Règles personnalisées uniquement |
| Application Gateway **WAF_v2** | Applications régionales ou internes, stratégies par site ou par URI dans un réseau virtuel | Ensembles de règles managés, Bot Manager, règles personnalisées et de limitation du débit |
| Application Gateway for Containers | Entrée (ingress) Kubernetes | Stratégie WAF |

Règles de conception :

- Superposez Front Door en périphérie et Application Gateway dans la région quand il faut à la fois une protection mondiale et des stratégies privées propres à certains chemins ; verrouillez l'origine pour qu'elle n'accepte que le trafic venant de Front Door.
- Déployez en mode **Détection**, ajustez les faux positifs avec des exclusions, puis passez en mode **Prévention**.
- Application Gateway v1 a été mis hors service le 28 avril 2026 : les conceptions utilisent WAF_v2. Front Door (classique) sera mis hors service le 31 mars 2027.
- Le WAF ne couvre que la couche 7 : Azure DDoS Protection traite les attaques volumétriques, Azure Firewall et les NSG filtrent les autres protocoles.
- Envoyez les journaux WAF vers Log Analytics et Microsoft Sentinel ; Defender for Cloud recommande un WAF pour les applications exposées à Internet.

> **Piège d'examen.** « Des règles OWASP managées sur Front Door » exige le niveau **Premium** ; un profil Standard ne propose que des règles personnalisées.

<!-- section: key-points -->
## Points clés

- Posture du portefeuille : CSPM de base pour les recommandations, Defender CSPM pour les chemins d'attaque et le mappage du code au cloud, sécurité DevOps pour les résultats sur le code, Defender for APIs pour l'inventaire des API.
- Modélisation des menaces = phase de conception, diagramme de flux de données, limites d'approbation, STRIDE par élément.
- Phases du SDL : formation, exigences, conception, implémentation, vérification, mise en production, réponse ; automatiser les contrôles dans les pipelines.
- Identité managée sur Azure, fédération d'identité de charge de travail ailleurs, certificat en dernier recours ; l'accès conditionnel pour les identités de charge de travail ne couvre que les principaux de service monolocataires.
- API Management applique ; Defender for APIs détecte. WAF : Front Door Premium pour les règles managées en périphérie, Application Gateway WAF_v2 dans la région, Détection avant Prévention.
