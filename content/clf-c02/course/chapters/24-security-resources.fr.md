AWS vous fournit des briques de sécurité, une documentation de sécurité et des sources d'information sur les menaces, mais c'est vous qui les choisissez et les configurez. L'examen vous demande d'associer un besoin (bloquer une injection SQL, absorber une attaque DDoS, détecter une instance compromise, trouver un instantané public) au bon service AWS, de savoir où AWS publie ses informations de sécurité, et de vous souvenir que des produits de sécurité tiers sont aussi proposés sur AWS Marketplace.

<!-- section: security-capabilities | objectives: 2.4.1 -->
## Fonctions de sécurité proposées par AWS

Regroupez les services selon ce qu'ils protègent :

| Fonction | Services AWS |
| --- | --- |
| Identités et accès | AWS Identity and Access Management (IAM), AWS IAM Identity Center, Amazon Cognito (utilisateurs de vos applications), AWS Directory Service |
| Protection du réseau et des applications | Groupes de sécurité et ACL réseau, AWS WAF, AWS Shield, AWS Firewall Manager |
| Détection des menaces | Amazon GuardDuty |
| Découverte des vulnérabilités et des données sensibles | Amazon Inspector, Amazon Macie |
| Investigation et vue centralisée | Amazon Detective, AWS Security Hub et AWS Security Hub CSPM |
| Protection des données | AWS Key Management Service (AWS KMS), AWS CloudHSM, AWS Certificate Manager (ACM), AWS Secrets Manager |
| Audit et conformité | AWS CloudTrail, AWS Config, AWS Artifact |

- **Security Hub CSPM** vérifie vos ressources par rapport aux normes et bonnes pratiques de sécurité (gestion de la posture). **Security Hub** met en corrélation les résultats de Security Hub CSPM, d'Inspector, de Macie et de GuardDuty, priorise les problèmes critiques et propose des flux de réponse automatisés. AWS recommande d'activer les deux.
- Beaucoup de ces services sont intégrés et gratuits (Shield Standard, groupes de sécurité, IAM) ; d'autres sont payants et doivent être activés (GuardDuty, Inspector, Macie, Shield Advanced).

<!-- section: protection-services | objectives: 2.4.3 -->
## AWS WAF, AWS Shield, AWS Firewall Manager et Amazon GuardDuty

| Service | Ce qu'il fait | Exigence typique |
| --- | --- | --- |
| **AWS WAF** | Pare-feu d'applications web de couche 7 : règles qui autorisent, bloquent ou comptent les requêtes HTTP(S) selon l'adresse IP, le pays, le débit, des motifs d'injection SQL ou de script intersite (XSS) ; groupes de règles gérés | « Bloquer les attaques par injection SQL contre le site web » |
| **AWS Shield Standard** | Protection automatique contre les attaques DDoS courantes des couches réseau et transport (couches 3 et 4), pour tous les clients sans frais supplémentaires | « Protection DDoS de base sans coût supplémentaire » |
| **AWS Shield Advanced** | Abonnement payant : protection DDoS renforcée des ressources que vous choisissez, accès à la Shield Response Team, protection des coûts liés aux attaques DDoS | « Équipe de réponse DDoS 24 h/24, 7 j/7 » ou « se protéger des frais de mise à l'échelle causés par une attaque » |
| **AWS Firewall Manager** | Gestion centralisée des règles WAF, des protections Shield Advanced et des groupes de sécurité sur tous les comptes d'une organisation AWS Organizations, y compris les nouveaux comptes et ressources | « Appliquer les mêmes règles de pare-feu à chaque compte » |
| **Amazon GuardDuty** | Détection des menaces qui analyse en continu les événements CloudTrail, les journaux de flux VPC et les journaux DNS pour trouver une activité malveillante ou non autorisée ; produit des résultats (findings) | « Détecter du minage de cryptomonnaie ou des appels d'API inhabituels » |

- AWS WAF s'attache aux distributions Amazon CloudFront, aux Application Load Balancers, aux API REST Amazon API Gateway et à quelques autres services, pas directement à une instance EC2.
- Firewall Manager exige AWS Organizations : c'est un outil de gouvernance multicompte, pas un pare-feu en soi.
- GuardDuty trouve les menaces ; il ne les bloque pas. Amazon Inspector trouve les vulnérabilités logicielles ; Amazon Macie trouve les données sensibles dans Amazon S3.

> **Piège d'examen.** Shield protège contre les inondations DDoS ; WAF filtre les requêtes web selon leur contenu. « Injection SQL » ou « script intersite » mène toujours à AWS WAF, jamais à Shield. « Mêmes règles sur de nombreux comptes » ajoute Firewall Manager.

<!-- section: identifying-issues | objectives: 2.4.6 -->
## Identifier les problèmes de sécurité avec AWS Trusted Advisor et d'autres services

**AWS Trusted Advisor** inspecte votre compte et recommande des améliorations selon les bonnes pratiques AWS. Ses vérifications sont regroupées en six catégories : optimisation des coûts, performances, sécurité, tolérance aux pannes, limites de service et excellence opérationnelle.

