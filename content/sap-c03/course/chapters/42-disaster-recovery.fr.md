Au niveau professionnel, une question de reprise après sinistre s'arrête rarement au nom d'une stratégie. Elle fixe des RTO et RPO différents par niveau d'application, un budget, des serveurs encore sur site, des conteneurs dans plusieurs clusters et un audit qui exige la preuve que le plan fonctionne. SAP-C03 vérifie comment associer chaque niveau à une stratégie, répliquer des serveurs avec AWS Elastic Disaster Recovery, orchestrer un basculement régional qui ne dépend pas de la Région touchée, puis évaluer et tester le résultat avec AWS Resilience Hub.

<!-- section: dr-requirements | objectives: 4.2.1 -->
## Adapter la reprise après sinistre au RTO, au RPO et au coût

Le RPO dépend de la façon dont les données atteignent le site de reprise ; le RTO, de la part de la pile qui y tourne déjà et du degré d'automatisation du basculement.

| Stratégie | Données dans la Région de reprise | Calcul dans la Région de reprise | Briques AWS typiques |
| --- | --- | --- | --- |
| Sauvegarde et restauration (backup and restore) | Copies périodiques | Aucun avant le basculement | Copies AWS Backup inter-Régions et entre comptes, IaC pour reconstruire |
| Environnement de veille (pilot light) | Réplication continue | Services centraux seulement, niveau applicatif arrêté ou à zéro | Aurora Global Database, tables globales DynamoDB, réplication S3, groupes Auto Scaling à zéro, Elastic Disaster Recovery |
| Secours semi-automatique (warm standby) | Réplication continue | Copie fonctionnelle à capacité réduite | Mêmes services de données, petits groupes Auto Scaling ou services ECS, runbook de montée en charge |
| Actif/actif multisite (multi-site active/active) | Continue, accessible en écriture dans plusieurs Régions | Pleine capacité, au service du trafic | Tables globales DynamoDB, Aurora Global Database avec transfert d'écriture (write forwarding), routage par latence ou géoproximité, Global Accelerator |

Principes de conception valorisés à l'examen :

- **Hiérarchisez le portefeuille.** Une API de paiement avec un RPO de quelques secondes et un outil de reporting avec un RPO de 24 heures n'ont pas besoin de la même conception ; appliquez la stratégie la moins chère par niveau plutôt qu'une stratégie unique.
- **Privilégiez les opérations du plan de données pour basculer.** Les actions du plan de contrôle (créer des ressources, modifier des enregistrements DNS, changer des configurations) sont les plus susceptibles d'être dégradées pendant un incident régional. L'état des vérifications de l'état, l'état des contrôles de routage ARC et la mise à l'échelle de ressources déjà créées sont plus sûrs.
- **Stabilité statique (static stability).** Une capacité qui existe déjà dans la Région de reprise ne dépend pas du lancement d'instances pendant l'incident ; une capacité à lancer dépend des quotas et de la capacité disponible.
- **Protégez aussi contre les défaillances logiques.** La réplication copie les corruptions et les suppressions ; conservez des sauvegardes à un instant donné dans un compte distinct (chapitre sur la continuité des activités).

> **Piège d'examen.** « RPO de 15 minutes, RTO de 4 heures, la solution la PLUS rentable » n'exige pas de secours semi-automatique : une réplication continue avec un calcul déployé au basculement (environnement de veille, ou Elastic Disaster Recovery pour les serveurs) y répond pour une fraction du coût.

<!-- section: elastic-disaster-recovery | objectives: 4.2.2 -->
## Réplication continue avec AWS Elastic Disaster Recovery

**AWS Elastic Disaster Recovery (AWS DRS)** protège des serveurs sur site et dans le cloud, ainsi que des instances EC2 vers une autre zone de disponibilité ou une autre Région :

- Un agent réplique chaque serveur source vers un **sous-réseau de zone intermédiaire (staging area subnet)** de la Région et du compte choisis, avec un stockage peu coûteux et un calcul minimal : aucun serveur pleine taille ne tourne avant une récupération.
- AWS DRS permet des **RPO de quelques secondes** et des **RTO de quelques minutes**.
- **Récupération à un instant donné (point-in-time recovery)** : lancement depuis l'état le plus récent ou depuis un instantané antérieur, par exemple l'état avant une infection par un rançongiciel.
- Au lancement, les serveurs sont convertis pour démarrer et s'exécuter nativement sur EC2, selon leurs paramètres de lancement.
- Les **exercices (drills)** lancent des instances de récupération isolées ; un exercice de récupération ou de retour arrière n'arrête pas la réplication (aucun impact sur le RPO) et n'affecte pas la source.
- **Retour arrière (failback)** : une fois le site principal réparé, répliquez les instances récupérées en sens inverse et revenez quand vous êtes prêt, ou restez sur AWS.

