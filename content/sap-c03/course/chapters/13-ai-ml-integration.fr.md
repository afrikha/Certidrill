Le SAP-C03 aborde l'IA générative et le machine learning sous l'angle de l'architecture, pas de la science des données : comment des applications réparties sur de nombreux comptes accèdent aux modèles de fondation sous contrôle central, comment des agents appellent les outils de l'entreprise en toute sécurité, quelle option d'hébergement de l'inférence convient à un profil de trafic, et comment un pipeline de génération augmentée par récupération (RAG) ingère et récupère des documents. L'entraînement et le réglage des modèles sont hors périmètre ; les décisions portent sur l'accès, la capacité, l'isolation, le coût et la résidence des données.

<!-- section: genai-integration | objectives: 1.2.1 -->
## Intégration de l'IA générative et modèles multicomptes avec Amazon Bedrock

Les applications appellent les modèles Amazon Bedrock par l'API d'exécution (`InvokeModel`, ou `Converse` et `ConverseStream`, indépendantes du modèle). Le choix de capacité et de coût vient en premier :

| Besoin | Option Bedrock |
| --- | --- |
| Trafic variable, paiement au jeton | Inférence à la demande, niveau Standard (par défaut) |
| Réponses les plus rapides pour des appels face aux clients, sans réservation | Niveau Priority (`service_tier` à `priority`, prix majoré) |
| Charges qui tolèrent un traitement plus long (évaluations, résumés, tâches agentiques) avec une remise | Niveau Flex |
| Capacité critique réservée pour 1 ou 3 mois, débordement vers Standard | Niveau Reserved (par l'équipe de compte AWS) |
| Unités de modèle dédiées, par exemple pour des modèles personnalisés | Provisioned Throughput |
| Gros traitements hors ligne depuis S3 | Inférence par lots |

Le quota à la demande est partagé entre les niveaux Priority, Standard et Flex ; CloudWatch indique le niveau qui a réellement servi chaque requête.

L'**inférence entre Régions (cross-Region inference)** achemine les requêtes, par un profil d'inférence, vers des Régions qui ont de la capacité :

| | Profil géographique (US, EU, APAC...) | Profil global |
| --- | --- | --- |
| Lieu du traitement | Régions de la zone géographique | Toute Région commerciale prise en charge |
| Coût | Tarif standard | Environ 10 % d'économie |
| Exigence SCP | Autoriser chaque Région de destination du profil | Autoriser `aws:RequestedRegion` à la valeur `unspecified` |
| À choisir pour | Exigences de résidence des données | Coût et débit sans restriction géographique |

Le trafic entre Régions reste sur le réseau AWS et est chiffré en transit ; CloudTrail journalise l'appel dans la Région source, avec la Région de traitement dans `additionalEventData.inferenceRegion`. Les profils d'inférence ne prennent pas en charge Provisioned Throughput.

Les **profils d'inférence d'application** enveloppent un modèle ou un profil entre Régions dans une ressource balisable : balisez-en un par application ou par unité métier pour répartir les coûts Bedrock et suivre l'utilisation.

Conceptions multicomptes :

| Modèle | Fonctionnement | À choisir quand |
| --- | --- | --- |
| Compte de plateforme d'IA centralisé | Un compte détient l'accès aux modèles, les garde-fous, la journalisation et les quotas ; les comptes de charge de travail l'appellent par une API (API Gateway avec IAM ou un mécanisme d'autorisation Lambda, ou un point de terminaison privé) | Contrôle central des coûts, un seul endroit pour auditer les invites, quotas partagés |
| Décentralisé avec garde-fous d'organisation | Chaque compte appelle Bedrock directement ; des SCP n'autorisent que les ID de modèle et les Régions approuvés ; les politiques Amazon Bedrock d'AWS Organizations imposent une version de garde-fou à chaque appel d'inférence dans les OU auxquelles elles sont attachées | Les équipes gèrent leurs quotas et budgets, mais les règles de conformité doivent s'appliquer partout |

Contrôles complémentaires : points de terminaison de VPC d'interface pour l'exécution Bedrock, afin que les appels n'utilisent jamais Internet, journalisation des invocations de modèles vers CloudWatch Logs et S3, et une clé KMS gérée par le client pour les données journalisées.

