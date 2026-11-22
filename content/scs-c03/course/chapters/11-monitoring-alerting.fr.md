Les questions de détection partent d'une charge de travail et d'un risque, puis demandent quel signal doit exister, quel compte le voit et ce qui se déclenche quand il change. Ce chapitre présente la façon de déduire les exigences de surveillance d'une charge de travail, les vérifications de l'état comme signal de détection, le modèle d'administrateur délégué qui agrège les résultats dans une organisation, les alertes et les tableaux de bord bâtis sur GuardDuty, Macie, Security Hub et Security Lake, et les automatisations qui évaluent l'environnement selon une planification : packs de conformité AWS Config, normes Security Hub CSPM et Systems Manager State Manager.

<!-- section: monitoring-requirements | objectives: 1.1.1 -->
## Déduire les exigences de surveillance d'une charge de travail

Partez de ce que la charge de travail contient et de la façon dont elle s'exécute, puis associez chaque risque au service qui produit le signal. La surveillance relève de votre part du modèle de responsabilité partagée : AWS sécurise l'infrastructure, vous décidez de ce qui est journalisé, analysé et alerté.

| Caractéristique de la charge de travail | Risque à détecter | Signal et service |
| --- | --- | --- |
| Tout compte | Usage abusif d'identifiants, activité d'API inhabituelle, minage de cryptomonnaie, appels depuis des IP malveillantes connues | Amazon GuardDuty (sources fondamentales), événements de gestion AWS CloudTrail |
| Compartiments S3 contenant des données personnelles ou réglementées | Exposition des données, accès public, compartiments non chiffrés, exfiltration | Amazon Macie (résultats de données sensibles et de politique), GuardDuty S3 Protection, événements de données S3 de CloudTrail |
| EC2, Amazon EKS, Amazon ECS sur Fargate | Processus malveillants, reverse shells, évasion de conteneur | GuardDuty Runtime Monitoring (agent), EKS Protection (journaux d'audit), Malware Protection for EC2 |
| Paquets logiciels et images | CVE connues, exposition réseau | Analyse continue Amazon Inspector des instances EC2, des images Amazon ECR et des fonctions Lambda |
| Aurora et RDS | Connexions anormales, force brute | GuardDuty RDS Protection |
| Fonctions Lambda | Appels de fonctions vers des points de terminaison malveillants | GuardDuty Lambda Protection (activité réseau de la fonction) |
| Dérive de configuration | Une ressource qui n'est plus conforme à la politique | Règles AWS Config, contrôles Security Hub CSPM |
| IA générative sur Amazon Bedrock | Détournement d'invites, fuite de données dans les réponses | Journalisation des invocations de modèles (désactivée par défaut), métriques Amazon Bedrock Guardrails, CloudTrail |
| Chemins réseau | Balayages, flux inattendus, tunnels DNS | VPC Flow Logs, journaux de requêtes Route 53 Resolver, journaux AWS Network Firewall (chapitre 12) |

GuardDuty analyse trois **sources de données fondamentales** dès son activation : les événements de gestion CloudTrail, les VPC Flow Logs des instances EC2 et les journaux DNS. Il les lit par son propre flux indépendant : vous ne créez ni journal de suivi ni journal de flux pour lui. Ses **plans de protection** étendent la couverture : S3 Protection, EKS Protection, Runtime Monitoring, Malware Protection for EC2, Malware Protection for S3, Malware Protection for AWS Backup, RDS Protection, Lambda Protection et AI Protection. À la première activation, tous les plans sauf Runtime Monitoring sont activés pour l'essai de 30 jours. Malware Protection for S3 est le seul plan utilisable sans activer GuardDuty lui-même. **Extended Threat Detection** est toujours actif sans surcoût : il corrèle des événements isolément peu significatifs, à travers les ressources et le temps, en un résultat de séquence d'attaque (attack sequence).

> **Piège d'examen.** « Détecter le minage de cryptomonnaie sur EC2 avec le MOINS de charge opérationnelle » désigne GuardDuty, pas des VPC Flow Logs plus une requête Athena personnalisée. Et activer GuardDuty n'exige d'activer ni les VPC Flow Logs ni un journal de suivi CloudTrail ; ceux-là, vous les configurez pour vos propres besoins de conservation et d'investigation.

<!-- section: health-checks | objectives: 1.1.2 -->
## Vérifications de l'état et stratégies de surveillance des charges de travail

Les vérifications de l'état détectent les pannes de disponibilité, qui peuvent être le premier signe d'une attaque (épuisement des ressources, point de terminaison altéré, route supprimée).

| Vérification | Ce qu'elle teste | Où apparaissent les résultats |
| --- | --- | --- |
| Vérification de l'état Route 53 d'un point de terminaison public | HTTP, HTTPS ou TCP depuis des vérificateurs situés dans au moins trois Régions ; correspondance de chaîne facultative dans les 5 120 premiers octets du corps ; intervalle rapide de 10 secondes, facturé en plus | Statut de la vérification et métriques CloudWatch ; les notifications d'alarme utilisent une rubrique SNS dans US East (N. Virginia) |
| Vérification de l'état Route 53 d'un point de terminaison privé | Une IP privée, un nom ou un port joignable depuis une **source de vérification de l'état** (health check source) créée dans votre VPC (une adresse IP dans trois sous-réseaux de trois AZ, jusqu'à 200 vérifications par source) | La Région de la source de vérification |
| Vérification de l'état Route 53 calculée | Si un nombre minimal de vérifications enfants sont saines | Comme ses enfants ; ne peut pas référencer de vérifications de points de terminaison privés |
| Vérification de l'état Route 53 fondée sur une alarme CloudWatch | Le flux de données d'une alarme CloudWatch du même compte (métrique en résolution standard, pas de M sur N, pas de métrique mathématique) | Route 53 |
| Vérification de l'état d'un groupe cible ELB | Chaque cible sur un chemin et un port ; les cibles défaillantes ne reçoivent plus de trafic | État des cibles et métrique `UnHealthyHostCount` |
| Vérifications du statut EC2 | Accessibilité du système et de l'instance | Métriques `StatusCheckFailed` ; une alarme peut récupérer ou redémarrer l'instance |
| Canary CloudWatch Synthetics | Requêtes scriptées vers un point de terminaison ou un parcours utilisateur, selon une planification | Métriques, captures d'écran et journaux du canary |
| AWS Health | Événements côté AWS qui touchent vos ressources, y compris les avis d'abus et d'exposition de clés | AWS Health Dashboard et événements EventBridge de `aws.health` |

