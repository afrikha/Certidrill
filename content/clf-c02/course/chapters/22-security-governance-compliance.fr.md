La conformité consiste à prouver qu'une charge de travail respecte les règles d'une loi, d'une norme ou d'un secteur ; la gouvernance est l'ensemble des contrôles qui maintiennent les comptes et les ressources dans ces règles. L'examen demande où trouver les documents de conformité, quel service enregistre quels journaux, comment les données sont chiffrées et quel service détecte ou audite quoi.

<!-- section: compliance-governance | objectives: 2.2.1 -->
## Les concepts de conformité et de gouvernance

- L'infrastructure et les services AWS sont audités par des tiers indépendants au regard de nombreux **programmes de conformité** (par exemple SOC 1, SOC 2 et SOC 3, PCI DSS, ISO/IEC 27001, FedRAMP, HIPAA). Un client **hérite** des contrôles qu'AWS exploite, ce qui réduit son propre travail d'audit.
- La conformité d'AWS ne rend pas la charge de travail du client conforme : le client reste audité sur sa part du modèle de responsabilité partagée.
- La **gouvernance** consiste à appliquer des règles centrales à de nombreux comptes : AWS Organizations applique des **politiques de contrôle des services (SCP)** qui limitent ce que les comptes membres peuvent faire ; AWS Control Tower met en place un environnement multicompte gouverné avec des contrôles préventifs et de détection ; les règles AWS Config vérifient les ressources en continu.

<!-- section: cloud-security-benefits | objectives: 2.2.2 -->
## Les avantages de la sécurité du cloud

| Avantage | Ce qu'il signifie |
| --- | --- |
| Chiffrement disponible partout | La plupart des services chiffrent les données par un paramètre ou par défaut, avec des clés gérées dans AWS KMS |
| Contrôles hérités | La sécurité physique et l'infrastructure auditée viennent d'AWS ; aucun centre de données à sécuriser |
| Visibilité | Chaque appel d'API peut être journalisé (AWS CloudTrail) et chaque configuration enregistrée (AWS Config) |
| Automatisation | Les vérifications et les réponses de sécurité s'exécutent en continu, pas lors de revues manuelles périodiques |
| Échelle | Des protections comme AWS Shield Standard sont activées par défaut pour chaque client |

<!-- section: encryption | objectives: 2.2.7 -->
## Les options de chiffrement

| Option | Protège | Sur AWS |
| --- | --- | --- |
| **Chiffrement au repos** | Les données stockées : disques, objets, bases de données, sauvegardes | Amazon S3 chiffre chaque nouvel objet par défaut (SSE-S3) ; les volumes Amazon EBS et les bases RDS sont chiffrés quand vous l'activez (le chiffrement EBS par défaut est un paramètre régional) ; clés dans **AWS KMS** |
| **Chiffrement en transit** | Les données qui circulent sur un réseau | TLS (HTTPS) sur les points de terminaison des services AWS et sur vos propres applications, avec des certificats d'**AWS Certificate Manager (ACM)** ; tunnels IPsec d'AWS Site-to-Site VPN |
| **Chiffrement côté serveur** | Les données chiffrées par le service AWS quand il les stocke | Options S3 SSE-S3, SSE-KMS ; chiffrement RDS, EBS et DynamoDB avec des clés KMS |
| **Chiffrement côté client** | Les données chiffrées par le client avant leur envoi à AWS | Le client gère le processus et les clés |

| Service de clés | Usage |
| --- | --- |
| **AWS Key Management Service (AWS KMS)** | Créer et contrôler des clés de chiffrement, intégré à la plupart des services ; chaque utilisation d'une clé est journalisée dans CloudTrail |
| **AWS CloudHSM** | Des modules de sécurité matériels (HSM) dédiés, à locataire unique, dans votre VPC, sous votre contrôle exclusif |
| **AWS Certificate Manager (ACM)** | Fournir et renouveler des certificats TLS pour les équilibreurs de charge, Amazon CloudFront et Amazon API Gateway |

> **Piège d'examen.** HTTPS, TLS et les tunnels VPN relèvent du chiffrement **en transit**. Chiffrer un volume EBS ou un objet S3 relève du chiffrement **au repos**. AWS KMS gère des clés ; ACM gère des certificats.

<!-- section: security-logs | objectives: 2.2.3 -->
## Où les journaux de sécurité sont capturés

| Journal | Enregistre | Destination |
| --- | --- | --- |
| **AWS CloudTrail** | Appels d'API et actions dans la console : qui, quoi, quand, d'où | L'historique des événements montre par défaut les 90 derniers jours d'événements de gestion ; un **journal de suivi** (trail) stocke les événements dans un compartiment S3 (et, en option, dans CloudWatch Logs) pour une conservation plus longue |
| **Amazon CloudWatch Logs** | Journaux des applications, des systèmes d'exploitation et des services | Groupes de journaux, interrogeables, avec filtres de métriques et alarmes |
| **Journaux de flux VPC** (VPC Flow Logs) | Trafic IP accepté ou rejeté par les interfaces réseau d'un VPC | CloudWatch Logs ou Amazon S3 |
| **AWS Config** | Modifications de configuration des ressources, et leur historique | Historique et instantanés de configuration dans un compartiment S3 |
| Journaux des services | Journaux d'accès au serveur S3, journaux d'accès Elastic Load Balancing, journaux CloudFront | En général un compartiment S3 |

<!-- section: compliance-information | objectives: 2.2.4, 2.2.5, 2.2.9 -->
## Informations de conformité, emplacements et secteurs

