Les contrôleurs de domaine exécutent Active Directory Domain Services (AD DS) : ils détiennent la base de données de l'annuaire, authentifient les utilisateurs et les ordinateurs, et se répliquent les modifications. Les questions d'examen demandent comment en ajouter ou en retirer un (en local ou dans Azure), quand un RODC est le bon choix et comment contrôler les mots de passe qu'il met en cache, et comment déplacer ou récupérer les cinq rôles FSMO.

<!-- section: deploy-locally | objectives: 1.1.1 -->
## Déployer et retirer des contrôleurs de domaine en local

La promotion se fait en deux étapes : installer le rôle, puis le configurer avec le Gestionnaire de serveur (**Promouvoir ce serveur en contrôleur de domaine**) ou avec le module ADDSDeployment.

```powershell
# 1. Install the role and the management tools
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# 2a. First domain controller of a new forest (prompts for the DSRM password)
Install-ADDSForest -DomainName "corp.contoso.com" -InstallDns

# 2b. Additional domain controller in an existing domain
Install-ADDSDomainController -DomainName "corp.contoso.com" -InstallDns `
  -SiteName "Paris" -Credential (Get-Credential "CORP\Admin1")
```

| Opération | Applet de commande | Informations d'identification minimales |
| --- | --- | --- |
| Nouvelle forêt | `Install-ADDSForest` | Administrateur local du serveur |
| Nouveau domaine enfant ou d'arborescence | `Install-ADDSDomain` | Enterprise Admins |
| Contrôleur de domaine supplémentaire | `Install-ADDSDomainController` | Domain Admins |
| Rétrograder un DC | `Uninstall-ADDSDomainController` | Domain Admins ; Enterprise Admins pour le dernier DC d'un domaine, ce qui supprime le domaine |

Règles de la promotion :

- **Adprep s'exécute automatiquement** pour le premier DC d'une version plus récente : le **maître de schéma** doit être joignable (`adprep /forestprep`), ainsi que le **maître d'infrastructure** du domaine (`adprep /domainprep`). N'exécutez adprep à la main qu'avant une mise à niveau sur place d'un DC, ou quand l'installateur n'est pas Enterprise Admin.
- **Chaque promotion a besoin du maître RID** ; ajouter ou supprimer un domaine a besoin du **maître d'attribution de noms de domaine**.
- `-SiteName` doit désigner un site existant. Sans lui, le DC rejoint le site de son sous-réseau.
- Le **mot de passe du mode de restauration des services d'annuaire (DSRM)** est demandé à chaque promotion ; il sert à démarrer le DC en mode DSRM pour une restauration hors connexion.
- Les applets de commande `Test-ADDS*` exécutent seules la vérification des prérequis. Le Gestionnaire de serveur ne peut pas l'ignorer ; `-SkipPreChecks` existe mais est déconseillé.
- L'**installation à partir d'un support (IFM)** évite la réplication initiale sur une liaison lente. Créez le support sur un DC de la même version de Windows Server ; IFM ne peut pas installer le premier DC d'un domaine.

```powershell
# On an existing DC: create IFM media that includes SYSVOL
ntdsutil "activate instance ntds" ifm "create sysvol full nodefrag C:\IFM" quit quit

