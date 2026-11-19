Un système d'IA présente la surface d'attaque habituelle du cloud (identités, données, réseau) et de nouvelles surfaces : les invites, les données d'entraînement et de récupération, les sorties du modèle et les agents qui appellent des outils. L'examen vous demande d'associer une exigence de sécurité à un service ou une fonctionnalité AWS, de décrire la traçabilité des données et la citation des sources, d'appliquer les bonnes pratiques d'ingénierie sécurisée des données et de choisir les contrôles contre l'injection d'invite, la fuite de données et les hallucinations.

<!-- section: ai-security-services | objectives: 5.1.1 -->
## Les services et fonctionnalités AWS pour sécuriser les systèmes d'IA

| Exigence | Service ou fonctionnalité |
| --- | --- |
| N'accorder à une application, un utilisateur ou un agent que le modèle, la base de connaissances ou les données dont il a besoin | Rôles, politiques et autorisations **IAM**, avec le moindre privilège |
| Chiffrer au repos les données, les modèles personnalisés et les bases de connaissances avec des clés que vous contrôlez | Chiffrement avec des clés gérées par le client **AWS KMS** ; les données dans Amazon Bedrock sont toujours chiffrées en transit et au repos |
| Trouver les données personnelles ou sensibles dans les compartiments S3 utilisés pour l'entraînement ou le RAG | **Amazon Macie** |
| Appeler Amazon Bedrock depuis un VPC sans passer par Internet | **AWS PrivateLink** (point de terminaison d'interface d'un VPC) |
| Savoir qui sécurise quoi | **Modèle de responsabilité partagée AWS** |
| Donner une identité aux agents et gérer les informations d'identification qu'ils utilisent pour accéder à AWS et à des services tiers au nom des utilisateurs | **Amazon Bedrock AgentCore Identity** |
| Contrôler quels outils un agent peut appeler, avec quels paramètres et pour quel utilisateur | **Policy dans AgentCore** |
| Filtrer les contenus nuisibles, les attaques d'invite et les informations sensibles en entrée et en sortie | **Amazon Bedrock Guardrails** |

- **Responsabilité partagée pour l'IA générative** : AWS sécurise l'infrastructure et le service Amazon Bedrock ; le client sécurise ses applications, ses données, ses autorisations IAM, ses invites et ses sorties. L'injection d'invite est un risque applicatif qui relève du client.
- Avec Amazon Bedrock, vos invites et complétions ne servent pas à améliorer les modèles de base et ne sont pas partagées avec les fournisseurs de modèles.
- **Policy dans AgentCore** intercepte les appels d'outils au niveau d'AgentCore Gateway et évalue chacun par rapport à des politiques écrites en Cedar (les règles peuvent être rédigées en langage naturel puis traduites). L'application se fait en dehors du code de l'agent : un agent manipulé ne peut pas la contourner.

> **Piège d'examen.** AgentCore Identity répond à « qui est l'agent et quelles informations d'identification peut-il utiliser » ; Policy dans AgentCore répond à « quel appel d'outil est autorisé » ; Guardrails répond à « ce contenu est-il acceptable ». IAM contrôle l'accès aux ressources AWS, pas le contenu d'une invite.

<!-- section: source-citation-lineage | objectives: 5.1.2 -->
## Citation des sources et documentation de l'origine des données

- **Citation des sources** : une réponse d'IA générative indique les documents sur lesquels elle s'appuie. Amazon Bedrock Knowledge Bases renvoie, avec une réponse générée, des citations vers les passages sources, pour que les utilisateurs puissent vérifier la réponse.
- **Traçabilité des données (data lineage)** : l'enregistrement de la provenance des données et de chaque transformation qu'elles subissent, jusqu'au modèle entraîné sur elles et aux prédictions qu'il produit. La traçabilité permet les audits, la reproductibilité et l'analyse d'une mauvaise sortie.
- **Catalogage des données** : un inventaire des jeux de données avec leur schéma, leur propriétaire, leur classification et leur emplacement, comme l'AWS Glue Data Catalog, qui rend les données découvrables et gouvernables.
- **Amazon SageMaker Model Cards** : documente les jeux de données d'entraînement, les détails d'entraînement, les usages prévus et les résultats d'évaluation d'un modèle.

> **Conseil d'examen.** « Les utilisateurs doivent pouvoir vérifier de quel document vient une réponse » = citation des sources (RAG avec citations). « Les auditeurs doivent retracer les données utilisées pour entraîner un modèle » = traçabilité des données et documentation du modèle.

<!-- section: secure-data-engineering | objectives: 5.1.3 -->
## Les bonnes pratiques d'ingénierie sécurisée des données

| Pratique | Comment |
| --- | --- |
| **Évaluer la qualité des données** | Profilez et validez les données avant l'entraînement ou l'indexation : complétude, exactitude, doublons, fraîcheur (par exemple avec AWS Glue DataBrew ou des règles de qualité des données AWS Glue) |
| **Technologies améliorant la confidentialité** | Supprimez ou masquez les données personnelles, pseudonymisez ou tokenisez les identifiants, anonymisez ou agrégez les enregistrements, chiffrez les données ; détectez les PII avec Amazon Macie dans S3, Amazon Comprehend dans le texte, ou les filtres d'informations sensibles de Guardrails à l'exécution |
| **Contrôle de l'accès aux données** | Politiques IAM de moindre privilège, politiques de compartiment S3, autorisations fines d'AWS Lake Formation sur les tables du lac de données, séparation des données d'entraînement, de test et de production |
| **Intégrité des données** | Protégez les données contre toute modification non autorisée : gestion des versions, stockage à écriture unique si nécessaire, sommes de contrôle, et journalisation de chaque accès et modification |

