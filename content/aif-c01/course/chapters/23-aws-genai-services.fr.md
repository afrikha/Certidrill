AWS propose l'IA générative à plusieurs niveaux : des modèles de fondation par une API (Amazon Bedrock), une plateforme pour construire et héberger vos propres modèles (Amazon SageMaker AI), des applications d'IA prêtes à l'emploi pour les utilisateurs métier et les développeurs (Amazon Quick, Kiro) et des outils pour construire et exécuter des agents (Strands Agents, Amazon Bedrock AgentCore). L'examen demande lequel répond à un besoin, pourquoi un service géré aide, ce qu'apporte l'infrastructure AWS et comment les options de tarification arbitrent entre coût et performances.

<!-- section: aws-genai-services | objectives: 2.3.1 -->
## Les services AWS pour développer des applications d'IA générative

| Service | Ce que c'est |
| --- | --- |
| **Amazon Bedrock** | Un accès entièrement géré et sans serveur à des modèles de fondation d'Amazon (Amazon Nova) et de grandes entreprises d'IA par une seule API. Fonctionnalités : Knowledge Bases (RAG géré), Guardrails (protections), Prompt Management, Model Evaluation, personnalisation des modèles (réglage précis, préentraînement continu, distillation), inférence par lots, Bedrock Marketplace pour des modèles plus spécialisés |
| **Amazon SageMaker AI** | Construire, entraîner, personnaliser par réglage précis et déployer tout modèle de ML, y compris des modèles de fondation, avec le contrôle des instances, du code et des points de terminaison ; SageMaker HyperPod pour l'entraînement à grande échelle |
| **SageMaker JumpStart** | Un hub dans SageMaker AI de modèles préentraînés propriétaires et open source, avec des modèles de solutions, que vous déployez sur des points de terminaison SageMaker AI, personnalisez par réglage précis et évaluez |
| **Amazon Quick** | Un service fondé sur l'IA pour les utilisateurs métier (la documentation AWS l'appelle désormais AWS Quick, issu d'Amazon QuickSight) : conversation avec des agents d'IA sur les données de l'entreprise, tableaux de bord (Quick Sight), ancrage dans les documents (Quick Index), rapports de recherche avec citations (Quick Research), automatisation des flux de travail et des processus (Quick Flows, Quick Automate) |
| **Kiro** | Un environnement de développement agentique (IDE et CLI) qui transforme une invite en exigences, en conception et en tâches (développement piloté par les spécifications), puis écrit, teste et documente le code ; prend en charge MCP |
| **Strands Agents** | Un SDK open source (Python et TypeScript) pour construire des agents d'IA en quelques lignes de code : le modèle planifie et appelle les outils ; fonctionne avec Amazon Bedrock et d'autres fournisseurs de modèles, des outils MCP et des modèles multi-agents |
| **Amazon Bedrock AgentCore** | Des services pour déployer et exploiter des agents de façon sécurisée à grande échelle, avec tout framework (Strands Agents, LangGraph, CrewAI...) et tout modèle : Runtime (hébergement sans serveur avec isolation des sessions), Memory, Gateway (transforme des API et des fonctions Lambda en outils MCP), Identity, Code Interpreter, Browser, Observability, Policy, Evaluations |

Situation en novembre 2026 : Amazon Bedrock Agents s'appelle désormais Amazon Bedrock Agents Classic et n'accepte plus de nouveaux clients (AgentCore est son successeur) ; Amazon Q Business est fermé aux nouveaux clients (successeur Amazon Quick) ; Amazon Q Developer n'accepte plus de nouvelles inscriptions et la prise en charge de ses plug-ins d'IDE prend fin le 30 avril 2027 (successeur Kiro).

| Exigence | Réponse |
| --- | --- |
| Utiliser un FM performant par une API avec une charge opérationnelle minimale | Amazon Bedrock |
| Contrôle complet de l'entraînement et de l'hébergement d'un modèle, code personnalisé | Amazon SageMaker AI |
| Déployer en quelques clics un modèle open source préentraîné sur un point de terminaison dédié | SageMaker JumpStart |
| Les utilisateurs métier interrogent en langage naturel les données et les tableaux de bord de l'entreprise | Amazon Quick |
| Les développeurs génèrent du code à partir de spécifications dans leur IDE | Kiro |
| Écrire un agent en Python en quelques lignes de code | Strands Agents |
| Exécuter des agents en production avec mémoire, identité, passerelle d'outils et observabilité | Amazon Bedrock AgentCore |

> **Piège d'examen.** Bedrock sert des modèles de fondation ; SageMaker AI est l'endroit où vous construisez et hébergez les vôtres. JumpStart fait partie de SageMaker AI, pas de Bedrock. Strands Agents est le code que vous écrivez ; AgentCore est l'endroit où l'agent s'exécute et est gouverné.

<!-- section: aws-genai-advantages | objectives: 2.3.2 -->
## Les avantages des services AWS d'IA générative

| Avantage | Comment AWS l'apporte |
| --- | --- |
| **Accessibilité** | De nombreux modèles derrière une API uniforme et un terrain de jeu dans la console ; aucun GPU à obtenir |
| **Réduction des obstacles à l'entrée** | Ni expertise en ML ni infrastructure nécessaires ; des fonctionnalités gérées remplacent le code personnalisé pour le RAG, les protections et les agents |
| **Efficacité** | Mise à l'échelle sans serveur, ingestion et récupération gérées, évaluation et surveillance intégrées |
| **Rentabilité** | Paiement par jeton sans coût initial ; l'inférence par lots, la mise en cache et les modèles plus petits réduisent la facture |
| **Rapidité de mise sur le marché** | Un prototype en quelques jours : changer de modèle revient à changer un identifiant de modèle, sans entraînement |
| **Capacité à atteindre les objectifs de l'entreprise** | Choix de modèles pour chaque cas d'utilisation, personnalisation avec les données de l'entreprise, intégration aux services AWS de données et de sécurité existants |

