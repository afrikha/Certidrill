La sécurité du calcul est une chaîne : partir d'une image renforcée, donner à la charge de travail uniquement le rôle dont elle a besoin, l'analyser en continu à la recherche de vulnérabilités connues et surveiller son exécution, la corriger automatiquement et prouver qu'elle l'est, l'administrer sans port ouvert ni clé de longue durée, détecter le code vulnérable avant sa livraison et, pour les applications d'IA générative, filtrer ce qui entre dans le modèle et ce qui en sort. Plusieurs services cités par le guide ont changé de statut en 2025 et 2026 ; ce chapitre donne la réponse actuelle et indique où les exemples du guide ne s'appliquent plus aux nouveaux clients.

<!-- section: hardened-images | objectives: 3.2.1 -->
## AMI et images de conteneur renforcées

**EC2 Image Builder** automatise les images de référence (golden images) :

| Élément | Contenu |
| --- | --- |
| Recette d'image ou recette de conteneur | Image de base (AMI, ou image de conteneur venant d'ECR ou de Docker Hub) et **composants** ordonnés |
| Composants de génération | Mises à jour, agents (agent SSM, agent CloudWatch), renforcement comme les composants STIG gérés par Amazon (`STIG-Build-Linux-High`, `STIG-Build-Windows-Medium`... : les niveaux Low, Medium, High sont cumulatifs ; High est la valeur par défaut sous Linux) |
| Composants de test | Vérifications exécutées sur une instance lancée à partir de la nouvelle image ; l'image n'est distribuée que si tous les tests réussissent |
| Configuration de l'infrastructure | Type d'instance, sous-réseau, groupe de sécurité, profil d'instance utilisé pendant la génération, compartiment de journaux, rubrique SNS |
| Paramètres de distribution | Régions, comptes ou organisations et UO cibles, autorisations de lancement, clé KMS de l'AMI, mise à jour des modèles de lancement ; les images de conteneur vont dans ECR |
| Pipeline | Planification ou exécution manuelle, flux de travail `BUILD`, `TEST`, `DISTRIBUTION`, analyse des images avec Amazon Inspector |

Contenu du renforcement : supprimer les paquets et services inutiles, aucune information d'identification ni clé intégrée à l'image, agent SSM installé pour gérer l'instance sans SSH, agent CloudWatch pour les journaux, IMDSv2 obligatoire (propriété d'AMI `ImdsSupport` à `v2.0`), volumes EBS chiffrés. Sans Image Builder, les runbooks Automation `AWS-UpdateLinuxAmi` et `AWS-UpdateWindowsAmi` corrigent une AMI source et en créent une nouvelle.

**Imposer les images approuvées.**

- **Allowed AMIs** (paramètre de compte EC2 par Région, ou **politique déclarative** Organizations pour de nombreux comptes et Régions) : critères sur les fournisseurs d'images (`amazon`, `aws-marketplace`, `aws-backup-vault`, ID de comptes), les noms d'images, l'ancienneté, la dépréciation et les résultats d'analyse Inspector. Utilisez d'abord le **mode audit**, puis l'état **activé**, qui masque et bloque les AMI non conformes ; les AMI dont le compte est propriétaire restent toujours autorisées. La règle Config `ec2-instance-launched-with-allowed-ami` repère les instances existantes non conformes.
- Bloquez le partage public des AMI avec le paramètre de compte **blocage de l'accès public pour les AMI** (block public access for AMIs).

```json
{
  "ImageCriteria": [
    { "ImageProviders": ["444455556666"], "ImageNames": ["hardened-al2023-*"] },
    { "ImageProviders": ["amazon"], "CreationDateCondition": { "MaximumDaysSinceCreated": 90 } }
  ]
}
```

**Images de conteneur** : images de base minimales, utilisateur non root, aucun secret dans les couches, immuabilité des balises ECR, signature des images, analyse améliorée dans ECR avant déploiement, regénération à chaque mise à jour de l'image de base.

> **Piège d'examen.** Un modèle de lancement avec une AMI approuvée n'empêche personne de lancer une autre image. « Empêcher le lancement de toute instance à partir d'une AMI non approuvée dans toute l'organisation » désigne Allowed AMIs par une politique déclarative (ou des SCP sur `ec2:RunInstances`), pas une règle Config, qui ne fait que détecter.

