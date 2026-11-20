Une charge de travail élastique ajoute de la capacité avant que les utilisateurs ne perçoivent un ralentissement et la retire quand la demande baisse. SOA-C03 interroge le côté opérateur de cette promesse : quel paramètre Auto Scaling explique un groupe qui monte en charge trop tard ou qui oscille, comment garder hors service une instance lente à démarrer tant qu'elle n'est pas prête, où un cache retire de la charge à une base de données, et comment RDS, Aurora et DynamoDB grandissent sans interruption.

<!-- section: asg-configuration | objectives: 2.1.1 -->
## Paramètres d'un groupe Auto Scaling qui déterminent son comportement

Un groupe Auto Scaling maintient sa **capacité souhaitée** (desired capacity) entre un **minimum** et un **maximum**, en lançant des instances à partir d'un modèle de lancement (launch template) dans les sous-réseaux (zones de disponibilité) indiqués. Les paramètres ci-dessous expliquent la plupart des scénarios d'examen :

| Paramètre | Valeur par défaut | Ce qu'il contrôle |
| --- | --- | --- |
| Type de vérification de l'état | Vérifications de statut EC2 et événements planifiés | Ajoutez les vérifications **ELB** pour qu'une instance qui échoue à la vérification du groupe cible soit remplacée ; elles sont ignorées tant que vous ne les activez pas |
| Période de grâce de la vérification de l'état | 300 secondes dans la console, 0 avec la CLI ou un SDK | Délai après le lancement avant que les échecs de vérification ne comptent contre une nouvelle instance |
| Préchauffage d'instance par défaut (default instance warmup) | Non défini | Délai après `InService` avant que les métriques d'une instance comptent dans les métriques agrégées du groupe ; commencez à 300 secondes puis ajustez |
| Temps de stabilisation par défaut (default cooldown) | 300 secondes | Pause entre les activités des politiques de mise à l'échelle **simple** uniquement |
| Politique de maintenance des instances (instance maintenance policy) | Non définie | Pourcentages minimal et maximal d'instances saines pendant les remplacements (vérifications de l'état, actualisation d'instance), par exemple lancer avant de résilier |

Fonctionnement des vérifications : une instance qui n'est plus `running` est marquée défectueuse et remplacée immédiatement ; un statut `impaired` laisse d'abord quelques minutes à AWS pour corriger le problème ; une instance visée par un événement planifié est remplacée. Les remplacements portent sur 10 % au plus de la capacité souhaitée à la fois et ignorent le temps de stabilisation.

> **Piège d'examen.** Un groupe créé avec la CLI a une période de grâce de 0. Avec les vérifications ELB activées, de nouvelles instances qui ont besoin de trois minutes pour démarrer l'application échouent à la vérification du groupe cible et sont résiliées en boucle. Définissez une période de grâce ou, mieux, un hook de cycle de vie de lancement qui garde l'instance en `Pending:Wait` jusqu'à ce qu'elle soit prête.

<!-- section: scaling-policies | objectives: 2.1.1 -->
## Choisir et régler une politique de mise à l'échelle

| Exigence | Politique |
| --- | --- |
| Maintenir une métrique proche d'une valeur (CPU moyen à 50 %, 1 000 requêtes par cible) | Suivi de cible (target tracking) (`ASGAverageCPUUtilization`, `ASGAverageNetworkIn`, `ASGAverageNetworkOut`, `ALBRequestCountPerTarget` ou une métrique personnalisée) |
| Ajouter d'autant plus d'instances que le seuil d'alarme est dépassé | Mise à l'échelle par étapes (step) avec des ajustements par étape |
| Un ajustement fixe par alarme, puis attente | Mise à l'échelle simple (utilise le temps de stabilisation) |
| Pics calendaires connus (lundi 8 h, fin de mois) | Action planifiée qui modifie la capacité minimale, maximale ou souhaitée |
| Rythme quotidien ou hebdomadaire récurrent, démarrage lent | Mise à l'échelle prédictive, combinée au suivi de cible |

Faits opérationnels :

