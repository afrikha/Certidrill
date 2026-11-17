Azure fournit des services de réseau et d'infrastructure qui arrêtent chacun un type de menace différent. L'examen décrit un besoin et attend le bon service : retenez ce que chacun protège et à quelle couche.

<!-- section: ddos-protection | objectives: 3.1.1 -->
## Azure DDoS Protection

Une attaque par **déni de service distribué** (DDoS) submerge les ressources d'une application pour que les utilisateurs légitimes ne puissent plus l'atteindre. Les attaques volumétriques saturent la bande passante, les attaques de protocole exploitent des faiblesses des couches 3 et 4, et les attaques de la couche ressource (application) visent les applications web.

**Azure DDoS Protection** analyse le trafic et écarte ce qui ressemble à une attaque, à la **couche 3 (réseau) et à la couche 4 (transport)** : surveillance permanente du trafic, atténuation automatique, réglage adaptatif sur le trafic normal de l'application, et métriques et alertes par Azure Monitor.

| Niveau | Protège | Remarques |
| --- | --- | --- |
| Protection d'infrastructure par défaut | Tous les services Azure | Ni coût ni configuration, mais ni télémétrie, ni alertes, ni réglage sur votre application |
| **DDoS IP Protection** | Des adresses IP publiques individuelles | Payée par adresse IP protégée ; mêmes fonctionnalités de base que Network Protection |
| **DDoS Network Protection** | Toutes les ressources des réseaux virtuels où elle est activée | Ajoute le support de réponse rapide DDoS, la protection des coûts et une remise sur WAF |

> **Piège d'examen.** Azure DDoS Protection ne protège pas la couche 7. Une attaque contre la couche application d'un site web relève d'un pare-feu d'applications web ; les deux s'utilisent ensemble.

<!-- section: azure-firewall | objectives: 3.1.2 -->
## Pare-feu Azure

Le **Pare-feu Azure** (Azure Firewall) est un pare-feu réseau managé, natif du cloud, qui protège les charges de travail de vos réseaux virtuels. Il est entièrement **avec état**, dispose d'une haute disponibilité intégrée et s'adapte au trafic. Il se déploie de façon centralisée, en général dans un réseau virtuel hub, et filtre le trafic de plusieurs réseaux virtuels et abonnements avec un seul jeu de règles.

