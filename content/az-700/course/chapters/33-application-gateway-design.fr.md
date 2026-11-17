Azure Application Gateway est un équilibreur de charge régional de couche 7 : il termine les connexions des clients, lit les requêtes HTTP et ouvre ses propres connexions vers les back-ends. Les questions de conception demandent si Application Gateway répond à l'exigence, quel SKU et quel mode de mise à l'échelle choisir, comment dimensionner son sous-réseau, que mettre dans un pool principal et pourquoi un back-end apparaît comme non sain.

<!-- section: appgw-capabilities | objectives: 3.2.1 -->
## Fonctionnalités, SKU et capacités

Faites correspondre l'exigence à la fonctionnalité :

| Exigence | Fonctionnalité d'Application Gateway |
| --- | --- |
| Envoyer `/images/*` et `/video/*` vers des pools de serveurs différents | Routage basé sur le chemin d'URL (règle basée sur le chemin) |
| Héberger `contoso.com` et `fabrikam.com` sur une même adresse IP publique et un même port | Écouteurs multisites (noms d'hôte, caractères génériques) |
| Rediriger HTTP vers HTTPS, ou un site vers un autre | Redirection sur une règle de routage |
| Décharger le TLS des serveurs web | Écouteur HTTPS avec un certificat (terminaison TLS) |
| Chiffrer aussi le trafic jusqu'au back-end | TLS de bout en bout : paramètres de back-end HTTPS |
| Authentifier les clients par certificat | TLS mutuel via un profil SSL |
| Stocker les certificats de façon centralisée avec renouvellement automatique | Intégration à Key Vault |
| Garder un utilisateur sur le serveur qui détient la session | Affinité basée sur les cookies |
| Ajouter des en-têtes de sécurité, masquer des en-têtes serveur, modifier l'URL | Ensembles de règles de réécriture |
| Bloquer les attaques OWASP et les bots | SKU WAF_v2 avec une stratégie WAF |
| Survivre à la panne d'une zone avec une adresse stable | Redondance interzone (par défaut) et adresse IP virtuelle (VIP) statique |
| Retirer des back-ends proprement pendant les mises à jour | Drainage des connexions |
| Pages d'erreur personnalisées pour 502 ou 403 | Pages d'erreur personnalisées |
| Entrée (ingress) pour AKS | Contrôleur d'entrée Application Gateway (AGIC) |
| Joindre la passerelle en privé depuis d'autres réseaux virtuels ou locataires | Private Link |
| Relayer du trafic TCP ou TLS non HTTP sur la même passerelle | Écouteurs proxy TCP/TLS (couche 4) |

WebSocket est toujours actif ; HTTP/2 est pris en charge des clients vers la passerelle (les connexions vers le back-end utilisent HTTP/1.1).

SKU : les SKU v1 (Standard, WAF) ont été **retirés le 28 avril 2026**. La famille v2 :

| | Basic (préversion) | Standard_v2 | WAF_v2 |
| --- | --- | --- | --- |
| Objectif | Faible trafic, SLA plus bas | Trafic web de production | Standard_v2 plus Web Application Firewall |
| Mise à l'échelle | Automatique, jusqu'à environ 200 connexions par seconde | Mise à l'échelle automatique ou manuelle, jusqu'à 125 instances | Comme Standard_v2 |
| Réécriture d'URL, mTLS, Private Link, privé uniquement, proxy TCP/TLS, AGIC | Non | Oui | Oui |
| Écouteurs, pools, règles | 5 chacun | 100 écouteurs, 100 pools, 400 règles | Identique |

Learn indique un SLA de 99,9 % pour Basic et de 99,95 % pour Standard_v2. Toute passerelle v2 a une VIP statique, l'intégration à Key Vault, la réécriture d'en-têtes et la redondance interzone quand la région a des zones.

Limites par passerelle : jusqu'à 4 adresses IP frontales (une publique et une privée par version IP), 100 ports frontaux, 100 pools principaux de 1 200 cibles chacun, 100 paramètres HTTP de back-end, 200 écouteurs (100 actifs), 5 noms d'hôte par écouteur, 100 règles de chemin par mappage d'URL, 400 ensembles de règles de réécriture, 100 certificats SSL.

> **Piège d'examen.** Une exigence de WAF pour une application web régionale désigne WAF_v2 (ou Front Door pour un point d'entrée global). Standard_v2 ne peut pas porter de stratégie WAF ; Load Balancer ne le peut jamais.

