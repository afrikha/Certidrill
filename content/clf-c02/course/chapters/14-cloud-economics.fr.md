L'économie du cloud explique pourquoi la même charge de travail coûte en général moins cher, et autrement, sur AWS que dans le centre de données d'une entreprise. L'examen vous demande de reconnaître les dépenses d'investissement et d'exploitation, les coûts fixes et variables, les coûts cachés des environnements sur site, les modèles de licences, le dimensionnement approprié, les économies apportées par l'automatisation et l'effet des économies d'échelle.

<!-- section: economics-aspects | objectives: 1.4.1, 1.4.2 -->
## Les aspects de l'économie du cloud et les économies de coûts

| Aspect | Sur site | Sur AWS |
| --- | --- | --- |
| Type de dépense | **Dépenses d'investissement (CapEx)** : acheter à l'avance serveurs, stockage et bâtiments, puis les amortir sur plusieurs années | **Dépenses d'exploitation (OpEx)** : payer chaque mois une facture pour ce qui a été utilisé |
| Capacité | Dimensionnée pour le pic attendu, des années à l'avance | Ajustée à la demande réelle, en quelques minutes |
| Tarification | Fixe quelle que soit l'utilisation | Paiement à l'utilisation, avec des remises en échange d'un engagement (Savings Plans, Reserved Instances) ou pour de la capacité interruptible (Spot Instances) |
| Travail indifférencié | Installer, câbler, alimenter le matériel et appliquer ses correctifs | Fait par AWS ; les services gérés suppriment aussi l'administration des bases de données et des systèmes d'exploitation |

Le **coût total de possession (TCO)** compare tout ce que coûte une charge de travail sur sa durée de vie : pas seulement les serveurs, mais aussi les locaux, l'électricité, le personnel, les licences et le coût de la capacité inutilisée. Les économies liées au passage au cloud viennent de :

- l'absence d'achat de matériel initial et de cycle de renouvellement du matériel ;
- l'absence de capacité achetée pour un pic qui arrive rarement, et des ressources éteintes quand elles ne servent pas ;
- moins de temps du personnel consacré à l'infrastructure, plus au métier (services gérés) ;
- des prix unitaires plus bas grâce aux économies d'échelle d'AWS, et des baisses de prix régulières.

> **Piège d'examen.** Le cloud ne rend pas tout gratuit : vous payez toujours ce qui s'exécute. Une question sur « the MOST cost savings » désigne une option qui supprime la capacité inutilisée ou la dépense initiale, pas une option qui déplace simplement les mêmes serveurs surdimensionnés vers AWS.

<!-- section: fixed-variable-costs | objectives: 1.4.3 -->
## Coûts fixes et coûts variables

| Élément | Coûts fixes | Coûts variables |
| --- | --- | --- |
| Définition | Payés quelle que soit l'utilisation, souvent à l'avance | Augmentent et diminuent avec l'utilisation réelle |
| Exemples | Bail du centre de données, serveurs achetés, contrats de maintenance annuels, engagement de réservation | Heures d'instances EC2, gigaoctets stockés dans Amazon S3, requêtes vers AWS Lambda, transfert de données sortant |
| Risque | Payer de la capacité inutilisée, ou en manquer | Des coûts qui montent avec l'utilisation, à surveiller (AWS Budgets) |

Passer à AWS transforme la plupart des coûts fixes en coûts variables : c'est l'avantage « trade fixed expense for variable expense ». Une entreprise peut tout de même choisir un engagement fixe, un Savings Plan par exemple, en échange d'un prix plus bas sur son utilisation de base stable.

<!-- section: on-premises-costs | objectives: 1.4.4 -->
## Les coûts des environnements sur site

| Catégorie de coût | Exemples |
| --- | --- |
| Matériel | Serveurs, baies de stockage, équipements réseau, pièces de rechange, remplacement tous les quelques ans |
| Locaux | Surface ou frais d'hébergement en colocation, électricité, refroidissement, protection incendie, sécurité physique |
| Logiciels | Licences de système d'exploitation, de base de données, de virtualisation et de sauvegarde, contrats de support |
| Personnel | Administrateurs du matériel, de la virtualisation, du stockage, du réseau et de l'exploitation du centre de données |
| Résilience | Un deuxième site pour la reprise après sinistre, souvent inutilisé |
| Surdimensionnement | De la capacité achetée pour le pic et inutilisée le reste du temps |

Certains de ces coûts sont **directs** et visibles (serveurs, licences) ; d'autres sont **indirects** et faciles à oublier dans une comparaison (électricité, refroidissement, temps du personnel, site de reprise inutilisé). Une comparaison de TCO honnête inclut les deux. Migration Evaluator (chapitre 13) construit cette comparaison à partir de données réelles d'inventaire et d'utilisation.

<!-- section: licensing | objectives: 1.4.5 -->
## Les stratégies d'octroi de licences

| Modèle | Fonctionnement | Convient quand |
| --- | --- | --- |
| **Licence incluse** (license included) | La licence logicielle fait partie du prix AWS, facturée à l'heure ou à la seconde d'utilisation (par exemple, Windows Server sur Amazon EC2, Amazon RDS for SQL Server) | L'entreprise n'a pas de licences à réutiliser, ou veut payer seulement quand le logiciel s'exécute |
| **Bring Your Own License (BYOL)** | L'entreprise utilise des licences qu'elle possède déjà, si les conditions de licence de l'éditeur le permettent ; AWS ne facture que l'infrastructure | L'entreprise a déjà payé des licences et veut continuer à les utiliser |

