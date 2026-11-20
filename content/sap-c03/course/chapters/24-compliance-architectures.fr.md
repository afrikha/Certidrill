Les questions de conformité partent d'une obligation externe (une loi sur la vie privée, un régulateur financier, une règle sur les données de santé, une exigence de souveraineté) et demandent l'architecture qui la satisfait avec des preuves : des données protégées qui restent là où elles le doivent, des pistes d'audit que personne ne peut altérer, des rapports qu'un auditeur accepte, et une vue documentée des risques. Ce chapitre couvre les architectures de protection des données, les contrôles de souveraineté, les pistes d'audit des charges de travail réglementées et d'IA, la résidence des données et les restrictions de transfert, les preuves de conformité, et l'évaluation des risques par la modélisation des menaces.

<!-- section: data-protection | objectives: 2.4.1 -->
## Architectures pour les exigences de protection des données

Un régulateur nomme rarement un service ; il nomme des résultats. Traduisez chaque résultat en une couche de contrôle :

| Résultat exigé | Architecture |
| --- | --- |
| Savoir où se trouvent les données personnelles | Découverte automatisée Amazon Macie sur S3, résultats étiquetés et envoyés à Security Hub ; catalogue de données avec des balises de sensibilité |
| Seuls les rôles autorisés les lisent, même dans l'entreprise | Clé KMS gérée par le client par domaine de données ou par locataire, politique de clé limitée aux rôles consommateurs ; autorisations Lake Formation par colonne et par ligne pour l'analytique |
| Accès uniquement depuis le réseau de l'entreprise et l'organisation | Périmètre de données : politiques de point de terminaison VPC, `aws:SourceVpce` et `aws:PrincipalOrgID` dans les politiques de ressources, RCP pour le refus à l'échelle de l'organisation |
| Chaque lecture d'un objet réglementé est enregistrée | Événements de données CloudTrail sur les compartiments S3 ou les tables DynamoDB concernés, plus les événements KMS `Decrypt` |
| Les enregistrements ne peuvent être ni modifiés ni supprimés pendant la période de rétention | S3 Object Lock en mode Conformité, AWS Backup Vault Lock |
| Droit à l'effacement pour une personne | Une clé par personne concernée ou par locataire seulement quand l'échelle le permet (effacement cryptographique, crypto-shredding) ; sinon un processus de suppression dans tous les magasins, tracé |

Un périmètre de données a trois côtés, chacun avec son type de politique :

| Côté | Question | Clés de condition et politiques typiques |
| --- | --- | --- |
| Identité | L'appelant est-il l'un de nos principaux ? | `aws:PrincipalOrgID` dans les politiques de ressources et les RCP |
| Ressource | La cible est-elle l'une de nos ressources ? | `aws:ResourceOrgID` dans les SCP et les politiques de point de terminaison VPC |
| Réseau | La requête vient-elle de nos réseaux ? | `aws:SourceVpc`, `aws:SourceVpce`, `aws:SourceIp`, avec des exceptions pour les services AWS qui agissent pour vous (`aws:PrincipalIsAWSService`, `aws:ViaAWSService`) |

> **Piège d'examen.** CloudTrail journalise par défaut les événements de gestion, pas les événements de données. « Enregistrer chaque accès aux documents des patients dans S3 » exige des sélecteurs d'événements de données sur ces compartiments ; un journal de suivi d'organisation seul ne suffit pas.

<!-- section: sovereignty | objectives: 2.4.2 -->
## Souveraineté des données et exigences réglementaires

Les exigences de souveraineté vont plus loin que l'emplacement : elles demandent qui exploite l'infrastructure, qui peut accéder aux données ou aux clés, et si l'environnement dépend de systèmes situés hors d'une juridiction.

| Exigence | Conception |
| --- | --- |
| Données stockées et traitées dans un seul pays | Région commerciale de ce pays, autres Régions refusées par SCP ou par le refus de Région de Control Tower |
| Clés sous le contrôle exclusif du client | Clés gérées par le client avec des politiques de clé restrictives ; magasin de clés CloudHSM pour des HSM à locataire unique ; magasin de clés externe quand le matériel doit rester hors d'AWS |
| Les données doivent rester sur site ou dans une installation précise pour la latence ou la loi | AWS Outposts dans cette installation, avec les mêmes API et les mêmes contrôles |
| Exploitation uniquement dans l'UE, personnel résidant dans l'UE, métadonnées conservées dans l'UE, indépendance vis-à-vis des autres Régions | AWS European Sovereign Cloud : disponible en général depuis le 14 janvier 2026, première Région `eusc-de-east-1` dans le Brandebourg (Allemagne), partition distincte `aws-eusc` avec son propre IAM et sa propre facturation |
| Montrer au régulateur les certifications d'AWS pour la Région | Rapports AWS Artifact |