<!-- section: compute-roles | objectives: 3.2.2 -->
## Profils d'instance, rôles de service et rôles d'exécution

| Charge de travail | Identité | Principal approuvé | Erreur typique |
| --- | --- | --- | --- |
| Instance EC2 | Profil d'instance contenant un rôle IAM ; informations d'identification fournies par IMDS | `ec2.amazonaws.com` | Stocker des clés d'accès sur l'instance |
| Tâche ECS | **Rôle de tâche** (task role) pour les appels de l'application ; **rôle d'exécution de tâche** (task execution role) pour l'agent (extraction depuis ECR, envoi des journaux, injection de secrets de Secrets Manager ou Parameter Store) | `ecs-tasks.amazonaws.com` | Donner les autorisations de l'application au rôle d'exécution |
| Fonction Lambda | **Rôle d'exécution** pour ce que le code appelle ; une **politique basée sur la ressource** distincte pour qui peut l'invoquer | `lambda.amazonaws.com` | Utiliser le rôle d'exécution pour autoriser les invocations |
| Pod EKS | Association EKS Pod Identity ou rôles IAM pour les comptes de service | `pods.eks.amazonaws.com` ou le fournisseur OIDC du cluster | Des pods qui héritent du rôle du nœud |
| Service AWS qui agit pour vous (CodeBuild, Image Builder, Automation) | Rôle de service que vous créez et transmettez | Le principal du service | Des rôles de service trop larges |
| Rôle lié à un service | Prédéfini par le service, autorisations non modifiables | Le service | Vouloir le restreindre par une politique en ligne |

