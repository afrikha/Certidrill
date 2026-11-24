Ce chapitre couvre ce qu'un administrateur règle une fois le pool d'hôtes en service : les paramètres des utilisateurs et des hôtes de session délivrés par Intune ou par stratégie de groupe, les propriétés RDP du pool d'hôtes, les limites de durée des sessions, Démarrer la machine virtuelle à la connexion (Start VM on Connect) pour réduire les coûts, et l'attribution des bureaux personnels. Les questions d'examen testent le bon outil, le bon rôle et le paramètre ou la commande exacts.

<!-- section: user-settings-policies | objectives: 3.2.7 -->
## Configurer les paramètres utilisateur avec Intune ou une stratégie de groupe

Les paramètres des hôtes de session et des utilisateurs viennent des deux mêmes outils que pour les appareils physiques, avec des règles propres au multisession :

| Exigence | Outil |
| --- | --- |
| Hôtes de session joints à Active Directory Domain Services (joints au domaine ou joints à Microsoft Entra hybride) | Stratégie de groupe, ou Intune si les hôtes sont inscrits |
| Hôtes de session joints à Microsoft Entra | Intune (activez **Inscrire la machine virtuelle auprès d'Intune** quand vous ajoutez des hôtes de session) |
| Hôtes de session joints à Microsoft Entra Domain Services | Stratégie de groupe uniquement : ils ne peuvent pas être gérés avec Intune |
| Paramètres qui doivent suivre l'utilisateur, pas l'hôte | Paramètres d'étendue utilisateur : catalogue de paramètres Intune attribué à des groupes d'**utilisateurs**, ou paramètres utilisateur de stratégie de groupe |

**Intune et Windows Entreprise multisession :**

- Utilisez le **catalogue de paramètres**. Filtrez le sélecteur de paramètres sur *OS edition == Enterprise multi-session* ; les paramètres d'étendue utilisateur affichent *(User)*. Les modèles ne sont pas délivrés, sauf les profils de certificat (approuvé, SCEP, PKCS) et le VPN en tunnel d'appareil, et apparaissent comme *Non applicable*.
- La configuration d'appareil s'attribue à des groupes d'appareils, la configuration utilisateur à des groupes d'utilisateurs : l'inverse est signalé en *Erreur* ou *Non applicable*.
- Les hôtes joints hybrides s'inscrivent avec des **informations d'identification d'appareil** (inscription automatique par stratégie de groupe ou cogestion Configuration Manager) ; l'inscription avec des informations d'identification utilisateur n'est pas prise en charge en multisession. Un seul fournisseur MDM. Intune prend en charge les machines virtuelles multisession des pools d'hôtes partagés déployés par Azure Resource Manager.
- Les applications s'installent dans le contexte système avec l'intention **Obligatoire** ou **Désinstaller** ; *Disponible* n'est pas pris en charge. Les applications web (contexte utilisateur) ne s'appliquent pas, et une application Win32 en contexte système qui dépend d'une application en contexte utilisateur n'est pas installée.
- Ne sont pas pris en charge non plus : les anneaux de mise à jour Windows (gérez les mises à jour qualité avec les paramètres Windows Update du catalogue de paramètres), RemoteApp et MSIX app attach via Intune, et les actions à distance Autopilot reset, BitLocker key rotation, Fresh Start, Remote lock, Reset password et Wipe.
- Les stratégies de conformité ciblent uniquement les appareils ; l'accès conditionnel prend en charge les configurations utilisateur et appareil.
- N'inscrivez pas l'image clonée d'un appareil déjà inscrit, et gardez `RoamIdentity = 0` dans FSLogix pour que les jetons ne suivent pas l'utilisateur d'un hôte à l'autre.

**Stratégie de groupe sur les hôtes de session :**

- La plupart des paramètres de session sont des paramètres ordinateur sous **Configuration ordinateur > Modèles d'administration > Composants Windows > Services Bureau à distance > Hôte de session Bureau à distance**, dans les dossiers Redirection de périphérique et de ressource, Redirection de l'imprimante, Sécurité, Limites de temps de session.
- Les paramètres propres à Azure Virtual Desktop viennent du modèle d'administration `terminalserver-avd.admx` / `.adml`, copié dans le magasin central (`\\contoso.com\SYSVOL\contoso.com\Policies\PolicyDefinitions`).
- Pour appliquer des paramètres utilisateur selon l'**ordinateur** auquel l'utilisateur se connecte (UO des hôtes de session) plutôt que selon l'UO de l'utilisateur, activez le **traitement en boucle de rappel** (loopback, mode Fusion ou Remplacer) dans un GPO lié à l'UO des hôtes de session.

> **Piège d'examen.** Un paramètre d'étendue utilisateur qui ne doit s'appliquer que lorsque les utilisateurs se connectent aux hôtes de session, pas sur leurs ordinateurs portables : traitement en boucle de rappel sur l'UO des hôtes de session, ou stratégie Intune d'étendue utilisateur filtrée sur les appareils multisession. Un GPO utilisateur classique lié à l'UO des utilisateurs s'applique partout.

<!-- section: rdp-properties | objectives: 3.2.8 -->
## Configurer les propriétés RDP sur un pool d'hôtes

Chaque bureau et chaque application du flux d'un utilisateur s'accompagne d'un fichier `.rdp` construit à partir des **propriétés RDP du pool d'hôtes** : tous les hôtes de session du pool les partagent. Modifiez-les avec le rôle **Desktop Virtualization Host Pool Contributor** (ou équivalent) :

- Portail : pool d'hôtes > **Propriétés RDP** : onglets pour les informations de connexion, le comportement de session, la redirection de périphérique, les paramètres d'affichage, et **Avancé**, qui affiche la chaîne brute séparée par des points-virgules.
- PowerShell : `Update-AzWvdHostPool -CustomRdpProperty`. CLI : `az desktopvirtualization hostpool update --custom-rdp-property`.
- La valeur **remplace** les propriétés personnalisées : pour en ajouter une, lisez d'abord la chaîne actuelle et complétez-la ; une chaîne vide les supprime toutes.
- Les utilisateurs doivent **actualiser** leurs ressources (ou se reconnecter) pour recevoir les nouvelles propriétés.

```powershell
$hp = Get-AzWvdHostPool -Name hp-finance -ResourceGroupName rg-avd
$props = $hp.CustomRdpProperty + "use multimon:i:0;screen mode id:i:1;"
Update-AzWvdHostPool -Name hp-finance -ResourceGroupName rg-avd -CustomRdpProperty $props
Get-AzWvdHostPool -Name hp-finance -ResourceGroupName rg-avd | Format-Table Name, CustomRdpProperty
```

Propriétés autres que la redirection qui apparaissent dans les questions :

| Exigence | Propriété RDP |
| --- | --- |
| Authentification unique avec l'authentification Microsoft Entra vers les hôtes de session | `enablerdsaadauth:i:1` (remplace `targetisaadjoined`) |
| Se connecter à des hôtes joints à Microsoft Entra avec nom d'utilisateur et mot de passe depuis un appareil qui n'est ni joint ni inscrit à Entra (hérité) | `targetisaadjoined:i:1` |
| Utiliser un proxy KDC Kerberos pour l'authentification | `kdcproxyname:s:kdc.contoso.com` |
| Se reconnecter automatiquement après une coupure réseau | `autoreconnection enabled:i:1` (par défaut) |
| Un seul moniteur | `use multimon:i:0` (par défaut 1) |
| Seulement certains moniteurs locaux | `selectedmonitors:s:` avec les ID d'affichage donnés par `mstsc.exe /l`, exige `use multimon:i:1` |
| Ouvrir dans une fenêtre plutôt qu'en plein écran | `screen mode id:i:1` (par défaut 2, plein écran) ; ignorée quand `use multimon:i:1`, la session s'ouvre alors sur tous les écrans |
| Mettre à l'échelle le contenu de la session selon la fenêtre | `smart sizing:i:1` |
| Garder la résolution fixe quand la fenêtre est redimensionnée | `dynamic resolution:i:0` (par défaut 1) |
| Les combinaisons de touches Windows vont à la session seulement en plein écran | `keyboardhook:i:2` (par défaut) |
| Démarrer un programme à la place de l'Explorateur | `alternate shell:s:C:\Program Files\App\app.exe` |
| Désactiver la compression en bloc, la détection automatique de la bande passante ou du réseau | `compression:i:0`, `bandwidthautodetect:i:0`, `networkautodetect:i:0` |

> **Piège d'examen.** Les propriétés RDP se définissent par **pool d'hôtes**, pas par utilisateur ni par groupe d'applications. Deux groupes d'utilisateurs qui ont besoin de redirections ou de paramètres d'affichage différents ont besoin de deux pools d'hôtes (ou d'une stratégie d'hôte de session qui restreint l'un d'eux).

<!-- section: session-timeouts | objectives: 3.2.9 -->
## Configurer les propriétés du délai d'expiration de session

Les limites de durée des sessions sont des stratégies Windows sur les hôtes de session, sous **Modèles d'administration > Composants Windows > Services Bureau à distance > Hôte de session Bureau à distance > Limites de temps de session** (stratégie de groupe, configuration ordinateur ou utilisateur, ou le même chemin dans le catalogue de paramètres Intune) :

| Stratégie | Effet |
| --- | --- |
| Set time limit for active but idle Remote Desktop Services sessions | Une session inactive est déconnectée (ou fermée, voir plus bas) après la limite |
| Set time limit for disconnected sessions | Une session déconnectée est fermée après la limite, ce qui libère des ressources sur les hôtes partagés |
| Set time limit for active Remote Desktop Services sessions | Durée maximale d'une session active |
| End session when time limits are reached | Ferme la session au lieu de la déconnecter quand la limite d'inactivité ou d'activité est atteinte |
| Set time limit for logoff of RemoteApp sessions | Délai avant la fermeture d'une session RemoteApp sans application ouverte |

Un pool d'hôtes partagé typique : limite d'inactivité de 1 heure, limite de déconnexion de 2 heures, pour que les sessions inactives n'occupent pas de capacité et que la mise à l'échelle automatique puisse vider les hôtes.

**Comportement au verrouillage de session.** Quand une session distante est verrouillée (par l'utilisateur ou par une stratégie de verrouillage après inactivité), elle se déconnecte ou affiche l'écran de verrouillage distant :

| Authentification | Par défaut au verrouillage | Paramètre (Hôte de session Bureau à distance > **Sécurité**) |
| --- | --- | --- |
| Authentification unique avec Microsoft Entra ID | Déconnecter la session | **Disconnect remote session on lock for Microsoft identity platform authentication** |
| Protocoles hérités (NTLM, CredSSP, RDSTLS...) | Afficher l'écran de verrouillage distant | **Disconnect remote session on lock for legacy authentication** |

Déconnecter au verrouillage oblige l'utilisateur à se reconnecter par Microsoft Entra ID : l'accès conditionnel (MFA, fréquence de connexion) est réévalué et les méthodes sans mot de passe comme les clés d'accès (passkeys) fonctionnent. Cela exige Windows 11, Windows 10 21H2 ou version ultérieure, ou Windows Server 2022 avec les mises à jour cumulatives de 2024-05/06.

> **Piège d'examen.** Une limite de session déconnectée ne ferme pas les sessions des utilisateurs encore connectés mais inactifs. Pour libérer les sessions des utilisateurs qui laissent leur bureau ouvert, configurez la limite d'inactivité **et** la limite de déconnexion (ou End session when time limits are reached).

<!-- section: start-vm-on-connect | objectives: 3.2.10 -->
## Implémenter Démarrer la machine virtuelle à la connexion

Start VM on Connect permet de libérer (deallocate) les hôtes de session pour économiser le coût de calcul : quand un utilisateur se connecte et qu'aucune machine virtuelle adaptée ne tourne, Azure Virtual Desktop en démarre une.

Prérequis :

1. Attribuez le rôle **Desktop Virtualization Power On Contributor** au **principal de service Azure Virtual Desktop** ou à une **identité managée du pool d'hôtes**, à une étendue qui contient le pool d'hôtes et les machines virtuelles de ses hôtes de session (l'abonnement est recommandé quand il existe plusieurs pools d'hôtes).
2. Votre compte a besoin de **Desktop Virtualization Host Pool Contributor** pour activer le paramètre.
3. Activez-le sur un pool d'hôtes **existant** (impossible pendant la création du pool) : pool d'hôtes > **Propriétés** > **Démarrer la machine virtuelle à la connexion** = Oui.
4. Les noms du pool d'hôtes, des hôtes de session et du groupe de ressources n'utilisent que des caractères ANSI.

```powershell
Update-AzWvdHostPool -Name hp-dev -ResourceGroupName rg-avd -StartVMOnConnect:$true
```

| Type de pool d'hôtes | Comportement |
| --- | --- |
| Personnel | Démarre la machine virtuelle attribuée à l'utilisateur (ou une qui peut lui être attribuée) |
| Partagé (pooled) | Démarre une machine virtuelle seulement quand aucune ne tourne, et une autre seulement quand celles qui tournent atteignent leur limite de sessions ; au plus un démarrage toutes les cinq minutes, les autres utilisateurs reçoivent *No resources available* entre-temps |

- Fonctionne pour les hôtes de session sur Azure et sur Azure Local.
- La première connexion est plus longue pendant le démarrage de la machine virtuelle ; le client indique que la machine est en cours de démarrage.
- Se connecter directement à la machine virtuelle par son nom ou son adresse IP, hors d'Azure Virtual Desktop, ne la démarre pas.
- Start VM on Connect ne fait que **démarrer** les machines virtuelles. Leur libération est faite par la mise à l'échelle automatique (plans de mise à l'échelle) ou par votre propre automatisation.

> **Piège d'examen.** Le rôle Power On va au **principal de service Azure Virtual Desktop** (ou à l'identité managée du pool d'hôtes), pas aux utilisateurs. Les utilisateurs n'ont besoin de rien d'autre que leur affectation au groupe d'applications.

<!-- section: personal-desktops | objectives: 3.2.11 -->
## Attribuer et annuler l'attribution de bureaux personnels

Dans un pool d'hôtes personnel, chaque hôte de session appartient à un utilisateur. Le type d'attribution du pool d'hôtes décide comment les utilisateurs en reçoivent un :

| Type d'attribution | Fonctionnement |
| --- | --- |
| Automatique (par défaut) | Affectez les utilisateurs (ou des groupes) au groupe d'applications de bureau ; à la première connexion, chaque utilisateur reçoit un hôte de session non attribué, de façon permanente |
| Direct | Affectez les utilisateurs au groupe d'applications **et** à un hôte de session précis. Sans attribution d'hôte de session, l'utilisateur reçoit *No resources available* |

Vous pouvez attribuer directement un hôte de session à un utilisateur même quand le type est Automatique. Définissez le type dans pool d'hôtes > **Propriétés** > **Attribution**, ou avec `Update-AzWvdHostPool -PersonalDesktopAssignmentType Direct`.

```powershell
# Assign a session host to a user
Update-AzWvdSessionHost -HostPoolName hp-dev -ResourceGroupName rg-avd `
  -Name vm-dev-03.contoso.com -AssignedUser ana@contoso.com

# Give the desktop a name users can recognize in their feed
Update-AzWvdSessionHost -HostPoolName hp-dev -ResourceGroupName rg-avd `
  -Name vm-dev-03.contoso.com -FriendlyName "Dev desktop (GPU)"
```

| Tâche | Portail (pool d'hôtes > Hôtes de session) | PowerShell |
| --- | --- | --- |
| Attribuer | **Attribution > Attribuer un utilisateur** (ou Groupes d'applications > Affectations > **Attribuer une machine virtuelle**) | `Update-AzWvdSessionHost -AssignedUser` |
| Annuler l'attribution | **Attribution > Annuler l'attribution de l'utilisateur** | `PATCH` REST sur l'hôte de session avec `assignedUser` vide et `force=true` (`Invoke-AzRestMethod`) |
| Réattribuer | **Attribution > Attribuer à un autre utilisateur** | `PATCH` REST avec le nouvel `assignedUser` |

Azure CLI peut définir le type d'attribution mais ne peut pas attribuer, annuler ou réattribuer des bureaux personnels. Configurer l'attribution des bureaux personnels exige le rôle **Desktop Virtualization Contributor** ou équivalent.

**Plusieurs bureaux personnels par utilisateur** dans un même pool d'hôtes : définissez le type d'attribution sur **Direct** et enregistrez, puis sélectionnez **Attribuer plusieurs bureaux à un seul utilisateur** (type d'équilibreur de charge `MultiplePersistent` en PowerShell, qui exige le module Az.DesktopVirtualization en préversion, version 5.3.0-preview ou ultérieure). Une fois activé, il ne peut plus être désactivé ; l'attribution automatique et les pools partagés ne sont pas pris en charge. Donnez des noms conviviaux aux hôtes, et autorisez les connexions FSLogix simultanées si un seul conteneur de profil sert le pool.

> **Piège d'examen.** Annuler l'attribution d'un bureau ne nettoie pas la machine virtuelle : les données de l'utilisateur précédent restent sur son disque de système d'exploitation. Réinitialisez l'image ou redéployez l'hôte de session avant de le donner à quelqu'un d'autre si les données ne doivent pas être conservées.

> **Conseil d'examen.** « Les utilisateurs doivent toujours arriver sur la même machine virtuelle, et c'est l'administrateur qui choisit laquelle » = pool d'hôtes personnel avec attribution **Direct**.

<!-- section: key-points -->
## Points clés

- Intune en multisession : catalogue de paramètres uniquement (plus les modèles de certificat et de VPN en tunnel d'appareil), stratégies d'appareil vers des groupes d'appareils, stratégies utilisateur vers des groupes d'utilisateurs, applications en contexte système avec l'intention Obligatoire.
- Stratégie de groupe : dossiers Hôte de session Bureau à distance pour la redirection, la sécurité, les limites de temps ; traitement en boucle de rappel pour les paramètres utilisateur qui dépendent de l'hôte de session.
- Les propriétés RDP sont par pool d'hôtes ; `-CustomRdpProperty` remplace la chaîne ; les utilisateurs actualisent pour recevoir les changements ; `enablerdsaadauth:i:1` pour l'authentification unique Entra.
- Limites de temps : inactivité, déconnexion, session active, End session ; le verrouillage de session déconnecte par défaut avec l'authentification unique Entra.
- Start VM on Connect : Desktop Virtualization Power On Contributor au principal de service Azure Virtual Desktop ou à l'identité managée du pool d'hôtes, activé sur un pool d'hôtes existant.
- Bureaux personnels : Automatique (par défaut) ou Direct ; `Update-AzWvdSessionHost -AssignedUser` pour attribuer ; annuler l'attribution et réattribuer dans le portail ou par REST, pas avec Azure CLI.
