Le provisionnement est à l'origine de la plupart des incidents d'exploitation : une AMI impossible à partager, une pile bloquée en `UPDATE_ROLLBACK_FAILED`, un sous-réseau à court d'adresses, un StackSet qui ignore la moitié des comptes. Les questions SOA-C03 donnent l'erreur ou l'exigence et demandent le pipeline d'images, l'attribut de modèle, le mécanisme de partage ou la stratégie de déploiement qui règle le problème avec le moins d'effort.

<!-- section: images | objectives: 3.1.1 -->
## Créer et gérer des AMI et des images de conteneur

Les **AMI** sont régionales. Opérations essentielles :

| Tâche | Comment |
| --- | --- |
| Créer à partir d'une instance | `create-image` redémarre l'instance par défaut pour obtenir des instantanés cohérents ; `--no-reboot` ne garantit pas l'intégrité du système de fichiers |
| Utiliser dans une autre Région | `copy-image` vers cette Région (la copie peut être chiffrée avec une clé de cette Région) |
| Partager avec des comptes, une organisation ou des unités d'organisation | Ajouter des autorisations de lancement ; une AMI chiffrée doit utiliser une **clé KMS gérée par le client** partagée avec les comptes cibles (une AMI chiffrée avec la clé gérée par AWS ne peut pas être partagée) ; les instantanés n'ont pas à être partagés séparément |
| Retirer | **Rendre obsolète** (deprecate : masquée dans les listes mais toujours lançable par ID, les modèles de lancement existants continuent de fonctionner), **désactiver**, puis **désinscrire** (deregister) et supprimer les instantanés |
| Protéger | **Protection contre la désinscription**, avec en option un délai de 24 heures après sa désactivation ; règles de Corbeille (Recycle Bin) pour les AMI supprimées |

**EC2 Image Builder** automatise les images de référence (golden images) :

| Ressource | Rôle |
| --- | --- |
| Composant | Document YAML exécuté par AWS Task Orchestrator and Executor (AWSTOE) pour construire (installer, durcir) ou tester |
| Recette d'image / recette de conteneur | Image de base plus composants ; une recette de conteneur ajoute un Dockerfile et le référentiel ECR cible |
| Configuration d'infrastructure | Type d'instance, sous-réseau, groupe de sécurité et profil d'instance des instances de construction |
| Paramètres de distribution | Régions et comptes cibles, autorisations de lancement (propagées à toutes les Régions), mise à jour des modèles de lancement |
| Pipeline d'images | Planification manuelle, cron ou rate ; condition de démarrage `EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE` (par défaut : construire seulement quand l'image de base ou un composant a une nouvelle version) ou `EXPRESSION_MATCH_ONLY` (construire à chaque correspondance) |
| Politique de cycle de vie | Rend obsolètes, désactive ou supprime les anciennes images et leurs instantanés ou images ECR, chaque jour, dans toutes les Régions et tous les comptes |

**Amazon ECR** garde les images de conteneur sous contrôle : les **politiques de cycle de vie** font expirer les images par nombre (`imageCountMoreThan`) ou par ancienneté (`sinceImagePushed`), la valeur de `rulePriority` la plus basse l'emporte, testez avec un aperçu, l'expiration intervient dans les 24 heures ; l'**immuabilité des balises** rejette un envoi qui réutilise une balise (`ImageTagAlreadyExistsException`) ; **analyse de base** (paquets du système d'exploitation, manuelle ou à l'envoi) ou **analyse améliorée** avec Amazon Inspector (paquets du système et des langages, à l'envoi ou en continu) ; la **réplication** entre Régions et comptes ne copie que les images envoyées après la création de la règle, et la réplication intercomptes exige une politique de registre dans le compte de destination.

> **Piège d'examen.** « Le lancement échoue dans le compte partenaire avec une erreur KMS alors que l'AMI est partagée » signifie que la clé gérée par le client qui chiffre les instantanés de l'AMI n'est pas partagée avec ce compte (ou que l'AMI utilise la clé gérée par AWS et doit d'abord être copiée avec une clé gérée par le client).