<!-- section: ai-security-privacy | objectives: 5.1.4 -->
## Considérations de sécurité et de confidentialité des systèmes d'IA

| Considération | Contrôles |
| --- | --- |
| **Sécurité des applications** | Validation des entrées, codage sécurisé, moindre privilège, tests de sécurité de l'application |
| **Détection des menaces** | Surveillez l'activité des API dans AWS CloudTrail et l'utilisation dans Amazon CloudWatch ; alarmes sur un volume d'invocations inhabituel ; détection des attaques d'invite par Guardrails |
| **Gestion des vulnérabilités** | **Amazon Inspector** analyse les instances Amazon EC2, les images de conteneur d'Amazon ECR et les fonctions AWS Lambda pour détecter les vulnérabilités logicielles et l'exposition réseau |
| **Protection de l'infrastructure** | VPC, sous-réseaux privés, groupes de sécurité, points de terminaison AWS PrivateLink |
| **Injection d'invite** | Filtre prompt attack de Guardrails, séparation des instructions et des entrées utilisateur, moindre privilège pour les outils qu'un agent peut utiliser |
| **Chiffrement au repos et en transit** | Clés AWS KMS ; TLS (Amazon Bedrock exige TLS 1.2 et recommande TLS 1.3) |
| **Prévention de la fuite de données** | Filtres d'informations sensibles de Guardrails (bloquer ou masquer les PII), aucun secret ni donnée personnelle dans les invites et les données d'entraînement, IAM limité à chaque base de connaissances |
| **Filtrage et validation des résultats** | Filtres de contenu, sujets refusés et vérifications d'ancrage de Guardrails ; validation du format et des valeurs avant qu'un autre système n'utilise la sortie |
| **Piste d'audit et journalisation** | **CloudTrail** enregistre les appels d'API d'Amazon Bedrock (qui, quand, quel modèle) ; la **journalisation des invocations de modèle** (model invocation logging) enregistre les invites, les réponses et le nombre de jetons dans CloudWatch Logs ou Amazon S3 ; elle est désactivée par défaut |
| **Toxicité** | Filtres de contenu de Guardrails (hate, insults, sexual, violence, misconduct) ; évaluation de la toxicité avant le déploiement |

> **Piège d'examen.** CloudTrail vous indique qu'un utilisateur a appelé `InvokeModel` ; il ne contient pas l'invite ni la réponse. Pour conserver le contenu des interactions d'IA à des fins d'audit, activez la journalisation des invocations de modèle d'Amazon Bedrock.

<!-- section: hallucination-grounding | objectives: 5.1.5 -->
## Détecter les hallucinations et ancrer les sorties

| Technique | Comment elle améliore l'exactitude |
| --- | --- |
| **Ancrage par RAG** | Récupérez des passages pertinents dans des sources fiables (Amazon Bedrock Knowledge Bases) et demandez au modèle de répondre uniquement à partir d'eux, avec des citations |
| **Vérification d'ancrage contextuel** | Une politique de Guardrails qui note chaque réponse pour l'**ancrage** (grounding : étayée par la source) et la **pertinence** (relevance : répond à la requête), de 0 à 1 ; les réponses sous le seuil que vous fixez (de 0 à 0,99) sont bloquées ou signalées |
| **Automated Reasoning checks** | Guardrails valide les réponses par rapport à des règles logiques construites à partir de vos documents de politique, et peut suggérer des corrections |
| **Validation des sorties** | Vérifiez faits, nombres et formats par rapport aux systèmes de référence, aux schémas ou aux règles métier avant usage ; revue humaine pour les sorties à risque élevé |
| **Score de confiance** | Utilisez des scores (ancrage, pertinence, scores du modèle ou du juge) pour accepter, signaler ou transmettre à une personne les réponses à faible confiance |

Autres leviers : baisser la température pour les tâches factuelles, demander au modèle de dire quand il ne sait pas, et évaluer la fidélité avec les évaluations Amazon Bedrock avant la mise en production.

> **Conseil d'examen.** « Bloquer les réponses non étayées par les documents récupérés dans un chatbot RAG » = vérification d'ancrage contextuel de Guardrails. « Les réponses doivent provenir des documents actuels de l'entreprise » = RAG avec Knowledge Bases.

<!-- section: key-points -->
## Points clés

- Moindre privilège IAM, chiffrement KMS, Macie pour les données sensibles dans S3, PrivateLink pour un accès privé, Guardrails pour le contenu.
- AgentCore Identity : identité et informations d'identification de l'agent ; Policy dans AgentCore : appels d'outils autorisés, appliqués au niveau de la Gateway avec Cedar.
- Bedrock n'utilise pas vos invites pour entraîner les modèles de base et ne les partage pas avec les fournisseurs ; l'injection d'invite relève de la responsabilité du client.
- Citation des sources, traçabilité des données, catalogage des données et fiches de modèle documentent l'origine des données.
- CloudTrail = appels d'API ; journalisation des invocations de modèle = invites et réponses (désactivée par défaut) ; Inspector = vulnérabilités.
- Hallucinations : ancrage par RAG, vérification d'ancrage contextuel, Automated Reasoning checks, validation des sorties, score de confiance.
