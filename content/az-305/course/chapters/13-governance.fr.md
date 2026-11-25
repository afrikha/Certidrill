Les questions de gouvernance demandent comment organiser les abonnements pour qu'une règle soit posée une fois puis héritée, comment imposer et prouver la conformité, et comment empêcher les droits d'accès de s'accumuler. Les réponses combinent la hiérarchie des ressources, les étiquettes, Azure Policy et Microsoft Entra ID Governance.

<!-- section: hierarchy | objectives: 1.3.1 -->
## Les groupes d'administration

Les groupes d'administration se placent au-dessus des abonnements. Les attributions Azure Policy et les attributions de rôles Azure RBAC faites sur un groupe d'administration sont héritées par tous les groupes d'administration, abonnements, groupes de ressources et ressources situés en dessous. La référence des zones d'atterrissage Azure de Cloud Adoption Framework ressemble à ceci :

```text
Tenant root group
└── Contoso                   (intermediate root: policies for the whole organization)
    ├── Platform
    │   ├── Management        (subscription: Log Analytics workspace, automation)
    │   ├── Connectivity      (subscription: hubs, firewalls, private DNS zones)
    │   ├── Identity          (subscription: domain controllers)
    │   └── Security          (subscription: Microsoft Sentinel)
    ├── Landing zones
    │   ├── Corp              (subscriptions: workloads connected to the corporate network)
    │   └── Online            (subscriptions: internet-facing workloads)
    ├── Sandbox               (subscriptions: experiments, relaxed policies)
    └── Decommissioned        (canceled subscriptions)
```

| Règle | Valeur |
| --- | --- |
| Hiérarchies par locataire Microsoft Entra | Une seule, sous le groupe racine du locataire |
| Profondeur | Six niveaux, sans compter la racine ni le niveau des abonnements |
| Groupes d'administration par locataire | 10 000 |
| Parents | Exactement un par groupe d'administration et par abonnement |
| Nouveaux abonnements | Placés sous la racine, sauf si un groupe d'administration par défaut est configuré |
| Accès à la racine | Personne par défaut ; un Global Administrator peut élever son accès |

Recommandations de conception :

- Gardez une hiérarchie **plate** : trois à quatre niveaux.
- Construisez-la sur les **exigences de stratégie et d'accès** (des charges de travail soumises aux mêmes règles), pas sur l'organigramme, ni sur les régions, ni sur les environnements. La production, le test et le développement sont des abonnements distincts dans le même groupe d'administration.
- N'attribuez rien sur le groupe racine du locataire : créez une racine intermédiaire et attribuez à ce niveau, pour que des exceptions restent possibles.
- Configurez un **groupe d'administration par défaut** (le bac à sable, par exemple) pour que les nouveaux abonnements n'arrivent jamais à la racine, et exigez une autorisation pour créer des groupes d'administration : par défaut, n'importe quel principal du locataire peut en créer un.
- Donnez aux équipes de charges de travail leurs rôles sur l'abonnement ou le groupe de ressources, pas sur un groupe d'administration.

> **Piège d'examen.** Les verrous de ressources ne s'appliquent pas à un groupe d'administration : leurs étendues sont l'abonnement, le groupe de ressources et la ressource. Azure Policy et Azure RBAC sont les deux contrôles qu'un groupe d'administration propage.

<!-- section: subscriptions-resource-groups | objectives: 1.3.1 -->
## Abonnements et groupes de ressources

Un abonnement est une unité de gestion, de facturation et de mise à l'échelle, et une limite pour les stratégies et les quotas. Il n'est pas lié à une région.

| Raison d'ajouter un abonnement | Exemple |
| --- | --- |
| Environnement géré différemment | La production avec des stratégies strictes ; le développement avec des stratégies assouplies et d'autres administrateurs |
| Limite de stratégie ou de conformité | Une charge de travail soumise à PCI DSS |
| Mise à l'échelle | Une grosse charge de travail qui épuiserait les limites d'un abonnement partagé |
| Facturation | Une entité qui doit recevoir sa propre facture |
| Fonction de plateforme | Gestion, connectivité, identité et sécurité, chacune dans son abonnement |