| Plan de support | Vérifications Trusted Advisor |
| --- | --- |
| Basic Support | Toutes les vérifications de limites de service, plus une sélection de vérifications de sécurité et de tolérance aux pannes ; les vérifications de sécurité s'actualisent manuellement |
| Business Support+, Enterprise Support, Unified Operations | Toutes les vérifications, dans la console et via l'API Trusted Advisor |

Les vérifications de sécurité accessibles à tous les clients : **Amazon S3 Bucket Permissions** (compartiments ouverts), **Security Groups – Specific Ports Unrestricted**, **MFA on root account**, **Amazon EBS Public Snapshots** et **Amazon RDS Public Snapshots**.

Autres services qui identifient des problèmes de sécurité :

| Besoin | Service |
| --- | --- |
| Recommandations de bonnes pratiques sur les coûts, la sécurité et la résilience | AWS Trusted Advisor |
| Vulnérabilités logicielles (CVE) et exposition réseau involontaire des instances EC2, des images de conteneurs et des fonctions Lambda | Amazon Inspector |
| Activité malveillante dans le compte | Amazon GuardDuty |
| Ressources non conformes aux normes de sécurité | AWS Security Hub CSPM |
| Modifications de configuration et ressources non conformes à vos règles | AWS Config |

> **Conseil d'examen.** « Quel service vérifie si l'utilisateur racine a la MFA ou si un groupe de sécurité autorise un accès sans restriction, et est disponible avec Basic Support ? », c'est Trusted Advisor. Il recommande ; il n'analyse pas le système d'exploitation à la recherche de vulnérabilités (c'est le rôle d'Inspector).

<!-- section: marketplace-security | objectives: 2.4.4 -->
## Produits de sécurité tiers sur AWS Marketplace

**AWS Marketplace** est un catalogue numérique organisé de logiciels d'éditeurs indépendants (ISV), prêts à fonctionner sur AWS. Il comprend une catégorie sécurité : pare-feu et appliances de prévention des intrusions, protection des points de terminaison, gestion des vulnérabilités, identité et outils de gestion des informations et des événements de sécurité (SIEM).

- Vous trouvez un produit, vous vous y abonnez et vous le déployez dans votre compte, souvent sous forme d'AMI, de conteneur ou d'abonnement SaaS.
- Les frais apparaissent sur votre facture AWS.
- Utilisez-le quand l'entreprise a déjà standardisé un éditeur de sécurité, ou a besoin d'une fonction qu'elle préfère acheter à un partenaire.

> **Conseil d'examen.** « L'entreprise veut utiliser un produit de pare-feu tiers qu'elle connaît déjà » mène à AWS Marketplace, et non à la construction du produit vous-même.

<!-- section: security-information | objectives: 2.4.2, 2.4.5 -->
## Documentation de sécurité et sources d'information

| Source | Ce que vous y trouvez |
| --- | --- |
| **AWS Security Center** (la section sécurité du site web d'AWS) | Vue d'ensemble de la sécurité AWS, programmes de conformité, bulletins de sécurité, signalement d'une vulnérabilité |
| **AWS Security Blog** | Annonces, procédures pas à pas et bonnes pratiques rédigées par les experts sécurité d'AWS |
| **AWS Knowledge Center** (intégré à AWS re:Post) | Réponses aux questions les plus fréquentes des clients AWS, dont des procédures de sécurité et du dépannage |
| **Documentation AWS** | Un chapitre sécurité dans le guide de chaque service (par exemple, comment S3 chiffre les données) et l'index de la documentation de sécurité |
| **Pilier sécurité du cadre AWS Well-Architected**, livres blancs AWS | Principes de conception et bonnes pratiques pour sécuriser les charges de travail |
| **AWS Artifact** | Rapports de conformité à la demande (par exemple, rapports SOC et ISO) et accords |
| **AWS Trusted Advisor**, **Security Hub** | Recommandations et résultats concernant votre propre compte |

> **Piège d'examen.** AWS Artifact fournit les rapports de conformité d'AWS ; il n'évalue pas vos ressources. L'état de sécurité de votre propre compte vient de Trusted Advisor, de Security Hub ou d'AWS Config.

<!-- section: key-points -->
## Points clés

- WAF : filtrage web de couche 7 (injection SQL, XSS, IP, géographie, débit). Shield Standard : protection DDoS gratuite et automatique. Shield Advanced : payant, équipe de réponse et protection des coûts.
- Firewall Manager : les mêmes règles WAF, Shield Advanced et groupes de sécurité sur tous les comptes d'une organisation.
- GuardDuty détecte les menaces, Inspector trouve les vulnérabilités, Macie trouve les données sensibles, Security Hub donne la vue centrale et priorisée.
- Trusted Advisor : vérifications de bonnes pratiques en six catégories ; Basic Support obtient les limites de service plus une sélection de vérifications de sécurité (permissions S3, ports ouverts, MFA racine, instantanés EBS et RDS publics).
- Outils de sécurité tiers : AWS Marketplace, facturés par AWS.
- Information : Security Center, Security Blog, Knowledge Center, documentation des services, pilier sécurité Well-Architected, Artifact pour les rapports de conformité.
