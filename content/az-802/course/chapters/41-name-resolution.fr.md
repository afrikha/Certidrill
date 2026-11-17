Le DNS de Windows Server résout les noms pour AD DS, pour les clients locaux et, par le transfert, pour Azure. Les questions d'examen décrivent des zones, des serveurs et une résolution qui échoue, puis demandent quel type de zone, quelle étendue de réplication, quel redirecteur, quelle stratégie ou quel paramètre DNSSEC corrige le problème. La plupart des réponses découlent de l'endroit où la zone est stockée et de l'ordre dans lequel un serveur DNS tente de résoudre une requête.

<!-- section: dns-ad-ds | objectives: 4.1.1 -->
## Intégrer DNS à AD DS

AD DS dépend du DNS : les contrôleurs de domaine inscrivent des **enregistrements SRV** (LDAP, Kerberos, catalogue global, PDC) et un **CNAME** basé sur un GUID sous `_msdcs.<domain>`, que les clients et les partenaires de réplication utilisent pour les localiser. Installez DNS lors de la promotion du premier contrôleur de domaine ; l'assistant crée les zones et la délégation.

Les **zones intégrées à Active Directory** sont stockées dans AD DS au lieu d'un fichier. Elles ne sont disponibles que sur les serveurs DNS qui sont contrôleurs de domaine, et apportent :

- Des mises à jour multimaîtres : chaque contrôleur de domaine qui exécute DNS peut écrire dans la zone. Aucune topologie de transfert de zone n'est nécessaire : la réplication AD DS transporte la zone.
- Les **mises à jour dynamiques sécurisées** : seul le propriétaire d'un enregistrement (selon son ACL) peut le modifier.

| Étendue de réplication (Gestionnaire DNS) | `-ReplicationScope` | Partition |
| --- | --- | --- |
| Tous les serveurs DNS exécutés sur des contrôleurs de domaine de cette forêt | `Forest` | ForestDnsZones |
| Tous les serveurs DNS exécutés sur des contrôleurs de domaine de ce domaine | `Domain` | DomainDnsZones |
| Tous les contrôleurs de domaine de ce domaine (compatibilité Windows 2000) | `Legacy` | Partition de domaine |
| Tous les contrôleurs de domaine d'une partition d'application spécifiée | `Custom` | Une partition que vous créez |

```powershell
Add-DnsServerPrimaryZone -Name "corp.contoso.com" -ReplicationScope "Forest" -DynamicUpdate Secure
Set-DnsServerPrimaryZone -Name "corp.contoso.com" -ReplicationScope "Domain"
```

Dépanner l'inscription d'un contrôleur de domaine :

```powershell
dcdiag /test:dns /v /s:DC1
dcdiag /test:dns /v /s:DC1 /DnsDynamicUpdate
net stop netlogon; net start netlogon    # re-registers the DC locator records
ipconfig /flushdns; ipconfig /registerdns  # re-registers the host (A) record
```

Autorisations : le groupe **DnsAdmins** a par défaut le contrôle total de toutes les zones ; tout utilisateur authentifié peut créer des enregistrements A et PTR dans une zone qui accepte les mises à jour sécurisées, et en devient alors le propriétaire.

> **Piège d'examen.** Une zone qui doit être disponible sur un serveur DNS qui n'est pas contrôleur de domaine ne peut pas être intégrée à Active Directory : hébergez-y une zone secondaire. Et une mise à jour dynamique sécurisée exige une zone intégrée à Active Directory.

<!-- section: zones-records | objectives: 4.1.2 -->
## Créer et gérer des zones et des enregistrements DNS

| Type de zone | Contenu | Usage |
| --- | --- | --- |
| Principale | Copie accessible en écriture, dans un fichier (`%windir%\System32\Dns\<zone>.dns`) ou dans AD DS | Là où les enregistrements sont créés et modifiés |
| Secondaire | Copie en lecture seule obtenue par transfert de zone ; ne peut pas être stockée dans AD DS | Redondance et résolution locale sur un serveur qui n'est pas contrôleur de domaine ou sur le serveur d'une autre organisation |
| De stub | Seulement les enregistrements SOA, NS et A de liaison d'une zone, actualisés depuis ses serveurs maîtres | Tenir à jour la liste des serveurs faisant autorité d'une zone déléguée ou partenaire, sans copier ses enregistrements |
| De recherche inversée | Enregistrements PTR sous `in-addr.arpa` (IPv4) | Recherches d'adresse vers nom |

