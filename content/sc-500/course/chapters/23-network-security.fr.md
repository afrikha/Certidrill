Les questions de sécurité réseau donnent une topologie et une exigence (bloquer, autoriser, inspecter, garder privé) et demandent quel contrôle utiliser et où. Les contrôles s'empilent : les règles d'administration de la sécurité de Virtual Network Manager avant les NSG, les NSG sur les sous-réseaux et les cartes réseau, le Pare-feu Azure pour l'inspection centralisée, les points de terminaison privés et Private Link pour retirer d'Internet les services PaaS et partenaires, Microsoft Entra Private Access pour remplacer le VPN des utilisateurs, et Network Watcher pour prouver quelle règle décide.

<!-- section: nsg-asg | objectives: 2.3.1 -->
## Groupes de sécurité réseau et groupes de sécurité d'application

Une règle de NSG comporte une priorité (**100 à 4096**, la plus basse l'emporte, le traitement s'arrête à la première correspondance), une source et une destination (plages IP, étiquettes de service ou ASG), un protocole, des ports, une direction et une action. Les NSG sont **avec état** : le trafic de retour d'un flux autorisé est autorisé. Les changements de règles n'affectent que les nouvelles connexions.

| Règle par défaut | Priorité | Effet |
| --- | --- | --- |
| AllowVNetInBound / AllowVnetOutBound | 65000 | Trafic au sein de `VirtualNetwork` (inclut les réseaux appairés et connectés) |
| AllowAzureLoadBalancerInBound | 65001 | Sondes d'intégrité depuis `AzureLoadBalancer` |
| AllowInternetOutBound | 65001 | Sortant vers `Internet` |
| DenyAllInbound / DenyAllOutBound | 65500 | Tout le reste |

Les règles par défaut ne peuvent pas être supprimées, seulement remplacées par des numéros plus bas. Ordre d'évaluation : en **entrée**, NSG du sous-réseau puis NSG de la carte réseau ; en **sortie**, NSG de la carte réseau puis NSG du sous-réseau ; quand les deux existent, le trafic doit être autorisé par les deux. Le même ordre s'applique au sein d'un sous-réseau.

Un **groupe de sécurité d'application** (ASG) regroupe des cartes réseau par rôle (`asg-web`, `asg-db`) pour que les règles ne listent pas d'adresses IP. Toutes les cartes réseau d'un ASG doivent être dans le même réseau virtuel que sa première carte réseau, et une règle qui utilise des ASG comme source et destination exige que les deux groupes soient dans le même réseau virtuel. Une règle qui nomme un ASG ne s'applique pas à une carte réseau qui n'en est pas membre, même si le NSG est sur son sous-réseau.

```bash
az network asg create --resource-group RG-App --name asg-db
az network nsg rule create --resource-group RG-App --nsg-name nsg-data \
  --name Allow-Web-To-Sql --priority 200 --direction Inbound --access Allow \
  --protocol Tcp --source-asgs asg-web --destination-asgs asg-db \
  --destination-port-ranges 1433
```

> **Piège d'examen.** Une règle augmentée peut contenir plusieurs plages IP, mais **une seule** étiquette de service ou un seul ASG par source ou destination. Deux étiquettes de service exigent deux règles.

<!-- section: avnm-security-admin | objectives: 2.3.2 -->
## Stratégies d'accès réseau avec Azure Virtual Network Manager