Transmettre un rôle à un service exige `iam:PassRole` ; restreignez quels rôles et vers quel service :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::111122223333:role/workloads/web-*",
      "Condition": { "StringEquals": { "iam:PassedToService": "ec2.amazonaws.com" } }
    }
  ]
}
```

Protéger les informations d'identification des instances : imposer **IMDSv2** (`HttpTokens` à `required`, imposable avec la clé de condition `ec2:MetadataHttpTokens` et les valeurs par défaut au niveau du compte), garder la **limite de sauts** (hop limit) à 1 quand les conteneurs de l'hôte ne doivent pas atteindre le rôle de l'instance (2 est nécessaire quand des conteneurs l'utilisent légitimement), et restreindre l'endroit où ces informations d'identification peuvent servir par une SCP qui compare `aws:Ec2InstanceSourceVpc` à `aws:SourceVpc` (et `aws:Ec2InstanceSourcePrivateIPv4` à `aws:VpcSourceIp`), en excluant les appels `aws:ViaAWSService`. Cela répond au résultat GuardDuty `InstanceCredentialExfiltration`.

> **Piège d'examen.** Une fonction Lambda ne peut pas être invoquée par un autre compte grâce à son rôle d'exécution : l'autorisation d'invocation est la politique basée sur la ressource de la fonction. Et une tâche ECS qui ne peut ni extraire son image ni lire son secret injecté manque d'autorisations sur le rôle d'exécution de tâche, pas sur le rôle de tâche.

<!-- section: vuln-scanning | objectives: 3.2.3 -->
## Analyser les vulnérabilités du calcul et surveiller l'exécution

**Amazon Inspector** trouve en continu les **vulnérabilités connues**, réanalyse quand un logiciel change ou qu'une nouvelle CVE est publiée, et ferme les résultats quand la correction est détectée.

| Ressource | Comment Inspector analyse |
| --- | --- |
| EC2 | **Avec agent** par l'agent SSM (instance gérée par SSM, profil d'instance avec `AmazonSSMManagedInstanceCore` ; les sous-réseaux privés ont besoin de points de terminaison pour `inspector2-telemetry`, `s3`, `ssm`, `ssmmessages`) ; **sans agent** à partir d'instantanés EBS pour les instances non gérées ; le mode **hybride** combine les deux. Accessibilité réseau toutes les 12 heures. Inspection approfondie des paquets de langages sous Linux. Exclusion par la balise `InspectorEc2Exclusion` |
| Images ECR | **Analyse améliorée** (paquets du système et des langages) à l'envoi ou **en continu** ; l'analyse continue réanalyse pendant une durée définie selon les dates d'envoi et de dernière utilisation ; associe les images aux tâches ECS et aux pods EKS en cours d'exécution. L'analyse de base est facturée par ECR |
| Lambda | **Analyse standard** des dépendances des fonctions et des couches ; **analyse du code** personnalisé (exige l'analyse standard). Couvre les fonctions `$LATEST` invoquées ou mises à jour dans les 90 derniers jours ; les fonctions chiffrées avec des clés gérées par le client ne sont pas prises en charge |

Les résultats portent un **score Inspector** qui ajuste le CVSS à l'environnement (plus bas s'il n'existe aucun chemin réseau), partent vers EventBridge et Security Hub CSPM, et sont gérés pour l'organisation par un administrateur délégué.

**Amazon GuardDuty** surveille les **menaces actives** :

- **Runtime Monitoring** avec l'agent de sécurité GuardDuty pour EKS, ECS sur Fargate et EC2 (pas EKS sur Fargate) : exécution de processus, accès aux fichiers, lignes de commande, connexions réseau. L'agent est géré automatiquement ou manuellement (automatiquement seulement pour Fargate).
- **Malware Protection for EC2** : analyses lancées par GuardDuty sur les volumes EBS attachés quand un résultat évoque un logiciel malveillant, plus des analyses à la demande ; les instantanés ne sont conservés que si un logiciel malveillant est trouvé.
- **Malware Protection for S3** : analyse les nouveaux objets des compartiments choisis, peut fonctionner sans activer GuardDuty et peut baliser les objets avec `GuardDutyMalwareScanStatus`, afin qu'une politique de compartiment refuse la lecture des objets balisés `THREATS_FOUND`.

> **Conseil d'examen.** Inspector répond à « quelles charges de travail ont des CVE connues ? » ; GuardDuty Runtime Monitoring répond à « quelque chose de malveillant s'exécute-t-il en ce moment ? ». Une question sur des conteneurs EKS avec AWS Fargate ne peut pas utiliser GuardDuty Runtime Monitoring.

<!-- section: patching | objectives: 3.2.4 -->
## Correctifs automatisés avec validation continue

**Systems Manager Patch Manager** :

- Les **politiques de correctifs** (patch policies) configurées avec Quick Setup sont la méthode recommandée : une politique pour toute l'organisation, des UO, des comptes et des Régions, avec des planifications distinctes pour **Scan** et **Install**.
- Les **références de correctifs** (patch baselines) définissent la conformité : règles d'approbation automatique par classification et gravité avec un délai en jours, listes explicites de correctifs approuvés et rejetés, un niveau de conformité. AWS recommande des références personnalisées plutôt que les références prédéfinies.
- Autres méthodes d'exécution : Host Management (analyse seule, référence par défaut), fenêtres de maintenance qui exécutent `AWS-RunPatchBaseline` avec `Operation` à `Scan` ou `Install`, et **Patch now** pour une exécution à la demande.
- Les données de conformité sont un instantané de la dernière opération (vérifiez l'heure de capture) ; elles alimentent Security Hub CSPM et la règle Config `ec2-managedinstance-patch-compliance-status-check`, et s'exportent vers S3.
- Limites : AWS ne teste pas les correctifs, et Patch Manager n'effectue pas de mises à niveau majeures du système d'exploitation.

```bash
aws ssm create-patch-baseline \
  --name "rhel9-security-fast" \
  --operating-system REDHAT_ENTERPRISE_LINUX \
  --approval-rules "PatchRules=[{PatchFilterGroup={PatchFilters=[{Key=CLASSIFICATION,Values=[Security]},{Key=SEVERITY,Values=[Critical,Important]}]},ApproveAfterDays=3,ComplianceLevel=HIGH}]"
aws ssm send-command --document-name "AWS-RunPatchBaseline" \
  --targets "Key=tag:patch-wave,Values=wave-1" \
  --parameters '{"Operation":["Install"],"RebootOption":["RebootIfNeeded"]}'
