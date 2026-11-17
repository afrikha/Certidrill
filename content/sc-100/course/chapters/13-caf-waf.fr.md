Le Cloud Adoption Framework pour Azure (CAF) indique à l'organisation comment adopter, gouverner et sécuriser le cloud dans son ensemble ; Azure Well-Architected Framework (WAF) indique à une équipe comment bien concevoir une charge de travail. La SC-100 vous demande de concevoir ou d'évaluer une stratégie de sécurité et de gouvernance avec eux, de placer la sécurité dans les zones d'atterrissage Azure, de construire un processus DevSecOps et d'adopter l'IA de façon sécurisée. Les questions décrivent les pratiques actuelles d'une organisation et demandent quel framework, quelle phase ou quelle solution comble l'écart.

<!-- section: caf-waf | objectives: 1.3.2 -->
## CAF et WAF : deux échelles, une stratégie de sécurité

| | Cloud Adoption Framework | Well-Architected Framework |
| --- | --- | --- |
| Étendue | L'organisation et tout son patrimoine cloud | Une charge de travail |
| Structure | Des méthodologies : Strategy, Plan, Ready, Adopt, Govern, Manage, et Secure qui les traverse toutes | Cinq piliers : fiabilité, sécurité, optimisation des coûts, excellence opérationnelle, efficacité des performances |
| Contenu de sécurité | La méthodologie Secure, la zone de conception sécurité des zones d'atterrissage Azure | Le pilier Sécurité et sa liste de contrôle de revue de conception |
| Responsable type | Équipes de stratégie cloud, de plateforme et de gouvernance, RSSI | Architectes et développeurs de la charge de travail |
| Outils d'évaluation | Listes de contrôle de préparation et de gouvernance | L'évaluation Well-Architected Review ; les recommandations d'Azure Advisor regroupées par pilier |

La **méthodologie Secure du CAF** applique la sécurité à chaque phase, car une faille dans une phase affaiblit toute la posture :

| Phase | Tâche de sécurité |
| --- | --- |
| Équipes et rôles | Comprendre les équipes et les rôles de sécurité : fournisseur cloud, équipes de plateforme, architecture de sécurité et gestion de la posture, opérations de sécurité (SOC), gouvernance, risque et conformité (GRC), sensibilisation et stratégie de sécurité |
| Strategy | Intégrer la sécurité à la stratégie d'adoption du cloud : modernisation de la posture, préparation aux incidents, confidentialité, intégrité et disponibilité, maintien de la posture |
| Plan | Planifier une adoption sécurisée, zone d'atterrissage comprise |
| Ready | Préparer un patrimoine cloud sécurisé |
| Adopt | Réaliser l'adoption de façon sécurisée |
| Govern | Gouverner le patrimoine de façon sécurisée |
| Manage | Gérer le patrimoine de façon sécurisée |

La méthodologie repose sur trois idées. La **modernisation de la posture de sécurité** s'aligne sur le framework d'adoption de la Confiance Zéro, priorise selon la réduction mesurable du risque et automatise la validation (stratégies, infrastructure as code, analyse continue de la conformité, degré de sécurisation dans Defender for Cloud). La **préparation aux incidents** couvre la préparation, la détection, le tri, le confinement, l'éradication, la récupération et les leçons apprises. La **triade CIA** se traduit en contrôles : confidentialité (chiffrement, gestion des clés, identité, segmentation, classification), intégrité (hachage, signature, stockage immuable, gestion de versions, chaînes de mise à jour sécurisées), disponibilité (redondance, mise à l'échelle automatique, sauvegarde et reprise d'activité).

Le **pilier Sécurité** du WAF donne une liste de contrôle de revue de conception en 12 recommandations :

| Code | Recommandation |
| --- | --- |
| SE:01 | Établir une base de référence de sécurité alignée sur les exigences de conformité, les normes du secteur et les recommandations de la plateforme |
| SE:02 | Maintenir un cycle de vie de développement sécurisé |
| SE:03 | Classifier et étiqueter les données et les systèmes de la charge de travail |
| SE:04 | Créer une segmentation et des périmètres intentionnels |
| SE:05 | Mettre en œuvre une gestion des identités et des accès stricte, conditionnelle et auditable |
| SE:06 | Isoler, filtrer et contrôler le trafic réseau, entrant et sortant |
| SE:07 | Chiffrer les données avec des méthodes modernes et standard |
| SE:08 | Durcir tous les composants de la charge de travail |
| SE:09 | Protéger les secrets d'application : durcir le stockage, restreindre et auditer l'accès, effectuer la rotation |
| SE:10 | Mettre en œuvre une surveillance globale avec une détection moderne des menaces |
| SE:11 | Établir un programme de tests complet |
| SE:12 | Définir et tester les procédures de réponse aux incidents, jusqu'à la reprise d'activité |

