Une forêt peut contenir plusieurs domaines, être reliée à d'autres forêts par des approbations et couvrir plusieurs emplacements physiques décrits sous forme de sites. Les questions d'examen donnent une topologie (forêts, approbations, sites, sous-réseaux, liens de sites) et demandent qui peut accéder à quoi, quelle approbation ou quel lien de sites créer, ou pourquoi une modification n'a pas encore atteint un contrôleur de domaine.

<!-- section: trusts | objectives: 1.2.1 -->
## Configurer les approbations de domaines et de forêts

Une approbation a deux côtés. Le domaine ou la forêt **qui approuve** détient les ressources ; celui ou celle qui est **approuvé** détient les comptes. Si A approuve B, les utilisateurs de B peuvent accéder aux ressources de A : l'accès va dans le sens inverse de l'approbation. Une approbation bidirectionnelle correspond à deux approbations unidirectionnelles.

| Approbation | Création | Entre | Transitive | Sens |
| --- | --- | --- | --- | --- |
| Parent-enfant | Automatique | Un domaine enfant et son parent | Oui | Bidirectionnelle |
| Racine d'arborescence | Automatique | Le domaine racine d'une nouvelle arborescence et le domaine racine de la forêt | Oui | Bidirectionnelle |
| Raccourcie | Manuelle | Deux domaines de la même forêt | Oui | Unidirectionnelle ou bidirectionnelle |
| Forêt | Manuelle | Les domaines racines de deux forêts | Oui, entre les domaines des deux forêts seulement | Unidirectionnelle ou bidirectionnelle |
| Externe | Manuelle | Un domaine et un domaine d'une autre forêt | Non | Unidirectionnelle ou bidirectionnelle |
| Domaine Kerberos (realm) | Manuelle | Un domaine et un domaine Kerberos non Windows | Non par défaut, peut être rendue transitive | Unidirectionnelle ou bidirectionnelle |

Dans une forêt, chaque domaine approuve tous les autres grâce aux approbations transitives parent-enfant et racine d'arborescence. L'authentification suit le chemin des approbations, jusqu'au parent commun puis vers le bas ; une **approbation raccourcie** raccourcit ce chemin entre deux domaines profonds dont les utilisateurs accèdent souvent aux ressources l'un de l'autre.

Une approbation de forêt ne s'étend pas à une troisième forêt : si Forest1 approuve Forest2 et Forest2 approuve Forest3, Forest1 et Forest3 n'ont aucune approbation. Utilisez une **approbation externe** quand un seul domaine de l'autre forêt a besoin d'accès, ou quand l'autre côté ne peut pas participer à une approbation de forêt.

**Créer une approbation de forêt :**

1. Configurez la résolution de noms dans les deux sens : redirecteurs conditionnels DNS (ou zones secondaires, ou un serveur DNS racine commun) pour l'espace de noms de chaque forêt.
2. Ouvrez **Domaines et approbations Active Directory** sur le domaine racine de la forêt, propriétés du domaine > **Approbations** > **Nouvelle approbation**, choisissez **Approbation de forêt**, le sens et l'étendue de l'authentification.
3. Créez les deux côtés en une fois si vous avez des informations d'identification Enterprise Admins dans l'autre forêt ; sinon, chaque côté crée sa moitié avec le même mot de passe d'approbation.
4. Validez l'approbation.

Pour créer une approbation de forêt, il faut être membre de Domain Admins du domaine racine de la forêt ou d'Enterprise Admins. Les membres d'**Incoming Forest Trust Builders** peuvent créer des approbations de forêt unidirectionnelles entrantes. `netdom trust` ne peut pas créer d'approbation de forêt ; utilisez Domaines et approbations Active Directory.

```powershell
# List trusts and check a trust
Get-ADTrust -Filter *
netdom trust contoso.com /domain:fabrikam.com /verify

# Create a two-way trust between two domains (not available for forest trusts)
netdom trust engineering.contoso.com /domain:marketing.contoso.com /add /twoway /usero:admin@engineering.contoso.com /passwordo:* /userd:admin@marketing.contoso.com /passwordd:*
```

**Étendue de l'authentification.** Sur une approbation de forêt ou externe sortante, vous choisissez entre :

| Étendue | Effet |
| --- | --- |
| À l'échelle du domaine (de la forêt pour une approbation de forêt) | Les utilisateurs du côté approuvé sont authentifiés pour toutes les ressources du côté qui approuve ; les autorisations décident toujours de l'accès |
| Authentification sélective | Les utilisateurs du côté approuvé ne peuvent s'authentifier sur un ordinateur que s'ils ont l'autorisation **Allowed to authenticate** (Autorisé à s'authentifier) sur l'objet de cet ordinateur |

`netdom trust ... /selectiveauth:yes` active l'authentification sélective sur une approbation existante.

