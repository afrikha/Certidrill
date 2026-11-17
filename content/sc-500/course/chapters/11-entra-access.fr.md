Microsoft Entra ID décide qui obtient un jeton, à quelles conditions et avec quels privilèges. Les questions de la SC-500 vous placent devant le centre d'administration : rendre un rôle éligible plutôt que permanent, écrire une stratégie d'accès conditionnel qui fait ce que l'exigence demande (et rien de plus), choisir la méthode ou la force d'authentification, donner une identité sans secret à une application ou à une ressource Azure, et contrôler ce à quoi les utilisateurs peuvent consentir.

<!-- section: pim | objectives: 1.1.1 -->
## Privileged Identity Management

**Privileged Identity Management (PIM)** fournit un accès juste-à-temps, limité dans le temps et soumis à approbation pour trois types de privilèges : les **rôles Microsoft Entra**, les **rôles de ressources Azure** et **PIM for Groups** (appartenance ou propriété d'un groupe de sécurité ou d'un groupe Microsoft 365).

| Type d'attribution | Sens | Options de durée |
| --- | --- | --- |
| Éligible | L'utilisateur doit **activer** le rôle (MFA, justification, approbation...) avant de s'en servir | Éligible permanente ou éligible limitée dans le temps (dates de début et de fin) |
| Active | L'utilisateur détient les privilèges sans aucune action | Active permanente ou active limitée dans le temps |

