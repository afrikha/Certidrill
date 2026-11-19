Une architecture hautement disponible continue de servir quand un composant, une instance ou une zone de disponibilité entière tombe en panne. Les questions SAA-C03 désignent un point d'échec unique (une instance, une passerelle NAT, une base de données mono-AZ, un serveur hérité que personne ne peut modifier) et demandent la conception qui le supprime, la métrique qui le prouve ou l'automatisation qui préserve l'intégrité de l'infrastructure. La reprise multi-Région fait l'objet du chapitre suivant.

<!-- section: multi-az-design | objectives: 2.2.8, 2.2.16 -->
## Supprimer les points d'échec uniques sur plusieurs zones de disponibilité

Une zone de disponibilité est constituée d'un ou plusieurs centres de données dotés d'une alimentation, d'un réseau et d'une connectivité redondants ; chaque Région en compte au moins trois. La règle de base : **chaque niveau s'exécute dans au moins deux AZ**, et une panne est détectée et contournée automatiquement.

| Point d'échec unique | Conception hautement disponible |
| --- | --- |
| Une seule instance EC2 | Groupe Auto Scaling sur deux ou trois AZ derrière un équilibreur de charge |
| Une seule passerelle NAT pour tous les sous-réseaux privés | Une passerelle NAT zonale par AZ avec une table de routage par AZ, ou une passerelle NAT régionale |
| Instance RDS mono-AZ | RDS Multi-AZ (instance de base de données ou cluster de base de données) ou Aurora avec un réplica dans une autre AZ |
| Cache autogéré sur une instance | ElastiCache (Valkey ou Redis OSS) avec réplicas et basculement automatique Multi-AZ |
| Fichiers sur un volume EBS partagé par plusieurs serveurs | Amazon EFS (régional, multi-AZ) ou FSx Multi-AZ |
| Un seul tunnel Site-to-Site VPN ou une seule liaison Direct Connect | Les deux tunnels VPN, une seconde connexion Direct Connect ou un VPN de secours |

L'équilibreur de charge est la clé de voûte de la conception. Il exécute des nœuds dans chaque AZ activée, vérifie l'état de chaque cible et n'envoie le trafic qu'aux cibles saines. Configurez le groupe Auto Scaling avec **`HealthCheckType: ELB`** pour qu'une instance qui échoue à la vérification de l'état de l'équilibreur (application arrêtée alors que le système d'exploitation fonctionne) soit remplacée, et pas seulement une instance qui échoue aux vérifications d'état EC2.

```yaml
WebAsg:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MinSize: "3"
    MaxSize: "9"
    DesiredCapacity: "3"
    VPCZoneIdentifier:
      - !Ref PrivateSubnetA
      - !Ref PrivateSubnetB
      - !Ref PrivateSubnetC
    LaunchTemplate:
      LaunchTemplateId: !Ref WebLaunchTemplate
      Version: !GetAtt WebLaunchTemplate.LatestVersionNumber
    TargetGroupARNs:
      - !Ref WebTargetGroup
    HealthCheckType: ELB
    HealthCheckGracePeriod: 300
```

**Stabilité statique** : provisionnez dans les AZ restantes assez de capacité pour absorber la perte d'une AZ sans attendre la mise à l'échelle. Avec trois AZ et un besoin de pointe de six instances, exécutez-en trois par AZ (neuf), pour que deux AZ en conservent six.

> **Piège d'examen.** « Au minimum deux instances » ne signifie pas haute disponibilité si les deux sont dans la même AZ. Vérifiez que les sous-réseaux sont dans des AZ différentes, et examinez les couches base de données, cache et NAT, qui sont souvent les derniers points d'échec uniques.

<!-- section: route-tables | objectives: 2.2.3 -->
## Concepts réseau de base : tables de routage et sous-réseaux

