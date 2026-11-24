Microsoft Entra ID est le service d'identité d'Azure : toute personne, application ou service qui accède à un abonnement s'authentifie d'abord auprès d'un locataire Microsoft Entra. Ce chapitre couvre les comptes, les groupes, les licences, les invités et la réinitialisation de mot de passe qu'un administrateur gère au quotidien.

<!-- section: tenant-and-roles | objectives: 1.1.1 -->
## Locataire, éditions et rôles d'administrateur

Un **locataire** (tenant) est une instance de Microsoft Entra ID, avec un domaine initial `nom.onmicrosoft.com` auquel vous pouvez ajouter des domaines personnalisés vérifiés (`contoso.com`). Plusieurs abonnements peuvent approuver le même locataire.

Les fonctionnalités dépendent de l'édition :

| Édition | Ce qui compte pour l'examen |
| --- | --- |
| Gratuite (Free) | Utilisateurs, groupes, invités B2B, **changement** de mot de passe, paramètres de sécurité par défaut |
| P1 | Groupes d'appartenance dynamique, licences basées sur un groupe, **réinitialisation** de mot de passe en libre-service avec réécriture, accès conditionnel |
| P2 | P1, plus Privileged Identity Management, Identity Protection, révisions d'accès |

Deux systèmes de rôles coexistent et ne se remplacent pas :

| | Rôles Microsoft Entra | Rôles Azure (Azure RBAC) |
| --- | --- | --- |
| Contrôlent | Les objets de l'annuaire : utilisateurs, groupes, licences, domaines | Les ressources Azure : machines virtuelles, stockage, réseaux |
| Étendue | Locataire (ou unité administrative) | Groupe d'administration, abonnement, groupe de ressources, ressource |
| Exemples | Administrateur général (Global Administrator), Administrateur d'utilisateurs (User Administrator) | Propriétaire (Owner), Contributeur (Contributor), Lecteur (Reader) |

Rôles Microsoft Entra de moindre privilège à connaître :

| Tâche | Rôle le moins privilégié |
| --- | --- |
| Créer et gérer des utilisateurs, réinitialiser le mot de passe des non-administrateurs | User Administrator |
| Créer et gérer des groupes, leurs membres et leurs propriétaires | Groups Administrator |
| Seulement inviter des invités | Guest Inviter |
| Réinitialiser le mot de passe des non-administrateurs et de certains administrateurs limités | Helpdesk Administrator |
| Attribuer des licences à des utilisateurs | License Administrator |
| Attribuer des licences à des groupes (licence basée sur un groupe) | User Administrator |
| Attribuer des rôles Microsoft Entra, créer des groupes auxquels des rôles peuvent être attribués | Privileged Role Administrator |

> **Piège d'examen.** L'Administrateur général n'a par défaut aucun accès aux ressources Azure. Il peut **élever** son accès (Microsoft Entra ID > Propriétés > *Gestion de l'accès pour les ressources Azure*), ce qui lui attribue le rôle User Access Administrator à l'étendue racine. Retirez cet accès après usage.

<!-- section: users | objectives: 1.1.1, 1.1.2 -->
## Créer et gérer des utilisateurs

| Type de compte | Où il est géré | Remarques |
| --- | --- | --- |
| Membre cloud uniquement | Microsoft Entra ID | Créé dans le portail, par script ou en masse |
| Membre synchronisé | AD DS local, via Microsoft Entra Connect (Sync ou synchronisation cloud) | Les attributs d'identité, de contact et de poste se modifient en local, puis sont synchronisés |
| Invité (B2B) | L'organisation ou le fournisseur d'identité de l'invité | Invité ; `userType` vaut Guest |

Façons de créer des comptes membres :

- **Portail** : Utilisateurs > Nouvel utilisateur > Créer un utilisateur. Obligatoires : le nom d'utilisateur principal (UPN) et le nom d'affichage ; le mot de passe initial est généré ou saisi, et doit être changé à la première connexion.
- **Création en masse** : Utilisateurs > Opérations en masse > Créer en masse. Téléchargez le modèle CSV, remplissez-le, chargez-le. Colonnes obligatoires : nom, nom d'utilisateur (UPN) et mot de passe initial. Aucune invitation n'est envoyée.
- **Ligne de commande** :

