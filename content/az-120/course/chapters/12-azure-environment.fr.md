Un paysage SAP sur Azure s'inscrit dans un environnement Azure d'entreprise : une hiérarchie de groupes d'administration, des abonnements par environnement, un Azure RBAC qui sépare l'équipe infrastructure de l'équipe SAP Basis, des garde-fous Azure Policy, et des identités pour les administrateurs, les utilisateurs finaux et les applications SAP SaaS. Les questions d'examen de ce domaine demandent quel rôle, quelle étendue, quel effet de stratégie ou quelle intégration d'identité répond à une exigence avec le moindre privilège et le moindre effort.

<!-- section: access-control | objectives: 1.2.1 -->
## L'autorisation et le contrôle d'accès

La première décision de conception est la **frontière entre l'administration Azure et l'administration SAP Basis**. L'équipe infrastructure possède les réseaux, les abonnements et les stratégies ; l'équipe Basis exploite les machines virtuelles SAP.

| Environnement | Accès de l'équipe Basis |
| --- | --- |
| Hors production | Élevé : le rôle intégré **Virtual Machine Contributor** sur les groupes de ressources SAP |
| Production | Partiellement élevé : un rôle personnalisé limité aux opérations dont Basis a besoin, activé juste à temps avec **Privileged Identity Management (PIM)** et l'authentification multifacteur |

Les opérations à délimiter pour l'équipe Basis :

- Machines virtuelles : démarrer, arrêter, redémarrer, libérer, redimensionner, extensions, groupes à haute disponibilité, groupes de placement de proximité.
- Disques : lecture et écriture.
- Comptes de stockage, par exemple pour les diagnostics de démarrage.
- Azure NetApp Files : pools de capacité, volumes, instantanés, réplication interrégion.
- Réseau : cartes réseau et équilibreurs de charge ; accès en **lecture seule** aux NSG et aux pare-feu.

```json
{
  "Name": "SAP Basis Operator (custom)",
  "IsCustom": true,
  "Description": "Operate SAP VMs without creating or deleting them.",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Compute/virtualMachines/powerOff/action",
    "Microsoft.Compute/virtualMachines/deallocate/action",
    "Microsoft.Network/networkSecurityGroups/read"
  ],
  "NotActions": [],
  "AssignableScopes": [ "/subscriptions/<sap-production-subscription-id>" ]
}
```

Le **Centre Azure pour les solutions SAP** a ses propres rôles intégrés :

| Rôle | Permet |
| --- | --- |
| Azure Center for SAP solutions administrator | Déployer l'infrastructure, installer le logiciel SAP, inscrire des systèmes existants comme instances virtuelles pour les solutions SAP (VIS), démarrer et arrêter, supprimer la VIS |
| Azure Center for SAP solutions reader | Consulter toutes les ressources VIS |
| Azure Center for SAP solutions service role | Attribué à l'**identité managée affectée par l'utilisateur** que le service utilise pour déployer et gérer le système |

Pour déployer ou inscrire, l'utilisateur a aussi besoin de **Managed Identity Operator** pour attribuer une identité managée affectée par l'utilisateur existante à la VIS (plus **Managed Identity Contributor** si l'identité est créée pendant l'opération). Pour l'installation du logiciel SAP, l'identité a aussi besoin de **Reader and Data Access** sur le compte de stockage qui contient les médias.

Les données de sauvegarde méritent leur propre frontière : les administrateurs SAP et serveurs reçoivent un accès en lecture seule au coffre Recovery Services, et l'**autorisation multiutilisateur avec un Resource Guard** protège les opérations de sauvegarde critiques contre un administrateur malveillant ou compromis.

> **Piège d'examen.** Contributor sur le groupe de ressources SAP permet à l'équipe Basis de supprimer des machines virtuelles, des disques et des règles NSG. Quand l'énoncé dit « seulement démarrer, arrêter et redimensionner » ou « sans modifier la sécurité réseau », la réponse est un rôle personnalisé (ou Virtual Machine Contributor plus un accès réseau en lecture seule), pas Contributor.