<!-- section: aws-infrastructure-benefits | objectives: 2.3.3 -->
## Les avantages de l'infrastructure AWS pour l'IA générative

- **Sécurité.** Avec Amazon Bedrock, votre contenu n'est pas utilisé pour améliorer les modèles de base et n'est pas partagé avec les fournisseurs de modèles. Les données sont chiffrées en transit et au repos (clés AWS KMS, y compris des clés gérées par le client), l'accès est contrôlé avec IAM et le trafic peut rester privé grâce à AWS PrivateLink depuis un VPC. Le contenu client traité par Bedrock est stocké dans la Région où il est traité.
- **Conformité.** Bedrock entre dans le périmètre de programmes de conformité comme SOC et ISO, est éligible HIPAA et peut être utilisé en conformité avec le RGPD ; les clients téléchargent les rapports de conformité d'AWS dans AWS Artifact.
- **Responsabilité.** Selon le modèle de responsabilité partagée, AWS sécurise l'infrastructure et le service géré ; le client sécurise ses données, ses autorisations d'accès, ses invites et son application. Les AWS AI Service Cards documentent les usages prévus, les limites et les choix de conception responsable des services d'IA d'AWS.
- **Sûreté.** Amazon Bedrock Guardrails filtre le contenu nuisible, bloque les sujets interdits, masque les données personnelles et vérifie que les réponses sont ancrées dans la source.
- **Performances et échelle.** Des puces conçues pour l'IA (AWS Trainium pour l'entraînement et l'inférence, AWS Inferentia pour l'inférence) et des instances GPU dans Amazon EC2, déployées dans les Régions AWS du monde entier.

> **Piège d'examen.** « Nos invites serviront-elles à entraîner le modèle du fournisseur ? » Non : Amazon Bedrock n'utilise pas le contenu client pour améliorer les modèles de base et ne le partage pas avec les fournisseurs de modèles. Un modèle personnalisé par réglage précis est privé pour le compte qui l'a créé.

<!-- section: cost-tradeoffs | objectives: 2.3.4 -->
## Les compromis de coûts des services AWS d'IA générative

| Option | Comment vous payez | Compromis |
| --- | --- | --- |
| **À la demande (tarification par jeton)** | Par jeton d'entrée et de sortie, sans engagement | Souple et économique pour un trafic variable ou faible ; soumis aux quotas du compte |
| **Inférence par lots** | Un prix inférieur à celui de l'inférence à la demande pour certains modèles | Résultats asynchrones ; pas pour un usage interactif |
| **Niveaux de service (service tiers)** | Priority (prix majoré), Standard (par défaut), Flex (remise), Reserved (prix mensuel fixe pour des jetons par minute réservés) | Priority donne les réponses les plus rapides pour les applications destinées aux clients ; Flex convient aux charges qui tolèrent un traitement plus long ; Reserved garantit la capacité des applications critiques |
| **Provisioned Throughput** | Prix horaire par unité de modèle, sans engagement ou avec un engagement d'un mois ou de six mois (prix horaire plus bas) | Débit garanti et constant pour un gros volume régulier ; vous payez même sans trafic |
| **Inférence interrégionale (cross-Region inference)** | Les requêtes sont routées vers d'autres Régions d'une zone géographique ou du monde entier | Débit et disponibilité plus élevés pendant les pics ; les données sont traitées dans la Région de destination |
| **Modèles personnalisés** | Entraînement (jetons traités × époques), stockage mensuel du modèle, puis inférence par Provisioned Throughput ou par un déploiement à la demande du modèle personnalisé | Meilleure adaptation au domaine, mais des coûts fixes en plus ; essayez d'abord l'ingénierie de requête et le RAG |

Autres facteurs : la **couverture régionale** (tous les modèles ne sont pas proposés dans toutes les Régions, et les prix varient selon la Région), la **réactivité** (les grands modèles et les longues sorties sont plus lents), la **disponibilité et la redondance** (la capacité réservée ou l'inférence interrégionale coûtent plus mais absorbent les pics) et les **performances** (un modèle plus performant coûte plus cher par jeton).

> **Conseil d'examen.** « Gros volume prévisible et constant avec débit garanti », c'est Provisioned Throughput. « Trafic variable, ne payer que ce qui est utilisé », c'est l'inférence à la demande. « Traiter 1 million de documents pendant la nuit au coût le plus bas », c'est l'inférence par lots.

<!-- section: key-points -->
## Points clés

- Bedrock : des FM par API, sans serveur, avec Knowledge Bases, Guardrails, Prompt Management, Model Evaluation et la personnalisation.
- SageMaker AI construit et héberge vos propres modèles ; JumpStart fournit des modèles préentraînés à déployer et à personnaliser par réglage précis.
- Quick sert les utilisateurs métier, Kiro les développeurs, Strands Agents construit des agents, AgentCore les exécute en production.
- Bedrock n'utilise pas votre contenu pour améliorer les modèles de base ; le chiffrement, IAM, PrivateLink et les programmes de conformité sécurisent les charges d'IA générative.
- À la demande pour un trafic variable, par lots pour les volumes hors ligne, Provisioned Throughput pour un débit régulier garanti ; les modèles personnalisés ajoutent des coûts d'entraînement, de stockage et d'hébergement.
