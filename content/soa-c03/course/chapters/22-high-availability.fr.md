Une charge de travail hautement disponible continue de servir quand une instance, un hôte de base de données ou une zone de disponibilité entière tombe en panne. Pour l'ingénieur CloudOps, cela représente deux tâches : faire en sorte que les vérifications de l'état disent la vérité (groupes cibles des équilibreurs de charge, Route 53) et configurer la redondance vers laquelle elles basculent (bases de données Multi-AZ, groupes Auto Scaling répartis sur plusieurs zones, décalage de zone). Les questions d'examen décrivent un symptôme, par exemple des instances saines marquées défectueuses ou un basculement trop long, et demandent le paramètre à modifier.

<!-- section: elb-health-checks | objectives: 2.2.1 -->
## Vérifications de l'état d'Elastic Load Balancing

Chaque groupe cible exécute ses propres vérifications de l'état sur chaque cible enregistrée ; l'équilibreur de charge n'achemine le trafic que vers les cibles à l'état `healthy`.

| Paramètre | Valeur par défaut d'un Application Load Balancer | Valeur par défaut d'un Network Load Balancer |
| --- | --- | --- |
| Protocole | HTTP (HTTP ou HTTPS autorisés) | TCP (HTTP et HTTPS autorisés) |
| Port | Port de trafic de la cible | Port de trafic de la cible |
| Chemin | `/` (`/AWS.ALB/healthcheck` pour gRPC) | `/` pour les vérifications HTTP ou HTTPS |
| Intervalle | 30 secondes (plage de 5 à 300) | 30 secondes (plage de 5 à 300) |
| Délai d'expiration | 5 secondes | 6 secondes (HTTP), 10 secondes (TCP, HTTPS) |
| Seuil sain | 5 réussites consécutives | 5 |
| Seuil défectueux | 2 échecs consécutifs | 2 |
| Codes de réussite | 200 (configurable de 200 à 499) | 200 à 399 |

Avec les valeurs par défaut de l'ALB, une nouvelle cible a besoin de 5 × 30 secondes, soit environ deux minutes et demie, avant de recevoir du trafic ; réduisez l'intervalle ou le seuil sain pour mettre la capacité en ligne plus vite. Une cible qui échoue deux fois de suite ne reçoit plus de nouvelles requêtes.

Comportements associés :

- **Ouverture en cas d'échec** (fail open) : si toutes les cibles de toutes les zones activées sont défectueuses, l'équilibreur de charge achemine quand même le trafic vers toutes. Un Network Load Balancer s'ouvre aussi sur un groupe cible vide, et retire du DNS l'adresse IP d'une zone qui n'a plus de cible saine.
- **Délai de désinscription** (deregistration delay, ou drainage des connexions) : 300 secondes par défaut ; les requêtes en cours se terminent avant le retrait de la cible. Raccourcissez-le pour des requêtes courtes afin d'accélérer les déploiements et les réductions de capacité.
- **Intégration à Auto Scaling** : l'état du groupe cible ne remplace des instances que si le groupe utilise le type de vérification **ELB**.
- **Groupes cibles pondérés** : si l'un des groupes cibles d'une action de transfert pondérée n'a que des cibles défectueuses, l'ALB ne bascule pas automatiquement vers l'autre.

> **Piège d'examen.** Un chemin de vérification qui interroge la base de données marque toutes les cibles défectueuses dès que la base ralentit : la flotte s'ouvre en cas d'échec ou est remplacée en boucle. Pointez la vérification vers une page légère qui teste l'instance elle-même.

<!-- section: elb-troubleshooting | objectives: 2.2.1 -->
## Dépanner les cibles défectueuses

Lisez d'abord le code de motif : les codes qui commencent par `Elb` viennent de l'équilibreur de charge, ceux qui commencent par `Target` viennent de la cible.

```bash
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:eu-west-1:111122223333:targetgroup/web-tg/6d0ecf831eec9f09 \
  --query "TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Reason]" \
  --output text
```

| Code de motif | Cause probable | Correction |
| --- | --- | --- |
| `Elb.InitialHealthChecking` | Cible tout juste enregistrée | Attendre le seuil sain ; vérifier la période de grâce |
| `Target.Timeout` | Un groupe de sécurité ou une liste ACL réseau bloque le port de vérification, ou l'application est trop lente | Autoriser le groupe de sécurité de l'équilibreur de charge sur le port de vérification ; augmenter le délai d'expiration |
| `Target.ResponseCodeMismatch` | Le chemin renvoie 301/302 (redirection HTTP vers HTTPS), 403 ou 404 | Corriger le chemin ou ajouter le code aux codes de réussite |
| `Target.FailedHealthChecks` | Application arrêtée, port fermé, protocole de vérification incorrect | Vérifier le service ainsi que le port et le protocole de vérification |
| `Target.NotInUse` | Cible dans une zone non activée sur l'équilibreur de charge, ou groupe cible utilisé par aucune règle d'écouteur | Activer la zone ou rattacher le groupe cible |
| `Target.DeregistrationInProgress` | Cible en cours de retrait | Attendre la fin du délai de désinscription |