<!-- section: cloudformation-cdk | objectives: 3.1.2 -->
## Gérer les ressources avec CloudFormation et l'AWS CDK

| Besoin | Fonctionnalité CloudFormation |
| --- | --- |
| Prévisualiser l'effet d'une mise à jour (ajout, modification, remplacement) | **Jeu de modifications** (change set), puis exécution ; l'exécution supprime les autres jeux de modifications de la pile |
| Trouver les modifications manuelles faites hors de la pile | **Détection de dérive** (drift detection) : `IN_SYNC`, `MODIFIED`, `DELETED`, `NOT_CHECKED` ; seules les propriétés définies explicitement sont comparées, les piles imbriquées exigent leur propre détection |
| Empêcher la mise à jour d'une ressource critique | **Politique de pile** (stack policy : une fois définie, toute mise à jour non autorisée explicitement est refusée ; dérogation pour une seule mise à jour avec une politique temporaire) |
| Empêcher la suppression de la pile | Protection contre la résiliation (termination protection) |
| Conserver les données quand une ressource est supprimée ou remplacée | `DeletionPolicy` (`Delete` par défaut, `Retain`, `RetainExceptOnCreate`, `Snapshot` ; RDS utilise `Snapshot` par défaut) et `UpdateReplacePolicy` |
| Attendre que les instances soient configurées | `CreationPolicy` avec `cfn-signal` (nombre et délai, 5 minutes par défaut, 12 heures au maximum) |
| Contrôler la mise à jour d'un groupe Auto Scaling | `UpdatePolicy` (mise à jour propagée, mise à jour par remplacement, gestion des actions planifiées) |

```yaml
WebAsg:
  Type: AWS::AutoScaling::AutoScalingGroup
  CreationPolicy:
    ResourceSignal:
      Count: 2
      Timeout: PT15M
  UpdatePolicy:
    AutoScalingRollingUpdate:
      MaxBatchSize: 1
      MinInstancesInService: 2
      WaitOnResourceSignals: true
      PauseTime: PT10M
  Properties:
    MinSize: '2'
    MaxSize: '6'
    VPCZoneIdentifier: [!Ref PrivateSubnetA, !Ref PrivateSubnetB]
    LaunchTemplate:
      LaunchTemplateId: !Ref WebLaunchTemplate
      Version: !GetAtt WebLaunchTemplate.LatestVersionNumber
```

L'**AWS CDK** définit l'infrastructure dans un langage de programmation et la déploie par CloudFormation. Les constructions (constructs) existent à trois niveaux : **L1** (classes `Cfn*`, en correspondance directe avec les ressources CloudFormation), **L2** (organisées, avec valeurs par défaut et méthodes utilitaires), **L3** (modèles qui combinent plusieurs ressources). Chaque couple compte et Région doit être **amorcé** (bootstrap) une fois (pile `CDKToolkit` avec un compartiment S3, un référentiel ECR et des rôles IAM).

```bash
cdk bootstrap aws://111122223333/eu-west-1
cdk synth          # writes the CloudFormation template to cdk.out
cdk diff           # compares with the deployed stack
cdk deploy WebStack
```

> **Conseil d'examen.** « Savoir si une mise à jour va remplacer la base de données de production avant de la lancer » correspond à un jeu de modifications. « Découvrir qui a modifié un groupe de sécurité créé par une pile » commence par la détection de dérive (ce qui a changé) et CloudTrail (qui l'a fait).

<!-- section: deployment-issues | objectives: 3.1.3 -->
## Identifier et corriger les problèmes de déploiement

