Le rôle serveur DHCP de Windows Server attribue des adresses IPv4 et des options aux clients locaux ; dans Azure, la plateforme attribue elle-même les adresses. Les questions d'examen donnent une étendue, quelques serveurs et un symptôme (pas de bail, mauvaise passerelle, adresse en double, client qui perd son adresse quand un serveur tombe) et demandent quel objet ou quel paramètre DHCP modifier, ou à quel endroit une adresse doit être configurée dans un réseau hybride.

<!-- section: dhcp-role | objectives: 4.2.1 -->
## Implémenter et configurer le rôle serveur DHCP

Le serveur a besoin d'une adresse IPv4 statique. Dans un domaine AD DS, un serveur DHCP doit être **autorisé** dans Active Directory : un serveur DHCP Windows non autorisé dans un domaine n'attribue aucun bail.

```powershell
Install-WindowsFeature DHCP -IncludeManagementTools
Add-DhcpServerSecurityGroup                       # creates DHCP Administrators and DHCP Users
Add-DhcpServerInDC -DnsName DHCP1.corp.contoso.com -IPAddress 10.0.0.3
Get-DhcpServerInDC
Set-DhcpServerv4Binding -BindingState $true -InterfaceAlias "Ethernet"
```

Dans un groupe de travail, il n'y a pas d'étape d'autorisation : n'exécutez pas `Add-DhcpServerInDC`.