Un serveur ne peut pas héberger une zone secondaire ou de stub et une zone principale pour le même nom. Les transferts de zone sont **complets** (AXFR) ou **incrémentiels** (IXFR) ; la zone principale envoie une notification (NOTIFY), et la zone secondaire vérifie aussi à l'intervalle d'actualisation du SOA. Limitez les transferts aux serveurs des enregistrements NS ou à une liste de serveurs.

```powershell
Add-DnsServerPrimaryZone -Name "east.contoso.com" -ZoneFile "east.contoso.com.dns"
Add-DnsServerSecondaryZone -Name "south.contoso.com" -ZoneFile "south.contoso.com.dns" -MasterServers 172.23.90.124
Add-DnsServerStubZone -Name "west.contoso.com" -MasterServers 172.23.90.124 -ZoneFile "west.contoso.com.dns"
Add-DnsServerPrimaryZone -NetworkID "10.1.0.0/24" -ReplicationScope "Forest"
Set-DnsServerPrimaryZone -Name "east.contoso.com" -SecureSecondaries TransferToZoneNameServer
Add-DnsServerZoneDelegation -Name "contoso.com" -ChildZoneName "branch" `
  -NameServer "ns1.branch.contoso.com" -IPAddress 172.23.90.136

Add-DnsServerResourceRecordA -ZoneName "contoso.com" -Name "app1" -IPv4Address 10.1.0.20 -CreatePtr
Add-DnsServerResourceRecordCName -ZoneName "contoso.com" -Name "www" -HostNameAlias "app1.contoso.com"
Add-DnsServerResourceRecordMX -ZoneName "contoso.com" -Name "." -MailExchange "mail.contoso.com" -Preference 10
Add-DnsServerResourceRecord -ZoneName "contoso.com" -Srv -Name "_sip._tcp" -DomainName "sip1.contoso.com" `
  -Priority 0 -Weight 0 -Port 5060
```

**Mises à jour dynamiques** (`-DynamicUpdate`) : `None`, `Secure` (zones intégrées à Active Directory uniquement) ou `NonsecureAndSecure`. Les clients DHCP s'inscrivent quand ils obtiennent ou renouvellent un bail ; les clients configurés en statique inscrivent leurs enregistrements A et PTR au démarrage et toutes les 24 heures ; `ipconfig /registerdns` force une inscription.

Le **vieillissement et nettoyage** supprime les enregistrements dynamiques obsolètes. Les deux sont désactivés par défaut et les deux doivent être activés : le nettoyage sur le serveur, le vieillissement sur la zone.

| Paramètre | Par défaut | Signification |
| --- | --- | --- |
| Intervalle sans rafraîchissement | 7 jours | Après la pose d'un horodatage, les rafraîchissements qui ne changent rien sont ignorés |
| Intervalle d'actualisation | 7 jours | Période pendant laquelle l'enregistrement peut être rafraîchi ; sans rafraîchissement au bout des deux intervalles, l'enregistrement est obsolète |
| Enregistrements statiques | Horodatage à zéro | Jamais nettoyés |

```powershell
Set-DnsServerScavenging -ScavengingState $true -ScavengingInterval 7.00:00:00 -ApplyOnAllZones
Set-DnsServerZoneAging -Name "contoso.com" -Aging $true -NoRefreshInterval 7.00:00:00 -RefreshInterval 7.00:00:00
Start-DnsServerScavenging
```

> **Piège d'examen.** Un enregistrement obsolète n'est supprimé que si le nettoyage est activé sur le serveur **et** le vieillissement sur la zone, et seulement une fois écoulés les deux intervalles depuis son horodatage. Un enregistrement créé à la main n'est jamais nettoyé.

<!-- section: forwarding | objectives: 4.1.3 -->
## Configurer le transfert DNS et le transfert conditionnel

Pour une requête récursive, un serveur DNS Windows répond à partir de ses zones faisant autorité ou de son cache ; sinon il utilise, dans l'ordre :

