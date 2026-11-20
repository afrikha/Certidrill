Le DVA-C03 est un examen de développeur. Les questions décrivent une application qui tourne déjà sur AWS (une fonction Lambda derrière API Gateway, un consommateur de file d'attente, une table DynamoDB, un pipeline de déploiement) et un problème : une erreur, une autorisation manquante, un appel lent, une exigence que le code ne remplit pas encore. Vous choisissez l'appel d'API, le paramètre du kit SDK, la configuration de la source d'événements, l'instruction de politique ou l'option de déploiement qui le résout. Ce chapitre présente le format, une méthode pour lire les questions et le code qu'elles montrent, les habitudes que l'examen récompense, les services dont le statut a changé en 2026 et les paires de fonctionnalités à distinguer.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | AWS Certified Developer – Associate |
| Code d'examen | DVA-C03, à partir du 1er décembre 2026 (le DVA-C02 reste en vigueur jusqu'au 30 novembre 2026) ; le guide n'indique aucun numéro de version |
| Durée | 130 minutes |
| Questions | 65 : 50 notées et 15 non notées, qui ne sont pas signalées |
| Score | Échelle de 100 à 1 000 ; 720 pour réussir |
| Modèle de notation | Compensatoire : seul le score total compte, il n'y a pas de seuil par domaine |
| Réponses fausses ou vides | Une question sans réponse compte comme fausse et il n'y a pas de pénalité pour une réponse au hasard : répondez toujours |
| Langues | Anglais, japonais, coréen, portugais (Brésil), chinois simplifié, espagnol (Amérique latine) ; l'examen n'est pas proposé en français |

Les quatre domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Développement avec les services AWS | 30 % |
| Sécurité | 26 % |
| Tests et déploiement | 22 % |
| Dépannage et optimisation | 22 % |

Il n'existe que deux types de questions. Le **choix multiple** a une seule bonne réponse parmi quatre options (environ 80 % des questions). La **réponse multiple** se termine par « Choose two. » ou « Choose three. » et compte deux bonnes réponses parmi cinq options, ou trois parmi six ; elle ne rapporte le point que si toutes les réponses choisies sont correctes. Il n'y a ni étude de cas, ni liste déroulante, ni glisser-déposer, ni laboratoire.