- Les licences comptées **par socket physique ou par cœur** exigent en général des **Amazon EC2 Dedicated Hosts** : un serveur physique entier qui vous est dédié, avec la visibilité de ses sockets et de ses cœurs.
- **AWS License Manager** suit l'utilisation des licences au regard des règles que vous définissez (nombre de cœurs, d'instances) et peut empêcher les lancements qui les dépasseraient.
- **AWS Marketplace** vend des logiciels tiers avec une tarification à l'utilisation ou annuelle, facturée sur la facture AWS.

> **Piège d'examen.** Le BYOL ne réduit le coût que si l'entreprise possède déjà des licences éligibles. « Réutiliser des licences de serveur existantes comptées par cœur » désigne les Dedicated Hosts, pas les Dedicated Instances (qui isolent le matériel mais n'exposent ni sockets ni cœurs), ni un Savings Plan (un engagement tarifaire, pas un modèle de licence).

<!-- section: rightsizing | objectives: 1.4.6 -->
## Le dimensionnement approprié

Le **dimensionnement approprié** (rightsizing) consiste à faire correspondre le type et la taille de chaque ressource à la charge de travail réelle, au coût le plus bas qui répond encore aux besoins de performance. Sur site, on achète de gros serveurs « au cas où » ; sur AWS, une instance surdimensionnée est un coût que l'on peut modifier en quelques minutes.

| Étape | Outil ou action |
| --- | --- |
| Mesurer dans le temps l'utilisation du processeur, de la mémoire, du réseau et du stockage | Métriques Amazon CloudWatch |
| Obtenir des recommandations fondées sur cette utilisation | **AWS Compute Optimizer** (instances EC2, groupes Auto Scaling, volumes EBS, fonctions Lambda, etc.) ; vérifications de coûts d'**AWS Trusted Advisor** (par exemple, instances EC2 peu utilisées) |
| Agir | Passer à une taille plus petite ou à une famille d'instances mieux adaptée ; arrêter ou supprimer les ressources inactives ; éteindre les environnements de développement en dehors des heures de travail |
| Puis s'engager | Acheter des Savings Plans ou des Reserved Instances seulement pour la base correctement dimensionnée |

> **Conseil d'examen.** Dimensionnez correctement **avant** d'acheter un engagement : un Savings Plan acheté pour des instances surdimensionnées fige le gaspillage pour un ou trois ans.

<!-- section: automation | objectives: 1.4.7 -->
## Les avantages de l'automatisation

| Automatisation | Avantage |
| --- | --- |
| **Infrastructure as code** (AWS CloudFormation) | Le même environnement créé en quelques minutes, autant de fois que nécessaire, sans erreur manuelle ; facile à supprimer quand il ne sert plus |
| **AWS Auto Scaling**, Amazon EC2 Auto Scaling | La capacité suit automatiquement la demande : pas d'instances inactives payées la nuit, pas de pénurie pendant les pics |
| Démarrage et arrêt planifiés, automatisation AWS Systems Manager | Les opérations courantes (correctifs, redémarrages, planification des instances) s'exécutent sans temps de personnel |
| Politiques de sauvegarde (AWS Backup) | Une protection cohérente sans tâche manuelle |

L'automatisation réduit le coût de main-d'œuvre et les erreurs humaines, accélère les déploiements et rend les environnements cohérents et reproductibles.

<!-- section: economies-of-scale | objectives: 1.4.8 -->
## Les économies d'échelle

AWS achète du matériel, de l'électricité et de la capacité réseau pour des centaines de milliers de clients et exploite des centres de données à une échelle qu'aucune entreprise seule n'atteint. Son coût unitaire est plus bas, et AWS en reverse une partie aux clients sous forme de **prix à l'utilisation plus bas** ; AWS a baissé ses prix de nombreuses fois depuis son lancement. Une entreprise qui exploite son propre centre de données paie le coût complet de chaque serveur, de chaque kilowatt et de chaque administrateur.

> **Piège d'examen.** Les économies d'échelle expliquent **pourquoi les prix d'AWS sont bas**. Elles ne décrivent ni une remise que vous négociez ni un engagement que vous achetez : Savings Plans, Reserved Instances et paliers de volume sont des options de tarification (chapitre 41).

<!-- section: key-points -->
## Points clés

- Sur site : CapEx, coûts fixes, capacité pour le pic. AWS : OpEx, coûts variables, capacité pour la demande réelle.
- Le TCO inclut les coûts indirects : électricité, refroidissement, surface, personnel, site de reprise inutilisé.
- Licence incluse : paiement à l'utilisation. BYOL : réutiliser ses licences ; les licences par socket ou par cœur exigent des Dedicated Hosts ; AWS License Manager les suit.
- Dimensionnement approprié : mesurer, suivre les recommandations de Compute Optimizer, puis s'engager.
- Automatisation : moins d'erreurs, moins de main-d'œuvre, une capacité qui suit la demande.
- Économies d'échelle : des prix unitaires plus bas pour chaque client.