| Symptôme | Cause et correction |
| --- | --- |
| Pile en `ROLLBACK_COMPLETE` | La création a échoué et a été annulée ; seule la suppression est possible : supprimer, corriger le modèle, recréer. Pour déboguer, créez avec `--disable-rollback` (conserver les ressources provisionnées avec succès) |
| Pile en `UPDATE_ROLLBACK_FAILED` | Une ressource ne peut pas revenir à son état antérieur (modifiée ou supprimée hors de CloudFormation, autorisation manquante) : corrigez la cause puis `continue-update-rollback`, en n'ignorant des ressources qu'en dernier recours |
| `DELETE_FAILED` | Compartiment S3 non vide, groupe de sécurité encore utilisé, protection contre la résiliation : vider ou détacher, ou supprimer de nouveau en conservant cette ressource |
| `InsufficientCapabilitiesException` | Le modèle crée des ressources IAM ou utilise des macros : passez `CAPABILITY_IAM`, `CAPABILITY_NAMED_IAM` ou `CAPABILITY_AUTO_EXPAND` |
| Accès refusé pendant la création | L'appelant ou le **rôle de service** de la pile n'a pas les autorisations sur le service sous-jacent, ou `iam:PassRole` sur le rôle ; vérifiez aussi les SCP, les limites d'autorisations et les politiques de clé KMS |
| Expiration d'une condition d'attente ou d'une `CreationPolicy` | `cfn-signal` ne s'est jamais exécuté : scripts d'assistance absents, erreur dans les données utilisateur (consultez `/var/log/cfn-init.log`), pas d'accès Internet ni de point de terminaison depuis le sous-réseau |
| Quota dépassé | Un remplacement crée la nouvelle ressource avant de supprimer l'ancienne ; augmentez le quota ou libérez des ressources |

Cherchez toujours le **premier** événement `*_FAILED` dans les événements de la pile : les échecs suivants en sont des conséquences.

Les erreurs de **dimensionnement des sous-réseaux** se manifestent par un manque d'adresses libres quand un groupe Auto Scaling, un groupe de nœuds EKS, des fonctions Lambda dans un VPC ou un équilibreur de charge ne peuvent pas obtenir d'adresses IP. Faits : les sous-réseaux IPv4 vont de /16 à /28 ; AWS réserve **cinq adresses** dans chaque sous-réseau (adresse réseau, routeur du VPC, DNS, usage futur, diffusion), donc un /28 offre 11 adresses utilisables et un /24 en offre 251. Un bloc CIDR de VPC ne peut pas être redimensionné : ajoutez un **bloc CIDR secondaire** (sans chevauchement, de /16 à /28), créez de nouveaux sous-réseaux plus grands, puis déplacez les charges de travail.

> **Piège d'examen.** Supprimer et recréer une pile en `ROLLBACK_COMPLETE` sans lire les événements reproduit le même échec. Désactivez la restauration pour conserver l'instance en échec et lire ses journaux.

<!-- section: multi-account-provisioning | objectives: 3.1.4 -->
## Provisionner et partager entre comptes et Régions

**CloudFormation StackSets** déploie un même modèle sous forme d'instances de pile dans de nombreux comptes et Régions depuis un compte administrateur.

| Modèle d'autorisations | Mise en place | Usage type |
| --- | --- | --- |
| Autogéré (self-managed) | Créer `AWSCloudFormationStackSetAdministrationRole` dans le compte administrateur et `AWSCloudFormationStackSetExecutionRole` (nom exact, qui fait confiance à l'administrateur) dans chaque compte cible | Comptes hors d'une organisation |
| Géré par le service (service-managed) | Accès approuvé avec AWS Organizations ; StackSets crée les rôles ; exécution depuis le compte de gestion ou un administrateur délégué | Déployer dans des unités d'organisation, avec **déploiement automatique** dans les comptes ajoutés plus tard |

Options d'opération : **nombre maximal de comptes simultanés**, **tolérance aux échecs** (par Région, l'opération s'arrête au-delà), **simultanéité des Régions** (séquentielle dans l'ordre indiqué, par défaut, ou parallèle) et **conservation des piles** lors du retrait d'instances. Une mise à jour s'applique à toutes les instances de pile du StackSet.