Le **filtrage SID** (quarantaine) fait accepter au côté qui approuve uniquement les SID du domaine approuvé : un SID placé dans `sIDHistory` par l'autre côté est ignoré. Il est appliqué sur les approbations externes et de forêt. Des utilisateurs migrés qui ont besoin de leurs anciens SID demandent `netdom trust ... /enablesidhistory:yes` sur une approbation de forêt, seulement si vous faites confiance aux administrateurs de l'autre forêt.

**Routage des suffixes de noms.** Une approbation de forêt enregistre les suffixes de noms de l'autre forêt (noms d'arborescence, suffixes UPN et SPN). Un suffixe présent dans les deux forêts est en conflit ; `netdom trust ... /namesuffixes` liste les suffixes et `/togglesuffix` en active ou en désactive un.

> **Piège d'examen.** Les utilisateurs doivent se trouver dans la forêt approuvée et les ressources dans la forêt qui approuve. « Les utilisateurs de Fabrikam doivent accéder à un partage de Contoso » exige que Contoso approuve Fabrikam : une approbation sortante côté Contoso, entrante côté Fabrikam.

<!-- section: sites | objectives: 1.2.2 -->
## Configurer et gérer les sites AD DS

Un **site** est un ensemble de sous-réseaux IP reliés par une connectivité rapide et fiable (recommandation de Microsoft : une latence aller-retour d'environ 10 ms au plus). Les sites pilotent trois choses : le contrôleur de domaine qu'utilise un client, le chemin de la réplication entre emplacements, et les services qui tiennent compte des sites comme les espaces de noms DFS.

| Objet | Rôle |
| --- | --- |
| Site | Un emplacement ; le premier est `Default-First-Site-Name` |
| Sous-réseau | Une plage IP associée à un site. Un ordinateur appartient au site du sous-réseau qui contient son adresse IP |
| Lien de sites | Relie deux sites ou plus qui se répliquent entre eux, avec un coût, une planification et un intervalle |
| Pont de liens de sites | Regroupe des liens de sites pour définir explicitement un chemin transitif |
| Objet serveur | Un DC dans un site ; déplacez-le quand le DC change d'emplacement |

```powershell
New-ADReplicationSite -Name "Lyon"
New-ADReplicationSubnet -Name "10.20.0.0/16" -Site "Lyon"
New-ADReplicationSiteLink -Name "Paris-Lyon" -SitesIncluded Paris, Lyon `
  -Cost 100 -ReplicationFrequencyInMinutes 60 -InterSiteTransportProtocol IP
Get-ADDomainController -Identity "DC5" | Move-ADDirectoryServer -Site "Lyon"
```

| Propriété du lien de sites | Valeur par défaut | Règle |
| --- | --- | --- |
| Coût | 100 (`DEFAULTIPSITELINK`) | Le coût total le plus bas entre deux sites l'emporte, pour la réplication comme pour trouver le DC le plus proche dans un autre site |
| Intervalle de réplication | 180 minutes | Minimum 15 minutes ; un intervalle plus court réduit la latence mais augmente le trafic WAN |
| Planification | Toujours disponible | La réplication à travers plusieurs liens n'a lieu que lorsque leurs planifications se chevauchent |
| Transport | IP (RPC sur IP) | SMTP n'est pas recommandé : la réplication SMTP ne sera plus prise en charge dans les versions futures d'AD DS |

Tous les liens de sites sont transitifs par défaut (**Établir un pont entre tous les liens de sites** (Bridge all site links) est activé sur le transport IP). Ne créez des ponts de liens de sites que si le réseau n'est pas entièrement routé : désactivez **Établir un pont entre tous les liens de sites**, puis reliez par un pont les liens qui peuvent réellement acheminer le trafic.

Bonnes pratiques :

- Créez un site pour chaque emplacement qui a un DC, et un objet sous-réseau pour chaque plage IP, y compris les plages VPN, Wi-Fi et Azure. Un emplacement sans DC peut être rattaché au site qui lui offre la meilleure connexion.
- Quand vous ajoutez un site à un nouveau lien de sites, retirez-le de `DEFAULTIPSITELINK` s'il y figurait, sinon le KCC route selon les deux liens.
- Chaque site doit être relié aux autres par des liens de sites, sinon le journal Directory Service signale que la topologie des sites n'est pas connectée.

Un serveur de **catalogue global** détient un réplica partiel en lecture seule de chaque domaine de la forêt ; l'ouverture de session en a besoin pour résoudre l'appartenance aux groupes universels. Dans un site sans catalogue global, activez la **mise en cache de l'appartenance aux groupes universels** sur le site (Sites et services Active Directory > site > **NTDS Site Settings**) : le DC met en cache l'appartenance des utilisateurs qui ouvrent une session dans ce site.

> **Piège d'examen.** Une nouvelle plage de sous-réseau associée à aucun site laisse ses clients sans site : ils peuvent s'authentifier auprès d'un DC distant. Quand un énoncé dit « les utilisateurs du nouveau bâtiment s'authentifient auprès d'un DC d'une autre ville », la correction est un objet sous-réseau, pas un lien de sites.

<!-- section: replication | objectives: 1.2.3 -->
## Configurer et gérer la réplication AD DS

AD DS utilise une réplication multimaître : chaque DC accessible en écriture accepte des modifications et les réplique vers ses partenaires par des **objets de connexion**, que le **vérificateur de cohérence des connaissances (KCC)** crée sur chaque DC.

| | Intrasite | Intersite |
| --- | --- | --- |
| Topologie | Anneau bidirectionnel entre DC, avec des raccourcis dans les grands sites | Arbre couvrant entre sites, construit par un DC par site, le **générateur de topologie intersite (ISTG)** |
| Déclenchement | Notification de modification : le DC prévient son premier partenaire 15 secondes après une modification, puis chaque partenaire suivant à 3 secondes d'intervalle | Planification et intervalle du lien de sites (180 minutes par défaut) |
| Qui réplique | Chaque DC avec ses partenaires | Les **serveurs tête de pont** : le KCC les choisit parmi les DC de chaque site qui hébergent la partition |
| Trafic | Non compressé | Compressé |

Les objets de connexion créés par le KCC apparaissent comme `automatically generated`. Un objet de connexion manuel ou modifié n'est plus géré par le KCC. Le KCC contourne aussi un DC en panne en créant des connexions temporaires.

Pour que la réplication intersite se comporte comme la réplication intrasite sur une liaison WAN rapide, activez la **notification de modification** sur le lien de sites (son attribut `options` à 1) :

```powershell
Set-ADReplicationSiteLink -Identity "Paris-Lyon" -Replace @{'options'=1}
```

Ce qui est répliqué, et où :

| Partition | Répliquée vers |
| --- | --- |
| Schéma, configuration | Tous les DC de la forêt |
| Domaine | Tous les DC du domaine (en entier), tous les catalogues globaux de la forêt (ensemble partiel d'attributs) |
| Application (par exemple `DomainDnsZones`, `ForestDnsZones`) | Les DC qui l'hébergent |
| SYSVOL | Tous les DC du domaine, par la réplication DFS (FRS n'est plus pris en charge) |

Surveiller et forcer la réplication :

| Besoin | Commande |
| --- | --- |
| Synthèse de tous les DC, plus grand écart et échecs | `repadmin /replsummary` |
| Partenaires entrants et dernier résultat d'un DC | `repadmin /showrepl DC1` |
| Répliquer maintenant une partition depuis un partenaire | `repadmin /replicate DC2 DC1 "DC=corp,DC=contoso,DC=com"` |
| Pousser toutes les partitions d'un DC vers tous ses partenaires, entre sites | `repadmin /syncall DC1 /AdeP` |
| Recalculer la topologie maintenant | `repadmin /kcc` |
| Demandes de réplication en attente | `repadmin /queue` |
| Tester l'état de la réplication | `dcdiag /test:replications` |
| Équivalents PowerShell | `Get-ADReplicationFailure`, `Get-ADReplicationPartnerMetadata`, `Get-ADReplicationUpToDatenessVectorTable`, `Sync-ADObject` |

Dans Sites et services Active Directory, clic droit sur un objet de connexion > **Répliquer maintenant** tire les modifications depuis ce partenaire.

> **Piège d'examen.** Une modification faite à Paris n'atteint Lyon qu'au prochain intervalle du lien de sites (180 minutes par défaut), et seulement pendant sa planification. « Répliquer dès que possible à travers le WAN » demande un intervalle plus court ou la notification de modification sur le lien de sites, pas un nouvel objet de connexion.

<!-- section: key-points -->
## Points clés

- L'accès va à l'inverse de l'approbation : le côté qui approuve détient les ressources, le côté approuvé détient les comptes.
- Approbations de forêt : entre domaines racines de forêt, transitives à l'intérieur des deux forêts seulement ; approbations externes : d'un domaine à un domaine, non transitives ; approbations raccourcies : raccourcissent un chemin dans une forêt.
- Prérequis d'une approbation de forêt : résolution DNS dans les deux sens, Enterprise Admins (ou Domain Admins de la racine), Domaines et approbations Active Directory.
- L'authentification sélective exige **Allowed to authenticate** sur chaque ordinateur cible ; le filtrage SID est actif sur les approbations externes et de forêt.
- Un site est un ensemble de sous-réseaux ; les clients trouvent leur site par les objets sous-réseau.
- Valeurs par défaut d'un lien de sites : coût 100, intervalle 180 minutes (minimum 15), toujours disponible, ponté.
- Intrasite : notification de modification après 15 secondes ; intersite : serveurs tête de pont selon la planification du lien, ou notification de modification si elle est activée.
- `repadmin /replsummary`, `/showrepl`, `/syncall /AdeP`, `/kcc`, et `dcdiag /test:replications`.