# On the new DC
Install-ADDSDomainController -DomainName "corp.contoso.com" -InstallationMediaPath "C:\IFM"
```

Les **niveaux fonctionnels** déterminent les versions de Windows Server qui peuvent être DC. Niveaux actuels : Windows Server 2012 R2, Windows Server 2016 (également le dernier niveau de Windows Server 2019 et 2022) et Windows Server 2025 (DC Windows Server 2025 uniquement). Un DC Windows Server 2025 ne peut rejoindre qu'un domaine et une forêt au niveau Windows Server 2016 ou supérieur, et les nouvelles forêts démarrent au moins à ce niveau. Augmentez les niveaux avec `Set-ADDomainMode` et `Set-ADForestMode` ; un niveau augmenté ne peut en général pas être abaissé.

**Mises à niveau et retrait.** Microsoft recommande de promouvoir de nouveaux serveurs et de rétrograder les anciens plutôt que de mettre à niveau un DC sur place. Une rétrogradation normale déplace les rôles FSMO et retire le DC de l'annuaire. Pour un DC qui ne joint plus les autres, `-ForceRemoval` le rétrograde sans nettoyer l'annuaire : prenez ses rôles et effectuez le **nettoyage des métadonnées** depuis un DC sain, en supprimant son objet ordinateur dans Utilisateurs et ordinateurs Active Directory (et en confirmant qu'il est définitivement hors connexion) ou avec `ntdsutil` > `metadata cleanup` > `remove selected server`.

**DC virtualisés.** Hyper-V expose un **VM-Generation ID** qui permet à AD DS de détecter une machine virtuelle restaurée depuis un instantané et de se protéger.

> **Piège d'examen.** Le VM-Generation ID ne protège pas un DC dont les fichiers VHD ou VHDX ont été copiés par-dessus les fichiers existants, ou restaurés avec un logiciel de sauvegarde de fichiers ou de disque complet : le résultat peut être une restauration USN (USN rollback). Sauvegardez les contrôleurs de domaine par une sauvegarde de l'état du système.

<!-- section: azure-dcs | objectives: 1.1.2 -->
## Les contrôleurs de domaine dans Azure

AD DS s'exécute sur des machines virtuelles Azure comme en local (contrairement à Microsoft Entra Domain Services, un service managé). Les règles propres à Azure :

| Domaine | Exigence |
| --- | --- |
| Disponibilité | Au moins deux machines virtuelles DC dans des zones de disponibilité différentes, ou dans un groupe à haute disponibilité si la région n'a pas de zones |
| Adresse IP | Une adresse IP privée statique définie sur l'interface réseau de la machine virtuelle dans Azure. Pas d'adresse IP publique ; administration par Azure Bastion |
| Disques | Un disque de données distinct pour `NTDS.dit`, les journaux et SYSVOL, avec la mise en cache de l'hôte sur **Aucune** (le moteur de base de données gère lui-même l'ordre de ses écritures). Disque de système d'exploitation managé persistant, jamais éphémère |
| DNS | Les DC comme serveurs DNS personnalisés du réseau virtuel et des réseaux appairés |
| Sites | Un site AD DS avec les sous-réseaux Azure, et un lien de sites vers les sites locaux |
| Catalogue global | Au moins deux DC Azure comme serveurs de catalogue global |
| Réseau | Un NSG qui n'autorise le trafic AD DS que depuis et vers le réseau local, via un VPN site à site ou ExpressRoute |
| Arrêt | Depuis le système d'exploitation invité, pas en arrêtant (libérant) la machine virtuelle dans le portail |

La vérification des prérequis signale que la carte réseau n'a pas d'adresse IP statique : ignorez l'avertissement, l'adresse est statique dans Azure. Les machines virtuelles gardent leurs paramètres DNS jusqu'à leur redémarrage : redémarrez-les après avoir changé les serveurs DNS du réseau virtuel. Sur un DC, sa propre adresse ou l'adresse de bouclage ne se place qu'en deuxième ou troisième position dans la liste DNS.

Libérer une machine virtuelle DC réinitialise son VM-Generation ID : le DC abandonne son pool RID, réinitialise son ID d'invocation et marque SYSVOL comme non autoritaire. Si tous les DC d'un domaine sont libérés en même temps, aucun ne trouve de réplica faisant autorité au redémarrage.

> **Piège d'examen.** Un réseau virtuel resté sur le DNS fourni par Azure ne résout pas le domaine local : la machine virtuelle ne trouve aucun DC pour sa promotion. Faites pointer le DNS du réseau virtuel vers les serveurs DNS locaux avant de déployer le premier DC dans Azure, puis placez les DC Azure en tête une fois promus.

<!-- section: rodc-deploy | objectives: 1.1.3 -->
## Déployer des contrôleurs de domaine en lecture seule

Un RODC est destiné aux emplacements dont la sécurité physique ne peut pas être garantie, typiquement une succursale :

| Fonctionnalité | Effet |
| --- | --- |
| Base de données AD DS et SYSVOL en lecture seule | Les modifications se font sur un DC accessible en écriture et sont répliquées vers le RODC |
| Réplication unidirectionnelle | Le RODC ne réplique qu'en entrée ; les DC accessibles en écriture ne répliquent jamais depuis lui |
| Mise en cache des informations d'identification | Par défaut, seulement son propre compte d'ordinateur et son propre compte `krbtgt` (ses tickets ne sont donc pas valides sur les autres DC) ; les autres mots de passe seulement si sa stratégie l'autorise |
| Séparation des rôles d'administrateur | Un utilisateur ou un groupe délégué est administrateur local du RODC sans aucun droit sur le domaine |
| DNS en lecture seule | Copies en lecture seule des zones intégrées à AD |
| Ensemble d'attributs filtré | Les attributs sensibles (par exemple les données de récupération BitLocker) ne sont jamais répliqués vers un RODC |

Deux façons d'en installer un :

1. **Sans préparation (staging).** Un Domain Admin promeut le serveur avec `Install-ADDSDomainController -ReadOnlyReplica`, éventuellement avec `-DelegatedAdministratorAccountName`, `-AllowPasswordReplicationAccountName` et `-DenyPasswordReplicationAccountName`. Le premier RODC installé sans préparation exécute automatiquement `adprep /rodcprep`.
2. **Avec préparation.** Un Domain Admin crée le compte à l'avance (Centre d'administration Active Directory > Domain Controllers > **Pre-create a Read-only domain controller account**, ou `Add-ADDSReadOnlyDomainControllerAccount`) avec son nom, son site, ses options, sa stratégie et son administrateur délégué. Plus tard, l'administrateur délégué, sans droit sur le domaine, attache un serveur du **même nom** avec `-UseExistingAccount`.

```powershell
# Step 1, by a Domain Admin
Add-ADDSReadOnlyDomainControllerAccount -DomainControllerAccountName "RODC1" `
  -DomainName "corp.contoso.com" -SiteName "Lyon" `
  -DelegatedAdministratorAccountName "CORP\Lyon-RODC-Admins"