Azure Virtual Network Manager est créé avec une **étendue** (groupes d'administration ou abonnements). Les **groupes réseau** rassemblent des réseaux virtuels, de façon statique (choisis à la main) ou **dynamique** via une condition Azure Policy (par exemple une étiquette). Une **configuration d'administration de la sécurité** contient des collections de règles qui ciblent des groupes réseau, et ne prend effet qu'après son **déploiement** dans des régions ; une seule configuration d'administration de la sécurité peut être déployée par région.

| Action | Comportement |
| --- | --- |
| Allow (Autoriser) | Autorise le trafic, puis les règles des NSG sont encore évaluées |
| Deny (Refuser) | Bloque le trafic ; les NSG ne sont pas évalués |
| Always Allow (Toujours autoriser) | Autorise le trafic quoi que disent les NSG ; l'évaluation s'arrête |

Les règles d'administration de la sécurité (priorité **1 à 4096**) s'appliquent au niveau du réseau virtuel et sont évaluées **avant** les NSG : les équipes applicatives ne peuvent donc pas les contourner. Par défaut, elles ne s'appliquent pas aux réseaux virtuels qui contiennent Azure SQL Managed Instance ou Azure Databricks (l'option `AllowRulesOnly` n'y applique que les règles Allow), ni aux sous-réseaux des passerelles, d'Azure Bastion, du Pare-feu Azure ou d'Azure Route Server.

> **Piège d'examen.** « Bloquer le RDP depuis Internet sur tous les réseaux virtuels actuels et futurs, sans que les administrateurs locaux puissent le rouvrir » correspond à une règle d'administration de la sécurité **Deny** sur un groupe réseau dynamique, pas à un NSG ni à Azure Policy sur les NSG.

<!-- section: virtual-wan-security | objectives: 2.3.3 -->
## Sécuriser Azure Virtual WAN

Un **hub virtuel sécurisé** est un hub Virtual WAN dont les stratégies de sécurité et de routage sont gérées par Azure Firewall Manager. Créez-en un ou convertissez un hub existant ; le fournisseur de sécurité est le Pare-feu Azure, une appliance virtuelle réseau (NVA) NGFW tierce prise en charge, un pare-feu SaaS (Palo Alto Networks Cloud NGFW) ou un fournisseur partenaire de sécurité. Il exige un Virtual WAN **Standard** (Basic ne prend en charge que le VPN site à site).

L'**intention de routage** (routing intent) envoie le trafic vers la solution de sécurité du hub sans tables de routage personnalisées :

| Stratégie de routage | Trafic envoyé au tronçon suivant |
| --- | --- |
| Trafic Internet | Trafic à destination d'Internet des branches et des connexions de réseau virtuel ; le hub annonce `0.0.0.0/0` aux connexions dont **Propager l'itinéraire par défaut** / **Activer la sécurité Internet** est activé |
| Trafic privé | Trafic des branches, des réseaux virtuels et **entre hubs** (préfixes RFC 1918 par défaut, ajoutez-en d'autres au besoin) |

Chaque hub a au plus une stratégie de chaque type, chacune avec un seul tronçon suivant. Prérequis : aucune table de routage personnalisée, aucun itinéraire statique vers une connexion de réseau virtuel. Activez-la sur **tous** les hubs pour inspecter le trafic entre hubs de façon symétrique ; `0.0.0.0/0` ne se propage pas d'un hub à l'autre, donc le trafic Internet sort par le pare-feu du hub local.

> **Piège d'examen.** Les tables de routage personnalisées ne peuvent pas faire passer le trafic entre deux hubs par un pare-feu. Seule une stratégie de routage de **trafic privé** inspecte le trafic entre hubs et de branche à branche.

<!-- section: vpn-security | objectives: 2.3.4 -->
## Sécuriser les connexions VPN

Les nouvelles passerelles VPN utilisent les SKU **AZ** (VpnGw1AZ à VpnGw5AZ) et une adresse IP publique Standard. Le SKU **Basic** (développement et test uniquement) ne prend en charge ni les stratégies IPsec/IKE personnalisées, ni BGP, ni RADIUS, ni OpenVPN.

**Site à site** : les propositions par défaut utilisent le groupe DH 2 ; pour imposer une cryptographie plus forte, définissez une **stratégie IPsec/IKE personnalisée** sur la connexion. Il faut renseigner chaque champ (chiffrement et intégrité IKE, groupe DH, chiffrement et intégrité IPsec, groupe PFS, durées de vie de SA facultatives), une stratégie par connexion, en accord avec l'équipement local. Avec GCMAES, le chiffrement et l'intégrité IPsec doivent utiliser le même algorithme et la même longueur de clé. Les connexions de réseau virtuel à réseau virtuel exigent la même stratégie sur les deux ressources de connexion.

```powershell
$policy = New-AzIpsecPolicy -IkeEncryption AES256 -IkeIntegrity SHA384 `
  -DhGroup DHGroup24 -IpsecEncryption GCMAES256 -IpsecIntegrity GCMAES256 `
  -PfsGroup PFS24 -SALifeTimeSeconds 27000 -SADataSizeKilobytes 102400000
Set-AzVirtualNetworkGatewayConnection -VirtualNetworkGatewayConnection $conn `
  -IpsecPolicies $policy
```

Authentification **point à site** :

| Authentification | Types de tunnel | À utiliser quand |
| --- | --- | --- |
| Certificat Azure | OpenVPN, SSTP, IKEv2 | Pas d'infrastructure d'identité ; pour révoquer un client, ajoutez son empreinte à la liste des certificats révoqués |
| Microsoft Entra ID | **OpenVPN uniquement**, Azure VPN Client | Informations d'identification Entra avec **accès conditionnel et MFA** |
| RADIUS | OpenVPN, SSTP, IKEv2 | Serveur NPS ou RADIUS existant, informations d'identification Active Directory |

> **Piège d'examen.** Exiger la MFA via l'accès conditionnel pour les utilisateurs VPN impose l'authentification Microsoft Entra ID, donc OpenVPN et Azure VPN Client ; une passerelle uniquement IKEv2 ou SSTP ne le permet pas.

<!-- section: entra-private-access | objectives: 2.3.5 -->
## Microsoft Entra Private Access

Microsoft Entra Private Access, qui fait partie de Global Secure Access, donne aux utilisateurs l'accès à des applications privées (FQDN, adresses IP, plages et ports) **sans VPN**. Le trafic part du **client Global Secure Access** de l'appareil vers la périphérie de Microsoft, puis vers un **connecteur de réseau privé** installé près des applications (connexions sortantes uniquement, version 1.5.3417.0 ou ultérieure).

| Objet | Rôle |
| --- | --- |
| Groupe de connecteurs | Au moins un connecteur actif ; dessert les applications d'un site |
| Quick Access (Accès rapide) | Une application qui contient l'ensemble principal des ressources privées (remplacement du VPN), jusqu'à 500 segments d'application |
| Application Global Secure Access (accès par application) | Une application d'entreprise pour un sous-ensemble de ressources qui a besoin de ses propres attributions ou stratégies d'accès conditionnel |
| DNS privé | Suffixes DNS résolus par les serveurs DNS internes via le connecteur |
| Profil de transfert du trafic Private Access | Doit être activé pour que le client fasse passer le trafic privé dans le tunnel |

Ordre de configuration : créer le groupe de connecteurs avec un connecteur actif, configurer Quick Access ou une application Global Secure Access (segments), **attribuer des utilisateurs ou des groupes** (attribution directe ; les groupes imbriqués ne sont pas pris en charge), créer des stratégies d'accès conditionnel qui ciblent l'application, puis activer le profil de transfert du trafic Private Access. Rôles nécessaires : **Global Secure Access Administrator** et **Application Administrator** ; les groupes de connecteurs exigent Application Administrator et Microsoft Entra ID P1 ou P2. Les changements mettent jusqu'à 15 minutes à atteindre les clients.

> **Piège d'examen.** Un segment défini dans une application Global Secure Access par application est prioritaire sur un segment Quick Access qui le chevauche, et les attributions de Quick Access n'y sont pas copiées. Les utilisateurs attribués uniquement à Quick Access perdent l'accès à ce segment.

<!-- section: private-endpoints | objectives: 2.3.6 -->
## Points de terminaison privés pour les ressources PaaS

Un point de terminaison privé est une carte réseau en lecture seule avec une adresse IP privée de votre sous-réseau, associée à une **sous-ressource** d'une ressource PaaS. Il doit être dans la même région et le même abonnement que son réseau virtuel ; la ressource cible peut être dans une autre région. Les connexions sont **approuvées** automatiquement quand vous avez des autorisations sur la ressource, sinon elles restent **En attente** (Pending) jusqu'à l'approbation du propriétaire ; seules les connexions approuvées transportent du trafic.

| Sous-ressource | Zone DNS privée |
| --- | --- |
| Stockage `blob` / `file` / `dfs` | `privatelink.blob.core.windows.net` / `privatelink.file.core.windows.net` / `privatelink.dfs.core.windows.net` |
| Azure SQL `sqlServer` | `privatelink.database.windows.net` |
| Key Vault `vault` | `privatelink.vaultcore.azure.net` |
| App Service et Functions `sites` | `privatelink.azurewebsites.net` |

Le DNS public renvoie un CNAME vers le nom `privatelink`, si bien que les clients continuent d'utiliser le FQDN habituel ; liez la zone DNS privée à chaque réseau virtuel qui doit la résoudre. Un point de terminaison privé **ne bloque pas l'accès public** à lui seul : réglez aussi l'accès au réseau public du service sur Désactivé. Les NSG, UDR et ASG s'appliquent aux points de terminaison privés uniquement quand les **stratégies réseau** sont activées sur le sous-réseau.

> **Piège d'examen.** Point de terminaison de service contre point de terminaison privé : un point de terminaison de service garde l'adresse IP publique du service et ne fait qu'identifier votre sous-réseau auprès de son pare-feu ; un point de terminaison privé donne une adresse IP privée joignable depuis les réseaux appairés et depuis le site local via VPN ou ExpressRoute.

<!-- section: private-link-service | objectives: 2.3.7 -->
## Service Azure Private Link

Un **service Private Link** expose **votre propre** service, exécuté derrière un **Standard Load Balancer** (pool principal basé sur les cartes réseau), à des consommateurs qui s'y connectent avec des points de terminaison privés depuis leurs propres réseaux virtuels, abonnements ou locataires.

| Paramètre | Rôle |
| --- | --- |
| Configuration IP NAT | Adresses sources de votre sous-réseau ; jusqu'à 8 adresses IP NAT ; le service voit l'adresse IP NAT, pas celle du consommateur |
| TCP Proxy v2 | Transmet l'adresse IP source et l'ID de liaison du consommateur à l'application, qui doit analyser l'en-tête |
| Visibilité | Contrôle d'accès en fonction du rôle uniquement, restreinte par abonnement, ou toute personne disposant de l'alias |
| Approbation automatique | Abonnements dont les demandes sont approuvées automatiquement (sous-ensemble de la visibilité) |
| Alias | Nom unique au niveau mondial, en lecture seule, à communiquer aux consommateurs |

Le service Private Link doit être dans la même région que son réseau virtuel et son équilibreur de charge ; les consommateurs peuvent être dans n'importe quelle région publique. Il ne prend en charge que l'IPv4, le TCP et l'UDP.

<!-- section: azure-firewall | objectives: 2.3.8 -->
## Implémenter le Pare-feu Azure

| Fonctionnalité | Basic | Standard | Premium |
| --- | --- | --- | --- |
| Débit | 250 Mbit/s | 30 Gbit/s | 100 Gbit/s |
| Renseignement sur les menaces | Alerte uniquement | Alerte, ou alerte et refus | Alerte, ou alerte et refus |
| Catégories web, proxy DNS, FQDN dans les règles de réseau | Non | Oui | Oui |
| Inspection TLS (sortante et est-ouest), IDPS, filtrage d'URL (chemin complet) | Non | Non | Oui |

Le pare-feu se place dans **AzureFirewallSubnet** (/26) ; **AzureFirewallManagementSubnet** (/26) est nécessaire pour Basic et pour le tunneling forcé. Les spokes lui envoient le trafic avec un UDR `0.0.0.0/0` de tronçon suivant **Appliance virtuelle** = l'adresse IP privée du pare-feu. Les règles se trouvent dans une **stratégie de pare-feu** (Firewall Policy) : groupes de collections de règles, puis collections de règles d'un seul type, priorité de 100 à 65 000 :

1. Le renseignement sur les menaces est vérifié en premier.
2. Règles **DNAT**, puis règles de **réseau**, puis règles d'**application** (HTTP, HTTPS, MSSQL), quelles que soient les priorités.
3. La première correspondance arrête le traitement ; sans correspondance, le trafic est refusé.

Les groupes de collections de règles d'une **stratégie parente** sont toujours prioritaires sur ceux de la stratégie enfant. L'**inspection TLS** de Premium exige un certificat d'autorité de certification intermédiaire (PFX sans mot de passe, RSA 4096) stocké comme secret Key Vault et une **identité managée affectée par l'utilisateur** avec Get et List sur les secrets ; l'inspection TLS entrante est assurée par le WAF d'Application Gateway, pas par le pare-feu. Modes **IDPS** : Disabled, Alert, Alert and Deny.

> **Piège d'examen.** Une règle de réseau qui autorise le TCP 443 vers `Any` est évaluée avant vos règles d'application : le filtrage par FQDN ne s'applique donc jamais. Restreignez les règles de réseau et utilisez des règles d'application pour les destinations web.

<!-- section: network-watcher | objectives: 2.3.9 -->
## Évaluer les règles effectives avec Network Watcher

| Question | Outil |
| --- | --- |
| Ce flux TCP ou UDP vers ou depuis une machine virtuelle est-il autorisé, et quelle règle décide ? | **Vérification du flux IP** (IP flow verify ; NSG et règles d'administration de la sécurité ; machine virtuelle démarrée) |
| Même question pour l'ICMP, un groupe de machines virtuelles identiques, Application Gateway v2 ou une étiquette de service | **Diagnostics NSG** |
| Quelles règles s'appliquent à une carte réseau après fusion des NSG du sous-réseau et de la carte ? | **Règles de sécurité effectives** |
| Où va un paquet ? | **Tronçon suivant** |
| VM1 peut-elle joindre ce FQDN et ce port maintenant, de bout en bout ? | **Résolution des problèmes de connexion** (Connection troubleshoot) |
| Quels flux ont eu lieu dans le temps ? | **Journaux de flux de réseau virtuel** (les journaux de flux NSG ne peuvent plus être créés et sont mis hors service le 30 septembre 2027) |

```bash
az network watcher test-ip-flow --resource-group RG-App --vm VM1 \
  --direction Inbound --protocol TCP \
  --local 10.1.2.4:3389 --remote 203.0.113.50:60000
az network nic list-effective-nsg --resource-group RG-App --name vm1-nic
```

Network Watcher doit exister dans la région de la ressource. Les règles de sécurité effectives ne sont pas affichées pour la carte réseau d'un point de terminaison privé.

> **Piège d'examen.** La vérification du flux IP répond « Accès autorisé » mais la connexion échoue : un NSG n'est pas en cause. Vérifiez le routage avec le tronçon suivant (un UDR vers un pare-feu), puis les règles du pare-feu et le système d'exploitation invité avec la résolution des problèmes de connexion.

<!-- section: key-points -->
## Points clés

- NSG : priorité de 100 à 4096, en entrée sous-réseau puis carte réseau, en sortie carte réseau puis sous-réseau ; membres d'un ASG dans un seul réseau virtuel.
- Les règles d'administration de la sécurité (Virtual Network Manager) sont évaluées avant les NSG : Deny et Always Allow terminent l'évaluation, Allow passe aux NSG.
- Hub virtuel sécurisé plus intention de routage (une stratégie Internet et une stratégie privée) est le seul moyen d'inspecter le trafic entre hubs.
- Une stratégie IPsec/IKE personnalisée exige tous les champs et un SKU autre que Basic ; le point à site Entra ID exige OpenVPN et Azure VPN Client.
- Entra Private Access : client, connecteur, Quick Access ou applications par application, attributions directes, accès conditionnel, profil de transfert.
- Point de terminaison privé = adresse IP privée pour une sous-ressource PaaS plus une zone DNS `privatelink` ; service Private Link = votre service derrière un Standard Load Balancer.
- Pare-feu Azure : règles DNAT, puis de réseau, puis d'application ; Premium pour l'inspection TLS, l'IDPS et le filtrage d'URL.
