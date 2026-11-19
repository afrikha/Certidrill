Les questions sur les charges de travail sécurisées partent d'une architecture applicative (niveau web, niveau application, base de données, parfois un site local) et demandent comment supprimer les informations d'identification stockées, garder le trafic privé, filtrer ce qui atteint chaque niveau ou bloquer une attaque. Ce chapitre couvre les informations d'identification et la configuration, les points de terminaison de service, les contrôles du trafic dans un VPC, la segmentation réseau, la protection en périphérie contre les menaces externes, les services de sécurité et leurs cas d'utilisation, et les connexions sécurisées vers les réseaux locaux.

<!-- section: credentials-config | objectives: 1.2.1 -->
## Informations d'identification et configuration des applications

La règle : **aucune information d'identification à long terme dans le code, les AMI, les variables d'environnement ou les fichiers de configuration**. Les charges de travail reçoivent des informations d'identification temporaires d'un rôle (profil d'instance sur EC2, rôle de tâche sur ECS, rôle d'exécution sur Lambda), fournies automatiquement et renouvelées par AWS. Sur EC2, exigez **IMDSv2** (`HttpTokens` à `required`), qui protège le service de métadonnées d'instance, et donc les informations d'identification du rôle, contre la falsification de requête côté serveur (SSRF) ; un paramètre par défaut au niveau du compte, par Région, l'applique aux nouvelles instances.