**AWS Resource Access Manager (AWS RAM)** partage des ressources existantes au lieu de les dupliquer : sous-réseaux (partage de VPC), passerelles de transit, règles Route 53 Resolver, listes de préfixes, groupes IPAM, clusters Aurora pour le clonage intercomptes, entre autres. Partagez avec des comptes, des unités d'organisation, toute l'organisation ou, pour certains types, des rôles et utilisateurs IAM. Avec le **partage avec AWS Organizations activé**, les comptes de l'organisation n'ont pas d'invitation à accepter ; les comptes extérieurs doivent l'accepter. Le propriétaire conserve la propriété ; l'autorisation gérée du partage est le maximum que les politiques IAM du consommateur peuvent accorder. Dans un VPC partagé, les participants (même organisation) créent et possèdent leurs propres ressources dans les sous-réseaux partagés mais ne peuvent pas modifier les sous-réseaux du propriétaire.

> **Conseil d'examen.** « Déployer les mêmes règles AWS Config et rôles IAM dans tous les comptes existants et futurs d'une unité d'organisation » correspond à un StackSet géré par le service avec déploiement automatique. « Permettre à dix comptes de lancer des instances dans les sous-réseaux de l'équipe réseau » correspond au partage de VPC par AWS RAM, pas à l'appairage de VPC (VPC peering).

<!-- section: deployment-strategies | objectives: 3.1.5 -->
## Stratégies de déploiement et services qui les mettent en œuvre

| Stratégie | Comportement | Mise en œuvre AWS |
| --- | --- | --- |
| Tout en une fois (sur place) | Toutes les cibles mises à jour ensemble ; la plus rapide, risque d'interruption | Run Command sur toute la flotte, mise à jour CloudFormation sans politique de mise à jour |
| Propagée (rolling) | Remplacement par lots pendant que le reste sert | **Actualisation d'instance** (instance refresh) Auto Scaling ; `AutoScalingRollingUpdate` de CloudFormation ; mise à jour propagée ECS (`minimumHealthyPercent`, `maximumPercent`) |
| Immuable ou par remplacement | Nouvelles instances ou nouveau groupe, l'ancien conservé jusqu'à ce que le nouveau soit sain | `AutoScalingReplacingUpdate` de CloudFormation (`WillReplace`) ; nouveau groupe Auto Scaling derrière le même groupe cible |
| Bleu/vert (blue/green) | Deux environnements, trafic basculé d'un coup, retour arrière instantané | Groupes cibles pondérés de l'ALB (poids de 0 à 999), enregistrements pondérés Route 53, bleu/vert natif d'ECS avec temps d'observation (bake time) |
| Canari et linéaire (canary, linear) | Une petite part du trafic d'abord, puis le reste d'un coup ou par paliers | Alias pondérés Lambda (deux versions publiées, pas `$LATEST`), poids de l'ALB, canari ou linéaire d'ECS |

Valeurs par défaut de l'**actualisation d'instance** : pourcentage minimal d'instances saines de 90 % (maximum 100 %) sans politique de maintenance des instances ; préchauffage = préchauffage d'instance par défaut, sinon période de grâce de la vérification de l'état ; ignorer les instances correspondantes (skip matching) désactivé avec la CLI, activé dans la console ; points de contrôle, temps d'observation, **alarmes CloudWatch** et **restauration automatique** désactivés tant que vous ne les définissez pas. Notez que les mises à jour propagées de CloudFormation ne respectent pas la politique de maintenance des instances du groupe.

Les déploiements propagés ECS s'arrêtent et reviennent en arrière automatiquement grâce au **disjoncteur de déploiement** (deployment circuit breaker : les tâches ne démarrent pas) ou aux **alarmes CloudWatch** (métriques applicatives). Les images peuvent être **précuites** (prebaking, AMI de référence : lancement et mise à l'échelle plus rapides) ou **amorcées** (bootstrapping) par les données utilisateur (plus simple, lancements plus lents) ; combinez les deux en intégrant les logiciels stables à l'image et en amorçant les paramètres d'environnement.

> **Piège d'examen.** Un alias pondéré ou un groupe cible pondéré ne revient pas en arrière tout seul. Une restauration automatique exige un mécanisme qui surveille des alarmes : actualisation d'instance avec restauration automatique, disjoncteur ou alarmes ECS, ou déclencheurs de restauration CloudFormation.

