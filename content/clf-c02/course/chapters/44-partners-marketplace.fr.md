AWS ne répond pas seul à tous les besoins. Les partenaires AWS créent des logiciels et mènent des projets sur AWS, AWS Marketplace permet d'acheter leurs logiciels via votre compte AWS, et les experts d'AWS peuvent aider à la conception ou à la réalisation. Les questions d'examen demandent vers qui se tourner (un partenaire, AWS Professional Services, un architecte de solutions) et ce qu'offre Marketplace.

<!-- section: partner-network | objectives: 4.3.3, 4.3.10 -->
## Le réseau de partenaires AWS et le rôle des partenaires AWS

L'**AWS Partner Network (APN)** est la communauté mondiale des entreprises qui utilisent AWS pour créer des solutions et des services pour les clients. AWS valide l'expertise des partenaires dans des secteurs, des cas d'usage ou des charges de travail avec les **AWS Specializations**.

| Type de partenaire | Ce qu'il fait pour les clients | Exemple |
| --- | --- | --- |
| **Fournisseur indépendant de logiciels (ISV)** | Crée et vend des **logiciels** qui s'exécutent sur AWS ou s'y intègrent, souvent proposés dans AWS Marketplace | L'appliance de pare-feu d'un éditeur de sécurité, un produit SaaS de supervision |
| **Intégrateur système (SI)** et partenaire de conseil | Fournit des **services** : évaluation, migration, mise en œuvre, modernisation, gestion continue | Un cabinet de conseil qui migre le centre de données d'une entreprise vers AWS |
| **Fournisseur de services gérés (MSP)** | Exploite l'environnement AWS du client dans la durée | Supervision et exploitation 24 h/24 et 7 j/7 |
| **Revendeur et distributeur** | Revend AWS aux clients (AWS Solution Provider Program, AWS Distributors) | Un revendeur régional |

- Les clients trouvent des partenaires avec l'**AWS Partner Solutions Finder**, en filtrant par secteur, cas d'usage, localisation ou spécialisation.
- **AWS Marketplace** est l'endroit où les ISV (et les partenaires de conseil) vendent leurs produits et leurs services professionnels aux clients AWS.

> **Conseil d'examen.** Un produit logiciel : un **ISV**, acheté dans AWS Marketplace. La réalisation concrète d'un projet par un tiers : un **intégrateur système** ou un partenaire de conseil.

<!-- section: partner-benefits | objectives: 4.3.11 -->
## Avantages d'être un partenaire AWS

Les entreprises rejoignent l'APN pour développer leur activité AWS. Les avantages dépendent des programmes auxquels le partenaire adhère :

