Les garde-fous de niveau organisation décident de ce qui est permis ; ce chapitre vise à rendre la bonne pratique simple et reproductible. L'examen décrit une équipe de sécurité qui doit pousser la même référence de base dans chaque compte et chaque Région, intercepter les modèles non sécurisés avant qu'ils n'atteignent la production, retrouver et gouverner les ressources par propriétaire ou par classification des données, appliquer des règles de pare-feu partout depuis un seul endroit, et laisser les équipes consommer des ressources approuvées sans leur accorder de larges permissions. Les outils sont CloudFormation StackSets et la politique en tant que code, les balises, AWS Firewall Manager, AWS Service Catalog et AWS RAM.

<!-- section: stacksets | objectives: 6.2.1 -->
## Déployer de manière cohérente sur plusieurs comptes avec StackSets

Un **StackSet** déploie un même modèle CloudFormation sous forme d'instances de pile dans de nombreux comptes et Régions. Le modèle d'autorisations est la première décision.

| | Autorisations autogérées (self-managed) | Autorisations gérées par le service (service-managed) |
| --- | --- | --- |
| Mise en place de la confiance | Vous créez `AWSCloudFormationStackSetAdministrationRole` dans le compte administrateur et `AWSCloudFormationStackSetExecutionRole` dans chaque compte cible | Accès approuvé avec Organizations ; StackSets crée les rôles dont il a besoin |
| Cibles | ID de comptes, dans une organisation ou hors d'elle | UO ou organisation entière (des filtres de comptes sont possibles) |
| Nouveaux comptes | À ajouter à la main | Déploiement automatique quand un compte rejoint une UO cible, avec suppression ou conservation (`RetainStacksOnAccountRemoval`) quand il la quitte |
| Qui peut administrer | Le compte qui détient le rôle d'administration | Le compte de gestion, ou jusqu'à cinq administrateurs délégués, qui utilisent `--call-as DELEGATED_ADMIN` et peuvent déployer dans n'importe quel compte de l'organisation |
| Compte de gestion | Peut être ciblé comme n'importe quel compte | Ne reçoit aucune instance de pile, même s'il se trouve dans une UO cible |

```bash
aws cloudformation create-stack-set --stack-set-name security-baseline --template-url https://example-templates.s3.eu-west-1.amazonaws.com/baseline.yaml --permission-model SERVICE_MANAGED --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false --capabilities CAPABILITY_NAMED_IAM --call-as DELEGATED_ADMIN
aws cloudformation create-stack-instances --stack-set-name security-baseline --deployment-targets OrganizationalUnitIds=ou-a1b2-workload1 --regions eu-west-1 eu-central-1 --operation-preferences FailureToleranceCount=0,MaxConcurrentPercentage=25,RegionConcurrencyType=SEQUENTIAL --call-as DELEGATED_ADMIN
```

Les préférences d'opération limitent le rayon d'impact : nombre maximal de comptes en parallèle, tolérance aux échecs (arrêt du déploiement après N échecs), et ordre ou parallélisme des Régions ; l'exécution gérée (managed execution) laisse s'exécuter en parallèle les opérations qui n'entrent pas en conflit. La détection de dérive sur le StackSet montre les comptes où quelqu'un a modifié à la main une ressource de la référence.

**La sécurité dans les modèles.** Déployez avec un rôle de service CloudFormation qui n'a que les permissions nécessaires au modèle, pour que les utilisateurs qui lancent des piles n'aient pas besoin de ces permissions eux-mêmes. Protégez les ressources critiques avec des politiques de pile (refus de `Update:Replace` ou `Update:Delete` sur un compartiment de journaux), la protection contre la résiliation et `DeletionPolicy: Retain` sur les clés KMS et les compartiments d'audit. Ne mettez jamais de secrets dans des paramètres ou des modèles : utilisez des références dynamiques vers Secrets Manager ou des `SecureString` de Parameter Store, ou laissez le service gérer le secret (`ManageMasterUserPassword` sur RDS).

