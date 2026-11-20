La continuité des activités couvre tout ce qui garde les données récupérables et les services actifs quand une panne survient : des sauvegardes gouvernées dans toute l'organisation, des architectures qui se réparent seules, une protection contre les rançongiciels et les menaces internes, et des expériences qui prouvent la conception avant qu'un vrai incident ne le fasse. Les scénarios SAP-C03 mettent en jeu des dizaines de comptes, des auditeurs qui exigent des copies immuables et des équipes qui doivent mesurer le temps de récupération plutôt que l'estimer.

<!-- section: backup-governance | objectives: 4.3.1 -->
## Gouvernance centralisée des sauvegardes avec AWS Backup

AWS Backup gère les sauvegardes des comptes d'une **même organisation**. Dans la console AWS Backup du compte de gestion, activez :

- les **politiques de sauvegarde (backup policies)** : des politiques AWS Organizations qui déploient des plans de sauvegarde sur la racine, des unités d'organisation (OU) ou des comptes ;
- la **surveillance entre comptes (cross-account monitoring)** : les tâches de sauvegarde, de copie et de restauration de tous les comptes dans une seule vue (tâches créées après l'activation) ;
- la **sauvegarde entre comptes (cross-account backup)** : permet aux comptes de copier des sauvegardes vers d'autres comptes de l'organisation.

Un **administrateur délégué** (jusqu'à cinq comptes membres dans la console) peut gérer les politiques et la surveillance sans utiliser le compte de gestion ; enregistrer le compte ne suffit pas : il lui faut aussi la politique gérée `AWSBackupOrganizationAdminAccess` et une politique de délégation dans le compte de gestion.

Les politiques de sauvegarde utilisent des opérateurs d'héritage : `@@assign` définit une valeur, `@@append` ajoute à une liste, `@@remove` supprime, et `@@operators_allowed_for_child_policies` à `@@none` empêche les OU enfants de modifier le plan. Elles sélectionnent les ressources **par type ou par balise, pas par ARN de ressource**.

```json
{
  "plans": {
    "Tier1_Daily": {
      "regions": { "@@assign": ["eu-west-1", "eu-central-1"] },
      "rules": {
        "Daily": {
          "schedule_expression": { "@@assign": "cron(0 2 ? * * *)" },
          "target_backup_vault_name": { "@@assign": "workload-vault" },
          "lifecycle": { "delete_after_days": { "@@assign": "35" } },
          "copy_actions": {
            "arn:aws:backup:eu-central-1:444455556666:backup-vault:central-locked": {
              "target_backup_vault_arn": {
                "@@assign": "arn:aws:backup:eu-central-1:444455556666:backup-vault:central-locked"
              },
              "lifecycle": { "delete_after_days": { "@@assign": "365" } }
            }
          }
        }
      },
      "selections": {
        "tags": {
          "tier1": {
            "iam_role_arn": { "@@assign": "arn:aws:iam::$account:role/BackupRole" },
            "tag_key": { "@@assign": "backup-tier" },
            "tag_value": { "@@assign": ["tier1"] }
          }
        }
      }
    }
  }
}
```

L'architecture de référence : les comptes de charge de travail sauvegardent localement, puis copient vers un **compte de sauvegarde central** dans une autre Région, dont le coffre est verrouillé et dont les administrateurs ne sont pas ceux des charges de travail.

Les **coffres isolés logiquement (logically air-gapped vaults)** vont plus loin : toujours verrouillés en mode conformité, chiffrés par défaut avec une clé détenue par AWS (ou une clé gérée par le client choisie à la création, jamais modifiable), rétention minimale de 7 jours, et partageables par AWS RAM avec des comptes individuels, y compris des comptes d'autres organisations (pas avec des OU ni une organisation entière), si bien qu'un compte de récupération peut restaurer directement. Avec l'**approbation multipartite (multi-party approval)**, les sauvegardes restent récupérables même si le compte propriétaire du coffre est inaccessible.

**AWS Backup Audit Manager** rend compte de la conformité aux contrôles (fréquence, rétention, copie inter-Régions, verrouillage du coffre, temps de restauration). Les plans de **test de restauration (restore testing)** restaurent des points de récupération choisis (le plus récent ou un point aléatoire dans une fenêtre) selon un calendrier, conservent la ressource restaurée de 1 à 168 heures pour la validation, enregistrent la durée de restauration, puis la suppriment.

> **Piège d'examen.** Une politique de sauvegarde ne peut pas cibler l'ARN d'une ressource individuelle : utilisez des balises (ou un plan de sauvegarde local pour une ressource isolée). Et une copie entre comptes ne fonctionne qu'au sein de la même organisation ; pour restaurer depuis un compte d'une autre organisation, partagez un coffre isolé logiquement par AWS RAM.

<!-- section: failover-tests | objectives: 4.3.2 -->
## Concevoir des tests de basculement et mesurer le temps de récupération

Un test de basculement exige une heure de début, des phases observables et une heure de fin :

| Phase | Ce qu'il faut mesurer | Source |
| --- | --- | --- |
| Détection | Délai entre l'injection de la panne et le passage à l'état défectueux de la vérification ou de l'alarme | État de la vérification de l'état Route 53, historique des alarmes CloudWatch |
| Décision | Délai de déclenchement du basculement (automatique ou approbation humaine) | Horodatages de l'exécution du runbook, de Region switch ou d'Automation |
| Déplacement du trafic | Délai jusqu'à ce que les clients atteignent le point de terminaison sain | TTL DNS, Global Accelerator, métriques côté client |
| Récupération des données | Délai de promotion du réplica et données perdues | Événements de base de données, retard de réplication avant la panne |
| Retour à l'état stable | Délai jusqu'au retour à la normale de la métrique métier | Métriques métier CloudWatch, canaris Synthetics |

Le délai de détection Route 53 vaut à peu près l'intervalle de requête multiplié par le seuil d'échec : avec les valeurs par défaut (30 secondes, seuil d'échec de 3), comptez environ 90 secondes avant le changement d'état, puis jusqu'à une TTL pour les résolveurs. L'intervalle rapide (10 secondes) et un seuil plus bas le réduisent, avec un surcoût et un risque d'oscillation accru. Des vérificateurs dans au moins trois Régions votent sur l'état ; les vérifications calculées permettent à un enregistrement de dépendre de plusieurs composants.

**AWS Fault Injection Service (FIS)** produit la panne à la demande : arrêter des instances dans une zone de disponibilité, perturber la connectivité de sous-réseaux, basculer un cluster Aurora ou exécuter un scénario. Le scénario **AZ Availability: Power Interruption** injecte 30 minutes de symptômes de coupure de courant, puis 30 minutes de symptômes de rétablissement (instances arrêtées, lancements et mise à l'échelle suspendus, basculement RDS, impact ElastiCache, décalage zonal automatique ARC au bout de cinq minutes). **Cross-Region: Connectivity** bloque le trafic applicatif entre deux Régions et suspend la réplication inter-Régions : le bon test pour un plan de basculement régional.

> **Conseil d'examen.** « Prouver que l'application respecte son RTO de 5 minutes en cas de perte d'une zone de disponibilité, et conserver des preuves pour les auditeurs » désigne une expérience FIS (scénario de coupure de courant d'une zone) avec des conditions d'arrêt, plus des métriques CloudWatch qui horodatent chaque phase, pas une résiliation manuelle d'instance.

<!-- section: resilient-architectures | objectives: 4.3.3 -->
## Redondance, tolérance aux pannes et autoréparation

| Propriété | Modèle | Mise en œuvre AWS |
| --- | --- | --- |
| Redondance | Répartir chaque niveau sur au moins trois zones de disponibilité ; dimensionner pour la perte d'une zone (stabilité statique) | Groupe Auto Scaling sur trois zones avec 150 % de la capacité nécessaire (chaque zone porte la moitié de la charge), réplicas Aurora dans d'autres zones |
| Tolérance aux pannes | Retirer automatiquement du service les composants défaillants | Vérifications de l'état ELB, type de vérification ELB du groupe Auto Scaling, basculement RDS Multi-AZ, basculement Route 53 |
| Autoréparation | Remplacer ce qui tombe en panne sans opérateur | Auto Scaling remplace les instances défectueuses, ECS et EKS replanifient tâches et pods, récupération automatique des instances EC2, le disjoncteur de déploiement ECS (deployment circuit breaker) annule un déploiement défaillant |
| Isolation | Contenir le rayon d'impact | Architecture cellulaire (piles indépendantes par groupe de locataires ou par Région), cloisonnement (bulkhead : pools, files d'attente ou concurrence séparés par dépendance), shuffle sharding |
| Défaillance d'une dépendance | Échouer vite, se dégrader proprement | Délais d'expiration, nouvelles tentatives avec backoff exponentiel et gigue (jitter), disjoncteurs (circuit breakers), repli sur du contenu en cache ou statique (CloudFront) |
| Pics de charge | Absorber plutôt que s'effondrer | Files d'attente SQS entre les niveaux, délestage de charge, limitation dans API Gateway, modèles à travail constant |

L'autoréparation exige des **vérifications de l'état suffisamment profondes** : une vérification qui ne teste que le serveur web garde en service un nœud dont la connexion à la base est rompue, mais une vérification qui teste toutes les dépendances peut retirer toute une flotte quand une dépendance partagée tombe. Vérifiez la santé locale pour l'équilibreur de charge et créez des alarmes distinctes sur les dépendances.

Des opérations idempotentes rendent les nouvelles tentatives sûres ; sans elles, un paiement ou une commande retentés créent des doublons.

> **Piège d'examen.** Deux zones à 100 % chacune assurent la stabilité statique face à la perte d'une zone, mais pas deux zones à 50 % chacune : la perte d'une zone dépend alors du lancement d'instances pendant l'incident. « Doit supporter la perte d'une zone de disponibilité sans action de mise à l'échelle » signifie une capacité préprovisionnée dans les zones restantes.

<!-- section: ransomware-protection | objectives: 4.3.4 -->
## Protéger les données contre les rançongiciels et la suppression accidentelle

| Contrôle | Protège | Comportement clé |
| --- | --- | --- |
| S3 Versioning | Écrasements et suppressions (une suppression ajoute un marqueur de suppression) | Les versions précédentes restent récupérables ; requis par Object Lock et la réplication |
| S3 Object Lock, mode gouvernance (governance) | Les versions d'objets contre les utilisateurs sans droits spéciaux | Contournable seulement avec `s3:BypassGovernanceRetention` et l'en-tête `x-amz-bypass-governance-retention:true` |
| S3 Object Lock, mode conformité (compliance) | Les versions d'objets contre tout le monde, utilisateur racine compris | La rétention ne peut être ni raccourcie ni changée de mode |
| Conservation légale S3 (legal hold) | Les versions d'objets, sans date de fin | Reste en place jusqu'à son retrait par un utilisateur disposant de `s3:PutObjectLegalHold` ; indépendante de la rétention |
| Verrouillage des instantanés EBS (snapshot lock), mode gouvernance | Les instantanés | Verrouillage immédiat ; les utilisateurs autorisés peuvent le lever ou le modifier |
| Verrouillage des instantanés EBS, mode conformité | Les instantanés contre tout le monde | Période de réflexion (cooling-off) facultative de 1 à 72 heures ; ensuite la durée ne peut qu'augmenter |
| Corbeille (Recycle Bin) | Volumes EBS, instantanés EBS et AMI basées sur EBS supprimés | Des règles de rétention gardent les ressources supprimées récupérables pendant une durée fixée ; sans frais supplémentaires |
| AWS Backup Vault Lock, mode gouvernance | Les points de récupération d'un coffre | Supprimable par les utilisateurs disposant des autorisations IAM |
| AWS Backup Vault Lock, mode conformité | Les points de récupération contre tout le monde, AWS compris | Immuable après un délai de grâce d'au moins 72 heures |

Object Lock ne fonctionne que sur des compartiments versionnés et protège une version à la fois ; une rétention par défaut en jours ou en années s'applique aux nouvelles versions. Les durées de verrouillage des instantanés EBS vont de 1 à 36 500 jours, ou jusqu'à une date d'expiration. Vault Lock encadre la rétention avec un minimum (au moins 1 jour) et un maximum (jusqu'à 36 500 jours) : les tâches de sauvegarde et de copie hors limites échouent. Sans `--changeable-for-days`, le verrou reste supprimable (gouvernance) ; avec ce paramètre, il devient immuable à la date de verrouillage (conformité).

```bash
aws backup put-backup-vault-lock-configuration --backup-vault-name central-locked \
  --min-retention-days 35 --max-retention-days 3650 --changeable-for-days 3

aws ec2 lock-snapshot --snapshot-id snap-0123456789abcdef0 \
  --lock-mode compliance --cool-off-period 24 --lock-duration 365
```

Vault Lock et le verrouillage des instantanés EBS ont été évalués par Cohasset Associates pour les environnements SEC 17a-4, CFTC et FINRA. Une conception complète isole aussi les identifiants : sauvegardes dans un compte distinct, SCP qui refusent la suppression des points de récupération et la désactivation du verrou, et clés KMS dont les administrateurs diffèrent de ceux des charges de travail.

> **Piège d'examen.** Le mode conformité est irréversible : un Vault Lock en mode conformité après son délai de grâce, ou un verrou d'instantané en conformité après sa période de réflexion, ne peut être levé par personne. Si l'énoncé veut « tester la configuration du verrou avant qu'elle ne devienne définitive », choisissez un délai de grâce (Vault Lock), une période de réflexion (verrouillage d'instantané) ou le mode gouvernance.

<!-- section: chaos-engineering | objectives: 4.3.5 -->
## Ingénierie du chaos avec AWS FIS

L'ingénierie du chaos est une expérience, pas une casse au hasard :

1. Définissez l'**état stable (steady state)** avec une métrique métier (commandes par minute, latence p99, taux d'erreur).
2. Formulez une **hypothèse** : « si une zone perd son alimentation, les commandes par minute restent à moins de 5 % d'écart et la latence p99 sous 400 ms ».
3. Injectez une panne réaliste avec un **rayon d'impact** limité (une zone, un pourcentage d'instances, un compte).
4. Comparez à l'état stable ; corrigez les faiblesses ; répétez et automatisez.