<!-- section: appgw-use-cases | objectives: 3.2.2 -->
## Cas d'usage et prérequis de déploiement

Choisissez Application Gateway pour des applications HTTP(S) dans **une seule région** qui exigent des décisions de couche 7 : routage par chemin ou par hôte, déchargement ou rechiffrement TLS, WAF, affinité, réécritures. Il atteint des back-ends dans son propre réseau virtuel, dans des réseaux appairés, en local (VPN, ExpressRoute) et sur des points de terminaison publics comme App Service.

| Exigence | Meilleure réponse |
| --- | --- |
| TCP ou UDP non HTTP avec la latence la plus faible | Load Balancer |
| Point d'entrée HTTP global, mise en cache en périphérie, basculement entre régions | Front Door, éventuellement devant Application Gateway |
| Orientation par DNS entre régions et environnement local | Traffic Manager, avec une Application Gateway par région |
| Plus de 125 instances de capacité | Plusieurs passerelles derrière Traffic Manager ou Front Door |

Règles d'infrastructure :

- Un **sous-réseau dédié** : uniquement des passerelles d'application (plusieurs sont autorisées), v1 et v2 ne peuvent pas le partager, et `GatewaySubnet` ne peut pas être utilisé.
- Taille : une adresse par instance, une de plus pour une adresse IP frontale privée, plus les 5 adresses réservées par Azure. v2 prend en charge 125 instances : **/24 recommandé**. Exemple : un maximum de 27 instances avec une adresse frontale privée exige 33 adresses.
- Adresse frontale : publique et privée, publique uniquement, ou privée uniquement (déploiement privé). L'adresse IP publique est une adresse Standard statique dont les zones incluent celles de la passerelle ; une adresse frontale privée v2 exige une adresse **statique** choisie dans le sous-réseau.
- NSG sur le sous-réseau (déploiements standard) : autoriser les clients vers les ports des écouteurs, autoriser `GatewayManager` sur TCP **65200-65535** (v2), conserver la règle entrante `AzureLoadBalancer` et l'accès internet sortant.
- Itinéraires définis par l'utilisateur : autorisés pour envoyer 0.0.0.0/0 vers internet ou pour arrêter la propagation des routes de passerelle ; le tunneling forcé de 0.0.0.0/0 via une NVA ou l'environnement local n'est pas pris en charge pour les déploiements v2 standard.
- Les serveurs DNS personnalisés du réseau virtuel doivent résoudre les noms publics ; redémarrez (arrêt puis démarrage) la passerelle après les avoir changés.
- L'identité qui déploie a besoin de `Microsoft.Network/virtualNetworks/subnets/join/action` (Network Contributor l'a).

Le **déploiement privé d'Application Gateway** (fonctionnalité `EnableApplicationGatewayNetworkIsolation`, en disponibilité générale) supprime l'exigence d'adresse IP publique et les règles `GatewayManager` et internet sortant, et permet une règle NSG sortante Deny All et un itinéraire 0.0.0.0/0 vers une NVA.

