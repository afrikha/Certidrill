Quatre références Microsoft structurent la plupart des recommandations de la SC-100 : les Microsoft Cybersecurity Reference Architectures (MCRA) montrent quelles capacités existent et comment elles s'assemblent, le Microsoft cloud security benchmark (MCSB) énumère les contrôles qu'une conception cloud doit respecter, IA comprise, et le framework d'adoption de la Confiance Zéro organise le programme autour de scénarios métier. Les questions d'examen demandent quelle référence répond à un besoin, quel contrôle ou quelle capacité traite les menaces internes, externes ou de la chaîne d'approvisionnement, et quel contrôle du MCSB manque à une conception d'IA.

<!-- section: mcra | objectives: 1.2.1 -->
## Les Microsoft Cybersecurity Reference Architectures

Les **MCRA** sont des architectures de référence techniques pour adopter une sécurité de bout en bout selon les principes de la Confiance Zéro. L'artefact principal est un jeu de diagrammes PowerPoint (version d'avril 2025) qui couvre l'« hybride de tout » : informatique héritée, multicloud, IoT, technologies opérationnelles (OT) et IA. Chaque capacité des diagrammes a une info-bulle et un lien vers sa documentation.

| Usage | Ce qu'il apporte à l'architecte |
| --- | --- |
| Modèle de départ | Une architecture de sécurité cible |
| Référence de comparaison | Ce que Microsoft recommande, comparé à ce que l'organisation possède déjà |
| Guide d'intégration | Comment les capacités Microsoft et les outils tiers existants se connectent |
| Apprentissage et formation | Une carte des capacités à présenter aux équipes et aux nouveaux venus |

Le jeu contient des recommandations (antimodèles, bonnes pratiques, tendances des menaces, sécurité de bout en bout et priorisation impitoyable, adoption de la Confiance Zéro), un mappage des capacités Microsoft aux normes Confiance Zéro (dont le contenu préliminaire du Zero Trust Reference Model de The Open Group) et aux rôles de l'organisation, et des diagrammes : capacités de cybersécurité Microsoft, accès utilisateur Confiance Zéro, opérations de sécurité, OT, capacités multiclouds et multiplateformes, couverture de la chaîne d'attaque, sécurité de l'infrastructure et du développement, et fonctions organisationnelles de sécurité. Les MCRA sont une composante du **Security Adoption Framework (SAF)**, les recommandations de Microsoft pour moderniser la stratégie, la gouvernance, l'architecture et les opérations de sécurité.

La vue des capacités est celle que l'examen utilise le plus. Sachez quel produit couvre quelle fonction :

| Fonction | Capacité Microsoft |
| --- | --- |
| Identité et accès, accès conditionnel | Microsoft Entra ID |
| Accès réseau sans VPN, passerelle web sécurisée | Microsoft Entra Private Access, Microsoft Entra Internet Access |
| Détection et réponse sur les points de terminaison, gestion des vulnérabilités | Microsoft Defender for Endpoint, Microsoft Defender Vulnerability Management |
| Gestion et conformité des appareils | Microsoft Intune |
| Protection de l'e-mail et de la collaboration | Microsoft Defender for Office 365 |
| Découverte et contrôle des applications SaaS | Microsoft Defender for Cloud Apps |
| Détection des menaces sur les identités AD DS | Microsoft Defender for Identity |
| Posture cloud et protection des charges de travail, Azure, AWS, GCP | Microsoft Defender for Cloud |
| Détection et réponse corrélées | Microsoft Defender XDR |
| SIEM et SOAR | Microsoft Sentinel |
| Exposition, chemins d'attaque, ressources critiques | Microsoft Security Exposure Management |
| Découverte des ressources exposées sur internet | Microsoft Defender External Attack Surface Management |
| Appareils OT et IoT | Microsoft Defender for IoT |
| Classification des données, DLP, risque interne, conformité | Microsoft Purview |

> **Conseil d'examen.** « L'architecte a besoin d'une référence qui montre comment les capacités de sécurité Microsoft s'intègrent aux outils tiers existants de l'entreprise » désigne les MCRA. « L'architecte a besoin d'une liste de contrôles de sécurité pour évaluer les charges de travail cloud » désigne le MCSB.

<!-- section: mcsb | objectives: 1.2.1 -->
## Le Microsoft cloud security benchmark

Le **MCSB** est un ensemble de contrôles et de recommandations de sécurité pour les charges de travail cloud. La version actuelle est le **MCSB v2 (préversion)**, qui remplace la v1, ajoute des recommandations centrées sur Azure et mappe les contrôles à plus de 420 définitions Azure Policy intégrées, pour qu'Azure Policy et Defender for Cloud mesurent et surveillent la conformité. Il est organisé en 12 domaines de contrôle :

