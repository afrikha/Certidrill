La planification a décidé des pools d'hôtes nécessaires ; ce chapitre porte sur leur construction. L'examen demande quelle option du portail, quelle cmdlet ou quelle propriété de modèle produit un résultat donné, ce qu'il faut avant que les hôtes de session puissent s'inscrire, quel paramètre du pool d'hôtes répond à une exigence, et quelle licence un scénario impose pour des hôtes de session Windows client et Windows Server.

<!-- section: portal-deployment | objectives: 1.4.1 -->
## Créer un pool d'hôtes et des hôtes de session dans le portail Azure

Un déploiement Azure Virtual Desktop est un ensemble d'objets liés : un **pool d'hôtes** (les hôtes de session et leurs paramètres), au moins un **groupe d'applications** (ce que reçoivent les utilisateurs : un bureau ou des RemoteApp), un **espace de travail** (ce que les utilisateurs voient dans leur client) et des **attributions de rôles** des utilisateurs aux groupes d'applications. Le portail peut tous les créer en un seul parcours (**Azure Virtual Desktop > Pools d'hôtes > Créer**) ou un par un.

Prérequis pour le compte qui déploie :

| Ressource | Rôle minimal |
| --- | --- |
| Pool d'hôtes, espace de travail, groupe d'applications | Desktop Virtualization Contributor (groupe de ressources ou abonnement) |
| Machines virtuelles hôtes de session sur Azure | Virtual Machine Contributor |
| Ajout d'hôtes de session à un pool d'hôtes existant dans le portail | Desktop Virtualization Host Pool Contributor et Virtual Machine Contributor |
| Secrets du coffre de clés lus pendant le déploiement | Key Vault Secrets User |
| Attribution des utilisateurs au groupe d'applications | Un rôle avec `Microsoft.Authorization/roleAssignments/write` : User Access Administrator ou Owner |

Pour une jonction à un domaine AD DS, le compte de jonction a besoin, sur l'unité d'organisation cible, de : réinitialiser le mot de passe, écriture validée du nom d'hôte DNS, écriture validée du nom de principal du service, lecture et écriture des restrictions de compte. Pour Microsoft Entra Domain Services, le compte doit être membre de **AAD DC Administrators**. Le sous-réseau doit joindre les URL requises du service, sinon l'inscription échoue.

L'onglet **Informations de base** fixe les choix qui ne peuvent pas changer ensuite :

| Champ | Valeurs et règles |
| --- | --- |
| Approche de gestion | **Standard** ou **Utiliser une configuration d'hôte de session**. Fixée à la création : un pool d'hôtes standard ne peut pas recevoir de configuration d'hôte de session plus tard |
| Type de pool d'hôtes | Pooled (regroupé) ou Personal (personnel). Une configuration d'hôte de session ne prend en charge que le type **regroupé** |
| Algorithme d'équilibrage de charge (regroupé) | Breadth-first (largeur d'abord) ou depth-first (profondeur d'abord), plus la **limite maximale de sessions** |
| Type d'attribution (personnel) | Automatique ou Direct ; avec Direct, en option **Attribuer plusieurs bureaux à un même utilisateur**, impossible à désactiver une fois activée |
| Type de groupe d'applications préféré | Desktop ou RemoteApp ; le portail crée un groupe d'applications Desktop |
| Environnement de validation | Oui ou Non |

L'onglet **Machines virtuelles** (gestion standard) crée les hôtes de session en même temps :

- **Préfixe de nom** de 11 caractères au maximum (10 avec une configuration d'hôte de session) ; Azure ajoute un trait d'union et un numéro (`hp01-sh-0`), et le nom complet de l'ordinateur est limité à 15 caractères.
- **Nombre de machines virtuelles** : jusqu'à 400 en un déploiement, dans la limite du quota. Vous pouvez en ajouter plus tard.
- **Type de sécurité** : Standard, **Trusted launch** (lancement sécurisé, par défaut) ou machines virtuelles confidentielles.
- **Image** : Place de marché Azure, Azure Compute Gallery ou image managée (voir le chapitre sur les images).
- **Options de disponibilité** : zones de disponibilité, groupe à haute disponibilité ou aucune.
- **Mise en veille prolongée** : pools d'hôtes personnels uniquement, non prise en charge avec FSLogix ni App attach.
- **Réseau et sécurité** : réseau virtuel et sous-réseau ; **Ports d'entrée publics : Non** (les hôtes de session n'ont besoin d'aucun port entrant ; l'agent se connecte au service en sortie). Préférez un NSG sur le sous-réseau à un NSG par carte réseau.
- **Domaine à joindre** : Microsoft Entra ID ou Active Directory (AD DS ou Microsoft Entra Domain Services, avec chemin d'unité d'organisation et identifiants de jonction).
- **Compte administrateur de machine virtuelle** : l'administrateur local.

L'onglet **Espace de travail** inscrit le groupe d'applications de bureau dans un espace de travail nouveau ou existant, et l'onglet **Gestion** peut activer les paramètres de diagnostic vers un espace de travail Log Analytics.

> **Piège d'examen.** Les utilisateurs ne peuvent se connecter qu'après leur attribution à un **groupe d'applications** (rôle Desktop Virtualization User). Créer le pool d'hôtes, les hôtes de session et l'espace de travail ne suffit pas, et attribuer un rôle sur le pool d'hôtes lui-même ne donne accès à aucune ressource.

Pour ajouter des hôtes de session à un pool d'hôtes standard existant : **Pools d'hôtes > `<pool>` > Hôtes de session > + Ajouter**. Le portail reprend les paramètres du pool et génère une clé d'inscription. Avec une configuration d'hôte de session, vous augmentez seulement la taille du pool d'hôtes et le service crée les machines virtuelles à partir de la configuration.

<!-- section: automation | objectives: 1.4.2 -->
## Automatiser avec PowerShell, Azure CLI, les modèles ARM et Bicep

Le fournisseur de ressources est `Microsoft.DesktopVirtualization`. L'ordre est toujours le même : pool d'hôtes, groupe d'applications lié au pool d'hôtes, espace de travail qui référence le groupe d'applications, jeton d'inscription, machines virtuelles qui installent l'agent avec le jeton, puis attributions des utilisateurs.

```powershell
# Module Az.DesktopVirtualization
$hp = New-AzWvdHostPool -ResourceGroupName rg-avd -Name hp-finance -Location westeurope `
    -HostPoolType Pooled -LoadBalancerType BreadthFirst -PreferredAppGroupType Desktop `
    -MaxSessionLimit 10

$dag = New-AzWvdApplicationGroup -ResourceGroupName rg-avd -Name hp-finance-dag `
    -Location westeurope -ApplicationGroupType Desktop -HostPoolArmPath $hp.Id

New-AzWvdWorkspace -ResourceGroupName rg-avd -Name ws-finance -Location westeurope `
    -ApplicationGroupReference $dag.Id

New-AzWvdRegistrationInfo -ResourceGroupName rg-avd -HostPoolName hp-finance `
    -ExpirationTime $((Get-Date).ToUniversalTime().AddHours(8).ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ'))

New-AzRoleAssignment -SignInName ana@contoso.com -RoleDefinitionName "Desktop Virtualization User" `
    -ResourceName hp-finance-dag -ResourceGroupName rg-avd `
    -ResourceType 'Microsoft.DesktopVirtualization/applicationGroups'
```

```bash
# Extension desktopvirtualization (installed on first use)
az desktopvirtualization hostpool create -g rg-avd -n hp-finance --location westeurope \
  --host-pool-type Pooled --load-balancer-type BreadthFirst \
  --preferred-app-group-type Desktop --max-session-limit 10 \
  --registration-info expiration-time="2026-12-01T08:00:00.000Z" registration-token-operation=Update

az desktopvirtualization hostpool retrieve-registration-token -g rg-avd -n hp-finance
```

Valeurs acceptées à reconnaître :

| Paramètre | Valeurs |
| --- | --- |
| Type de pool d'hôtes | `Pooled`, `Personal` |
| Type d'équilibrage de charge | `BreadthFirst`, `DepthFirst` (regroupé) ; `Persistent` (personnel) |
| Type de groupe d'applications préféré | `Desktop`, `RailApplications` (RemoteApp), `None` |
| Type d'attribution de bureau personnel | `Automatic`, `Direct` |
| Opération sur le jeton d'inscription | `Update` (créer ou renouveler), `Delete`, `None` |

En Bicep ou dans un modèle ARM, les mêmes objets sont trois ressources liées par ID de ressource :

```bicep
param location string = resourceGroup().location
param baseTime string = utcNow()

resource hostPool 'Microsoft.DesktopVirtualization/hostPools@2024-04-03' = {
  name: 'hp-finance'
  location: location
  properties: {
    hostPoolType: 'Pooled'
    loadBalancerType: 'DepthFirst'
    maxSessionLimit: 12
    preferredAppGroupType: 'Desktop'
    validationEnvironment: false
    registrationInfo: {
      expirationTime: dateTimeAdd(baseTime, 'PT8H')
      registrationTokenOperation: 'Update'
    }
  }
}

resource dag 'Microsoft.DesktopVirtualization/applicationGroups@2024-04-03' = {
  name: 'hp-finance-dag'
  location: location
  properties: {
    applicationGroupType: 'Desktop'
    hostPoolArmPath: hostPool.id
  }
}

resource ws 'Microsoft.DesktopVirtualization/workspaces@2024-04-03' = {
  name: 'ws-finance'
  location: location
  properties: {
    applicationGroupReferences: [
      dag.id
    ]
  }
}
```

Les hôtes de session sont des machines virtuelles ordinaires : le modèle ou le script les crée, les joint au domaine ou à Microsoft Entra ID, puis installe l'**agent Azure Virtual Desktop** et le **chargeur de démarrage de l'agent** (Agent Bootloader) avec le jeton d'inscription (les modèles Microsoft utilisent une extension PowerShell DSC : ne désactivez pas WinRM). Manuellement, vous lancez l'installateur de l'agent, collez le jeton quand il est demandé, puis lancez l'installateur du chargeur de démarrage ; l'hôte passe à **Disponible** une fois inscrit. Sur Windows Server, installez d'abord le rôle Hôte de session Bureau à distance.

Règles du jeton d'inscription :

- Sa durée de vie est choisie à la génération, **jusqu'à 27 jours** ; générez-en un nouveau pour un déploiement plus long. Un hôte qui s'inscrit avec un jeton expiré échoue avec `EXPIRED_MACHINE_TOKEN`.
- Le jeton ne sert qu'à l'**inscription**. Une fois inscrit, l'hôte conserve un jeton machine qui se renouvelle seul, mais un hôte éteint plus de 90 jours le perd.
- Avec une configuration d'hôte de session, vous ne pouvez pas récupérer de jeton d'inscription pour ajouter des hôtes construits hors du service.

> **Piège d'examen.** Une question qui montre des hôtes déployés mais bloqués à **Indisponible** ou absents du pool désigne en général l'étape d'inscription : jeton expiré, agent non installé ou accès sortant bloqué vers les URL requises. Les ports entrants et les adresses IP publiques ne sont jamais la solution.

<!-- section: host-pool-settings | objectives: 1.4.3 -->
## Configurer les paramètres du pool d'hôtes et des hôtes de session

La plupart des paramètres se trouvent dans **Pools d'hôtes > `<pool>` > Propriétés** et peuvent changer à tout moment avec `Update-AzWvdHostPool` ou `az desktopvirtualization hostpool update`. Seuls le type de pool d'hôtes, l'approche de gestion et l'étendue de déploiement sont figés.

| Exigence | Paramètre |
| --- | --- |
| Répartir les utilisateurs uniformément pour les meilleures performances | Breadth-first (aucune limite de sessions nécessaire ; limite par défaut 999999) |
| Remplir un hôte avant le suivant, pour éteindre les hôtes inactifs et réduire les coûts | Depth-first, avec une **limite maximale de sessions** (obligatoire) |
| Chaque utilisateur reçoit la même machine virtuelle personnelle dès sa première connexion, sans action d'un administrateur | Personnel, type d'attribution **Automatique** |
| Un administrateur choisit quel utilisateur reçoit quelle machine virtuelle personnelle | Personnel, type d'attribution **Direct** |
| Recevoir les mises à jour du service avant la production pour les tester | **Environnement de validation : Oui** sur un pool hors production |
| Mises à jour de l'agent uniquement pendant une fenêtre le week-end | **Mises à jour planifiées de l'agent** |
| Maintenir un hôte sans que de nouveaux utilisateurs arrivent | **Mode drainage** sur l'hôte de session |

Comment les algorithmes choisissent :

- **Breadth-first** choisit au hasard parmi la moitié des hôtes disponibles qui ont le moins de sessions : la répartition n'est donc pas parfaitement égale.
- **Depth-first** choisit l'hôte disponible qui a le plus de sessions tout en restant sous la limite. Quand tous les hôtes atteignent la limite, les nouvelles connexions échouent jusqu'à ce que vous releviez la limite ou ajoutiez des hôtes.
- Abaisser la limite ne déconnecte pas les sessions existantes.

```powershell
Update-AzWvdHostPool -ResourceGroupName rg-avd -Name hp-finance `
    -LoadBalancerType DepthFirst -MaxSessionLimit 12

# Drain mode: no new sessions on this host
Update-AzWvdSessionHost -ResourceGroupName rg-avd -HostPoolName hp-finance `
    -Name hp01-sh-0.contoso.com -AllowNewSession:$false
```

Le **mode drainage** (portail : **Hôtes de session**, sélectionnez les hôtes, **Activer le mode drainage**) arrête les nouvelles sessions sur un hôte. Les sessions existantes continuent, et un utilisateur qui a une session active ou déconnectée sur cet hôte y est toujours reconnecté. Utilisez-le avant de corriger, redimensionner ou supprimer un hôte.

Les **mises à jour planifiées de l'agent** déterminent quand se mettent à jour l'agent, la pile côte à côte (side-by-side stack) et l'agent Geneva Monitoring : une ou deux fenêtres de maintenance de **deux heures**, définies au niveau du pool d'hôtes, dans un seul fuseau horaire ou dans l'heure locale de chaque hôte. Elles ne peuvent être activées que sur un pool d'hôtes existant ; les hôtes doivent être démarrés pendant la fenêtre, et après quatre tentatives échouées la mise à jour est forcée. Les mises à jour de sécurité critiques ignorent la planification.

Un **environnement de validation** reçoit les mises à jour du service en premier. Gardez-le proche de la production, faites-y se connecter des utilisateurs régulièrement et ne l'utilisez pas pour la production. Modifier ce paramètre demande au minimum Desktop Virtualization Host Pool Contributor.

Autres propriétés détaillées dans les chapitres suivants : **propriétés RDP** (redirections, affichage, authentification), **Démarrer la machine virtuelle à la connexion** (Start VM on Connect), **plans de mise à l'échelle** et délais d'expiration de session.

> **Piège d'examen.** L'équilibrage de charge ne s'applique qu'aux pools d'hôtes **regroupés**. Un pool d'hôtes personnel envoie toujours l'utilisateur vers son hôte attribué ; si l'exigence est de réattribuer un bureau personnel, modifiez l'attribution, pas l'algorithme.

<!-- section: licensing | objectives: 1.4.4 -->
## Configurer les licences des hôtes de session

Le service Azure Virtual Desktop lui-même n'a pas de licence distincte pour les utilisateurs internes : chaque utilisateur a besoin d'une **licence éligible**, et les machines virtuelles sont facturées comme du calcul Azure.

| Système d'exploitation de l'hôte de session | Utilisateurs internes (employés, sous-traitants) | Utilisateurs externes (clients d'une application SaaS) |
| --- | --- | --- |
| Windows 11 ou Windows 10 Entreprise, session unique ou multisession | Microsoft 365 E3, E5, A3, A5, F3, Business Premium, Student Use Benefit ; Windows Entreprise E3, E5 ; Windows Éducation A3, A5 ; Windows VDA par utilisateur | **Tarification de l'accès par utilisateur** sur un abonnement Azure inscrit |
| Windows Server 2016, 2019, 2022 ou 2025 | **CAL RDS** avec Software Assurance (par utilisateur ou par appareil), ou licences d'abonnement utilisateur RDS | Non pris en charge : pas de tarification de l'accès par utilisateur pour Windows Server |

**Hôtes de session Windows client.** La licence du système d'exploitation est couverte par les licences éligibles des utilisateurs. Le portail et les modèles Microsoft définissent automatiquement le `LicenseType` de la machine virtuelle à `Windows_Client` ; pour un hôte créé autrement, appliquez-le afin de ne pas payer deux fois une licence Windows :

```powershell
$vm = Get-AzVM -ResourceGroupName rg-avd -Name hp01-sh-0
$vm.LicenseType = "Windows_Client"
Update-AzVM -ResourceGroupName rg-avd -VM $vm
```

**Hôtes de session Windows Server.** Chaque utilisateur ou appareil a besoin d'une **CAL RDS**, délivrée par un **serveur de licences Bureau à distance** que les hôtes de session peuvent joindre (local ou dans Azure). Désignez-le aux hôtes par stratégie de groupe, sous Configuration ordinateur > Modèles d'administration > Composants Windows > Services Bureau à distance > Hôte de session Bureau à distance > Gestion des licences :

- **Utiliser les serveurs de licences Bureau à distance spécifiés** (Use the specified Remote Desktop license servers) : les noms des serveurs de licences.
- **Définir le mode de licence du Bureau à distance** (Set the Remote Desktop licensing mode) : **Par utilisateur** ou **Par appareil**, selon les CAL achetées.

| Règle des CAL | Détail |
| --- | --- |
| Période de grâce | 120 jours sans serveur de licences ; ensuite, les connexions exigent une CAL |
| Par utilisateur | Attribuée à un utilisateur dans Active Directory ; inutilisable dans un groupe de travail |
| Par appareil | Attribuée à un appareil ; convient aux équipes postées qui partagent des ordinateurs |
| Version | La version de la CAL doit être égale ou postérieure à la version Windows Server de l'hôte de session |

La **tarification de l'accès par utilisateur** est réservée à l'usage commercial externe : l'abonnement est inscrit, chaque utilisateur qui se connecte au moins une fois dans le mois est facturé d'un prix mensuel forfaitaire (niveau Apps ou niveau Desktops + apps), et elle n'inclut pas Microsoft Office. Les identités invitées (B2B) utilisées par votre propre personnel ou vos sous-traitants ne la rendent pas applicable ; elles ont besoin d'une licence éligible comme les utilisateurs internes.

> **Piège d'examen.** La tarification de l'accès par utilisateur n'est pas un moyen de licencier des invités ou des sous-traitants, et elle ne couvre jamais Windows Server. Les sous-traitants sont des utilisateurs internes : donnez-leur Microsoft 365 E3 ou une autre licence éligible. Les hôtes de session Windows Server exigent toujours des CAL RDS.

<!-- section: key-points -->
## Points clés

- Un déploiement = pool d'hôtes + groupe d'applications + espace de travail + attributions des utilisateurs au groupe d'applications (Desktop Virtualization User).
- Le type de pool d'hôtes, l'approche de gestion et l'étendue de déploiement sont fixés à la création ; une configuration d'hôte de session ne prend en charge que les pools regroupés.
- Les hôtes de session n'ont besoin d'aucun port entrant : ils s'inscrivent en sortie avec un jeton valide jusqu'à 27 jours.
- Breadth-first pour les performances, depth-first avec une limite maximale de sessions pour les coûts ; l'équilibrage de charge ne s'applique pas aux pools personnels.
- Le mode drainage bloque les nouvelles sessions ; les mises à jour planifiées de l'agent utilisent des fenêtres de deux heures ; un pool de validation reçoit les mises à jour du service en premier.
- Windows client : licence éligible par utilisateur et `Windows_Client` ; Windows Server : CAL RDS et serveur de licences joignable ; utilisateurs externes : tarification de l'accès par utilisateur.