```bash
# Drill from a specific point in time; omit recoverySnapshotID to use the latest data
aws drs start-recovery --is-drill \
  --source-servers sourceServerID=s-1234567890abcdef0,recoverySnapshotID=pit-0123456789abcdef0
```

| Exigence | Service |
| --- | --- |
| Des centaines de serveurs sur site, RPO de quelques secondes, faible coût de veille | AWS Elastic Disaster Recovery |
| Déplacement ponctuel de serveurs vers AWS | AWS Transform MGN (migration, pas reprise continue) |
| Copies à un instant donné avec règles de rétention, RPO de quelques heures | AWS Backup |
| Base de données gérée entre Régions | La réplication du moteur : Aurora Global Database, tables globales DynamoDB, réplicas en lecture RDS inter-Régions |

> **Conseil d'examen.** « Revenir à l'état précédant le début du chiffrement par un rançongiciel, avec une perte de données minimale » désigne, pour des serveurs, la récupération à un instant donné d'Elastic Disaster Recovery ; pour des bases de données gérées, la restauration à un instant donné depuis les sauvegardes.

<!-- section: assessment-runbooks | objectives: 4.2.3 -->
## Évaluer la reprise avec Resilience Hub et les runbooks Systems Manager

**AWS Resilience Hub** compare une application à des objectifs de résilience :

1. **Décrivez l'application** à partir de collections de ressources : piles CloudFormation, AWS Resource Groups, applications myApplications, fichiers d'état Terraform dans S3 (version 0.12 ou ultérieure, 4 Mo au maximum) et clusters Amazon EKS avec leurs espaces de noms. Les piles, groupes et clusters peuvent provenir d'autres comptes et Régions.
2. **Associez une politique de résilience (resiliency policy)** : un niveau (services IT centraux fondamentaux, critique pour la mission, critique, important, non critique) et des RTO et RPO cibles pour chaque type de perturbation : application client, infrastructure, zone de disponibilité et, en option, Région pour les applications multi-Régions. Des politiques suggérées (par exemple « Global Mission Critical Application ») sont fournies ; plusieurs applications peuvent partager une politique.
3. **Lancez une évaluation** : Resilience Hub estime le RTO et le RPO de la charge de travail par AppComponent (un groupe de ressources qui tombent en panne ensemble, comme une base principale et son réplica) et indique **politique respectée (policy met)** ou **politique enfreinte (policy breached)**.
4. **Examinez les recommandations** : modifications de résilience (par exemple Multi-AZ, réplication inter-Régions), optimisation des coûts et éléments opérationnels : **alarmes** CloudWatch, **procédures opérationnelles standard (SOP)** et **expériences AWS FIS** pour vérifier les deux.
5. Suivez le **score de résilience** et la **dérive** : dérive de politique (un AppComponent conforme auparavant qui ne l'est plus) et dérive des ressources (ressources ajoutées ou supprimées dans les sources d'entrée).

Une politique avec un RTO et un RPO de 0 produit toujours « Policy breached » : fixez des cibles réalistes.

Les SOP s'exécutent sous forme de **runbooks AWS Systems Manager Automation** : des documents aux étapes ordonnées (appeler des API AWS, exécuter des scripts, attendre une approbation) qui s'exécutent toujours de la même façon, entre comptes et Régions, avec contrôle du débit. Un runbook qui promeut un cluster secondaire Aurora, met à l'échelle un groupe Auto Scaling et bascule un contrôle de routage transforme une page de wiki en procédure testée.

> **Conseil d'examen.** « Vérifier en continu que chaque application respecte encore son RTO et son RPO après chaque déploiement, dans 40 comptes » désigne des évaluations Resilience Hub dans le pipeline de livraison avec des politiques de résilience par niveau, pas une revue manuelle trimestrielle.

<!-- section: multi-region-failover | objectives: 4.2.4 -->
## Basculement multi-Régions : Route 53, Global Accelerator et ARC