| Code | Domaine | Code | Domaine |
| --- | --- | --- | --- |
| NS | Sécurité réseau | LT | Journalisation et détection des menaces |
| IM | Gestion des identités | IR | Réponse aux incidents |
| PA | Accès privilégié | PV | Gestion de la posture et des vulnérabilités |
| DP | Protection des données | ES | Sécurité des points de terminaison |
| AM | Gestion des ressources | BR | Sauvegarde et récupération |
| DS | Sécurité DevOps | AI | Sécurité de l'intelligence artificielle |

Defender for Cloud attribue le MCSB par défaut comme norme de sécurité (avec AWS Foundational Security Best Practices pour les connecteurs AWS et GCP Default pour GCP) : les recommandations affichées en découlent, et seules les recommandations MCSB intégrées comptent dans le degré de sécurisation. La documentation de Defender for Cloud ne précise pas la version de cette norme par défaut. Les normes réglementaires (ISO 27001, PCI DSS, NIST SP 800-53...) s'ajoutent séparément dans le tableau de bord de conformité réglementaire.

| Exigence | Recommandation |
| --- | --- |
| Une base de contrôles de sécurité pour les charges de travail Azure, mesurable avec des outils intégrés | Le MCSB, évalué dans Defender for Cloud |
| Imposer un contrôle à grande échelle (refuser l'accès réseau public, exiger le chiffrement) | La définition Azure Policy mappée au contrôle du MCSB |
| Prouver la conformité à une réglementation | La norme réglementaire dans la conformité réglementaire de Defender for Cloud, pas le MCSB seul |
| Décider quels produits Microsoft déployer et comment ils se connectent | Les MCRA |

> **Piège d'examen.** Le MCSB est un benchmark, ni une réglementation ni une architecture. Une question qui demande de « s'aligner sur les bonnes pratiques relatives aux fonctionnalités et aux contrôles » peut viser les MCRA (capacités) comme le MCSB (contrôles) : lisez si l'énoncé demande quoi déployer ou quoi mesurer.

<!-- section: attack-types | objectives: 1.2.2 -->
## Se protéger des attaques internes, externes et de la chaîne d'approvisionnement

Les trois sources de menace appellent des contrôles différents :

| Menace | Scénario type | Bonnes pratiques | Solutions Microsoft |
| --- | --- | --- | --- |
| Interne | Un employé sur le départ copie de la propriété intellectuelle ; un employé divulgue des données confidentielles, détourne des données de patients ou des outils d'IA | Moindre privilège, accès limité dans le temps, recertification, classification et protection contre la perte de données, détection fondée sur le risque et respectueuse de la vie privée | Microsoft Purview Insider Risk Management, Protection contre la perte de données Purview, Communication Compliance, PIM, révisions d'accès |
| Externe | Hameçonnage, pulvérisation de mots de passe, exploitation de systèmes exposés sur internet, rançongiciel | Confiance Zéro : authentification forte, conformité des appareils, segmentation, XDR, correctifs, surface externe connue | Accès conditionnel, Defender XDR, Defender for Endpoint, Defender for Office 365, Defender EASM, Security Exposure Management |
| Chaîne d'approvisionnement | Le processus de build ou de mise à jour d'un fournisseur de confiance est compromis ; une application malveillante signée ; un microprogramme compromis ; un logiciel malveillant préinstallé sur des appareils | N'autoriser que du code autorisé, sécuriser les pipelines de build et de mise à jour, tout signer et tout vérifier, gouverner les dépendances et l'accès des partenaires | Stratégies d'intégrité du code, EDR, GitHub Advanced Security, sécurité DevOps de Defender for Cloud, accès des partenaires gouverné dans Microsoft Entra |

**Insider Risk Management** corrèle les signaux de Microsoft 365 et de Microsoft Graph, et des indicateurs tiers, avec des stratégies créées à partir de modèles comme **Data theft by departing users** (exige le connecteur RH), **Data leaks**, **Data leaks by priority users**, **Security policy violations** (utilise les alertes de Microsoft Defender for Endpoint), **Patient data misuse (preview)**, **Risky AI usage** et **Risky Agents (preview)**. Il est conçu avec la confidentialité dès la conception : les utilisateurs sont **pseudonymisés par défaut**, avec un accès en fonction du rôle et des journaux d'audit. Les alertes sont triées en dossiers, qui peuvent être transmis à eDiscovery (Premium). Une stratégie Communication Compliance peut faire entrer des utilisateurs dans l'étendue.

Les **attaques de la chaîne d'approvisionnement** ciblent les développeurs et les fournisseurs de logiciels pour atteindre le code source, les processus de build ou les mécanismes de mise à jour ; le code malveillant s'exécute ensuite avec la confiance de l'application légitime. Les recommandations de Microsoft :

- Pour toute organisation : des stratégies d'intégrité du code strictes qui n'autorisent que les applications approuvées, et un EDR qui détecte et corrige automatiquement les activités suspectes.
- Pour les éditeurs de logiciels : corriger immédiatement l'infrastructure de build et de mise à jour, n'autoriser que des outils de build de confiance, exiger la MFA pour les administrateurs ; protéger les programmes de mise à jour avec TLS et l'épinglage de certificat ; tout signer, y compris les fichiers de configuration et les scripts, et vérifier les signatures ; avoir un processus d'incident qui informe les clients des incidents de la chaîne d'approvisionnement.
- Pour les dépendances : analyse des dépendances et alertes (Dependabot, GitHub Advanced Security for Azure DevOps), analyse des secrets et du code dans le pipeline, visibles par l'équipe de sécurité dans la sécurité DevOps de Defender for Cloud.
- Pour les partenaires et fournisseurs qui accèdent à votre environnement : comptes invités avec la collaboration B2B, packages d'accès qui expirent, révisions d'accès et accès conditionnel appliqué aux utilisateurs externes.

> **Piège d'examen.** Un utilisateur dont le compte se comporte comme s'il avait été volé relève du risque d'identité (Microsoft Entra ID Protection). Un utilisateur légitime qui détourne ses propres accès relève du risque interne (Purview Insider Risk Management). Les mots « sur le départ », « démission », « RH » de l'énoncé désignent le second.

<!-- section: mcsb-ai | objectives: 1.2.3 -->
## Aligner les solutions d'IA sur le MCSB

Le domaine **Sécurité de l'intelligence artificielle** du MCSB v2 compte sept contrôles, qui couvrent la sécurité de la plateforme d'IA, la sécurité des applications d'IA et la surveillance de la sécurité de l'IA :

| Contrôle | Exigence | Solutions citées par le benchmark |
| --- | --- | --- |
| AI-1 Ensure use of approved models | Seuls les modèles passés par un processus formel de vérification et d'approbation arrivent en production | Registre et catalogue de modèles d'Azure Machine Learning, Azure Policy qui n'autorise que les modèles approuvés du registre, Azure RBAC |
| AI-2 Implement multi-layered content filtering | Filtrer les entrées, le traitement intermédiaire et les sorties contre les prompts malveillants et le contenu nuisible | Azure AI Content Safety (Prompt Shields, filtrage des entrées et des sorties), Azure API Management |
| AI-3 Adopt safety meta-prompts | Des instructions système qui guident le comportement et résistent à l'injection de prompts et au jailbreak | Messages système de sécurité, Prompt Shields, spotlighting, prompts sous gestion de versions, tests avec PyRIT |
| AI-4 Apply least privilege for agent functions | Limiter les outils, l'identité et l'accès réseau d'un agent à sa finalité | Microsoft Entra Agent ID, Azure RBAC et ABAC, Azure API Management, jetons à courte durée d'Azure Key Vault, segmentation réseau |
| AI-5 Ensure human-in-the-loop | Revue et approbation humaines pour les actions critiques, surtout sur des systèmes externes ou des données sensibles | Workflows d'approbation (Azure Logic Apps, Power Automate), journalisation d'audit |
| AI-6 Establish monitoring and detection | Détecter le jailbreak, l'injection de prompts, les anomalies et l'exfiltration de données ; classifier les données consultées par l'IA | Protection contre les menaces pour les services d'IA de Defender for Cloud, Microsoft Purview, Microsoft Sentinel, Azure Monitor |
| AI-7 Perform continuous AI red teaming | Tester les systèmes d'IA avec des techniques adverses avant les attaquants | PyRIT, AI Red Teaming Agent, MITRE ATLAS, résultats intégrés au CI/CD |

Les charges de travail d'IA héritent aussi des autres domaines : identités d'application (IM), contrôles réseau des services cloud natifs (NS), protection des données (DP) et journalisation (LT).

| Exigence de l'énoncé | Contrôle |
| --- | --- |
| Les développeurs déploient des modèles téléchargés depuis des hubs publics sans revue | AI-1 |
| Des utilisateurs tentent de faire ignorer ses instructions à un chatbot | AI-2 (Prompt Shields) et AI-3 |
| Un agent peut appeler toutes les API de l'entreprise avec un secret partagé | AI-4 |
| Un agent peut émettre des remboursements sans revue | AI-5 |
| Le SOC doit être alerté des tentatives de jailbreak contre les modèles de production | AI-6 |
| Trouver les faiblesses avant la mise en production et après chaque changement de modèle | AI-7 |

> **Piège d'examen.** Le filtrage de contenu (AI-2) inspecte ce qui entre dans le modèle et en sort ; les méta-prompts de sécurité (AI-3) orientent le comportement du modèle ; le moindre privilège des agents (AI-4) limite ce que l'agent peut faire même quand les deux premiers échouent. Une conception qui ne repose que sur les prompts manque AI-4 et AI-5.

<!-- section: zero-trust-adoption | objectives: 1.2.4 -->
## Le framework d'adoption de la Confiance Zéro

La Confiance Zéro repose sur trois principes : **vérifier explicitement** (authentifier et autoriser selon tous les points de données disponibles), **utiliser l'accès du moindre privilège** (accès juste-à-temps et juste suffisant, stratégies adaptatives fondées sur le risque, protection des données) et **supposer une violation** (réduire le rayon d'impact, segmenter l'accès, vérifier le chiffrement de bout en bout, utiliser l'analytique pour la détection).