1. Un **redirecteur conditionnel** correspondant (zone de redirecteur pour un espace de noms DNS).
2. Une **délégation** applicable (requêtes itératives vers les serveurs de noms délégués).
3. Les **redirecteurs** de niveau serveur, dans leur ordre actif.
4. Les **indications de racine**, si la récursivité est activée, si `UseRootHint` vaut true et si le délai de récursivité n'a pas expiré.

| Exigence | Réponse |
| --- | --- |
| Envoyer toutes les requêtes internet au FAI ou à un serveur DNS central | Redirecteurs de niveau serveur |
| Résoudre l'espace de noms d'un partenaire ou d'une autre forêt par des serveurs précis | Redirecteur conditionnel |
| Tenir automatiquement à jour la liste des serveurs de noms d'une zone partenaire | Zone de stub |
| Détenir une copie complète en lecture seule d'une autre zone | Zone secondaire (exige les transferts de zone) |
| Ne jamais revenir aux indications de racine quand les redirecteurs échouent | `Set-DnsServerForwarder -UseRootHint $false` |

```powershell
Set-DnsServerForwarder -IPAddress 10.0.0.10, 10.0.0.11    # replaces the list
Add-DnsServerForwarder -IPAddress 10.0.0.12                # appends
Set-DnsServerForwarder -UseRootHint $false
Add-DnsServerConditionalForwarderZone -Name "fabrikam.com" -MasterServers 192.168.20.10, 192.168.20.11 `
  -ReplicationScope "Forest"
```

- Un redirecteur conditionnel stocké dans AD DS est répliqué vers l'étendue choisie ; sans `-ReplicationScope`, il n'existe que sur ce serveur. Créez un redirecteur conditionnel intégré à Active Directory sur un contrôleur de domaine accessible en écriture (pas sur un RODC).
- Un redirecteur conditionnel ne peut pas exister pour un nom que le serveur héberge déjà comme zone principale, secondaire ou de stub.
- Le réordonnancement dynamique des redirecteurs place les redirecteurs lents en fin de liste et revient à l'ordre configuré environ toutes les 15 minutes.

> **Piège d'examen.** Deux forêts doivent résoudre leurs noms mutuellement avant la création d'une approbation de forêt : un redirecteur conditionnel vers le domaine racine de l'autre forêt de chaque côté, stocké dans AD DS avec l'étendue de la forêt pour que chaque serveur DNS de la forêt en dispose.

<!-- section: hybrid-dns | objectives: 4.1.4 -->
## Configurer la résolution de noms DNS dans un environnement hybride

Dans Azure, le service DNS de la plateforme répond à l'adresse **168.63.129.16**, uniquement depuis Azure. Il résout les noms d'hôtes Azure, les noms publics et les **zones DNS privées** liées au réseau virtuel.

| Scénario | Configuration |
| --- | --- |
| Machines virtuelles Azure jointes au domaine | Serveurs DNS du réseau virtuel (ou de l'interface réseau) = adresses IP des contrôleurs de domaine ; les contrôleurs de domaine transfèrent les autres noms à 168.63.129.16 |
| Des clients locaux résolvent une zone DNS privée Azure | Redirecteur conditionnel local pour la zone, vers le point de terminaison entrant d'un **Azure DNS Private Resolver** (ou un serveur DNS virtuel dans un réseau virtuel lié) |
| Des machines virtuelles Azure avec le DNS fourni par Azure résolvent des noms locaux | Point de terminaison sortant de Private Resolver + ensemble de règles de transfert DNS (règle `corp.contoso.com.` vers les serveurs DNS locaux) lié au réseau virtuel |
| Des clients locaux résolvent les noms des machines virtuelles Azure inscrits automatiquement | Zone DNS privée avec inscription automatique, liée au réseau virtuel des machines, plus le chemin par le point de terminaison entrant |

Règles de Private Resolver : les points de terminaison entrant et sortant ont chacun besoin d'un sous-réseau dédié (/28 à /24) délégué à `Microsoft.Network/dnsResolvers` ; un ensemble de règles contient jusqu'à 1 000 règles ; une connectivité réseau (VPN ou ExpressRoute) est nécessaire dans les deux sens.

```powershell
# On-premises DNS server: forward the Azure private zone to the inbound endpoint
Add-DnsServerConditionalForwarderZone -Name "azure.contoso.com" -MasterServers 10.10.0.4 `
  -ReplicationScope "Forest"
# Domain controller in Azure: send everything else to Azure DNS
Set-DnsServerForwarder -IPAddress 168.63.129.16
```

