Les services de calcul exécutent votre code ; les services réseau le connectent. À ce niveau, il faut savoir à quoi sert chaque service et quand le choisir, pas comment le configurer.

<!-- section: compute-types | objectives: 2.2.1 -->
## Comparer les types de calcul

| Type de calcul | Ce que c'est | Vous gérez | À choisir quand |
| --- | --- | --- | --- |
| **Machine virtuelle** | Un serveur virtualisé avec son propre système d'exploitation (IaaS) | Le système d'exploitation et tout ce qui y est installé | Il vous faut un contrôle complet, des logiciels spécifiques, ou une migration lift-and-shift |
| **Conteneur** | Un paquet léger contenant une application et ses dépendances ; plusieurs conteneurs partagent le système d'exploitation d'un même hôte | L'application empaquetée dans le conteneur | Vous voulez un démarrage rapide, de la portabilité et de nombreuses instances par hôte ; microservices |
| **Fonction** | Un morceau de code exécuté en réponse à un événement (serverless) | Seulement le code | Le traitement est court, déclenché par des événements, et vous ne voulez payer que lorsqu'il s'exécute |

Une machine virtuelle virtualise le matériel et embarque un système d'exploitation complet ; un conteneur virtualise le système d'exploitation, il est donc plus petit et démarre en quelques secondes. Les fonctions vont plus loin : aucune infrastructure, mise à l'échelle automatique, facturation à l'exécution. Les fonctions sont sans état par défaut ; les *Durable Functions* conservent un état entre les appels.

<!-- section: vm-options | objectives: 2.2.2 -->
## Les options de machine virtuelle

| Option | But |
| --- | --- |
| **Machines virtuelles Azure** | Des serveurs individuels, Windows ou Linux, de la taille de votre choix. Créés à partir d'une image, qui peut être la vôtre |
| **Groupes de machines virtuelles identiques** (Virtual Machine Scale Sets) | Un groupe de machines virtuelles **identiques et à charge équilibrée**, dont le nombre augmente ou diminue automatiquement selon la demande ou un calendrier |
| **Groupes à haute disponibilité** (availability sets) | Répartissent les machines virtuelles d'une application sur des **domaines de mise à jour** (groupes redémarrés un par un pendant une maintenance) et des **domaines d'erreur** (groupes qui partagent une alimentation et un commutateur réseau). Au moins une machine reste en service. Sans surcoût : vous ne payez que les machines |
| **Azure Virtual Desktop** | Virtualisation de postes de travail et d'applications : un bureau Windows hébergé dans le cloud, accessible depuis presque n'importe quel appareil. Sécurité centralisée avec Microsoft Entra ID et l'authentification multifacteur ; Windows **multisession** permet à plusieurs utilisateurs de partager une même machine virtuelle, ce qui réduit le coût |

Les groupes identiques répondent à « absorber une charge variable » ; les groupes à haute disponibilité répondent à « survivre à une panne matérielle et à la maintenance dans un centre de données ». Pour se protéger de la perte d'un centre de données, utilisez les zones de disponibilité.

<!-- section: vm-resources | objectives: 2.2.3 -->
## Les ressources nécessaires à une machine virtuelle

Quand vous créez une machine virtuelle, vous choisissez ou créez :

- sa **taille** : nombre de cœurs de processeur et quantité de mémoire, selon l'usage (usage général, optimisée pour le calcul, optimisée pour la mémoire...) ;
- des **disques de stockage** : un disque de système d'exploitation, et des disques de données si nécessaire ;
- le **réseau** : un réseau virtuel et un sous-réseau, une interface réseau, éventuellement une adresse IP publique et les ports à ouvrir ;
- le **groupe de ressources**, la région et l'image (système d'exploitation).

Vous payez le temps de calcul de la machine et, séparément, ses disques et son adresse IP publique. Une machine arrêtée et libérée ne coûte plus de calcul, mais ses disques coûtent toujours du stockage.

<!-- section: app-hosting | objectives: 2.2.4 -->
## Les options d'hébergement d'applications

| Option | Service | Caractéristiques |
| --- | --- | --- |
| **Applications web** | Azure App Service | PaaS pour les applications web, les API REST, les tâches d'arrière-plan et les back-ends mobiles, sous Windows ou Linux, en .NET, Java, Node.js, Python ou PHP. Équilibrage de charge, mise à l'échelle automatique et haute disponibilité intégrés ; déploiement depuis GitHub ou Azure DevOps |
| **Conteneurs** | Azure Container Instances | Le moyen le plus rapide et le plus simple d'exécuter un conteneur, sans gérer de machines virtuelles |
| | Azure Container Apps | Des conteneurs serverless avec mise à l'échelle et équilibrage de charge intégrés |
| | Azure Kubernetes Service | L'orchestration de nombreux conteneurs avec Kubernetes |
| **Machines virtuelles** | Machines virtuelles Azure | Contrôle complet de l'environnement d'hébergement ; vous gérez le serveur |