Le framework d'adoption les transforme en un programme que les responsables métier peuvent parrainer. Il est organisé en **scénarios métier**, chacun découpé en quatre étapes de mise en œuvre :

| Scénario métier | Exigence type | Capacités principales |
| --- | --- | --- |
| Rapidly modernize your security posture | Mesurer et élever la posture sur tout le patrimoine, prioriser selon le risque | Degré de sécurisation Microsoft, Defender for Cloud, Security Exposure Management |
| Secure remote and hybrid work | Les utilisateurs travaillent de partout, sur des appareils gérés et personnels | Accès conditionnel Microsoft Entra, Intune, Entra Private Access et Internet Access |
| Identify and protect sensitive business data | Savoir où sont les données sensibles et les protéger où qu'elles aillent | Microsoft Purview Information Protection et Protection contre la perte de données |
| Prevent or reduce business damage from a breach | Contenir un attaquant et récupérer vite | Plan de récupération contre les rançongiciels, accès privilégié, segmentation, Defender XDR, Sentinel |
| Meet regulatory and compliance requirements | Mapper les réglementations à des contrôles et prouver la conformité | Purview Compliance Manager, conformité réglementaire de Defender for Cloud |

Le framework suit les phases de cycle de vie du Cloud Adoption Framework : **Define strategy, Plan, Ready, Adopt, Govern, Manage**. La différence tient au mouvement de mise à l'échelle : le CAF répète son processus pour chaque charge de travail, alors que la Confiance Zéro applique un élément de l'architecture (par exemple la protection des données) à tout le patrimoine, puis recommence avec l'élément suivant. Les domaines fonctionnels techniques sont les identités, les points de terminaison, les applications, l'infrastructure, les données et le réseau.

