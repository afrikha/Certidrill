Les connexions Azure Virtual Desktop n'atteignent jamais les hôtes de session par un port entrant : le client comme l'hôte de session se connectent en sortie vers le service, puis RDP tente de passer sur un chemin UDP plus rapide. Les questions d'examen décrivent un réseau et demandent quel transport obtiennent les utilisateurs, quoi ouvrir ou configurer, ou pourquoi une connexion est lente.

<!-- section: connectivity-model | objectives: 1.1.1, 1.1.2 -->
## Comment une connexion s'établit

1. Le client s'abonne à un espace de travail ; Microsoft Entra ID authentifie l'utilisateur et renvoie un jeton.
2. Le service de flux valide le jeton et renvoie les bureaux et les applications sous forme de configuration `.rdp` signée numériquement.
3. Quand l'utilisateur se connecte, le client ouvre une connexion TLS vers une **passerelle** via Azure Front Door. Les passerelles sont regroupées par latence par tranches de 10 ms ; celle qui a la latence la plus faible, puis le moins de connexions, l'emporte.
4. La passerelle demande au **broker** d'orchestrer la connexion. Le broker utilise le canal persistant que le Remote Desktop Agent Loader de l'hôte de session a ouvert au démarrage.
5. L'hôte de session ouvre sa propre connexion TLS vers **la même instance de passerelle**, qui relaie le trafic : c'est le transport **reverse connect** (connexion inverse), sur TCP 443.
6. RDP établit une connexion TLS imbriquée entre le client et l'hôte de session, puis tente RDP Shortpath (UDP). Si UDP fonctionne, le transport TCP est abandonné ; sinon TCP reste en place.

