Une fois le type de base de données choisi, les questions de performance demandent comment la rendre plus rapide ou plus grande sans la réécrire : où placer les copies (zones de disponibilité, Régions), quel type de réplica ajouter, quel cache placer devant et avec quelle stratégie, et comment empêcher des milliers de connexions de submerger le moteur. Chaque technique résout un problème ; le symptôme de l'énoncé vous dit laquelle.

<!-- section: global-infrastructure | objectives: 3.3.1 -->
## Bases de données sur plusieurs zones de disponibilité et Régions

| Portée | Option | Ce que vous obtenez |
| --- | --- | --- |
| Plusieurs AZ, une Région | Instance de base de données RDS Multi-AZ | Instance de secours synchrone dans une autre AZ, basculement automatique ; l'instance de secours ne sert aucune lecture |
| Trois AZ, une Région | Cluster de bases de données RDS Multi-AZ (MySQL, PostgreSQL) | Un nœud d'écriture et deux lecteurs lisibles, réplication semi-synchrone, latence d'écriture plus faible qu'une instance Multi-AZ |
| Trois AZ, une Région | Cluster Aurora | Volume de cluster sur six nœuds de stockage répartis sur trois AZ ; les réplicas des autres AZ sont des cibles de basculement |
| Plusieurs Régions, un nœud d'écriture | Aurora Global Database | Une Région principale et jusqu'à 10 Régions secondaires en lecture seule, réplication sur une infrastructure dédiée généralement inférieure à une seconde |
| Plusieurs Régions, un nœud d'écriture | Réplica en lecture RDS interrégional | Copie asynchrone dans une autre Région pour des lectures locales et la reprise après sinistre |
| Plusieurs Régions, tous en écriture | Tables globales DynamoDB | Réplicas multi-actifs ; chaque réplica sert les lectures et les écritures |

