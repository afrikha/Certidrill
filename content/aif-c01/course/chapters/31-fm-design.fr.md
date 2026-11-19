Concevoir une application sur un modèle de fondation, c'est choisir le modèle, ses paramètres d'inférence, l'ancrage éventuel des réponses par le RAG, l'endroit où stocker les intégrations, le degré de personnalisation du modèle et l'intervention éventuelle d'un agent. L'examen demande le choix qui répond à l'exigence au coût ou à l'effort le plus faible.

<!-- section: fm-selection-criteria | objectives: 3.1.1 -->
## Les critères de choix d'un modèle de fondation

| Critère | Ce qu'il faut vérifier |
| --- | --- |
| **Coût** | Prix par jeton d'entrée et de sortie ; les petits modèles coûtent moins cher |
| **Modalité** | Types d'entrée et de sortie : texte, images, documents, son, vidéo, intégrations |
| **Latence** | Délai avant le premier jeton et jusqu'à la réponse complète ; les petits modèles répondent plus vite |
| **Multilingue** | Les langues que le modèle maîtrise, en entrée comme en sortie |
| **Taille du modèle** | Nombre de paramètres : les grands modèles sont en général plus performants, plus lents et plus chers |
| **Complexité du modèle** | Capacité de raisonnement nécessaire : simple extraction ou analyse en plusieurs étapes |
| **Personnalisation** | Si le modèle prend en charge le peaufinage, le préentraînement continu ou la distillation dans Amazon Bedrock |
| **Longueur d'entrée/de sortie** | Taille de la fenêtre de contexte pour de longs documents ou un long historique ; nombre maximal de jetons de sortie pour de longues réponses |
| **Mise en cache des invites** | Si le modèle prend en charge la mise en cache des préfixes d'invite répétés, ce qui réduit le coût et la latence d'un long contexte réutilisé |

> **Conseil d'examen.** « Résumer des rapports de 300 pages en une seule requête » exige un modèle à grande fenêtre de contexte. « Un chatbot réutilise le même long manuel produit à chaque requête » profite d'un modèle qui prend en charge la mise en cache des invites.

<!-- section: inference-parameters | objectives: 3.1.2 -->
## Les paramètres d'inférence

Pour chaque jeton suivant, le modèle calcule une probabilité pour chaque candidat. Les paramètres d'inférence modifient les candidats pris en compte ou limitent la réponse :

| Paramètre | Effet | Réglage typique |
| --- | --- | --- |
| **Température** | Basse : le modèle choisit des jetons de forte probabilité, les réponses sont plus constantes et déterministes. Élevée : les jetons moins probables deviennent plus fréquents, les réponses sont plus variées et créatives | Basse pour les faits, la classification, l'extraction ; plus élevée pour le remue-méninges, les textes marketing |
| **Top-p** | Ne garde que les jetons les plus probables dont la probabilité cumulée atteint p (0,8 = les 80 % supérieurs de la masse de probabilité) | Plus bas pour une sortie ciblée |
| **Top-k** | Ne garde que les k jetons les plus probables (k = 50 : choisir parmi les 50 plus probables) | Plus bas pour une sortie plus sûre, moins surprenante |
| **Longueur maximale (max tokens)** | Plafonne le nombre de jetons de sortie | Courte pour une classification ou des réponses de chat ; longue pour des rapports |
| **Séquences d'arrêt (stop sequences)** | Le modèle arrête de générer quand il produit l'une de ces chaînes | Terminer proprement une réponse structurée |

La longueur de l'entrée compte aussi : une invite plus longue coûte plus cher et est plus lente, et une invite plus grande que la fenêtre de contexte doit être raccourcie. Une réponse coupée au milieu d'une phrase signifie que la longueur maximale est trop basse.

> **Piège d'examen.** « Les réponses doivent être identiques à chaque fois et s'en tenir à la formulation la plus probable » signifie baisser la température (ou top-p/top-k), pas l'augmenter. La température change le caractère aléatoire, pas les connaissances : elle ne corrige pas les hallucinations dues à une information manquante.

<!-- section: rag | objectives: 3.1.3 -->
## La génération à enrichissement contextuel (RAG)