- Un changement des serveurs DNS d'un réseau virtuel s'applique à une machine virtuelle après `ipconfig /renew` ou un redémarrage.
- Avec des serveurs DNS personnalisés sur le réseau virtuel, les zones privées ne sont résolues que si ces serveurs transfèrent vers 168.63.129.16 depuis un réseau virtuel lié.

> **Piège d'examen.** Un serveur DNS local ne peut pas transférer vers 168.63.129.16 : l'adresse ne répond que dans Azure. Transférez vers le point de terminaison entrant de Private Resolver ou vers un serveur DNS dans Azure.

<!-- section: dns-policies | objectives: 4.1.5 -->
## Implémenter des stratégies DNS

Les stratégies DNS (Windows Server 2016 et ultérieur, PowerShell uniquement) répondent différemment selon le sous-réseau client, l'interface, le protocole, le FQDN, le type de requête ou l'heure. Usages : gestion du trafic selon la géolocalisation, DNS « split brain », redirection selon l'heure, équilibrage de charge d'applications, filtrage et blocage.

| Objet | Rôle |
| --- | --- |
| Sous-réseau client | Liste nommée de sous-réseaux IPv4 ou IPv6 utilisée comme critère |
| Étendue de zone | Un jeu d'enregistrements distinct dans une même zone (par exemple `www` = 172.21.21.21 dans une étendue, 172.17.97.97 dans une autre) |
| Étendue de récursivité | Un ensemble de paramètres de récursivité (activée ou non, redirecteurs) |

| Type de stratégie | Niveau | Actions |
| --- | --- | --- |
| Résolution de requêtes | Serveur ou zone | Allow (par défaut au niveau de la zone, avec étendues de zone et pondérations), Deny, Ignore. Au niveau serveur, seulement Deny ou Ignore |
| Récursivité | Serveur uniquement | Choisit une étendue de récursivité pour les requêtes correspondantes |
| Transfert de zone | Serveur ou zone | Deny ou Ignore |

Les stratégies d'un même niveau sont évaluées selon l'**ordre de traitement** ; la première qui correspond s'applique.

```powershell
# Split-brain: queries on the internal interface 10.0.0.56 get the internal scope and recursion
Add-DnsServerZoneScope -ZoneName "contoso.com" -Name "internal"
Add-DnsServerResourceRecord -ZoneName "contoso.com" -A -Name "www" -IPv4Address 10.0.0.39 -ZoneScope "internal"
Add-DnsServerResourceRecord -ZoneName "contoso.com" -A -Name "www" -IPv4Address 65.55.39.10
Add-DnsServerQueryResolutionPolicy -Name "InternalPolicy" -Action ALLOW `
  -ServerInterfaceIP "EQ,10.0.0.56" -ZoneScope "internal,1" -ZoneName "contoso.com"
Set-DnsServerRecursionScope -Name . -EnableRecursion $false
Add-DnsServerRecursionScope -Name "InternalClients" -EnableRecursion $true
Add-DnsServerQueryResolutionPolicy -Name "SplitBrainRecursionPolicy" -Action ALLOW -ApplyOnRecursion `
  -RecursionScope "InternalClients" -ServerInterfaceIP "EQ,10.0.0.56"

# Geo-location and blocking
Add-DnsServerClientSubnet -Name "EuropeSubnet" -IPv4Subnet "172.17.44.0/24"
Add-DnsServerQueryResolutionPolicy -Name "BlockMalicious" -Action IGNORE -FQDN "EQ,*.contosomalicious.com"
```

> **Piège d'examen.** Dans une zone intégrée à Active Directory, les étendues de zone et leurs enregistrements sont répliqués par AD DS, mais **pas les stratégies ni les sous-réseaux clients** : ils sont stockés sur chaque serveur DNS. Recréez-les ou exportez-les sur chaque serveur qui doit les appliquer. Avec des serveurs secondaires, créez les sous-réseaux clients, les étendues de zone et les stratégies sur chaque secondaire ; les enregistrements sont ensuite transférés étendue par étendue.