**Inscription DNS par le serveur DHCP** (`Set-DhcpServerv4DnsSetting`, au niveau du serveur ou de l'étendue) :

| Paramètre | Effet |
| --- | --- |
| `-DynamicUpdates OnClientRequest` | Le serveur inscrit ce que le client demande : un client Windows demande au serveur son enregistrement PTR et inscrit lui-même son enregistrement A |
| `-DynamicUpdates Always` | Le serveur inscrit les enregistrements A et PTR |
| `-DynamicUpdates Never` | Aucune inscription par le serveur |
| `-UpdateDnsRRForOlderClients $true` | Inscrit les enregistrements des clients qui n'envoient pas l'option FQDN (81) |
| `-DeleteDnsRROnLeaseExpiry $true` | Supprime les enregistrements à l'expiration du bail |
| `-NameProtection $true` | Fait échouer la mise à jour au lieu d'écraser un enregistrement existant du même nom |

Dans les zones sécurisées, le serveur qui inscrit un enregistrement en est le propriétaire. Configurez tous les serveurs DHCP avec le même **compte d'utilisateur dédié** (`Set-DhcpServerDnsCredential`) pour qu'un serveur partenaire puisse mettre à jour les enregistrements. Faites-le aussi quand DHCP s'exécute sur un contrôleur de domaine : sinon le service utilise les autorisations du contrôleur de domaine, qui peuvent modifier ou supprimer tout enregistrement d'une zone sécurisée. Ajouter les serveurs DHCP au groupe **DnsUpdateProxy** laisse leurs enregistrements non sécurisés.

Autres paramètres de niveau serveur :

- **Détection de conflits** (`Set-DhcpServerSetting -ConflictDetectionAttempts 1` à `5`, 0 par défaut) : le serveur envoie un ping à une adresse avant de l'attribuer.
- **Filtres** : listes d'autorisation ou de refus d'adresses MAC (`Add-DhcpServerv4Filter -List Allow`, puis activation de la liste avec `Set-DhcpServerv4FilterList -Allow $true`).
- **Stratégies** : des conditions sur l'adresse MAC, la classe de fournisseur, la classe d'utilisateur, l'identificateur client, le FQDN ou les informations de l'agent de relais attribuent une plage d'adresses IP et des options à un groupe de clients.
- **Relais DHCP** : les diffusions ne traversent pas les routeurs. Configurez le routeur (`ip helper-address`) ou installez le service de rôle **Routage** de l'accès à distance sur un serveur du sous-réseau distant et ajoutez l'agent de relais DHCP.

```powershell
Set-DhcpServerv4DnsSetting -DynamicUpdates "Always" -DeleteDnsRROnLeaseExpiry $true -NameProtection $true
Set-DhcpServerDnsCredential -Credential (Get-Credential) -ComputerName DHCP1
Add-DhcpServerv4Policy -Name "HyperVPolicy" -Condition OR -MacAddress EQ,00155D*
Add-DhcpServerv4PolicyIPRange -ScopeId 10.10.10.0 -Name "HyperVPolicy" -StartRange 10.10.10.10 -EndRange 10.10.10.20
```

> **Piège d'examen.** Un nouveau serveur DHCP du domaine qui ne distribue rien, alors que son service tourne et que l'étendue est active, n'est généralement pas autorisé. Autorisez-le ; ne réinstallez pas le rôle.

<!-- section: dhcp-scopes | objectives: 4.2.3 -->
## Créer et gérer des étendues DHCP

Une **étendue** est la plage d'adresses d'un sous-réseau que le serveur peut attribuer, avec un masque de sous-réseau, une durée de bail, des exclusions, des réservations et des options. Chaque sous-réseau a une seule étendue avec une plage continue ; pour garder des adresses aux appareils statiques, créez des **plages d'exclusion** dans la plage.

```powershell
Add-DhcpServerv4Scope -Name "Paris LAN" -StartRange 10.10.10.1 -EndRange 10.10.10.254 `
  -SubnetMask 255.255.255.0 -LeaseDuration 4.00:00:00 -State Active
Add-DhcpServerv4ExclusionRange -ScopeId 10.10.10.0 -StartRange 10.10.10.1 -EndRange 10.10.10.25
Set-DhcpServerv4OptionValue -ScopeId 10.10.10.0 -Router 10.10.10.1 `
  -DnsServer 10.10.0.10, 10.10.0.11 -DnsDomain "corp.contoso.com"
Set-DhcpServerv4OptionValue -OptionId 6 -Value 10.10.0.10       # server level
Set-DhcpServerv4Scope -ScopeId 10.10.10.0 -State InActive
Get-DhcpServerv4ScopeStatistics
```

| Option | Code |
| --- | --- |
| Routeur (passerelle par défaut) | 003 |
| Serveurs DNS | 006 |
| Nom de domaine DNS | 015 |
| Serveurs WINS | 044 |

Les options se définissent à quatre niveaux : **serveur** (toutes les étendues), **étendue**, **stratégie** et **réservation**. Une valeur définie à un niveau plus précis remplace la valeur du serveur pour les clients concernés, par exemple une passerelle au niveau de la réservation pour un seul appareil.

| Objet | Usage |
| --- | --- |
| Superétendue | Regroupe plusieurs étendues pour servir plusieurs sous-réseaux logiques sur un même réseau physique (`Add-DhcpServerv4Superscope`) |
| Étendue multidiffusion | Attribue des adresses de multidiffusion (classe D) |
| Étendue inactive | Définie mais ne répond pas aux clients ; activez-la une fois prête |
| Option 82, sous-option 5 (sélection de lien) | Permet à un agent de relais de demander une adresse dans l'étendue d'un sous-réseau précis |

Les clients renouvellent à **50 %** du bail (en monodiffusion vers leur serveur) et tentent une nouvelle liaison (rebind) à **87,5 %** (en diffusion vers n'importe quel serveur). Les baux courts conviennent aux sous-réseaux où passent beaucoup d'appareils ; une option modifiée n'atteint les clients qu'à leur renouvellement.

> **Piège d'examen.** Pour tenir les serveurs statiques à l'écart des baux DHCP, créez une plage d'exclusion ; pour qu'un appareil reçoive toujours la même adresse en bail avec ses propres options, créez une réservation. Une plage d'étendue plus petite que le sous-réseau ne remplace pas les exclusions quand des adresses statiques se trouvent dans la plage.

<!-- section: reservations | objectives: 4.2.4 -->
## Créer des réservations IP

Une réservation lie une adresse de l'étendue à un identificateur client, l'**adresse MAC** pour les clients IPv4. L'appareil reste client DHCP : vous pouvez changer son adresse ou ses options de façon centralisée sans vous y connecter, mais il dépend de la disponibilité du serveur DHCP.

```powershell
Add-DhcpServerv4Reservation -ScopeId 10.10.10.0 -IPAddress 10.10.10.30 `
  -ClientId "F0-DE-F1-7A-00-5E" -Description "Printer floor 2"
# Convert an existing lease into a reservation
Get-DhcpServerv4Lease -IPAddress 10.10.10.57 | Add-DhcpServerv4Reservation
# Reservation-level option
Set-DhcpServerv4OptionValue -ReservedIP 10.10.10.30 -Router 10.10.10.254
```

| Règle | Détail |
| --- | --- |
| Adresse | Doit appartenir à la plage de l'étendue et être libre |
| Type | `DHCP`, `BootP` ou `Both` (`Both` par défaut) |
| Création en masse | `Import-Csv` redirigé vers `Add-DhcpServerv4Reservation` |
| Étendues en basculement | Répliquez l'étendue après l'ajout d'une réservation pour que le partenaire la connaisse |

| Exigence | Réponse |
| --- | --- |
| L'appareil a besoin de la même adresse et se gère depuis DHCP | Réservation |
| L'appareil doit fonctionner même quand DHCP est en panne (routeur, serveur DNS, serveur DHCP) | Adresse statique, exclue de l'étendue |
| Empêcher DHCP d'attribuer les adresses utilisées par des appareils statiques | Plage d'exclusion |

> **Piège d'examen.** Une réservation repose sur l'adresse MAC. Après le remplacement de la carte réseau d'une imprimante, ou le passage d'une machine virtuelle sur une nouvelle carte avec une autre adresse MAC, l'appareil reçoit une adresse dynamique tant que la réservation n'est pas mise à jour.

<!-- section: dhcp-ha | objectives: 4.2.5 -->
## Implémenter la haute disponibilité pour DHCP

Le **basculement DHCP** réplique les étendues IPv4 et leurs baux entre **deux** serveurs DHCP Windows, tous deux sous Windows Server 2016 ou ultérieur. Les étendues DHCPv6 ne peuvent pas utiliser le basculement.

| Mode | Comportement | Paramètres |
| --- | --- | --- |
| Équilibrage de charge (par défaut) | Les deux serveurs attribuent des baux ; les demandes sont réparties par un hachage de l'adresse MAC du client | `-LoadBalancePercent` (50 par défaut) |
| Secours à chaud | Le serveur actif attribue les baux ; le serveur de secours ne répond que si le serveur actif est indisponible | `-ServerRole Active` ou `Standby` ; `-ReservePercent` (5 % par défaut) réservé au serveur de secours |

| Paramètre | Par défaut | Signification |
| --- | --- | --- |
| Durée maximale du délai d'exécution du client (MCLT) | 1 heure | Durée du bail accordé par un partenaire qui renouvelle un client de l'autre serveur, et attente avant de reprendre toute la plage |
| `-AutoStateTransition` / `-StateSwitchInterval` | Désactivé | Passe automatiquement de l'état *interruption des communications* à *partenaire indisponible* après l'intervalle |
| `-SharedSecret` | Aucun | Authentifie les messages de basculement |

```powershell
Add-DhcpServerv4Failover -ComputerName DHCP1 -Name "DHCP1-DHCP2" -PartnerServer DHCP2 `
  -ScopeId 10.10.10.0, 10.20.20.0 -LoadBalancePercent 70 -MaxClientLeadTime 2:00:00 `
  -SharedSecret "<secret>"
Add-DhcpServerv4Failover -ComputerName DHCP1 -Name "HQ-Branch" -PartnerServer DHCP3 `
  -ScopeId 10.30.30.0 -ServerRole Standby -ReservePercent 10
Set-DhcpServerv4Failover -Name "DHCP1-DHCP2" -LoadBalancePercent 50
Invoke-DhcpServerv4FailoverReplication -ComputerName DHCP1 -Name "DHCP1-DHCP2"
```

Règles de déploiement :

- Les modifications d'étendue ne sont pas répliquées automatiquement : lancez **Répliquer l'étendue** ou `Invoke-DhcpServerv4FailoverReplication` depuis le serveur qui a les bons paramètres (il écrase ceux du partenaire), de préférence celui qui a le système d'exploitation le plus récent.
- Les clients doivent joindre les deux serveurs : configurez l'agent de relais avec les adresses des **deux** serveurs.
- Les partenaires communiquent sur **TCP 647** (règles de pare-feu créées avec le rôle) et leurs horloges doivent avoir moins d'une minute d'écart.
- Les deux serveurs doivent utiliser les mêmes informations d'identification pour les mises à jour DNS.
- Un cluster DHCP compte comme un seul serveur : utilisez le nom ou l'adresse IP du cluster comme partenaire, jamais un nœud, et répliquez le secret partagé sur tous les nœuds.
- Utilisez l'équilibrage de charge quand les deux serveurs sont sur le même site ; le secours à chaud quand un serveur central sert de secours à celui d'une agence.

> **Piège d'examen.** En secours à chaud, pendant le MCLT, le serveur de secours n'attribue de nouvelles adresses que dans son pourcentage de réserve. Un serveur de secours qui « manque d'adresses » peu après la panne du serveur actif a besoin d'un `ReservePercent` plus élevé ou d'un passage à l'état partenaire indisponible, pas d'une nouvelle étendue.

<!-- section: troubleshoot-ip | objectives: 4.2.2 -->
## Résoudre les problèmes d'adressage IP dans les environnements hybrides

Un bail DHCP suit le processus **DORA** : Discover et Request sont des diffusions émises depuis 0.0.0.0, Offer et Acknowledgment viennent du serveur (par un agent de relais entre sous-réseaux).

| Symptôme | Cause probable et vérification |
| --- | --- |
| Adresse 169.254.x.y (APIPA) | Aucune réponse DHCP : agent de relais absent ou erroné, serveur non autorisé, étendue inactive ou pleine, service arrêté. `ipconfig /all`, `ipconfig /renew` |
| Seuls les clients d'un sous-réseau échouent | Agent de relais de ce sous-réseau, ou liaison du serveur (`Get-DhcpServerv4Binding`) |
| Baux BAD_ADDRESS, avertissements d'adresse en double | Appareils statiques dans la plage : ajoutez des exclusions ; activez la détection de conflits (`Get-DhcpServerv4Lease -BadLeases`) |
| Étendue épuisée | `Get-DhcpServerv4ScopeStatistics` ; raccourcissez le bail, élargissez la plage ou ajoutez une superétendue |
| Mauvaise passerelle ou mauvais serveur DNS | Option définie au mauvais niveau, ou remplacée par une réservation ou une stratégie ; le client doit renouveler pour recevoir les changements |
| Le serveur DHCP ne répond pas du tout | Un autre processus sur UDP 67/68 (`netstat -anb`), exemption IPsec, journal du serveur DHCP dans `%windir%\System32\Dhcp` |

Spécificités d'Azure :

| Fait | Conséquence |
| --- | --- |
| Azure fournit le DHCP aux machines virtuelles Azure ; la diffusion et la multidiffusion ne sont pas prises en charge dans un réseau virtuel | Un serveur DHCP Windows ne peut pas attribuer d'adresses aux machines virtuelles Azure. Il peut servir des clients **locaux** par un agent de relais, mais le trafic direct du client vers le serveur (UDP 68 vers 67) n'est pas pris en charge : les renouvellements à T1 expirent et réussissent à T2 par le relais |
| Azure réserve cinq adresses par sous-réseau (réseau, `.1`, `.2`, `.3`, diffusion) | Une adresse statique doit être l'une des autres |
| L'adresse IP privée d'une machine virtuelle Azure se définit sur son interface réseau (dynamique ou statique) | Ne la définissez jamais à la main dans Windows ; une incohérence coupe la machine virtuelle du réseau |
| Les réseaux virtuels se connectent à d'autres réseaux virtuels et aux réseaux locaux seulement si les espaces d'adressage ne se chevauchent pas | Prévoyez des plages sans chevauchement avant un VPN, ExpressRoute ou un peering ; le peering est refusé si les plages se chevauchent |
| La passerelle par défaut d'Azure ne répond pas au ping | Testez plutôt avec `Test-NetConnection` vers une machine virtuelle ou utilisez Network Watcher |

```powershell
ipconfig /all
ipconfig /release; ipconfig /renew
Get-NetIPConfiguration
Test-NetConnection -ComputerName 10.20.1.4 -Port 3389
Get-DhcpServerv4Lease -ScopeId 10.10.10.0 -BadLeases
```

> **Piège d'examen.** Après le déplacement d'un serveur DHCP vers une machine virtuelle Azure, les clients locaux reçoivent des adresses APIPA quand les agents de relais pointent encore vers l'ancienne adresse du serveur : mettez à jour chaque agent de relais. Un serveur DHCP dans Azure ne sert que des clients locaux, jamais les machines virtuelles du réseau virtuel.

<!-- section: key-points -->
## Points clés

- Dans un domaine, autorisez le serveur DHCP (`Add-DhcpServerInDC`) ; sinon il n'attribue rien.
- Une étendue par sous-réseau ; des exclusions pour les appareils statiques ; options au niveau serveur, étendue, stratégie ou réservation, le plus précis l'emporte.
- Réservation = adresse MAC vers adresse IP, type Both par défaut ; adresses statiques pour les serveurs d'infrastructure.
- Basculement : deux serveurs, IPv4 uniquement, équilibrage de charge (50 %) ou secours à chaud (5 % de réserve), MCLT 1 heure, TCP 647, réplication manuelle des modifications d'étendue, relais vers les deux serveurs.
- APIPA 169.254.x.y = aucune réponse DHCP ; BAD_ADDRESS = conflit avec un appareil statique.
- Azure attribue lui-même les adresses des machines virtuelles (statique sur l'interface réseau), réserve cinq adresses par sous-réseau et exige des plages sans chevauchement pour la connectivité hybride.
