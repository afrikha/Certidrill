AWS propose l'IA et le machine learning à deux niveaux : des services d'IA prêts à l'emploi que vous appelez par une API sans expertise en ML, et Amazon SageMaker AI pour construire vos propres modèles. Les services analytiques ingèrent, cataloguent, interrogent et visualisent les données. L'examen vous donne une tâche (détecter des visages, convertir la parole en texte, interroger des fichiers dans S3, créer un tableau de bord) et vous demande quel service l'accomplit.

<!-- section: ai-ml-services | objectives: 3.7.1, 3.7.3 -->
## Services IA/ML d'AWS et tâches qu'ils accomplissent

| Tâche | Service |
| --- | --- |
| Construire, entraîner et déployer des modèles de machine learning personnalisés | **Amazon SageMaker AI** |
| Interfaces conversationnelles (chatbots) vocales et textuelles | **Amazon Lex** |
| Transformer du texte en parole réaliste | **Amazon Polly** |
| Convertir la parole en texte (transcription d'appels, sous-titres) | **Amazon Transcribe** |
| Traduire du texte d'une langue à une autre | **Amazon Translate** |
| Trouver le sentiment, les entités, les expressions clés, la langue ou les données personnelles d'un texte | **Amazon Comprehend** |
| Détecter objets, personnes, visages, texte et contenu inapproprié dans des images et des vidéos | **Amazon Rekognition** |
| Extraire le texte imprimé et manuscrit, les formulaires et les tableaux de documents numérisés | **Amazon Textract** |
| Assistant d'IA générative pour le développement logiciel | **Amazon Q Developer** |

- Les **services d'IA** (Lex, Polly, Transcribe, Translate, Comprehend, Rekognition, Textract) utilisent des modèles entraînés par AWS : vous envoyez des données par une API et obtenez un résultat. Choisissez-les pour un effort minimal.
- **Amazon SageMaker AI** s'adresse aux data scientists et aux développeurs qui ont besoin de leur propre modèle : il couvre la préparation des données, l'entraînement, le réglage, le déploiement et la surveillance des modèles.
- **Amazon Q Developer** aide les développeurs à comprendre, construire, étendre et exploiter des applications AWS : conversation sur le code, suggestions de code en ligne, analyse de sécurité et mises à niveau du code dans l'IDE et en ligne de commande. Dans l'AWS Management Console, son expérience conversationnelle s'appelle désormais l'AWS assistant.
- **Amazon Q Business** n'est plus ouvert aux nouveaux clients ; AWS les oriente vers Amazon Quick.

| Paire que l'examen confond | Comment les distinguer |
| --- | --- |
| Polly et Transcribe | Polly : du texte vers la parole. Transcribe : de la parole vers le texte |
| Lex et Polly | Lex comprend une conversation (intention) ; Polly ne fait que parler |
| Textract et Rekognition | Textract : documents, formulaires, tableaux. Rekognition : images et vidéos, visages et objets |
| Comprehend et Translate | Comprehend analyse le sens d'un texte ; Translate change sa langue |

> **Piège d'examen.** « Analyser le sentiment des avis clients avec un effort minimal », c'est Amazon Comprehend, et non un modèle construit dans SageMaker AI. Ne choisissez SageMaker AI que si l'entreprise doit construire ou entraîner son propre modèle.

<!-- section: analytics-services | objectives: 3.7.2, 3.7.4 -->
## Services analytiques d'AWS

| Service | Ce qu'il fait | Choisissez-le quand |
| --- | --- | --- |
| **Amazon Athena** | Requêtes SQL interactives sans serveur directement sur les données d'Amazon S3 ; vous payez les requêtes que vous exécutez | Analyse ponctuelle de journaux ou d'un lac de données sans charger les données ni gérer de serveurs |
| **Amazon Kinesis** | Collecte et traite des données de streaming en temps réel (Kinesis Data Streams) ; le service associé Amazon Data Firehose livre les flux vers S3, Redshift ou OpenSearch | Flux de clics, télémétrie IoT, journaux d'application analysés à leur arrivée |
| **AWS Glue** | Intégration de données sans serveur : les robots d'exploration (crawlers) découvrent les données, le Data Catalog stocke les définitions de tables, les tâches ETL transforment les données | Préparer et transformer des données (extraction, transformation, chargement) sans clusters |
| **Amazon Quick** | Service fondé sur l'IA issu d'Amazon QuickSight ; sa fonctionnalité Quick Sight fournit des tableaux de bord interactifs et de l'informatique décisionnelle, intégrables dans des applications si besoin | Les utilisateurs métier ont besoin de tableaux de bord et de visualisations |
| **Amazon EMR** | Frameworks big data gérés comme Apache Spark et Hadoop | Traitement à grande échelle avec des outils big data open source |
| **Amazon Redshift** | Entrepôt de données cloud pour l'analytique SQL sur de grands jeux de données structurées | Rapports sur des années de données consolidées depuis de nombreuses sources |
| **Amazon OpenSearch Service** | Recherche et analytique des journaux | Recherche en texte intégral, analytique des journaux et des opérations |

Un pipeline analytique typique :

| Étape | Services |
| --- | --- |
| Ingérer | Kinesis (streaming), DMS (bases de données), transferts de fichiers vers S3 |
| Stocker | Lac de données Amazon S3, Amazon Redshift |
| Cataloguer et transformer | AWS Glue |
| Interroger et traiter | Athena, EMR, Redshift |
| Visualiser | Amazon Quick |

La documentation AWS intitule désormais le service AWS Quick ; le guide d'examen utilise le nom Amazon Quick, et les supports plus anciens appellent la fonctionnalité de BI Amazon QuickSight.

> **Piège d'examen.** Athena interroge les données là où elles se trouvent déjà, dans S3, en SQL standard ; Redshift est un entrepôt dans lequel vous chargez les données ; Glue prépare les données mais ne crée pas de tableaux de bord ; Quick visualise mais ne stocke pas le lac de données. « Temps réel » ou « streaming » mène à Kinesis.

<!-- section: key-points -->
## Points clés

- Services d'IA selon l'entrée : texte vers parole (Polly), parole vers texte (Transcribe), langue (Translate), sens du texte (Comprehend), images et vidéos (Rekognition), documents (Textract), chatbots (Lex).
- SageMaker AI construit, entraîne et déploie des modèles personnalisés ; les services d'IA n'exigent aucune expertise en ML.
- Amazon Q Developer assiste les développeurs ; Amazon Q Business n'accepte plus de nouveaux clients.
- Athena : SQL sans serveur sur S3. Kinesis : streaming en temps réel. Glue : ETL sans serveur et Data Catalog. Quick : tableaux de bord et BI. EMR : Spark et Hadoop. Redshift : entrepôt de données. OpenSearch Service : recherche et analytique des journaux.
