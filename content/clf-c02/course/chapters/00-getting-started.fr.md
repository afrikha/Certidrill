Le CLF-C02 est un examen de base. Chaque question vous demande de reconnaître une seule chose : un concept du cloud, un service AWS, un pilier Well-Architected, une responsabilité du modèle de responsabilité partagée, une option d'achat ou un plan AWS Support. Vous ne tapez jamais de commande, ne suivez aucun chemin dans la console et ne concevez pas d'architecture complète. Ce chapitre présente le format, une méthode pour lire des questions courtes, les services que l'examen vous demande de distinguer et un plan de travail.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | AWS Certified Cloud Practitioner |
| Guide d'examen | Version 1.3 du 29 octobre 2026 |
| Durée | 90 minutes |
| Questions | 65 : 50 notées et 15 non notées, qui ne sont pas signalées |
| Score | Échelle de 100 à 1 000 ; 700 pour réussir |
| Modèle de notation | Compensatoire : seul le score total compte, il n'y a pas de seuil par domaine |
| Réponses fausses ou vides | Une question sans réponse compte comme fausse et il n'y a pas de pénalité pour une réponse au hasard : répondez toujours |
| Candidat visé | Jusqu'à six mois d'exposition au Cloud AWS, quel que soit le poste, technique ou non |

Les quatre domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Concepts du cloud | 24 % |
| Sécurité et conformité | 30 % |
| Technologie et services cloud | 34 % |
| Facturation, tarification et support | 12 % |

Il n'existe que deux types de questions. Le **choix multiple** a une seule bonne réponse parmi quatre options ; c'est la grande majorité de l'examen. La **réponse multiple** se termine par « Choose two. » (rarement « Choose three. ») et compte deux bonnes réponses parmi cinq options, ou trois parmi six ; elle ne rapporte le point que si toutes les réponses choisies sont correctes. Il n'y a ni étude de cas, ni série Oui/Non, ni liste déroulante, ni glisser-déposer, ni laboratoire.

> **Conseil d'examen.** Comme vous ne pouvez pas savoir quelles sont les 15 questions non notées, traitez chaque question comme si elle comptait. Les examens blancs Certidrill notent les 65 questions.

<!-- section: reading-questions -->
## Lire une question

Un énoncé compte une à trois phrases : une entreprise (« A retail company », « AnyCompany ») et un besoin, puis la question : « Which AWS service will meet this requirement? », « Which pillar of the AWS Well-Architected Framework...? », « Which task is the customer's responsibility...? ». Les quatre options viennent de la même famille : un détail de l'énoncé fait la différence. Procédez dans cet ordre :

1. Lisez d'abord la phrase de la question : choisissez-vous un service, un concept, un pilier, une responsabilité ou une option de tarification ?
2. Soulignez les mots clés du besoin : « API calls », « compliance reports », « estimate », « alert », « patch the operating system ».
3. Éliminez les options qui font quelque chose de proche, mais de différent.
4. Pour « Choose two. », vérifiez chaque option séparément : chaque bonne option doit répondre seule à la question.