# Step 2, on the branch server, by a member of Lyon-RODC-Admins
Install-ADDSDomainController -DomainName "corp.contoso.com" -UseExistingAccount `
  -Credential (Get-Credential "CORP\LyonAdmin")
```

Prérequis : un DC accessible en écriture joignable depuis le RODC, et `adprep /rodcprep` (Enterprise Admins) une fois par forêt. Une installation avec préparation ne l'exécute pas : lancez-le à la main ou installez d'abord un RODC sans préparation. Gardez le DNS et le catalogue global sur le RODC pour que la succursale fonctionne quand la liaison WAN tombe. Changez l'administrateur délégué plus tard dans l'onglet **Géré par** (Managed By) du compte d'ordinateur du RODC ; il n'accepte qu'un principal, utilisez donc un groupe.

> **Piège d'examen.** L'administrateur délégué d'un RODC n'est ajouté ni à Domain Admins ni au groupe Administrators du domaine. Il peut installer des pilotes, redémarrer AD DS et lire les journaux, sur ce RODC uniquement.

<!-- section: rodc-accounts | objectives: 1.1.4 -->
## Gérer la sécurité des comptes sur un RODC

La **stratégie de réplication de mot de passe (PRP)** de chaque RODC est une liste Autorisés et une liste Refusés sur son compte d'ordinateur. **Le refus l'emporte** sur l'autorisation ; un compte absent des deux listes n'est pas mis en cache.

