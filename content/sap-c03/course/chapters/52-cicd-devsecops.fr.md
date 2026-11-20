Au niveau professionnel, une question sur les pipelines demande rarement s'il faut automatiser. Elle demande comment un seul pipeline, dans un compte d'outillage, génère un artefact une seule fois, l'analyse et le signe, le promeut à travers des comptes de test et de production dans plusieurs Régions, le soumet à des contrôles de qualité (y compris sur les sorties d'IA) et le restaure (rollback) de lui-même quand une métrique se dégrade. Ce chapitre couvre la conception avec CodePipeline, CodeBuild et CodeDeploy, l'analyse de sécurité et la signature des artefacts, la livraison entre comptes et entre Régions, l'évaluation des applications d'IA générative et les stratégies de déploiement avec restauration automatique.

<!-- section: pipeline-orchestration | objectives: 5.2.1 -->
## Orchestrer les pipelines de génération et de déploiement

**AWS CodePipeline** modélise une mise en production sous forme d'étapes (stages) qui contiennent des actions (source, génération, test, déploiement, approbation, appel). Les actions de même `runOrder` s'exécutent en parallèle ; les étapes s'exécutent en séquence. Les nouveaux pipelines doivent utiliser le **type V2**, qui porte toutes les fonctionnalités récentes :