- Le suivi de cible **crée et possède ses alarmes CloudWatch** : ne les modifiez ni ne les supprimez jamais. Il réduit la capacité plus progressivement qu'il ne l'augmente. Avec plusieurs politiques de suivi de cible (chacune sur une métrique différente), le groupe augmente sa capacité dès qu'une politique le demande et ne la réduit que si toutes sont d'accord.
- Types d'ajustement des politiques par étapes et simples : `ChangeInCapacity`, `ExactCapacity`, `PercentChangeInCapacity` (avec `MinAdjustmentMagnitude`).
- Le suivi de cible et la mise à l'échelle par étapes n'attendent pas le temps de stabilisation ; pendant le préchauffage des nouvelles instances, la réduction de capacité par ces politiques est bloquée.
- La mise à l'échelle prédictive exige au moins 24 heures de données (deux semaines, c'est mieux) et produit une prévision horaire pour les 48 heures suivantes, actualisée toutes les 6 heures. Commencez en mode **prévision uniquement** (forecast only), puis passez en mode **prévision et mise à l'échelle** (forecast and scale). Elle ne réduit jamais la capacité : gardez une politique dynamique pour cela. `SchedulingBufferTime` lance la capacité avant l'heure prévue. Quand plusieurs politiques sont actives, la capacité souhaitée est le plus élevé de leurs résultats.

```json
{
  "TargetValue": 1000.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ALBRequestCountPerTarget",
    "ResourceLabel": "app/web-alb/50dc6c495c0c9188/targetgroup/web-tg/6d0ecf831eec9f09"
  }
}
```

> **Conseil d'examen.** « La capacité arrive trop tard chaque matin alors que le pic est identique chaque jour » désigne la mise à l'échelle prédictive ou une action planifiée, pas une valeur cible plus basse. « Le groupe ajoute et retire des instances toutes les quelques minutes » désigne un préchauffage d'instance par défaut manquant ou une politique par étapes aux seuils trop rapprochés.

<!-- section: asg-lifecycle | objectives: 2.1.1 -->
## Hooks de cycle de vie, warm pools et processus suspendus

Les **hooks de cycle de vie** (lifecycle hooks) mettent une instance en pause en `Pending:Wait` (lancement) ou `Terminating:Wait` (réduction de capacité) pour qu'un script, un runbook Systems Manager Automation ou une fonction Lambda invoquée par EventBridge installe des logiciels, l'enregistre ou copie des journaux avant la résiliation. Délai d'expiration (heartbeat timeout) : 30 à 7 200 secondes, 3 600 par défaut ; le résultat par défaut est `ABANDON` (`CONTINUE` est l'autre valeur). Enregistrez un heartbeat pour relancer le délai et terminez l'action dès que le travail est fait.

```bash
aws autoscaling put-lifecycle-hook --auto-scaling-group-name web-asg \
  --lifecycle-hook-name drain-logs \
  --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
  --heartbeat-timeout 900 --default-result CONTINUE

aws autoscaling complete-lifecycle-action --auto-scaling-group-name web-asg \
  --lifecycle-hook-name drain-logs --instance-id i-0abc1234def567890 \
  --lifecycle-action-result CONTINUE
```