Une stratégie de surveillance combine ces vérifications avec des alarmes sur les signaux des services de sécurité eux-mêmes. Pour une application web exposée à Internet : vérification de l'état Route 53 et état des cibles ELB pour la disponibilité, métriques AWS WAF pour les requêtes bloquées, GuardDuty pour les instances, et une règle EventBridge sur les événements `aws.health` pour qu'un avis d'AWS signalant des clés d'accès exposées parvienne à l'équipe de sécurité.

> **Piège d'examen.** Une vérification de l'état Route 53 publique d'une instance placée derrière un groupe de sécurité qui n'autorise que le CIDR de l'entreprise échoue toujours : autorisez les plages d'IP des vérificateurs Route 53 (`ROUTE53_HEALTHCHECKS` dans les plages d'adresses IP publiées par AWS) ou utilisez une vérification de point de terminaison privé, qui ne demande aucune exposition à Internet.

<!-- section: event-aggregation | objectives: 1.1.3 -->
## Agréger les événements de sécurité entre comptes et Régions

Le modèle à l'échelle de l'organisation est le même pour chaque service de sécurité : depuis le compte de gestion, désignez un **administrateur délégué** (en général un compte dédié aux outils de sécurité), activez le service pour tous les membres existants et activez l'activation automatique pour les nouveaux comptes. Le compte de gestion reste ainsi à l'écart de l'exploitation quotidienne.

```bash
aws guardduty enable-organization-admin-account --admin-account-id 111122223333
aws securityhub enable-organization-admin-account --admin-account-id 111122223333
```

| Service | Portée de l'agrégation | Points évalués |
| --- | --- | --- |
| GuardDuty | Administrateur délégué par Région | L'activer dans chaque Région, y compris celles qui ne sont pas utilisées ; l'administrateur voit et gère les résultats des membres |
| AWS Security Hub (nouveau, disponible depuis le 2 décembre 2025) | Organisation, avec une Région d'agrégation | Corrèle les résultats de GuardDuty, Inspector, Macie et Security Hub CSPM en expositions (exposures) ; résultats au format OCSF ; pas de résultats de partenaires tiers |
| AWS Security Hub CSPM (l'ancien Security Hub) | Organisation, Région d'origine plus Régions liées | Exécute les normes et les contrôles ; résultats au format ASFF ; reçoit les résultats des services AWS et des produits tiers |
| Macie, Inspector, Detective | Administrateur délégué | Le même compte est recommandé pour tous les services de sécurité |
| AWS Config | Agrégateur (organisation ou comptes individuels) | Vue **en lecture seule** de la configuration et de la conformité ; aucune autorisation n'est nécessaire pour les sources de l'organisation |
| Amazon Security Lake | Administrateur délégué, Régions de cumul (rollup Regions) | Centralise journaux et résultats au format OCSF (chapitre 12) |

Security Hub et Security Hub CSPM partagent le même administrateur délégué : si CSPM a déjà un administrateur délégué autre que le compte de gestion, Security Hub l'utilise. Activer Security Hub active automatiquement Security Hub CSPM, mais n'active ni GuardDuty ni Inspector ; les résultats d'exposition demandent au minimum CSPM et Inspector.

Pour des événements bruts plutôt que des résultats, faites-les transiter par **Amazon EventBridge** : une règle dans chaque compte membre (déployée avec CloudFormation StackSets) transfère les événements correspondants vers un bus d'événements du compte de sécurité, dont la politique basée sur les ressources autorise l'organisation avec `aws:PrincipalOrgID`. Pour les métriques et les journaux, l'observabilité entre comptes de CloudWatch relie les comptes sources à un compte de surveillance dans chaque Région.

> **Piège d'examen.** Un agrégateur Config affiche les ressources non conformes de toute l'organisation, mais ne peut ni déployer de règles ni corriger. Le déploiement passe par les règles Config ou les packs de conformité d'organisation ; l'agrégation sert uniquement à consulter.

<!-- section: security-alerting | objectives: 1.1.4 -->
## Alertes, métriques et tableaux de bord pour les événements anormaux

**EventBridge est le centre des alertes** sur les résultats de sécurité. GuardDuty envoie un nouveau résultat à EventBridge quasiment en temps réel ; les occurrences suivantes du même résultat sont agrégées et envoyées toutes les 6 heures par défaut, ou toutes les 15 minutes ou toutes les heures si l'administrateur change la fréquence (le paramètre s'applique aux membres). Les résultats archivés par des règles de suppression ne sont pas envoyés. Dans le compte administrateur délégué, les règles correspondent aussi aux résultats des membres (`detail.accountId` filtre un compte).

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [{ "numeric": [">=", 7] }]
  }
}
```

| Source | `source` et `detail-type` | Remarques |
| --- | --- | --- |
| GuardDuty | `aws.guardduty`, `GuardDuty Finding` | Gravité numérique : élevée de 7,0 à 8,9, critique de 9,0 à 10,0 |
| Macie | `aws.macie`, `Macie Finding` | Nouveaux résultats publiés immédiatement ; résultats de politique mis à jour toutes les 15 minutes par défaut |
| Security Hub CSPM | `aws.securityhub`, `Security Hub Findings - Imported` | Aussi `Security Hub Findings - Custom Action` pour les actions déclenchées par un analyste |
| Security Hub | `aws.securityhub`, `Findings Imported V2` | Résultats OCSF |
| Appels d'API CloudTrail | `aws.cloudtrail` et autres, `AWS API Call via CloudTrail` | Exige un journal de suivi avec journalisation active (chapitre 13) |

Macie publie chaque résultat dans EventBridge ; vers Security Hub CSPM, il ne publie par défaut que les résultats de politique : les résultats de données sensibles doivent être ajoutés dans les paramètres de publication.

**Alertes CloudWatch sur l'activité des API** : envoyez le journal de suivi d'organisation vers un groupe de journaux CloudWatch Logs, puis créez des filtres de métrique et des alarmes sur l'usage du root, la connexion à la console sans MFA, les modifications de politiques IAM, les modifications de groupes de sécurité ou les appels `StopLogging` (les contrôles de surveillance du CIS AWS Foundations Benchmark).

```bash
aws logs put-metric-filter --log-group-name org-trail \
  --filter-name root-usage --metric-transformations metricName=RootUsage,metricNamespace=Security,metricValue=1 \
  --filter-pattern '{ $.userIdentity.type = "Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent" }'