| Fait | Valeur |
| --- | --- |
| Ports entrants nécessaires sur les hôtes de session pour reverse connect | Aucun |
| Version TLS minimale vers le service | TLS 1.2 (TLS 1.3 quand le système d'exploitation le prend en charge) |
| Certificat RDP | Autogénéré par le système d'exploitation ; les certificats émis par une autorité de certification ne sont pas pris en charge |
| Objectif de latence du réseau client vers la région du pool d'hôtes | Durée aller-retour inférieure à 150 ms |

> **Piège d'examen.** Ouvrir le port TCP 3389 entrant vers les hôtes de session n'est jamais nécessaire pour les utilisateurs. Microsoft recommande de ne pas l'ouvrir et de ne pas attribuer d'adresse IP publique aux hôtes de session ; utilisez l'accès JIT (just-in-time) aux machines virtuelles si vous devez dépanner en RDP.

<!-- section: capacity-speed | objectives: 1.1.1 -->
## Capacité et vitesse du réseau

RDP n'a pas de bande passante fixe : il mesure en continu la bande passante disponible et la durée aller-retour, et adapte l'encodage, la fréquence d'images et la compression. Seules les zones de l'écran qui changent sont envoyées ; une session inactive ou réduite n'envoie presque rien. La bande passante augmente avec la richesse graphique, la fréquence d'images et la résolution.

Valeurs de référence de Microsoft, un écran 1920 × 1080 :

| Activité | Mode par défaut | Mode H.264/AVC 444 |
| --- | --- | --- |
| Inactif | 0,3 Kbit/s | 0,3 Kbit/s |
| Microsoft Word | 100–150 Kbit/s | 200–300 Kbit/s |
| Microsoft Excel | 150–200 Kbit/s | 400–500 Kbit/s |
| Microsoft PowerPoint | 4–4,5 Mbit/s | 1,6–1,8 Mbit/s |
| Navigation web | 6–6,5 Mbit/s | 0,9–1 Mbit/s |
| Lecture vidéo, demi-écran, 30 i/s | 8,5–9,5 Mbit/s | 2,5–2,8 Mbit/s |

Évaluer un site :

| Exigence | Réponse |
| --- | --- |
| Estimer la bande passante d'une agence | Mesurer des sessions réelles avec les compteurs de performances ou l'équipement réseau (la meilleure méthode) ; sinon rapprocher les usages du tableau de référence et multiplier par le nombre d'utilisateurs simultanés |
| Des utilisateurs éloignés de la région se plaignent de lenteurs | Mesurer la durée aller-retour ; placer les hôtes de session dans la région la plus proche des utilisateurs (objectif inférieur à 150 ms) |
| Limiter la bande passante RDP sur une liaison facturée à l'usage ou contrainte | QoS basée sur une stratégie avec un débit sortant limité sur `svchost.exe`, port source UDP 3390. Exige RDP Shortpath pour les réseaux gérés : la limitation n'est pas prise en charge sur reverse connect |

```powershell
New-NetQosPolicy -Name "RDP Shortpath for managed networks" -AppPathNameMatchCondition "svchost.exe" -IPProtocolMatchCondition UDP -IPSrcPortStartMatchCondition 3390 -IPSrcPortEndMatchCondition 3390 -ThrottleRateActionBitsPerSecond 10mb -NetworkProfile All
```

<!-- section: session-host-network | objectives: 1.1.2 -->
## Configuration réseau des hôtes de session

Conditions requises :

- Un réseau virtuel et un sous-réseau **dans la même région que les hôtes de session**, créés avant le pool d'hôtes si vous déployez les hôtes de session dans le même assistant.
- Avec AD DS ou Microsoft Entra Domain Services, une connectivité vers les contrôleurs de domaine et les serveurs DNS pour que les hôtes puissent joindre le domaine : configurez les serveurs DNS du réseau virtuel sur ces serveurs (les serveurs DNS personnalisés transfèrent les autres noms vers le DNS Azure).
- Un accès sortant vers les points de terminaison requis, et vers les points de terminaison Microsoft 365 si les utilisateurs exécutent les Microsoft 365 Apps. Microsoft ne prend pas en charge les déploiements où ils sont bloqués.

Principaux points de terminaison requis des hôtes de session (cloud Azure) :

| Adresse | Port | Rôle | Étiquette de service |
| --- | --- | --- | --- |
| `*.wvd.microsoft.com` | TCP 443 | Trafic du service et RDP sur TCP | `WindowsVirtualDesktop` |
| `login.microsoftonline.com` | TCP 443 | Authentification | `AzureActiveDirectory` |
| `51.5.0.0/16` | UDP 3478 | Connectivité RDP relayée (TURN) | `WindowsVirtualDesktop` |
| `*.prod.warm.ingest.monitor.core.windows.net`, `gcs.prod.monitoring.core.windows.net` | TCP 443 | Trafic de l'agent | `AzureMonitor` |
| `azkms.core.windows.net` | TCP 1688 | Activation de Windows | `Internet` |
| `mrsglobalsteus2prod.blob.core.windows.net` | TCP 443 | Mises à jour de l'agent et de la pile side-by-side | `Storage` |
| `169.254.169.254` et `168.63.129.16` | TCP 80, et d'autres pour 168.63.129.16 | Service de métadonnées d'instance et connectivité de la plateforme : ne jamais intercepter, faire passer par un proxy ni rediriger | Aucune |

Règles de conception :

| Exigence | Réponse |
| --- | --- |
| Filtrer de façon centralisée le trafic sortant des hôtes de session | Hub and spoke : hôtes de session dans un spoke, itinéraire `0.0.0.0/0` vers le Pare-feu Azure du hub, autorisation de l'étiquette de service `WindowsVirtualDesktop` et des FQDN requis |
| Nouveau réseau virtuel, pas d'appliance virtuelle, les hôtes ont besoin d'internet | Méthode sortante explicite : une passerelle NAT sur le sous-réseau. Les nouveaux réseaux virtuels utilisent par défaut des sous-réseaux privés, et l'activation et les mises à jour de Windows exigent une sortie explicite |
| Vérifier qu'un hôte de session joint tous les points de terminaison requis | Azure Virtual Desktop Agent URL Tool, `WVDAgentUrlTool.exe`, dans le dossier RDAgent de l'hôte de session. Il ne teste pas les entrées génériques |
| Un proxy web existant | Le contourner pour le trafic Azure Virtual Desktop (fichier PAC, liste d'exclusion, étiquettes de service dans le Pare-feu Azure) ; pas d'inspection SSL, pas de proxy qui exige une authentification |

> **Piège d'examen.** Un proxy qui est le seul chemin de sortie force RDP sur TCP au lieu d'UDP. L'inspection TLS remplace les certificats du service et peut empêcher l'agent de fonctionner : Microsoft demande de la désactiver avant d'ouvrir une demande de support.

<!-- section: rdp-shortpath | objectives: 1.1.3 -->
## RDP Shortpath

RDP Shortpath ajoute un transport UDP entre le client et l'hôte de session, avec le protocole URCP (Universal Rate Control Protocol) au-dessus d'UDP. Il s'établit après l'authentification par reverse connect et conserve la même sécurité : TLS sur UDP fiable.

| Option | Réseau | Fonctionnement | Ports |
| --- | --- | --- | --- |
| Réseaux gérés | Peering privé ExpressRoute, VPN site à site ou point à site | UDP direct vers un écouteur sur l'hôte de session | UDP 3390 entrant (par défaut, configurable) sur chaque hôte de session |
| Réseaux gérés avec ICE/STUN | Réseau privé | UDP direct après traversée de NAT | Aucun port entrant |
| Réseaux publics avec ICE/STUN | Internet | UDP direct ; l'hôte de session apprend son IP:port public auprès d'un serveur STUN | UDP 3478 vers STUN ; UDP 49152–65535 par défaut pour le flux de données |
| Réseaux publics via TURN | Internet | UDP relayé par un serveur TURN (cloud public Azure) | UDP 3478 vers `51.5.0.0/16` |

Règles à connaître :

- Dans le pool d'hôtes, chaque option se trouve sur la page **Mise en réseau > RDP Shortpath** et vaut **Default**, ce qui équivaut à activé. UDP est activé par défaut dans Windows sur les hôtes et les clients.
- Si le paramètre du pool d'hôtes et celui de l'hôte de session se contredisent, le **plus restrictif** l'emporte.
- L'écouteur des réseaux gérés exige la stratégie **Enable RDP Shortpath for managed networks** (Modèles d'administration > Composants Windows > Services Bureau à distance > Hôte de session Bureau à distance > Azure Virtual Desktop), le port entrant autorisé dans le Pare-feu Windows et les NSG, puis un redémarrage.
- Quand les chemins gérés et publics sont tous deux possibles, la première connexion établie l'emporte ; c'est généralement le chemin géré.
- Un **NAT symétrique** (le Pare-feu Azure et Azure NAT Gateway en sont des exemples) empêche un chemin STUN direct : la connexion utilise TURN. Microsoft recommande fortement de laisser TURN activé.
- Pour réduire la plage de ports UDP du client, activez **Use port range for RDP Shortpath for unmanaged networks** (port de base 38300 par défaut, pool de 1000 ports, dans la plage 1024–49151).
- Si UDP est bloqué sur tous les chemins, la session reste sur le transport reverse connect TCP.

Vérifiez le transport dans **Informations de connexion** de la barre de connexion : **UDP (Private Network)** pour l'écouteur des réseaux gérés, **UDP** pour STUN, **UDP (Relay)** pour TURN. `avdnettest.exe` teste la connectivité STUN et le type de NAT ; un NAT de type cône signifie que Shortpath public a de très bonnes chances de fonctionner.

> **Piège d'examen.** La stratégie qui active l'écouteur 3390 n'est nécessaire que pour l'option écouteur des réseaux gérés. Shortpath public (STUN, TURN) n'exige aucun port entrant, seulement de l'UDP sortant depuis les hôtes de session.

<!-- section: rdp-multipath | objectives: 1.1.3 -->
## RDP Multipath

RDP Multipath surveille plusieurs chemins réseau à la fois et utilise le plus fiable, avec des chemins de secours en attente. ICE découvre plusieurs chemins UDP (STUN et TURN), et Azure Virtual Desktop peut aussi garder des chemins reverse connect TCP en attente. Si le chemin actif se dégrade, la session bascule sur le meilleur suivant ; si tous les chemins sont perdus, elle se reconnecte quand le réseau revient.

| Élément | Valeur |
| --- | --- |
| Disponibilité | Disponibilité générale, cloud public Azure et Azure Government |
| Configuration | Aucune au-delà de RDP Shortpath : il fonctionne automatiquement dès que les prérequis sont remplis |
| Windows App pour Windows | 2.0.559.0 ou ultérieure pour plusieurs chemins UDP ; 2.0.1069.0 ou ultérieure pour les chemins TCP redondants |
| Autres plateformes | Windows App pour macOS en bêta pour plusieurs chemins UDP ; les autres ne sont pas prises en charge |
| Points de terminaison | TCP 443 vers `*.wvd.microsoft.com`, UDP 3478 et UDP 1024–65535 vers `51.5.0.0/16` |

<!-- section: qos | objectives: 1.1.3 -->
## Qualité de service

La QoS donne la priorité au trafic RDP sur les liaisons gérées saturées. Elle ne s'applique qu'à **RDP Shortpath pour les réseaux gérés** : les stratégies QoS ne sont pas prises en charge pour reverse connect. Elle doit être appliquée sur toutes les liaisons entre le client et l'hôte de session ; un utilisateur à domicile n'est donc priorisé qu'à l'intérieur de votre réseau géré.

Marquage recommandé : **DSCP 46, Expedited Forwarding**, sur les hôtes de session. Avec une stratégie de groupe : **Configuration ordinateur > Paramètres Windows > QoS basée sur la stratégie > Créer une nouvelle stratégie**, DSCP 46, exécutable `svchost.exe`, toute adresse IP source et de destination, UDP, port source 3390, puis `gpupdate /force`.

```powershell
New-NetQosPolicy -Name "RDP Shortpath for managed networks" -AppPathNameMatchCondition "svchost.exe" -IPProtocolMatchCondition UDP -IPSrcPortStartMatchCondition 3390 -IPSrcPortEndMatchCondition 3390 -DSCPAction 46 -NetworkProfile All
```

> **Conseil d'examen.** Même stratégie, deux objectifs : `-DSCPAction 46` priorise, `-ThrottleRateActionBitsPerSecond` limite. Les deux ciblent le port source UDP 3390 et exigent donc RDP Shortpath pour les réseaux gérés.

<!-- section: private-link | objectives: 1.1.4 -->
## Azure Private Link

Private Link permet aux clients et aux hôtes de session de joindre Azure Virtual Desktop par des points de terminaison privés, sur le réseau Microsoft ; les utilisateurs rejoignent le réseau virtuel par VPN ou ExpressRoute.

| Rôle | Ressource | Sous-ressource | Combien |
| --- | --- | --- | --- |
| Connexions au pool d'hôtes | Pool d'hôtes | `connection` | Un par pool d'hôtes |
| Téléchargement du flux | Espace de travail | `feed` | Un par espace de travail |
| Découverte initiale du flux | Espace de travail | `global` | Un seul pour tous vos déploiements Azure Virtual Desktop |

| Exigence | Points de terminaison nécessaires |
| --- | --- |
| Tout en privé, découverte comprise | `connection` + `feed` + `global` |
| Flux et sessions privés, découverte publique | `connection` + `feed` |
| Seules les sessions à distance privées | `connection` |

Ordre de mise en œuvre :

1. **Réinscrivez** le fournisseur de ressources `Microsoft.DesktopVirtualization` sur chaque abonnement.
2. Créez les points de terminaison privés (ressource > **Mise en réseau** > **Connexions de point de terminaison privé**), dans un sous-réseau de la même région que le réseau virtuel et les hôtes de session, et intégrez-les à des zones DNS privées : `privatelink.wvd.microsoft.com` pour `connection` et `feed`, `privatelink-global.wvd.microsoft.com` pour `global`.
3. Réglez l'**accès public**. Pool d'hôtes : **Enable public access from all networks**, **Enable public access for end users, use private access for session hosts** ou **Disable public access and use private access**. Espace de travail : activé depuis tous les réseaux, ou désactivé avec accès privé.
4. Bloquez éventuellement les routes publiques avec des NSG ou le Pare-feu Azure grâce à l'étiquette de service `WindowsVirtualDesktop`, sans bloquer les points de terminaison requis.
5. Redémarrez le service **RDAgentBootLoader** sur chaque hôte de session (ou les hôtes), puis vérifiez que les connexions de point de terminaison sont **Approuvées** et les hôtes de session **Disponibles**.

Règles à connaître :

- Placez la sous-ressource `global` sur un **espace de travail réservé**, dédié et sans groupe d'applications. Ses paramètres d'accès sont ignorés, et le supprimer arrête la découverte du flux pour tous les déploiements.
- Ne restreignez pas les ports vers le point de terminaison `connection` : le trafic de session utilise TCP 1–65535 à travers une seule adresse IP privée.
- UDP sur Private Link est bloqué par défaut. Pour RDP Shortpath pour les réseaux gérés sur Private Link, cochez **Allow Direct UDP network path over Private Link** et désactivez les options publiques STUN et TURN ; sinon le portail refuse d'enregistrer.

> **Piège d'examen.** Avec **Disable public access and use private access** sur le pool d'hôtes, une connexion ne fonctionne que si le client **et** l'hôte de session utilisent des routes privées. Avec l'option « utilisateurs en public, hôtes de session en privé », la route du client n'a pas d'importance.

<!-- section: monitor-troubleshoot | objectives: 1.1.5 -->
## Superviser et dépanner la connectivité

| Symptôme ou besoin | Outil |
| --- | --- |
| Quel transport utilise cette session, quelle est sa durée aller-retour ? | **Informations de connexion** dans le client |
| Les hôtes de session apparaissent indisponibles après une modification du pare-feu | `WVDAgentUrlTool.exe` sur l'hôte ; puis les journaux du Pare-feu Azure ou des NSG |
| Shortpath public fonctionnera-t-il depuis ce réseau ? | `avdnettest.exe` (accessibilité STUN et type de NAT) |
| Durée aller-retour par région de passerelle, utilisateurs les plus lents | Azure Virtual Desktop Insights, **Connection Performance** (RTT idéale sous 100 ms, qualité faible au-delà de 200 ms) |
| Déconnexions dans le temps, par transport, client ou région de passerelle | Azure Virtual Desktop Insights, **Connection Reliability** |
| Un itinéraire ou un NSG bloque un flux depuis un hôte de session | Network Watcher : vérification du flux IP, tronçon suivant, résolution des problèmes de connexion |

Les données réseau des connexions sont envoyées à Log Analytics toutes les deux minutes pendant une session active, dans la table `WVDConnectionNetworkData` (`EstRoundTripTimeInMs`, `EstAvailableBandwidthKBps`, `CorrelationId`). `WVDConnections` contient un enregistrement par état de connexion avec `TransportType`, `GatewayRegion`, `IsClientPrivateLink` et `IsSessionHostPrivateLink`.

```kusto
WVDConnectionNetworkData
| where TimeGenerated > ago(24h)
| join kind=inner (WVDConnections | distinct CorrelationId, UserName, TransportType) on CorrelationId
| summarize AvgRttMs = avg(EstRoundTripTimeInMs), AvgBandwidthKBps = avg(EstAvailableBandwidthKBps) by UserName, TransportType
| order by AvgRttMs desc
```

Au-delà de 200 ms de durée aller-retour, les utilisateurs peuvent subir un retard de saisie et des déconnexions. Réduisez-la en rapprochant les hôtes de session des utilisateurs et en limitant les intermédiaires (proxys, inspection), et contrôlez le processeur et la mémoire de l'hôte : un hôte surchargé ralentit aussi les réponses.

<!-- section: key-points -->
## Points clés

- Reverse connect : le client et l'hôte de session se connectent en sortie sur TCP 443 ; aucun port entrant, pas d'IP publique sur les hôtes de session.
- Durée aller-retour cible inférieure à 150 ms vers la région du pool d'hôtes ; mesurez des sessions réelles pour la bande passante.
- Shortpath géré : écouteur sur UDP 3390 (ou STUN) via ExpressRoute ou VPN. Shortpath public : STUN, puis TURN sur UDP 3478 vers `51.5.0.0/16`. NAT symétrique signifie TURN.
- RDP Multipath n'a pas de paramètre propre : il lui faut seulement RDP Shortpath et une version récente de Windows App.
- La QoS (DSCP 46) et la limitation de débit ne fonctionnent qu'avec RDP Shortpath pour les réseaux gérés.
- Private Link : `connection` par pool d'hôtes, `feed` par espace de travail, un seul `global` sur un espace de travail réservé ; réinscrire le fournisseur ; deux zones DNS privées.