Les **warm pools** gardent à côté du groupe des instances préinitialisées pour les applications longues à démarrer. États du pool : `Stopped` (seuls les volumes et les adresses IP Elastic sont facturés, le choix habituel), `Hibernated` (mémoire conservée sur le volume racine EBS), `Running` (déconseillé : coût complet de l'instance). Limites : un volume racine EBS est nécessaire, pas d'instances Spot, pas de groupe à instances mixtes pondérées. Par défaut, le pool contient la capacité maximale moins la capacité souhaitée.

Autres contrôles :

- La **protection contre la réduction de capacité** (scale-in protection) d'une instance empêche le groupe de la résilier lors d'une réduction (elle est quand même remplacée si elle est défectueuse).
- **Suspendre des processus** (`Launch`, `Terminate`, `HealthCheck`, `ReplaceUnhealthy`, `AZRebalance`, `AlarmNotification`, `ScheduledActions`, `AddToLoadBalancer`, `InstanceRefresh`) fige un comportement pendant le dépannage, par exemple `ReplaceUnhealthy` pour examiner une instance en échec. Un groupe qui ne parvient à lancer aucune instance pendant plus de 24 heures peut recevoir une **suspension administrative** ; corrigez la cause et reprenez les processus.
- Les échecs de lancement apparaissent dans l'**historique d'activité** du groupe : type d'instance indisponible dans une zone, quota de vCPU, AMI supprimée, paire de clés ou groupe de sécurité absent, clé KMS que le rôle lié au service ne peut pas utiliser.

> **Piège d'examen.** Les instances d'un warm pool sont arrêtées ou mises en veille prolongée sans attendre la fin des données utilisateur (user data). Sans hook de cycle de vie de lancement, une instance à moitié configurée peut être mise en service lors de la montée en charge suivante.

<!-- section: serverless-container-scaling | objectives: 2.1.1 -->
## Mettre à l'échelle les conteneurs et les fonctions Lambda

La **mise à l'échelle automatique des services Amazon ECS** utilise **Application Auto Scaling** pour modifier le nombre souhaité de tâches du service : politiques de suivi de cible (CPU moyen, mémoire moyenne, requêtes ALB par cible), par étapes, planifiées et prédictives. La réduction de capacité est désactivée pendant un déploiement ECS ; fixez un minimum de 0 pour qu'un service puisse descendre à zéro. Sur une capacité EC2, les tâches ont aussi besoin d'instances : un fournisseur de capacité (capacity provider) avec mise à l'échelle gérée agrandit le groupe Auto Scaling sous-jacent.

**AWS Lambda** se met à l'échelle par la simultanéité (concurrency), c'est-à-dire le nombre d'environnements d'exécution actifs en même temps :

| Contrôle | Effet |
| --- | --- |
| Quota de simultanéité du compte | 1 000 par Région par défaut, partagé par toutes les fonctions ; Lambda garde 100 unités non réservées, donc 900 au plus peuvent être réservées par défaut |
| Simultanéité réservée (reserved concurrency) | Garantit et **plafonne** la simultanéité d'une fonction ; sans coût supplémentaire ; les requêtes au-delà sont limitées (throttled) |
| Simultanéité provisionnée (provisioned concurrency) | Environnements préinitialisés sur une version ou un alias, pas de démarrage à froid, coût supplémentaire ; planifiée ou selon l'utilisation via Application Auto Scaling |
| Vitesse de mise à l'échelle | Chaque fonction ajoute jusqu'à 1 000 environnements d'exécution toutes les 10 secondes |

> **Conseil d'examen.** « Une fonction de traitement par lots ne doit jamais dépasser 50 exécutions simultanées pour ne pas submerger la base de données en aval » correspond à une simultanéité réservée de 50. « Une fonction sensible à la latence subit des démarrages à froid pendant les heures ouvrées » correspond à une simultanéité provisionnée planifiée avec Application Auto Scaling.

<!-- section: caching | objectives: 2.1.2 -->
## Mise en cache avec CloudFront, ElastiCache et DAX

**Amazon CloudFront** absorbe le trafic de lecture en périphérie. Une **politique de cache** (cache policy) définit la clé de cache (en-têtes, cookies, chaînes de requête) et les TTL ; tout ce qui figure dans la clé de cache est aussi envoyé à l'origine, et une **politique de requête d'origine** (origin request policy) transmet des valeurs supplémentaires sans les ajouter à la clé. Moins la clé contient de valeurs, plus le taux d'accès au cache est élevé.

| Réponse de l'origine | TTL appliqué par CloudFront |
| --- | --- |
| Aucun en-tête `Cache-Control` ni `Expires` | TTL par défaut (24 heures sans politique de cache) |
| `max-age` ou `s-maxage` compris dans la plage | La valeur de l'en-tête (`s-maxage` prime pour CloudFront, les navigateurs utilisent `max-age`) |
| En-tête inférieur au TTL minimal ou supérieur au TTL maximal | Ramené au TTL minimal ou maximal |
| `no-cache`, `no-store`, `private` avec un TTL minimal de 0 | Non mis en cache |
| TTL minimal, par défaut et maximal tous à 0 | Mise en cache désactivée |

**Origin Shield** ajoute une couche de cache régionale devant l'origine pour qu'idéalement une seule requête par objet l'atteigne : utile pour des spectateurs répartis sur plusieurs Régions ou une origine sur site limitée. Pour des fichiers souvent mis à jour, des noms de fichiers versionnés sont moins chers et plus fiables que les invalidations.

**Amazon ElastiCache** décharge les lectures répétées de la base de données et les données de session :

| Besoin | Choix |
| --- | --- |
| Aucune planification de capacité, mise à l'échelle automatique, réplication Multi-AZ intégrée | ElastiCache Serverless (Valkey, Redis OSS ou Memcached), facturé au Go stocké et à l'ECPU |
| Réplicas, basculement automatique, sauvegardes, types de données complexes | Cluster Valkey ou Redis OSS à nœuds |
| Mettre à l'échelle les écritures et la mémoire au-delà d'un nœud, repartitionnement en ligne | Valkey ou Redis OSS avec **mode cluster activé** (cluster mode enabled) |
| Cache clé-valeur simple et multithread, ajout ou retrait de nœuds | Memcached (pas de réplication, pas de basculement) |

Les clusters Valkey et Redis OSS à nœuds avec mode cluster activé prennent en charge la **mise à l'échelle automatique des partitions (shards) et des réplicas** (suivi de cible sur le CPU du moteur ou l'utilisation de la capacité de la base). Stratégies de cache : le **chargement différé** (lazy loading) ne met en cache que les données demandées mais renvoie des données obsolètes et coûte trois allers-retours en cas d'échec de cache ; l'**écriture simultanée** (write-through) garde le cache à jour mais y place des données jamais lues ; ajoutez un **TTL** pour borner l'obsolescence.