| Mécanisme | Ce qui bascule | Remarques |
| --- | --- | --- |
| Enregistrements de basculement Route 53 avec vérifications de l'état | Les réponses DNS | Intervalle de 30 s ou 10 s (rapide, facturé en supplément) ; au moins trois Régions de vérificateurs ; les vérifications calculées combinent jusqu'à 256 vérifications enfants ; une vérification peut suivre une alarme CloudWatch (résolution standard uniquement) ; recherche de chaîne dans les 5 120 premiers octets |
| AWS Global Accelerator | Le groupe de points de terminaison qui reçoit les nouvelles connexions | Adresses IP anycast statiques, sans délai de cache DNS ; numéros de trafic (traffic dials) de 0 à 100 % par Région (100 par défaut), appliqués aux nouvelles connexions seulement ; pondération des points de terminaison dans un groupe |
| Contrôle de routage ARC (routing control) | Des interrupteurs marche/arrêt lus par les vérifications de l'état de contrôle de routage Route 53 | Cluster = plan de données de points de terminaison dans cinq Régions ; appelez l'API du plan de données avec des nouvelles tentatives sur les différents points de terminaison ; règles de sécurité (par exemple, un seul réplica actif), contournables en urgence ; une TTL de 60 à 120 s est courante |
| ARC Region switch | Un plan de récupération complet | Plans composés de flux de travail, d'étapes et de blocs d'exécution exécutés en parallèle ou en séquence ; actif/passif (basculement, retour arrière) ou actif/actif (shift away, return) ; ressources dans plusieurs comptes ; déclenchement manuel ou par alarme CloudWatch ; un plan de données dans chaque Région, donc le plan ne dépend pas de la Région désactivée |
| Décalage zonal (zonal shift) et décalage zonal automatique (zonal autoshift) ARC | Le trafic, hors d'une zone de disponibilité | ALB, NLB, groupes EC2 Auto Scaling, EKS ; le décalage zonal est manuel, avec une expiration prolongeable jusqu'à trois jours ; le décalage automatique est lancé par AWS selon sa télémétrie |

Les **blocs d'exécution (execution blocks)** de Region switch comprennent : mise à l'échelle d'un groupe EC2 Auto Scaling, mise à l'échelle d'un service ECS, mise à l'échelle des ressources EKS, récupération d'Aurora Global Database, mise à l'échelle d'Aurora provisionné et Serverless, récupération des clusters globaux DocumentDB et Neptune, promotion d'un réplica en lecture RDS, contrôle de routage ARC, vérification de l'état Route 53, approbation manuelle, action Lambda personnalisée, mappage de source d'événements Lambda, Systems Manager Run Command et plans enfants.