Le RAG récupère des informations pertinentes dans une source de connaissances externe au moment de la requête et les ajoute à l'invite, pour que le modèle réponde à partir de données actuelles, propres à l'entreprise, sur lesquelles il n'a jamais été entraîné. Le modèle lui-même n'est pas modifié.

| Phase | Étapes |
| --- | --- |
| Ingestion | Charger les documents des sources de données, les découper en morceaux, convertir chaque morceau en intégration, stocker les vecteurs et le texte dans un magasin de vecteurs |
| Récupération | Convertir la question de l'utilisateur en intégration, trouver les morceaux les plus similaires (recherche sémantique), éventuellement les reclasser |
| Génération | Ajouter les morceaux récupérés à l'invite comme contexte ; le FM génère une réponse ancrée dans ces morceaux, avec des citations des sources |

**Amazon Bedrock Knowledge Bases** est le RAG géré d'Amazon Bedrock. Il se connecte à des sources de données comme Amazon S3, Confluence, SharePoint, Google Drive, OneDrive et un robot d'exploration web, prend en charge l'analyse, le découpage, les intégrations et le magasin de vecteurs, et renvoie des réponses avec citations. L'API Retrieve renvoie les morceaux pertinents ; RetrieveAndGenerate produit aussi la réponse. Il peut filtrer les résultats selon les autorisations des documents et interroger des données structurées.

Applications métier : assistants de support ancrés dans la documentation produit, assistants des employés sur les politiques RH, recherche dans les contrats et les manuels techniques.

> **Piège d'examen.** « Le modèle doit répondre à partir de documents qui changent chaque semaine, avec citations, sans réentraînement », c'est le RAG avec Knowledge Bases, pas le peaufinage. Le peaufinage change le comportement et le style du modèle ; c'est un mauvais moyen d'ajouter des faits qui changent souvent.

<!-- section: vector-databases | objectives: 3.1.4 -->
## Les services AWS pour stocker les intégrations

| Service | Capacité vectorielle | Choisissez-le quand |
| --- | --- | --- |
| **Amazon OpenSearch Service** | Recherche vectorielle (k-NN) dans des clusters gérés ou dans des collections de recherche vectorielle OpenSearch Serverless ; combine recherche vectorielle et par mots clés (hybride) | Recherche sémantique à faible latence à grande échelle, recherche hybride |
| **Amazon Aurora PostgreSQL** | L'extension pgvector stocke les intégrations à côté des données relationnelles | L'entreprise utilise déjà PostgreSQL et veut les vecteurs et les données métier dans une seule base |
| **Amazon RDS for PostgreSQL** | La même extension pgvector | Charges RDS for PostgreSQL existantes qui ajoutent une recherche de similarité |
| **Amazon Neptune** | Neptune Analytics combine les requêtes de graphe et la recherche vectorielle | Les relations entre entités comptent (GraphRAG, graphes de connaissances) |
| **Amazon S3 Vectors** | Des compartiments (buckets) vectoriels et des index vectoriels avec des requêtes en moins d'une seconde, paiement à l'usage | Grands jeux de vecteurs au coût de stockage le plus bas, requêtes moins fréquentes |
| **Amazon DocumentDB** | Recherche vectorielle dans une base de données de documents JSON | Applications qui stockent déjà leurs données sous forme de documents |

Bedrock Knowledge Bases prend en charge OpenSearch Serverless, les clusters gérés OpenSearch, S3 Vectors, Aurora PostgreSQL et Neptune Analytics, ainsi que des magasins tiers comme Pinecone, Redis Enterprise Cloud et MongoDB Atlas.

<!-- section: customization-costs | objectives: 3.1.5 -->
## Les compromis de coûts de la personnalisation d'un FM

Du moins cher au plus cher à mettre en place :

