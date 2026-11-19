Le réseau sur AWS commence par Amazon VPC, votre propre réseau isolé dans une Région, et s'étend au DNS, à la diffusion de contenu et aux liaisons privées vers vos centres de données. L'examen vous demande de nommer les composants d'un VPC, de distinguer groupes de sécurité et ACL réseau, de savoir ce que fait Amazon Route 53, et de choisir entre un VPN et AWS Direct Connect.

<!-- section: network-services | objectives: 3.5.1 -->
## Services de réseau AWS

| Service | Ce qu'il fait |
| --- | --- |
| **Amazon VPC** | Un réseau virtuel logiquement isolé que vous définissez dans une Région |
| **Amazon Route 53** | DNS, enregistrement de domaines et vérifications de l'état |
| **Amazon CloudFront** | Réseau de diffusion de contenu : met en cache le contenu dans les emplacements périphériques |
| **AWS Global Accelerator** | Adresses IP statiques et routage par le réseau mondial AWS vers le point de terminaison sain le plus proche |
| **Amazon API Gateway** | Créer, publier et sécuriser des API devant des services back-end |
| **AWS Transit Gateway** | Un hub qui relie de nombreux VPC et réseaux sur site |
| **AWS PrivateLink** | Accès privé à des services via des points de terminaison dans votre VPC, sans passer par Internet |
| **AWS VPN**, **AWS Direct Connect** | Connexions entre vos réseaux et AWS |
| **Elastic Load Balancing** | Répartit le trafic entre des cibles |

<!-- section: vpc-components | objectives: 3.5.2 -->
## Composants d'un VPC

| Composant | Rôle |
| --- | --- |
| **Sous-réseau** | Une plage d'adresses IP dans **une** zone de disponibilité |
| **Sous-réseau public** | Un sous-réseau dont la table de routage a une route vers une passerelle Internet |
| **Sous-réseau privé** | Un sous-réseau sans route vers une passerelle Internet |
| **Table de routage** | Des règles qui décident où va le trafic d'un sous-réseau |
| **Passerelle Internet** | Permet la communication entre le VPC et Internet |
| **Passerelle NAT** | Permet aux instances d'un sous-réseau privé d'ouvrir des connexions sortantes vers Internet, sans que personne sur Internet ne puisse se connecter à elles |
| **Passerelle réseau privé virtuel** (virtual private gateway) | L'extrémité AWS d'une connexion Site-to-Site VPN attachée à un VPC |
| **Appairage de VPC** (VPC peering) | Une connexion privée entre deux VPC |
| **Point de terminaison de VPC** | Accès privé depuis le VPC à des services AWS (par exemple Amazon S3) sans passer par Internet |
| **Adresse IP Elastic** | Une adresse IPv4 publique statique |

Une conception typique : un équilibreur de charge dans des sous-réseaux publics de deux zones de disponibilité, les instances d'application dans des sous-réseaux privés, une base de données dans des sous-réseaux privés sans route vers Internet.

> **Piège d'examen.** Un sous-réseau est public à cause de sa **route vers une passerelle Internet**, pas à cause de son nom. Un sous-réseau privé qui doit télécharger des mises à jour utilise une passerelle NAT, qui n'autorise que les connexions sortantes.

<!-- section: vpc-security | objectives: 3.5.3 -->
## Sécurité dans un VPC

| | Groupe de sécurité | ACL réseau |
| --- | --- | --- |
| S'applique à | Une instance (son interface réseau) | Un sous-réseau : toutes les ressources qu'il contient |
| Règles | Règles d'**autorisation** uniquement | Règles d'**autorisation et de refus**, évaluées dans l'ordre de leur numéro |
| État | **Avec état** (stateful) : le trafic de retour est autorisé automatiquement | **Sans état** (stateless) : le trafic de retour exige sa propre règle |
| Par défaut | Un nouveau groupe de sécurité n'autorise aucun trafic entrant et autorise tout le trafic sortant | L'ACL réseau par défaut autorise tout le trafic |