<!-- section: azure-policy | objectives: 1.2.2 -->
## La gouvernance et la conformité avec Azure Policy

Azure Policy évalue les ressources par rapport à des règles et agit selon l'**effet** de chaque définition. Attribuez les définitions, ou les initiatives qui les regroupent, au groupe d'administration des zones d'atterrissage SAP, pour que chaque abonnement SAP présent et futur en hérite.

| Exigence | Approche par stratégie | Effet |
| --- | --- | --- |
| Uniquement des tailles de machines virtuelles certifiées SAP dans les abonnements SAP | Références SKU de taille de machine virtuelle autorisées, avec les tailles certifiées en paramètre | `deny` |
| Ressources SAP uniquement dans les régions approuvées | Emplacements autorisés | `deny` |
| Chaque ressource porte le SID, l'environnement et le centre de coût | Exiger une étiquette ; hériter d'une étiquette du groupe de ressources | `deny`, `modify` |
| Installer l'agent de supervision ou les paramètres de diagnostic sur chaque machine virtuelle SAP | Définitions intégrées de type deploy-if-not-exists | `deployIfNotExists` |
| Signaler les machines virtuelles et services non résilients aux zones | Stratégies intégrées de résilience (les recommandations de zone d'atterrissage SAP attribuent une initiative de résilience de zone au groupe d'administration SAP) | `audit` |
| Auditer les paramètres de l'OS dans les machines virtuelles | Stratégies de configuration de machine (configuration invité) | `auditIfNotExists` |
| Garder chaque machine virtuelle dans le périmètre des correctifs | Paramètres d'Azure Update Manager imposés par stratégie | `deployIfNotExists`, `modify` |

Une définition personnalisée qui n'autorise que certaines tailles ressemble à ceci :

```json
{
  "if": {
    "allOf": [
      { "field": "type", "equals": "Microsoft.Compute/virtualMachines" },
      { "not": { "field": "Microsoft.Compute/virtualMachines/sku.name", "in": "[parameters('allowedSkus')]" } }
    ]
  },
  "then": { "effect": "deny" }
}
```

- `deny` bloque les nouvelles requêtes non conformes ; les ressources existantes sont seulement signalées comme non conformes.
- `modify` et `deployIfNotExists` exigent une **identité managée** sur l'attribution et une **tâche de correction** pour corriger les ressources existantes.
- Une **exemption** retire une étendue précise (par exemple un abonnement de bac à sable) d'une attribution sans la supprimer.
- Les tableaux de bord de conformité réglementaire de Microsoft Defender pour le cloud montrent l'état des normes de conformité.

> **Piège d'examen.** Azure Policy contrôle ce que les ressources peuvent être ; Azure RBAC contrôle qui peut agir. « Empêcher quiconque de créer une taille de machine virtuelle non certifiée » est une stratégie avec `deny`, même pour les Owners ; « empêcher l'équipe Basis de supprimer des machines virtuelles » est un rôle.

<!-- section: authentication | objectives: 1.2.3 -->
## L'authentification pour les charges de travail SAP

L'authentification se joue à plusieurs couches, chacune avec son mécanisme :

| Couche | Mécanisme |
| --- | --- |
| Plan de contrôle Azure (portail, CLI) | Microsoft Entra ID avec authentification multifacteur ; rôles privilégiés via PIM |
| OS invité Windows de SAP NetWeaver ou S/4HANA | Jonction au domaine **Active Directory Domain Services** ; Microsoft Entra ID n'est pas pris en charge comme domaine de la pile ABAP SAP sous Windows (Microsoft Entra Domain Services est documenté comme encore en test) |
| SAP GUI | **SNC avec Kerberos/SPNEGO** auprès d'Active Directory (recommandation de SAP) ; certificats X.509 via SAP Secure Login Server |
| SAP Fiori, Web GUI, autres applications web NetWeaver | Authentification unique **SAML 2.0** avec Microsoft Entra ID |
| Applications qui appellent des services OData SAP | **OAuth 2.0** avec l'octroi SAML bearer, pour que l'appel s'exécute au nom de l'utilisateur final |
| SAP HANA | Authentification unique avec Microsoft Entra ID |
| Services Azure qui appellent SAP pour un utilisateur | **Propagation du principal** (principal propagation), par exemple via Azure API Management, pour que les autorisations SAP s'appliquent à l'identité Microsoft |
| Ressources Azure qui appellent Azure (agent de clôture, sauvegarde, scripts) | Identités managées, jamais de secrets stockés |

