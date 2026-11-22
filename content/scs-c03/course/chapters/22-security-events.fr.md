Pendant un événement de sécurité, les questions sont concrètes : quelles preuves capturer avant qu'elles ne disparaissent, où se trouvent les journaux qui racontent l'histoire et comment les relier, si le résultat est réel et jusqu'où il s'étend, comment arrêter l'attaquant sans détruire les preuves ni l'activité, et enfin pourquoi c'est arrivé. L'examen récompense la réponse qui préserve les preuves, confine avec le moins d'impact collatéral et utilise des services gérés pour la corrélation plutôt que des outils sur mesure.

<!-- section: forensic-artifacts | objectives: 2.2.1 -->
## Capturer et stocker les artefacts forensic

Collectez dans l'**ordre de volatilité** : ce qui disparaît en premier est capturé en premier.

| Artefact | Comment le capturer | Remarque |
| --- | --- | --- |
| Mémoire (processus, connexions réseau, clés en RAM) | Outil d'acquisition mémoire exécuté par Systems Manager Run Command, ou l'orchestrateur forensic | Perdue à l'arrêt, au redémarrage ou à la résiliation : à capturer avant toute autre modification de l'instance |
| Métadonnées et état de l'instance | `describe-instances`, sortie et capture d'écran de la console, rôles attachés, groupes de sécurité, ENI, balises | À enregistrer avant de modifier quoi que ce soit |
| Disque | Instantanés EBS de chaque volume (`CreateSnapshots` pour tous les volumes d'une instance en une fois), partagés avec le compte forensic ou copiés dans celui-ci | Les instantanés chiffrés avec la clé gérée par AWS par défaut ne peuvent pas être partagés : copiez-les d'abord avec une clé gérée par le client |
| Activité de l'API AWS | Journal de suivi d'organisation CloudTrail (événements de gestion, plus événements de données S3, Lambda ou DynamoDB s'ils sont activés) | Activez la validation de l'intégrité des fichiers journaux |
| Réseau | Journaux de flux VPC, journaux de requêtes Route 53 Resolver, journaux ELB, CloudFront et WAF | Les journaux de flux enregistrent des métadonnées, pas le contenu des paquets |
| Journaux du système et des applications | Agent CloudWatch vers CloudWatch Logs, journaux d'audit du plan de contrôle EKS | Des journaux laissés uniquement sur l'instance peuvent être modifiés par l'attaquant |

```bash
aws ec2 create-snapshots \
  --instance-specification InstanceId=i-0abcd1234ef56789 \
  --description "IR-2026-117 evidence" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=case,Value=IR-2026-117}]' \
  --copy-tags-from-source volume
aws ec2 modify-snapshot-attribute --snapshot-id snap-0123456789abcdef0 \
  --attribute createVolumePermission --operation-type add --user-ids 444455556666
aws cloudtrail validate-logs \
  --trail-arn arn:aws:cloudtrail:eu-west-1:111122223333:trail/org-trail \
  --start-time 2026-11-20T00:00:00Z
```

**Intégrité et chaîne de traçabilité.** La validation de l'intégrité des fichiers journaux CloudTrail calcule un hachage SHA-256 de chaque fichier et livre toutes les heures un **fichier de synthèse** (digest), signé en SHA-256 avec RSA et chaîné au précédent, dans le même compartiment ; `validate-logs` prouve que les fichiers n'ont été ni modifiés ni supprimés. Pour les autres preuves, enregistrez un hachage à l'acquisition, qui l'a collectée et quand (balises, fiche de dossier), et stockez-la dans le compte forensic.

**Compartiment de preuves** : gestion des versions plus **S3 Object Lock** en **mode conformité** (compliance : aucun utilisateur, pas même l'utilisateur racine, ne peut supprimer ou écraser une version verrouillée avant sa date de rétention) ou en **mode gouvernance** (governance : les utilisateurs disposant de `s3:BypassGovernanceRetention` peuvent passer outre en envoyant `x-amz-bypass-governance-retention:true`) ; une **conservation légale** (legal hold) n'expire pas et reste en place jusqu'à son retrait. Ajoutez SSE-KMS avec une clé réservée aux intervenants, une politique de compartiment limitée aux rôles forensic, et les classes de stockage S3 Glacier pour la rétention longue. Les coffres Amazon Glacier (et Vault Lock) n'acceptent plus de nouveaux clients : utilisez les classes de stockage S3 avec Object Lock.

> **Piège d'examen.** Arrêter ou résilier une instance compromise « par sécurité » détruit les preuves en mémoire. L'ordre forensic est : isoler, capturer la mémoire, créer les instantanés, puis décider. Le mode gouvernance peut être contourné par des utilisateurs privilégiés ; quand l'exigence dit « personne ne peut supprimer les preuves », la réponse est le mode conformité.

<!-- section: log-correlation | objectives: 2.2.2 -->
## Rechercher et corréler les journaux

| Besoin | Service |
| --- | --- |
| Requêtes interactives sur des journaux déjà dans CloudWatch Logs (applications, journaux de flux VPC, Lambda) | CloudWatch Logs Insights |
| SQL sur des journaux CloudTrail, de flux VPC ou ALB stockés dans S3, paiement au volume analysé | Amazon Athena (projection de partitions pour limiter l'analyse) |
| Lac de données de sécurité normalisé et multicomptes | Amazon Security Lake (OCSF, Apache Parquet), interrogé par des abonnés avec Athena ou OpenSearch |
| Tableaux de bord, recherche plein texte et alertes sur de gros volumes de journaux | Amazon OpenSearch Service |
| Investigation visuelle des entités et de leurs interactions dans le temps | Amazon Detective |
| Les 90 derniers jours d'événements de gestion d'un compte et d'une Région, sans configuration | Historique des événements CloudTrail |

**Amazon Security Lake** collecte nativement les événements de gestion et de données CloudTrail, les journaux d'audit EKS, les journaux de requêtes Route 53 Resolver, les résultats Security Hub CSPM, les journaux de flux VPC et les journaux AWS WAF, les convertit au format **Open Cybersecurity Schema Framework (OCSF)** et les stocke en Parquet dans S3, partitionnés et gérés avec Lake Formation et Glue. Un schéma commun rend possible la corrélation entre sources : les mêmes noms de champs pour les adresses IP, les principaux et les horodatages.

**CloudTrail Lake** n'est plus ouvert aux nouveaux clients depuis le **31 mai 2026** (les clients existants continuent ; les journaux de suivi, Insights et Aggregated Events ne sont pas concernés). AWS oriente les nouvelles conceptions vers CloudWatch : pipelines avec transformations OCSF gérées, Logs Insights avec des langages de requête basés sur OpenSearch, centralisation des journaux entre comptes et entre Régions.

Les clés de corrélation à suivre d'un journal à l'autre : l'**ID de clé d'accès** (`userIdentity.accessKeyId`), le nom de session du rôle et `sourceIdentity`, l'adresse IP source, l'ID d'instance et l'ENI, l'ID de requête, et des horodatages normalisés en UTC. Exemple : à partir d'un résultat GuardDuty sur une clé d'accès, lister tout ce que cette clé a fait.

```text
SELECT eventtime, eventsource, eventname, awsregion, sourceipaddress, errorcode
FROM cloudtrail_logs
WHERE useridentity.accesskeyid = 'AKIAIOSFODNN7EXAMPLE'
  AND eventtime BETWEEN '2026-11-19T00:00:00Z' AND '2026-11-21T00:00:00Z'
ORDER BY eventtime
```

> **Conseil d'examen.** « Corréler les journaux de nombreux comptes et de sources tierces dans un format commun, avec le moins de développement spécifique » désigne Security Lake (OCSF). « Du SQL ponctuel sur des fichiers CloudTrail existants dans S3 » désigne Athena. Ne choisissez pas CloudTrail Lake pour une nouvelle solution.

<!-- section: finding-validation | objectives: 2.2.3 -->
## Valider les résultats et évaluer la portée

Chaque service prouve quelque chose de différent ; validez le résultat avec des preuves d'une autre source avant d'agir à grande échelle.

| Service | Son résultat signifie | Valider et délimiter avec |
| --- | --- | --- |
| GuardDuty | Activité suspecte ou menace (appels d'API, réseau, DNS, exécution, logiciel malveillant) | Enregistrements CloudTrail du principal, journaux de flux, profil Detective |
| GuardDuty Extended Threat Detection | Une **séquence d'attaque** en plusieurs étapes, corrélée sur une fenêtre glissante de 24 heures, toujours **Critical** | Les signaux listés dans le résultat, chaque ressource qu'il nomme |
| Security Hub (nouveau) | Des **résultats d'exposition** corrélés (OCSF) avec un graphe des chemins d'attaque | Les résultats sous-jacents CSPM, Inspector, GuardDuty, Macie |
| Security Hub CSPM | Un contrôle a échoué (posture, pas une attaque) | La configuration de la ressource et sa chronologie AWS Config |
| Inspector | Une vulnérabilité connue ou une accessibilité réseau ; le score Inspector ajuste le CVSS à l'environnement | Le paquet est-il réellement chargé, existe-t-il un chemin depuis Internet |
| Macie | Des données sensibles dans un objet, ou un problème de politique de compartiment | Un échantillon de l'objet, les événements de données CloudTrail sur les accès |
| IAM Access Analyzer | Une ressource est partagée hors de la zone de confiance | La politique de la ressource, le partage prévu |

Les types de résultats GuardDuty se lisent `ThreatPurpose:ResourceTypeAffected/ThreatFamilyName.DetectionMechanism!Artifact`, par exemple `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` (informations d'identification du rôle d'une instance utilisées hors d'AWS). Gravité : faible, moyenne, élevée et critique. Vérifiez la ressource, l'acteur (IP, ASN, localisation), les dates de première et de dernière observation et le nombre d'occurrences.

**Questions de validation** : l'activité s'explique-t-elle par une demande de changement, un test d'intrusion ou un scanner ? Les appels d'API ont-ils réussi ou renvoyé `AccessDenied` (reconnaissance) ? Quels autres comptes et Régions montrent la même clé, la même IP ou le même agent utilisateur ? Quelles données le principal pouvait-il atteindre (classification Macie, événements de données CloudTrail) ? Les réponses définissent la portée : identités, ressources, données et fenêtre de temps concernées.

**Faux positif confirmé** : créez une **règle de suppression** GuardDuty (compte administrateur uniquement) limitée au comportement légitime connu, par exemple le type de résultat plus l'ID d'image d'un scanner de vulnérabilités. Les résultats supprimés sont toujours générés mais archivés, ne sont pas envoyés à Security Hub CSPM, S3, Detective ni EventBridge, et ne servent plus de signaux à Extended Threat Detection.

> **Piège d'examen.** Une règle de suppression large n'est pas « la moindre charge opérationnelle » : elle masque des signaux nécessaires pour détecter les attaques en plusieurs étapes. Ne supprimez que des faux positifs confirmés à plusieurs reprises, de la façon la plus ciblée possible. Et l'échec d'un contrôle Security Hub CSPM est une mauvaise configuration, pas une preuve de compromission.

<!-- section: contain-recover | objectives: 2.2.4 -->
## Confiner, éradiquer et restaurer

Les catégories de confinement du guide : confinement de la **source** (filtrer ou router le trafic venant de l'attaquant), confinement de la **technique et de l'accès** (retirer l'accès de l'attaquant) et confinement de la **destination** (filtrer le trafic vers la cible).

| Ressource | Actions de confinement |
| --- | --- |
| Instance EC2 | La baliser, activer la protection contre la résiliation, la détacher de son groupe Auto Scaling, la désinscrire des groupes cibles, remplacer ses groupes de sécurité par un groupe d'isolation, révoquer les sessions de son rôle, la laisser en marche pour capturer la mémoire |
| Clé d'accès d'utilisateur IAM | Désactiver la clé (la conserver pour l'investigation), attacher une politique de refus total, examiner ce que la clé a créé |
| Rôle IAM | Révoquer les sessions actives : IAM ajoute la politique en ligne `AWSRevokeOlderSessions`, un refus sur `aws:TokenIssueTime` antérieur à l'heure de révocation |
| Compartiment S3 | Block Public Access, une politique de compartiment restrictive, examen des points d'accès et des signataires d'URL présignées |
| Fonction Lambda | Simultanéité réservée à 0 pour arrêter les invocations, retrait de l'URL de fonction ou de la politique de ressource, rotation des secrets qu'elle détenait |
| Source réseau | Refus dans une ACL réseau pour l'adresse source, ensemble d'IP WAF, règle Network Firewall, blocage du domaine par Route 53 Resolver DNS Firewall |

```bash
aws ec2 modify-instance-attribute --instance-id i-0abcd1234ef56789 --disable-api-termination
aws autoscaling detach-instances --instance-ids i-0abcd1234ef56789 \
  --auto-scaling-group-name web-asg --no-should-decrement-desired-capacity
aws elbv2 deregister-targets --target-group-arn arn:aws:elasticloadbalancing:eu-west-1:111122223333:targetgroup/web/0123456789abcdef \
  --targets Id=i-0abcd1234ef56789
aws ec2 modify-instance-attribute --instance-id i-0abcd1234ef56789 --groups sg-0f1e2d3c4b5a69788
aws iam update-access-key --user-name build-bot --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive
aws lambda put-function-concurrency --function-name export-orders --reserved-concurrent-executions 0
```

**Les groupes de sécurité sont avec état** : retirer une règle n'interrompt pas les connexions **suivies** (tracked) déjà ouvertes ; elles continuent jusqu'à expiration. Seuls les flux non suivis (règles ouvertes à 0.0.0.0/0 ou ::/0 dans les deux sens) s'arrêtent immédiatement. Pour couper les sessions existantes tout de suite, ajoutez un refus dans une **ACL réseau** du sous-réseau : les ACL réseau sont sans état et rompent les connexions existantes, mais elles touchent toutes les instances du sous-réseau.

La révocation des sessions d'un rôle n'affecte pas les requêtes signées avec les clés à long terme d'un utilisateur IAM (`aws:TokenIssueTime` en est absent), et les rôles créés par les jeux d'autorisations IAM Identity Center se révoquent dans Identity Center, pas dans IAM.

**Éradication** : reconstruire à partir d'une AMI ou d'une image saine plutôt que nettoyer un hôte compromis ; renouveler chaque information d'identification et chaque secret que l'attaquant a pu lire ; supprimer la persistance (nouveaux utilisateurs IAM, rôles, clés d'accès, fonctions Lambda, règles EventBridge, politiques d'approbation modifiées) ; vérifier toutes les Régions, y compris celles qui ne sont pas utilisées ; corriger la vulnérabilité qui a permis l'entrée.

**Restauration** : restaurer les données depuis AWS Backup (copies entre comptes dans un compte de sauvegarde ou un coffre isolé logiquement, Backup Vault Lock contre la suppression), les versions précédentes des objets S3, la restauration à un instant dans le passé de RDS ; redéployer l'infrastructure depuis l'IaC ; surveiller de près les ressources restaurées pour détecter une réinfection.

> **Piège d'examen.** Placer une instance dans un groupe de sécurité vide ne suffit pas quand l'exigence est « mettre fin immédiatement à la session existante de l'attaquant » : les connexions suivies survivent. Ajoutez un refus dans une ACL réseau. Et supprimer une clé d'accès compromise détruit la preuve de ce qu'elle était : désactivez-la d'abord.

<!-- section: root-cause | objectives: 2.2.5 -->
## Analyse des causes racines

L'analyse des causes racines répond à trois questions : comment l'attaquant est entré, ce qu'il a fait et quel contrôle a échoué. Méthodes : reconstruire une **chronologie** à partir du premier événement malveillant (souvent la première utilisation d'une information d'identification depuis une nouvelle IP ou un nouvel ASN), suivre le **chemin d'attaque** à travers les identités et les ressources, et se demander pourquoi à plusieurs reprises jusqu'à atteindre un contrôle que l'on peut corriger (une clé publiée dans un dépôt, IMDSv1 permettant le vol d'informations d'identification par SSRF, un groupe de sécurité ouvert à Internet, une CVE non corrigée).

**Amazon Detective** est conçu pour cette étape :

- Construit un **graphe de comportement** à partir de CloudTrail, des journaux de flux VPC et des résultats GuardDuty, avec jusqu'à **un an** d'historique ; par Security Lake, il peut aussi interroger les événements de gestion CloudTrail et les journaux de flux bruts.
- Les **profils** de chaque entité (rôle IAM, utilisateur, adresse IP, instance EC2) montrent les références habituelles et l'activité inhabituelle, comme des appels d'API depuis une nouvelle géolocalisation.
- Les **groupes de résultats** (finding groups) rassemblent les résultats et entités liés d'un même événement probable, pour remonter au premier résultat.
- **Detective Investigation** analyse un utilisateur ou un rôle IAM à la recherche d'indicateurs de compromission (`StartInvestigation`).
- Multicomptes : un compte administrateur (délégué par Organizations) possède le graphe de comportement de tous les comptes membres.

Champs CloudTrail utiles : `userIdentity` (type, ARN, `sessionContext.sessionIssuer`), `sourceIPAddress`, `userAgent`, `errorCode`, `requestParameters`, `sourceIdentity` à travers les chaînes de rôles.

Bouclez avec les activités post-incident : une revue sans recherche de coupable, de nouvelles détections (GuardDuty, règles Config, alarmes CloudWatch), des contrôles préventifs (SCP, IMDSv2 imposé, recherche de secrets dans le code) et des playbooks mis à jour.

> **Conseil d'examen.** « Identifier la cause racine d'un résultat GuardDuty en visualisant l'activité liée dans le temps, sans construire de chaîne de journaux » désigne Amazon Detective. Detective sert à enquêter ; il ne génère pas les résultats de détection et ne corrige rien.

<!-- section: key-points -->
## Points clés

- Ordre de volatilité : mémoire, puis état de l'instance, puis instantanés de disque, puis journaux ; preuves dans un compartiment du compte forensic avec Object Lock en mode conformité ; les fichiers de synthèse CloudTrail et `validate-logs` prouvent l'intégrité.
- Corréler avec Logs Insights, Athena, Security Lake (OCSF, Parquet) ou OpenSearch ; suivre les ID de clés d'accès, les sessions, les IP et les ID d'instance. CloudTrail Lake est fermé aux nouveaux clients.
- Valider avant d'agir : menaces GuardDuty, séquences d'attaque d'Extended Threat Detection, expositions Security Hub, posture CSPM, vulnérabilités Inspector, données Macie ; ne supprimer que des faux positifs confirmés, de façon ciblée.
- Confiner par la source, l'accès ou la destination ; les groupes de sécurité gardent les connexions suivies, les ACL réseau les coupent ; révoquer les sessions de rôle avec `aws:TokenIssueTime` ; désactiver les clés plutôt que les supprimer.
- Éradiquer en reconstruisant et en renouvelant les secrets, restaurer depuis Backup, les versions et l'IaC ; trouver la cause racine avec les graphes de comportement, groupes de résultats et investigations de Detective.
