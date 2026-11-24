Les principaux de sécurité sont les comptes auxquels on peut accorder un accès : utilisateurs, ordinateurs, groupes et comptes de service. Les questions d'examen demandent quelle étendue de groupe créer pour que des comptes de plusieurs domaines ou forêts atteignent une ressource, comment créer et gérer des comptes en masse avec PowerShell, et quel type de compte de service convient à un service.

<!-- section: users-groups | objectives: 1.3.1 -->
## Créer et gérer des utilisateurs et des groupes

Outils : Utilisateurs et ordinateurs Active Directory (`dsa.msc`), le Centre d'administration Active Directory et le module PowerShell ActiveDirectory (installé avec le rôle AD DS ou avec les outils d'administration de serveur distant, RSAT).

```powershell
New-ADOrganizationalUnit -Name "Sales" -Path "DC=corp,DC=contoso,DC=com"

New-ADUser -Name "Ana Silva" -SamAccountName "ana" -UserPrincipalName "ana@contoso.com" `
  -Path "OU=Sales,DC=corp,DC=contoso,DC=com" `
  -AccountPassword (Read-Host -AsSecureString "Password") -Enabled $true `
  -ChangePasswordAtLogon $true

New-ADGroup -Name "Sales-Users" -GroupScope Global -GroupCategory Security `
  -Path "OU=Sales,DC=corp,DC=contoso,DC=com"
Add-ADGroupMember -Identity "Sales-Users" -Members "ana"

# Bulk creation from a CSV file with columns Name, Sam, Ou
Import-Csv C:\Temp\users.csv | ForEach-Object {
  New-ADUser -Name $_.Name -SamAccountName $_.Sam -Path $_.Ou -Enabled $false
}
```

Opérations courantes :

