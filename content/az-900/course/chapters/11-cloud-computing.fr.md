Le cloud computing change qui possède le matériel, qui est responsable de quoi et la façon de payer. Ces trois idées traversent tout l'examen.

<!-- section: define-cloud | objectives: 1.1.1 -->
## Ce qu'est le cloud computing

Le **cloud computing** est la fourniture de services informatiques par internet : serveurs, stockage, bases de données, réseau, logiciels, analytique et intelligence artificielle. Au lieu d'acheter et d'exploiter du matériel, vous louez de la capacité à un fournisseur comme Microsoft et vous l'utilisez à la demande.

Ce qui découle de cette définition :

- Vous n'attendez ni achat ni installation : une ressource est prête en quelques minutes.
- Vous n'êtes pas limité par la capacité physique d'un centre de données qui vous appartient : vous ajoutez des ressources quand la demande augmente et vous les libérez ensuite.
- Le fournisseur entretient les bâtiments, le matériel et le réseau physique.

<!-- section: shared-responsibility | objectives: 1.1.2 -->
## Le modèle de responsabilité partagée

Dans votre propre centre de données, vous êtes responsable de tout. Dans le cloud, les responsabilités sont **partagées** entre le fournisseur et vous, et la répartition dépend du type de service.

| Responsabilité | Local | IaaS | PaaS | SaaS |
| --- | --- | --- | --- | --- |
| Informations et données | Vous | Vous | Vous | Vous |
| Appareils (téléphones, ordinateurs) | Vous | Vous | Vous | Vous |
| Comptes et identités | Vous | Vous | Vous | Vous |
| Infrastructure d'identité et d'annuaire | Vous | Vous | Partagée | Partagée |
| Applications | Vous | Vous | Partagée | Fournisseur |
| Contrôles réseau | Vous | Vous | Partagée | Fournisseur |
| Système d'exploitation | Vous | Vous | Fournisseur | Fournisseur |
| Hôtes physiques, réseau physique, centre de données physique | Vous | Fournisseur | Fournisseur | Fournisseur |

Deux lignes à mémoriser :

- **Vous êtes toujours responsable** de vos informations et données, des appareils qui se connectent au cloud, et des comptes et identités de vos utilisateurs.
- **Le fournisseur est toujours responsable** du centre de données physique, du réseau physique et des hôtes physiques.

> **Piège d'examen.** « Qui applique les correctifs du système d'exploitation ? » dépend du service. Sur une machine virtuelle (IaaS), c'est vous. Sur Azure App Service ou Azure SQL Database (PaaS), c'est Microsoft.

<!-- section: cloud-models | objectives: 1.1.3, 1.1.4 -->
## Les modèles de cloud et leurs cas d'usage

| Modèle | Définition | Points forts | Cas d'usage type |
| --- | --- | --- | --- |
| **Cloud public** | Construit, contrôlé et entretenu par un fournisseur tiers ; n'importe qui peut acheter ses services | Aucune dépense d'investissement pour monter en charge, mise à disposition rapide, paiement à l'usage | Une nouvelle application, une jeune entreprise, des charges variables |
| **Cloud privé** | Utilisé par une seule organisation, dans son propre centre de données ou hébergé par un tiers | Contrôle complet des ressources et de la sécurité | Contraintes réglementaires ou légales strictes, données qui ne peuvent pas quitter les locaux |
| **Cloud hybride** | Clouds public et privé interconnectés | Le plus de souplesse : chaque charge s'exécute là où elle convient le mieux ; le cloud public absorbe les pics | Garder les données sensibles en local tout en publiant un site web depuis le cloud public ; migration progressive |

Par rapport au cloud public, un cloud privé suppose du matériel à acheter au départ puis à entretenir : l'organisation est responsable de la maintenance et des mises à jour.