<!-- section: third-party-tools | objectives: 3.1.6 -->
## Utiliser Terraform et Git avec AWS

**Terraform** sur AWS stocke son état dans un **backend S3** :

- Verrouillez l'état avec le verrouillage natif de S3 (`use_lockfile = true`, Terraform 1.11 ou ultérieur) ; le verrouillage par DynamoDB est obsolète. Une seconde exécution échoue avec `Error acquiring the state lock` tant que l'objet `.tflock` existe.
- Activez la gestion des versions S3 sur le compartiment d'état pour revenir à un état antérieur, chiffrez avec SSE-KMS (`encrypt = true` avec `kms_key_id`), refusez les requêtes sans TLS et journalisez les accès aux objets avec les événements de données CloudTrail.
- Utilisez un backend distinct (idéalement un compte distinct) par environnement, un état de production en lecture seule pour la plupart des utilisateurs et des écritures réservées au rôle du pipeline.
- **AWS Service Catalog** peut publier des configurations Terraform comme produits (types **External**, pour Terraform Community Edition, et **Terraform Cloud**) afin que les utilisateurs lancent des piles approuvées par un rôle de lancement, sans autorisations directes.

**Git** pilote les changements d'infrastructure :

- **AWS CodeConnections** (anciennement AWS CodeStar Connections) relie CodePipeline, CodeBuild et d'autres services à GitHub, GitLab, Bitbucket et d'autres fournisseurs par l'ARN d'une connexion, sans jeton stocké.
- La **synchronisation Git de CloudFormation** (Git sync) surveille un modèle et un fichier de déploiement de pile (paramètres, balises) dans un référentiel GitHub, GitHub Enterprise, GitLab, GitLab autogéré ou Bitbucket et met à jour la pile à chaque commit, en commentant au besoin les changements proposés dans les demandes de tirage (pull requests).
- AWS CodeCommit est de nouveau ouvert aux nouveaux clients et héberge des référentiels Git privés dans votre compte.

> **Conseil d'examen.** « Deux ingénieurs ont corrompu l'état Terraform en appliquant en même temps » se corrige par le verrouillage de l'état sur le backend S3. « Déployer automatiquement la pile à chaque modification du modèle dans le référentiel GitHub, avec le moins de charge opérationnelle » correspond à la synchronisation Git de CloudFormation.

<!-- section: key-points -->
## Points clés

- Les AMI sont régionales : copiez-les pour les utiliser dans d'autres Régions, ne partagez une AMI chiffrée qu'avec une clé gérée par le client, rendez obsolète puis désinscrivez, protégez par la protection contre la désinscription.
- Image Builder : composants, recettes, configurations d'infrastructure et de distribution, pipelines qui ne construisent par défaut que lors de mises à jour des dépendances, politiques de cycle de vie ; règles de cycle de vie ECR, immuabilité des balises, analyse Inspector, réplication.
- CloudFormation : jeux de modifications, détection de dérive, politiques de pile, DeletionPolicy, CreationPolicy avec cfn-signal, UpdatePolicy ; constructions CDK L1 à L3, amorçage par compte et Région, synth, diff, deploy.
- Lisez le premier événement en échec ; `ROLLBACK_COMPLETE` impose de supprimer et recréer, `UPDATE_ROLLBACK_FAILED` de poursuivre la restauration ; passez les capacités IAM ; cinq adresses IP réservées par sous-réseau, ajoutez un CIDR secondaire pour grandir.
- StackSets : rôles autogérés aux noms exacts ou modèle géré par le service avec déploiement automatique dans les unités d'organisation ; AWS RAM partage sous-réseaux et autres ressources sans invitation au sein d'une organisation.
- Propagé (actualisation d'instance, UpdatePolicy), immuable, bleu/vert, canari et linéaire ; la restauration automatique exige des alarmes ou un disjoncteur.
- Terraform : backend S3 avec verrouillage natif, gestion des versions et chiffrement ; produits Terraform de Service Catalog ; CodeConnections et synchronisation Git de CloudFormation pour les déploiements pilotés par Git.