| Tâche | Console | PowerShell |
| --- | --- | --- |
| Réinitialiser un mot de passe, déverrouiller | **Réinitialiser le mot de passe** (avec **Déverrouiller le compte de l'utilisateur**) | `Set-ADAccountPassword -Reset`, `Unlock-ADAccount` |
| Désactiver ou activer | **Désactiver le compte** | `Disable-ADAccount`, `Enable-ADAccount` |
| Trouver les comptes verrouillés, désactivés ou inactifs | Requêtes enregistrées | `Search-ADAccount -LockedOut`, `-AccountDisabled`, `-AccountInactive` |
| Définir une date d'expiration | Onglet Compte | `Set-ADAccountExpiration` |
| Appartenance d'un utilisateur aux groupes | Onglet **Membre de** | `Add-ADPrincipalGroupMembership`, `Get-ADPrincipalGroupMembership` |

Un **utilisateur créé par copie** d'un compte modèle reçoit ses appartenances aux groupes et une partie de ses propriétés, jamais son nom ni son mot de passe. Les **unités d'organisation** contiennent des comptes pour la délégation et la stratégie de groupe ; ce ne sont pas des principaux de sécurité et elles n'accordent aucun accès.

**Types de groupes.** Un groupe de **sécurité** peut servir dans des autorisations et des droits utilisateur ; un groupe de **distribution** uniquement pour la messagerie. **Étendues de groupe :**

| Étendue | Peut contenir | Peut recevoir des autorisations dans | Se convertit en |
| --- | --- | --- | --- |
| Globale | Des comptes et des groupes globaux du **même domaine** | Tout domaine de la forêt et les domaines ou forêts qui approuvent | Universelle, s'il n'est membre d'aucun autre groupe global |
| Universelle | Des comptes, groupes globaux et universels de **tout domaine de la forêt** | Tout domaine de la forêt et les forêts qui approuvent | Domaine local, s'il n'est membre d'aucun autre groupe universel ; globale, s'il ne contient aucun groupe universel |
| Domaine local | Des comptes, groupes globaux et universels de tout domaine ou domaine approuvé (y compris d'autres forêts), des groupes de domaine local du même domaine | **Son propre domaine uniquement** | Universelle, s'il ne contient aucun autre groupe de domaine local |

Les groupes par défaut du conteneur Builtin (Administrators, Backup Operators...) ont l'étendue **Builtin Local**, qui ne peut pas être modifiée. Changez une étendue avec `Set-ADGroup -GroupScope` ; un groupe global ne peut pas devenir directement de domaine local (passez par universel).

La stratégie classique (AGDLP) : placez les comptes (**A**ccounts) dans des groupes **G**lobaux par rôle, les groupes globaux dans des groupes de **D**omaine **L**ocal par ressource, et accordez les autorisations (**P**ermissions) aux groupes de domaine local. Dans une forêt multidomaine, des groupes universels rassemblent les groupes globaux de plusieurs domaines (AGUDLP).

> **Piège d'examen.** Un groupe global ne peut pas contenir d'utilisateurs d'un autre domaine, et un groupe de domaine local ne peut pas servir aux autorisations hors de son domaine. Quand l'énoncé mélange des domaines, vérifiez l'étendue par rapport à ces deux règles avant toute autre chose.

<!-- section: multi-domain-forest | objectives: 1.3.2 -->
## Les utilisateurs et les groupes entre domaines et forêts

Choisir l'étendue :

| Exigence | Groupe à utiliser |
| --- | --- |
| Utilisateurs d'un domaine, accès à des ressources de plusieurs domaines de la forêt | Groupe global dans le domaine des utilisateurs |
| Utilisateurs de plusieurs domaines de la forêt, une liste réutilisée partout | Groupe universel contenant les groupes globaux de chaque domaine |
| Utilisateurs d'une autre forêt (par une approbation) sur une ressource de ce domaine | Groupe de domaine local dans le domaine de la ressource, avec comme membres les utilisateurs ou les groupes globaux de l'autre forêt |
| Autorisation sur le dossier d'un serveur de fichiers, membres de partout | Groupe de domaine local du domaine du serveur |

Les points qui décident des réponses :

- L'**appartenance aux groupes universels** est stockée dans le **catalogue global** et répliquée dans toute la forêt. Gardez des groupes universels stables et imbriquez-y des groupes globaux plutôt que des utilisateurs, pour que les changements d'appartenance ne soient pas répliqués vers tous les catalogues globaux.
- Un membre d'une autre forêt ou d'un domaine externe est représenté dans le domaine local par un **principal de sécurité étranger** (foreign security principal, conteneur `ForeignSecurityPrincipals`), une référence à son SID. Quand le compte source est supprimé, la référence reste : nettoyez-la à la main.
- **Seuls les groupes de domaine local** (et les groupes locaux des ordinateurs) peuvent contenir des principaux d'une autre forêt. Les groupes globaux et universels sont limités à leur domaine et à leur forêt.
- Une approbation unidirectionnelle permet d'ajouter des membres de la forêt approuvée aux groupes de la forêt qui approuve, pas l'inverse. `Get-ADGroupMember` peut échouer sur un groupe de la forêt qui approuve contenant des membres de la forêt approuvée ; utilisez alors Utilisateurs et ordinateurs Active Directory.
- Les **suffixes UPN** permettent aux utilisateurs de se connecter avec un nom simple (`ana@contoso.com`) quel que soit leur domaine : ajoutez-les dans Domaines et approbations Active Directory (propriétés du nœud racine) ou avec `Set-ADForest -UPNSuffixes @{Add="contoso.com"}`. À travers une approbation de forêt, les suffixes sont routés vers la forêt qui les possède ; un suffixe utilisé dans les deux forêts est en conflit.
- Déplacer un utilisateur vers un autre domaine de la forêt lui donne un nouveau SID ; l'ancien SID est copié dans `SIDHistory` et reste dans le jeton d'accès, si bien que les listes de contrôle d'accès (ACL) qui citent l'ancien SID n'ont pas à changer. Le déplacer entre des UO du même domaine conserve son SID.

```powershell
# Universal group in the forest root, fed by the global groups of two domains
New-ADGroup -Name "All-Sales" -GroupScope Universal -GroupCategory Security
Add-ADGroupMember -Identity "All-Sales" -Members "CN=Sales-Users,OU=Sales,DC=corp,DC=contoso,DC=com"

# Domain local group on the resource side, members from the trusted forest fabrikam.com
New-ADGroup -Name "DL-Finance-Share-Read" -GroupScope DomainLocal -GroupCategory Security
Add-ADGroupMember -Identity "DL-Finance-Share-Read" `
  -Members (Get-ADGroup -Identity "Auditors" -Server "fabrikam.com")
```

> **Piège d'examen.** Les utilisateurs d'une forêt approuvée ne peuvent pas être ajoutés à un groupe global ou universel de votre forêt. Pour leur donner accès, créez un groupe de domaine local dans le domaine de la ressource, ajoutez-y leurs comptes ou leurs groupes globaux, et accordez l'autorisation à ce groupe.

<!-- section: service-accounts | objectives: 1.3.3 -->
## Sélectionner et gérer des comptes de service

| Compte | Mot de passe | Utilisé par | À choisir quand |
| --- | --- | --- | --- |
| Compte d'utilisateur de domaine | Défini et changé par un administrateur, soumis à la stratégie de mot de passe | N'importe quel serveur | Seulement pour les applications qui ne prennent rien d'autre en charge |
| Compte de service administré autonome (sMSA) | Géré par Windows | Un seul ordinateur | Un service sur un serveur, jamais un cluster ni une batterie |
| Compte de service administré de groupe (gMSA) | Calculé par les DC (changement tous les 30 jours par défaut), récupéré par les hôtes autorisés | Plusieurs serveurs | Une batterie, un service à charge équilibrée, un cluster, des tâches planifiées sur plusieurs serveurs |
| Compte de service administré délégué (dMSA) | Clés entièrement aléatoires détenues par les DC, liées à l'identité de la machine | Les ordinateurs qui lui sont associés (Windows Server 2025) | Un nouveau compte autonome, ou le remplacement d'un compte de service existant, qui empêche le vol d'informations d'identification (kerberoasting) |
| Compte virtuel (`NT SERVICE\name`) | Aucun ; utilise le compte d'ordinateur sur le réseau | Un seul ordinateur | Un service local qui n'a pas besoin de sa propre identité de domaine |

**Prérequis et étapes d'un gMSA :**

1. Une **clé racine KDS** dans la forêt, créée une fois par un Domain Admin ou un Enterprise Admin. Les DC attendent jusqu'à 10 heures après sa création avant de l'utiliser, le temps qu'elle soit répliquée partout. Dans un labo à un seul DC, antidatez-la.
2. Un groupe de sécurité qui contient les comptes d'ordinateur des hôtes autorisés à utiliser le compte.
3. Créez le gMSA, puis installez-le et testez-le sur chaque hôte, et configurez le service pour qu'il s'exécute sous `CORP\svc-web$` avec un mot de passe vide.

```powershell
# 1. Once per forest (production: let it replicate before use)
Add-KdsRootKey -EffectiveImmediately
# Lab with a single DC only
Add-KdsRootKey -EffectiveTime ((Get-Date).AddHours(-10))

# 2-3. Create the gMSA for the hosts of the group WebFarm-Hosts
New-ADServiceAccount -Name "svc-web" -DNSHostName "svc-web.corp.contoso.com" `
  -PrincipalsAllowedToRetrieveManagedPassword "WebFarm-Hosts"

# On each host (after a restart if it was just added to the group)
Install-ADServiceAccount -Identity "svc-web"
Test-ADServiceAccount -Identity "svc-web"
```

Règles à retenir : les noms de gMSA sont uniques dans la forêt ; l'intervalle de changement du mot de passe (`-ManagedPasswordIntervalInDays`) ne se définit qu'à la création ; `Reset-ADServiceAccountPassword` ne s'applique qu'aux sMSA ; pour qu'un autre hôte utilise le gMSA, ajoutez son compte d'ordinateur au groupe. Un sMSA se crée avec `New-ADServiceAccount -RestrictToSingleComputer`, se lie à son ordinateur avec `Add-ADComputerServiceAccount`, puis s'installe avec `Install-ADServiceAccount`.

**Migration vers un dMSA** (Windows Server 2025) : créez le dMSA avec `New-ADServiceAccount -CreateDelegatedServiceAccount`, démarrez la migration avec `Start-ADServiceAccountMigration -Identity "<dMSA>" -SupersededAccount "<DN of the old account>"`, laissez-le apprendre les ordinateurs qui utilisent l'ancien compte, puis exécutez `Complete-ADServiceAccountMigration`. L'ancien compte est désactivé et ses SPN passent au dMSA. Prérequis : une clé racine KDS, Windows Server 2025 (la configuration d'un dMSA n'est disponible que sur Windows Server 2025, et chaque machine qui utilise le compte doit prendre en charge les dMSA), un DC accessible en écriture pour la migration, et la stratégie Kerberos **Enable Delegated Managed Service Account logons** (ou la valeur de Registre `DelegatedMSAEnabled`) sur les ordinateurs. Une fois le compte lié, redémarrez les services qui l'utilisent ; le dMSA ajoute un ordinateur à chaque renouvellement de ticket. Un dMSA peut aussi être créé comme compte autonome, sans migration. Impossible de migrer un sMSA ou un gMSA vers un dMSA ; ne supprimez pas l'ancien compte après la migration.

> **Piège d'examen.** « Le service s'exécute sur trois serveurs Windows Server 2022 derrière un équilibreur de charge et le mot de passe doit changer automatiquement » désigne un gMSA, pas un sMSA (un seul ordinateur) ni un dMSA (disponible uniquement sur Windows Server 2025). Si la création du gMSA réussit mais que l'hôte ne peut pas l'utiliser, vérifiez l'âge de la clé racine KDS et l'appartenance de l'hôte au groupe.

<!-- section: key-points -->
## Points clés

- Globale : membres de son propre domaine. Universelle : membres de toute la forêt, stockée dans le catalogue global. Domaine local : membres de partout, autorisations dans son propre domaine uniquement.
- AGDLP : comptes dans des groupes globaux, groupes globaux dans des groupes de domaine local, autorisations sur les groupes de domaine local ; groupes universels pour couvrir plusieurs domaines.
- Les principaux d'une autre forêt ne vont que dans des groupes de domaine local ; ils apparaissent comme principaux de sécurité étrangers.
- Les suffixes UPN s'ajoutent au niveau de la forêt et sont routés à travers les approbations de forêt.
- sMSA : un ordinateur. gMSA : plusieurs hôtes, exige une clé racine KDS et un groupe d'hôtes. dMSA : Windows Server 2025, un compte autonome ou le remplacement d'un compte de service existant, lié à des machines.
- Étapes d'un gMSA : `Add-KdsRootKey`, `New-ADServiceAccount -PrincipalsAllowedToRetrieveManagedPassword`, `Install-ADServiceAccount`, `Test-ADServiceAccount`.
