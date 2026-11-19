Toute action sur AWS, du lancement d'une instance à la suppression d'un compartiment, est un appel d'API. Vous pouvez faire cet appel en cliquant dans un navigateur, en tapant une commande, depuis votre propre code, ou en décrivant l'infrastructure dans un modèle qu'AWS déploie pour vous. L'examen vous demande de choisir la méthode d'accès adaptée à une exigence, de distinguer une tâche ponctuelle d'un processus reproductible, et de reconnaître les modèles de déploiement cloud, hybride et sur site.

<!-- section: access-methods | objectives: 3.1.2, 3.1.4 -->
## Manières d'accéder aux services AWS

| Méthode | Ce que c'est | Idéal pour |
| --- | --- | --- |
| **AWS Management Console** | Interface web dans un navigateur ; aussi l'AWS Console Mobile Application pour consulter ressources et alarmes sur un téléphone | Apprendre, explorer, tâches ponctuelles, surveillance visuelle |
| **AWS Command Line Interface (AWS CLI)** | Un outil unique pour piloter les services AWS par des commandes dans un terminal | Scripts et automatisation de tâches répétées |
| **SDK AWS** | Bibliothèques pour langages de programmation (Python, Java, JavaScript, .NET, Go et d'autres) qui appellent les API AWS depuis le code applicatif | Applications qui utilisent des services AWS |
| **API AWS** | Requêtes HTTPS vers les points de terminaison des services, signées avec vos informations d'identification ; ce qu'utilisent en dessous la console, la CLI et les SDK | Outils et intégrations personnalisés |
| **Infrastructure as code (IaC)** | Modèles ou code qui décrivent les ressources ; AWS les crée, les met à jour et les supprime comme un tout | Environnements reproductibles et cohérents |

L'accès à la console utilise un nom d'utilisateur et un mot de passe (avec MFA) ou le portail d'accès IAM Identity Center. L'accès programmatique (CLI, SDK, API) utilise des clés d'accès ou, mieux, des informations d'identification temporaires issues d'un rôle ou d'IAM Identity Center.

```bash
# The same task as a few clicks in the console, now scriptable
aws ec2 describe-instances --region eu-west-3
```

> **Piège d'examen.** La console, la CLI et les SDK appellent tous les mêmes API. Aucun n'est « plus puissant » ; c'est l'exigence qui décide : l'application d'un développeur utilise un SDK, le script d'un administrateur utilise la CLI, un environnement reproductible utilise l'IaC.

<!-- section: provisioning-operating | objectives: 3.1.1 -->
## Mettre en service et exploiter des ressources

| Service | Rôle |
| --- | --- |
| **AWS CloudFormation** | Service d'IaC : un modèle en JSON ou YAML décrit les ressources ; CloudFormation les déploie sous forme de **pile** (stack), de façon prévisible et reproductible, avec restauration en cas d'erreur |
| **AWS Cloud Development Kit (AWS CDK)** | Framework open source pour définir l'infrastructure en TypeScript, JavaScript, Python, Java, C#/.NET ou Go ; il génère des modèles CloudFormation et déploie via CloudFormation |
| **AWS Elastic Beanstalk** | Vous chargez le code de l'application ; AWS met en service et gère la capacité, l'équilibrage de charge, la mise à l'échelle et la surveillance de l'état |
| **AWS Systems Manager** | Exploiter des parcs de serveurs sur AWS et sur site : correctifs, exécution de commandes, sessions sécurisées sans SSH, stockage de paramètres, runbooks d'automatisation |
| **AWS Service Catalog** | Les administrateurs publient des produits approuvés (modèles CloudFormation) que les utilisateurs peuvent lancer eux-mêmes |
| **AWS Control Tower** | Met en place et gouverne un environnement multicompte (landing zone) selon les bonnes pratiques |
| **AWS Organizations** | Regroupe les comptes, avec des politiques centralisées et une facturation consolidée |

```yaml
# Minimal CloudFormation template: one S3 bucket with versioning
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  ReportsBucket:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
```

> **Conseil d'examen.** « Déployer une application web sans gérer l'infrastructure, en chargeant le code », c'est Elastic Beanstalk. « Mettre en service la même infrastructure dans plusieurs Régions ou comptes à partir d'un modèle », c'est CloudFormation. « Les développeurs veulent définir l'infrastructure dans un langage de programmation familier », c'est l'AWS CDK.

<!-- section: one-time-repeatable | objectives: 3.1.5 -->
## Opérations ponctuelles ou processus reproductibles

| Situation | Approche |
| --- | --- |
| Essayer un service, inspecter une ressource, corriger un réglage une seule fois | Console |
| La même tâche revient régulièrement (démarrer ou arrêter des instances, exporter des rapports) | Script CLI ou programme SDK, Systems Manager Automation |
| Le même environnement est nécessaire en développement, en test et en production, ou dans plusieurs Régions | IaC (CloudFormation ou CDK) |
| Les changements doivent être relus, versionnés et réversibles | Modèles IaC stockés dans un système de gestion de versions |
| Des utilisateurs métier lancent des ressources standard sans expertise AWS | Produits Service Catalog |

Avantages des processus reproductibles : environnements identiques, moins d'erreurs manuelles, déploiement plus rapide, trace de ce qui a changé, et possibilité de tout recréer après une panne (reprise après sinistre). Le cadre Well-Architected appelle cela « effectuer les opérations sous forme de code ».

> **Piège d'examen.** Cliquer dans la console convient pour une fois. Dès que l'énoncé dit « cohérent », « reproductible », « sur plusieurs comptes » ou « sans erreurs manuelles », la réponse est l'automatisation, en général CloudFormation.

<!-- section: deployment-models | objectives: 3.1.3, 3.1.6 -->
## Modèles de déploiement de cloud

| Modèle | Définition | Exemples AWS |
| --- | --- | --- |
| **Cloud** (tout dans le cloud) | Toutes les parties de l'application s'exécutent dans le cloud, créées là ou migrées | Une application web sur EC2, RDS et S3 ; une application sans serveur sur Lambda et DynamoDB |
| **Hybride** | Relie des ressources cloud à des ressources existantes qui ne sont pas dans le cloud, en général un centre de données sur site | AWS Site-to-Site VPN ou AWS Direct Connect entre le centre de données et un VPC ; AWS Storage Gateway ; AWS Outposts |
| **Sur site** (cloud privé) | Ressources déployées dans votre propre centre de données avec des outils de virtualisation et de gestion des ressources | Peu d'avantages du cloud ; choisi pour disposer de ressources dédiées |

**AWS Outposts** apporte l'infrastructure et les services AWS dans votre centre de données, pour les charges de travail qui ont besoin d'une faible latence vers des systèmes sur site ou qui doivent garder les données sur place. C'est une solution hybride gérée avec les mêmes API et la même console AWS.

Ces modèles se combinent souvent avec les modèles de service :

| Modèle de service | Vous gérez | Exemple AWS |
| --- | --- | --- |
| Infrastructure as a service (IaaS) | Système d'exploitation, environnement d'exécution, application, données | Amazon EC2 |
| Platform as a service (PaaS) | Application et données | AWS Elastic Beanstalk |
| Software as a service (SaaS) | Seulement votre utilisation du logiciel et vos données | Une application complète fournie par Internet |

> **Conseil d'examen.** « Garder certains systèmes dans le centre de données sur site et les relier à AWS », c'est l'hybride. « Exécuter des services AWS dans notre propre centre de données », c'est AWS Outposts.

<!-- section: key-points -->
## Points clés

- Console pour le travail visuel et ponctuel, CLI pour les scripts, SDK pour le code applicatif, API en dessous de tout.
- CloudFormation : modèles JSON ou YAML déployés sous forme de piles, reproductibles, avec restauration. CDK : la même chose avec des langages de programmation, via CloudFormation.
- Elastic Beanstalk : chargez le code, AWS l'exécute. Systems Manager : exploiter des parcs. Service Catalog : produits approuvés en libre-service.
- Les exigences reproductibles, cohérentes, multicomptes ou multirégions signifient IaC et automatisation.
- Modèles de déploiement : cloud, hybride (relié au site ; Outposts, VPN, Direct Connect), sur site (cloud privé).
