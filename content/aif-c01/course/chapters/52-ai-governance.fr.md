La gouvernance garantit que les systèmes d'IA continuent de respecter les politiques de l'organisation et les réglementations qui s'y appliquent, pendant toute leur vie. L'examen vous demande de distinguer les services AWS qui enregistrent, évaluent et prouvent la conformité (AWS Config, Amazon Inspector, AWS Artifact, AWS CloudTrail, AWS Trusted Advisor), de décrire des stratégies de gouvernance des données comme la résidence et la conservation, et de reconnaître les processus de gouvernance, dont la Generative AI Security Scoping Matrix (matrice de cadrage de la sécurité de l'IA générative).

<!-- section: governance-services | objectives: 5.2.1 -->
## Les services AWS pour la gouvernance et la conformité aux réglementations

| Service | Ce qu'il fait | Exigence typique |
| --- | --- | --- |
| **AWS Config** | Enregistre la configuration des ressources AWS et son historique, et l'évalue en continu par rapport à des règles (gérées ou personnalisées, regroupées en packs de conformité) | « Détecter les compartiments S3 de données d'entraînement non chiffrés » ou « montrer comment cette ressource était configurée le mois dernier » |
| **Amazon Inspector** | Analyse automatiquement et en continu les instances EC2, les images de conteneur ECR et les fonctions Lambda pour détecter les vulnérabilités logicielles et une exposition réseau non souhaitée | « Trouver les paquets vulnérables dans le conteneur qui héberge le modèle » |
| **AWS Artifact** | Portail à la demande des rapports de conformité d'AWS (par exemple SOC, ISO, PCI) et des accords avec AWS | « Fournir aux auditeurs le rapport SOC 2 d'AWS » ou « examiner et accepter un accord avec AWS » |
| **AWS CloudTrail** | Enregistre les appels d'API et l'activité du compte : qui a fait quoi, quand, d'où | « Qui a modifié la barrière de protection ? » ou « quel rôle a invoqué le modèle ? » |
| **AWS Trusted Advisor** | Contrôle le compte par rapport aux bonnes pratiques en optimisation des coûts, performances, sécurité, tolérance aux pannes, limites de service et excellence opérationnelle | « Obtenir des recommandations, comme des groupes de sécurité ouverts ou des ressources sous-utilisées » |

- Amazon Bedrock entre dans le périmètre de programmes de conformité comme SOC 1, 2 et 3 et ISO 27001, et est éligible HIPAA ; les rapports eux-mêmes s'obtiennent dans AWS Artifact.
- La conformité de l'infrastructure AWS est la part d'AWS dans le modèle de responsabilité partagée ; la conformité de l'application d'IA et des données du client reste celle du client.

> **Piège d'examen.** Config = configuration et conformité des **ressources** ; CloudTrail = **actions** des utilisateurs et des rôles ; Inspector = **vulnérabilités** logicielles ; Artifact = documents de conformité **d'AWS** ; Trusted Advisor = **recommandations de bonnes pratiques**. Aucun d'eux n'évalue le contenu des invites ou des sorties du modèle.

<!-- section: data-governance | objectives: 5.2.2 -->
## Les stratégies de gouvernance des données

| Stratégie | Pratiques et fonctionnalités AWS |
| --- | --- |
| **Cycle de vie des données** | Définissez les étapes de la collecte à la suppression : classifiez les données à leur création, déplacez-les vers des classes de stockage moins chères et supprimez-les quand elles ne sont plus nécessaires, avec les règles S3 Lifecycle et Amazon S3 Glacier |
| **Journalisation** | CloudTrail pour l'activité des API ; journalisation des invocations de modèle d'Amazon Bedrock pour les invites et les réponses ; journaux d'accès des magasins de données |
| **Résidence** | Gardez les données dans les Régions AWS qu'exige la réglementation ; Amazon Bedrock traite les données dans la Région que vous appelez, et l'inférence interrégionale avec un profil d'inférence **géographique** (US, EU, APAC) garde le traitement dans cette zone géographique, alors qu'un profil **global** peut acheminer vers n'importe quelle Région commerciale prise en charge |
| **Surveillance** | Métriques, journaux et alarmes Amazon CloudWatch (par exemple, invocations et nombre de jetons) ; règles Config pour détecter l'écart par rapport aux configurations approuvées |
| **Observation** | Une visibilité continue sur le comportement du système d'IA en production : tendances de qualité, de sûreté et d'usage, commentaires des utilisateurs, évaluations périodiques |
| **Conservation** | Ne conservez les données et les journaux que le temps exigé par la politique et la loi : paramètres de conservation de CloudWatch Logs, expiration S3 Lifecycle, S3 Object Lock quand les enregistrements ne doivent être ni modifiés ni supprimés |

- Centralisez les autorisations et les catalogues des données d'analytique et d'IA avec AWS Lake Formation et l'AWS Glue Data Catalog.
- Classifiez les données (publiques, internes, confidentielles, personnelles) et appliquez des contrôles par classe ; Amazon Macie aide à trouver les données personnelles dans S3.

> **Conseil d'examen.** « Les invites ne doivent jamais être traitées hors de l'UE » = une Région de l'UE et, si vous utilisez l'inférence interrégionale, un profil d'inférence géographique EU, pas un profil global. CloudTrail journalise les requêtes d'inférence interrégionale dans la Région source.

<!-- section: governance-protocols | objectives: 5.2.3 -->
## Les processus pour suivre les protocoles de gouvernance

- **Politiques** : des règles écrites sur l'usage acceptable de l'IA, le traitement des données, l'approbation des modèles, la supervision humaine et la réponse aux incidents.
- **Cadence des examens** : des examens à des moments définis (avant le lancement, après chaque changement de modèle ou d'invite) et périodiques (par exemple trimestriels), plus des examens déclenchés par des incidents ou de nouvelles réglementations.
- **Stratégies de révision** : revue technique (évaluations, tests de sécurité, red teaming), revue juridique et de conformité, revue éthique et d'équité, revue métier ; des réviseurs indépendants pour les systèmes à risque élevé.
- **Normes de transparence** : fiches de modèle, AI Service Cards, information des utilisateurs qu'ils interagissent avec une IA, limites documentées.
- **Exigences de formation des équipes** : formez ceux qui construisent et ceux qui utilisent à l'IA responsable, aux risques de sécurité comme l'injection d'invite, à la confidentialité des données et aux politiques de l'organisation.

**Cadres de gouvernance.** La **Generative AI Security Scoping Matrix** classe une charge de travail d'IA générative selon la part du modèle et des données que l'organisation possède, ce qui détermine ses responsabilités de sécurité :

| Périmètre | Description | Exemple |
| --- | --- | --- |
| **1. Consumer app (application grand public)** | Un service public d'IA générative tiers, aux conditions du fournisseur | Des employés utilisent un chatbot public |
| **2. Enterprise app (application d'entreprise)** | Une application d'entreprise tierce dotée de fonctionnalités d'IA générative, sous un contrat d'entreprise | Un outil SaaS avec un assistant d'IA intégré |
| **3. Pre-trained models (modèles préentraînés)** | Votre application construite sur un FM existant via une API, sans modifier le modèle | Une application qui appelle un modèle sur Amazon Bedrock |
| **4. Fine-tuned models (modèles peaufinés)** | Un FM existant adapté avec vos données métier | Un modèle peaufiné dans Amazon Bedrock avec des données de l'entreprise |
| **5. Self-trained models (modèles autoentraînés)** | Un modèle entraîné à partir de zéro sur des données que vous possédez ou acquérez | Un modèle préentraîné sur SageMaker AI |

La matrice applique cinq disciplines de sécurité à chaque périmètre : gouvernance et conformité, juridique et confidentialité, gestion des risques, contrôles, et résilience. Les périmètres 1 et 2 consomment un service tiers ; les périmètres 3 à 5 s'appuient sur un modèle ou en créent un, et les responsabilités de l'organisation augmentent avec le périmètre.

> **Piège d'examen.** Appeler un modèle de fondation par l'API d'Amazon Bedrock sans le personnaliser relève du périmètre 3 (modèles préentraînés), pas du périmètre 2 : le périmètre 2 est une application tierce finie. Le peaufinage fait passer la charge de travail au périmètre 4.

<!-- section: key-points -->
## Points clés

- Config : configuration des ressources et règles de conformité. Inspector : vulnérabilités. Artifact : rapports de conformité et accords d'AWS. CloudTrail : qui a fait quoi. Trusted Advisor : contrôles de bonnes pratiques.
- Gouvernance des données : cycle de vie, journalisation, résidence, surveillance, observation, conservation.
- Résidence avec Bedrock : choisissez la Région ; les profils d'inférence interrégionale géographiques restent dans leur zone, les profils globaux non.
- Processus de gouvernance : politiques, cadence des examens, stratégies de révision, normes de transparence, formation des équipes.
- Generative AI Security Scoping Matrix : consumer app, enterprise app, pre-trained models, fine-tuned models, self-trained models.