```

**Validation continue** : Amazon Inspector réanalyse après chaque changement de paquets et ferme les résultats corrigés, ce qui prouve que le correctif a fonctionné ; une règle EventBridge sur les nouveaux résultats Inspector critiques peut lancer une opération Patch now ou un runbook Automation. Pour les parcs immuables, regénérez l'AMI avec Image Builder et déployez-la par une **actualisation d'instances** (instance refresh) du groupe Auto Scaling au lieu de corriger sur place ; pour les conteneurs, regénérez les images et redéployez ; pour Lambda, mettez à jour les dépendances et appuyez-vous sur les contrôles de gestion de l'environnement d'exécution.

> **Piège d'examen.** La conformité de Patch Manager indique quels correctifs approuvés sont installés selon votre référence ; elle ne prouve pas l'absence de vulnérabilités. « Valider en continu que les instances corrigées n'ont plus la CVE » désigne Inspector.

<!-- section: admin-access | objectives: 3.2.5 -->
## Accès d'administration sécurisé

| Méthode | Exigence réseau | Authentification et audit |
| --- | --- | --- |
| **Session Manager** | Aucun port entrant, aucun bastion, aucune IP publique : l'agent SSM ouvre des connexions HTTPS sortantes (443) vers `ssm`, `ssmmessages` et `ec2messages`, ou vers des points de terminaison VPC d'interface | IAM (`ssm:StartSession`, conditions sur les balises de ressources) ; journaux de session vers S3 et CloudWatch Logs, données de session chiffrées avec une clé KMS, utilisateurs Run As ; redirection de port et SSH par `AWS-StartSSHSession` |
| **EC2 Instance Connect** | IP publique, ou connectivité privée vers l'instance | IAM `ec2-instance-connect:SendSSHPublicKey` envoie une clé publique à usage unique qui reste dans les métadonnées de l'instance pendant **60 secondes** |
| **EC2 Instance Connect Endpoint** | Instances dans des sous-réseaux privés, sans IP publique, sans bastion, sans passerelle Internet ; SSH ou RDP | IAM `ec2-instance-connect:OpenTunnel` (avec une condition `maxTunnelDuration`) ; le groupe de sécurité de l'instance doit autoriser le point de terminaison |
| Hôte bastion | SSH ou RDP entrant depuis quelque part | Des clés à gérer et à renouveler ; à éviter dans les nouvelles conceptions |

Versions de l'agent SSM selon les fonctionnalités de Session Manager : 2.3.539.0 ou ultérieure pour le chiffrement KMS des données de session, 3.0.222.0 ou ultérieure pour la redirection de port et les sessions SSH, 3.0.284.0 ou ultérieure pour la diffusion vers CloudWatch Logs.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:StartSession",
      "Resource": [
        "arn:aws:ec2:eu-west-1:111122223333:instance/*",
        "arn:aws:ssm:eu-west-1:111122223333:document/SSM-SessionManagerRunShell"
      ],
      "Condition": { "StringEquals": { "ssm:resourceTag/team": "${aws:PrincipalTag/team}" } }
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:TerminateSession", "ssm:ResumeSession"],
      "Resource": "arn:aws:ssm:*:*:session/${aws:userid}-*"
    }
  ]
}
```

> **Piège d'examen.** « Aucun port entrant, aucune clé SSH, chaque commande journalisée » désigne Session Manager, pas EC2 Instance Connect : Instance Connect utilise toujours SSH sur le port 22 et rend seulement la clé éphémère. Une session EC2 Instance Connect ne se termine pas quand les informations d'identification IAM expirent.

<!-- section: pipeline-security | objectives: 3.2.6 -->
## Outils de sécurité dans le pipeline

**Le statut des services que cachent les exemples du guide** : **Amazon CodeGuru Security a été arrêté le 20 novembre 2025**. **Amazon Q Developer** a fermé les nouvelles inscriptions le 15 mai 2026, ses plug-ins d'IDE arrivent en fin de support le 30 avril 2027, et AWS désigne **Kiro** comme successeur pour l'usage dans l'IDE. Pour un nouveau pipeline, les analyseurs natifs d'AWS se trouvent dans **Amazon Inspector**.