**DynamoDB Accelerator (DAX)** est un cache à écriture simultanée, dans le VPC, pour DynamoDB, avec des lectures de l'ordre de la microseconde et aucun changement en dehors du client DAX. Le TTL du cache d'éléments est de 5 minutes par défaut. Seules les lectures à cohérence éventuelle sont servies par le cache ; les lectures fortement cohérentes sont transmises à DynamoDB.

> **Piège d'examen.** DAX n'aide pas une charge de travail qui utilise des lectures fortement cohérentes et ne met pas en cache d'autres bases de données. Pour décharger les lectures RDS, utilisez ElastiCache ou des réplicas en lecture.

<!-- section: rds-aurora-scaling | objectives: 2.1.3 -->
## Mettre à l'échelle Amazon RDS et Aurora

| Besoin | Mécanisme |
| --- | --- |
| Plus de CPU ou de mémoire | Modifier la classe d'instance de base de données, immédiatement ou pendant la fenêtre de maintenance (brève interruption) |
| Stockage qui se remplit | **Mise à l'échelle automatique du stockage** (storage autoscaling) : définir un seuil de stockage maximal (`--max-allocated-storage`) |
| Charge de lecture élevée sur RDS | Réplicas en lecture : jusqu'à 15 par instance principale, asynchrones, sauvegardes automatiques obligatoires (rétention différente de 0), surveiller `ReplicaLag` |
| Charge de lecture élevée sur Aurora | Jusqu'à 15 réplicas Aurora derrière le point de terminaison du lecteur (reader endpoint), ajoutés et retirés par **Aurora Auto Scaling** (suivi de cible, temps de stabilisation par défaut de 300 secondes) |
| Charge imprévisible ou intermittente sur Aurora | **Aurora Serverless v2** |
| Trop de connexions depuis Lambda ou une grande flotte | Regroupement de connexions par **RDS Proxy** |

La mise à l'échelle automatique du stockage démarre quand l'espace libre est inférieur ou égal à 10 % du stockage alloué pendant au moins cinq minutes, et qu'au plus quatre modifications ont eu lieu en 24 heures. Chaque augmentation est la plus grande valeur entre 10 Gio, 10 % du stockage alloué ou la croissance prévue pour les 7 heures suivantes. Elle ne réduit jamais le stockage, et le seuil maximal doit dépasser d'au moins 10 % le stockage actuel.