Choisissez App Service quand l'équipe veut déployer du code web sans gérer de serveurs, les conteneurs quand l'application est empaquetée en conteneurs ou faite de microservices, et les machines virtuelles quand l'application demande le contrôle du système d'exploitation.

<!-- section: virtual-networking | objectives: 2.2.5 -->
## La mise en réseau virtuelle

Un **réseau virtuel Azure** permet aux ressources Azure de communiquer entre elles, avec les utilisateurs sur internet et avec les réseaux locaux. Ce qu'il apporte :

| Capacité | Sens |
| --- | --- |
| Isolation et segmentation | Un espace d'adressage privé que vous découpez en **sous-réseaux** |
| Communication avec internet | Par une adresse IP publique, une passerelle NAT ou un équilibreur de charge public |
| Communication entre ressources Azure | Dans le réseau virtuel, ou vers des services par des points de terminaison de service |
| Communication avec les ressources locales | VPN de point à site, VPN de site à site, ExpressRoute |
| Routage et filtrage | Tables de routage ; **groupes de sécurité réseau** et appliances virtuelles réseau pour autoriser ou refuser le trafic |

Un réseau virtuel appartient à une région et à un abonnement.

Le **peering** (appairage) connecte deux réseaux virtuels pour que leurs ressources communiquent en privé sur le réseau principal de Microsoft, jamais sur l'internet public. Les réseaux peuvent être dans des régions différentes (peering mondial).

**Azure DNS** héberge vos domaines DNS sur l'infrastructure d'Azure : vous gérez les enregistrements avec les mêmes informations d'identification, outils et facturation que les autres services Azure. Il prend en charge les zones privées et les enregistrements d'alias, et bénéficie de la fiabilité d'Azure. Vous **ne pouvez pas acheter de nom de domaine** auprès d'Azure DNS.

Deux services relient un réseau local à Azure :

| | **Passerelle VPN Azure** | **Azure ExpressRoute** |
| --- | --- | --- |
| Chemin | Tunnel **chiffré** sur l'**internet public** | Connexion **privée** par un fournisseur de connectivité ; ne passe pas par l'internet public |
| Usage | De site à site (tout un réseau), de point à site (un ordinateur), de réseau à réseau | Charges importantes ou sensibles qui demandent fiabilité, débit et latence constante |
| Coût et mise en place | Coût plus faible, mise en place rapide | Coût plus élevé, dépend d'un fournisseur |
| Remarques | Une seule passerelle VPN par réseau virtuel ; peut servir de chemin de secours à ExpressRoute | Redondance intégrée ; atteint toutes les régions d'une zone géographique, ou le monde entier avec Global Reach |

<!-- section: endpoints | objectives: 2.2.6 -->
## Points de terminaison publics et privés

Un **point de terminaison public** est l'adresse IP publique par laquelle un service est joignable depuis n'importe où sur internet. Les services Azure comme les comptes de stockage en ont un par défaut.

Un **point de terminaison privé** est une interface réseau qui donne au service une **adresse IP privée de votre réseau virtuel**. Le trafic entre votre réseau et le service circule alors sur le réseau principal de Microsoft et ne traverse jamais l'internet public ; le point de terminaison public peut être fermé.

<!-- section: key-points -->
## Points clés

- Machine virtuelle : contrôle complet (IaaS). Conteneur : léger, partage le système d'exploitation de l'hôte. Fonction : code serverless déclenché par des événements.
- Groupes identiques : machines identiques mises à l'échelle automatiquement. Groupes à haute disponibilité : domaines de mise à jour et d'erreur. Azure Virtual Desktop : bureaux hébergés dans le cloud, multisession.
- Une machine virtuelle demande une taille, des disques, un réseau virtuel avec une interface et, éventuellement, une adresse IP publique.
- App Service héberge des applications web et des API sans serveurs à gérer.
- Les réseaux virtuels isolent et connectent ; le peering relie deux réseaux en privé ; Azure DNS héberge des domaines mais n'en vend pas.
- Passerelle VPN : chiffrée, sur internet. ExpressRoute : privé, hors internet.
- Point de terminaison privé : une adresse IP privée pour un service dans votre réseau virtuel.