Un **modèle d'expérience FIS (experiment template)** contient des **actions** (séquentielles ou parallèles), des **cibles** (ID de ressources, ou balises et filtres avec un mode de sélection tel que `ALL`, `COUNT(n)` ou `PERCENT(n)`), des **conditions d'arrêt** (alarmes CloudWatch qui arrêtent l'expérience quand elles se déclenchent) et le rôle IAM qu'assume FIS.

```json
{
  "description": "Stop half of the web tier in one AZ for 10 minutes",
  "targets": {
    "web-az-a": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": { "chaos-ready": "true" },
      "filters": [{ "path": "Placement.AvailabilityZone", "values": ["eu-west-1a"] }],
      "selectionMode": "PERCENT(50)"
    }
  },
  "actions": {
    "stop-web": {
      "actionId": "aws:ec2:stop-instances",
      "parameters": { "startInstancesAfterDuration": "PT10M" },
      "targets": { "Instances": "web-az-a" }
    }
  },
  "stopConditions": [
    { "source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:eu-west-1:111122223333:alarm:orders-below-slo" }
  ],
  "roleArn": "arn:aws:iam::111122223333:role/fis-experiment-role"
}
```

Autres briques :

- **Bibliothèque de scénarios (scenario library)** : modèles prêts à l'emploi (stress EC2 et EKS, coupure de courant d'une zone, ralentissement applicatif dans une zone, ralentissement du trafic entre zones, connectivité inter-Régions, profils de latence EBS).
- **Expériences multicomptes** : un modèle cible des ressources dans plusieurs comptes, pour les charges de travail réparties entre comptes.
- **Levier de sécurité (safety lever)** : un par compte et par Région ; l'activer arrête les expériences en cours et annule celles qui tentent de démarrer.
- Tarification par minute d'action, selon le nombre de comptes cibles.