> **Piège d'examen.** Un StackSet à autorisations autogérées ne suit pas l'organisation : les comptes créés le mois prochain ne reçoivent rien. « Chaque compte actuel et futur de l'UO Workloads » correspond à un StackSet géré par le service avec déploiement automatique, ou à une personnalisation Control Tower ou CfCT.

<!-- section: iac-validation | objectives: 6.2.1 -->
## Valider l'infrastructure en tant que code avant et pendant le déploiement

La validation intervient à trois moments, et chaque outil en couvre un.

| Outil | Ce qu'il vérifie | Où il s'exécute | Peut-on le contourner ? |
| --- | --- | --- | --- |
| cfn-lint | Syntaxe du modèle, types de ressources et valeurs de propriétés au regard des schémas CloudFormation, règles de bonnes pratiques, règles personnalisées | Poste du développeur, vérifications de pull request | Oui, il est indicatif |
| AWS CloudFormation Guard | Règles de politique en tant que code dans un DSL déclaratif, sur tout JSON ou YAML : modèles, jeux de modifications, configurations Terraform JSON, manifestes Kubernetes, éléments de configuration Config | Pipeline CI, ou en tant que hook Guard | Dans un pipeline, oui : quelqu'un qui déploie directement l'évite |
| Hooks CloudFormation | Ressources, piles et jeux de modifications avant création, mise à jour ou suppression, et opérations Cloud Control API | Dans CloudFormation, côté serveur | Non pour CloudFormation et Cloud Control API ; ils ne voient pas les autres outils de déploiement |
| Règles AWS Config | Ressources déployées, quel que soit leur créateur | Après le déploiement, en continu | Non, mais elles détectent au lieu d'empêcher |

Les hooks s'écrivent en Guard, dans une fonction Lambda ou sous forme de hooks personnalisés du registre CloudFormation, et les contrôles proactifs de Control Tower sont des hooks gérés issus du Control Catalog. Un hook fait échouer l'opération ou émet un avertissement et la laisse continuer.

```text
let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]

rule s3_buckets_use_kms when %buckets !empty {
    %buckets.Properties.BucketEncryption.ServerSideEncryptionConfiguration[*].ServerSideEncryptionByDefault.SSEAlgorithm == 'aws:kms'
    %buckets.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy == true
}
```

```bash
cfn-lint templates/storage.yaml
cfn-guard validate --data templates/storage.yaml --rules rules/s3.guard
```

Un pipeline sécurisé s'exécute dans cet ordre : analyse statique (lint), tests de politique en tant que code sur le modèle et le jeu de modifications, approbation manuelle pour les changements à haut risque, déploiement par un rôle que seul le pipeline peut assumer, puis détection avec Config.

**Outils IaC tiers.** Terraform et les outils similaires entrent dans le périmètre à condition d'être sécurisés : gardez l'état dans un backend S3 avec SSE-KMS, gestion des versions et Block Public Access, car les fichiers d'état contiennent les attributs des ressources et souvent des secrets ; utilisez le verrouillage natif de l'état dans S3 (`use_lockfile`, Terraform 1.11 et versions ultérieures) plutôt que le verrouillage DynamoDB, déprécié ; faites assumer au pipeline un rôle étroitement limité dans chaque compte cible ; et analysez les plans dans le pipeline (règles Guard sur le plan JSON, analyse de sécurité du code d'Amazon Inspector pour l'infrastructure en tant que code des référentiels). Rappelez-vous que les hooks CloudFormation ne voient pas les déploiements Terraform qui appellent directement les API AWS : la couverture préventive y vient des SCP, des RCP et des politiques déclaratives.

> **Piège d'examen.** « Empêcher toute création de compartiment S3 non conforme via CloudFormation, même par des développeurs qui déploient depuis leur ordinateur portable » correspond à un hook CloudFormation (ou à un contrôle proactif Control Tower), pas à Guard dans le pipeline CI, qui ne protège que les déploiements passant par le pipeline.

<!-- section: tagging-strategy | objectives: 6.2.2 -->
## Organiser les ressources avec des balises