Les secrets inévitables (un mot de passe de base de données, une clé d'API tierce) vont dans un magasin géré :

| Fonctionnalité | AWS Secrets Manager | Systems Manager Parameter Store |
| --- | --- | --- |
| Usage principal | Identifiants de base de données, clés d'API, jetons | Valeurs de configuration, indicateurs de fonctionnalité, points de terminaison ; `SecureString` pour les valeurs sensibles |
| Chiffrement | Toujours, avec AWS KMS | Paramètres `SecureString`, avec AWS KMS |
| Rotation automatique | Oui : rotation gérée (identifiants principaux d'Amazon RDS, Aurora, Redshift, DocumentDB) ou fonction de rotation Lambda ; jusqu'à toutes les 4 heures | Aucune |
| Coût | Par secret et par mois, plus les appels d'API | Niveau standard gratuit (jusqu'à 10 000 paramètres, 4 Ko) ; niveau avancé payant (8 Ko, politiques de paramètres, partage entre comptes) |
| Autres | Réplication d'un secret vers d'autres Régions, politiques basées sur les ressources | Hiérarchies (`/app/prod/db-endpoint`), intégration avec CloudFormation et ECS |

```bash
# The application reads the secret at runtime with its role; nothing is stored in the code
aws secretsmanager get-secret-value --secret-id prod/orders/db
```

> **Piège d'examen.** « Faire tourner automatiquement le mot de passe de la base tous les 30 jours avec le moins de charge opérationnelle » désigne Secrets Manager. Un `SecureString` de Parameter Store chiffre mais ne tourne jamais ; une fonction Lambda planifiée pour le mettre à jour est justement la charge que le qualificatif exclut.

<!-- section: service-endpoints | objectives: 1.2.2 -->
## Les points de terminaison de service AWS

Chaque service AWS est joint par des **points de terminaison de service** publics (`s3.eu-west-1.amazonaws.com`), en HTTPS. Une ressource d'un sous-réseau privé les atteint par une passerelle NAT, ou de façon privée par un **point de terminaison de VPC** :

| | Point de terminaison de passerelle | Point de terminaison d'interface (AWS PrivateLink) |
| --- | --- | --- |
| Services | Amazon S3 et DynamoDB uniquement | La plupart des services AWS (dont S3 et DynamoDB), services de point de terminaison d'autres comptes, SaaS de partenaires |
| Fonctionnement | Une route vers la liste de préfixes du service dans les tables de routage choisies | Des interfaces réseau Elastic avec des adresses IP privées dans vos sous-réseaux |
| Coût | Gratuit | À l'heure par zone de disponibilité, plus les données traitées |
| Accessible depuis un site local (VPN, Direct Connect) ou des VPC appairés | Non | Oui |
| Contrôle d'accès | Politique de point de terminaison | Politique de point de terminaison et groupes de sécurité |

Une **politique de point de terminaison** limite l'usage du point de terminaison (par exemple aux seuls compartiments de l'entreprise), et une politique de compartiment peut exiger le point de terminaison avec `aws:SourceVpce`. Le DNS privé des points de terminaison d'interface permet aux applications de garder les noms de service par défaut, donc sans modifier le code.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnlessThroughVpcEndpoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-corp-records", "arn:aws:s3:::example-corp-records/*"],
      "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-0a1b2c3d4e5f67890" } }
    }
  ]
}
```

> **Piège d'examen.** « Des instances d'un sous-réseau privé doivent atteindre S3 sans internet, au moindre coût » désigne un point de terminaison de passerelle. Si le trafic vient d'un site local par Direct Connect, un point de terminaison de passerelle est inutilisable : choisissez un point de terminaison d'interface S3.

<!-- section: vpc-traffic-controls | objectives: 1.2.3, 1.2.7 -->
## Contrôler les ports, les protocoles et le trafic dans un VPC

| | Groupe de sécurité | Liste ACL réseau |
| --- | --- | --- |
| S'applique à | Des interfaces réseau (instances, équilibreurs de charge, points de terminaison, Lambda dans un VPC) | Un sous-réseau : toutes ses ressources |
| Règles | Autorisation uniquement | Autorisation et refus, numérotées, la première correspondance l'emporte |
| État | Avec état : le trafic de retour est autorisé automatiquement | Sans état : le trafic de retour exige sa propre règle (ports éphémères 1024–65535) |
| Par défaut | Nouveau groupe : aucune règle entrante, tout le trafic sortant autorisé | L'ACL par défaut autorise tout ; une nouvelle ACL personnalisée refuse tout |
| Usage type | Autoriser le 443 depuis le groupe de sécurité de l'équilibreur de charge vers le niveau application | Bloquer une plage d'IP malveillante pour tout un sous-réseau |

Un groupe de sécurité peut référencer **d'autres groupes de sécurité** comme source : « autoriser le 3306 uniquement depuis le groupe de sécurité du niveau application » continue de fonctionner quand les instances augmentent ou diminuent, sans adresse IP à maintenir. Les ACL réseau ne peuvent référencer ni groupes de sécurité ni listes de préfixes, et ne filtrent pas le trafic vers le résolveur DNS Amazon ni vers le service de métadonnées d'instance.

Autres composants d'un VPC sécurisé :

| Composant | Rôle |
| --- | --- |
| Table de routage | Décide où va le trafic d'un sous-réseau ; une route vers une passerelle Internet rend le sous-réseau public |
| Passerelle Internet | Accès internet bidirectionnel pour les ressources dotées d'adresses IP publiques |
| Passerelle NAT | Accès internet IPv4 sortant uniquement pour les sous-réseaux privés ; aucune connexion ne peut être initiée depuis internet |
| Passerelle Internet de sortie uniquement | Accès sortant uniquement pour IPv6 |
| AWS Network Firewall | Pare-feu avec état et prévention des intrusions gérés pour un VPC : filtrage de domaines, inspection approfondie des paquets |
| Route 53 Resolver DNS Firewall | Bloque les requêtes DNS vers des domaines malveillants ou non approuvés |
| Journaux de flux VPC | Enregistrent le trafic IP accepté et rejeté pour analyse |

Une **passerelle NAT zonale** se trouve dans un sous-réseau public d'une zone de disponibilité et exige une adresse IP Elastic ; pour la haute disponibilité, créez-en une par zone et faites pointer la table de routage privée de chaque zone vers la sienne. Une **passerelle NAT régionale** n'a pas besoin de sous-réseau public, s'étend automatiquement à chaque zone où vous avez des charges de travail et s'utilise avec une seule entrée de route pour toutes les zones ; elle ne prend pas en charge le NAT privé.

> **Piège d'examen.** Une seule passerelle NAT zonale partagée par toutes les zones est un point de défaillance unique et ajoute des frais de transfert entre zones. « Accès internet sortant hautement disponible » signifie une passerelle NAT zonale par zone de disponibilité, ou une passerelle NAT régionale.

<!-- section: segmentation | objectives: 1.2.8 -->
## La segmentation du réseau

Un **sous-réseau public** a une route vers une passerelle Internet ; un **sous-réseau privé** n'en a pas. Segmentez par niveau, sur au moins deux zones de disponibilité :

| Niveau | Sous-réseau | Trafic entrant autorisé depuis |
| --- | --- | --- |
| Équilibreur de charge, passerelle NAT (zonale) | Public | Internet, sur le 443 |
| Instances d'application, conteneurs | Privé, avec une route vers une passerelle NAT si des mises à jour ou des API sont nécessaires | Le groupe de sécurité de l'équilibreur de charge |
| Base de données | Privé, sans route vers internet | Le groupe de sécurité du niveau application |

- Administrez les instances sans bastion : **Systems Manager Session Manager** n'exige aucun port entrant ni clé SSH, et journalise les sessions ; les instances privées l'atteignent par une passerelle NAT ou par des points de terminaison d'interface.
- Séparez environnements ou divisions avec des VPC et des comptes distincts. Reliez-les par **appairage de VPC** (non transitif, un à un) ou par **AWS Transit Gateway** (concentrateur, avec des tables de routage qui isolent par exemple le développement de la production).
- Exposez un service à d'autres VPC sans ouvrir les réseaux les uns aux autres : **AWS PrivateLink** (un Network Load Balancer derrière un service de point de terminaison).

> **Conseil d'examen.** « La base de données ne doit pas être joignable depuis internet » se résout par l'emplacement (sous-réseau privé sans route vers une passerelle Internet) plus un groupe de sécurité qui n'autorise que le niveau application. Une ACL réseau seule ne rend pas un sous-réseau privé.

<!-- section: edge-protection | objectives: 1.2.4, 1.2.6, 1.2.9 -->
## Protéger les applications contre les menaces externes

| Menace | Couche | Réponse AWS |
| --- | --- | --- |
| DDoS volumétriques et protocolaires (inondations SYN, réflexion UDP) | 3 et 4 | AWS Shield Standard, automatique et gratuit ; CloudFront, Route 53 et Global Accelerator absorbent les attaques en périphérie |
| Inondations HTTP | 7 | Règles basées sur le débit d'AWS WAF ; atténuation automatique de couche application de Shield Advanced |
| Injection SQL, cross-site scripting | 7 | Groupes de règles gérés d'AWS WAF (ensemble de règles de base, règles pour bases SQL) |
| Robots, scrapers, bourrage d'identifiants | 7 | AWS WAF Bot Control, actions CAPTCHA et challenge |
| Trafic de certains pays ou adresses IP | 7 | Règles de correspondance géographique et d'ensembles d'IP d'AWS WAF |

Les packs de protection (ACL web) d'**AWS WAF** s'associent aux distributions CloudFront, aux Application Load Balancers, aux API REST d'API Gateway, aux API AWS AppSync, aux groupes d'utilisateurs Amazon Cognito, aux services AWS App Runner, aux instances AWS Verified Access et aux applications AWS Amplify. Ils ne s'associent ni à un Network Load Balancer ni à une instance EC2 : placez CloudFront ou un ALB devant.

| | AWS Shield Standard | AWS Shield Advanced |
| --- | --- | --- |
| Coût | Inclus pour tous les clients | Abonnement, facturé au compte payeur de l'organisation et couvrant tous les comptes abonnés |
| Ressources | Toutes, avec la meilleure protection sur CloudFront, Route 53 et Global Accelerator | Les ressources que vous protégez explicitement : CloudFront, zones hébergées Route 53, Global Accelerator, adresses IP Elastic (EC2, NLB), ALB, Classic Load Balancer |
| En plus | Rien | Atténuation automatique des DDoS de couche application, frais AWS WAF standard couverts pour les ressources protégées, Shield Response Team, protection des coûts liés aux DDoS |

Un accès sécurisé aux applications, c'est aussi :

- **HTTPS uniquement** : écouteurs TLS sur l'ALB ou CloudFront avec des certificats ACM, HTTP redirigé vers HTTPS.
- **Authentification sur l'équilibreur de charge** : un écouteur HTTPS d'ALB peut authentifier les utilisateurs avec un groupe d'utilisateurs Amazon Cognito ou tout fournisseur OIDC avant de transmettre les requêtes, sans code dans l'application.
- **Origines privées** : le **contrôle d'accès à l'origine (OAC)** de CloudFront permet à la seule distribution de lire un compartiment S3 ; le compartiment reste privé.
- **Gestion centralisée** : **AWS Firewall Manager** applique les règles WAF, les protections Shield Advanced, les groupes de sécurité et les politiques Network Firewall à tous les comptes de l'organisation, nouveaux comptes compris.

> **Piège d'examen.** Shield Standard protège déjà chaque client contre les attaques courantes de couches 3 et 4. Ne choisissez Shield Advanced que si l'énoncé demande l'assistance d'une équipe de réponse DDoS, une protection contre les coûts de mise à l'échelle ou une protection avancée de ressources précises.

<!-- section: security-services | objectives: 1.2.5, 1.2.9 -->
## Les services de sécurité et leurs cas d'utilisation

| Service | Ce qu'il fait | Mot-clé de l'énoncé |
| --- | --- | --- |
| Amazon GuardDuty | Détection des menaces à partir des événements de gestion CloudTrail, des journaux de flux VPC et des journaux DNS (sans configurer ces sources), plus des plans de protection facultatifs (S3, EKS, exécution, logiciels malveillants, RDS, Lambda) ; produit des résultats, ne bloque rien | « détecter des instances compromises, du minage de cryptomonnaie, des appels d'API inhabituels » |
| Amazon Macie | Découvre les données sensibles (PII, données financières, identifiants) dans les compartiments S3 et évalue leur sécurité | « trouver des PII dans S3 » |
| Amazon Inspector | Analyse continue des vulnérabilités des instances EC2, des images de conteneur ECR et des fonctions Lambda : CVE et exposition réseau involontaire | « rechercher les vulnérabilités logicielles » |
| Amazon Detective | Enquête sur la cause première des résultats avec des graphes construits à partir des journaux | « enquêter », « cause première » |
| AWS Security Hub | Corrèle et hiérarchise les résultats de GuardDuty, Inspector, Macie, Security Hub CSPM et IAM Access Analyzer ; Security Hub CSPM vérifie les ressources par rapport à des normes (AWS Foundational Security Best Practices, CIS, PCI DSS) | « vue unique des résultats de sécurité de tous les comptes » |
| Amazon Cognito | Les groupes d'utilisateurs authentifient les utilisateurs d'une application et émettent des JWT ; les groupes d'identités échangent des jetons contre des informations d'identification AWS temporaires | « les utilisateurs de l'application mobile se connectent », « connexion par réseau social » |
| AWS Secrets Manager | Stocke les secrets et en fait la rotation | « rotation des identifiants » |
| IAM Identity Center | Connexion du personnel aux comptes et applications AWS | « employés », « authentification unique » |
| AWS WAF, AWS Shield, AWS Firewall Manager, AWS Network Firewall | Filtrage de couche 7 ; protection DDoS ; gestion centralisée des politiques ; pare-feu avec état au niveau du VPC | Voir les sections précédentes |

Les services de détection alimentent **Amazon EventBridge** : une règle sur un résultat GuardDuty peut lancer une fonction Lambda ou une automatisation Systems Manager qui isole une instance. C'est ainsi qu'on répond à une exigence « détecter et réagir automatiquement ».

> **Piège d'examen.** GuardDuty trouve des menaces ; Inspector trouve des vulnérabilités ; Macie trouve des données sensibles. Aucun ne bloque le trafic à lui seul.

<!-- section: hybrid-connections | objectives: 1.2.10 -->
## Sécuriser les connexions avec les réseaux locaux

| Option | Ce que c'est | Sécurité et performances |
| --- | --- | --- |
| AWS Site-to-Site VPN | Tunnels IPsec sur internet entre un dispositif de passerelle client et une passerelle réseau privé virtuel (un VPC) ou une passerelle de transit | Deux tunnels par connexion pour la redondance ; jusqu'à 1,25 Gbit/s par tunnel, jusqu'à 5 Gbit/s avec les tunnels à large bande passante sur une passerelle de transit ; mis en place en quelques minutes |
| Site-to-Site VPN accéléré | Le VPN entre dans le réseau AWS à la périphérie la plus proche par AWS Global Accelerator | Latence plus faible et plus régulière pour les sites éloignés ; attachements de passerelle de transit uniquement |
| AWS Direct Connect | Une connexion privée dédiée ou hébergée depuis un emplacement Direct Connect vers AWS | Bande passante et latence régulières, sans passer par internet ; le trafic n'est pas chiffré par IPsec, ajoutez MACsec ou un VPN pour le chiffrement |
| MACsec sur Direct Connect | Chiffrement de couche 2 sur la liaison entre votre routeur et AWS | Connexions dédiées de 10, 100 et 400 Gbit/s dans certains emplacements ; pas sur les connexions hébergées |
| VPN à IP privée sur Direct Connect | IPsec sur une interface virtuelle de transit Direct Connect vers une passerelle de transit, avec des adresses IP privées | Chiffrement de bout en bout sur Direct Connect sans adresse IP publique |
| AWS Client VPN | Accès à distance géré, basé sur OpenVPN, pour les utilisateurs individuels | Authentification par Active Directory, fédération SAML ou certificats mutuels ; règles d'autorisation par groupe |

| Exigence | Réponse |
| --- | --- |
| Connexion chiffrée au VPC, rapidement, à faible coût | Site-to-Site VPN |
| Connectivité privée régulière à haut débit | Direct Connect |
| Connectivité privée et de plus chiffrée | Direct Connect avec MACsec, ou un VPN sur Direct Connect |
| Chemin de secours si la connexion Direct Connect tombe | Site-to-Site VPN en secours, ou une deuxième connexion Direct Connect dans un autre emplacement |
| Des employés à distance atteignent des applications privées | Client VPN |

> **Piège d'examen.** Direct Connect est privé, pas chiffré. « Les données en transit doivent être chiffrées sur la connexion dédiée » élimine Direct Connect seul.

<!-- section: key-points -->
## Points clés

- Des rôles et IMDSv2 au lieu de clés stockées ; Secrets Manager fait la rotation, Parameter Store non.
- Points de terminaison de passerelle : S3 et DynamoDB, gratuits, tables de routage, inaccessibles depuis un site local. Points de terminaison d'interface : PrivateLink, facturés à l'heure, accessibles depuis un site local.
- Groupes de sécurité : avec état, autorisation uniquement, peuvent se référencer. ACL réseau : sans état, règles ordonnées d'autorisation et de refus par sous-réseau.
- Une passerelle NAT zonale par zone de disponibilité, ou une passerelle NAT régionale, pour la haute disponibilité.
- Sous-réseau public = route vers une passerelle Internet ; bases de données en sous-réseaux privés ; Session Manager au lieu de bastions.
- Shield Standard est gratuit et automatique ; WAF bloque injection SQL, XSS et inondations sur CloudFront, ALB et API Gateway, jamais sur un NLB.
- GuardDuty les menaces, Inspector les vulnérabilités, Macie les données sensibles, Security Hub l'agrégation.
- Le VPN est chiffré sur internet ; Direct Connect est privé mais exige MACsec ou un VPN pour le chiffrement.