aws cloudwatch put-metric-alarm --alarm-name root-usage --namespace Security --metric-name RootUsage \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:security-alerts
```

Les options fondées sur les anomalies ne demandent aucun seuil fixe : **CloudTrail Insights** signale des taux inhabituels d'appels d'API ou d'erreurs, les alarmes de **détection d'anomalies** CloudWatch se déclenchent hors d'une bande apprise, et la **détection d'anomalies** de CloudWatch Logs fait ressortir des motifs de journaux inhabituels.

**Tableaux de bord** : le tableau de bord Summary de Security Hub, avec une vue Trends qui conserve jusqu'à un an de données et un widget Security coverage qui montre quels comptes et quelles Régions ont activé les services de sécurité ; la page Exposure avec son graphe de chemin d'attaque potentiel ; le score de sécurité Security Hub CSPM par norme ; la carte de sensibilité S3 de Macie ; les tableaux de bord CloudWatch ; et Amazon Managed Grafana ou OpenSearch Dashboards au-dessus de Security Lake (chapitre 12).

> **Conseil d'examen.** « Avertir l'équipe de sécurité en quelques minutes d'un résultat GuardDuty de gravité élevée dans n'importe quel compte » désigne une règle EventBridge dans le compte administrateur délégué, dans chaque Région, ciblant une rubrique SNS. Ce n'est pas une alarme CloudWatch : les résultats GuardDuty ne sont pas des métriques CloudWatch.

<!-- section: regular-assessments | objectives: 1.1.5 -->
## Évaluations automatisées et récurrentes

| Outil | Ce qu'il évalue | Planification et portée |
| --- | --- | --- |
| Règle AWS Config | La configuration d'une ressource par rapport à une règle (gérée, ou personnalisée en Lambda ou en Guard) | À chaque modification de configuration, ou périodique (1, 3, 6, 12 ou 24 heures) ; correction par Systems Manager Automation, manuelle ou automatique avec nouvelles tentatives |
| Pack de conformité | Un modèle YAML de règles Config et d'actions de correction déployé comme une seule entité | Un compte et une Région, ou toute l'organisation depuis le compte de gestion ou l'administrateur délégué ; les nouveaux comptes le reçoivent |
| Normes Security Hub CSPM | Contrôles AWS Foundational Security Best Practices, CIS AWS Foundations Benchmark, PCI DSS, NIST SP 800-53 | En continu, majoritairement appuyés sur des règles Config (l'enregistrement Config doit être actif) |
| Règles d'automatisation Security Hub | Mettent à jour ou suppriment des résultats selon des critères (gravité, ressource, compte) ; dans Security Hub, ouvrent aussi des tickets Jira ou ServiceNow | Appliquées à l'arrivée des résultats |
| Association State Manager | Maintient les nœuds gérés dans un état défini : agent installé et en cours d'exécution, inventaire collecté, conformité des correctifs analysée | Expression cron ou rate, intervalle minimal de 30 minutes ; cibles par balises, groupes de ressources, ID de nœuds ou tous les nœuds |
| Inspector | Vulnérabilités et accessibilité réseau | En continu, nouvelle analyse à chaque nouvelle CVE ou modification |
| Tâche Macie | Données sensibles dans les compartiments sélectionnés | Ponctuelle ou périodique (quotidienne, hebdomadaire, mensuelle) ; la découverte automatisée échantillonne en continu |

```bash
aws configservice put-organization-conformance-pack \
  --organization-conformance-pack-name baseline-security \
  --template-s3-uri s3://example-security-templates/baseline.yaml \
  --excluded-accounts 444455556666