Comme l'European Sovereign Cloud est une partition distincte, les comptes, les identités IAM, les organisations et les ARN (`arn:aws-eusc:...`) sont distincts de ceux des Régions commerciales : une conception qui couvre les deux exige des comptes séparés et une fédération dans chaque partition, et les services qui franchissent les Régions (réplication, clés multi-Régions) ne franchissent pas les partitions.

> **Conseil d'examen.** Quand l'énoncé dit seulement « les données doivent rester en Allemagne », une Région commerciale plus une SCP de refus de Région est la solution la moins lourde à exploiter. La partition souveraine répond aux énoncés qui ajoutent la résidence des opérateurs, l'emplacement des métadonnées ou l'indépendance vis-à-vis de l'infrastructure mondiale d'AWS.

<!-- section: audit-trails | objectives: 2.4.3 -->
## Gestion des pistes d'audit pour les charges de travail réglementées et les services d'IA

Une piste d'audit doit être complète, révéler toute altération, être conservée pendant la durée imposée et n'être lisible que par les auditeurs :

| Propriété | Mise en œuvre |
| --- | --- |
| Complète | Journal de suivi d'organisation multi-Régions ; événements de données pour les magasins réglementés ; enregistrement Config de chaque type de ressource concerné |
| Révèle les altérations | Validation de l'intégrité des fichiers journaux CloudTrail : hachages SHA-256 et fichier de condensé horaire signé en SHA-256 avec RSA, chaque condensé chaîné au précédent |
| Immuable pendant la rétention | Compartiment d'archive des journaux avec Object Lock en mode Conformité et un cycle de vie vers un stockage plus froid ; SSE-KMS avec une clé gérée par le client |
| Séparée des opérateurs | Compte d'archive des journaux où les administrateurs des charges de travail n'ont aucun droit d'écriture ni de suppression ; des SCP refusent l'arrêt des journaux de suivi ou des enregistreurs Config |
| Interrogeable | Athena sur le compartiment du journal de suivi, CloudWatch Logs, ou Security Lake en OCSF |

```bash
# Prove that no log file was modified or deleted for the audit period
aws cloudtrail validate-logs --trail-arn arn:aws:cloudtrail:eu-west-1:111122223333:trail/org-trail --start-time 2026-10-01T00:00:00Z --end-time 2026-10-31T23:59:59Z
```

Les **services d'IA** exigent deux pistes complémentaires :

| Question d'un auditeur | Source |
| --- | --- |
| Qui a invoqué quel modèle, depuis quel rôle, quand, et dans quelle Région la requête a été traitée | Événements de gestion CloudTrail pour `InvokeModel` et `Converse` ; `additionalEventData.inferenceRegion` pour l'inférence entre Régions |
| Quel agent, quelle base de connaissances ou quel flux a été appelé, et ce qu'a décidé le garde-fou | Événements de données CloudTrail (`AWS::Bedrock::AgentAlias`, `AWS::Bedrock::KnowledgeBase`, `AWS::Bedrock::FlowAlias`, `AWS::Bedrock::Guardrail`) |
| Quelle était exactement l'invite et la réponse | Journalisation des invocations de modèles vers S3 ou CloudWatch Logs, avec un `requestMetadata` fourni par l'appelant pour la corrélation |

```bash
aws cloudtrail put-event-selectors --trail-name org-trail --advanced-event-selectors '[{"Name":"Bedrock knowledge bases","FieldSelectors":[{"Field":"eventCategory","Equals":["Data"]},{"Field":"resources.type","Equals":["AWS::Bedrock::KnowledgeBase"]}]},{"Name":"Bedrock guardrails","FieldSelectors":[{"Field":"eventCategory","Equals":["Data"]},{"Field":"resources.type","Equals":["AWS::Bedrock::Guardrail"]}]}]'
```

Les journaux d'invocation contiennent des données personnelles issues des invites, ainsi que le contenu bloqué par les garde-fous : protégez-les comme les données réglementées elles-mêmes (clé gérée par le client, lecteurs restreints, règles de rétention).

> **Piège d'examen.** La validation ne fonctionne que sur les fichiers journaux à l'emplacement où CloudTrail les a livrés. Copier les journaux vers un autre magasin et supprimer les originaux casse la vérification native `validate-logs` ; répliquez plutôt le compartiment et gardez la source protégée.