Lancez d'abord les expériences en préproduction, puis en production avec des conditions d'arrêt strictes ; Resilience Hub recommande des expériences FIS pour valider ses alarmes et ses SOP.

> **Piège d'examen.** Une expérience sans condition d'arrêt liée à la métrique d'état stable peut nuire aux clients. « Arrêter automatiquement l'expérience si les erreurs de paiement dépassent le SLO » correspond à une alarme CloudWatch en condition d'arrêt ; « arrêter immédiatement toutes les expériences du compte pendant un incident réel » correspond au levier de sécurité.

<!-- section: key-points -->
## Points clés

- AWS Backup dans Organizations : politiques de sauvegarde (balises ou types, pas d'ARN), surveillance et copie entre comptes, administrateur délégué, coffre central verrouillé dans une autre Région.
- Coffre isolé logiquement : toujours verrouillé en conformité, partage RAM avec des comptes individuels (d'autres organisations aussi), approbation multipartite.
- Audit Manager pour les preuves ; le test de restauration mesure le temps de restauration et valide les ressources restaurées.
- Les tests de basculement chronomètrent détection, décision, déplacement du trafic, récupération des données et retour à l'état stable ; valeurs par défaut Route 53 : intervalle de 30 s, seuil de 3.
- Résilience : trois zones avec la capacité de supporter la perte d'une zone, vérifications de l'état, remplacement automatique, cellules, cloisonnement, backoff avec gigue, files d'attente, idempotence.
- Rançongiciels : S3 Versioning et Object Lock (gouvernance, conformité, conservation légale), verrouillage des instantanés EBS (réflexion de 1 à 72 h), Corbeille, Vault Lock (délai de grâce d'au moins 72 h), comptes et clés séparés.
- FIS : hypothèse d'état stable, modèles avec actions, cibles, conditions d'arrêt et rôle, bibliothèque de scénarios, expériences multicomptes, levier de sécurité.