> **Piège d'examen.** Une passerelle dont le sous-réseau reçoit 0.0.0.0/0 d'une passerelle ExpressRoute ou VPN (ou d'un UDR vers un pare-feu) perd son trafic de gestion et l'intégrité des back-ends. Corrigez avec une table de routage qui désactive la propagation des routes de passerelle ou envoie 0.0.0.0/0 vers internet, ou utilisez un déploiement privé.

<!-- section: appgw-scaling | objectives: 3.2.3 -->
## Mise à l'échelle manuelle ou automatique

| | Mise à l'échelle automatique | Manuelle (capacité fixe) |
| --- | --- | --- |
| Paramètre | Nombre minimal d'instances (0 à 100) et maximum facultatif (jusqu'à 125, 10 par défaut) | Nombre d'instances, de 1 à 125 |
| Comportement | Augmente et réduit le nombre d'instances selon le trafic | Ne change jamais ; le trafic en excès peut être perdu |
| Convient à | Trafic variable ; recommandée pour limiter l'impact d'une panne de zone | Charge stable et prévisible |

Éléments de dimensionnement :

- Chaque instance traite au moins **10 unités de capacité**. Une unité de capacité est la plus élevée de 1 unité de calcul, 2 500 connexions persistantes ou 2,22 Mbit/s de débit. Une unité de calcul Standard_v2 traite environ 50 connexions TLS par seconde (clé RSA 2048 bits).
- Prix = coût fixe horaire (facturé même avec 0 instance minimale) + unités de capacité. Le nombre minimal d'instances **réserve** 10 unités de capacité par instance, facturées quel que soit le trafic.
- Le scale-out prend **3 à 5 minutes** : fixez le minimum pour absorber les pics soudains (par exemple 25 à 30 instances quand le pic en exige 50). Lors d'un scale-in, une instance draine ses connexions pendant 5 minutes.
- La passerelle reste hautement disponible même avec un minimum de 0.
- Le sous-réseau doit contenir le nombre maximal d'instances.
- Le SKU Basic n'a pas de paramètres de mise à l'échelle.

```bash
az network application-gateway create --resource-group RG-Web --name agw-web \
  --sku Standard_v2 --min-capacity 2 --max-capacity 20 --zones 1 2 3 \
  --vnet-name vnet-web --subnet snet-agw --public-ip-address pip-agw \
  --frontend-port 80 --http-settings-port 80 --http-settings-protocol Http \
  --servers 10.20.1.4 10.20.1.5 --priority 100
```

> **Conseil d'examen.** « Le trafic double chaque lundi à 8 h et des requêtes échouent pendant quelques minutes » désigne une hausse du nombre minimal d'instances, pas du maximum : les nouvelles instances mettent plusieurs minutes à être opérationnelles.

<!-- section: appgw-backend-pools | objectives: 3.2.4 -->
## Pools principaux

Un pool principal peut contenir :

| Type de membre | Remarques |
| --- | --- |
| Machines virtuelles | Sélectionnées par leur carte réseau |
| Groupes de machines virtuelles identiques | Mettez à niveau les instances du groupe identique après l'ajout au pool, sinon elles restent non saines |
| Adresses IP privées | Dans le réseau virtuel de la passerelle, des réseaux virtuels appairés, ou des réseaux connectés par VPN ou ExpressRoute |
| Adresses IP publiques | Tout point de terminaison joignable |
| FQDN | Résolus par les serveurs DNS du réseau virtuel ; App Service, Container Apps et autres services multilocataires |

Les membres ne sont liés ni à un groupe à haute disponibilité ni à un réseau virtuel : toute cible joignable en IP convient. Un pool contient jusqu'à 1 200 cibles. Créez un pool par application ou famille de chemins, et un pool par défaut pour une règle basée sur le chemin.

```bash
az network application-gateway address-pool create --resource-group RG-Web \
  --gateway-name agw-web --name pool-api --servers 10.20.2.4 10.20.2.5
az network application-gateway address-pool create --resource-group RG-Web \
  --gateway-name agw-web --name pool-app --servers contoso-app.azurewebsites.net
```

Pour App Service et les autres back-ends multilocataires, les paramètres de back-end doivent envoyer le nom d'hôte attendu par le service : **Pick host name from backend target** ou un remplacement du nom d'hôte (chapitre suivant).