aws ssm create-association --association-name gather-inventory \
  --name AWS-GatherSoftwareInventory \
  --targets Key=tag:Environment,Values=Production \
  --schedule-expression "rate(1 day)"
```

Le déploiement à l'échelle de l'organisation de règles Config et de packs de conformité exige l'enregistrement Config dans les comptes membres ; si un nouveau compte n'a pas d'enregistreur, le déploiement est retenté pendant 7 heures. Security Hub CSPM se configure désormais à l'échelle de l'organisation avec les **politiques Security Hub CSPM** d'AWS Organizations (type de politique `SECURITYHUB_CSPM_POLICY`), qui remplacent la **configuration centralisée** (central configuration : politiques de configuration créées par l'administrateur délégué dans la Région d'origine), devenue une fonctionnalité héritée ; les deux mécanismes s'excluent mutuellement.

Pour des investigations récurrentes, une planification EventBridge Scheduler peut démarrer un flux Step Functions ou un runbook Systems Manager Automation (par exemple : créer un instantané et baliser une instance, interroger Logs Insights, publier un rapport). AWS Audit Manager est fermé aux nouveaux clients depuis le 30 avril 2026 : pour un nouveau client, la collecte de preuves repose sur les packs de conformité, Security Hub CSPM et les contrôles AWS Control Tower.

> **Piège d'examen.** « Installer et maintenir en fonctionnement l'agent CloudWatch sur chaque instance actuelle et future » désigne une association State Manager ciblant une balise, pas une exécution ponctuelle de Run Command. Et un pack de conformité déployé dans une Région n'évalue que cette Région : déployez-le dans chaque Région utilisée.

<!-- section: key-points -->
## Points clés

- Associez les risques de la charge de travail aux signaux : GuardDuty (menaces), Inspector (vulnérabilités), Macie (données sensibles), Config et Security Hub CSPM (configuration), CloudTrail (activité des API).
- GuardDuty lit lui-même les événements de gestion CloudTrail, les VPC Flow Logs et les journaux DNS ; les plans de protection l'étendent ; Extended Threat Detection est gratuit et toujours actif.
- Vérifications de l'état Route 53 : publiques depuis au moins trois Régions, privées via une source de vérification dans le VPC, calculées, ou fondées sur une alarme CloudWatch.
- Un administrateur délégué par service, activé dans chaque Région ; Security Hub et Security Hub CSPM le partagent ; les agrégateurs Config sont en lecture seule.
- Nouveau Security Hub : expositions, chemins d'attaque, OCSF, pas de résultats de partenaires ; Security Hub CSPM : normes, contrôles, ASFF, intégrations de partenaires.
- Alertes : règles EventBridge sur les résultats vers SNS, Lambda ou Automation ; filtres de métrique sur les journaux CloudTrail pour les événements d'API ; Insights et détection d'anomalies quand aucun seuil n'est connu.
- Évaluations récurrentes : règles Config et packs de conformité d'organisation, normes CSPM, associations State Manager (30 minutes minimum), Inspector, tâches Macie.