Raisons insuffisantes : un abonnement par région (seule la souveraineté des données le justifie) ou par petite application. Pour la refacturation à l'intérieur d'un abonnement, les étiquettes suffisent. Les grandes organisations automatisent la création avec la **distribution automatisée d'abonnements** (subscription vending) : une demande produit un abonnement déjà placé dans le bon groupe d'administration, avec ses stratégies, ses rôles et son réseau. Les stratégies d'abonnement contrôlent les transferts d'annuaire : depuis le 1er mai 2026, les abonnements ne peuvent plus quitter l'annuaire ni y entrer sans l'autorisation d'un Global Administrator (*Allow no users* est la valeur par défaut quand aucune stratégie n'a été définie). Seul un Global Administrator disposant d'une attribution directe, après élévation de son accès, modifie ces stratégies, et il peut exempter des utilisateurs précis.

Les groupes de ressources suivent d'autres règles :

| Règle | Conséquence pour la conception |
| --- | --- |
| Les ressources d'un groupe partagent un cycle de vie | Regroupez ce qui est déployé, mis à jour et supprimé ensemble ; une base de données partagée qui a son propre cycle de vie va dans un autre groupe |
| Une ressource appartient à un seul groupe et peut être déplacée | Réorganiser est possible, mais les attributions de rôles directes sont à recréer |
| L'emplacement du groupe est celui où ses métadonnées sont stockées | Choisissez-le selon la résidence des données ; les ressources peuvent être dans d'autres régions, même si la même région est recommandée |
| Un groupe est une étendue pour les rôles, les stratégies, les verrous et l'analyse des coûts | Un groupe par application et par environnement simplifie la délégation et la lecture des coûts |
| Supprimer le groupe supprime tout son contenu | Placez un verrou `CanNotDelete` sur les groupes des ressources critiques |

<!-- section: tagging | objectives: 1.3.1 -->
## Stratégie d'étiquetage

Les étiquettes sont des paires nom-valeur pour ce que la hiérarchie ne peut pas exprimer : centres de coûts, propriétaires, criticité. Faits qui décident des réponses :

- Jusqu'à **50** étiquettes par ressource, groupe de ressources ou abonnement ; nom jusqu'à 512 caractères (128 pour les comptes de stockage), valeur jusqu'à 256.
- Les noms d'étiquettes ne respectent pas la casse, les valeurs la respectent : convenez d'une seule écriture.
- Les étiquettes ne sont **pas héritées** : une ressource ne reçoit pas les étiquettes de son groupe de ressources ni de son abonnement.
- Les étiquettes sont stockées en texte clair et apparaissent dans les rapports de coûts : n'y mettez jamais de secrets. Certains types de ressources ne prennent pas en charge les étiquettes.
- Le rôle Tag Contributor gère les étiquettes sans donner accès aux ressources.

| Catégorie | Objectif | Exemples |
| --- | --- | --- |
| Fonctionnelle | Rôle de la ressource dans la charge de travail | `app`, `tier`, `env` |
| Classification | Sensibilité et niveau de service | `confidentiality`, `criticality`, `sla` |
| Comptabilité | Refacturation et budgets | `costcenter`, `department`, `program` |
| Finalité | Lien avec le processus métier | `businessprocess`, `businessimpact` |
| Propriété | Qui en répond | `businessunit`, `opsteam` |

Une stratégie d'étiquetage qui repose sur les personnes n'en est pas une ; imposez-la avec Azure Policy :

| Exigence | Stratégie intégrée | Effet |
| --- | --- | --- |
| Refuser les ressources créées sans étiquette `costcenter` | Require a tag on resources | `deny` |
| Les ressources doivent porter le `costcenter` de leur groupe de ressources, ressources existantes comprises | Inherit a tag from the resource group | `modify`, avec une tâche de correction pour les ressources existantes |
| Ajouter une valeur par défaut quand l'étiquette manque | Add a tag to resources | `modify` |
| Mesurer l'écart avant d'imposer | Require a tag on resources, attribuée avec l'application désactivée | `deny` évalué et signalé, pas appliqué |