Mettre en place SAML pour SAP NetWeaver (7.20 ou ultérieur) avec Microsoft Entra ID :

1. Ajoutez l'application **SAP NetWeaver** depuis la galerie Microsoft Entra.
2. Dans SAP, activez la session de sécurité HTTP et les services ICF SAML2, puis exécutez la transaction **SAML2** pour créer le fournisseur local et télécharger ses métadonnées.
3. Dans Microsoft Entra ID, chargez ces métadonnées (elles remplissent l'identificateur et l'URL de réponse) et définissez la revendication NameID, par exemple `ExtractMailPrefix()` du nom d'utilisateur principal.
4. Dans la transaction SAML2, ajoutez Microsoft Entra ID comme **fournisseur approuvé** à partir de ses métadonnées de fédération, avec HTTP POST pour l'authentification unique, et configurez la fédération d'identité (par exemple associer les utilisateurs par adresse e-mail).
5. Renseignez l'adresse e-mail correspondante de chaque utilisateur SAP dans la transaction SU01.

Pour OAuth, le côté SAP inscrit un client OAuth 2.0 dans la transaction **SOAUTH2**, lié au fournisseur d'identité SAML2 Microsoft Entra et aux étendues du service OData.

SNC est aussi requis pour l'authentification unique depuis Azure Monitor pour solutions SAP, le runtime d'intégration auto-hébergé d'Azure Data Factory et la passerelle de données locale (Power BI, Power Apps, Power Automate, Logic Apps).

> **Conseil d'examen.** Associez le client au protocole : SAP GUI → SNC avec Kerberos ; navigateur (Fiori, Web GUI) → SAML ; une application qui appelle OData au nom d'un utilisateur → OAuth avec l'octroi SAML bearer ou la propagation du principal.

<!-- section: saas-authentication | objectives: 1.2.4 -->
## L'authentification pour les applications SAP SaaS

Les applications SAP SaaS (SAP SuccessFactors, SAP Analytics Cloud, SAP Business Technology Platform, SAP Business ByDesign, SAP Customer Experience comme C4C, Qualtrics) utilisent l'**authentification unique SAML** avec Microsoft Entra ID, configurée depuis la galerie d'applications Microsoft Entra.

Quand plusieurs services cloud SAP sont concernés, le modèle recommandé place **SAP Cloud Identity Services (Identity Authentication, IAS)** au milieu :

```text
User ──► SAP BTP application ──► SAP Cloud Identity Services (proxy IdP) ──► Microsoft Entra ID (corporate IdP)
          authorization:            trust to Microsoft Entra ID                authentication, MFA,
          role collections                                                       Conditional Access
```

| Point de conception | Recommandation |
| --- | --- |
| Qui authentifie | Microsoft Entra ID, comme fournisseur d'identité d'entreprise d'IAS ; les contrôles fondés sur le risque (accès conditionnel) en un seul point central |
| Qui autorise | SAP BTP et IAS : associer les **role collections** BTP à des groupes Microsoft Entra, envoyés dans une revendication nommée `Groups` avec l'ID d'objet du groupe, limitée aux groupes attribués à l'application |
| Approbation BTP | Configuration d'approbation du sous-compte BTP vers IAS, avec « Create Shadow Users During Logon » |
| Locataires IAS | Un seul locataire IAS de production pour tous les utilisateurs finaux ; les autres locataires uniquement pour tester la configuration |
| Sous-comptes BTP | Ne regrouper que des applications aux exigences d'identité similaires : paramètres d'approbation et role collections s'appliquent à tout le sous-compte |
| Certificats | Un processus de renouvellement des certificats de signature SAML du sous-compte BTP, du locataire IAS et de l'application Microsoft Entra ; une boîte aux lettres de groupe pour les avis d'expiration |