> **Piège d'examen.** Un énoncé sur « l'évaluation de la sécurité de l'architecture d'une seule application » désigne le pilier Sécurité du WAF et sa liste de contrôle, pas le CAF. Un énoncé sur « une approche à l'échelle de l'entreprise pour que chaque nouvel abonnement hérite des contrôles de sécurité » désigne le CAF et les zones d'atterrissage.

<!-- section: governance | objectives: 1.3.2, 1.3.3 -->
## La sécurité et la gouvernance avec le CAF

La méthodologie **Govern** du CAF compte cinq étapes. La première est réalisée une fois ; les quatre autres se répètent en cycle :

1. Constituer une équipe de gouvernance cloud.
2. Évaluer les risques cloud.
3. Documenter les stratégies de gouvernance cloud.
4. Appliquer les stratégies de gouvernance cloud.
5. Surveiller la conformité cloud.

La gouvernance couvre la sécurité, la conformité réglementaire, les opérations, la gestion des coûts, la gestion des données, le provisionnement des ressources et des domaines émergents comme l'IA. Les stratégies sont d'abord écrites, comme des énoncés métier, puis appliquées avec des outils ; l'application est automatisée partout où c'est possible.

| Exigence | Solution recommandée |
| --- | --- |
| Des règles que chaque abonnement doit suivre, y compris les futurs | Azure Policy attribuée à un groupe d'administration |
| Bloquer une configuration non conforme au déploiement | Un effet Azure Policy `deny` |
| Corriger automatiquement les ressources existantes | `deployIfNotExists` ou `modify` avec correction |
| Mesurer la posture de sécurité par rapport aux bonnes pratiques sur Azure, AWS et GCP | Defender for Cloud, MCSB et degré de sécurisation |
| Évaluer la conformité à une réglementation | Conformité réglementaire de Defender for Cloud ; Purview Compliance Manager pour Microsoft 365 |
| Limiter les accès d'administration permanents | Microsoft Entra PIM avec des révisions d'accès récurrentes |
| Classifier et gouverner les données sur tout le patrimoine | Microsoft Purview |
| Inventorier les ressources et détecter les dérives | Azure Resource Graph, inventaire de Defender for Cloud |
| Séparer les tâches entre équipes de plateforme, de sécurité et des charges de travail | Azure RBAC aux étendues groupe d'administration, abonnement et groupe de ressources |

> **Conseil d'examen.** Les questions « évaluer une stratégie existante » décrivent des pratiques comme des revues manuelles, des attributions Owner permanentes ou des stratégies uniquement en mode audit. La réponse du CAF fait passer chacune à un contrôle automatisé et appliqué : stratégies `deny`, PIM, surveillance continue de la conformité.

<!-- section: landing-zones | objectives: 1.3.4 -->
## Implémenter et gouverner la sécurité avec les zones d'atterrissage Azure

Une **zone d'atterrissage Azure** est l'environnement que le CAF prépare avant l'arrivée des charges de travail : une hiérarchie de groupes d'administration, des abonnements de plateforme (gestion, connectivité, identité, sécurité) et des zones d'atterrissage d'application (un ou plusieurs abonnements par charge de travail). La hiérarchie de référence :