Les balises regroupent les ressources par département, centre de coûts, environnement, propriétaire, application ou classification des données, et de nombreux mécanismes de sécurité sélectionnent les ressources par balise : portée de Firewall Manager, affectation des ressources dans AWS Backup, cibles de Data Lifecycle Manager, règles de la Corbeille, cibles de Systems Manager et contrôle d'accès par attributs (ABAC). Ne mettez jamais de données sensibles dans les balises : elles apparaissent dans les données de facturation et de nombreuses API.

| Objectif | Mécanisme |
| --- | --- |
| Normaliser l'orthographe, la casse et les valeurs autorisées des clés | Politiques de balises d'Organizations ; `enforced_for` bloque les opérations de balisage non conformes sur les types de ressources listés |
| Exiger une balise à la création | SCP refusant l'action de création quand `aws:RequestTag/CostCenter` est absente, avec la prise en charge du balisage à la création par le service |
| Empêcher les utilisateurs de modifier des balises liées à la sécurité | SCP refusant les actions de balisage quand `aws:TagKeys` contient la clé protégée, sauf pour un rôle d'automatisation |
| Accorder l'accès par correspondance de balises | ABAC : `aws:PrincipalTag` comparée à `aws:ResourceTag` dans les politiques IAM |
| Trouver et signaler les ressources non balisées ou non conformes | Règle AWS Config `required-tags`, Tag Editor, rapports de conformité des politiques de balises (pour toute l'organisation depuis le compte de gestion) |
| Agir sur un groupe de ressources | AWS Resource Groups fondés sur une requête de balises ou sur une pile CloudFormation |
| Répartir les coûts | Balises de répartition des coûts activées dans le compte de gestion (payeur) |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireCostCenterOnLaunch",
      "Effect": "Deny",
      "Action": ["ec2:RunInstances", "ec2:CreateVolume"],
      "Resource": ["arn:aws:ec2:*:*:instance/*", "arn:aws:ec2:*:*:volume/*"],
      "Condition": { "Null": { "aws:RequestTag/CostCenter": "true" } }
    },
    {
      "Sid": "ProtectClassificationTag",
      "Effect": "Deny",
      "Action": ["ec2:CreateTags", "ec2:DeleteTags"],
      "Resource": "*",
      "Condition": {
        "ForAnyValue:StringEquals": { "aws:TagKeys": ["DataClassification"] },
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/TaggingAutomation" }
      }
    }
  ]
}
```

L'ABAC ne vaut que ce que vaut la gouvernance des balises : si les utilisateurs peuvent modifier la balise `Project` d'une ressource ou leur propre balise de principal, ils peuvent s'accorder l'accès. Protégez par des SCP les balises qui pilotent l'autorisation, et définissez les balises de principal depuis le fournisseur d'identité via des balises de session.

> **Piège d'examen.** Les politiques de balises ne rendent pas une balise obligatoire : les ressources sans la balise, et les clés que la politique ne définit pas, ne sont pas évaluées. Pour exiger une balise à la création, utilisez une SCP avec `aws:RequestTag` ; pour signaler les balises manquantes sur des ressources existantes, utilisez la règle Config `required-tags`.

<!-- section: central-enforcement | objectives: 6.2.3 -->
## Appliquer des politiques depuis une source centrale avec Firewall Manager

**AWS Firewall Manager** applique des protections réseau et applicatives dans toute l'organisation et les maintient sur les nouveaux comptes et les nouvelles ressources. Prérequis, dans l'ordre : Organizations avec toutes les fonctionnalités, un compte administrateur par défaut de Firewall Manager désigné par le compte de gestion, AWS Config activé dans chaque compte et chaque Région de la portée, le partage AWS RAM pour les politiques Network Firewall et DNS Firewall, et un abonnement AWS Marketplace pour les pare-feu tiers.

| Type de politique | Ce qu'elle impose |
| --- | --- |
| AWS WAF | Des listes ACL web avec des groupes de règles obligatoires en premier et en dernier (par exemple les règles gérées AWS) sur les ALB, les étapes API Gateway, CloudFront et d'autres ressources prises en charge ; les équipes des comptes peuvent ajouter des règles entre les deux |
| Shield Advanced | Protection des ALB, des Classic Load Balancers, des adresses IP Elastic et des distributions CloudFront, avec atténuation automatique facultative des attaques DDoS de la couche application |
| Groupe de sécurité, commun (common) | Réplique un groupe de sécurité principal sur les instances et les ENI de la portée |
| Groupe de sécurité, audit du contenu (content audit) | Signale ou supprime les règles qui autorisent un trafic interdit (par exemple 0.0.0.0/0 sur SSH) |
| Groupe de sécurité, audit de l'usage (usage audit) | Trouve les groupes de sécurité inutilisés ou redondants |
| Liste ACL réseau | Impose les premières et dernières règles de liste ACL réseau sur les sous-réseaux |
| AWS Network Firewall | Crée des points de terminaison de pare-feu et attache des groupes de règles et des politiques centrales dans les VPC de la portée |
| Route 53 Resolver DNS Firewall | Associe des groupes de règles de listes de domaines aux VPC |
| Pare-feu tiers | Palo Alto Networks Cloud NGFW, Fortinet FortiGate CNF depuis AWS Marketplace |

Chaque politique cible des comptes et des UO (inclusion ou exclusion), des types de ressources et éventuellement des balises de ressources, dans une Région (les politiques sont régionales), avec au plus 2 500 comptes par politique. **La correction automatique (auto remediation)** applique la protection aux ressources non conformes ; sans elle, la politique ne fait que signaler la conformité. Au-delà de l'administrateur par défaut, le compte de gestion peut créer des administrateurs supplémentaires à **portée restreinte** : comptes ou UO, Régions et types de politiques choisis, pour que l'équipe réseau gère Network Firewall pendant que l'équipe de sécurité applicative gère WAF.

```bash
aws fms associate-admin-account --admin-account 222233334444
aws fms list-compliance-status --policy-id 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d
```

D'autres sources centrales répondent à des énoncés similaires : packs de conformité et règles Config d'organisation (vérifications de conformité), configuration centrale de Security Hub CSPM (normes par UO), politiques de sauvegarde et de balises d'Organizations, Systems Manager Quick Setup (correctifs, agents) et contrôles Control Tower.

> **Piège d'examen.** Firewall Manager dépend d'AWS Config : si l'enregistrement est désactivé dans un compte ou une Région, Firewall Manager n'y voit pas les ressources et ne signale rien. Un énoncé où de nouveaux comptes « ne sont pas protégés par la politique WAF » cache souvent un enregistreur Config manquant, un compte hors de la portée de la politique ou une politique créée sans correction automatique.

<!-- section: resource-sharing | objectives: 6.2.4 -->
## Partager des ressources entre comptes de manière sécurisée

| Besoin | Mécanisme |
| --- | --- |
| Utiliser la même ressource physique depuis plusieurs comptes (sous-réseaux, passerelle de transit, Private CA, politique Network Firewall, listes de préfixes, règles Resolver, coffre de sauvegarde isolé logiquement) | Partage de ressources AWS RAM |
| Donner aux équipes un accès en libre-service à des piles approuvées et préconfigurées sans larges permissions | Portefeuille AWS Service Catalog partagé avec leurs comptes |
| Installer une copie identique d'une ressource dans chaque compte | StackSets |
| Accorder à un autre compte l'accès à un compartiment, une clé, une file d'attente ou un secret précis | Politique basée sur les ressources |

**AWS RAM.** Activez le partage avec Organizations depuis la console RAM ou avec `aws ram enable-sharing-with-aws-organization`, qui crée le rôle lié au service RAM ; activer l'accès approuvé seulement côté Organizations ne le crée pas. Dans l'organisation, il n'y a pas d'invitation ; hors d'elle, les invitations expirent après 7 jours ou 12 heures selon le type de ressource. La console propose par défaut « Autoriser le partage avec n'importe qui » (Allow sharing with anyone) : choisissez le partage limité à l'organisation, et imposez-le avec une SCP. Les autorisations gérées (gérées par AWS ou par le client) plafonnent ce que les consommateurs peuvent faire ; les consommateurs ont toujours besoin de politiques IAM, qui ne peuvent pas les dépasser, et ils ne peuvent pas repartager. Les partages sont régionaux.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyRamSharingOutsideOrg",
      "Effect": "Deny",
      "Action": ["ram:CreateResourceShare", "ram:UpdateResourceShare"],
      "Resource": "*",
      "Condition": { "Bool": { "ram:RequestedAllowsExternalPrincipals": "true" } }
    }
  ]
}
```