| Exigence | Fonctionnalité V2 |
| --- | --- |
| Démarrer uniquement pour une balise Git, un modèle de branche, une pull request ou des modifications sous certains chemins de fichiers | Déclencheurs avec filtres sur l'action source |
| Passer une valeur (environnement cible, balise d'image) au démarrage d'une exécution | Variables au niveau du pipeline (les variables au niveau de l'action existent en V1 et V2) |
| Conserver chaque commit, dans l'ordre, au lieu de laisser les exécutions récentes dépasser celles qui attendent | Mode d'exécution `QUEUED` (le mode par défaut `SUPERSEDED` laisse une exécution plus récente remplacer une exécution en attente) |
| Laisser les branches de fonctionnalité déployer dans leurs propres environnements sans s'attendre | Mode d'exécution `PARALLEL` |
| Revenir au dernier artefact réussi d'une étape | Restauration d'étape (manuelle, ou automatique en cas d'échec de l'étape) |
| Bloquer, ignorer ou restaurer une étape selon une alarme, une fenêtre horaire ou une variable | Conditions d'étape : entrée (`beforeEntry` : échec ou saut), en cas d'échec (restauration), en cas de succès (restauration ou échec), avec des règles comme `CloudWatchAlarm`, `DeploymentWindow`, `LambdaInvoke`, `VariableCheck` |
| Exécuter quelques commandes shell sans projet CodeBuild distinct | L'action Commands |
| Relancer seule une étape instable | Nouvelle tentative automatique en cas d'échec d'étape (non combinable avec une condition en cas d'échec) |

Les autres services :

- **Source** : AWS CodeCommit (de nouveau ouvert aux nouveaux clients depuis le 25 novembre 2025), GitHub, GitLab ou Bitbucket via **AWS CodeConnections**, un objet S3 ou une transmission (push) d'image ECR.
- **AWS CodeBuild** exécute les commandes de génération et de test d'un `buildspec.yml` dans des conteneurs gérés. Il peut s'exécuter dans un VPC pour atteindre des bases de données de test privées, lire les secrets dans Secrets Manager ou Parameter Store à l'exécution (jamais dans le code source), publier des rapports de tests et de couverture, et transmettre des images à ECR.
- **AWS CodeDeploy** déploie sur des instances EC2 et sur site (agent et `appspec.yml` avec hooks de cycle de vie), sur Lambda (déplacement du trafic d'alias) et sur ECS (bleu/vert avec écouteurs de test et de production).
- Les actions d'**approbation manuelle** mettent le pipeline en pause (elles expirent au bout de sept jours) et notifient une rubrique SNS.

```yaml
version: 0.2
env:
  secrets-manager:
    REGISTRY_TOKEN: prod/build/registry:token
phases:
  pre_build:
    commands:
      - aws ecr get-login-password | docker login --username AWS --password-stdin "$REPO_URI"
  build:
    commands:
      - docker build -t "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION" .
      - docker push "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"
  post_build:
    commands:
      - printf '{"ImageURI":"%s"}' "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION" > imageDetail.json
artifacts:
  files:
    - imageDetail.json
    - appspec.yaml
    - taskdef.json
```

> **Piège d'examen.** « Les déploiements ne doivent se produire que sur les balises de version `v*` » ou « chaque branche de développeur déploie sa propre pile en parallèle » exige un pipeline V2 (filtres de déclencheur, mode `PARALLEL`). Avec un pipeline V1, la réponse demanderait une logique supplémentaire Lambda ou EventBridge, donc plus de charge opérationnelle. Notez aussi que la restauration d'étape n'est pas disponible en mode `PARALLEL`.

<!-- section: security-scanning-signing | objectives: 5.2.2 -->
## Analyse de sécurité et signature des artefacts dans le pipeline

Le DevSecOps déplace les contrôles de sécurité dans le pipeline pour qu'un artefact vulnérable ou altéré n'atteigne jamais un compte qui exécute des charges de travail.

**Analyse des vulnérabilités avec Amazon Inspector**

| Point d'analyse | Mécanisme | Ce qui est détecté |
| --- | --- | --- |
| Référentiel source | Inspector code security, connecté à GitHub ou GitLab (y compris les instances autogérées via CodeConnections ou un VPC) | Code propriétaire (SAST), dépendances tierces, infrastructure en tant que code ; peut ouvrir des pull requests de correction |
| Contrôle dans le pipeline | Action CodePipeline `InspectorScan`, mode `SourceCodeScan` ou `ECRImageScan`, avec `CriticalThreshold`, `HighThreshold`, `MediumThreshold`, `LowThreshold` | Fait échouer l'action quand les résultats dépassent le seuil ; produit une SBOM et la variable `HighestScannedSeverity` |
| N'importe quel outil de CI | Inspector SBOM Generator (SBOM CycloneDX) et l'API Inspector Scan ; plug-ins prêts pour GitHub Actions, Jenkins et TeamCity | Vulnérabilités avant la transmission de l'image |
| Registre | Analyse améliorée ECR par Inspector, à la transmission ou continue | Paquets du système d'exploitation et des langages de programmation ; le mode continu réanalyse quand une nouvelle CVE est publiée |
| Fonctions en service | Analyse Lambda d'Inspector | Paquets et code vulnérables dans les fonctions déployées |

L'**analyse de base** ECR est facturée par ECR et analyse à la transmission ou manuellement. L'**analyse améliorée** se configure au niveau du registre, est facturée par Inspector et envoie les résultats à Security Hub et EventBridge (pas l'analyse de base). L'analyse continue couvre une image pendant une durée limitée après sa transmission ou sa dernière utilisation (7 jours par défaut pour une analyse ECR activée depuis le 15 octobre 2026 ; configurable). Inspector associe aussi les images aux tâches ECS et aux pods EKS qui les exécutent, ce qui aide à prioriser.

**Signer les artefacts avec AWS Signer**

- **Signature gérée ECR** (recommandée) : une configuration de signature du registre contient jusqu'à 10 règles, chacune associant un profil de signature Signer à des filtres de référentiels. ECR signe chaque image correspondante à la transmission, avec l'identité de l'entité qui transmet, laquelle a besoin de `signer:SignPayload` sur le profil. Le profil doit être dans la Région du registre ; un compte central peut posséder des profils utilisés par d'autres comptes.
- **Signature manuelle** : la CLI Notation avec le plug-in AWS Signer signe côté client avant la transmission. La vérification au déploiement utilise aussi des outils basés sur Notation (par exemple un contrôleur d'admission sur EKS).
- **Signature de code Lambda** : une configuration de signature de code liste les profils de signature autorisés et une politique pour les artefacts non approuvés, `Warn` (par défaut : déploie et émet la métrique `SignatureValidationErrors`) ou `Enforce` (bloque). Lambda vérifie l'intégrité, l'expiration, la non-concordance et la révocation des paquets .zip et des couches au moment du déploiement ; le code déjà en service n'est pas revérifié.

```bash
aws ecr put-signing-configuration \
  --signing-configuration '{"rules":[{"signingProfileArn":"arn:aws:signer:eu-west-1:111122223333:/signing-profiles/release","repositoryFilters":[{"filter":"prod-*","filterType":"WILDCARD_MATCH"}]}]}'
aws lambda create-code-signing-config \
  --allowed-publishers SigningProfileVersionArns=arn:aws:signer:eu-west-1:111122223333:/signing-profiles/lambda/v1 \
  --code-signing-policies UntrustedArtifactOnDeployment=Enforce
```

> **Piège d'examen.** « Bloquer le déploiement de toute image comportant des vulnérabilités critiques » est un contrôle dans le pipeline (seuil `InspectorScan` ou analyse de la SBOM avant la transmission). L'analyse ECR continue ne signale les résultats qu'une fois l'image dans le registre ; elle n'arrête pas un déploiement à elle seule.

<!-- section: cross-account-pipelines | objectives: 5.2.3 -->
## Pipelines multicomptes et multi-Régions

L'organisation habituelle : un **compte d'outillage (de déploiement)** possède le pipeline, les artefacts et la génération ; les comptes de charge de travail (test, préproduction, production) possèdent les ressources et exposent un **rôle entre comptes** que le pipeline endosse. Aucune information d'identification à long terme n'existe nulle part.

| Élément | Où | Exigence |
| --- | --- | --- |
| Compartiment d'artefacts | Compte d'outillage | Politique de compartiment qui permet aux comptes cibles de lire les artefacts et d'écrire les artefacts de sortie |
| Clé de chiffrement | Compte d'outillage, Région du pipeline | **Clé KMS gérée par le client** ; la politique de clé autorise les comptes cibles ; référencez-la par ID ou ARN de clé (les alias ne se résolvent pas entre comptes). La clé gérée par AWS ne peut pas être partagée |
| Rôle entre comptes | Chaque compte cible | Politique d'approbation limitée au rôle de service du pipeline ; autorisations pour l'action de déploiement (CloudFormation, CodeDeploy, ECS) et pour le compartiment d'artefacts et la clé |
| Rôle de service du pipeline | Compte d'outillage | `sts:AssumeRole` sur chaque rôle entre comptes |
| Action | Définition du pipeline | `roleArn` du rôle du compte cible ; créée avec la CLI, un SDK ou CloudFormation, pas la console |

Pour une **action de déploiement CloudFormation**, le rôle entre comptes transmet un second rôle, le rôle d'exécution CloudFormation du compte cible, qui crée réellement les ressources.

Les **actions entre Régions** ajoutent une `region` à l'action et une table `artifactStores` avec un compartiment par Région. Chaque compartiment et sa clé se trouvent dans la Région de l'action et dans le compte du pipeline. CodePipeline y copie les artefacts d'entrée de l'action. Les actions source, tierces et personnalisées ne peuvent pas être entre Régions.

```json
{
  "pipeline": {
    "name": "orders-release",
    "pipelineType": "V2",
    "artifactStores": {
      "eu-west-1": { "type": "S3", "location": "tooling-artifacts-eu-west-1", "encryptionKey": { "id": "arn:aws:kms:eu-west-1:111122223333:key/1111aaaa-22bb-33cc-44dd-555566667777", "type": "KMS" } },
      "us-east-1": { "type": "S3", "location": "tooling-artifacts-us-east-1", "encryptionKey": { "id": "arn:aws:kms:us-east-1:111122223333:key/8888eeee-99ff-00aa-11bb-222233334444", "type": "KMS" } }
    },
    "stages": [
      {
        "name": "DeployProd",
        "actions": [
          {
            "name": "DeployUsEast1",
            "region": "us-east-1",
            "roleArn": "arn:aws:iam::444455556666:role/PipelineDeployRole",
            "actionTypeId": { "category": "Deploy", "owner": "AWS", "provider": "CloudFormation", "version": "1" },
            "configuration": {
              "ActionMode": "CREATE_UPDATE",
              "StackName": "orders",
              "TemplatePath": "BuildOutput::template.yaml",
              "RoleArn": "arn:aws:iam::444455556666:role/CloudFormationExecutionRole"
            },
            "inputArtifacts": [ { "name": "BuildOutput" } ]
          }
        ]
      }
    ]
  }
}
```

**Promotion des artefacts** : générez une seule fois, puis promouvez le même artefact immuable. Référencez les images de conteneur par condensat (digest) ou par balises immuables, répliquez-les avec les règles de réplication ECR entre comptes et entre Régions (seules les images transmises après la création de la règle sont répliquées), et passez d'un environnement au suivant uniquement après les tests, une action d'approbation ou une condition d'étape basée sur une alarme. Régénérer pour chaque environnement détruit la garantie que la production exécute ce qui a été testé. Pour l'infrastructure de nombreux comptes, le pipeline peut appeler les actions CloudFormation StackSets ou CDK Pipelines (comptes cibles amorcés avec `cdk bootstrap --trust` pour le compte d'outillage).

> **Conseil d'examen.** « L'action de déploiement dans le compte de production échoue avec un accès refusé sur l'artefact » signifie presque toujours que les artefacts sont chiffrés avec la clé gérée par AWS par défaut, ou que la politique de la clé gérée par le client n'inclut pas le compte de production. Passez le magasin d'artefacts sur une clé gérée par le client et autorisez le rôle cible.

<!-- section: ai-evaluation | objectives: 5.2.4 -->
## Évaluer les applications d'IA avant la mise en production

Les invites, les versions de modèle et les bases de connaissances modifient le comportement autant que le code : ils méritent un contrôle de qualité. **Amazon Bedrock Evaluations** propose :

| Type de tâche | Mode de notation | À utiliser quand |
| --- | --- | --- |
| Automatique (programmatique) | Jeux de données d'invites intégrés ou personnalisés ; types de tâches génération de texte générale, résumé, questions-réponses, classification ; métriques précision (accuracy), robustesse, toxicité | Comparaison rapide et peu coûteuse de modèles sur des tâches standard |
| Modèle juge (LLM-as-a-judge) | Un modèle juge note chaque réponse et explique pourquoi : métriques de qualité (`Builtin.Correctness`, `Builtin.Completeness`, `Builtin.Faithfulness`, `Builtin.Helpfulness`, `Builtin.Relevance`...) et d'IA responsable (`Builtin.Harmfulness`, `Builtin.Stereotyping`, `Builtin.Refusal`) ; métriques personnalisées possibles | Jugement de qualité proche de l'humain, à grande échelle |
| Évaluation RAG | Récupération seule (`Builtin.ContextRelevance`, `Builtin.ContextCoverage`) ou récupération et génération (exactitude, fidélité, précision et couverture des citations...) | Vérifier une base de connaissances Bedrock ou une autre source RAG |
| Évaluation humaine | Votre propre équipe de travail (jusqu'à 50 évaluateurs par équipe) note les réponses | Critères subjectifs, ton de la marque, domaines d'expertise |

Vous pouvez **apporter vos propres réponses d'inférence** : le jeu de données contient déjà les sorties d'un modèle ou d'un système RAG hébergé hors de Bedrock, et Bedrock se contente de les noter. Les rapports sont écrits dans S3.

Pour les agents, **Amazon Bedrock AgentCore Evaluations** note les traces des agents (OpenTelemetry) avec des évaluateurs intégrés comme `Builtin.Helpfulness` ou personnalisés : **à la demande** (traces choisies, par exemple pendant une génération), **par lots** (de nombreuses sessions, références et tests de non-régression après un changement d'invite ou de modèle) et **en ligne** (un échantillon des sessions réelles, pour surveiller la production).

Un contrôle dans le pipeline : une action CodeBuild ou Lambda lance la tâche d'évaluation sur un jeu de données de référence fixe, attend, lit le rapport et fait échouer l'étape si un score passe sous le seuil convenu avec le métier. Les garde-fous (guardrails) sont un autre contrôle : ils filtrent chaque requête et réponse à l'exécution ; les évaluations mesurent la qualité avant la mise en production.

> **Piège d'examen.** SageMaker Clarify et SageMaker Model Monitor ne sont plus ouverts aux nouveaux clients. Pour la qualité d'un modèle de fondation ou d'un RAG, la réponse est Bedrock Evaluations (ou AgentCore Evaluations pour les agents), pas une tâche de traitement Clarify.

<!-- section: deployment-strategies | objectives: 5.2.5 -->
## Stratégies de déploiement avec restauration

| Stratégie | Fonctionnement | Restauration | Compromis |
| --- | --- | --- | --- |
| Tout en une fois / sur place | Remplacer la version sur toutes les cibles en même temps | Redéployer la version précédente | Le plus rapide, risque d'interruption totale |
| Propagé (rolling) | Remplacer les cibles par lots | Redéployer ; mélange partiel des versions en attendant | Pas de capacité supplémentaire ; capacité réduite pendant la mise à jour sauf lot supplémentaire |
| Immuable | Nouvelles instances avec la nouvelle version, basculées après les vérifications de l'état | Résilier les nouvelles instances | Capacité supplémentaire pendant la durée |
| Bleu/vert | Nouvel environnement complet, trafic basculé d'un coup après les tests | Rebasculer le trafic (rapide tant que le bleu existe) | Double temporairement les ressources |
| Canary | Un faible pourcentage du trafic d'abord, puis le reste après un temps d'observation (bake time) | Ramener le trafic vers l'ancienne version | Validation par de vrais utilisateurs avec un rayon d'impact réduit |
| Linéaire | Incréments égaux à intervalles fixes | Ramener le trafic | Plus lent, progressif |

Plateforme par plateforme :

- **EC2 avec CodeDeploy** : sur place avec `CodeDeployDefault.OneAtATime` (par défaut), `HalfAtATime` ou `AllAtOnce`, ou bleu/vert qui copie le groupe Auto Scaling et réoriente l'équilibreur de charge.
- **Lambda** : un alias répartit le poids entre versions ; configurations CodeDeploy telles que `CodeDeployDefault.LambdaCanary10Percent5Minutes` ou `LambdaLinear10PercentEvery1Minute`, avec des fonctions de hook avant et après le trafic et des alarmes CloudWatch qui déclenchent la restauration automatique.
- **Amazon ECS** : mise à jour propagée avec le **disjoncteur de déploiement** (seuil d'échec `BOUNDED_PERCENT` par défaut, 50 % du nombre souhaité borné entre 3 et 200 ; `rollback=true` revient au dernier déploiement `COMPLETED`) et des alarmes CloudWatch dans la configuration de déploiement. ECS propose aussi des stratégies intégrées **bleu/vert** (hooks de cycle de vie Lambda ou pause, temps d'observation pendant lequel le bleu est conservé pour une restauration instantanée), **LINEAR** et **CANARY** avec un ALB ou un NLB et deux groupes cibles. Les configurations ECS de CodeDeploy (`ECSCanary10Percent5Minutes`, `ECSLinear10PercentEvery1Minutes`) restent disponibles ; avec un NLB, CodeDeploy ne prend en charge que `ECSAllAtOnce`.
- **API Gateway** : une version canary sur une étape (stage) envoie un pourcentage des requêtes au nouveau déploiement, qui est ensuite promu ou supprimé.
- **CloudFormation** : les déclencheurs de restauration surveillent jusqu'à 5 alarmes CloudWatch (ou alarmes composites) pendant la mise à jour et pendant une période de surveillance de 0 à 180 minutes, et restaurent toute la mise à jour de la pile si l'une passe à `ALARM`.
- **CodePipeline V2** : la restauration d'étape ramène l'étape à la dernière révision source réussie, automatiquement en cas d'échec ou via une condition en cas de succès alimentée par une alarme.

```yaml
OrdersFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: app.handler
    Runtime: python3.13
    CodeUri: src/
    AutoPublishAlias: live
    DeploymentPreference:
      Type: Canary10Percent5Minutes
      Alarms:
        - !Ref OrdersErrorsAlarm
        - !Ref OrdersLatencyP99Alarm
      Hooks:
        PreTraffic: !Ref PreTrafficCheckFunction
```

> **Conseil d'examen.** « Envoyer 10 % des utilisateurs vers la nouvelle version et ramener automatiquement tout le monde sur l'ancienne si les erreurs augmentent, avec le MOINS d'effort » désigne une configuration canary avec des alarmes CloudWatch associées (CodeDeploy, `DeploymentPreference` SAM ou canary intégré d'ECS), pas un enregistrement pondéré Route 53 modifié par un script.

<!-- section: key-points -->
## Points clés

- Utilisez CodePipeline V2 : filtres de déclencheur sur balises, branches et chemins, variables de pipeline, modes `QUEUED` et `PARALLEL`, conditions d'étape, restauration d'étape et nouvelle tentative automatique.
- Analysez dans le pipeline (seuils `InspectorScan`, SBOM Generator et API Scan), analysez le registre en continu (analyse améliorée ECR), signez avec AWS Signer (signature gérée ECR, signature de code Lambda en `Enforce`).
- Les pipelines entre comptes exigent une clé KMS gérée par le client, une politique de compartiment, un rôle dans le compte cible et `roleArn` sur l'action ; les actions entre Régions exigent un magasin d'artefacts par Région.
- Générez une fois, promouvez le même condensat ; réplication ECR entre comptes et Régions ; approbations et conditions d'alarme entre les étapes.
- Contrôlez les versions d'IA avec Bedrock Evaluations (programmatique, modèle juge, RAG, humaine) et AgentCore Evaluations pour les agents.
- Canary, linéaire et bleu/vert déplacent le trafic avec une restauration pilotée par alarmes ; le disjoncteur ECS et les déclencheurs de restauration CloudFormation restaurent automatiquement.