| Groupe d'administration | Contenu |
| --- | --- |
| Racine intermédiaire (nom de l'entreprise) | Stratégies pour toute l'organisation |
| Platform | Management (journaux, automatisation), Connectivity (hubs, pare-feu, DNS), Identity (contrôleurs de domaine), Security (Microsoft Sentinel) |
| Landing zones : Corp | Charges de travail connectées au réseau de l'entreprise |
| Landing zones : Online | Charges de travail exposées sur internet |
| Sandbox | Expérimentations, stratégies assouplies |
| Decommissioned | Abonnements résiliés |

Les zones d'atterrissage suivent une **gouvernance pilotée par les stratégies** : les attributions Azure Policy et les attributions de rôles Azure RBAC des groupes d'administration sont héritées par chaque abonnement placé dessous, si bien qu'un nouvel abonnement de charge de travail est sécurisé dès le premier jour.

La **zone de conception sécurité** des zones d'atterrissage Azure crée une base pour les environnements Azure, hybrides et multiclouds. Son étendue est l'outillage des opérations de sécurité et le contrôle d'accès, y compris la Confiance Zéro et la sécurité réseau avancée. Ses recommandations :

- Activer Defender for Cloud sur tous les abonnements et utiliser Azure Policy pour qu'il reste activé.
- Intégrer Defender for Cloud à Microsoft Sentinel pour un SIEM et un SOAR gérés de façon centralisée sur l'hybride et le multicloud.
- Exporter le journal d'activité Azure vers les Journaux Azure Monitor, et vers Stockage Azure pour une rétention au-delà de deux ans.
- Utiliser les rapports Microsoft Entra pour les audits d'accès ; pour les identités, l'accès conditionnel et PIM avec des révisions d'accès récurrentes.
- Surveiller la dérive des correctifs et la dérive de la configuration de sécurité des VM.
- Définir un plan de réponse aux incidents avant la mise en production.

L'implémentation de référence comprend Defender for Cloud, Microsoft Sentinel, Pare-feu Azure, Web Application Firewall, PIM et, en option, Azure DDoS Network Protection. Ses stratégies pour les zones d'atterrissage Corp et Online imposent un accès sécurisé comme HTTPS vers les comptes de stockage, l'audit et le chiffrement d'Azure SQL Database, et empêchent le transfert IP, le RDP entrant depuis internet et les sous-réseaux sans NSG.

> **Piège d'examen.** Attribuez les stratégies de toute l'organisation à la racine intermédiaire, pas au groupe racine du locataire, et gardez les exceptions des charges de travail dans leur propre groupe d'administration ou sous forme d'exemptions. Les verrous de ressources ne s'appliquent pas à un groupe d'administration : Azure Policy et Azure RBAC sont les contrôles qu'une hiérarchie propage.

<!-- section: devsecops | objectives: 1.3.5 -->
## Un processus DevSecOps aligné sur le CAF

Les recommandations du CAF pour des environnements DevOps sécurisés appliquent les trois principes de la Confiance Zéro à la plateforme de développement. Les zones de menace sont les postes des développeurs, les pipelines de mise en production et les environnements de test qui donnent accès aux données de production. Le DevSecOps « décale à gauche » (shift left) : la sécurité passe d'une préoccupation réservée à la production à la planification et au développement, avec les contrôles SE:02 (cycle de vie de développement sécurisé) et SE:11 (tests) du WAF.

| Étape | Pratique | Solutions Microsoft et GitHub |
| --- | --- | --- |
| Planifier | Modélisation des menaces (STRIDE), exigences de sécurité et normes de codage sécurisé | Suivi du travail dans Azure Boards ou GitHub Issues |
| Développer | Contrôles de sécurité dans l'IDE, revue par les pairs, aucun secret dans le code | Plug-ins de sécurité pour l'IDE ; analyse des secrets avec protection push |
| Commit et pull request | Revue de branche, analyse statique, revue des dépendances | Analyse du code avec CodeQL, Dependabot, GitHub Advanced Security for Azure DevOps |
| Build et test | Analyser les dépendances, les conteneurs et l'infrastructure as code ; faire échouer le build sur les résultats de gravité élevée | Sécurité DevOps de Defender for Cloud, Microsoft Defender for Containers |
| Déployer | Les pipelines s'authentifient auprès d'Azure sans secret stocké ; garde-fous sur ce qui peut être déployé | GitHub Actions avec l'identité fédérée OpenID Connect, Azure Key Vault, Azure Policy |
| Exploiter | Surveiller et détecter, renvoyer les constats vers le backlog | Azure Monitor, Application Insights, Defender for Cloud, Microsoft Sentinel |

La **sécurité DevOps de Defender for Cloud** connecte les organisations Azure DevOps, les organisations GitHub et les groupes GitLab, et montre à l'équipe de sécurité les constats sur le code, les secrets, les dépendances et l'infrastructure as code à côté des ressources cloud. GitHub Advanced Security for Azure DevOps est vendu sous la forme de GitHub Secret Protection for Azure DevOps et GitHub Code Security for Azure DevOps.

> **Piège d'examen.** L'analyse des secrets trouve les secrets déjà présents dans le dépôt ; la protection push bloque un nouveau secret au moment du push. Une exigence « empêcher les développeurs de valider des identifiants » désigne la protection push, et la solution durable est une identité de charge de travail ou la fédération OpenID Connect, pour qu'aucun secret n'existe.

> **Conseil d'examen.** « L'équipe de sécurité doit voir les vulnérabilités de GitHub, d'Azure DevOps et de GitLab au même endroit, à côté de la posture cloud » désigne la sécurité DevOps de Defender for Cloud, pas un tableau de bord par plateforme.

<!-- section: secure-ai-adoption | objectives: 1.3.1 -->
## Une stratégie d'adoption sécurisée de l'IA

Le scénario IA du CAF prépare l'adoption de l'IA par étapes : planifier (transformer les cas d'usage en plan de mise en production), préparer (intégrer les charges de travail d'IA à la zone d'atterrissage Azure), puis gouverner, sécuriser et gérer. Il conseille de choisir l'option qui répond aux exigences avec le moins de responsabilité opérationnelle : l'IA sur des plateformes SaaS (Microsoft Copilot Studio pour les agents), sur les plateformes Azure (Microsoft Foundry pour les applications et agents personnalisés) ou sur l'infrastructure Azure. **Microsoft Agent 365** donne une visibilité et une gouvernance centralisées des agents d'IA pris en charge.

Les recommandations **Secure AI** comptent trois parties :

| Partie | Recommandations | Solutions |
| --- | --- | --- |
| Découvrir les risques de sécurité de l'IA | Modéliser les menaces des systèmes d'IA (STRIDE, puis MITRE ATLAS et les risques d'IA générative de l'OWASP) ; évaluer les risques sur les données selon leur sensibilité ; tester les modèles contre la fuite de données, l'injection de prompts et l'inversion de modèle ; pratiquer le red teaming ; répéter les évaluations périodiquement | Microsoft Purview Insider Risk Management pour le risque sur les données ; tests adverses |
| Protéger les ressources et les données d'IA | Construire un inventaire complet des ressources d'IA ; s'authentifier avec des identités managées et isoler le trafic dans des réseaux virtuels ; définir des limites de données ; empêcher la perte de données ; protéger les modèles et les jeux de données | Azure Resource Graph, gestion de la posture de sécurité de l'IA de Defender for Cloud, classification et DLP de Microsoft Purview, Azure RBAC, Azure Private Link, Stockage Blob avec points de terminaison privés et chiffrement |
| Détecter les menaces de sécurité de l'IA | Automatiser la détection des risques d'IA ; établir des procédures de réponse aux incidents propres à l'IA ; surveiller chaque plateforme | Gestion de la posture de sécurité de l'IA de Defender for Cloud, runbooks de réponse aux incidents d'IA |

| Exigence | Recommandation |
| --- | --- |
| Connaître chaque déploiement d'IA du patrimoine Azure et ses erreurs de configuration | Gestion de la posture de sécurité de l'IA de Defender for Cloud, avec Azure Resource Graph |
| Empêcher les données sensibles d'entrer dans les prompts et les réponses de l'IA | Classification et Protection contre la perte de données de Microsoft Purview |
| Les charges de travail d'IA accèdent aux données sans identifiants stockés ni points de terminaison publics | Identités managées, points de terminaison privés par Azure Private Link |
| Détecter l'utilisation risquée des outils d'IA par les employés | Le modèle de stratégie Risky AI usage de Purview Insider Risk Management |
| Visibilité et gouvernance centralisées des agents de l'organisation | Microsoft Agent 365 |
| Les contrôles qu'une conception d'IA sécurisée doit respecter | Le domaine Sécurité de l'intelligence artificielle du MCSB |

> **Piège d'examen.** Les recommandations IA du CAF sont la stratégie d'adoption (planifier, préparer, gouverner, sécuriser, gérer) ; le domaine IA du MCSB est la liste des contrôles. Une question sur « l'ordre qu'une organisation doit suivre pour adopter l'IA de façon sécurisée » relève du CAF ; une question sur « le contrôle qui manque à la conception du chatbot » relève du MCSB.

<!-- section: key-points -->
## Points clés

- Le CAF gouverne le patrimoine (Strategy, Plan, Ready, Adopt, Govern, Manage, avec Secure qui les traverse) ; le WAF conçoit une charge de travail (cinq piliers, liste de contrôle Sécurité SE:01 à SE:12).
- Govern du CAF : constituer l'équipe, puis boucler sur évaluer les risques, documenter les stratégies, les appliquer, surveiller la conformité.
- Zones d'atterrissage Azure : hiérarchie de groupes d'administration avec zones d'atterrissage de plateforme et d'application, gouvernance pilotée par les stratégies héritée par chaque abonnement.
- Sécurité de la zone d'atterrissage : Defender for Cloud sur chaque abonnement imposé par stratégie, Sentinel pour le SIEM et le SOAR, PIM et révisions d'accès, export du journal d'activité.
- DevSecOps : décaler à gauche ; modélisation des menaces, analyse des secrets et protection push, CodeQL, Dependabot, analyse de l'IaC et des conteneurs, OpenID Connect au lieu de secrets, sécurité DevOps de Defender for Cloud pour une vue unique.
- Adoption sécurisée de l'IA : découvrir les risques, protéger les ressources et les données, détecter les menaces ; gestion de la posture de sécurité de l'IA de Defender for Cloud, Purview, identités managées et Private Link, Agent 365 pour les agents.