<!-- section: dnssec | objectives: 4.1.6 -->
## Implémenter DNSSEC

DNSSEC signe une zone pour que les résolveurs puissent valider l'origine et l'intégrité des réponses, ainsi que la non-existence authentifiée. La signature ajoute ces enregistrements :

| Enregistrement | Rôle |
| --- | --- |
| RRSIG | Signature d'un jeu d'enregistrements |
| DNSKEY | Clé publique : clé de signature de zone (ZSK) ou clé de signature de clé (KSK) |
| NSEC / NSEC3 (+ NSEC3PARAM) | Preuve qu'un nom n'existe pas ; NSEC3 empêche le parcours de zone. Une zone utilise l'un ou l'autre |
| DS | Placé dans la zone **parente** pour créer une délégation sécurisée vers la zone enfant |

- Signez sur le serveur principal faisant autorité avec l'**Assistant Signature de zone** (Gestionnaire DNS > DNSSEC > Signer la zone : paramètres personnalisés, paramètres d'une autre zone, ou paramètres par défaut) ou `Invoke-DnsServerZoneSign`.
- Le **maître de clés** (Key Master) génère les clés et effectue les substitutions de ZSK et de KSK (KSK : double signature ; ZSK : prépublication). Un seul maître de clés par zone. Dans une zone intégrée à Active Directory, les clés privées sont répliquées vers tous les serveurs principaux, chacun signe sa copie, et le rôle peut être transféré ou pris de force ; une zone sauvegardée dans un fichier n'a qu'un serveur principal et le rôle ne peut pas changer de serveur.
- Les **ancres d'approbation** (DNSKEY ou DS) doivent se trouver sur chaque serveur DNS sans autorité qui effectue la validation. Sur les contrôleurs de domaine, elles sont stockées dans la partition d'annuaire de la forêt et peuvent être répliquées vers tous les contrôleurs de domaine de la forêt ; sur les autres serveurs, dans `TrustAnchors.dns`.
- Les clients exigent la validation par la **table de stratégie de résolution de noms** (NRPT), déployée par stratégie de groupe : le client DNS n'accepte alors que des réponses validées pour cet espace de noms.

```powershell
Invoke-DnsServerZoneSign -ZoneName "secure.contoso.com" -SignWithDefault -PassThru -Force
Get-DnsServerTrustAnchor -Name "secure.contoso.com"
Reset-DnsServerZoneKeyMasterRole -ZoneName "secure.contoso.com" -KeyMasterServer DNS2 -SeizeRole -Force
Add-DnsClientNrptRule -GpoName "DNSSEC Clients" -Namespace ".secure.contoso.com" -DnsSecEnable `
  -DnsSecValidationRequired
Resolve-DnsName finance.secure.contoso.com -Type A -Server dns1.contoso.com -DnssecOk
```

> **Piège d'examen.** Si la NRPT exige la validation et que le serveur DNS du client n'a pas d'ancre d'approbation pour la zone, la résolution échoue (« Unsecured DNS packet »). Distribuez l'ancre d'approbation, pas une nouvelle règle NRPT.

<!-- section: key-points -->
## Points clés

- Zone intégrée à Active Directory = contrôleurs de domaine uniquement, multimaître, mises à jour sécurisées ; étendues Forest, Domain, Legacy, Custom.
- Principale accessible en écriture, secondaire en lecture seule par transfert, de stub = liste NS seulement ; limitez les transferts.
- Le nettoyage exige le nettoyage sur le serveur + le vieillissement sur la zone ; 7 + 7 jours par défaut ; les enregistrements statiques ne sont jamais supprimés.
- Ordre de résolution : redirecteur conditionnel, délégation, redirecteurs, indications de racine (`UseRootHint`).
- Hybride : les contrôleurs de domaine transfèrent vers 168.63.129.16 ; le local transfère vers un point de terminaison entrant de Private Resolver ; d'Azure vers le local, un point de terminaison sortant et un ensemble de règles.
- Stratégies DNS : sous-réseaux clients, étendues de zone, étendues de récursivité ; non répliqués par AD DS.
- DNSSEC : maître de clés, ancres d'approbation sur les serveurs qui valident, NRPT sur les clients, DS dans la zone parente.