| Mots de l'énoncé | Ce qu'ils désignent |
| --- | --- |
| « who made this API call », « audit account activity » (qui a fait cet appel d'API, auditer l'activité du compte) | AWS CloudTrail |
| « configuration history », « is this resource compliant with a rule » (historique de configuration, conformité d'une ressource à une règle) | AWS Config |
| « metrics », « alarm », « application logs » (métriques, alarme, journaux d'application) | Amazon CloudWatch |
| « download AWS compliance reports » (télécharger les rapports de conformité d'AWS : SOC, PCI DSS, ISO) | AWS Artifact |
| « estimate the cost before deploying » (estimer le coût avant de déployer) | AWS Pricing Calculator |
| « alert when spending exceeds an amount » (alerter quand les dépenses dépassent un montant) | AWS Budgets |
| « patch the guest operating system of an EC2 instance » (appliquer les correctifs du système d'exploitation invité) | Le client |
| « physical security of data centers » (sécurité physique des centres de données) | AWS |
| « move without changes », « lift and shift » (déplacer sans modification) | La stratégie de migration rehost (réhébergement) |
| « pay only for what you use », « no upfront investment » (payer seulement ce qu'on utilise, sans investissement initial) | Remplacer les dépenses fixes par des dépenses variables |

> **Piège d'examen.** « MOST cost-effective » ne l'emporte jamais sur une exigence énoncée. Si la charge de travail ne peut pas être interrompue, les instances Spot sont fausses, aussi bon marché soient-elles.

<!-- section: confusing-pairs -->
## Les services faciles à confondre

Retenez la différence en une ligne entre les membres de chaque famille :

| Famille | Options | Ce qui les distingue |
| --- | --- | --- |
| Cadres | AWS Well-Architected Framework, Framework d'adoption du Cloud AWS (AWS CAF) | Six piliers pour concevoir et évaluer une charge de travail ; six perspectives pour préparer une organisation à l'adoption du cloud |
| Infrastructure mondiale | Région, zone de disponibilité, emplacement périphérique | Une zone géographique ; des centres de données isolés dans une Région ; des points de présence proches des utilisateurs pour le cache et le DNS |
| Surveillance et audit | CloudWatch, CloudTrail, Config | Métriques de performance et journaux ; qui a fait quoi par l'API ; quelle est et quelle était la configuration d'une ressource |
| Recommandations | AWS Trusted Advisor, AWS Compute Optimizer | Vérifications des bonnes pratiques dans des catégories comme l'optimisation des coûts, la sécurité, la tolérance aux pannes, les performances et les quotas de service ; bonne taille des ressources de calcul d'après leur utilisation mesurée |
| Outils de coûts | Pricing Calculator, Cost Explorer, Budgets, Cost and Usage Report | Estimer avant de déployer ; analyser les coûts passés et prévoir ; alerter sur un seuil ; le fichier de facturation le plus détaillé |
| Services de sécurité | Shield, WAF, GuardDuty, Inspector, Macie | Protection DDoS ; filtrage des requêtes web ; détection des menaces à partir des journaux ; analyse des vulnérabilités ; découverte des données sensibles dans Amazon S3 |
| Filtrage réseau | Groupes de sécurité, listes ACL réseau | Avec état, règles d'autorisation, sur l'interface réseau d'une instance ; sans état, règles d'autorisation et de refus, sur un sous-réseau |
| Stockage | Amazon EBS, stockage d'instance, Amazon EFS | Volume en mode bloc persistant pour une instance ; stockage en mode bloc temporaire perdu à l'arrêt de l'instance ; système de fichiers partagé par de nombreuses instances |
| Options d'achat | On-Demand, Savings Plans, instances réservées, instances Spot, Dedicated Hosts | Aucun engagement ; un engagement de dépense sur un ou trois ans ; un engagement sur une configuration d'instance ; de la capacité inutilisée qui peut être interrompue ; un serveur physique pour vos propres licences par socket ou par cœur |
| Informations d'identification | AWS Secrets Manager, Systems Manager Parameter Store | Secrets avec rotation automatique ; valeurs de configuration et paramètres SecureString sans rotation |

AWS renomme et ferme des services. En novembre 2026 : AWS Migration Hub et AWS Application Discovery Service sont fermés aux nouveaux clients (AWS Transform offre des fonctionnalités similaires) ; AWS Snowball Edge n'est plus proposé aux nouveaux clients (AWS DataSync pour les transferts en ligne) ; les coffres Amazon Glacier sont fermés aux nouveaux clients, mais les classes de stockage S3 Glacier d'Amazon S3 ne sont pas concernées ; AWS Application Migration Service s'appelle désormais AWS Transform MGN ; Amazon AppStream 2.0 est désormais documenté sous le nom Amazon WorkSpaces Applications ; les plans AWS Support sont Basic, Business Support+, Enterprise Support et Unified Operations. Certidrill ne fait jamais d'un service fermé ou d'un plan retiré une bonne réponse.

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : les concepts du premier module (avantages, piliers, responsabilité partagée) expliquent les réponses des suivants.
2. Ouvrez un compte avec l'offre gratuite AWS (AWS Free Tier), parcourez l'AWS Management Console, lancez puis résiliez une petite instance EC2, créez un compartiment (bucket) S3 et une alerte AWS Budgets : le vocabulaire devient concret.
3. Pour chaque famille du tableau ci-dessus, écrivez de mémoire la différence en une ligne, puis comparez.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication, y compris les raisons pour lesquelles les mauvaises options échouent, et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.

<!-- section: key-points -->
## Points clés

- 90 minutes, 65 questions (dont 15 non notées), 700 sur 1 000 pour réussir, pas de minimum par domaine, pas de pénalité pour une réponse au hasard.
- La sécurité (30 %) et la technologie (34 %) représentent presque deux tiers de l'examen.
- Chaque question teste un seul fait : trouvez le mot clé, puis éliminez les voisins de la même famille.
- Ne choisissez jamais un service fermé aux nouveaux clients.