```bash
az ad user create --display-name "Ana Diaz" \
  --user-principal-name ana@contoso.com --password "<initial password>"
```

```powershell
$pw = @{ Password = "<initial password>"; ForceChangePasswordNextSignIn = $true }
New-MgUser -DisplayName "Ana Diaz" -UserPrincipalName "ana@contoso.com" `
  -MailNickname "ana" -AccountEnabled -PasswordProfile $pw
```

Propriétés à retenir :

- L'**emplacement d'utilisation** (code pays à deux lettres) est obligatoire avant d'attribuer directement une licence à un utilisateur. Il se modifie dans Microsoft Entra ID, même pour un utilisateur synchronisé.
- Le **service** (department), le **poste** (job title) et le **responsable** (manager) alimentent les règles des groupes dynamiques.
- Dans la liste **Tous les utilisateurs**, vous pouvez sélectionner plusieurs utilisateurs (jusqu'à 60) et modifier certaines propriétés en une fois : service, poste, emplacement d'utilisation.
- Pour un utilisateur synchronisé, la réinitialisation du mot de passe par un administrateur dans le cloud n'atteint AD DS que si la **réécriture du mot de passe** (password writeback) est activée.

**Suppression.** Un utilisateur supprimé reste 30 jours dans **Utilisateurs supprimés**. Le restaurer lui rend ses propriétés, ses appartenances aux groupes et les licences qu'il avait. Après 30 jours, ou si un administrateur le supprime définitivement, le compte est irrécupérable.

<!-- section: groups | objectives: 1.1.1, 1.1.2 -->
## Créer et gérer des groupes

| Choix | Options | Règles |
| --- | --- | --- |
| Type de groupe | **Sécurité** ou **Microsoft 365** | Non modifiable après la création. Un groupe de sécurité peut contenir des utilisateurs, des appareils, des principaux de service et d'autres groupes. Un groupe Microsoft 365 ne contient que des utilisateurs et s'accompagne d'une boîte aux lettres, d'un site SharePoint et d'autres ressources de collaboration |
| Type d'appartenance | **Affecté** (Assigned), **Utilisateur dynamique** (Dynamic User), **Appareil dynamique** (Dynamic Device) | Appareil dynamique n'existe que pour les groupes de sécurité. Le type d'appartenance peut être changé plus tard |

L'**appartenance dynamique** ajoute et retire les membres automatiquement, selon une règle sur des attributs :

```text
(user.department -eq "Sales") and (user.userType -eq "Member")
(user.country -in ["FR","BE"]) and (user.accountEnabled -eq true)
(device.deviceOSType -eq "Windows")
Direct Reports for "{object ID of the manager}"
```

- Elle demande une licence Microsoft Entra ID P1 (ou supérieure) pour chaque utilisateur membre d'un groupe dynamique.
- Vous ne pouvez pas ajouter ni retirer de membres à la main dans un groupe dynamique.
- Un groupe est constitué par règle soit d'utilisateurs, soit d'appareils, jamais des deux.
- Opérateurs : `-eq`, `-ne`, `-startsWith`, `-contains`, `-match`, `-in`, `-notIn`, combinés avec `and`, `or`, `not`.
- Une règle n'est pas instantanée : après un changement de règle ou d'attribut, le traitement peut prendre de quelques minutes à plusieurs heures.
- Convertir un groupe attribué en groupe dynamique conserve son nom et son ID ; les membres qui ne correspondent pas à la règle sont retirés.
- La règle *Direct Reports* ne peut pas être combinée avec d'autres expressions.

**Imbrication.** Un groupe de sécurité peut être membre d'un autre groupe de sécurité, et les attributions de rôles Azure faites au groupe parent s'appliquent aux membres imbriqués. Les licences basées sur un groupe et plusieurs fonctionnalités applicatives ignorent en revanche les groupes imbriqués.

**Groupes auxquels des rôles peuvent être attribués.** Pour attribuer un rôle Microsoft Entra à un groupe, il faut le créer avec *Des rôles Microsoft Entra peuvent être attribués au groupe* = Oui. Ce choix est définitif, l'appartenance doit être Affecté, le groupe ne peut pas contenir d'autres groupes, et sa création demande le rôle Privileged Role Administrator et une licence P1.

Les **propriétaires** gèrent les membres de leur groupe sans détenir de rôle d'administrateur. Un groupe Microsoft 365 supprimé peut être restauré pendant 30 jours.

<!-- section: licenses | objectives: 1.1.3 -->
## Gérer les licences

Une licence (produit, ou SKU) contient des **plans de service** que l'on peut désactiver un par un, par exemple Microsoft 365 E5 sans Bookings.

| Méthode | Fonctionnement |
| --- | --- |
| Attribution directe | À un utilisateur. Celui-ci doit avoir un emplacement d'utilisation |
| Licence basée sur un groupe | À un groupe de sécurité ou à un groupe Microsoft 365 ; chaque membre direct reçoit la licence, y compris les membres ajoutés plus tard. Un membre qui quitte le groupe la perd |

Règles des licences basées sur un groupe :

- **Les groupes imbriqués ne sont pas pris en charge** : seuls les utilisateurs membres de premier niveau reçoivent la licence.
- Les utilisateurs sans emplacement d'utilisation héritent de celui du locataire.
- Un utilisateur peut détenir la même licence directement et par un ou plusieurs groupes ; il ne consomme qu'une licence. Le retirer du groupe ne supprime pas une attribution directe.
- Pour faire passer un utilisateur d'un groupe sous licence à un autre sans interruption : l'ajouter au nouveau groupe, vérifier que la licence est appliquée, puis le retirer de l'ancien.
- Les erreurs de traitement s'affichent sur le groupe : **licences insuffisantes**, **plans de service en conflit**, **plans de service dépendant d'un autre plan**, **emplacement d'utilisation non autorisé**. Après correction de la cause, lancez *Retraiter* sur le groupe.

```powershell
Get-MgSubscribedSku | Select-Object SkuPartNumber, SkuId, ConsumedUnits
Update-MgUser -UserId ana@contoso.com -UsageLocation "FR"
Set-MgUserLicense -UserId ana@contoso.com `
  -AddLicenses @{ SkuId = "<sku id>" } -RemoveLicenses @()
```