Par rapport au DVA-C02, le nouveau guide ajoute des sujets d'IA : sécuriser les appels aux services d'IA (accès, connectivité privée, filtrage de contenu, masquage des PII, injection d'invites, autorisation des outils des agents), le codage assisté par l'IA, les services d'IA gérés dans les applications, et les outils d'IA dans les tests, le CI/CD, le dépannage et l'optimisation. Il ajoute aussi les URL présignées, les images de conteneur et les déploiements sur Amazon ECS, Amazon EKS et AWS Fargate. La conception d'architectures ou de pipelines, l'administration des utilisateurs IAM, le choix des modèles de fondation, l'ingénierie de requête (prompt engineering) et la conception de garde-fous restent hors périmètre.

> **Conseil d'examen.** Comme vous ne pouvez pas savoir quelles sont les 15 questions non notées, traitez chaque question comme si elle comptait. Les examens blancs Certidrill notent les 65 questions.

<!-- section: reading-questions -->
## Lire une question de développeur

Un énoncé compte deux à cinq phrases : une entreprise (« AnyCompany »), son application, une exigence ou un symptôme, puis un qualificatif décisif et la question « Which solution will meet these requirements? ». En général, deux options fonctionneraient ; le qualificatif les départage. Procédez dans cet ordre :

1. Lisez d'abord les deux dernières phrases : le qualificatif et ce que vous devez choisir (une modification de code, une configuration, une autorisation).
2. Relevez chaque contrainte, y compris celles cachées dans le contexte (« la fonction s'exécute dans un VPC », « les messages doivent être traités dans l'ordre », « l'équipe ne peut pas modifier le client »).
3. Éliminez chaque option qui manque une contrainte, même mineure.
4. Appliquez le qualificatif aux options restantes.

| Mots de l'énoncé | Ce qu'ils sélectionnent |
| --- | --- |
| « LEAST development effort » (le moins d'effort de développement) | Une fonctionnalité ou un paramètre intégré (une option du mappage de source d'événements, une destination, un validateur API Gateway, un paginateur du kit SDK) plutôt que du code que vous écrivez |
| « LEAST operational overhead » (le moins de charge opérationnelle) | Un service géré ou sans serveur plutôt que des instances, des tâches cron ou des scripts que vous exploitez |
| « without changing the application code » (sans modifier le code) | De la configuration seulement : une variable d'environnement, une couche ou une extension, un paramètre de la source d'événements, un modèle de mappage, un cache placé devant |
| « MOST secure » (le plus sécurisé) | Un rôle IAM au moindre privilège, des informations d'identification temporaires, des secrets dans Secrets Manager, le chiffrement KMS, une connectivité privée par des points de terminaison de VPC |
| « MOST cost-effective » (le plus rentable) | L'option la moins chère qui répond encore à toutes les exigences fonctionnelles : lectures à cohérence éventuelle, mémoire bien dimensionnée, cache, capacité à la demande pour un trafic irrégulier |
| « in order » ou « exactly once » (dans l'ordre, une seule fois) | Files d'attente SQS FIFO avec un ID de groupe de messages, consommateurs idempotents, écritures conditionnelles |
| « lowest latency » (latence la plus faible) | Un cache (DAX, ElastiCache, CloudFront, cache API Gateway) ou la simultanéité provisionnée |
| « decouple » ou « absorb spikes » (découpler, absorber les pics) | Une file d'attente ou un bus d'événements entre le producteur et le consommateur |

Beaucoup de questions montrent du code ou de la configuration : un extrait Python (boto3) ou JavaScript (SDK v3), une politique IAM ou de compartiment, un fichier CloudFormation, AWS SAM, buildspec ou appspec, une commande AWS CLI, une requête CloudWatch Logs Insights ou un message d'erreur. Lisez d'abord l'erreur : `AccessDeniedException` désigne une politique, `ThrottlingException` ou `ProvisionedThroughputExceededException` des nouvelles tentatives avec backoff ou davantage de capacité, un délai d'expiration un chemin réseau ou un timeout trop court, `ValidationException` une requête mal formée.

> **Piège d'examen.** Une option qui ajoute une fonctionnalité que personne n'a demandée (une deuxième Région, un nouveau pipeline, une réécriture dans un autre langage) est un distracteur, même si elle fonctionnerait. L'examen récompense la plus petite modification qui répond à toutes les exigences énoncées.

<!-- section: developer-habits -->
## Les habitudes que l'examen récompense

La bonne option suit en général les mêmes quelques pratiques de développeur :

| Pratique | Ce qu'elle donne dans une réponse |
| --- | --- |
| Pas d'informations d'identification à long terme dans le code | La chaîne d'informations d'identification par défaut du kit SDK avec un rôle IAM (rôle d'exécution Lambda, rôle de tâche ECS, profil d'instance) ; jamais de clés d'accès dans des variables d'environnement ou dans le code source |
| Moindre privilège | Des actions et des ressources limitées à ce que le code appelle, avec des conditions quand c'est utile |
| La configuration hors du code | Variables d'environnement, Parameter Store, Secrets Manager, AWS AppConfig, variables d'étape |
| Des nouvelles tentatives qui n'aggravent rien | Nouvelles tentatives du kit SDK avec backoff exponentiel et gigue (jitter), opérations idempotentes, files d'attente de lettres mortes pour les messages empoisonnés |
| L'asynchrone quand personne n'attend | Une file d'attente, une rubrique, un bus d'événements ou un appel asynchrone au lieu d'un long appel synchrone |
| La réutilisation entre les appels | Clients SDK et connexions créés en dehors du gestionnaire (handler) Lambda |
| L'infrastructure en tant que code | Modèles AWS SAM, AWS CloudFormation ou AWS CDK plutôt que des clics dans la console |
| L'observabilité | Journaux JSON structurés, métriques personnalisées, traces avec OpenTelemetry |

Certains services ont changé de statut. Certidrill n'en fait jamais la bonne réponse quand ils sont fermés ou plus pris en charge :

| Service | Statut en novembre 2026 |
| --- | --- |
| Amazon Q Developer | Inscriptions fermées le 15 mai 2026 ; les plug-ins d'IDE prennent fin le 30 avril 2027 ; le successeur est Kiro |
| AWS Cloud9 | Fermé aux nouveaux clients depuis le 25 juillet 2024 ; utilisez AWS CloudShell ou un IDE local |
| AWS CodeCommit | De nouveau ouvert aux nouveaux clients depuis le 25 novembre 2025 |
| Kits SDK et démon AWS X-Ray | En mode maintenance depuis le 25 février 2026, fin de prise en charge le 25 février 2027 ; instrumentez avec OpenTelemetry (AWS Distro for OpenTelemetry) ; le service X-Ray continue |
| AWS Copilot CLI | Fin de prise en charge le 12 juin 2026 |
| Amazon CodeGuru Reviewer | Plus de nouvelle association de référentiel depuis le 7 novembre 2025 |
| Amazon Quick | Nommé AWS Quick dans sa documentation ; QuickSight y continue sous le nom AWS Quick Sight |

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

Les options d'une question viennent de la même famille. Retenez la différence en une ligne :

| Famille | Options | Ce qui les distingue |
| --- | --- | --- |
| Messagerie | Amazon SQS, Amazon SNS, Amazon EventBridge, Amazon Kinesis Data Streams | Une file d'attente qu'un consommateur interroge ; une diffusion en mode push vers des abonnés ; un bus d'événements dont les règles acheminent les événements selon leur contenu ; un flux ordonné que plusieurs consommateurs lisent et relisent |
| Types de files SQS | Standard, FIFO | Au moins une fois, ordre au mieux et débit quasi illimité ; ordre strict par ID de groupe de messages, avec déduplication |
| Simultanéité Lambda | Réservée, provisionnée | La simultanéité réservée plafonne et garantit celle d'une fonction, sans frais ; la simultanéité provisionnée garde des environnements initialisés pour supprimer les démarrages à froid, moyennant des frais |
| Gestion des échecs Lambda | Destinations, file d'attente de lettres mortes | Les destinations reçoivent l'enregistrement d'appel complet, en cas de succès ou d'échec, vers davantage de types de cibles ; une DLQ ne reçoit que l'événement en échec, dans SQS ou SNS |
| Index DynamoDB | GSI, LSI | Un GSI a n'importe quelle clé de partition, s'ajoute à tout moment et est à cohérence éventuelle ; un LSI garde la clé de partition de la table, se crée avec la table et permet des lectures à cohérence forte |
| Lectures DynamoDB | Query, Scan | Query lit une valeur de clé de partition ; Scan lit toute la table ; les deux appliquent les filtres après la lecture |
| Cognito | Groupes d'utilisateurs, groupes d'identités | Un groupe d'utilisateurs (user pool) connecte les utilisateurs et émet des jetons ; un groupe d'identités (identity pool) échange un jeton contre des informations d'identification AWS temporaires |
| Configuration et secrets | Secrets Manager, Parameter Store | Secrets Manager effectue la rotation automatique des secrets ; Parameter Store contient la configuration et des valeurs SecureString sans rotation |
| KMS | `Encrypt`, `GenerateDataKey` | `Encrypt` traite de petites charges utiles (jusqu'à 4 Ko) ; le chiffrement d'enveloppe utilise une clé de données issue de `GenerateDataKey` pour les vraies données |
| Flux de travail | Step Functions Standard, Express | Longue durée (jusqu'à un an), exactement une fois, avec rappels ; courte durée (jusqu'à cinq minutes) et gros volumes |
| Caches | DAX, ElastiCache | DAX se place devant DynamoDB avec la même API ; ElastiCache met en cache n'importe quoi mais exige du code de cache dans l'application |
| Types d'API | API REST, API HTTP | REST offre la validation des requêtes, les modèles de mappage, le cache, les clés d'API et les plans d'utilisation ; HTTP est plus simple et moins cher |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le module de développement met en place les services sur lesquels s'appuient les chapitres de sécurité, de déploiement et de dépannage.
2. Construisez une petite application sans serveur avec AWS SAM : une API API Gateway, deux fonctions Lambda, une table DynamoDB et une file d'attente SQS. Déployez-la, cassez-la volontairement (retirez une autorisation, raccourcissez un timeout, envoyez un événement mal formé) et lisez les erreurs dans CloudWatch Logs.
3. Appelez chaque service à la fois depuis l'AWS CLI et depuis un kit SDK, et entraînez-vous aux calculs que l'examen demande : RCU et WCU, simultanéité Lambda, délais de visibilité SQS.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication, y compris les raisons pour lesquelles les mauvaises options échouent, et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