> **Piège d'examen.** Un profil d'inférence global peut traiter une requête dans n'importe quelle Région commerciale. Si l'énoncé exige que les données des clients européens soient traitées dans l'UE, choisissez un profil géographique EU et vérifiez que les SCP autorisent toutes ses Régions de destination, sinon les appels échouent avec un refus d'accès.

<!-- section: agents-tools | objectives: 1.2.2 -->
## Architectures d'agents d'IA avec Amazon Bedrock AgentCore

Un agent est un modèle dans une boucle qui planifie, appelle des outils, lit les résultats et décide de l'étape suivante. Il existe deux approches gérées :

- **Amazon Bedrock Agents** : un agent configuré avec des groupes d'actions (fonctions Lambda ou schémas OpenAPI) et des bases de connaissances attachées ; le moins de code pour un agent unique propre à Bedrock.
- **Amazon Bedrock AgentCore** : des services modulaires pour déployer et exploiter des agents construits avec n'importe quel framework (Strands Agents, LangGraph, CrewAI, LlamaIndex...) et n'importe quel modèle, dans Bedrock ou en dehors.

| Service AgentCore | Rôle dans l'architecture |
| --- | --- |
| Runtime | Hébergement sans serveur des agents et des outils ; chaque session s'exécute dans une microVM dédiée avec CPU, mémoire et système de fichiers isolés, jusqu'à 8 heures (arrêt après 15 minutes d'inactivité) ; protocoles HTTP, MCP et A2A ; authentification entrante par IAM SigV4 ou jetons OAuth 2.0 |
| Gateway | Transforme des API (OpenAPI, Smithy), des fonctions Lambda et des services existants en outils MCP derrière un point de terminaison unique, connecte des serveurs MCP existants, offre une recherche sémantique d'outils et gère l'authentification entrante et sortante |
| Identity | Identité et informations d'identification des agents : valide les jetons des utilisateurs émis par les fournisseurs d'identité existants et obtient des jetons OAuth ou des clés d'API pour appeler les outils au nom d'un utilisateur ou de façon autonome |
| Memory | Mémoire à court terme pour les sessions à plusieurs tours et mémoire à long terme partagée entre sessions et agents |
| Policy | Règles déterministes, vérifiées par la Gateway à chaque appel d'outil, sur les outils qu'un agent peut utiliser et dans quelles conditions (langage de politique compatible avec Cedar) |
| Code Interpreter et Browser | Exécution de code en bac à sable et navigateur cloud géré pour les tâches web |
| Observability et Evaluations | Traces compatibles OpenTelemetry de chaque étape dans CloudWatch ; évaluation automatisée de la qualité des sessions et de l'utilisation des outils |

Conception de référence pour un assistant d'entreprise : un front-end authentifie les utilisateurs avec Amazon Cognito ou le fournisseur d'identité de l'entreprise ; l'agent s'exécute dans AgentCore Runtime ; il n'atteint les systèmes internes que par des cibles AgentCore Gateway (une fonction Lambda pour le système de commandes, une cible OpenAPI pour le CRM) ; AgentCore Identity échange le jeton de l'utilisateur contre les informations d'identification en aval, pour que les outils appliquent les autorisations propres de l'utilisateur ; Policy bloque les remboursements au-delà d'un seuil ; Memory conserve la conversation ; une base de connaissances fournit les documents.

> **Piège d'examen.** L'état de session dans AgentCore Runtime est éphémère : la microVM est détruite à la fin de la session. « L'agent doit retenir les préférences d'un client d'une conversation à l'autre » désigne AgentCore Memory (long terme), pas une session plus longue ni un fichier dans l'environnement d'exécution.

<!-- section: ml-inference | objectives: 1.2.3 -->
## Architectures d'inférence ML avec Amazon SageMaker AI

Quand le modèle est le vôtre (ou un modèle à poids ouverts que vous hébergez), SageMaker AI propose quatre options d'inférence :

| Option | Limites | Descend à zéro | À choisir pour |
| --- | --- | --- | --- |
| Point de terminaison en temps réel | Charge utile jusqu'à 25 Mo ; 60 secondes pour les réponses classiques, 8 minutes en streaming | Seulement avec des composants d'inférence | Trafic en ligne régulier à faible latence ; GPU |
| Inférence sans serveur | Charge utile jusqu'à 4 Mo, 60 secondes ; mémoire de 1 024 à 6 144 Mo ; jusqu'à 200 invocations simultanées par point de terminaison | Oui (démarrages à froid ; simultanéité provisionnée facultative) | Trafic intermittent ou imprévisible qui tolère les démarrages à froid |
| Inférence asynchrone | Charge utile jusqu'à 1 Go, traitement jusqu'à 1 heure ; requêtes mises en file, résultats écrits dans S3 avec notifications SNS | Oui | Entrées volumineuses (documents, vidéo), traitements longs, files en rafales |
| Transformation par lots (batch transform) | Jeux de données de plusieurs Go, tâches de plusieurs jours, aucun point de terminaison | Sans objet | Notation hors ligne d'un jeu de données complet |

L'inférence sans serveur ne prend en charge ni les GPU, ni la configuration VPC, ni les points de terminaison multimodèles, ni la capture de données, ni plusieurs variantes de production. Un point de terminaison en temps réel ne descend à zéro instance que s'il héberge des **composants d'inférence**, avec un nombre minimal d'instances de 0 et une politique de mise à l'échelle par étapes déclenchée par la métrique `NoCapacityInvocationFailures` ; la remontée depuis zéro prend plusieurs minutes. Les composants d'inférence et les points de terminaison multimodèles regroupent aussi de nombreux modèles sur des instances partagées pour réduire les coûts.

Les points de terminaison se mettent à l'échelle avec Application Auto Scaling (suivi de cible sur les invocations par instance ou par copie). Pour mettre à jour un modèle sans risque, les **garde-fous de déploiement (deployment guardrails)** basculent le trafic en bleu/vert d'un seul coup, par canary ou de façon linéaire, surveillent des alarmes CloudWatch pendant une période de stabilisation (baking period) et reviennent automatiquement en arrière ; les déploiements propagés remplacent la capacité par lots. Les tests fantômes (shadow tests) envoient une copie du trafic de production à une nouvelle variante sans renvoyer ses réponses.

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace sagemaker \
  --resource-id inference-component/claims-scorer \
  --scalable-dimension sagemaker:inference-component:DesiredCopyCount \
  --min-capacity 0 --max-capacity 8
```

> **Conseil d'examen.** Utilisez Bedrock quand un modèle de fondation géré répond au besoin avec le LEAST operational overhead. Utilisez les points de terminaison SageMaker AI quand l'entreprise doit héberger son propre modèle entraîné, une version précise d'un modèle à poids ouverts, ou doit maîtriser les types d'instances et les GPU. « Les requêtes durent 20 minutes sur des entrées de 500 Mo » désigne l'inférence asynchrone ; « quelques appels par jour, coût quasi nul au repos » désigne l'inférence sans serveur.

<!-- section: rag-architecture | objectives: 1.2.4 -->
## Architectures RAG avec les bases de connaissances Amazon Bedrock

Le RAG ancre la réponse d'un modèle dans vos documents : récupérer les passages les plus pertinents, les ajouter à l'invite, générer avec des citations. Amazon Bedrock Knowledge Bases gère le pipeline.

L'**ingestion** s'exécute sous forme de tâches de synchronisation à partir de connecteurs de sources de données (Amazon S3, robot d'exploration web, Confluence, SharePoint, Salesforce, sources personnalisées) et se répète à chaque changement :

1. **Analyser.** L'analyseur par défaut extrait le texte ; un analyseur à base de modèle de fondation ou Bedrock Data Automation traite les tableaux, les figures et les pages numérisées.
2. **Découper.** Le découpage par défaut produit des segments d'environ 300 jetons en respectant les phrases ; le découpage de taille fixe définit les jetons par segment et le chevauchement ; le découpage hiérarchique récupère des segments enfants précis et renvoie leurs parents plus larges ; le découpage sémantique coupe selon le sens (coût de modèle supplémentaire) ; l'absence de découpage garde chaque fichier entier ; une fonction Lambda peut appliquer un découpage ou des transformations personnalisés.
3. **Vectoriser** avec un modèle d'embeddings (Amazon Titan Text Embeddings V2 : 1 024, 512 ou 256 dimensions ; Cohere Embed). La dimension de l'index vectoriel doit correspondre au modèle.
4. **Stocker** les vecteurs, les segments de texte et les métadonnées dans le magasin vectoriel.

| Magasin vectoriel | Points distinctifs |
| --- | --- |
| Amazon OpenSearch Serverless | Création rapide, recherche hybride, vecteurs binaires, filtres de métadonnées les plus riches |
| Cluster géré Amazon OpenSearch Service | Domaines existants ; vecteurs binaires ; le domaine doit avoir un accès public pour la base de connaissances |
| Amazon Aurora PostgreSQL (pgvector) | Recherche hybride, compétences SQL et bases existantes ; le cluster doit se trouver dans le compte de la base de connaissances |
| Amazon S3 Vectors | Stockage vectoriel durable le moins cher pour des requêtes peu fréquentes, latence inférieure à la seconde ; vecteurs flottants uniquement ; limites de taille des métadonnées par vecteur (évitez les grands segments hiérarchiques) |
| Amazon Neptune Analytics | GraphRAG : la récupération suit les relations entre entités |
| Pinecone, Redis Enterprise Cloud, MongoDB Atlas | Magasins tiers, informations d'identification dans Secrets Manager |

**Récupération.** `Retrieve` renvoie des segments (cinq au plus par défaut) pour votre propre invite ou agent ; `RetrieveAndGenerate` génère aussi la réponse avec des citations. Leviers de qualité :

| Problème | Levier |
| --- | --- |
| Termes exacts (codes produit, numéros d'erreur) manqués par la recherche sémantique | Recherche hybride (OpenSearch Serverless, Aurora/RDS, MongoDB avec un champ de texte filtrable) |
| Les utilisateurs ne doivent voir que les documents de leur locataire ou de leur service | Métadonnées dans des fichiers `.metadata.json`, filtres comme `equals` sur `tenantId` appliqués par l'application, jamais choisis par l'utilisateur |
| Segments pertinents trop mal classés | Un modèle de reclassement (reranker) sur les résultats récupérés |
| Questions en plusieurs parties | Décomposition de la requête en sous-requêtes |
| Les filtres doivent suivre la question (« rapports 2024 de l'équipe finance ») | Filtrage implicite des métadonnées à partir d'un schéma de métadonnées |
| Réponses nuisibles ou hors sujet | Un garde-fou Bedrock dans la configuration de génération |

```json
{
  "retrievalConfiguration": {
    "vectorSearchConfiguration": {
      "numberOfResults": 8,
      "overrideSearchType": "HYBRID",
      "filter": { "andAll": [
        { "equals": { "key": "tenantId", "value": "tenant-042" } },
        { "greaterThan": { "key": "year", "value": 2023 } }
      ] }
    }
  }
}
```

> **Piège d'examen.** Le filtrage par métadonnées n'est un contrôle d'accès que si l'application définit le filtre à partir de l'identité authentifiée. Pour une séparation stricte entre locataires dont les données ont des propriétaires différents, utilisez une base de connaissances par locataire (silo) ; un index partagé avec des filtres correspond au modèle pool.

<!-- section: key-points -->
## Points clés

- Capacité Bedrock : Standard à la demande, Priority pour la latence, Flex pour les tâches tolérantes à prix réduit, Reserved pour une capacité garantie, Provisioned Throughput pour des unités dédiées, inférence par lots pour les traitements hors ligne.
- Inférence entre Régions : les profils géographiques gardent le traitement dans une zone géographique (résidence des données), les profils globaux économisent environ 10 % et exigent `aws:RequestedRegion` à `unspecified` dans les SCP ; les profils d'inférence d'application balisent l'utilisation et les coûts.
- IA générative multicomptes : compte de plateforme central derrière une API, ou accès direct contrôlé par des SCP, des politiques Bedrock d'AWS Organizations qui imposent des garde-fous, des points de terminaison de VPC et la journalisation des invocations.
- AgentCore : Runtime (une microVM par session, jusqu'à 8 heures), Gateway (API et Lambda comme outils MCP), Identity (authentification entrante et sortante), Memory (court et long terme), Policy (règles sur les appels d'outils), Observability et Evaluations.
- SageMaker AI : temps réel pour une faible latence régulière et les GPU, sans serveur pour de petites charges utiles intermittentes, asynchrone pour les grosses charges utiles et les traitements longs, transformation par lots pour les jeux de données hors ligne ; garde-fous de déploiement pour des déploiements canary ou linéaires avec retour arrière automatique.
- RAG : analyser, découper, vectoriser, stocker ; choisir le magasin vectoriel selon les fonctions de recherche, le coût et les compétences ; améliorer la récupération par la recherche hybride, des filtres de métadonnées définis par l'application, le reclassement et la décomposition des requêtes.
