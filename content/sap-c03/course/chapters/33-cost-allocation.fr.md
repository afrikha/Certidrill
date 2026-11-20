La répartition des coûts répond à la question « qui a dépensé cela, et pour quoi ? » sur des centaines de comptes, des plateformes partagées et des fonctionnalités d'IA facturées au jeton. L'examen professionnel attend un système complet : une structure de comptes et un dictionnaire de balises qui portent les dimensions métier, une application préventive et détective pour que les balises restent correctes, des données de facturation détaillées que la finance peut interroger, la refacturation (chargeback) ou la présentation des coûts (showback) des coûts partagés, et des alertes qui se déclenchent avant la facture.

<!-- section: tagging-strategy | objectives: 3.3.1 -->
## Concevoir une stratégie de balisage pour la répartition des coûts

**Les comptes d'abord, les balises ensuite.** Le compte est la seule dimension de répartition qui couvre tous les frais, y compris ceux qu'on ne peut pas baliser (support, une partie du transfert de données, taxes, Marketplace). Une structure avec des comptes par charge de travail et par environnement, regroupés dans des unités d'organisation (OU) par unité opérationnelle, répartit la plupart des coûts sans aucune balise. Les balises découpent ensuite les comptes partagés (un compte de plateforme qui héberge de nombreux locataires, un lac de données utilisé par plusieurs équipes) et ajoutent les dimensions que les comptes ne portent pas (projet, application, propriétaire).

**Dictionnaire de balises.**

| Clé | Rôle | Exemples de valeurs |
| --- | --- | --- |
| `CostCenter` | Code financier imputé | `4410`, `5120` |
| `BusinessUnit` | Propriétaire dans l'organisation | `retail`, `payments` |
| `Project` | Initiative ou produit | `checkout-v2` |
| `Environment` | Étape du cycle de vie | `prod`, `staging`, `dev` |
| `Owner` | Équipe ou alias responsable | `team-payments` |

Règles qui rendent le dictionnaire exploitable :

- Les clés et les valeurs sont sensibles à la casse dans les données de facturation : `costcenter` et `CostCenter` deviennent deux colonnes. Fixez une orthographe et faites-la respecter (sections suivantes).
- Limitez les valeurs à une liste fermée quand c'est possible ; le texte libre casse les regroupements.
- Balisez par automatisation, pas à la main : balises au niveau des piles CloudFormation et CDK, balises de groupe Auto Scaling propagées au lancement, propagation des balises ECS depuis le service ou la définition de tâche, modèles de lancement EC2 qui balisent les volumes et les interfaces réseau.
- Une balise ne répartit pas les coûts engagés avant son application.

**Activation.** Les balises définies par l'utilisateur doivent être activées comme balises de répartition des coûts dans la console Billing and Cost Management du compte de gestion (ou d'un compte autonome), une par une ou en masse avec l'API `UpdateCostAllocationTagsStatus`. Une nouvelle clé peut mettre jusqu'à 24 heures à apparaître pour l'activation, puis jusqu'à 24 heures à devenir active. Les balises générées par AWS portent le préfixe `aws:` et s'activent séparément. Quand un compte rejoint une autre organisation, ses balises activées doivent être réactivées par le nouveau compte de gestion.

> **Piège d'examen.** Baliser les ressources ne suffit pas pour que Cost Explorer ou le Cost and Usage Report affichent la dimension : la clé doit aussi être activée comme balise de répartition des coûts par le compte de gestion. « Les balises sont appliquées mais le rapport n'a pas de colonne » signifie que l'activation manque.

<!-- section: cost-reporting | objectives: 3.3.2 -->
## Rapports et analyse des coûts sur des données de facturation détaillées

| Besoin | Outil | Faits |
| --- | --- | --- |
| Analyse interactive, regroupement par compte, service, balise, catégorie de coûts ; prévisions ; recommandations d'engagement | AWS Cost Explorer | 13 mois d'historique, prévision sur 18 mois, actualisé au moins toutes les 24 heures ; console gratuite, 0,01 USD par requête d'API paginée ; ne peut pas être désactivé une fois activé |
| Données ligne par ligne pour SQL, lacs de données et BI | AWS Cost and Usage Report 2.0 via AWS Data Exports | Format recommandé ; livré dans S3 ; colonnes choisies (console) ou requête SQL (CLI, SDK) pour ne garder que les données utiles |
| Données neutres pour des outils FinOps multicloud | Export FOCUS 1.2 ou 1.0 avec colonnes AWS | Même service Data Exports |
| Recommandations exportées | Export des recommandations d'optimisation des coûts (Cost Optimization Hub) | Relie les économies possibles aux données de coûts |
| Tableau de bord prêt à l'emploi pour la direction | Export du tableau de bord des coûts et de l'utilisation avec Amazon QuickSight (désormais Amazon Quick) | Déploie un tableau de bord préconstruit |