Aurora Serverless v2 se met à l'échelle par paliers d'à peine 0,5 **unité de capacité Aurora (ACU)** (environ 2 Gio de mémoire chacune), d'un minimum qui peut être 0 (pause automatique sur les versions récentes) jusqu'à 256 ACU (384 pour certaines versions d'Aurora PostgreSQL). Un cluster peut mêler des instances provisionnées et Serverless v2 ; les lecteurs des niveaux de promotion 0 et 1 gardent au moins la capacité de l'instance d'écriture pour qu'un basculement n'aboutisse pas sur une petite instance.

> **Piège d'examen.** Aurora Auto Scaling ne fonctionne que si le cluster possède déjà au moins un lecteur, et il ne supprime que les réplicas qu'il a créés. Un réplica en lecture ne résout pas un goulot d'étranglement en écriture : augmentez plutôt la classe de l'instance d'écriture (ou le maximum de Serverless v2).

<!-- section: dynamodb-scaling | objectives: 2.1.3 -->
## Mettre à l'échelle Amazon DynamoDB

| Exigence | Mode de capacité |
| --- | --- |
| Trafic inconnu ou en pointes, aucune gestion de capacité (par défaut, recommandé) | À la demande (on-demand) |
| Trafic stable et prévisible, coût le plus bas | Provisionné avec mise à l'échelle automatique |

La mise à l'échelle automatique en mode provisionné utilise le suivi de cible d'Application Auto Scaling avec une utilisation cible comprise entre 20 % et 90 % (la console propose 70 %). Elle réagit quand la capacité consommée dépasse la cible pendant deux minutes consécutives et met plusieurs minutes à s'appliquer : les requêtes au-delà de l'ancienne capacité sont limitées entre-temps ; la capacité de rafale (burst capacity) n'absorbe que les pics courts. La réduction intervient après 15 points de données consécutifs sous la cible. Chaque **index secondaire global possède sa propre capacité** et a besoin de sa propre politique : un GSI sous-provisionné limite les écritures dans la table de base.

Vous pouvez faire passer une table du mode provisionné au mode à la demande jusqu'à quatre fois sur une fenêtre glissante de 24 heures, et revenir au mode provisionné à tout moment.

> **Conseil d'examen.** « Limitations sur une table provisionnée pendant des rafales courtes et imprévisibles malgré la mise à l'échelle automatique » désigne le mode à la demande. « Lectures intensives des mêmes éléments » désigne DAX, pas davantage de capacité.

<!-- section: key-points -->
## Points clés

- Les vérifications ELB sur le groupe, une période de grâce réaliste et un préchauffage d'instance par défaut évitent la plupart des boucles de remplacement et des oscillations.
- Suivi de cible dans la plupart des cas (ne modifiez jamais ses alarmes), par étapes pour des réactions graduées, planifiée pour les pics calendaires, prédictive (prévision uniquement d'abord) pour les rythmes récurrents ; seule la mise à l'échelle simple utilise le temps de stabilisation.
- Hooks de cycle de vie : `Pending:Wait` et `Terminating:Wait`, délai de 30 à 7 200 secondes (3 600 par défaut, résultat par défaut `ABANDON`). Les warm pools réduisent la latence de démarrage ; les processus suspendus aident au dépannage.
- ECS utilise Application Auto Scaling ; simultanéité Lambda : 1 000 par Région par défaut, la réservée plafonne, la provisionnée supprime les démarrages à froid.
- Politiques de cache et TTL CloudFront, Origin Shield ; ElastiCache Serverless ou Valkey/Redis OSS à nœuds pour les réplicas et le basculement, Memcached pour un cache simple multithread ; DAX pour les lectures DynamoDB à cohérence éventuelle.
- RDS : modifier la classe, mise à l'échelle automatique du stockage, jusqu'à 15 réplicas en lecture ; Aurora Auto Scaling des réplicas, Serverless v2 par paliers de 0,5 ACU, RDS Proxy pour les connexions.
- DynamoDB : à la demande pour les pointes, provisionné avec suivi de cible de 20 à 90 % pour une charge stable, mettre à l'échelle chaque GSI.