**AWS Service Catalog.** Les administrateurs publient des produits (modèles CloudFormation ou Terraform) dans des portefeuilles et appliquent des contraintes :

| Contrainte | Effet |
| --- | --- |
| Lancement (launch) | Un rôle IAM que Service Catalog assume pour provisionner le produit, si bien que les utilisateurs finaux n'ont besoin que de permissions Service Catalog, pas de permissions sur les services sous-jacents |
| Modèle (template) | Restreint les valeurs des paramètres (types d'instances autorisés, Régions autorisées) |
| Notification | Envoie les événements de pile vers une rubrique SNS |
| Mise à jour des balises (tag update) | Autorise ou empêche les utilisateurs finaux de modifier les balises des produits provisionnés |
| StackSet | Déploie le produit sur plusieurs comptes et Régions |

Les TagOptions ajoutent des balises définies par l'administrateur à chaque produit provisionné. Les portefeuilles se partagent de compte à compte ou avec une organisation ou une UO ; le destinataire importe une référence qui reste synchronisée, ne peut pas modifier ses produits ni ses contraintes, et ajoute ses propres utilisateurs, groupes et rôles. Une contrainte de lancement se propage avec le partage ; pour la remplacer, le destinataire ajoute le produit à un portefeuille local doté de sa propre contrainte de lancement. Avec un ARN de rôle, c'est le compte propriétaire du rôle qui provisionne les ressources ; avec un nom de rôle local, c'est le rôle de ce nom dans le compte de l'utilisateur final qui est utilisé. Les portefeuilles importés ne peuvent pas être repartagés, et les imports doivent se faire dans la même Région.

> **Piège d'examen.** Quand un produit partagé doit créer des ressources dans chaque compte consommateur avec un rôle défini dans ce compte, indiquez le rôle de lancement par son nom de rôle local, pas par son ARN : un ARN de rôle du compte hub fait provisionner les ressources par le compte hub, qui les paie.

<!-- section: key-points -->
## Points clés

- Les StackSets gérés par le service suivent les UO avec le déploiement automatique, acceptent jusqu'à cinq administrateurs délégués et ne déploient jamais dans le compte de gestion.
- cfn-lint vérifie la syntaxe et le schéma, Guard vérifie la politique dans le pipeline, les hooks CloudFormation imposent côté serveur, Config détecte après le déploiement.
- L'état Terraform va dans un compartiment S3 chiffré, versionné et privé, avec verrouillage natif ; les hooks ne voient pas Terraform.
- Les politiques de balises normalisent les balises sans les exiger ; les SCP avec `aws:RequestTag` les exigent ; protégez les balises ABAC par des refus sur `aws:TagKeys`.
- Firewall Manager exige Organizations, un administrateur par défaut, Config partout et RAM pour Network Firewall et DNS Firewall ; les politiques sont régionales ; utilisez la correction automatique.
- Les administrateurs Firewall Manager supplémentaires peuvent être limités par comptes, Régions et types de politiques.
- RAM : activer le partage depuis RAM, restreindre les principaux externes avec `ram:RequestedAllowsExternalPrincipals` ; les autorisations gérées plafonnent les consommateurs.
- Les contraintes de lancement Service Catalog permettent de déployer sans permissions sur les services ; les portefeuilles importés restent synchronisés et ne peuvent pas être repartagés.