- Utilisez les **groupes de sécurité** comme pare-feu principal autour de chaque instance (par exemple, n'autoriser HTTPS que depuis l'équilibreur de charge).
- Utilisez les **ACL réseau** comme couche supplémentaire à la limite du sous-réseau, par exemple pour **refuser** une plage d'adresses IP précise.
- **Amazon Inspector** analyse les instances EC2, les images de conteneurs et les fonctions Lambda à la recherche de vulnérabilités logicielles et d'une **exposition réseau involontaire**.
- Les **journaux de flux VPC** (VPC Flow Logs) enregistrent le trafic IP accepté et rejeté dans le VPC, pour le dépannage et l'analyse de sécurité.

> **Piège d'examen.** Seules les ACL réseau peuvent **refuser** du trafic. « Bloquer une adresse IP malveillante pour tout le sous-réseau », c'est une ACL réseau ; un groupe de sécurité ne peut pas contenir de règle de refus.

<!-- section: route-53 | objectives: 3.5.4 -->
## Amazon Route 53

Route 53 est un service **DNS** hautement disponible et évolutif :

- **Enregistrement de domaines** : acheter et gérer des noms de domaine.
- **Routage DNS** : traduire des noms comme `www.example.com` en adresses IP ou en ressources AWS (équilibreurs de charge, distributions CloudFront, sites web S3).
- **Vérifications de l'état** : surveiller les points de terminaison et cesser d'y envoyer les utilisateurs quand ils sont défectueux.
- **Politiques de routage** :

| Politique | Envoie les utilisateurs |
| --- | --- |
| Simple | Vers une ressource |
| Pondérée (weighted) | Vers plusieurs ressources dans les proportions que vous fixez (par exemple, 90 % / 10 % pour tester une nouvelle version) |
| Latence | Vers la Région qui leur donne la latence la plus faible |
| Basculement (failover) | Vers une ressource secondaire quand la principale est défectueuse |
| Géolocalisation | Selon leur pays ou leur continent |

> **Conseil d'examen.** « Diriger les utilisateurs vers la Région à la latence la plus faible » et « basculer vers un site de secours dans une autre Région » sont tous deux des politiques de routage Route 53. Route 53 est la réponse DNS ; CloudFront est la réponse de mise en cache.

<!-- section: connectivity | objectives: 3.5.5 -->
## Options de connectivité réseau vers AWS

| Option | Ce que c'est | Choisissez-la quand |
| --- | --- | --- |
| **AWS Site-to-Site VPN** | Des tunnels IPsec chiffrés sur Internet entre votre centre de données et un VPC (ou une passerelle de transit) | Une connexion chiffrée, rapide à établir et peu coûteuse ; une solution de secours pour Direct Connect |
| **AWS Client VPN** | VPN d'accès à distance géré pour des utilisateurs individuels | Des employés en télétravail doivent atteindre des ressources privées |
| **AWS Direct Connect** | Une connexion réseau privée et dédiée entre vos locaux et AWS via un emplacement Direct Connect, sans passer par l'Internet public | Performances et bande passante constantes, gros transferts de données, coût de transfert de données réduit |
| **Direct Connect plus VPN** | IPsec sur la connexion Direct Connect | Connectivité privée, constante **et** chiffrée |

> **Piège d'examen.** Direct Connect est privé mais pas chiffré par défaut, et sa mise en place prend plus de temps qu'un VPN. « Connexion chiffrée sur Internet, établie rapidement », c'est Site-to-Site VPN ; « connexion dédiée avec des performances réseau constantes », c'est Direct Connect.

<!-- section: key-points -->
## Points clés

- VPC : réseau isolé dans une Région ; les sous-réseaux résident dans une AZ ; un sous-réseau public a une route vers une passerelle Internet ; passerelle NAT pour un accès sortant uniquement depuis les sous-réseaux privés.
- Groupes de sécurité : niveau instance, autorisation uniquement, avec état. ACL réseau : niveau sous-réseau, autorisation et refus, sans état.
- Amazon Inspector trouve les vulnérabilités et l'exposition réseau involontaire ; les journaux de flux VPC enregistrent le trafic.
- Route 53 : DNS, enregistrement de domaines, vérifications de l'état, politiques de routage (simple, pondérée, latence, basculement, géolocalisation).
- Site-to-Site VPN : chiffré sur Internet, rapide. Client VPN : utilisateurs. Direct Connect : liaison privée dédiée, performances constantes.