- Il filtre par adresse IP, port et protocole (règles de réseau) et par nom de domaine complet (règles d'application), et traduit les adresses entrantes et sortantes (DNAT, SNAT).
- Le filtrage par **renseignement sur les menaces** (threat intelligence) signale, et refuse, le trafic depuis ou vers des adresses IP et des domaines malveillants connus.

| SKU | Pour | Fonctionnalités distinctives |
| --- | --- | --- |
| Basic | Les petites et moyennes entreprises | Renseignement sur les menaces en mode alerte uniquement |
| Standard | Le filtrage général de la couche 3 à la couche 7 | Renseignement sur les menaces qui alerte et refuse |
| Premium | Les applications très sensibles, comme le traitement des paiements | Inspection TLS, détection et prévention des intrusions (IDPS), filtrage d'URL |

<!-- section: waf | objectives: 3.1.3 -->
## Azure Web Application Firewall

**Azure Web Application Firewall** (WAF) offre aux applications web une protection centralisée contre les attaques et les vulnérabilités courantes, comme l'**injection SQL** et le **scripting inter-site**. Il travaille à la **couche 7** : il inspecte les requêtes HTTP et HTTPS.

- WAF n'est pas une ressource autonome : il se déploie avec un autre service, principalement **Azure Application Gateway** ou **Azure Front Door**.
- Il applique des ensembles de règles managés, fondés sur l'ensemble de règles de base OWASP, que vous pouvez compléter par des règles personnalisées.
- En mode **détection**, il se contente de journaliser ; en mode **prévention**, il bloque les requêtes.

<!-- section: network-segmentation | objectives: 3.1.4 -->
## La segmentation de réseau avec les réseaux virtuels Azure

La **segmentation** divise un réseau en parties plus petites afin de regrouper les ressources liées, d'isoler des ressources et d'appliquer la gouvernance. Elle soutient la Confiance Zéro : avec « supposer une violation », un segment compromis ne doit pas permettre à l'attaquant de se déplacer latéralement vers le reste.

Un **réseau virtuel Azure** (VNet) est le composant de base d'un réseau privé dans Azure et son premier niveau de confinement :

| Comportement | Par défaut |
| --- | --- |
| Entre ressources du même réseau virtuel | Communication autorisée, sans passer par internet |
| Entre deux réseaux virtuels | Aucun trafic tant que vous ne les connectez pas, par exemple par un **peering de réseaux virtuels** |
| Sortant vers internet | Autorisé |
| Entrant depuis internet | Impossible sans adresse IP publique ou équilibreur de charge |

Les **sous-réseaux** divisent un réseau virtuel en segments aux besoins de sécurité différents, par exemple les serveurs web dans l'un et les bases de données dans un autre, avec leurs propres contrôles.

<!-- section: nsg | objectives: 3.1.5 -->
## Les groupes de sécurité réseau

Un **groupe de sécurité réseau** (NSG) filtre le trafic réseau à destination et en provenance des ressources Azure d'un réseau virtuel. Il contient des **règles de sécurité** qui autorisent ou refusent le trafic entrant ou sortant.

| Propriété d'une règle | Valeurs |
| --- | --- |
| Priorité | Un nombre de 100 à 4096 ; les règles sont traitées à partir du plus petit nombre, et le traitement s'arrête à la première correspondance |
| Source ou destination | Une adresse IP ou une plage, une balise de service, ou un groupe de sécurité d'application |
| Protocole | TCP, UDP, ICMP ou Any |
| Direction | Entrant ou sortant |
| Plage de ports | Un port ou une plage |
| Action | Autoriser ou refuser |

- Un NSG s'associe à un **sous-réseau** ou à une **interface réseau** ; chacun d'eux accepte un seul NSG au plus, et un même NSG peut être associé à plusieurs.
- Règles par défaut, impossibles à supprimer mais que l'on peut remplacer : en entrée, le trafic venant du réseau virtuel et de l'équilibreur de charge Azure est autorisé et tout le reste est refusé ; en sortie, le trafic vers le réseau virtuel et vers internet est autorisé.
- Les NSG sont avec état : la réponse à une connexion autorisée est autorisée automatiquement.

| Service | Couche | Utilisez-le pour |
| --- | --- | --- |
| NSG | 3 et 4 | Filtrer le trafic d'un sous-réseau ou d'une interface réseau, à l'intérieur d'un réseau virtuel |
| Pare-feu Azure | 3 à 7 | Filtrer et inspecter le trafic de façon centralisée, pour plusieurs réseaux virtuels et abonnements |
| WAF | 7 | Protéger les applications web contre des attaques comme l'injection SQL |
| Azure DDoS Protection | 3 et 4 | Absorber les attaques qui cherchent à saturer des points de terminaison publics |

> **Conseil d'examen.** Les NSG et le Pare-feu Azure se complètent : un filtrage distribué au plus près des ressources, plus un contrôle central. Utiliser les deux, c'est la défense en profondeur.

<!-- section: bastion | objectives: 3.1.6 -->
## Azure Bastion

**Azure Bastion** est un service entièrement managé qui fournit une connectivité **RDP et SSH** sécurisée aux machines virtuelles, sur TLS (port 443), directement depuis le portail Azure dans un navigateur. Les machines virtuelles n'ont besoin d'**aucune adresse IP publique**, d'aucun agent ni d'aucun logiciel client particulier ; leurs ports de gestion ne sont donc exposés ni à internet ni à l'analyse des ports.

Bastion se déploie **par réseau virtuel** et atteint aussi les machines virtuelles des réseaux virtuels appairés.

| SKU | En bref |
| --- | --- |
| Developer | Gratuit, infrastructure partagée, une connexion à la fois ; pour le développement et les tests |
| Basic | Déploiement dédié à capacité fixe |
| Standard | Ajoute la mise à l'échelle, la prise en charge du client natif, les liens partageables, le transfert de fichiers |
| Premium | Ajoute l'enregistrement des sessions et le déploiement privé uniquement |

<!-- section: key-vault | objectives: 3.1.7 -->
## Azure Key Vault

**Azure Key Vault** est un service cloud qui stocke des secrets de façon sécurisée et en contrôle l'accès :

| Il gère | Exemples |
| --- | --- |
| Les **secrets** | Mots de passe, clés d'API, jetons, chaînes de connexion |
| Les **clés** | Les clés de chiffrement utilisées pour chiffrer vos données |
| Les **certificats** | Certificats TLS/SSL, avec inscription et renouvellement automatisés |

- Les applications lisent leurs secrets dans le coffre à l'exécution au lieu de les garder dans le code ou les fichiers de configuration.
- L'**authentification** passe par Microsoft Entra ID ; l'**autorisation** utilise Azure RBAC ou les stratégies d'accès Key Vault.
- Le niveau Standard protège les clés de façon logicielle ; le niveau Premium ajoute des clés protégées par un **module de sécurité matériel** (HSM).
- L'accès au coffre peut être journalisé et surveillé.

> **Piège d'examen.** Bastion sécurise la connexion d'un administrateur à une machine virtuelle ; Key Vault sécurise les secrets qu'une application utilise.

<!-- section: key-points -->
## Points clés

- DDoS Protection : couches 3 et 4 ; IP Protection par adresse IP publique, Network Protection par réseau virtuel avec réponse rapide et protection des coûts.
- Pare-feu Azure : pare-feu central managé, avec état, pour plusieurs réseaux virtuels ; Premium ajoute l'inspection TLS et l'IDPS.
- WAF : couche 7, applications web, injection SQL et scripting inter-site ; déployé avec Application Gateway ou Front Door.
- NSG : règles d'autorisation ou de refus par priorité (100 à 4096), sur un sous-réseau ou une interface réseau.
- Bastion : RDP et SSH sur TLS depuis le portail, sans adresse IP publique sur la machine virtuelle.
- Key Vault : secrets, clés, certificats ; clés protégées par HSM au niveau Premium.