- **Latence vers les utilisateurs** : une base répond le plus vite depuis la Région où s'exécute l'application. Pour des utilisateurs sur plusieurs continents, placez des copies en lecture dans leurs Régions (clusters secondaires Aurora Global Database, réplicas en lecture interrégionaux, tables globales DynamoDB) et gardez le niveau applicatif à côté.
- **Aurora Global Database** : un cluster secondaire est en lecture seule et peut contenir jusqu'à 16 instances de lecture. Le **transfert d'écriture** (write forwarding) permet à un cluster secondaire d'envoyer les écritures au cluster principal. La **permutation** (switchover) déplace le cluster principal vers une Région secondaire saine sans perte de données (opération planifiée) ; le **basculement** (failover) rétablit le service après une panne de la Région principale. Le point de terminaison d'écriture de la base globale suit le cluster principal après l'une ou l'autre opération.
- Les **tables globales DynamoDB** utilisent la cohérence éventuelle multi-Régions (MREC, par défaut, le dernier écrivain l'emporte) ou la cohérence forte multi-Régions (MRSC, même compte uniquement). Le mode se choisit à la création et ne peut pas être modifié.

> **Piège d'examen.** Multi-AZ améliore la disponibilité, pas les performances en lecture : l'instance de secours d'une instance RDS Multi-AZ n'est pas lisible. Si l'énoncé exige les deux, choisissez un cluster de bases de données Multi-AZ, des réplicas Aurora, ou Multi-AZ plus des réplicas en lecture.

<!-- section: replication-concepts | objectives: 3.3.7 -->
## Réplication de base de données : copies synchrones et asynchrones

| Copie | Réplication | Lisible | Objectif principal | Basculement |
| --- | --- | --- | --- | --- |
| Instance de secours Multi-AZ | Synchrone | Non | Disponibilité dans une Région | Automatique |
| Lecteurs d'un cluster de bases de données Multi-AZ | Semi-synchrone (un lecteur doit accuser réception) | Oui | Disponibilité plus mise à l'échelle des lectures | Automatique, vers le lecteur qui a les modifications les plus récentes |
| Réplica en lecture RDS | Asynchrone (native du moteur) | Oui | Mise à l'échelle des lectures, lectures interrégionales, reprise après sinistre | Promotion manuelle |
| Réplica Aurora | Volume de cluster partagé, retard généralement inférieur à 100 ms | Oui | Mise à l'échelle des lectures et disponibilité | Automatique, selon le niveau de priorité |
| Cluster secondaire Aurora Global Database | Réplication au niveau du stockage, généralement inférieure à une seconde | Oui | Lectures mondiales, reprise régionale | Permutation ou basculement |
| Réplica de table globale DynamoDB | Asynchrone (MREC) ou fortement cohérente (MRSC) | Oui, et accessible en écriture | Actif/actif multi-Régions | L'application se dirige vers une autre Région |

Conséquences de la réplication asynchrone : un réplica peut renvoyer des données légèrement anciennes (**retard de réplication**), et le promouvoir après une panne de la source peut perdre les dernières écritures non encore arrivées. Les charges qui doivent relire immédiatement leurs propres écritures lisent sur le nœud d'écriture.

> **Conseil d'examen.** « Décharger le trafic de lecture » et « les rapports ralentissent la base de production » signifient réplicas en lecture. « Survivre à la panne d'une AZ avec un basculement automatique » signifie Multi-AZ. « Survivre à la panne d'une Région avec les RPO et RTO les plus faibles pour une base relationnelle » signifie Aurora Global Database.

<!-- section: read-replicas-config | objectives: 3.3.9 -->
## Configurer les réplicas en lecture selon les exigences

**Réplicas en lecture Amazon RDS**

- Jusqu'à **15 réplicas en lecture** par instance source (pour RDS for Oracle, AWS recommande 5 au plus pour limiter le retard). Créés à partir d'un instantané de la source, puis tenus à jour de façon asynchrone.
- Les **sauvegardes automatiques** doivent être activées sur la source (période de conservation des sauvegardes supérieure à 0).
- Ils peuvent se trouver dans **la même Région ou une autre Région** ; les réplicas interrégionaux utilisent un canal sécurisé et servent les lectures locales ou la reprise après sinistre.
- Un réplica peut lui-même être **Multi-AZ** pour sa propre disponibilité. RDS for MySQL, MariaDB et certaines versions de PostgreSQL prennent en charge les réplicas de réplicas ; Oracle, SQL Server et Db2 non.
- Les réplicas montés de RDS for Oracle et les réplicas de secours de RDS for Db2 n'acceptent pas de connexions : ils servent à la reprise après sinistre, pas aux lectures.
- La **promotion** transforme un réplica en instance autonome accessible en écriture : la réplication s'arrête définitivement. Utilisez-la pour la reprise après sinistre ou pour séparer une base.
- **Pas de mise à l'échelle automatique** : les réplicas en lecture RDS se créent manuellement. Chaque réplica est un point de terminaison distinct ; l'application ou une couche DNS répartit les lectures.

**Réplicas Amazon Aurora**

| Fonctionnalité | Usage |
| --- | --- |
| Point de terminaison du lecteur | Un seul nom DNS qui équilibre les connexions entre tous les réplicas Aurora |
| Point de terminaison personnalisé | Un sous-ensemble d'instances, par exemple des réplicas plus grands réservés aux rapports |
| Point de terminaison d'instance | Une instance précise, pour le diagnostic ou l'optimisation |
| Aurora Auto Scaling | Le suivi de cible sur l'utilisation moyenne du CPU (ou une autre métrique) ajoute et retire des réplicas, entre 0 et 15 au maximum ; exige au moins un lecteur |
| Priorité de basculement | Niveaux de 0 (la plus haute) à 15 ; à priorité égale, le réplica le plus grand est promu |

```bash
# Create a cross-Region read replica of an RDS for PostgreSQL instance
aws rds create-db-instance-read-replica \
  --db-instance-identifier orders-replica-eu \
  --source-db-instance-identifier arn:aws:rds:us-east-1:111122223333:db:orders \
  --region eu-west-1
```

> **Piège d'examen.** Les réplicas en lecture n'aident que si l'application leur envoie les lectures. « Sans modifier la chaîne de connexion de l'application » exclut les réplicas en lecture RDS comme réponse complète ; avec Aurora, diriger le code en lecture seule vers l'unique point de terminaison du lecteur est la modification minimale.

<!-- section: caching-services | objectives: 3.3.2 -->
## Services et stratégies de mise en cache

| Service | Moteur et fonctionnalités | À choisir pour |
| --- | --- | --- |
| ElastiCache for Valkey ou Redis OSS | Structures de données riches (ensembles triés, hachages, listes), réplication, Multi-AZ avec basculement automatique, sauvegardes, pub/sub, mode cluster pour le partitionnement | Cache de base de données hautement disponible, stockage de sessions, classements, limitation de débit |
| ElastiCache for Memcached | Clé-valeur simple, multithread, nœuds ajoutés pour l'échelle, ni réplication ni persistance | Cache d'objets simple où la perte d'un nœud est acceptable |
| ElastiCache Serverless | Valkey, Redis OSS ou Memcached sans choisir de nœuds ; mémoire, calcul et réseau mis à l'échelle automatiquement | Charge de cache imprévisible, charge opérationnelle minimale |
| DynamoDB Accelerator (DAX) | Cache en mémoire à écriture directe (write-through) pour DynamoDB, cache d'éléments et cache de requêtes, lectures en microsecondes | Tables DynamoDB en lecture intensive, éléments chauds, modification minimale du code (client DAX) |
| Amazon MemoryDB | Base de données en mémoire durable, journal de transactions Multi-AZ | Quand le stockage en mémoire doit aussi être la base principale durable |

Les caches d'autres couches soulagent aussi la base : **CloudFront** pour le contenu et les réponses d'API en périphérie, la **mise en cache d'API Gateway** pour les réponses d'API REST.

- DAX ne sert depuis son cache que les lectures **à cohérence éventuelle**. Les lectures fortement cohérentes (`ConsistentRead` à true) sont transmises à DynamoDB et ne sont pas mises en cache.
- Un cluster ElastiCache à base de nœuds se dimensionne par type et nombre de nœuds ; ElastiCache Serverless supprime ce choix.

> **Piège d'examen.** Memcached n'a ni réplication ni basculement Multi-AZ. « Le cache doit rester disponible si un nœud ou une AZ tombe en panne » ou « conserver les données mises en cache » mène à Valkey ou Redis OSS, pas à Memcached.

<!-- section: caching-integration | objectives: 3.3.13 -->
## Intégrer la mise en cache pour répondre aux exigences métier

| Stratégie | Fonctionnement | Force | Faiblesse |
| --- | --- | --- | --- |
| Chargement différé (lazy loading, cache-aside) | Lire le cache ; en cas d'absence, lire la base puis écrire le résultat dans le cache | Seules les données demandées sont en cache ; la panne d'un nœud n'est pas fatale | Pénalité en cas d'absence (trois allers-retours) ; les données peuvent devenir obsolètes |
| Écriture directe (write-through) | Chaque écriture en base met aussi le cache à jour | Les données en cache ne sont jamais obsolètes | Pénalité en écriture ; le cache se remplit de données jamais lues ; un nouveau nœud manque de données jusqu'à leur prochaine écriture |
| TTL sur les clés | Chaque clé expire après un nombre de secondes fixé | Limite l'obsolescence et le renouvellement inutile | Ne garantit pas la fraîcheur entre deux expirations |

Combinez-les : écriture directe pour les données qui doivent être fraîches, chargement différé pour combler les manques, et un TTL sur chaque clé.

| Exigence | Intégration |
| --- | --- |
| Pages produit lues des milliers de fois par mise à jour, légère obsolescence acceptable | Chargement différé avec TTL dans ElastiCache |
| Solde de compte affiché juste après une modification | Écriture directe, ou lecture en base |
| Sessions utilisateur partagées pour un niveau web Auto Scaling sans état | ElastiCache for Valkey ou Redis OSS (ou DynamoDB) comme stockage de sessions |
| Classement en temps réel | Ensembles triés d'ElastiCache for Valkey ou Redis OSS |
| Table DynamoDB en lecture intensive avec le moins de modifications du code | DAX devant la table |
| Réduire les requêtes SQL coûteuses répétées | Mettre en cache les résultats, avec comme clé la requête et ses paramètres |

> **Conseil d'examen.** Sortir les sessions des instances vers ElastiCache ou DynamoDB rend le niveau web sans état : le groupe Auto Scaling peut ajouter et retirer des instances sans sessions persistantes (sticky sessions) et sans déconnecter les utilisateurs.

<!-- section: connections-proxies | objectives: 3.3.5 -->
## Connexions aux bases de données et proxies

Chaque connexion consomme de la mémoire sur l'instance de base de données, et les moteurs plafonnent le nombre de connexions. Les clients sans serveur et très élastiques (fonctions Lambda, conteneurs qui s'étendent vite) ouvrent de nombreuses connexions courtes et peuvent épuiser la base même quand les requêtes sont légères.