<!-- section: data-residency | objectives: 2.4.4 -->
## Contrôles de résidence des données et restrictions de transfert

La résidence s'impose en trois points : où les ressources peuvent être créées, où les données peuvent être copiées, et où les services gérés les traitent.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideEURegions",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "sts:*", "route53:*", "cloudfront:*", "support:*", "budgets:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] },
        "ArnNotLike": { "aws:PrincipalARN": "arn:aws:iam::*:role/platform-break-glass" }
      }
    }
  ]
}
```

`NotAction` exempte les services mondiaux dont les requêtes aboutissent à USA Est (Virginie du Nord) ; le contrôle de refus de Région de Control Tower applique une version gérée de la même idée.

| Chemin de transfert | Restriction |
| --- | --- |
| S3 Cross-Region Replication vers une Région non approuvée | La SCP de refus de Région empêche le compartiment de destination ; refuser `s3:PutReplicationConfiguration` sauf au rôle de la plateforme |
| Clés KMS multi-Régions, tables globales DynamoDB, bases de données globales Aurora | Ces réplicas sont demandés dans la Région source : refuser `kms:ReplicateKey` (ou le limiter avec `kms:ReplicaRegion`), `dynamodb:CreateTableReplica` et `rds:CreateGlobalCluster` sauf au rôle de la plateforme |
| Copies d'instantanés et d'AMI, règles de copie AWS Backup | Les copies sont demandées dans la Région de destination, que la SCP refuse ; les politiques de sauvegarde d'organisation définissent les cibles de copie approuvées |
| Inférence entre Régions d'Amazon Bedrock | Les profils d'inférence géographiques (US, EU, APAC) gardent le traitement dans la zone géographique, et la SCP doit autoriser chaque Région du profil ; les profils globaux routent vers n'importe quelle Région commerciale et exigent d'autoriser `aws:RequestedRegion` « unspecified » : refusez-les pour les charges de travail soumises à la résidence |
| Outillage de sécurité central | Région de cumul de Security Lake et destination de centralisation CloudWatch Logs dans la même juridiction |
| Diffusion de contenu | CloudFront met les réponses en cache dans des emplacements périphériques du monde entier : désactivez la mise en cache des réponses réglementées ou gardez-les hors de la distribution |

> **Piège d'examen.** L'inférence entre Régions peut router vers des Régions qui ne sont pas activées dans votre compte. Une exigence de résidence pour une application d'IA générative se satisfait par un profil d'inférence limité à la zone géographique et des SCP, pas en laissant les autres Régions désactivées.

<!-- section: compliance-evidence | objectives: 2.4.5 -->
## Collecte des preuves de conformité et création de rapports

Les preuves viennent des deux côtés du modèle de responsabilité partagée :

| Preuve | Source |
| --- | --- |
| Les contrôles d'AWS lui-même : rapports SOC 1, SOC 2, ISO, PCI DSS, certifications | AWS Artifact Reports, gratuit, téléchargeable à la demande par les principaux IAM autorisés |
| Accords avec AWS (par exemple un avenant BAA, business associate addendum) pour un compte ou pour tous les comptes de l'organisation | AWS Artifact Agreements, acceptés depuis le compte de gestion pour l'organisation |
| Rapports de conformité de logiciels d'éditeurs achetés sur AWS Marketplace | Rapports tiers d'AWS Artifact (AWS Marketplace Vendor Insights) |
| Configuration et conformité de vos ressources dans le temps | AWS Config : tableaux de bord des packs de conformité, requêtes avancées exportées en CSV ou JSON, `get-resource-config-history` pour la chronologie |
| Scores des contrôles par rapport à PCI DSS, CIS ou NIST | Normes de Security Hub CSPM et leurs résultats |
| Conformité des sauvegardes (fréquence, rétention, chiffrement, copies entre Régions) | Cadres et rapports d'AWS Backup Audit Manager |
| Tableaux de bord multicomptes pour les auditeurs | Athena sur les données Config, avec des tableaux de bord Amazon Quick |

Artifact prouve ce que fait AWS ; il ne prouve jamais que vos compartiments sont chiffrés. Un dossier de preuves complet combine les rapports Artifact avec vos propres preuves continues issues de Config, de Security Hub CSPM, de CloudTrail et d'AWS Backup.

> **Piège d'examen.** AWS Audit Manager est en mode maintenance et ne peut plus être configuré dans de nouveaux comptes depuis le 30 avril 2026. Pour une nouvelle organisation, AWS oriente vers les packs de conformité Config (avec la réserve que certains référentiels comme SOC 2 et le RGPD n'ont pas de pack) et vers des outils de partenaires pour les flux d'audit complets.

<!-- section: risk-assessment | objectives: 2.4.6 -->
## Évaluation des risques et modélisation des menaces

Le pilier Sécurité de Well-Architected (SEC01-BP07) considère l'absence de modélisation des menaces comme un risque élevé. Commencez dès la conception et gardez le modèle vivant : revoyez-le à chaque changement majeur, nouveau service ou évolution du paysage des menaces. Il répond à quatre questions :

1. **Sur quoi travaillons-nous ?** Un diagramme de flux de données avec les frontières de confiance, les hypothèses et le périmètre.
2. **Qu'est-ce qui peut mal tourner ?** Les menaces, trouvées en séance avec STRIDE et des catalogues comme l'OWASP Top 10.
3. **Qu'allons-nous faire ?** Les atténuations avec leurs responsables, limitées à ce que vous contrôlez selon le modèle de responsabilité partagée.
4. **Avons-nous bien travaillé ?** Revoir la couverture et la qualité, et s'améliorer.

**Threat Composer** (AWS Labs, aussi dans l'AWS Toolkit for VS Code) rédige des énoncés de menaces avec une grammaire de menace et produit un modèle lisible par l'humain et un modèle lisible par machine, pour que le modèle de menaces vive dans le dépôt sous forme de code.

| Menace STRIDE | Atténuation AWS typique |
| --- | --- |
| Usurpation (Spoofing) | IAM Identity Center avec MFA, rôles IAM au lieu de clés, mTLS, Cognito ou AgentCore Identity pour les utilisateurs des applications |
| Falsification (Tampering) | Object Lock, artefacts signés (signature KMS ou ML-DSA), validation de l'intégrité CloudTrail, droits d'écriture au moindre privilège |
| Répudiation (Repudiation) | Journal de suivi d'organisation, événements de données, journaux d'invocation avec l'identité de l'appelant |
| Divulgation d'informations (Information disclosure) | Chiffrement avec des clés gérées par le client, périmètre de données, Macie, points de terminaison privés |
| Déni de service (Denial of service) | Shield, règles basées sur le débit de WAF, CloudFront, Auto Scaling, quotas et limitation dans API Gateway |
| Élévation de privilèges (Elevation of privilege) | Limites d'autorisations, SCP, IAM Access Analyzer, Verified Permissions pour l'autorisation applicative |

Validez le risque résiduel en continu : les résultats d'exposition de Security Hub montrent des faiblesses enchaînées (par exemple une instance accessible depuis Internet avec une vulnérabilité exploitable et un rôle puissant), Inspector ajuste le score CVSS selon l'accessibilité, IAM Access Analyzer trouve les accès externes et inutilisés, et AWS Fault Injection Service vérifie que les atténuations de disponibilité fonctionnent réellement.

> **Conseil d'examen.** « Identifier les menaces avant la construction de la nouvelle charge de travail de paiement, et garder l'analyse versionnée avec le code » correspond à la modélisation des menaces avec Threat Composer en phase de conception ; GuardDuty et Inspector trouvent les menaces et les vulnérabilités dans les ressources en cours d'exécution, après le déploiement.

<!-- section: key-points -->
## Points clés

- Associez chaque résultat réglementaire à un contrôle : Macie, clés gérées par le client, périmètre de données, événements de données, Object Lock.
- Périmètre de données : identité (`aws:PrincipalOrgID`), ressource (`aws:ResourceOrgID`), réseau (`aws:SourceVpce`).
- La souveraineté au-delà de l'emplacement : l'AWS European Sovereign Cloud est une partition distincte avec son propre IAM et sa propre facturation.
- Pistes d'audit : journal de suivi d'organisation, validation de l'intégrité, Object Lock, compte d'archive des journaux séparé ; Bedrock exige CloudTrail plus la journalisation des invocations.
- Résidence : SCP de refus de Région avec `NotAction` pour les services mondiaux, blocage des chemins de réplication, profils d'inférence géographiques uniquement.
- Artifact prouve la conformité d'AWS ; Config, Security Hub CSPM et Backup Audit Manager prouvent la vôtre ; Audit Manager est fermé aux nouveaux comptes.
- Modélisation des menaces : quatre questions, STRIDE, Threat Composer, revue à chaque changement majeur.