| Liste par défaut | Membres |
| --- | --- |
| Autorisés | Allowed RODC Password Replication Group (vide par défaut) |
| Refusés | Administrators, Server Operators, Backup Operators, Account Operators, Denied RODC Password Replication Group |

Le groupe Denied RODC Password Replication Group contient Domain Admins, Enterprise Admins, Schema Admins, Cert Publishers, Group Policy Creator Owners, Domain Controllers et Read-only Domain Controllers. Pour traiter une succursale différemment, modifiez les listes de son RODC plutôt que ces groupes communs au domaine.

À la première ouverture de session dans la succursale, le RODC transmet l'authentification à un DC accessible en écriture, qui vérifie la PRP ; si le compte est autorisé, son mot de passe est mis en cache et le RODC l'authentifie ensuite seul, même liaison WAN coupée. Autorisez aussi les **comptes d'ordinateur** de la succursale, sinon les ordinateurs ne s'authentifient plus quand la liaison tombe.

| Besoin | Outil |
| --- | --- |
| Modifier les listes | Compte du RODC > onglet **Stratégie de réplication de mot de passe**, ou `Add-ADDomainControllerPasswordReplicationPolicy -Identity RODC1 -AllowedList "Lyon-Users"` (ou `-DeniedList`) |
| Mettre des mots de passe en cache à l'avance | **Avancé** > **Prepopulate Passwords**, `repadmin /rodcpwdrepl` ou `Sync-ADObject -PasswordOnly` |
| Voir les mots de passe mis en cache | `Get-ADDomainControllerPasswordReplicationPolicyUsage -RevealedAccounts` |
| Voir qui s'est authentifié par le RODC | `Get-ADDomainControllerPasswordReplicationPolicyUsage -AuthenticatedAccounts` : des candidats pour la liste Autorisés |
| Vérifier le résultat pour un compte | **Avancé** > **Resultant Policy**, ou `Get-ADAccountResultantPasswordReplicationPolicy` |

```powershell
Get-ADDomainController -Filter "IsReadOnly -eq `$true" |
  Get-ADDomainControllerPasswordReplicationPolicyUsage -RevealedAccounts

Get-ADUser -Identity ana | Sync-ADObject -Destination "RODC1" -PasswordOnly
```

**Quand un RODC est volé**, supprimez son compte d'ordinateur dans l'UO Domain Controllers. La boîte de dialogue propose de réinitialiser les mots de passe mis en cache sur lui et d'**exporter la liste des comptes mis en cache** dans un fichier : exportez-la, la liste disparaît avec le compte. Reconstruisez ensuite le RODC.

> **Piège d'examen.** Retirer un utilisateur de la liste Autorisés ne supprime pas un mot de passe déjà mis en cache sur le RODC. Seule une réinitialisation du mot de passe sur un DC accessible en écriture rend la copie en cache inutilisable.

<!-- section: fsmo | objectives: 1.1.5 -->
## Gérer et dépanner les rôles FSMO

| Rôle | Étendue | Ce qu'il fait | S'il est indisponible |
| --- | --- | --- | --- |
| Maître de schéma | Forêt | Seul DC qui écrit les modifications du schéma (`adprep /forestprep`, applications) | Les extensions de schéma échouent |
| Maître d'attribution de noms de domaine | Forêt | Ajoute et supprime les domaines et les partitions d'application | Impossible d'ajouter ou de supprimer un domaine |
| Émulateur PDC | Domaine | Reçoit en premier les changements de mot de passe, est consulté après un mauvais mot de passe, traite les verrouillages, DC par défaut des modifications de stratégie de groupe ; dans la racine de la forêt, source de temps de la forêt | Les problèmes de mot de passe, de verrouillage et d'heure apparaissent vite |
| Maître RID | Domaine | Donne aux DC des pools RID (500 RID par défaut) pour créer des SID | Les DC créent des objets jusqu'à épuisement de leur pool ; aucun nouveau DC ne peut être promu |
| Maître d'infrastructure | Domaine | Met à jour les références aux objets d'autres domaines | Références interdomaines obsolètes |

Placement : les rôles de forêt dans le domaine racine de la forêt, l'émulateur PDC sur un DC fiable et puissant, et un DC de secours (partenaire de réplication direct) pour chaque détenteur. Le maître d'infrastructure ne doit pas être un serveur de catalogue global, sauf si tous les DC le sont ou si la Corbeille Active Directory est activée (le rôle n'a alors plus de travail).

```powershell
# Find the role holders
Get-ADDomain | Format-List InfrastructureMaster, RIDMaster, PDCEmulator
Get-ADForest | Format-List DomainNamingMaster, SchemaMaster
netdom query fsmo