> **Conseil d'examen.** « Les coûts doivent être présentés par service » alors que les ressources de plusieurs services partagent le même abonnement appelle une réponse par les étiquettes, complétée par une stratégie qui fait hériter l'étiquette aux ressources. Ce n'est pas une raison de créer un abonnement par service, sauf si chacun doit recevoir une facture séparée.

<!-- section: compliance | objectives: 1.3.2 -->
## Gérer la conformité

**Azure Policy** évalue les ressources par rapport à des règles, quel que soit l'auteur de l'action : un Owner y est soumis. Une **définition** contient une règle et un effet ; une **initiative** regroupe des définitions autour d'un objectif ; une **attribution** applique l'une ou l'autre à un groupe d'administration, un abonnement ou un groupe de ressources, moins d'éventuelles exclusions. Les attributions sont cumulatives et le résultat le plus restrictif l'emporte : une étendue inférieure ne peut pas assouplir ce qu'une étendue supérieure refuse. Une **exemption** garde une ressource dans l'attribution sans l'évaluer, avec une catégorie (Waiver : la non-conformité est acceptée temporairement ; Mitigated : l'intention est respectée autrement) et une date d'expiration facultative.

| Effet | Usage dans une conception |
| --- | --- |
| `deny` | Empêcher la création ou la mise à jour d'une ressource non conforme |
| `audit`, `auditIfNotExists` | Signaler sans bloquer ; première étape avant d'imposer |
| `modify`, `append` | Corriger la requête : ajouter des étiquettes ou des propriétés |
| `deployIfNotExists` | Déployer ce qui manque à côté d'une ressource : paramètres de diagnostic, agents, extensions |
| `denyAction` | Bloquer une action sur des ressources existantes, comme la suppression |
| `manual` | Attestation par une personne pour les contrôles qui ne peuvent pas être évalués automatiquement |

Les ressources existantes sont évaluées et signalées, jamais modifiées par `deny`. Pour les mettre en conformité, les attributions `modify` et `deployIfNotExists` exécutent des **tâches de correction** avec une identité managée qui doit détenir les rôles nécessaires à la modification.

| Exigence | Recommandation |
| --- | --- |
| Les données doivent rester dans des régions approuvées ; seuls des références SKU ou des types de ressources approuvés | Azure Policy avec `deny` (Allowed locations, par exemple) attribuée sur un groupe d'administration |
| Mesurer la conformité à ISO 27001, PCI DSS ou NIST et la montrer aux auditeurs | Les initiatives intégrées de conformité réglementaire, lues dans le tableau de bord de conformité réglementaire de Microsoft Defender pour le cloud |
| Vérifier ou imposer des paramètres à l'intérieur du système d'exploitation des machines Azure et des machines avec Azure Arc | Configuration de machine Azure, attribuée par Azure Policy |
| Protéger des ressources critiques contre la suppression, quel que soit le rôle | Verrou de ressource `CanNotDelete` |
| Déployer des ressources comme une seule unité et empêcher quiconque d'autre de les modifier ou de les supprimer | Pile de déploiement avec paramètres de refus (`denyDelete`, `denyWriteAndDelete`) |
| Partager des modèles approuvés et versionnés dans l'organisation | Specs de modèle |

Microsoft Defender pour le cloud attribue par défaut le benchmark de sécurité cloud Microsoft (Microsoft cloud security benchmark, MCSB) et présente chaque norme ajoutée comme un ensemble de contrôles, conformes ou non.

Les verrous et les paramètres de refus n'agissent que sur le **plan de contrôle** : un verrou `ReadOnly` sur un compte de stockage n'empêche pas d'écrire des objets blob, mais il bloque la liste des clés du compte. Parmi les rôles généraux, Owner et User Access Administrator gèrent les verrous ; Contributor ne le peut pas.

> **Piège d'examen.** Azure Blueprints est en cours de mise hors service (date finale : 31 janvier 2027). Ne le recommandez pas pour une nouvelle conception : les piles de déploiement et les specs de modèle, combinées à des attributions de stratégies sur les groupes d'administration, le remplacent.

<!-- section: identity-governance | objectives: 1.3.3 -->
## Gouvernance des identités