**Approvisionnement des utilisateurs** :

| Sens | Mécanisme |
| --- | --- |
| Microsoft Entra ID → SAP Cloud Identity Services | Approvisionnement Microsoft Entra avec le connecteur SCIM 2.0 : utilisateurs et groupes (l'approvisionnement des groupes exige Microsoft Entra ID P1) ; s'authentifie avec l'ID client et le secret d'un administrateur IAS de type **System** ; cycles incrémentiels environ toutes les 40 minutes ; seuls les utilisateurs ayant le rôle **User** sont dans l'étendue ; `userName` et l'adresse e-mail professionnelle sont obligatoires |
| SAP SuccessFactors → Microsoft Entra ID (ou Active Directory) | Approvisionnement entrant piloté par les RH depuis Employee Central, avec **réécriture de l'adresse e-mail** facultative vers SuccessFactors |
| Microsoft Entra ID → SAP Analytics Cloud | Approvisionnement automatique Microsoft Entra |

SAP Identity Management (SAP IDM) est en cours de retrait ; SAP et Microsoft recommandent de migrer ses scénarios vers **Microsoft Entra ID Governance**, qui s'intègre à SAP Cloud Identity Services.

> **Piège d'examen.** SuccessFactors est la source de vérité pour les employés : le flux d'approvisionnement va de SuccessFactors vers Microsoft Entra ID, pas l'inverse. Vers SAP Cloud Identity Services, le flux part de Microsoft Entra ID.

<!-- section: management-hierarchy | objectives: 1.2.5 -->
## Les groupes d'administration, abonnements et groupes de ressources

| Niveau | Faits et limites | Usage SAP |
| --- | --- | --- |
| Groupe d'administration | 10 000 par annuaire ; jusqu'à six niveaux sous la racine ; un seul parent ; la racine est le **groupe racine du locataire** (Tenant root group), dont l'ID est l'ID du locataire ; les nouveaux abonnements arrivent sous la racine par défaut | Un groupe d'administration SAP (ou « zones d'atterrissage SAP ») sous le groupe des zones d'atterrissage, où les stratégies et attributions de rôles SAP sont héritées |
| Abonnement | Unité de facturation, de quotas, de stratégie et d'accès ; groupes de ressources limités à 980 par abonnement | Des abonnements distincts pour le hub (connectivité), la production SAP (production et ses systèmes de reprise) et le hors-production SAP, ou un abonnement par zone de charge de travail |
| Groupe de ressources | Des ressources qui partagent un cycle de vie et des autorisations ; une ressource appartient à un seul groupe de ressources | Regrouper par système SAP et par couche (par exemple un groupe de ressources par SID), avec des étiquettes SID et environnement |

```text
Tenant root group
└── Contoso
    ├── Platform
    │   ├── Identity
    │   ├── Management
    │   └── Connectivity ── sub-hub (hub VNets, ExpressRoute, firewall, DNS)
    └── Landing zones
        └── SAP ── policies: allowed SKUs, tags, zone resilience
            ├── sub-sap-prd   (PRD + DR systems)
            └── sub-sap-nonprd (SBX, DEV, QAS)
```

- Les attributions (rôles et stratégies) à un groupe d'administration s'appliquent à tout abonnement déplacé dessous plus tard.
- Production et hors production dans des abonnements distincts gardent séparés leurs quotas, budgets et autorisations, et une erreur hors production ne peut pas toucher la production.
- Utilisez efficacement les abonnements existants, planifiez tôt la croissance et démarrez les nouveaux environnements avec un petit nombre d'abonnements.

