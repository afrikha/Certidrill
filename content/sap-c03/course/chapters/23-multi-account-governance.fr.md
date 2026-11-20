Les questions de gouvernance décrivent une organisation de dizaines ou de centaines de comptes, plusieurs unités commerciales et une équipe sécurité centrale, et demandent comment créer des comptes conformes dès leur première minute, collecter chaque journal et chaque résultat au même endroit, partager les ressources réseau et sécurité, fixer des plafonds d'autorisations que personne ne peut retirer dans un compte membre, et garder les ressources conformes et corrigées. Ce chapitre couvre les zones d'atterrissage (landing zones) et le provisionnement des comptes, la journalisation centralisée (y compris les invocations d'IA), le partage entre comptes, les SCP et les RCP, la surveillance automatisée de la conformité, ainsi que l'analyse des vulnérabilités et la gestion des correctifs.

<!-- section: landing-zone | objectives: 2.3.1 -->
## Structure organisationnelle, zones d'atterrissage et provisionnement des comptes

Concevez les unités d'organisation (OU) autour des **politiques et du cycle de vie**, pas de l'organigramme : les comptes d'une même OU partagent les mêmes contrôles. Une base courante :

| OU | Comptes et rôle |
| --- | --- |
| Security | Archive des journaux (journaux immuables) et compte d'audit ou d'outillage sécurité (administrateur délégué de GuardDuty, Security Hub, Inspector, Config) |
| Infrastructure | Hub réseau (Transit Gateway, inspection, DNS), services partagés |
| Workloads, divisée en Prod et NonProd | Un compte par application et par environnement ; la production reçoit les contrôles les plus stricts |
| Sandbox | Expérimentation avec des plafonds de dépense, sans connectivité vers la production |
| Policy staging | Tester les SCP et les RCP avant de les attacher plus haut dans l'arborescence |
| Suspended | Comptes en attente de fermeture, avec une SCP qui refuse tout |

AWS Organizations autorise cinq niveaux d'OU sous la racine ; gardez une arborescence peu profonde car les politiques sont évaluées à travers chaque niveau.

**AWS Control Tower** construit la zone d'atterrissage : une organisation avec les comptes de l'OU Security, la journalisation centralisée de CloudTrail et de Config, IAM Identity Center et un catalogue de contrôles appliqués par OU.

| Comportement du contrôle | Mis en œuvre avec | Effet |
| --- | --- | --- |
| Préventif | SCP, RCP ou politiques déclaratives | L'action est refusée ; état appliqué (enforced) ou non activé |
| Détectif | Règles AWS Config | La non-conformité est signalée (clear ou in violation) ; rien n'est bloqué |
| Proactif | Hooks AWS CloudFormation | Les ressources non conformes ne sont pas provisionnées par CloudFormation (PASS, FAIL ou SKIP) |

La catégorie de recommandation est indépendante du comportement : obligatoire (mandatory), fortement recommandé (strongly recommended), facultatif (elective). Depuis la version 4.0 de la zone d'atterrissage, les contrôles obligatoires ne sont plus appliqués par défaut. Le contrôle de **refus de Région** (`AWS-GR_REGION_DENY`) s'applique à toute la zone d'atterrissage et ne peut pas refuser la Région d'origine ; `CT.MULTISERVICE.PV.1` restreint les Régions pour les seules OU choisies. Control Tower propose aussi une expérience limitée aux contrôles pour les organisations qui n'exploitent pas une zone d'atterrissage complète.

**Provisionner les comptes**

| Exigence | Mécanisme |
| --- | --- |
| Création de comptes en libre-service dans une OU gouvernée, depuis la console | Account Factory (utilisateurs du groupe `AWSAccountFactory` ou administrateurs) |
| Chaque nouveau compte doit contenir un ensemble standard de ressources (VPC, rôles, budgets) | Account Factory Customization : un plan (blueprint, CloudFormation ou Terraform, produit Service Catalog dans un compte hub) par compte, déployé dans la Région d'origine ou dans toutes les Régions gouvernées |
| Comptes demandés et personnalisés sous forme de code par un pipeline GitOps | Account Factory for Terraform (AFT), déployé dans son propre compte de gestion AFT, avec des personnalisations pour tous les comptes, un groupe de comptes ou un seul compte |
| Placer des comptes existants sous gouvernance | Les inscrire (enroll) ; ils ont besoin du rôle `AWSControlTowerExecution` et l'OU cible doit avoir `AWSControlTowerBaseline` activé |

> **Piège d'examen.** Les contrôles ne restreignent pas le compte de gestion, et les SCP ne s'y appliquent jamais. Gardez les charges de travail hors du compte de gestion ; un énoncé qui y exécute la production ne se corrige pas avec une SCP.

<!-- section: centralized-logging | objectives: 2.3.2 -->
## Journalisation et gestion de la configuration centralisées

| Données | Mécanisme à l'échelle de l'organisation |
| --- | --- |
| Activité des API | Journal de suivi d'organisation CloudTrail créé par le compte de gestion ou un administrateur délégué ; les comptes membres le voient mais ne peuvent ni l'arrêter ni le modifier ; les journaux arrivent sous `AWSLogs/<org-id>/<account-id>/` dans le compartiment d'archive des journaux |
| Configuration des ressources et historique de conformité | Enregistrement AWS Config dans chaque compte et chaque Région, plus un agrégateur d'organisation (vue en lecture seule) dans le compte d'audit |
| Détection des menaces | Amazon GuardDuty avec un administrateur délégué et l'activation automatique pour les nouveaux comptes, dans chaque Région |
| Posture et risques corrélés | AWS Security Hub CSPM (anciennement Security Hub : vérifications de contrôles, résultats ASFF, exige Config) et AWS Security Hub (OCSF, corrélation des signaux de CSPM, Inspector, Macie et GuardDuty en résultats d'exposition et chemins d'attaque) ; un seul administrateur délégué pour les deux, une Région d'agrégation des résultats |
| Analyse de sécurité à long terme dans un format ouvert | Amazon Security Lake : CloudTrail, journaux de flux VPC, journaux de requêtes Route 53 Resolver, journaux d'audit EKS, journaux WAF et résultats de Security Hub CSPM normalisés en OCSF au format Parquet, dans des compartiments S3 qui vous appartiennent, avec des Régions de cumul (rollup) et des abonnés via Lake Formation |
| Journaux d'applications et de services | Règles de centralisation CloudWatch Logs : répliquer les nouveaux événements de journaux de comptes, d'OU et de Régions choisis vers un compte et une Région de destination, avec une Région de sauvegarde facultative |

**Invocations de modèles d'IA.** CloudTrail enregistre les appels Bedrock `InvokeModel` et `Converse` comme événements de gestion (qui a appelé quel modèle), sans le corps des invites ni des réponses ; `InvokeAgent`, `Retrieve`, `RetrieveAndGenerate` et `ApplyGuardrail` sont des événements de données à sélectionner. Les invites et les réponses proviennent de la **journalisation des invocations de modèles**, désactivée par défaut et configurée par compte et par Région, avec une destination (CloudWatch Logs, S3 ou les deux) dans le même compte et la même Région ; les corps de plus de 100 Ko vont uniquement dans S3. Pour centraliser, combinez la journalisation des invocations dans chaque compte avec des règles de centralisation CloudWatch Logs ou la réplication S3 vers le compte d'archive des journaux, et chiffrez avec des clés gérées par le client dont la politique autorise le service.

> **Piège d'examen.** CloudTrail Lake n'est plus ouvert aux nouveaux clients depuis le 31 mai 2026, et AWS recommande CloudWatch pour les nouvelles conceptions. Une nouvelle organisation qui a besoin de requêtes SQL sur son journal de suivi utilise un journal de suivi d'organisation avec Athena, CloudWatch ou Security Lake, pas un nouveau magasin de données d'événements CloudTrail Lake.

<!-- section: resource-sharing | objectives: 2.3.3 -->
## Partage de ressources entre comptes

AWS RAM partage les ressources que vous possédez avec l'organisation, des OU, des comptes, ou des rôles et utilisateurs IAM pour certains types de ressources. Activez-le une fois depuis le compte de gestion :

```bash
aws ram enable-sharing-with-aws-organization
aws ram create-resource-share --name network-hub-tgw --resource-arns arn:aws:ec2:eu-west-1:111122223333:transit-gateway/tgw-0abc1234def567890 --principals arn:aws:organizations::999988887777:ou/o-exampleorgid/ou-ab12-workloads --no-allow-external-principals
```

| Fait RAM | Conséquence |
| --- | --- |
| Partage activé avec Organizations | Aucune invitation dans l'organisation ; les comptes ajoutés à l'OU obtiennent l'accès automatiquement, les comptes retirés le perdent |
| Accès approuvé activé seulement depuis la console Organizations | Ne crée pas le rôle lié à un service de RAM : le partage dans l'organisation ne fonctionne pas |
| Principaux hors de l'organisation | Invitation à accepter (7 jours pour les sous-réseaux, les passerelles de transit, les listes de préfixes, les règles Resolver ; 12 heures pour les autres types) |
| Les partages sont régionaux | Partager la ressource dans chaque Région où elle existe |
| Autorisations gérées | Limitent ce que les consommateurs peuvent faire ; les consommateurs ont toujours besoin de politiques IAM, qui ne peuvent pas dépasser l'autorisation |

| Ressource partagée | Conception typique |
| --- | --- |
| Passerelle de transit | Un compte réseau la possède avec ses tables de routage ; les comptes de charge de travail créent des attachements (acceptation automatique ou manuelle), le routage reste central |
| Sous-réseaux VPC (partage de VPC, dans l'organisation uniquement) | Les participants lancent des ressources dans des sous-réseaux centraux ; le propriétaire gère le VPC, les routes, la passerelle NAT et les points de terminaison ; les participants gèrent leurs ressources et leurs groupes de sécurité |
| Règles de transfert Route 53 Resolver | Un seul ensemble de règles de transfert conditionnel vers le DNS sur site, associé aux VPC de chaque compte |
| AWS Private CA, listes de préfixes, pools IPAM, configurations License Manager | Une seule autorité, une seule liste de CIDR, un seul plan d'adressage, un seul décompte de licences pour tous les comptes |

> **Conseil d'examen.** « Chaque équipe applicative a besoin de son propre compte, mais l'équipe réseau doit garder le contrôle du routage et de la sortie au coût le plus bas » désigne le partage de VPC ou une passerelle de transit partagée par RAM depuis un compte réseau, pas une passerelle NAT et un VPC par compte appairés entre eux.

<!-- section: scps-rcps | objectives: 2.3.4 -->
## Application des politiques avec les SCP et les RCP

| | SCP | RCP | Politique déclarative | Limite d'autorisations |
| --- | --- | --- | --- | --- |
| Limite | Les principaux des comptes membres | Les ressources des comptes membres, quel que soit l'appelant, principaux externes et utilisateurs racine compris | La configuration des services : VPC Block Public Access, VPC Encryption Controls, console série, partage public des AMI, Allowed AMIs, valeurs par défaut d'IMDS, accès public aux instantanés EBS | Un utilisateur ou un rôle IAM |
| Accorde des autorisations | Jamais | Jamais | Sans objet | Jamais |
| Rôles liés à un service | Non concernés | Non concernés | Gouvernés | Sans objet |
| Quotas | 10 par racine, OU ou compte (depuis mai 2026), 10 240 caractères | 5 par racine, OU ou compte (`RCPFullAWSAccess` compris), 5 120 caractères | Politique effective par héritage | Une par principal |

Ni les SCP ni les RCP n'affectent le compte de gestion. Les SCP et les RCP sont des filtres : une action ne réussit que si chaque SCP de la racine jusqu'au compte, chaque RCP au-dessus de la ressource, et une politique basée sur l'identité ou sur la ressource l'autorisent toutes, sans refus explicite. Les RCP couvrent environ 90 services, dont S3, KMS, STS, SQS, Secrets Manager, DynamoDB, ECR et CloudWatch Logs, mais pas les clés KMS gérées par AWS.

Utilisez les **SCP** pour arrêter vos propres principaux : refuser de quitter l'organisation, de désactiver CloudTrail, GuardDuty ou Config, d'utiliser des Régions non approuvées, ou de créer des utilisateurs IAM. Utilisez les **RCP** pour le côté ressources d'un périmètre de données : même si un développeur écrit une politique de compartiment qui accorde l'accès à un compte extérieur, la RCP le refuse.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceOrgIdentitiesOnS3",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "*",
      "Condition": {
        "StringNotEqualsIfExists": { "aws:PrincipalOrgID": "o-exampleorgid" },
        "BoolIfExists": { "aws:PrincipalIsAWSService": "false" }
      }
    }
  ]
}
```

Déployez via l'OU de test des politiques, puis les OU inférieures, puis en remontant, et surveillez les `AccessDenied` dans CloudTrail avant de toucher la racine.

> **Piège d'examen.** Une SCP ne peut pas empêcher un compte partenaire hors de l'organisation de lire un compartiment qu'une politique de compartiment a partagé avec lui : les SCP ne s'appliquent qu'aux principaux de vos comptes membres. Bloquer l'accès externe dans toute l'organisation est le rôle d'une RCP.

<!-- section: compliance-monitoring | objectives: 2.3.5 -->
## Surveillance automatisée de la conformité

| Exigence | Réponse |
| --- | --- |
| Évaluer chaque ressource par rapport à une règle à chaque changement ou périodiquement | Règles AWS Config : règles gérées, règles personnalisées en Lambda ou en Guard |
| Déployer les mêmes règles, ou un référentiel entier, dans tous les comptes | Règles Config d'organisation ou packs de conformité d'organisation (modèles pour PCI DSS, HIPAA, NIST et d'autres) depuis le compte de gestion ou l'administrateur délégué |
| Corriger automatiquement les ressources non conformes | Correction Config avec des documents Systems Manager Automation |
| Noter les comptes par rapport à FSBP, CIS, PCI DSS ou NIST SP 800-53 avec une sévérité | Normes d'AWS Security Hub CSPM, configurées sur les comptes, les Régions et les OU avec la configuration centrale |
| Garantir un contrôle sur chaque compte d'une OU | Contrôles détectifs de Control Tower (règles Config), ou contrôles préventifs pour bloquer le changement au lieu de le détecter |
| Réagir à un résultat en quasi temps réel | Règle EventBridge sur l'événement Config ou Security Hub, règles d'automatisation de Security Hub pour mettre à jour les résultats |

> **Piège d'examen.** AWS Audit Manager ne peut plus être configuré dans de nouveaux comptes depuis le 30 avril 2026 (mode maintenance). Une nouvelle organisation collecte les preuves de conformité avec les packs de conformité Config et Security Hub CSPM, pas en créant des évaluations Audit Manager.

<!-- section: vulnerability-patching | objectives: 2.3.6 -->
## Analyse des vulnérabilités et gestion des correctifs

**Amazon Inspector** analyse en continu, réanalyse quand un paquet change ou qu'une nouvelle CVE est publiée, et ajuste le score CVSS selon l'accessibilité réseau :

| Analyse | Couverture |
| --- | --- |
| Analyse EC2 | Mode hybride par défaut : avec agent via SSM Agent, sans agent via des instantanés EBS pour les instances sans agent |
| Analyse ECR | Convertit le registre privé à l'analyse améliorée (enhanced scanning), continue ou à l'envoi (on push), avec une durée de réanalyse configurable |
| Analyse Lambda standard et analyse du code Lambda | Dépendances des paquets ; l'analyse du code ajoute le code propre de la fonction |
| Code Security | Code propriétaire, dépendances et infrastructure en tant que code dans les dépôts |
| Analyse des images de machine | AMI que vous possédez, sans lancer d'instances |

Activez-le dans toute l'organisation depuis un administrateur délégué, avec l'activation automatique pour les nouveaux comptes ; les résultats vont vers EventBridge et Security Hub.

**Systems Manager Patch Manager** applique des **lignes de base de correctifs** (patch baselines, gérées par AWS ou personnalisées, avec des règles d'approbation et des délais d'approbation automatique) via `AWS-RunPatchBaseline`. Une **politique de correctifs Quick Setup** couvre tous les comptes et toutes les Régions de l'organisation ou des OU choisies, avec des calendriers distincts pour l'analyse et l'installation ; les fenêtres de maintenance et « Patch now » portent sur un seul compte et une seule Région à la fois. La conformité est signalée par compte et par Région.

> **Conseil d'examen.** « Analyser chaque jour, installer chaque semaine dans un créneau de maintenance, sur 200 comptes avec le moins de charge opérationnelle » correspond à une seule politique de correctifs Quick Setup ciblant l'organisation, pas à des fenêtres de maintenance créées par script dans chaque compte et chaque Région.

<!-- section: key-points -->
## Points clés

- Les OU regroupent les comptes par contrôles ; les contrôles Control Tower sont préventifs (SCP, RCP, déclaratifs), détectifs (Config) ou proactifs (hooks CloudFormation).
- Account Factory, plans Account Factory Customization, ou AFT pour un provisionnement GitOps ; l'inscription exige `AWSControlTowerExecution`.
- Journal de suivi d'organisation, agrégateur Config, administrateur délégué GuardDuty et Security Hub, Security Lake en OCSF, règles de centralisation CloudWatch Logs.
- Les invites et réponses Bedrock proviennent de la journalisation des invocations de modèles (par compte et par Région), pas de CloudTrail.
- CloudTrail Lake et Audit Manager sont fermés aux nouveaux clients en 2026.
- RAM dans l'organisation exige `enable-sharing-with-aws-organization` ; les partages sont régionaux.
- SCP : 10 par cible, 10 240 caractères, principaux uniquement ; RCP : 5 par cible, ressources et principaux externes ; aucune n'affecte le compte de gestion ni les rôles liés à un service.
- Inspector pour l'analyse continue des CVE, politiques de correctifs Quick Setup pour les correctifs à l'échelle de l'organisation.