> **Piège d'examen.** Le NSG du sous-réseau du back-end doit autoriser le trafic venant du sous-réseau d'Application Gateway (source des requêtes et des sondes pour les back-ends privés). Un back-end sur internet voit l'adresse IP frontale publique de la passerelle comme source.

<!-- section: appgw-probes | objectives: 3.2.5 -->
## Sondes d'intégrité

Sans sonde personnalisée, la **sonde par défaut** est utilisée :

| Propriété | Sonde par défaut |
| --- | --- |
| URL | `<protocol>://127.0.0.1:<port>/`, protocole et port issus des paramètres de back-end |
| Intervalle | 30 secondes |
| Délai d'expiration | 30 secondes |
| Seuil de défaillance | 3 échecs consécutifs |
| Réponse saine | Code d'état HTTP de 200 à 399 |

Une **sonde personnalisée** définit le protocole, l'hôte (en-tête d'hôte et, en v2, SNI), le chemin commençant par `/`, le port (v2 uniquement), l'intervalle, le délai d'expiration, le seuil de défaillance, **Pick host name from backend settings**, et des conditions de correspondance : codes d'état ou plages acceptés et une chaîne dans le corps de la réponse. `MinServers` (CLI, PowerShell, ARM uniquement) force un nombre de serveurs à rester sains et peut envoyer du trafic vers des serveurs défaillants.

Fonctionnement des sondes :

- Les sondes démarrent quand une règle associe un écouteur, un pool principal et des paramètres de back-end. Une sonde personnalisée n'est utilisée que via des paramètres de back-end rattachés à une règle.
- Une sonde s'exécute pour chaque combinaison de serveur de back-end et de paramètres de back-end, depuis chaque instance de la passerelle indépendamment.
- Un serveur est non sain jusqu'à sa première sonde réussie ; quand tous les serveurs sont non sains, les clients reçoivent **502 Bad Gateway**.
- La page **Intégrité du back-end** (Backend health) affiche l'état et la raison par serveur.

```bash
az network application-gateway probe create --resource-group RG-Web --gateway-name agw-web \
  --name probe-api --protocol Https --path /healthz --interval 30 --timeout 30 --threshold 3 \
  --host-name-from-http-settings true --match-status-codes 200-399 401
```

Corrections courantes :

| Symptôme | Correction |
| --- | --- |
| Le back-end exige une authentification et répond 401 ou 403 à la sonde | Sonde personnalisée qui accepte 401 ou 403 |
| La page d'intégrité de l'application est `/healthz`, pas `/` | Sonde personnalisée avec ce chemin |
| Serveur avec un certificat générique servant plusieurs noms d'hôte | Sonde personnalisée avec un nom d'hôte précis pour le SNI |
| Back-end App Service non sain avec la sonde par défaut (hôte 127.0.0.1) | Pick host name from backend settings, avec des paramètres de back-end qui prennent le nom d'hôte de la cible |

> **Piège d'examen.** Une sonde trop lente à échouer envoie du trafic vers un serveur mort pendant un moment : le délai de détection vaut environ l'intervalle multiplié par le seuil de défaillance. Réduire l'intervalle ou le seuil détecte les pannes plus tôt.

<!-- section: key-points -->
## Points clés

- Application Gateway est régional, de couche 7 ; Front Door et Traffic Manager gèrent le multirégion.
- v1 retiré le 28 avril 2026 : Standard_v2 ou WAF_v2 (Basic en préversion).
- Sous-réseau dédié, /24 recommandé, adresse IP frontale privée statique en v2, `GatewayManager` 65200-65535 dans le NSG pour les déploiements standard.
- Mise à l'échelle automatique : minimum de 0 à 100 qui réserve de la capacité, maximum jusqu'à 125 ; le scale-out prend plusieurs minutes.
- Les pools principaux acceptent cartes réseau, groupes identiques, adresses IP et FQDN, dans Azure ou en dehors.
- Sonde par défaut : 127.0.0.1, 30 s, 3 échecs, 200 à 399 ; les sondes personnalisées règlent l'hôte, le chemin et les codes d'état.