Chaque sous-réseau réside dans une AZ et est associé à exactement une table de routage (la table de routage principale si aucune n'est définie explicitement). Chaque table de routage contient une route `local` pour le CIDR du VPC. Quand plusieurs routes correspondent, le préfixe le plus spécifique l'emporte.

| Type de sous-réseau | Route par défaut | Remarques |
| --- | --- | --- |
| Public | `0.0.0.0/0` vers une passerelle Internet | Les instances ont aussi besoin d'une adresse IPv4 publique ou d'une adresse IP Elastic |
| Privé avec accès Internet sortant | `0.0.0.0/0` vers une passerelle NAT | Sortant uniquement ; aucune connexion entrante depuis Internet |
| Isolé | Aucune route par défaut | Accède aux services AWS par des points de terminaison VPC |

```text
Route table rt-private-a (private subnet in AZ a)
Destination      Target
10.0.0.0/16      local
0.0.0.0/0        nat-0aaa (zonal NAT gateway in AZ a)
pl-xxxx (S3)     vpce-0123 (gateway endpoint)

Route table rt-private-b (private subnet in AZ b)
Destination      Target
10.0.0.0/16      local
0.0.0.0/0        nat-0bbb (zonal NAT gateway in AZ b)
pl-xxxx (S3)     vpce-0123 (gateway endpoint)
```

Une **passerelle NAT zonale** réside dans une AZ, dans un sous-réseau public, avec une adresse IP Elastic. Si les sous-réseaux privés de toutes les AZ routent vers une seule, la perte de cette AZ coupe l'accès Internet de toutes les AZ. Créez-en une par AZ, avec une table de routage privée par AZ. La **passerelle NAT régionale** est l'alternative plus récente : une seule passerelle NAT pour le VPC, qui s'étend automatiquement aux AZ où s'exécutent les charges de travail, ne demande pas de sous-réseau public et constitue la cible unique de toutes les tables de routage privées.

Les points de terminaison VPC de passerelle (S3, DynamoDB) ajoutent aux tables de routage choisies une route avec la liste de préfixes du service : le trafic vers ces services ne dépend plus du tout de la passerelle NAT.

> **Conseil d'examen.** « Les instances d'un sous-réseau privé ont perdu l'accès à Internet quand une AZ est tombée en panne » désigne une passerelle NAT zonale unique : déployez une passerelle NAT dans chaque AZ et faites pointer la table de routage de chaque AZ vers la sienne (ou utilisez une passerelle NAT régionale).

<!-- section: database-ha | objectives: 2.2.9, 2.2.16 -->
## Bases de données hautement disponibles et proxies

| Option | Instances de secours | Réplication | Secours lisible | Basculement |
| --- | --- | --- | --- | --- |
| Instance de base de données RDS Multi-AZ | Une, dans une autre AZ | Synchrone | Non | Automatique, généralement 60 à 120 secondes ; l'enregistrement DNS du point de terminaison bascule vers l'instance de secours |
| Cluster de base de données RDS Multi-AZ (MySQL, PostgreSQL) | Deux, trois AZ au total | Semi-synchrone (un lecteur accuse réception) | Oui | Automatique, dépend du décalage de réplication ; latence d'écriture plus faible qu'un déploiement d'instance |
| Aurora | Jusqu'à 15 réplicas Aurora | Stockage partagé répliqué sur plusieurs AZ | Oui, point de terminaison de lecteur | Promotion automatique d'un réplica |
| DynamoDB | Sans objet | Gérée, sur plusieurs AZ | Oui | Rien à configurer |

Les applications se reconnectent après un basculement parce que le nom DNS reste le même et pointe vers la nouvelle instance principale ; les clients ne doivent pas mettre le DNS en cache longtemps (une JVM doit utiliser un TTL de 60 secondes ou moins).

**Amazon RDS Proxy** est un proxy de base de données entièrement géré et hautement disponible, placé entre l'application et RDS ou Aurora :

- **Regroupement de connexions** : de nombreux clients de courte durée (fonctions Lambda, conteneurs mis à l'échelle automatiquement) partagent un petit pool de connexions, si bien que la base de données n'est pas épuisée par des rafales de connexions.
- **Basculement plus rapide et transparent** : le proxy garde les connexions des clients ouvertes et se reconnecte à la nouvelle instance principale, au lieu que chaque client attende le DNS.
- **Sécurité** : on peut exiger que les clients s'authentifient avec IAM ; le proxy lit les identifiants de la base dans Secrets Manager.
- Il s'exécute dans le même VPC que la base, ne peut pas être accessible publiquement, et son point de terminaison par défaut couvre deux AZ. Il se connecte à l'instance d'écriture ; ce n'est pas un réplica en lecture.

> **Piège d'examen.** « Des fonctions Lambda ouvrent trop de connexions et la base de données manque de mémoire » se résout avec RDS Proxy, pas avec une classe d'instance plus grande ni des réplicas en lecture.

<!-- section: distributed-patterns | objectives: 2.2.5 -->
## Modèles de conception distribués

Les systèmes distribués tombent en panne partiellement : une dépendance ralentit, un appel expire, un message arrive deux fois. Le pilier Fiabilité du Well-Architected Framework recommande :

| Modèle | Ce qu'il fait | Exemples AWS |
| --- | --- | --- |
| Délais d'expiration | Ne jamais attendre indéfiniment une dépendance | Délais côté client dans le SDK, délai d'inactivité de l'ALB, délai d'expiration Lambda |
| Nouvelles tentatives avec backoff exponentiel et jitter | Réessayer les erreurs transitoires à intervalles croissants et aléatoires, un nombre limité de fois, à une seule couche | Intégré aux SDK AWS ; `Retry` de Step Functions |
| Idempotence | Répéter une opération a le même effet que l'exécuter une fois : nouvelles tentatives et messages en double sont sans danger | Clés d'idempotence stockées dans DynamoDB, déduplication SQS FIFO |
| Limitation et lissage de charge | Protéger un service contre plus de requêtes qu'il ne peut en traiter | Limitation et plans d'utilisation API Gateway, SQS entre les niveaux |
| Échec rapide et disjoncteur | Cesser d'appeler une dépendance défaillante et renvoyer une solution de repli | Renvoyer du contenu en cache, servir une page statique depuis S3 |
| Cloisons et cellules | Limiter une panne à une partie du système | Files et fonctions distinctes par catégorie de clients, architecture à base de cellules |
| Stabilité statique | Continuer à fonctionner sans action du plan de contrôle pendant une dégradation | Capacité provisionnée à l'avance dans chaque AZ |
| Dégradation progressive | Offrir une fonctionnalité réduite plutôt qu'une panne | CloudFront sert des pages en cache ; fonctions non critiques désactivées |

> **Conseil d'examen.** Sans jitter, tous les clients réessaient en même temps et créent des pics de trafic ; réessayer une opération non idempotente (débiter une carte) crée des doublons. La réponse sûre combine backoff, jitter, limite de tentatives et idempotence.

<!-- section: immutable-automation | objectives: 2.2.7, 2.2.13 -->
## Infrastructure immuable et automatisation

L'**infrastructure immuable** interdit les modifications sur place des ressources de production. Un changement (correctif, nouvelle version, configuration) est construit sous forme de nouvelles ressources, déployées à côté des anciennes, puis le trafic est basculé ; revenir en arrière consiste à rebasculer.

- **Images de référence (golden images)** : intégrer les logiciels dans des AMI (EC2 Image Builder automatise leur construction et leurs tests) ou dans des images de conteneur ; les référencer dans une nouvelle version du modèle de lancement.
- **Remplacer, ne pas corriger** : l'**actualisation d'instance** (instance refresh) d'Auto Scaling remplace les instances par lots avec la nouvelle version du modèle de lancement ; Elastic Beanstalk propose les politiques de déploiement immuable et de fractionnement du trafic.
- **Bleu/vert** : un environnement parallèle complet, le trafic étant déplacé par des enregistrements pondérés Route 53 ou des groupes cibles pondérés de l'ALB.

L'automatisation maintient l'infrastructure dans l'état prévu :

| Objectif | Service |
| --- | --- |
| Créer et mettre à jour chaque ressource à partir de modèles versionnés | AWS CloudFormation (les jeux de modifications prévisualisent les changements ; les mises à jour en échec sont annulées) |
| Détecter les modifications manuelles des ressources d'une pile | Détection de dérive CloudFormation |
| Empêcher le remplacement ou la suppression accidentels de ressources critiques | Politiques de pile, protection contre la résiliation, `DeletionPolicy: Retain` |
| Évaluer en continu la configuration et corriger les écarts | Règles AWS Config avec correction automatique (runbooks Systems Manager Automation) |
| Corriger et configurer des flottes selon une planification | Systems Manager Patch Manager et State Manager |
| Remplacer la capacité défectueuse | Vérifications de l'état Auto Scaling, récupération automatique EC2 |

> **Piège d'examen.** Se connecter aux instances de production pour les corriger à la main rompt l'immuabilité et crée de la dérive. « Garantir que chaque instance exécute la même configuration testée » désigne une nouvelle AMI ou une nouvelle version du modèle de lancement déployée par actualisation d'instance, pas SSH et des scripts.

<!-- section: observability | objectives: 2.2.12, 2.2.15 -->
## Métriques et visibilité des charges de travail

Partez de l'exigence métier, puis choisissez la métrique qui la prouve. Un objectif de disponibilité de 99,9 % autorise environ 8,8 heures d'interruption par an ; 99,99 % autorise environ 53 minutes.

| Exigence métier | Métrique ou signal (Amazon CloudWatch) |
| --- | --- |
| Le site doit répondre | `HealthyHostCount` et `UnHealthyHostCount` de l'ALB ; vérifications de l'état Route 53 ; canaris CloudWatch Synthetics qui exécutent des parcours utilisateur |
| Peu de requêtes en échec | `HTTPCode_Target_5XX_Count` et `HTTPCode_ELB_5XX_Count` rapportés à `RequestCount` |
| Réponses rapides | `TargetResponseTime` à un centile élevé (p99), pas seulement la moyenne |
| Commandes traitées à temps | `ApproximateAgeOfOldestMessage`, `ApproximateNumberOfMessagesVisible` de SQS |
| Les lecteurs voient des données récentes | `ReplicaLag` de RDS |
| Matériel de l'instance sain | `StatusCheckFailed_System` d'EC2 |

Les alarmes CloudWatch agissent sur ces métriques (notification via SNS, mise à l'échelle, récupération d'une instance) ; les **alarmes composites** combinent plusieurs alarmes pour réduire le bruit ; une vérification de l'état Route 53 peut suivre une alarme CloudWatch pour piloter un basculement DNS.

**AWS X-Ray** trace les requêtes à travers les composants distribués :

- Une **trace** rassemble tous les **segments** produits par une requête (un par service) ; les **sous-segments** détaillent les appels en aval (DynamoDB, une API HTTP, SQL).
- La **carte des traces** (service map) montre chaque service comme un nœud avec sa latence et ses taux d'erreur, ce qui situe le composant défaillant ou lent dans une chaîne de microservices.
- L'**échantillonnage** limite le coût (par défaut, la première requête de chaque seconde plus 5 % des autres) ; les **annotations** sont des paires clé-valeur indexées qui servent à filtrer les traces, les **métadonnées** ne sont pas indexées.
- Les SDK et le démon X-Ray sont en mode maintenance depuis le 25 février 2026 : AWS recommande l'instrumentation OpenTelemetry pour envoyer les traces à X-Ray.

> **Conseil d'examen.** « Identifier quel microservice ajoute de la latence aux requêtes des utilisateurs » désigne X-Ray. « Être alerté quand l'application ne répond plus » désigne une alarme CloudWatch sur les métriques de l'équilibreur de charge ou un canari Synthetics. CloudTrail enregistre les appels d'API ; il ne mesure pas la disponibilité.

<!-- section: legacy-apps | objectives: 2.2.19 -->
## Rendre les applications héritées plus fiables

Quand l'application ne peut pas être modifiée, placez la fiabilité autour d'elle :

| Situation | Solution sans modification du code |
| --- | --- |
| Un serveur unique avec état qui doit survivre à une panne matérielle | Récupération automatique EC2 (conserve l'ID d'instance, les adresses IP, les volumes EBS) ou un groupe Auto Scaling avec minimum = maximum = 1 pour le remplacer |
| Le serveur doit rester joignable à une adresse fixe après remplacement | Adresse IP Elastic, enregistrement Route 53 ou nom DNS d'un équilibreur de charge |
| Plusieurs serveurs identiques mais aucune répartition de charge | Un ALB ou un NLB avec vérifications de l'état devant eux |
| La base de données doit survivre à la panne d'une AZ | RDS Multi-AZ : même point de terminaison, basculement automatique |
| Trop de connexions ou basculement lent | RDS Proxy (seul le point de terminaison de connexion change) |
| L'application écrit des fichiers sur disque local et a besoin d'un stockage partagé | Amazon EFS (NFS) ou FSx for Windows File Server (SMB) monté au même chemin |
| Un broker de messages sur site (JMS, AMQP) | Amazon MQ |
| Les clients utilisent des adresses IP codées en dur | IP statiques Global Accelerator ou adresses IP Elastic d'un NLB devant les nouveaux points de terminaison |

> **Piège d'examen.** « Sans modifier l'application » exclut de la réécrire pour SQS, Lambda ou DynamoDB. Préférez des équivalents gérés directement substituables (Multi-AZ, EFS, Amazon MQ, un équilibreur de charge) que l'application voit comme le même point de terminaison ou le même protocole.

<!-- section: managed-services | objectives: 2.2.2, 2.2.20 -->
## Services gérés et sur mesure au service de la fiabilité

Un service géré transfère à AWS la disponibilité, la mise à l'échelle et l'application des correctifs. Pour les fonctionnalités d'IA, utilisez l'API gérée plutôt que d'héberger votre propre modèle :

| Exigence | Service géré |
| --- | --- |
| Sentiment, entités, expressions clés, détection de la langue ou PII dans un texte | Amazon Comprehend |
| Convertir du texte en parole naturelle | Amazon Polly |
| Convertir la parole d'un fichier audio ou vidéo en texte | Amazon Transcribe |
| Traduire du texte entre des langues | Amazon Translate |
| Détecter des objets, des visages ou du contenu inapproprié dans des images et des vidéos | Amazon Rekognition |
| Extraire le texte, les formulaires et les tableaux de documents numérisés | Amazon Textract |
| Chatbot ou interface conversationnelle vocale | Amazon Lex |
| Créer, entraîner et déployer des modèles ML personnalisés | Amazon SageMaker AI |

Pour traiter de gros volumes, appelez ces API depuis un pipeline asynchrone (événement S3, file d'attente SQS, Step Functions) afin qu'une limitation ou une erreur transitoire entraîne une nouvelle tentative, et non un document perdu.

Les services sur mesure sont hautement disponibles par conception : S3 (les classes Standard stockent les données sur au moins trois AZ), DynamoDB, Aurora, les systèmes de fichiers EFS régionaux, SQS, SNS, Lambda. Un équivalent autogéré sur EC2 demanderait de concevoir cette résilience soi-même.

> **Conseil d'examen.** « Analyser le sentiment des avis clients avec le MOINS de charge opérationnelle » désigne Comprehend, pas un modèle entraîné et hébergé sur SageMaker AI ou EC2.

<!-- section: key-points -->
## Points clés

- Chaque niveau dans deux AZ ou plus ; vérifier les couches base de données, cache, NAT et connectivité, où se cachent des points d'échec uniques.
- Auto Scaling avec les vérifications de l'état ELB remplace les instances défectueuses ; la stabilité statique provisionne à l'avance la capacité nécessaire à la perte d'une AZ.
- Une passerelle NAT zonale par AZ avec une table de routage par AZ, ou une passerelle NAT régionale ; la route la plus spécifique l'emporte.
- RDS Multi-AZ pour la disponibilité (le DNS bascule vers l'instance de secours) ; RDS Proxy pour le regroupement de connexions et un basculement plus rapide.
- Délais d'expiration, nouvelles tentatives avec backoff et jitter, idempotence, limitation et dégradation progressive.
- Infrastructure immuable : nouvelle AMI ou image, actualisation d'instance, bleu/vert ; détection de dérive CloudFormation et correction AWS Config préservent l'intégrité.
- Métriques et alarmes CloudWatch pour la disponibilité, traces X-Ray pour trouver le service lent.
- Applications héritées : les entourer de récupération automatique, d'équilibreurs de charge, de Multi-AZ, d'EFS, d'Amazon MQ ; services d'IA gérés plutôt que modèles autohébergés.