Les données doivent basculer avec le trafic : promouvez le cluster secondaire Aurora (switchover s'il est planifié, failover si le principal est perdu), redirigez les écritures pour les tables globales DynamoDB, utilisez la réplication S3 avec Replication Time Control, les secrets répliqués de Secrets Manager et les clés multi-Régions KMS pour que la Région de reprise puisse déchiffrer.

> **Piège d'examen.** Une fonction Lambda qui modifie des enregistrements Route 53 pendant la panne s'appuie sur le plan de contrôle de Route 53, qui n'est pas conçu pour ce chemin critique. « Le basculement le plus fiable, piloté par l'équipe d'exploitation » désigne les contrôles de routage ARC (ou un plan Region switch), dont les changements d'état passent par le plan de données.

<!-- section: dr-testing | objectives: 4.2.5 -->
## Tester et valider les procédures de reprise

Un plan non testé a un RTO inconnu. La validation combine :

- des **évaluations Resilience Hub** planifiées et intégrées au pipeline CI/CD, pour détecter avant la production une modification qui enfreint la politique ; les expériences FIS recommandées vérifient que les alarmes détectent la panne et que les SOP récupèrent dans la cible. Les tests de SOP mesurent le RTO et le RPO estimés de la charge de travail par rapport à la politique ;
- des **exercices Elastic Disaster Recovery** à intervalle régulier, sans impact sur la réplication ;
- des **game days** qui exécutent le vrai runbook dans la Région de reprise, y compris le **retour arrière**, souvent oublié et qui exige une réplication inverse ;
- la **préparation de la Région de reprise** : quotas de service relevés, AMI et images de conteneurs présentes, secrets et clés répliqués, IaC déployable sur place. Le contrôle de disponibilité ARC (readiness check) n'est pas prévu pour le chemin critique du basculement.

Relevez les temps de récupération réels de chaque test et comparez-les à la politique ; ajustez la politique ou la conception en cas d'écart.

> **Piège d'examen.** Un test de reprise qui ne bascule que le DNS ne prouve pas grand-chose. L'examen attend un test qui exerce la promotion des données, la mise à l'échelle de l'environnement de secours, les vérifications de l'état de l'application et le retour arrière, mesuré par rapport au RTO et au RPO exigés.

<!-- section: multi-cluster-containers | objectives: 4.2.6 -->
## Stratégies de conteneurs multiclusters

Un cluster EKS ou ECS appartient à une seule Région : la résilience multi-Régions passe par **plusieurs clusters**, construits à l'identique et précédés d'une couche de trafic mondiale.

| Préoccupation | Conception |
| --- | --- |
| Clusters identiques | Cluster et modules complémentaires par IaC (CloudFormation, CDK) ; charges de travail depuis Git par GitOps, par exemple la fonctionnalité EKS Capability for Argo CD, gérée par AWS hors de vos nœuds de travail, qui déploie vers plusieurs clusters et Régions depuis une seule instance et corrige la dérive |
| Images dans chaque Région | Réplication Amazon ECR inter-Régions et entre comptes (règles au niveau du registre, filtres par préfixe de référentiel, jusqu'à 25 destinations) ; seul le contenu poussé après la configuration est répliqué, donc lancez un backfill pour les images existantes |
| Trafic | Enregistrements Route 53 de basculement ou de latence, ou Global Accelerator, devant l'équilibreur de charge de chaque cluster ; décalage zonal ARC pour EKS et les équilibreurs de charge au sein d'une Région |
| État | Externalisé vers des services de données multi-Régions (Aurora Global Database, tables globales DynamoDB, réplication S3) ; les volumes persistants sur EBS restent dans une zone de disponibilité |
| Capacité de secours | Secours semi-automatique : services ou déploiements à taille minimale, mis à l'échelle par les blocs ECS service scaling ou EKS resource scaling de Region switch pendant le basculement |

Au sein d'une Région, plusieurs clusters aident aussi : **mises à niveau de clusters en bleu/vert** (déplacer le trafic vers un nouveau cluster sous la version suivante de Kubernetes) et **cellules** (clusters indépendants qui servent chacun une partie des locataires) limitent le rayon d'impact d'une mauvaise modification.

> **Piège d'examen.** Étendre un même cluster Kubernetes sur plusieurs Régions n'est pas une option EKS. Pour « la plateforme doit survivre à une panne régionale avec un RTO de quelques minutes », faites tourner un second cluster dans une autre Région avec images et données répliquées, synchronisé par GitOps, et déplacez le trafic avec Route 53, Global Accelerator ou ARC.

<!-- section: key-points -->
## Points clés

- Le RPO vient du chemin des données, le RTO de ce qui est prédéployé et automatisé ; hiérarchisez les applications et choisissez la stratégie la moins chère par niveau.
- Basculez avec des actions du plan de données et une capacité préprovisionnée (stabilité statique) ; gardez des sauvegardes contre la corruption logique.
- Elastic Disaster Recovery : sous-réseau intermédiaire, RPO de quelques secondes, RTO de quelques minutes, récupération à un instant donné, exercices sans impact sur le RPO, retour arrière.
- Resilience Hub : collections de ressources (piles, groupes, myApplications, état Terraform, EKS), politique de résilience par type de perturbation, évaluation, score, alarmes, SOP, expériences FIS, dérive.
- Les runbooks Systems Manager Automation rendent les SOP reproductibles entre comptes et Régions.
- Vérifications de l'état Route 53 (30 s ou 10 s, calculées, fondées sur une alarme), numéros de trafic Global Accelerator, contrôles de routage ARC (cluster sur cinq Régions, règles de sécurité), plans Region switch, décalage zonal manuel et automatique.
- Testez le basculement et le retour arrière, mesurez les temps de récupération réels, gardez la Région de reprise prête.
- Conteneurs : un cluster par Région, GitOps, réplication ECR, couche de trafic mondiale, état dans des services de données multi-Régions.