| Étape | Contrôle |
| --- | --- |
| Dépôt de code source | **Inspector code security** : SAST sur le code propriétaire, analyse des dépendances tierces, analyse de l'IaC ; intégrations avec GitHub, GitHub Enterprise Server et GitLab Self-Managed (réseaux privés par des configurations VPC ou AWS CodeConnections) ; des configurations d'analyse fixent quand les dépôts sont analysés ; demandes d'extraction (pull requests) automatiques pour corriger les résultats SAST au-dessus d'un seuil de gravité |
| Génération | **Inspector SBOM Generator** crée une SBOM CycloneDX de l'image, du répertoire ou de l'archive, et l'**API Inspector Scan** renvoie ses vulnérabilités ; plug-ins pour Jenkins, TeamCity et GitHub Actions, plus des intégrations CodePipeline, CodeCatalyst et GitLab ; faire échouer la génération au-delà d'un seuil de gravité |
| Registre | Analyse améliorée ECR à l'envoi, blocage du déploiement des images ayant des résultats critiques |
| IaC | Contrôles de politique sous forme de code avant déploiement (CloudFormation Guard, CloudFormation Hooks) |
| Déploiement et exécution | Analyse continue Inspector d'EC2, ECR et Lambda, GuardDuty Runtime Monitoring |

Sécuriser le pipeline lui-même : rôles de génération au moindre privilège, fédération OIDC pour les systèmes CI externes au lieu de clés d'accès stockées, secrets lus dans Secrets Manager au moment de la génération, compartiments d'artefacts chiffrés, approbation manuelle avant la production.

```bash
./inspector-sbomgen container --image 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders:1.8.2 -o sbom.json
./inspector-sbomgen container --image 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders:1.8.2 \
  --scan-sbom --scan-sbom-output-format cyclonedx --aws-region eu-west-1 --outfile findings.json
```

> **Piège d'examen.** Si une option cite encore CodeGuru Security ou Amazon Q Developer pour un nouveau client, ce service ne lui est plus accessible. Choisissez Inspector code security pour les dépôts, le SBOM Generator avec l'API Scan dans les générations et l'analyse améliorée ECR pour les images.

<!-- section: genai-guardrails | objectives: 3.2.7 -->
## Garde-fous pour les applications d'IA générative

Le **Top 10 de l'OWASP pour les applications LLM (2025)** et les contrôles AWS :