# Transfer to DC2 (both DCs online)
Move-ADDirectoryServerOperationMasterRole -Identity "DC2" -OperationMasterRole PDCEmulator, RIDMaster

# Seize on DC2 (former holder permanently offline)
Move-ADDirectoryServerOperationMasterRole -Identity "DC2" -OperationMasterRole RIDMaster -Force
```

`-Identity` est le DC qui **reçoit** les rôles ; avec `-Force`, l'applet de commande tente d'abord un transfert et prend le rôle s'il échoue. Avec `ntdsutil` : `roles` > `connections` > `connect to server DC2` > `quit` > `seize rid master` (ou `seize pdc`, `seize infrastructure master`, `seize schema master`, `seize naming master`). Déplacer le maître de schéma exige Schema Admins, le maître d'attribution de noms de domaine Enterprise Admins, les trois rôles de domaine Domain Admins.

1. Détenteur en ligne, ou bientôt de retour : **transférez**, ou attendez si aucune tâche dépendant du rôle n'est nécessaire. Les rôles ne se déplacent pas quand un DC s'arrête.
2. Détenteur définitivement perdu : **prenez le rôle** sur le DC de secours, puis nettoyez les métadonnées de l'ancien DC.
3. Ancien détenteur réparé plus tard : ne le reconnectez jamais ; réinstallez-le. Restauré, il croirait encore détenir les rôles.

Diagnostiquez avec `dcdiag /test:KnowsOfRoleHolders` et `dcdiag /test:RidManager`. Une prise de rôle qui échoue avec « The current FSMO holder could not be contacted », puis ne trouve aucun DC, indique une valeur `fSMORoleOwner` invalide (par exemple un objet NTDS Settings supprimé).

> **Piège d'examen.** Un transfert exige que les deux DC soient en ligne. Si le détenteur est injoignable, la prise de rôle est la seule option, et elle est définitive pour l'ancien détenteur.

<!-- section: key-points -->
## Points clés

- Installez le rôle, puis promouvez avec `Install-ADDSForest`, `Install-ADDSDomain` ou `Install-ADDSDomainController` ; adprep s'exécute automatiquement, le maître RID doit être joignable.
- Les DC Windows Server 2025 exigent des niveaux fonctionnels de domaine et de forêt Windows Server 2016 ou supérieurs.
- Dans Azure : IP privée statique sur la carte réseau, disque de données avec mise en cache de l'hôte sur Aucune, DC comme serveurs DNS du réseau virtuel, un site AD pour les sous-réseaux Azure, arrêt depuis l'invité.
- RODC : lecture seule, réplication en entrée, mise en cache contrôlée par la PRP ; le refus l'emporte ; une installation avec préparation permet à un administrateur délégué d'attacher le serveur.
- RODC volé : exportez la liste des comptes en cache, supprimez son compte, réinitialisez les mots de passe en cache.
- Rôles de forêt : maître de schéma, maître d'attribution de noms de domaine. Rôles de domaine : émulateur PDC, maître RID, maître d'infrastructure.
- Transférez quand le détenteur est en ligne ; prenez le rôle avec `-Force` ou `ntdsutil` seulement quand il a disparu, puis nettoyez les métadonnées.