- **Formation et certification** : cours et parcours d'apprentissage réservés aux partenaires sur AWS Skill Builder, ressources de préparation aux certifications, webinaires animés par des experts AWS.
- **Événements** : événements de mise en relation (matchmaking) entre partenaires, webinaires pour les partenaires et journées de formation virtuelles.
- **Financement et mise sur le marché** : incitations financières (par exemple l'AWS Migration Acceleration Program), ressources marketing, co-vente avec AWS et recommandations de clients.
- **Visibilité** : présence dans l'AWS Partner Solutions Finder et dans AWS Marketplace, AWS Specializations qui prouvent l'expertise auprès des clients.
- **Remises sur volume des partenaires** : le guide d'examen les cite parmi les avantages des partenaires.

<!-- section: marketplace | objectives: 4.3.12 -->
## AWS Marketplace

**AWS Marketplace** est un **catalogue numérique** sélectionné où les clients trouvent, essaient, achètent, déploient et gèrent des logiciels, des données et des services tiers qui s'exécutent sur AWS.

| Fonctionnalité | Ce que cela signifie pour le client |
| --- | --- |
| **Catalogue** | Offres sélectionnées d'ISV : applications SaaS, Amazon Machine Images (AMI), conteneurs, modèles AWS CloudFormation, ensembles de règles AWS WAF, produits de données, services professionnels |
| **Tarification flexible** | Produits gratuits et essais gratuits, tarification à l'heure, au mois, à l'année et pluriannuelle, contrats, apport de votre propre licence (BYOL) |
| **Offres privées** (private offers) | Prix et contrat de licence (EULA) personnalisés, négociés avec le vendeur et acceptés dans Marketplace |
| **Gestion des coûts** | AWS gère la facturation et le paiement : les achats apparaissent **sur la facture AWS** et AWS paie le vendeur ; les dépenses Marketplace se suivent donc avec les outils de facturation AWS, sans factures séparées de chaque fournisseur |
| **Gouvernance** | Un **Private Marketplace** est un catalogue sélectionné de produits approuvés : une fois activé, les utilisateurs ne peuvent s'abonner qu'aux produits qui y sont approuvés, et peuvent en demander d'autres |
| **Gestion des droits et des licences** | **AWS License Manager** gouverne les licences achetées dans Marketplace et distribue leurs droits d'utilisation (entitlements) aux comptes choisis de l'organisation |
| **Déploiement rapide** | Les produits s'exécutent dans votre propre compte et votre VPC, sur des instances On-Demand, Reserved ou Spot |

> **Piège d'examen.** AWS Marketplace vend des produits **tiers** facturés par AWS. Ce n'est pas la **place de marché des instances réservées**, où les clients revendent des instances réservées standard inutilisées.

<!-- section: technical-assistance | objectives: 4.3.13 -->
## Options d'assistance technique chez AWS

| Option | Qui | Ce qu'ils font |
| --- | --- | --- |
| **AWS Professional Services** | L'organisation de conseil propre à AWS | Aide à concevoir, créer, migrer et gérer des charges de travail (données et IA, migration, modernisation, sécurité, expertise sectorielle), en travaillant avec votre équipe et avec des partenaires AWS |
| **Architectes de solutions AWS** (solutions architects) | Experts techniques AWS de votre équipe de compte | Conseillent sur la conception de vos charges de travail sur AWS, aident à appliquer les bonnes pratiques Well-Architected, répondent aux questions d'architecture |
| **Technical Account Manager (TAM)** | Contact AWS désigné avec Enterprise Support et Unified Operations | Conseils proactifs, revues opérationnelles, coordination du support pour votre environnement |
| **Responsable de compte AWS** (account manager) | Contact commercial AWS | Relation commerciale, mise en relation avec des spécialistes et des programmes |
| **Partenaires AWS** | Partenaires de conseil et intégrateurs système | Mise en œuvre concrète, migration et services gérés |
| **AWS Support** | Ingénieurs du support cloud | Dépannage par des demandes de support (chapitre 43) |

Règles de décision :

- « Des conseils sur les bonnes pratiques d'architecture pour une nouvelle charge de travail » : **architectes de solutions AWS** (ou le Well-Architected Tool pour une auto-évaluation).
- « Des experts AWS pour aider notre équipe à mener une grande migration » : **AWS Professional Services** ou un **partenaire AWS**.
- « Un contact AWS nommé qui revoit nos opérations de façon proactive » : un **TAM**, avec Enterprise Support ou Unified Operations.
- « Corriger une erreur dans un service en cours d'exécution » : une demande **AWS Support**.

> **Piège d'examen.** AWS Professional Services est une équipe de conseil, pas un plan Support ni un service géré. Les plans Support apportent dépannage et conseils ; Professional Services et les partenaires réalisent des projets.

<!-- section: key-points -->
## Points clés

- APN : les ISV vendent des logiciels, les intégrateurs système et partenaires de conseil fournissent des services, les MSP exploitent des environnements, les revendeurs revendent AWS ; on les trouve avec le Partner Solutions Finder.
- Avantages partenaires : formation et certification, événements, financement et co-vente, visibilité, remises sur volume.
- AWS Marketplace : logiciels et services tiers facturés sur la facture AWS ; offres privées, Private Marketplace pour la gouvernance, droits gérés avec License Manager.
- Professional Services : consultants AWS pour les projets. Architectes de solutions : conseils de conception. TAM : Enterprise Support ou Unified Operations.