> **Conseil d'examen.** « Des instances derrière un ALB sont saines lorsqu'on les teste localement mais affichent `Target.Timeout` » désigne presque toujours un groupe de sécurité des instances qui n'autorise pas le trafic venant du groupe de sécurité de l'ALB sur le port de vérification.

<!-- section: route53-health-checks | objectives: 2.2.1 -->
## Vérifications de l'état d'Amazon Route 53

Les vérifications de l'état de Route 53 déterminent quels enregistrements le DNS renvoie avec le routage par basculement, pondéré, par latence, par géolocalisation et à réponse multivaleur. Types :

| Type | Surveille |
| --- | --- |
| Point de terminaison (public) | Une adresse IP ou un nom de domaine en HTTP, HTTPS ou TCP, avec en option une recherche de chaîne dans les 5 120 premiers octets du corps |
| Point de terminaison privé | Une ressource joignable depuis votre VPC (sous-réseau privé, site local via VPN ou Direct Connect), à partir d'une source de vérification créée dans le VPC |
| Calculée | Jusqu'à 255 vérifications enfants, saine quand au moins le nombre choisi est sain |
| Alarme CloudWatch | Le flux de données de l'alarme : OK est sain, ALARM est défectueux ; choisissez l'état en cas de données insuffisantes |
| Contrôle de routage ARC | Un interrupteur marche/arrêt que vous actionnez pendant un basculement contrôlé |

Décision d'une vérification de point de terminaison public :

- Des vérificateurs situés dans plusieurs Régions sondent toutes les 30 secondes (standard) ou 10 secondes (rapide) ; le point de terminaison est défectueux après le **seuil d'échec** (3 par défaut) d'échecs consécutifs.
- Le point de terminaison est sain si **plus de 18 %** des vérificateurs le signalent sain.
- HTTP et HTTPS : connexion TCP en 4 secondes, puis un statut 2xx ou 3xx en 2 secondes. TCP : connexion en 10 secondes. Les vérifications HTTPS ne valident pas le certificat.
- Les pare-feu et groupes de sécurité doivent autoriser les vérificateurs : utilisez la liste de préfixes gérée par AWS `com.amazonaws.<region>.route53-healthchecks`.
- Les métriques des vérifications (`HealthCheckStatus`, `HealthCheckPercentageHealthy`) n'existent que dans **us-east-1** : créez-y les alarmes et leurs rubriques SNS.

Pour les enregistrements d'alias vers un équilibreur de charge ou un autre alias, réglez **Évaluer l'état de la cible** (Evaluate Target Health) sur Oui au lieu de créer une vérification distincte ; sur Non, Route 53 continue de renvoyer l'enregistrement même si les cibles échouent. Un enregistrement non alias sans vérification de l'état est toujours considéré comme sain.

> **Piège d'examen.** Une vérification de point de terminaison public ne peut pas atteindre une instance d'un sous-réseau privé. Utilisez une vérification de point de terminaison privé, ou une alarme CloudWatch sur une métrique qui reflète l'état de la ressource et une vérification qui surveille cette alarme.

<!-- section: multi-az-compute | objectives: 2.2.2 -->
## Calcul, réseau et stockage tolérants aux pannes sur plusieurs zones

| Composant | Configuration tolérante aux pannes |
| --- | --- |
| Flotte EC2 | Groupe Auto Scaling avec des sous-réseaux dans au moins deux (de préférence trois) zones de disponibilité ; il lance dans la zone qui a le moins d'instances et rééquilibre (lancement avant résiliation) quand une zone redevient disponible |
| Application Load Balancer | Au moins deux zones obligatoires ; équilibrage de charge entre zones toujours actif au niveau de l'équilibreur (désactivable par groupe cible) |
| Network Load Balancer et Gateway Load Balancer | Équilibrage de charge entre zones désactivé par défaut ; activez-le quand les cibles sont réparties inégalement entre les zones |
| Passerelle NAT | Ressource zonale : une par zone, la table de routage de chaque sous-réseau privé pointant vers la passerelle NAT de sa propre zone |
| Amazon EFS | Système de fichiers régional (données dans plusieurs zones) pour la production ; One Zone est moins cher mais zonal |
| Amazon FSx | Le déploiement Multi-AZ (Windows File Server, ONTAP) ajoute un serveur de secours dans une autre zone |
| Volume EBS | Réside dans une seule zone : s'appuyer sur des instantanés et sur un niveau applicatif multizone |

Le **décalage de zone** (zonal shift) d'**Amazon Application Recovery Controller (ARC)** retire le trafic d'une ressource prise en charge (par exemple un équilibreur de charge et ses cibles) d'une zone dégradée, pour une durée d'une minute à trois jours, prolongeable et annulable. Les ressources doivent être inscrites (opt-in) et vous devez d'abord **dimensionner à l'avance** (prescale) les zones restantes. Le **décalage de zone automatique** (zonal autoshift) laisse AWS démarrer lui-même le décalage quand sa télémétrie détecte une dégradation de zone ; il exige des **exercices** hebdomadaires (practice runs, environ 30 minutes chacun) qui renvoient `SUCCEEDED` ou `FAILED`.