Les **paramètres de rôle** se définissent par rôle et valent pour toutes les attributions de ce rôle (centre d'administration Microsoft Entra : **ID Governance > Privileged Identity Management > Microsoft Entra roles > Roles >** rôle **> Role settings > Edit**) :

| Paramètre | Détail |
| --- | --- |
| Activation maximum duration | 1 à 24 heures ; l'utilisateur choisit une durée jusqu'à cette valeur |
| On activation, require multifactor authentication | Ou, à la place, **require Microsoft Entra Conditional Access authentication context** (par exemple une force résistante au hameçonnage ou un appareil conforme). Si aucune stratégie activée ne cible le contexte, la MFA est exigée par défaut |
| Require justification / ticket information on activation | Le numéro de ticket est informatif, il n'est pas validé |
| Require approval to activate | Choisissez des approbateurs (deux recommandés). Sans approbateur, les Privileged Role Administrators et Global Administrators actifs approuvent |
| Allow permanent eligible assignment / Expire eligible assignment after | Impose des dates de fin aux attributions éligibles |
| Allow permanent active assignment / Expire active assignment after | Impose des dates de fin aux attributions actives |
| Require multifactor authentication / justification on active assignment | S'applique à l'administrateur qui crée l'attribution active |
| Notifications | Par type d'e-mail ; au plus 1 000 destinataires par événement |

- **Licences** : Microsoft Entra ID P2 ou Microsoft Entra ID Governance, pour les utilisateurs ayant des attributions éligibles ou limitées dans le temps, les approbateurs et les réviseurs.
- **Qui gère** : pour les rôles Microsoft Entra, Privileged Role Administrator ou Global Administrator. Pour les rôles de ressources Azure, Owner ou User Access Administrator de la ressource ; les Privileged Role Administrators ne les voient pas par défaut.
- Les utilisateurs peuvent demander à **prolonger** une attribution sur le point d'expirer, ou à **renouveler** une attribution expirée ; un administrateur approuve.
- **PIM for Groups** a deux stratégies par groupe (appartenance, propriété). Il ne prend en charge ni les groupes d'appartenance dynamique ni les groupes synchronisés depuis l'environnement local. Un groupe doit être **assignable à un rôle** (role-assignable) pour recevoir un rôle Microsoft Entra ; ces groupes ne sont gérables que par les Global Administrators, les Privileged Role Administrators et leurs propriétaires.

> **Piège d'examen.** « Les utilisateurs doivent demander le rôle et un approbateur doit accepter » correspond à une attribution **éligible** avec **Require approval to activate**. Une attribution **active** limitée dans le temps expire à une date, mais ne demande jamais d'activation, de MFA ni d'approbation.

<!-- section: conditional-access | objectives: 1.1.2 -->
## Stratégies d'accès conditionnel

Une stratégie d'accès conditionnel est une instruction si-alors évaluée après le premier facteur d'authentification. Elle exige **Microsoft Entra ID P1** ; les stratégies qui utilisent le **risque de connexion** ou le **risque utilisateur** exigent Microsoft Entra ID Protection (**P2**).

| Partie | Options |
| --- | --- |
| Utilisateurs | Utilisateurs, groupes, rôles d'annuaire, invités ; identités de charge de travail avec des licences Workload ID (pas dans la même stratégie que des utilisateurs) |
| Ressources cibles | Ressources (anciennement applications cloud), **actions utilisateur** (Register security information, Register or join devices), **contextes d'authentification** (c1 à c99) |
| Réseau | Plages IP, pays, emplacements nommés approuvés, réseau conforme Global Secure Access |
| Conditions | Risque de connexion, risque utilisateur, plateformes d'appareils, applications clientes, filtre pour les appareils |
| Accorder | **Bloquer l'accès**, ou accorder avec : exiger la MFA, exiger une **force d'authentification**, appareil conforme, appareil joint hybride Microsoft Entra, application cliente approuvée, stratégie de protection des applications, changement de mot de passe, conditions d'utilisation. Plusieurs contrôles : **Require all the selected controls** (par défaut) ou **Require one of the selected controls** |
| Session | Restrictions appliquées par l'application, Conditional Access App Control, fréquence de connexion, session de navigateur persistante, évaluation continue de l'accès, désactivation des paramètres de résilience par défaut |

Les ressources cibles qu'utilisent les scénarios de la SC-500 :

| Exigence | Ressource cible |
| --- | --- |
| Protéger la gestion d'Azure (portail, Azure Resource Manager, Azure CLI, Azure PowerShell) | **Windows Azure Service Management API** |
| MFA pour les administrateurs sur les portails d'administration Microsoft | **Microsoft Admin Portals** |
| Stratégie de base pour tout le monde | **All resources**, sans exclusion de ressource |
| Authentification renforcée pour une activation PIM ou un site SharePoint sensible | Un **contexte d'authentification**, publié pour les applications |
| Contrôler où les utilisateurs inscrivent leurs méthodes MFA | Action utilisateur **Register security information** |

Les états d'une stratégie sont **Report-only** (rapport uniquement), **On** et **Off**. Le mode rapport uniquement évalue sans appliquer ; les journaux de connexion affichent *Report-only: Success*, *Failure*, *User action required* ou *Not applied*, et le classeur Conditional Access insights and reporting exige un espace de travail Log Analytics qui reçoit les journaux de connexion. Quand plusieurs stratégies s'appliquent, toutes doivent être satisfaites, et un blocage l'emporte.

Depuis octobre 2024 (portails) et le 1er octobre 2025 (Azure CLI, Azure PowerShell, outils IaC, API REST ; opérations de lecture exclues), Azure impose la **MFA obligatoire** aux comptes d'utilisateurs. Les identités de charge de travail ne sont pas concernées : faites passer l'automatisation sur des identités managées ou des principaux de service.

> **Piège d'examen.** Excluez toujours au moins un **compte d'accès d'urgence** des stratégies de blocage, et testez les nouvelles stratégies en mode rapport uniquement. Les comptes d'urgence ont quand même besoin de la MFA pour Azure : Microsoft recommande pour eux une clé d'accès (FIDO2) ou l'authentification par certificat.

<!-- section: authentication-methods | objectives: 1.1.3 -->
## Méthodes d'authentification, MFA et sans mot de passe

Les méthodes s'activent dans la **stratégie des méthodes d'authentification** (**Entra ID > Authentication methods > Policies**), ciblée sur des groupes, par un **Authentication Policy Administrator**. Depuis le **30 septembre 2025**, les anciennes stratégies MFA et SSPR ne peuvent plus gérer les méthodes ; les états de migration sont *Pre-migration*, *Migration in Progress* et *Migration Complete* (anciens paramètres ignorés).

| Méthode | Remarques |
| --- | --- |
| Clé d'accès (Passkey (FIDO2)) | Clés de sécurité, clés d'accès Microsoft Authenticator (liées à l'appareil), clés d'accès synchronisées (trousseau iCloud, Gestionnaire de mots de passe Google). **Profils de clés d'accès** (3 au plus) : types de clés, **Enforce attestation**, **Enforce key restrictions** (liste d'autorisation ou de blocage d'AAGUID). Les invités ne peuvent pas inscrire de clé d'accès |
| Windows Hello Entreprise, informations d'identification de plateforme | Résistants au hameçonnage, authentification uniquement |
| Authentification par certificat | À un facteur ou multifacteur, selon la configuration |
| Microsoft Authenticator | Notifications push ou connexion par téléphone sans mot de passe |
| Passe d'accès temporaire (TAP) | Code à durée limitée pour inscrire des méthodes sans mot de passe ou récupérer un accès : durée de vie de 10 minutes à 30 jours (durée par défaut 1 heure, maximum par défaut 8 heures), usage unique désactivé par défaut, un seul TAP par utilisateur. Créé par les Authentication Administrators (membres) ou les Privileged Authentication Administrators (administrateurs aussi) |
| SMS, appel vocal, jetons OATH | Seconds facteurs MFA ; la connexion par SMS est à un seul facteur |

Les **forces d'authentification** sont le moyen, dans l'accès conditionnel, d'exiger des méthodes précises :

| Force intégrée | Contient |
| --- | --- |
| Multifactor authentication strength | Tout ce qui satisfait « Exiger la MFA », y compris mot de passe + SMS ou push, et le TAP |
| Passwordless MFA strength | FIDO2, Windows Hello Entreprise ou informations d'identification de plateforme, CBA multifacteur, connexion par téléphone Authenticator |
| Phishing-resistant MFA strength | Clé de sécurité ou clé d'accès FIDO2, Windows Hello Entreprise ou informations d'identification de plateforme, CBA multifacteur |

Les forces intégrées ne sont pas modifiables ; un Conditional Access Administrator crée les forces personnalisées. « Exiger l'authentification multifacteur » et « Exiger une force d'authentification » ne peuvent pas être combinés dans une même stratégie.

> **Conseil d'examen.** « Les administrateurs doivent utiliser des méthodes résistantes au hameçonnage » se traduit par une stratégie d'accès conditionnel qui cible leurs rôles d'annuaire avec **Require authentication strength: Phishing-resistant MFA**. « Les nouveaux employés doivent inscrire une clé d'accès sans jamais avoir de mot de passe » se traduit par un **Passe d'accès temporaire**.

<!-- section: app-identity | objectives: 1.1.4 -->
## Identité des applications

| Objet | Où | Rôle |
| --- | --- | --- |
| Objet application | **App registrations** (inscriptions d'applications), locataire d'origine uniquement | Modèle : URI de redirection, informations d'identification, autorisations d'API, rôles d'application, étendues exposées |
| Principal de service | **Enterprise applications** (applications d'entreprise), un par locataire qui utilise l'application | Instance locale : qui peut se connecter, attributions, autorisations accordées, paramètres d'authentification unique |

Inscrire une application crée les deux objets dans le locataire d'origine ; une application multilocataire obtient un principal de service dans chaque locataire qui y consent. Les identités managées sont des principaux de service sans objet application. Supprimer l'objet application supprime son principal de service d'origine, et restaurer l'inscription ne le restaure pas.

**Informations d'identification d'une inscription d'application**, de la plus faible à la plus forte : secret client, certificat (recommandé plutôt qu'un secret, conservé dans Key Vault), **informations d'identification fédérées** (fédération des identités de charge de travail : l'application fait confiance aux jetons de GitHub Actions, de Kubernetes, d'un autre cloud ou de tout fournisseur OpenID Connect, et aucun secret n'existe). L'émetteur, le sujet et l'audience doivent correspondre exactement au jeton externe.

Propriétés d'une application d'entreprise :

| Propriété | Effet |
| --- | --- |
| Enabled for users to sign-in? = No | Aucun jeton n'est émis, ni aux utilisateurs attribués ni aux principaux de service disposant d'autorisations d'application |
| Assignment required = Yes | Seuls les utilisateurs, groupes et services attribués obtiennent des jetons |
| Assignment required = No | Tous les utilisateurs du locataire peuvent se connecter |
| Visible to users = No | Masquée dans Mes applications ; accès inchangé |

Rôles : **Application Administrator** et **Cloud Application Administrator** gèrent les inscriptions et les applications d'entreprise (Cloud Application Administrator sans le proxy d'application). Un **propriétaire** d'application ne gère que cette application.

> **Piège d'examen.** « Seuls les membres du groupe Finance peuvent se connecter à l'application » n'est pas une stratégie d'accès conditionnel : passez **Assignment required** à Yes et attribuez le groupe. L'accès conditionnel ajoute ensuite des conditions (MFA, appareil) pour ceux qui sont autorisés.

<!-- section: consent | objectives: 1.1.5 -->
## Octrois d'autorisations OAuth et consentement

| Type d'autorisation | Agit en tant que | Qui peut consentir |
| --- | --- | --- |
| Déléguée (étendue) | L'utilisateur connecté, dans la limite de ce qu'il peut faire | L'utilisateur, si le locataire l'autorise et que l'autorisation n'exige pas le consentement administrateur ; ou un administrateur pour tous les utilisateurs |
| Application (rôle d'application) | L'application elle-même, sans utilisateur | Un administrateur uniquement |

**Paramètres de consentement de l'utilisateur** (**Enterprise apps > Consent and permissions > User consent settings**), définis par un Privileged Role Administrator :

| Paramètre | Effet |
| --- | --- |
| Do not allow user consent | Les utilisateurs ne peuvent accorder aucune autorisation ; ils utilisent toujours les applications déjà consenties |
| Allow user consent for apps from verified publishers, for selected permissions (Recommended) | Seulement les applications d'un éditeur vérifié ou inscrites dans le locataire, et seulement les autorisations classées **à faible impact** (stratégie `microsoft-user-default-low`) |
| Allow user consent for apps | Toute autorisation qui n'exige pas le consentement administrateur (ancien mode, `microsoft-user-default-legacy`) |

- Les **classifications d'autorisations** (**Consent and permissions > Permission classifications**) marquent comme Low (Medium et High en préversion) des autorisations déléguées qui n'exigent pas le consentement administrateur. Elles sont définies par un Cloud Application Administrator ou un Application Administrator.
- Le **flux de travail de consentement administrateur** (**Admin consent settings** : *Users can request admin consent to apps they are unable to consent to* = Yes, réviseurs, notifications par e-mail, expiration en jours) permet à un utilisateur bloqué d'envoyer une demande au lieu de rester sans issue. L'activer exige un Global Administrator ; les réviseurs traitent les demandes depuis **My Pending**.

Qui peut accorder le consentement administrateur pour tout le locataire (**Enterprise apps >** application **> Permissions > Grant admin consent**, ou **App registrations > API permissions**) :

| Rôle | Autorisations déléguées | Autorisations d'application Microsoft Graph |
| --- | --- | --- |
| Privileged Role Administrator | Oui | Oui |
| Cloud Application Administrator, Application Administrator, AI Administrator | Oui | Non |

> **Piège d'examen.** Modifier les paramètres de consentement ne révoque pas ce qui a déjà été accordé : les octrois restent jusqu'à ce que vous les supprimiez. Pour couper une application qui a obtenu des autorisations risquées, examinez et supprimez ses autorisations dans l'application d'entreprise, ou passez **Enabled for users to sign-in?** à No.

<!-- section: managed-identities | objectives: 1.1.6 -->
## Identités managées pour les ressources Azure

| | Affectée par le système | Affectée par l'utilisateur |
| --- | --- | --- |
| Création | Avec la ressource (activée sur la VM, l'application, la fonction...) | Comme ressource autonome (`Microsoft.ManagedIdentity/userAssignedIdentities`) |
| Cycle de vie | Supprimée avec la ressource | Indépendant : à supprimer explicitement |
| Partage | Une seule ressource | Plusieurs ressources |
| Usage type | Une charge de travail sur une ressource | Plusieurs ressources qui ont besoin du même accès ; autorisations accordées avant que la ressource existe ; ressources souvent recréées |

Le code obtient ses jetons par le SDK Azure Identity ou MSAL ; il n'y a aucun secret à stocker ni à faire tourner. Accordez ensuite à l'identité un rôle Azure (ou un rôle de données Key Vault, Stockage ou SQL) comme à tout principal.

```bash
# System-assigned identity on an existing VM
az vm identity assign --resource-group rg-app --name vm-web

# User-assigned identity shared by several resources
az identity create --resource-group rg-app --name id-orders
az vm identity assign --resource-group rg-app --name vm-api --identities id-orders

# Grant it read access to secrets (vault using the Azure RBAC permission model)
az role assignment create --assignee-object-id <principal id> \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" --scope <key vault resource ID>
```

| Rôle | Permet |
| --- | --- |
| Managed Identity Contributor | Créer, lire, mettre à jour et supprimer des identités affectées par l'utilisateur |
| Managed Identity Operator | Lire et **attribuer** des identités affectées par l'utilisateur aux ressources |

- Les identités managées ne fonctionnent pas entre locataires. Déplacer un abonnement vers un autre annuaire oblige à les recréer, ainsi que leurs attributions de rôles.
- Les jetons sont mis en cache environ 24 heures : un changement d'autorisation peut mettre des heures à s'appliquer.
- Une identité affectée par l'utilisateur peut aussi porter des informations d'identification fédérées (par exemple pour faire confiance à GitHub Actions).

<!-- section: key-points -->
## Points clés

- PIM : éligible signifie activation (MFA ou contexte d'authentification, justification, approbation) ; active signifie accès permanent. Les paramètres sont définis par rôle ; P2 ou ID Governance.
- L'accès conditionnel exige P1 (conditions de risque : P2) ; passez d'abord par le mode rapport uniquement, excluez les comptes d'urgence, ciblez Windows Azure Service Management API pour protéger la gestion d'Azure.
- Gérez les méthodes dans la stratégie des méthodes d'authentification ; exigez des méthodes précises avec les forces d'authentification ; le TAP permet d'inscrire des utilisateurs sans mot de passe.
- Inscription d'application = objet application ; application d'entreprise = principal de service. Préférez les certificats, mieux les informations d'identification fédérées, au mieux les identités managées.
- Limitez le consentement de l'utilisateur aux éditeurs vérifiés et aux autorisations à faible impact, et activez le flux de travail de consentement administrateur. Seul un Privileged Role Administrator accorde des autorisations d'application Microsoft Graph.
- L'identité affectée par le système disparaît avec sa ressource ; celle affectée par l'utilisateur se partage. Managed Identity Operator attribue, Managed Identity Contributor crée.