Microsoft Entra ID Governance répond à trois questions : qui a accès, en a-t-il encore besoin, et qui l'a approuvé.

| Besoin | Fonctionnalité | À retenir |
| --- | --- | --- |
| Des droits d'administration seulement quand c'est nécessaire, pour une durée limitée, avec approbation, authentification multifacteur et justification | Privileged Identity Management (PIM) | Les attributions **éligibles** s'activent à la demande ; les attributions **actives** ne demandent aucune action. Couvre les rôles Microsoft Entra, les rôles de ressources Azure et les groupes |
| Confirmer régulièrement que les membres, les invités et les administrateurs ont encore besoin de leur accès, et le retirer sinon | Révisions d'accès | Récurrentes ; les réviseurs sont les propriétaires, des personnes choisies ou les utilisateurs eux-mêmes. Les révisions de rôles se créent dans PIM, celles des packages d'accès dans la gestion des droits d'utilisation |
| Permettre aux employés et aux partenaires de demander un ensemble de groupes, d'applications et de sites SharePoint, avec approbation et expiration | Gestion des droits d'utilisation | Packages d'accès regroupés dans des catalogues ; organisations connectées pour les partenaires ; le compte invité peut être supprimé quand sa dernière attribution prend fin ; les catalogues peuvent être délégués aux responsables métier |
| Automatiser des tâches quand une personne arrive, change de poste ou part | Workflows de cycle de vie | Déclenchés par des attributs comme la date d'embauche : passe d'accès temporaire, appartenance à des groupes, désactivation du compte |
| Créer et mettre à jour les comptes à partir du système RH | Provisionnement piloté par les RH | Workday ou SuccessFactors comme source |
| Faire accepter des conditions juridiques avant l'accès | Conditions d'utilisation | Appliquées comme un contrôle de l'accès conditionnel |

Les licences départagent deux réponses plausibles :

| Licence | Apporte |
| --- | --- |
| Microsoft Entra ID P1 | Accès conditionnel avec conditions d'utilisation, provisionnement piloté par les RH |
| Microsoft Entra ID P2 | PIM, révisions d'accès (des utilisateurs actifs et inactifs, avec des aides à la décision pour les utilisateurs inactifs) et gestion des droits d'utilisation dans leur forme de base |
| Microsoft Entra ID Governance | Les workflows de cycle de vie et les fonctionnalités avancées : révisions limitées aux utilisateurs inactifs, recommandations par apprentissage automatique, stratégies d'attribution automatique |

Qui gère PIM dépend des rôles : Privileged Role Administrator (ou Global Administrator) pour les rôles Microsoft Entra ; Owner ou User Access Administrator de la ressource pour les rôles Azure.

> **Piège d'examen.** PIM limite le moment où un rôle privilégié est détenu ; les révisions d'accès vérifient si l'attribution doit encore exister. « Les administrateurs doivent demander le rôle pour quatre heures » relève de PIM ; « chaque trimestre, les responsables doivent confirmer qui garde le rôle » relève d'une révision d'accès, créée dans PIM parce qu'elle porte sur des rôles.

<!-- section: key-points -->
## Points clés

- Une seule hiérarchie de groupes d'administration par locataire, six niveaux au plus, limitée à trois ou quatre ; structurez-la selon les besoins de stratégie, avec les environnements sous forme d'abonnements.
- Un abonnement est une limite de gestion, de facturation, de mise à l'échelle et de stratégie ; un groupe de ressources contient des ressources qui partagent un cycle de vie.
- Les étiquettes ne sont pas héritées : 50 par ressource, imposées par des stratégies `deny` et propagées par des stratégies `modify`.
- Azure Policy contrôle ce que les ressources peuvent être, quel que soit l'auteur ; les tâches de correction corrigent les ressources existantes ; les exemptions documentent les exceptions.
- La conformité réglementaire se mesure avec les initiatives intégrées et Microsoft Defender pour le cloud ; Azure Blueprints est mis hors service au profit des piles de déploiement et des specs de modèle.
- PIM pour les rôles privilégiés juste-à-temps, révisions d'accès pour la recertification, gestion des droits d'utilisation pour les packages d'accès, workflows de cycle de vie pour les arrivées et les départs.