Architecture type pour une organisation : le compte de gestion exporte le CUR 2.0 vers un compartiment S3 d'un compte FinOps dédié ; un robot d'indexation (crawler) AWS Glue ou une définition de table l'expose à Amazon Athena ; les tableaux de bord Amazon Quick et les outils financiers lisent les vues Athena. Le CUR hérité (legacy) utilise d'autres actions d'API et ne doit pas être choisi pour une nouvelle conception.

```text
-- Athena view over CUR 2.0: monthly cost per activated CostCenter tag
SELECT bill_billing_period_start_date AS month,
       resource_tags['user_cost_center'] AS cost_center,
       SUM(line_item_unblended_cost) AS cost
FROM cur2.anycompany_cur
GROUP BY 1, 2
ORDER BY 1, 3 DESC;
```

> **Conseil d'examen.** « Les analystes financiers ont besoin de SQL sur des coûts horaires, par ressource, de tous les comptes » correspond au CUR 2.0 dans S3 avec Athena. « Un responsable veut un graphique mensuel par unité opérationnelle » correspond à Cost Explorer regroupé par catégorie de coûts.

<!-- section: tag-enforcement | objectives: 3.3.3 -->
## Faire respecter le balisage par des politiques

Aucun contrôle ne fait tout le travail seul ; combinez-les.