Le **multicloud** consiste à utiliser plusieurs fournisseurs de cloud public à la fois. **Azure Arc** aide à gérer depuis Azure des environnements hybrides et multiclouds, et **Azure VMware Solution** exécute dans Azure des charges VMware existantes.

<!-- section: consumption-model | objectives: 1.1.5 -->
## Le modèle basé sur la consommation

Les dépenses informatiques se rangent en deux catégories :

| | Dépenses d'investissement (CapEx) | Dépenses d'exploitation (OpEx) |
| --- | --- | --- |
| Nature | Achat ponctuel et initial de ressources tangibles | Argent dépensé en services au fil du temps |
| Exemples | Construire un centre de données, acheter des serveurs | Louer une salle de réunion, un véhicule, des services cloud |

Le cloud computing relève des **dépenses d'exploitation** : il fonctionne selon un modèle basé sur la consommation.

- Aucun coût initial.
- Pas besoin d'acheter et de gérer une infrastructure qui ne serait pas pleinement utilisée.
- Vous ne payez des ressources supplémentaires que lorsque vous en avez besoin.
- Vous cessez de payer les ressources dont vous n'avez plus besoin.

Dans un centre de données traditionnel, il faut deviner les besoins futurs. Si vous surestimez, vous payez des serveurs inactifs ; si vous sous-estimez, les performances en souffrent. Le cloud supprime ce pari.

<!-- section: pricing-models | objectives: 1.1.6 -->
## Les modèles tarifaires du cloud

| Modèle | Principe | Convient à |
| --- | --- | --- |
| **Paiement à l'utilisation** (pay-as-you-go) | Facturation de ce qui est consommé, à la seconde, à l'heure ou au gigaoctet ; sans engagement | Charges imprévisibles ou de courte durée |
| **Capacité réservée** (réservations, plans d'économies) | Engagement d'un ou trois ans en échange d'une remise importante | Charges stables et prévisibles, qui tournent en continu |
| **Spot** | Utilisation de la capacité inutilisée d'Azure avec une forte remise ; Azure peut reprendre la capacité à tout moment | Charges qui tolèrent l'interruption : traitements par lots, tests |
| **Services gratuits** | Certains services ont un niveau gratuit ou une quantité mensuelle gratuite | Apprentissage, prototypes |

Autres leviers : **Azure Hybrid Benefit** réutilise des licences Windows Server et SQL Server existantes, et les prix varient selon la région.

<!-- section: serverless | objectives: 1.1.7 -->
## Le serverless

Dans le calcul **serverless**, les serveurs existent toujours, mais vous ne les voyez ni ne les gérez jamais. Vous fournissez du code ou un flux de travail ; la plateforme l'exécute.

| Caractéristique | Sens |
| --- | --- |
| Aucune gestion d'infrastructure | Aucun serveur à provisionner, à corriger ou à dimensionner |
| Mise à l'échelle pilotée par les événements | La plateforme ajoute des instances quand des événements arrivent et les retire ensuite, jusqu'à zéro |
| Paiement à l'usage | Facturation des exécutions et des ressources consommées, pas du temps d'inactivité |

Exemples Azure : **Azure Functions** (du code déclenché par un événement), **Azure Logic Apps** (des flux de travail construits sans code), **Azure Container Apps** (des conteneurs serverless).

<!-- section: key-points -->
## Points clés

- Cloud computing = services informatiques fournis par internet, à la demande.
- Toujours à vous : données, appareils, comptes et identités. Toujours au fournisseur : centre de données, réseau et hôtes physiques.
- Public (appartient au fournisseur, pas de CapEx), privé (une seule organisation, contrôle total), hybride (les deux, le plus souple).
- Le cloud est de l'OpEx : aucun coût initial, paiement à l'usage, arrêt du paiement quand l'usage s'arrête.
- Paiement à l'utilisation pour les besoins variables, réservations pour les besoins stables, Spot pour les charges interruptibles.
- Serverless : aucune gestion de serveur, mise à l'échelle automatique, paiement à l'exécution.