| Approche | Ce qu'elle change | Profil de coût |
| --- | --- | --- |
| **Apprentissage en contexte (ingénierie de requête, exemples few-shot)** | Seulement l'invite | Aucun coût d'entraînement ; chaque requête paie les jetons d'invite supplémentaires |
| **RAG** | Le contexte, avec des données récupérées | Coûts des intégrations, du magasin de vecteurs et de la récupération, plus des invites plus longues ; pas d'entraînement ; les données restent à jour |
| **Peaufinage (fine-tuning)** | Les poids du modèle, avec des exemples étiquetés de la tâche (paires invite et réponse) | Données étiquetées, entraînement facturé par jeton, stockage mensuel et hébergement du modèle personnalisé |
| **Distillation de modèles** | Un modèle élève plus petit est peaufiné sur les réponses d'un modèle enseignant plus grand | Inférence de l'enseignant et entraînement de l'élève une fois, puis une inférence moins chère et plus rapide avec une exactitude proche de l'enseignant pour le cas d'utilisation |
| **Préentraînement continu** | Les poids du modèle, avec de grandes quantités de données de domaine non étiquetées (textes médicaux, juridiques, financiers) | Plus de données et d'entraînement que le peaufinage, plus le stockage et l'hébergement |
| **Préentraînement à partir de zéro** | Tout : un nouveau modèle | Données, calcul et temps considérables ; rarement justifié hors des fournisseurs de modèles |

Commencez par l'ingénierie de requête, ajoutez le RAG pour les connaissances et ne personnalisez le modèle que si le comportement, le format ou le langage du domaine restent insuffisants.

> **Piège d'examen.** « Rendre un modèle moins cher et plus rapide pour un cas d'utilisation en gardant une qualité proche d'un grand modèle », c'est la distillation. « Apprendre le vocabulaire d'un domaine à partir de documents non étiquetés », c'est le préentraînement continu. « Des exemples étiquetés des réponses attendues », c'est le peaufinage.

<!-- section: ai-agents | objectives: 3.1.6 -->
## Le rôle des agents d'IA

Un agent d'IA va au-delà de la réponse : il reçoit un objectif, le décompose en étapes, décide quels outils et quelles sources de données utiliser, appelle des systèmes métier par des API, vérifie les résultats et continue jusqu'à la fin de la tâche, en demandant l'approbation d'un humain quand l'action est sensible.

| Application métier | Ce que fait l'agent |
| --- | --- |
| Service client | Vérifie une commande, applique la politique de retour et émet un remboursement |
| Assurance et finance | Rassemble les pièces d'un sinistre, vérifie la couverture et prépare la décision pour un gestionnaire |
| Opérations informatiques | Analyse une alerte, interroge les journaux et les métriques, propose ou applique un correctif |
| Développement logiciel | Planifie et implémente une fonctionnalité à partir de spécifications, exécute les tests (Kiro) |
| Recherche et rapports | Cherche dans plusieurs sources et rédige un rapport avec citations (Quick Research) |

Dans AWS, les développeurs écrivent des agents avec Strands Agents ou un autre framework et les exécutent sur Amazon Bedrock AgentCore ; les utilisateurs métier utilisent les agents d'Amazon Quick.

> **Piège d'examen.** Un chatbot qui se contente de répondre à des questions à partir de documents a besoin du RAG. Choisissez un agent quand le scénario exige des actions dans d'autres systèmes ou plusieurs étapes dépendantes.

<!-- section: key-points -->
## Points clés

- Choisissez un FM selon le coût, la modalité, la latence, les langues, la taille, la complexité, la personnalisation, la longueur d'entrée/de sortie et la mise en cache des invites.
- Température, top-p ou top-k bas : sortie constante ; élevés : sortie créative ; max tokens plafonne la longueur et le coût.
- Le RAG ancre les réponses dans des données actuelles sans réentraînement ; Bedrock Knowledge Bases gère l'ingestion, la récupération et les citations.
- Les vecteurs se stockent dans OpenSearch Service, Aurora ou RDS for PostgreSQL (pgvector), Neptune Analytics, S3 Vectors ou DocumentDB.
- Coût de mise en place de la personnalisation : ingénierie de requête, RAG, peaufinage, distillation, préentraînement continu, préentraînement ; la distillation réduit ensuite le coût d'inférence.
- Les agents planifient et agissent avec des outils ; utilisez-en un quand la tâche exige des actions, pas seulement des réponses.