| Contrôle | Empêche | Ne fait pas |
| --- | --- | --- |
| Politiques de balises (tag policies, AWS Organizations) | Avec `enforced_for`, les opérations de balisage non conformes (casse de clé ou valeur incorrecte) sur les types de ressources listés | Bloquer la création d'une ressource sans la balise ; les ressources non balisées ne sont pas évaluées |
| Politiques de balises avec `report_required_tag_for` et application dans l'IaC (hook CloudFormation, intégration Terraform ou Pulumi) | Les déploiements sans les balises exigées, en mode échec (le mode avertissement ne fait qu'alerter) | Arrêter les créations par la console ou la CLI hors du pipeline |
| SCP avec `aws:RequestTag` et une condition `Null` | Les appels d'API qui créent des ressources sans la balise ; avec `aws:TagKeys`, la suppression de la balise | S'appliquer au compte de gestion ; fonctionner pour les services ou actions qui ne prennent pas en charge le balisage à la création |
| Règle gérée AWS Config `required-tags` (jusqu'à six clés), déployée par un pack de conformité et agrégée | Rien : détecte les ressources non conformes, puis corrige via Systems Manager Automation | Bloquer la création |

Politique de balises qui fixe l'orthographe et les valeurs de `CostCenter` et les impose sur EC2 et RDS :

```json
{
  "tags": {
    "costcenter": {
      "tag_key": { "@@assign": "CostCenter" },
      "tag_value": { "@@assign": ["4410", "5120", "6*"] },
      "enforced_for": { "@@assign": ["ec2:instance", "rds:db"] }
    }
  }
}
```

SCP qui refuse les lancements d'instances sans balise `CostCenter` et protège la balise contre la suppression, sauf par un rôle de balisage :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireCostCenterOnLaunch",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": { "Null": { "aws:RequestTag/CostCenter": "true" } }
    },
    {
      "Sid": "ProtectCostCenterTag",
      "Effect": "Deny",
      "Action": "ec2:DeleteTags",
      "Resource": "*",
      "Condition": {
        "ForAnyValue:StringEquals": { "aws:TagKeys": ["CostCenter"] },
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/TaggingAdmin" }
      }
    }
  ]
}
```

Les politiques de balises exigent une organisation avec toutes les fonctionnalités activées et s'attachent depuis le compte de gestion. La conformité se consulte avec AWS Resource Groups (pour toute l'organisation depuis le compte de gestion), et les balises non conformes se corrigent avec Tag Editor ou l'API Resource Groups Tagging. Testez une politique sur un compte avant de l'imposer à une OU.

> **Piège d'examen.** « Empêcher la création de ressources sans balise CostCenter » ne se résout pas avec le seul `enforced_for` d'une politique de balises ; il faut une SCP sur `aws:RequestTag` ou l'application des balises exigées dans l'IaC. « Garantir une orthographe cohérente des valeurs CostCenter » relève de la politique de balises.

<!-- section: chargeback-showback | objectives: 3.3.4 -->
## Refacturation et présentation des coûts

La **présentation des coûts (showback)** indique à chaque équipe ce qu'elle a consommé ; la **refacturation (chargeback)** impute ce montant au budget de l'équipe. Les deux exigent un partage équitable des coûts partagés.

**Les catégories de coûts (cost categories)** associent les coûts à la structure de l'entreprise par des règles sur des dimensions comme le compte, la balise, le service, le type de frais, la Région, le type d'utilisation ou une autre catégorie de coûts. Les règles normales attribuent des valeurs fixes ; les règles de valeur héritée reprennent automatiquement la valeur d'une balise ou d'un compte ; une valeur par défaut recueille le reste. Les règles sont évaluées de haut en bas, s'appliquent depuis le début du mois en cours et peuvent mettre jusqu'à 24 heures à être traitées. Seul le compte de gestion (ou un compte autonome) les crée. Une catégorie de coûts apparaît comme dimension dans Cost Explorer et AWS Budgets, comme colonne dans le CUR et comme type de moniteur dans Cost Anomaly Detection.

**La répartition des frais (split charges)** divise une valeur de catégorie de coûts partagée (par exemple les comptes réseau ou sécurité partagés) entre des valeurs cibles : au prorata du coût de chaque cible, selon des pourcentages fixes ou à parts égales. Jusqu'à 10 règles de répartition par catégorie de coûts. Les résultats n'apparaissent que sur la page de détails de la catégorie de coûts (avec un téléchargement CSV), ni dans le CUR ni dans Cost Explorer.

**Les données de répartition fractionnée des coûts (split cost allocation data)**, activées dans les préférences de Cost Management et livrées dans le CUR ou le CUR 2.0, décomposent l'infrastructure partagée en coûts par consommateur :

| Ressource partagée | Répartie selon |
| --- | --- |
| Tâches ECS et pods EKS sur des instances EC2 partagées | Coût amorti de l'instance multiplié par la part de CPU et de mémoire utilisée ; pour EKS, aussi les GPU et les accélérateurs Trainium et Inferentia ; balises EKS comme `aws:eks:namespace` activées par défaut |
| Frais de passerelle NAT, d'EC2 et d'appairage de VPC | Compte qui a généré l'utilisation, via une politique de répartition flexible des coûts réseau |
| Compartiment S3 à usage général partagé par des équipes | Préfixe (balises `aws:s3:PrefixLevel1` et suivantes, à activer manuellement), à l'aide d'un tableau de bord S3 Storage Lens de niveau avancé |

**Coûts des jetons Amazon Bedrock.**

- **Profils d'inférence d'application** : créez-en un par équipe ou par application, à partir d'un modèle de fondation ou d'un profil entre Régions, attachez des balises, et faites appeler l'ARN du profil par l'application. Les balises activées apparaissent dans le CUR comme colonnes `resourceTags/`.
- **Répartition des coûts par principal IAM** : le CUR 2.0 enregistre l'ARN de l'appelant de chaque appel Bedrock dans `line_item_iam_principal` quand l'export inclut les données d'identité de l'appelant ; les balises des utilisateurs et rôles IAM apparaissent comme balises `iamPrincipal/` après activation et peuvent être regroupées dans Cost Explorer. Attendez-vous à des fichiers CUR plus gros.
- **Les types d'utilisation** encodent la Région, le modèle, le type de jeton (entrée, sortie, lecture de cache, écriture de cache), le niveau et le routage entre Régions ; additionnez les quatre types de jetons pour retrouver la facture.
- **Les métriques CloudWatch** `InputTokenCount` et `OutputTokenCount` (espace de noms `AWS/Bedrock`) donnent l'utilisation des jetons par modèle en quasi temps réel pour les tableaux de bord et les alarmes ; les journaux d'invocation de modèle donnent le détail par requête, que le CUR ne fournit pas.

```bash
aws bedrock create-inference-profile --inference-profile-name claims-assistant \
  --model-source copyFrom=arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-lite-v1:0 \
  --tags key=CostCenter,value=4410 key=Project,value=claims-assistant