> **Conseil d'examen.** « Une charge de travail répartie sur deux zones doit survivre à la perte d'une zone à pleine capacité » signifie dimensionner chaque zone pour 100 % de la charge (stabilité statique), sans compter sur Auto Scaling pour lancer des remplacements pendant l'incident.

<!-- section: multi-az-databases | objectives: 2.2.2 -->
## Bases de données et caches Multi-AZ

| Option | Secours | Lisible | Réplication | Basculement |
| --- | --- | --- | --- | --- |
| Déploiement d'instance de base de données RDS Multi-AZ | Une instance, dans une autre zone | Non | Synchrone | 60 à 120 secondes en général ; l'enregistrement DNS du point de terminaison passe au secours |
| Cluster de base de données RDS Multi-AZ (MySQL, PostgreSQL) | Deux lecteurs dans deux autres zones | Oui | Semi-synchrone (un lecteur accuse réception) | Dépend du retard de réplication ; les lecteurs sont les cibles de basculement |
| Cluster Aurora | Réplicas Aurora, niveaux de priorité de 0 (le plus élevé) à 15 | Oui | Stockage partagé, six copies réparties sur plusieurs zones | En général moins de 60 secondes, souvent moins de 30 ; sans réplica, l'instance d'écriture est recréée dans la même zone (en général moins de 10 minutes) |
| ElastiCache Valkey ou Redis OSS | Réplicas dans d'autres zones | Oui | Asynchrone par défaut | Multi-AZ avec basculement automatique promeut un réplica |

Faits d'exploitation :

- Convertissez une instance RDS mono-AZ par une **modification** avec l'option Multi-AZ ; testez avec **Redémarrer avec basculement** (Reboot with failover). Déclencheurs du basculement automatique : panne de l'hôte principal ou de son stockage, perte de connectivité réseau, application de correctifs au système d'exploitation, instance principale qui ne répond plus, modification de l'instance ou basculement demandé par l'utilisateur. Abonnez-vous aux **notifications d'événements RDS** pour être informé d'un basculement.
- Les applications doivent se reconnecter après un basculement. Gardez une mise en cache DNS courte (pour Java, un TTL DNS de la JVM de 60 secondes au plus) et connectez-vous toujours par le point de terminaison, jamais par une adresse IP. **RDS Proxy** maintient les connexions des clients ouvertes et peut réduire jusqu'à 66 % le temps de basculement d'Aurora.
- Aurora promeut le réplica du niveau de priorité le plus élevé, puis le plus grand de ce niveau. Placez les lecteurs dans des zones différentes de celle de l'instance d'écriture.
- Un secours Multi-AZ n'est pas une solution de mise à l'échelle des lectures : pour les lectures, utilisez des réplicas en lecture, un cluster de base de données Multi-AZ ou des réplicas Aurora.

> **Piège d'examen.** Un réplica en lecture dans une autre zone n'est pas un basculement automatique : sa promotion est une action manuelle qui crée une instance autonome avec un nouveau point de terminaison. « Basculement automatique sans modification de l'application » désigne Multi-AZ.

<!-- section: key-points -->
## Points clés

- Valeurs par défaut de l'ALB : HTTP sur `/`, toutes les 30 secondes, délai de 5 secondes, 5 sains / 2 défectueux, code de réussite 200 ; le NLB utilise TCP par défaut. Toutes les cibles défectueuses entraînent l'ouverture en cas d'échec.
- Lisez le code de motif : `Target.Timeout` est en général un groupe de sécurité, `Target.ResponseCodeMismatch` une redirection ou un mauvais chemin, `Target.NotInUse` une zone non activée.
- Activez le type de vérification ELB sur le groupe Auto Scaling ; le délai de désinscription est de 300 secondes par défaut.
- Route 53 : vérificateurs toutes les 30 ou 10 secondes, seuil d'échec de 3, sain au-delà de 18 %, autoriser la liste de préfixes `route53-healthchecks`, métriques uniquement dans us-east-1, Évaluer l'état de la cible pour les alias ; vérifications de point de terminaison privé ou d'alarme CloudWatch pour les ressources privées.
- Répartissez les groupes Auto Scaling sur plusieurs zones, une passerelle NAT par zone, EFS régional et FSx Multi-AZ ; décalage de zone ARC (jusqu'à trois jours) et décalage de zone automatique avec exercices.
- Instance RDS Multi-AZ : un secours synchrone non lisible, basculement de 60 à 120 secondes ; cluster de base de données Multi-AZ : deux lecteurs lisibles ; Aurora : réplicas par niveaux, basculement en général sous 30 à 60 secondes ; RDS Proxy raccourcit le basculement.