| Risque | Contrôles AWS |
| --- | --- |
| LLM01 Prompt Injection (injection d'invite) | Filtre de contenu **Prompt Attack** de Bedrock Guardrails, balisage du contenu utilisateur en entrée, outils au moindre privilège |
| LLM02 Sensitive Information Disclosure (divulgation d'informations sensibles) | **Filtres d'informations sensibles** (bloquer ou masquer les données personnelles, expressions régulières personnalisées), Macie sur les données d'entraînement et de récupération, KMS |
| LLM03 Supply Chain (chaîne d'approvisionnement) | Modèles approuvés uniquement, Inspector sur les conteneurs et les dépendances, SBOM |
| LLM04 Data and Model Poisoning (empoisonnement des données et du modèle) | Accès en écriture contrôlé et gestion des versions sur les données d'entraînement et des bases de connaissances, vérification de la provenance |
| LLM05 Improper Output Handling (traitement inapproprié des sorties) | Traiter la sortie du modèle comme une entrée non fiable : valider et encoder avant usage, garde-fous en sortie |
| LLM06 Excessive Agency (autonomie excessive) | Rôles au moindre privilège pour les actions des agents et les outils Lambda, confirmation de l'utilisateur pour les actions sensibles |
| LLM07 System Prompt Leakage (fuite de l'invite système) | Aucun secret ni aucune logique d'autorisation dans les invites ; secrets dans Secrets Manager |
| LLM08 Vector and Embedding Weaknesses (faiblesses des vecteurs et embeddings) | Contrôle d'accès et filtrage par métadonnées par locataire sur les bases de connaissances, chiffrement |
| LLM09 Misinformation (désinformation) | **Vérifications d'ancrage contextuel** (contextual grounding checks), **Automated Reasoning checks** |
| LLM10 Unbounded Consumption (consommation non bornée) | Limitation et plans d'utilisation API Gateway, règles WAF basées sur le débit, limites de jetons, quotas |

Politiques d'**Amazon Bedrock Guardrails** : **filtres de contenu** (Hate, Insults, Sexual, Violence, Misconduct, Prompt Attack ; texte et images), **sujets refusés** (denied topics), **filtres de mots** (y compris les grossièretés), **filtres d'informations sensibles**, **vérifications d'ancrage contextuel** (ancrage et pertinence des réponses RAG) et **Automated Reasoning checks**. Niveaux de protection Classic et Standard. Appliquez un garde-fou dans les appels d'inférence, ou évaluez n'importe quel texte, y compris pour des modèles hors de Bedrock, avec l'API **`ApplyGuardrail`**.

**Imposer les garde-fous** :

- Clé de condition IAM **`bedrock:GuardrailIdentifier`** sur `InvokeModel`, `InvokeModelWithResponseStream`, `Converse` et `ConverseStream` (refus quand la requête ne porte pas le garde-fou et la version exigés).
- **Application au niveau du compte** (`PutEnforcedGuardrailConfiguration`, par Région) et **application au niveau de l'organisation** avec une politique Amazon Bedrock (`BEDROCK_POLICY`, un type de politique déclarative) qui applique un garde-fou du compte de gestion à chaque invocation des comptes ciblés. Les garde-fous imposés ne prennent pas en charge les Automated Reasoning checks.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireSupportGuardrailV3",
      "Effect": "Deny",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "bedrock:GuardrailIdentifier": "arn:aws:bedrock:eu-west-1:111122223333:guardrail/supportbot01:3"
        }
      }
    }
  ]
}
```

À compléter par : journalisation des invocations de modèles vers CloudWatch Logs ou S3, points de terminaison VPC d'interface pour Bedrock, CloudTrail pour l'activité de l'API, et les signaux GuardDuty AI Protection issus des événements de données Bedrock et SageMaker AI.

> **Piège d'examen.** La condition IAM sur le garde-fou ne convient pas aux API à appels multiples comme `RetrieveAndGenerate` ou `InvokeAgent`, et les balises d'entrée permettent à un appelant d'exclure son invite de l'évaluation (la réponse reste évaluée). Pour garantir un garde-fou sur chaque invocation dans plusieurs comptes, utilisez l'application des garde-fous par une politique Amazon Bedrock.

<!-- section: key-points -->
## Points clés

- Images : recettes Image Builder avec composants STIG et de test, analyse Inspector, distribution avec KMS ; IMDSv2 dans l'AMI ; Allowed AMIs (audit puis activé, politiques déclaratives) pour imposer les images approuvées.
- Rôles : profil d'instance pour EC2, rôle de tâche et rôle d'exécution de tâche pour ECS, rôle d'exécution et politique basée sur la ressource pour Lambda, `iam:PassRole` avec `iam:PassedToService`, IMDSv2 et clés de condition sur l'emplacement des informations d'identification.
- Inspector trouve les vulnérabilités connues (EC2 avec agent, sans agent ou hybride ; ECR amélioré ; Lambda standard et code) ; GuardDuty Runtime Monitoring et Malware Protection trouvent les menaces actives.
- Politiques de correctifs Patch Manager, références personnalisées, `AWS-RunPatchBaseline` en Scan ou Install ; Inspector valide en continu ; regénérer des images immuables plutôt que corriger sur place.
- Administration : Session Manager sans port entrant, EC2 Instance Connect avec des clés de 60 secondes, Instance Connect Endpoint pour les sous-réseaux privés.
- Pipelines : CodeGuru Security arrêté, Q Developer fermé aux nouvelles inscriptions (Kiro) ; utiliser Inspector code security, le SBOM Generator et l'API Scan, l'analyse ECR.
- IA générative : associer les risques OWASP LLM aux filtres Bedrock Guardrails, aux agents au moindre privilège et aux limites de débit ; imposer avec `bedrock:GuardrailIdentifier` ou l'application des garde-fous au niveau de l'organisation et du compte.