```

**AWS Billing Conductor** produit des factures pro forma par groupe de facturation avec des règles de tarification personnalisées, pour les organisations qui revendent ou refacturent AWS à leurs propres tarifs sans changer la vraie facture AWS.

> **Conseil d'examen.** « Chaque unité opérationnelle doit voir sa part du cluster Kubernetes partagé » correspond aux données de répartition fractionnée des coûts pour EKS. « Répartir le coût du compte de sécurité central entre les unités opérationnelles selon leurs dépenses » correspond à une règle de répartition des frais (au prorata) dans une catégorie de coûts.

<!-- section: budgets-anomalies | objectives: 3.3.5 -->
## Budgets, seuils et détection des anomalies

**AWS Budgets** suit six types : coût, utilisation, utilisation des RI, couverture des RI, utilisation des Savings Plans et couverture des Savings Plans. Les alertes se déclenchent sur des valeurs réelles ou prévues (coût et utilisation au-dessus du seuil, utilisation ou couverture en dessous) vers l'e-mail et SNS, et de SNS vers des canaux de discussion. Les budgets peuvent filtrer sur les comptes, les services, les balises activées et les catégories de coûts, et mesurer le coût non combiné (unblended), net non combiné, amorti ou net amorti. Les données sont actualisées jusqu'à trois fois par jour. **Les actions de budget** réagissent automatiquement : appliquer une politique IAM ou une SCP, ou arrêter des instances EC2 ou RDS, automatiquement ou après approbation. Les comptes membres peuvent créer leurs propres budgets.

**AWS Cost Anomaly Detection** applique l'apprentissage automatique au coût net non combiné, environ trois fois par jour (jusqu'à 24 heures après l'utilisation, car il s'appuie sur les données de Cost Explorer).

| Paramètre | Options |
| --- | --- |
| Dimension du moniteur | Services AWS, compte lié, balise de répartition des coûts, catégorie de coûts (les trois dernières uniquement dans le compte de gestion) |
| Moniteur géré par AWS | Suit automatiquement toutes les valeurs de la dimension, y compris les nouveaux comptes ou valeurs de balise, jusqu'à 5 000 valeurs, un seul seuil pour toutes |
| Moniteur géré par le client | Jusqu'à 10 comptes ou valeurs choisis, évalués ensemble ; non disponible pour la dimension services AWS |
| Fréquence des alertes | Alertes individuelles (rubrique SNS obligatoire), résumé quotidien ou hebdomadaire (e-mail) |
| Seuil | Impact absolu en dollars, impact en pourcentage, ou les deux combinés par AND ou OR |

L'analyse des causes racines classe les contributeurs par service AWS, compte, Région et type d'utilisation. Un nouveau moniteur a besoin de 24 heures, et un nouveau service de 10 jours d'historique avant que des anomalies soient détectées pour lui. Les frais de Marketplace tiers ne sont pas surveillés, sauf les modèles de fondation tiers sur Amazon Bedrock.

| Exigence | Réponse |
| --- | --- |
| Prévenir l'équipe paiements quand la dépense mensuelle prévue dépasse 80 % de 50 000 USD | Budget de coût avec un seuil sur la prévision |
| Arrêter automatiquement les instances de développement quand le budget du bac à sable est dépassé | Action de budget ciblant des instances EC2 |
| Détecter un pic inattendu dans n'importe quel compte, y compris ceux créés le mois prochain | Moniteur géré par AWS sur la dimension compte lié |
| Alerter quand la couverture des Savings Plans descend sous 70 % | Budget de couverture des Savings Plans |
| Repérer une hausse soudaine des dépenses Bedrock d'une application | Moniteur d'anomalies sur la balise de répartition des coûts de l'application, plus une alarme CloudWatch sur les métriques de nombre de jetons |

> **Piège d'examen.** Les budgets alertent sur des seuils que vous fixez ; ils ne découvrent pas de profils inconnus. Anomaly Detection trouve des dépenses inhabituelles sans seuil mais n'agit pas. Un énoncé qui exige à la fois la détection et un confinement automatique les combine, ou utilise une action de budget.

<!-- section: key-points -->
## Points clés

- Les comptes portent tous les coûts ; les balises découpent les comptes partagés. Activez les balises définies par l'utilisateur dans le compte de gestion (jusqu'à 24 h pour apparaître, jusqu'à 24 h pour s'activer) ; les balises ne sont pas rétroactives.
- Cost Explorer : 13 mois, prévision sur 18 mois, API à 0,01 USD par requête. CUR 2.0 ou FOCUS via Data Exports vers S3, interrogé avec Athena.
- Les politiques de balises normalisent clés et valeurs ; `enforced_for` bloque le balisage non conforme, pas la création sans balise. Les SCP avec `aws:RequestTag` bloquent la création sans balise ; la règle Config `required-tags` détecte et corrige.
- Les catégories de coûts associent les coûts à l'entreprise ; la répartition des frais partage les coûts mais n'apparaît que sur la page de la catégorie. Les données de répartition fractionnée couvrent ECS, EKS (avec accélérateurs), le réseau et les préfixes S3.
- Bedrock : profils d'inférence d'application balisés, répartition par principal IAM dans le CUR 2.0, types d'utilisation par jeton et métriques CloudWatch de jetons.
- Budgets : six types, réel ou prévu, actions sur IAM, SCP, EC2, RDS. Anomaly Detection : moniteurs gérés par AWS ou par le client, alertes individuelles (SNS) ou résumés (e-mail), seuils absolus ou en pourcentage.