**Amazon RDS Proxy** :

- Maintient un **pool de connexions** et partage les connexions entre clients, si bien que des milliers de connexions applicatives correspondent à moins de connexions en base.
- Réduit le temps de basculement (jusqu'à 66 % selon AWS) et garde les connexions applicatives ouvertes pendant qu'il se connecte à la nouvelle instance principale ou de secours.
- Authentifie les clients avec **IAM**, et se connecte à la base avec des informations d'identification stockées dans **AWS Secrets Manager** ou avec l'authentification de base de données IAM : aucun mot de passe dans le code.
- Prend en charge Aurora MySQL, Aurora PostgreSQL, RDS for MySQL, RDS for PostgreSQL, RDS for MariaDB et RDS for SQL Server. Il doit se trouver dans le **même VPC** que la base et ne peut pas être accessible publiquement.
- Pour des instances RDS en configuration de réplication, il s'associe au nœud d'écriture ; des points de terminaison de proxy supplémentaires, dont des points de terminaison en lecture seule pour Aurora, répartissent les lectures.

| Symptôme | Solution |
| --- | --- |
| Erreurs « too many connections » quand Lambda s'étend | RDS Proxy entre Lambda et la base (en plafonnant éventuellement la simultanéité réservée de la fonction) |
| Les basculements coupent trop longtemps les connexions applicatives | RDS Proxy, ou Aurora avec des réplicas |
| Informations d'identification de la base codées en dur dans les fonctions | RDS Proxy avec authentification IAM et Secrets Manager |
| Connexions épuisées par une flotte EC2 | Pool de connexions dans l'application ou RDS Proxy ; une classe d'instance plus grande relève la limite de connexions |

Dans Lambda, ouvrez la connexion **en dehors du gestionnaire** (handler) pour que les invocations à chaud la réutilisent.

> **Piège d'examen.** Une instance plus grande relève la limite de connexions mais coûte plus cher et n'arrête pas la vague suivante. « De nombreuses connexions de courte durée depuis Lambda » se résout avec RDS Proxy.

<!-- section: key-points -->
## Points clés

- Multi-AZ (instance) pour la disponibilité seule ; le cluster de bases de données Multi-AZ et les réplicas Aurora apportent disponibilité plus lectures ; Aurora Global Database et les réplicas interrégionaux pour les lectures mondiales et la reprise après sinistre ; les tables globales DynamoDB pour les écritures multi-Régions.
- Réplicas en lecture RDS : jusqu'à 15, asynchrones, sauvegardes automatiques obligatoires sur la source, même Région ou autre, création et promotion manuelles.
- Aurora : jusqu'à 15 réplicas, points de terminaison du lecteur et personnalisés, Aurora Auto Scaling, niveaux de basculement 0–15.
- ElastiCache for Valkey ou Redis OSS pour la haute disponibilité et les structures de données, Memcached pour un cache simple, Serverless pour ne rien dimensionner, DAX pour DynamoDB, MemoryDB pour une base principale en mémoire durable.
- Chargement différé, écriture directe et TTL se combinent ; des sessions en cache rendent le niveau web sans état.
- RDS Proxy mutualise les connexions, raccourcit les basculements et utilise IAM et Secrets Manager.