> **Conseil d'examen.** « S'appliquer à tous les abonnements SAP actuels et futurs » oriente vers une attribution au groupe d'administration SAP. « Uniquement au système PRD » oriente vers son groupe de ressources.

<!-- section: landing-zones | objectives: 1.2.6 -->
## Les zones d'atterrissage Azure pour SAP

Le scénario SAP du Cloud Adoption Framework s'appuie sur une **zone d'atterrissage Azure** à l'échelle de l'entreprise déjà en place : déployez d'abord la plateforme, puis les zones d'atterrissage de charge de travail SAP.

| Composant | Contenu |
| --- | --- |
| Zone d'atterrissage de plateforme | Abonnements d'identité, de gestion (Log Analytics, supervision) et de connectivité ; le hub avec ExpressRoute, un VPN site à site en secours d'ExpressRoute, le pare-feu et le DNS |
| Zones d'atterrissage d'application SAP | Abonnements SAP de production et hors production ; un réseau virtuel spoke par zone de charge de travail (production, QA, développement, bac à sable) appairé au hub |
| Topologie | Hub-and-spoke, ou Azure Virtual WAN avec les réseaux virtuels SAP comme spokes du hub virtuel |
| Déploiement des systèmes SAP | SAP Deployment Automation Framework (Terraform pour l'infrastructure, Ansible pour la configuration de l'OS et de SAP), ou le Centre Azure pour les solutions SAP (déploiement S/4HANA guidé, inscription de systèmes existants, démarrage et arrêt) |

La conception de zone d'atterrissage SAP couvre cinq zones de conception : gestion des identités et des accès ; topologie et connectivité réseau ; continuité d'activité et reprise d'activité ; sécurité, gouvernance et conformité ; automatisation de la plateforme et DevOps.

Les règles réseau que la zone d'atterrissage doit respecter :

- Toutes les machines virtuelles d'un système SAP (application et base de données) dans un seul réseau virtuel spoke, dans des sous-réseaux distincts.
- Pas de pare-feu ni d'autre NVA entre les sous-réseaux d'application et de base de données ; le trafic des utilisateurs et des autres systèmes est inspecté dans le hub.
- Des points de terminaison privés pour les services de stockage utilisés par SAP (par exemple Azure Files).
- Les systèmes de reprise de la production dans l'abonnement de production, dans une deuxième région avec son propre spoke et son propre hub.

> **Piège d'examen.** Une zone d'atterrissage qui place les serveurs d'applications SAP et la base de données dans deux spokes, avec le pare-feu du hub entre les deux, n'est pas prise en charge : tout le système SAP reste dans un seul réseau virtuel.

<!-- section: key-points -->
## Points clés

- Séparez l'administration Azure de SAP Basis : Virtual Machine Contributor hors production, un rôle personnalisé restreint via PIM en production.
- Le Centre Azure pour les solutions SAP demande son rôle administrateur pour les utilisateurs et son rôle de service sur une identité managée affectée par l'utilisateur.
- Stratégies avec `deny` pour les SKU, régions et étiquettes autorisés au groupe d'administration SAP ; `deployIfNotExists` et `modify` exigent une identité managée et une correction.
- SAP sous Windows rejoint Active Directory Domain Services ; SAP GUI utilise SNC avec Kerberos, Fiori utilise SAML avec Microsoft Entra ID, les appelants OData utilisent OAuth ou la propagation du principal.
- SAP SaaS : Microsoft Entra ID authentifie, IAS fait office de proxy, BTP autorise via des role collections associées à des groupes ; approvisionnement vers IAS depuis Microsoft Entra ID, depuis SuccessFactors vers Microsoft Entra ID.
- Zones d'atterrissage : la plateforme d'abord, puis les abonnements SAP de production et hors production avec des spokes appairés au hub ; un système SAP par réseau virtuel.