**AWS Artifact**, dans l'AWS Management Console, est le portail en libre-service des documents de conformité d'AWS, sans frais :

- **Artifact Reports** : les rapports d'audit et les certifications d'AWS (rapports SOC, attestation PCI DSS, certificats ISO) à remettre à vos auditeurs ;
- **Artifact Agreements** : consulter et accepter des accords avec AWS, comme le **Business Associate Addendum (BAA)** exigé pour traiter des informations de santé protégées au titre de HIPAA.

Les besoins de conformité dépendent de **l'endroit** et du **secteur** où une entreprise exerce :

| Besoin | Exemple | Ce qu'AWS apporte |
| --- | --- | --- |
| Les données doivent rester dans un pays ou une région | Données personnelles européennes soumises au RGPD (GDPR), lois nationales de résidence des données | Choisir la Région ; les données y restent tant que le client ne les déplace pas |
| Charges de travail du gouvernement américain | FedRAMP, ITAR | Régions AWS GovCloud (US) |
| Données de santé (États-Unis) | HIPAA | BAA dans AWS Artifact, uniquement des services éligibles HIPAA |
| Données de cartes de paiement | PCI DSS | Attestation PCI DSS dans AWS Artifact ; services inclus dans le périmètre PCI DSS |

Les exigences de conformité **varient aussi selon les services AWS** : tous les services ne sont pas dans le périmètre de tous les programmes. La page AWS *AWS Services in Scope by Compliance Program* liste les services couverts par chaque programme ; une charge de travail réglementée n'utilise que ceux-là.

> **Piège d'examen.** AWS Artifact fournit les rapports et accords **d'AWS** ; il ne vérifie pas **vos** ressources. « Vérifier en continu que chaque volume EBS est chiffré » est une règle AWS Config, pas Artifact.

<!-- section: securing-resources | objectives: 2.2.6 -->
## Comment les clients protègent les ressources

| Service | Ce qu'il fait | Énoncé type |
| --- | --- | --- |
| **Amazon GuardDuty** | Détection des menaces à partir des événements CloudTrail, des journaux de flux VPC et des journaux DNS, sans agent | « detect compromised instances », « unusual API calls », « crypto mining » |
| **Amazon Inspector** | Gestion automatisée des vulnérabilités : analyse les instances EC2, les images de conteneur dans Amazon ECR et les fonctions Lambda à la recherche de vulnérabilités logicielles et d'expositions réseau involontaires | « find unpatched software (CVEs) on instances » |
| **AWS Security Hub** | Rassemble et priorise les résultats de GuardDuty, Inspector, Macie et d'autres services sur plusieurs comptes ; Security Hub CSPM vérifie les ressources au regard de normes comme CIS et PCI DSS | « single view of security findings », « security score against a standard » |
| **AWS Shield** | Protection DDoS : **Shield Standard** est automatique, sans frais supplémentaires ; **Shield Advanced** est payant, avec une protection renforcée, la Shield Response Team et une protection des coûts liés aux attaques DDoS | « protect against DDoS attacks » |
| **Amazon Macie** | Découvre et protège les données sensibles, comme les données personnelles, dans Amazon S3 | « find personally identifiable information in S3 buckets » |

> **Piège d'examen.** GuardDuty **détecte des menaces** dans les journaux d'activité ; Inspector **trouve des vulnérabilités** dans les logiciels ; Security Hub **agrège** les résultats. Aucun d'eux ne bloque le trafic : AWS WAF et AWS Shield le font (chapitre 24).

<!-- section: governance-services | objectives: 2.2.8 -->
## Les services qui contribuent à la gouvernance et à la conformité

| Objectif | Service | Ce qu'il indique |
| --- | --- | --- |
| Surveillance | **Amazon CloudWatch** | Les performances des ressources : métriques, journaux, alarmes |
| Audit de l'activité | **AWS CloudTrail** | Qui a fait quoi, quand et d'où |
| Audit de la configuration | **AWS Config** | La configuration actuelle et passée d'une ressource, et sa conformité aux règles |
| Rapports sur les accès | **Rapports d'accès** | Le **rapport sur les informations d'identification** (credential report) IAM liste chaque utilisateur IAM avec l'état de son mot de passe, de ses clés d'accès et de sa MFA ; les **informations de dernier accès** (last accessed information) montrent quels services une identité (ou, dans AWS Organizations, un compte) a utilisés et quand |
| Règles centrales | SCP d'**AWS Organizations**, contrôles d'**AWS Control Tower** | Ce que les comptes membres peuvent faire, et si les comptes suivent les bonnes pratiques |

<!-- section: key-points -->
## Points clés

- Au repos : S3 par défaut, EBS et RDS avec des clés KMS. En transit : TLS avec des certificats ACM, VPN. Clés : KMS ; matériel dédié : CloudHSM.
- Journaux : CloudTrail (appels d'API, 90 jours d'historique des événements, journaux de suivi vers S3), CloudWatch Logs, journaux de flux VPC, historique Config.
- AWS Artifact : rapports de conformité et accords d'AWS (BAA). Besoins liés à l'emplacement : choisir la Région ; GovCloud (US). Vérifier les services inclus dans le périmètre de chaque programme.
- GuardDuty : menaces ; Inspector : vulnérabilités ; Security Hub : agrégation ; Shield : DDoS ; Macie : données sensibles dans S3.
- CloudWatch surveille ; CloudTrail et Config auditent ; les rapports d'accès montrent les informations d'identification et les autorisations utilisées.