> **Piège d'examen.** « Quel framework aide à aligner le programme Confiance Zéro sur les résultats métier et les parrains ? » désigne le framework d'adoption de la Confiance Zéro et ses scénarios métier. Les MCRA montrent l'architecture cible ; elles n'organisent pas le programme.

> **Conseil d'examen.** Quand un scénario parle d'employés à distance sur des appareils personnels, le scénario métier est « Secure remote and hybrid work ». Quand il parle de rançongiciels ou de limiter les dégâts, c'est « Prevent or reduce business damage from a breach ».

<!-- section: key-points -->
## Points clés

- MCRA : diagrammes des capacités et intégrations Microsoft, composante du Security Adoption Framework. À utiliser comme modèle d'architecture cible et pour comparer avec les outils existants.
- MCSB v2 (préversion) : 12 domaines de contrôle, dont la sécurité DevOps et la sécurité de l'IA, mappés à plus de 420 définitions Azure Policy. Le MCSB est la norme par défaut de Defender for Cloud.
- Risque interne : Purview Insider Risk Management, pseudonymisé par défaut ; les utilisateurs sur le départ exigent le connecteur RH. Chaîne d'approvisionnement : intégrité du code, mises à jour signées, analyse des dépendances et des secrets, accès des partenaires gouverné.
- Contrôles d'IA du MCSB : modèles approuvés, filtrage de contenu multicouche, méta-prompts de sécurité, moindre privilège des agents, humain dans la boucle, surveillance, red teaming continu.
- Framework d'adoption de la Confiance Zéro : trois principes, cinq scénarios métier, phases de cycle de vie du CAF, déploiement sur tout le patrimoine un élément à la fois.