Supprimer un utilisateur libère ses licences ; le restaurer les lui rend.

<!-- section: external-users | objectives: 1.1.4 -->
## Gérer les utilisateurs externes

La collaboration Microsoft Entra B2B permet à une personne extérieure de se connecter avec sa propre identité (un autre locataire Microsoft Entra, un compte Microsoft, Google, ou un code secret à usage unique reçu par e-mail).

1. Un inviteur saisit l'adresse e-mail (Utilisateurs > Nouvel utilisateur > Inviter un utilisateur externe, invitation en masse, ou `New-MgInvitation`).
2. Un objet invité est créé immédiatement, à l'état *Acceptation en attente*. Son UPN a la forme `kim_fabrikam.com#EXT#@contoso.onmicrosoft.com`.
3. L'invité accepte l'invitation (lien dans l'e-mail, ou lien direct vers une application) et valide la demande de consentement.

```powershell
New-MgInvitation -InvitedUserEmailAddress "kim@fabrikam.com" `
  -InviteRedirectUrl "https://myapps.microsoft.com" -SendInvitationMessage:$true
```

À savoir sur les invités :

- `userType` vaut **Guest** par défaut, avec des autorisations restreintes sur l'annuaire. C'est une propriété, pas une provenance : un invité peut être converti en Member, et inversement.
- Un invité peut être ajouté à des groupes et recevoir des attributions de rôles Azure et des licences, comme tout autre utilisateur.
- Si l'adresse e-mail de l'invité change, mettez à jour la propriété mail puis **réinitialisez l'état d'acceptation** : l'ID d'objet, les appartenances et les attributions sont conservés.
- Invitation en masse : Utilisateurs > Opérations en masse > Inviter en masse, avec un CSV contenant l'adresse e-mail et l'URL de redirection.

Deux groupes de paramètres dans **Identités externes** :

| Paramètre | Ce qu'il contrôle |
| --- | --- |
| Paramètres de collaboration externe | Le niveau d'accès des invités ; **qui peut inviter** (tout le monde y compris les invités, les membres, seulement certains rôles d'administrateur, ou personne) ; les **restrictions de collaboration** : liste d'autorisation ou liste de blocage de domaines (l'une ou l'autre) |
| Paramètres d'accès interlocataire | La collaboration B2B entrante et sortante avec *d'autres organisations Microsoft Entra*, par organisation, utilisateurs et groupes ; l'approbation de l'authentification multifacteur et des revendications d'appareil du partenaire |

<!-- section: sspr | objectives: 1.1.5 -->
## Configurer la réinitialisation de mot de passe en libre-service (SSPR)

SSPR permet aux utilisateurs de réinitialiser un mot de passe oublié ou de déverrouiller leur compte sans passer par le support. Elle se configure dans Microsoft Entra ID > Réinitialisation du mot de passe.

| Page | Paramètres |
| --- | --- |
| Propriétés | SSPR activée pour **Aucun**, **Sélectionné** (un groupe de sécurité ; les groupes imbriqués sont pris en charge) ou **Tous** |
| Méthodes d'authentification | Nombre de méthodes requises pour réinitialiser : **1 ou 2** ; questions de sécurité. Depuis le 30 septembre 2025, les autres méthodes (Microsoft Authenticator, jetons OATH, e-mail, SMS ou appel vocal...) ne se gèrent plus ici : activez-les pour SSPR dans la **stratégie de méthodes d'authentification** |
| Inscription | Obliger les utilisateurs à s'inscrire à la connexion ; nombre de jours avant de devoir reconfirmer ses informations (0 à 730 ; 0 = jamais) |
| Notifications | Avertir les utilisateurs lors d'une réinitialisation ; avertir tous les administrateurs quand un autre administrateur réinitialise son mot de passe |
| Personnalisation | Lien ou adresse e-mail du support personnalisés |
| Intégration locale | Réécriture du mot de passe vers AD DS ; autoriser le déverrouillage du compte sans réinitialisation du mot de passe |

Licences :

| Scénario | Minimum |
| --- | --- |
| Un utilisateur cloud uniquement **change** un mot de passe connu | Toutes les éditions, y compris la gratuite |
| Un utilisateur cloud uniquement **réinitialise** un mot de passe oublié | Microsoft Entra ID P1 (ou Microsoft 365 Business Standard) |
| Réinitialisation ou changement avec **réécriture** vers AD DS local | Microsoft Entra ID P1 (ou Microsoft 365 Business Premium) |

La **réécriture du mot de passe** pour les utilisateurs synchronisés demande trois étapes, dans cet ordre : donner au compte Microsoft Entra Connect les autorisations de réinitialisation dans AD DS ; activer la fonctionnalité facultative *Réécriture du mot de passe* dans Microsoft Entra Connect ; activer la réécriture dans la page *Intégration locale*. Sans réécriture, un utilisateur synchronisé est invité à contacter son administrateur.

> **Piège d'examen.** Les comptes administrateurs ne suivent pas la stratégie des utilisateurs. Ils sont toujours activés pour SSPR avec une **stratégie à deux verrous** (two-gate) : deux méthodes exigées, questions de sécurité interdites. Microsoft Authenticator et les jetons OATH comptent pour **une seule** méthode : on ne peut pas les combiner pour satisfaire une exigence de deux méthodes.

Un utilisateur ne peut réinitialiser que s'il est dans le périmètre, s'il a inscrit assez de méthodes distinctes et, pour un compte synchronisé, si la réécriture est activée.

<!-- section: key-points -->
## Points clés

- Les rôles Microsoft Entra gèrent l'annuaire ; les rôles Azure gèrent les ressources. Aucun des deux ne donne l'autre.
- L'appartenance dynamique et les licences basées sur un groupe demandent P1 ; le type de groupe ne change jamais, le type d'appartenance si.
- Les licences basées sur un groupe ignorent les groupes imbriqués ; l'attribution directe d'une licence exige un emplacement d'utilisation.
- Les utilisateurs et les groupes Microsoft 365 supprimés sont restaurables pendant 30 jours.
- L'UPN d'un invité contient `#EXT#` ; qui peut inviter et quels domaines sont autorisés relèvent des paramètres de collaboration externe.
- SSPR : Aucun, Sélectionné (un groupe) ou Tous ; 1 ou 2 méthodes ; la réécriture demande P1 et Microsoft Entra Connect ; les administrateurs utilisent toujours deux méthodes.
