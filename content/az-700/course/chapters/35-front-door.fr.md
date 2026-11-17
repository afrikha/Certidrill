Azure Front Door est le point d'entrée mondial de Microsoft pour les applications HTTP et HTTPS : un réseau de distribution de contenu doté d'équilibrage de charge, de déchargement TLS, d'un moteur de règles et d'un pare-feu d'applications web, qui s'exécute dans des emplacements de périphérie du monde entier. Les questions d'examen demandent quand le préférer aux services régionaux, quel niveau exige un besoin, comment une requête circule du client vers une origine, et comment mettre en cache, réécrire, rediriger et verrouiller ce trafic.

<!-- section: capabilities | objectives: 3.3.1, 3.3.2 -->
## Fonctionnalités et cas d'usage

Une requête suit ces étapes : le DNS renvoie l'adresse IP du meilleur point de présence (POP) ; le client s'y connecte ; Front Door associe l'en-tête `Host` à un domaine de votre profil ; la stratégie de pare-feu d'applications web (WAF) du domaine s'exécute ; la requête est associée à un **itinéraire** (route) et les **ensembles de règles** de l'itinéraire s'exécutent ; une copie valide en cache est renvoyée si la mise en cache est activée ; sinon une **origine** du **groupe d'origines** de l'itinéraire est sélectionnée et la requête lui est transférée.

Associer les besoins aux services d'équilibrage de charge :

| Besoin | Service |
| --- | --- |
| Point d'entrée HTTP/HTTPS mondial, basculement entre régions, mise en cache en périphérie | Azure Front Door |
| Routage de couche 7 et WAF pour une application web dans une seule région, au sein d'un réseau virtuel | Azure Application Gateway |
| Équilibrage de charge TCP ou UDP dans une région | Azure Load Balancer |
| Routage mondial fondé sur le DNS pour tout protocole, le client se connectant directement au point de terminaison | Azure Traffic Manager |
| Accélérer une API dynamique utilisée dans le monde entier | Azure Front Door sans mise en cache (le TCP fractionné et le réseau principal Microsoft aident quand même) |

Cas d'usage typiques : applications multirégions (actif/actif ou actif/passif), API mondiales, sites web statiques dans Stockage Azure, migrations et déploiements bleu-vert avec des origines pondérées, et une seule stratégie WAF devant des origines dans Azure, en local ou dans un autre cloud. Les origines doivent être joignables publiquement, sauf les origines Private Link en Premium. Les WebSockets, HTTP/2, IPv6, les domaines apex et les domaines génériques sont pris en charge.

> **Piège d'examen.** Front Door ne traite que HTTP et HTTPS. Une application qui utilise un autre protocole TCP ou UDP, comme SFTP ou un protocole de jeu sur UDP, a besoin de Load Balancer (régional) ou de Traffic Manager (mondial, fondé sur le DNS), pas de Front Door.

<!-- section: tiers | objectives: 3.3.3 -->
## Choisir un niveau

| Fonctionnalité | Standard | Premium |
| --- | --- | --- |
| Distribution statique et dynamique, mise en cache, compression, moteur de règles, domaines personnalisés, certificats managés | Oui | Oui |
| Règles WAF personnalisées (IP, filtrage géographique, limitation du débit) | Oui | Oui |
| Ensembles de règles WAF managés par Microsoft et protection contre les bots | Non | Oui |
| Connexion Private Link à l'origine | Non | Oui |
| TLS mutuel (certificats clients) | Non | Oui |
| Points de terminaison par profil | 10 | 25 |
| Domaines personnalisés par profil | 100 | 500 |
| Groupes d'origines / origines par profil | 100 / 100 | 200 / 200 |

Les deux niveaux autorisent 50 origines par groupe d'origines et 100 règles par ensemble de règles. Les noms de SKU utilisés par les commandes et les modèles sont `Standard_AzureFrontDoor` et `Premium_AzureFrontDoor`.

Standard se met à niveau vers Premium sur place (page **Configuration**), sans interruption ; les stratégies WAF sont copiées et leurs règles managées doivent ensuite être activées. Premium ne peut pas revenir à Standard : recréez le profil. **Azure Front Door (classique)** n'accepte plus de nouveaux profils depuis le 1er avril 2025 et sera mis hors service le **31 mars 2027** : migrez vers Standard ou Premium.

> **Conseil d'examen.** Lisez les mots du besoin : « ensemble de règles managé », « protection OWASP », « protection contre les bots » ou « origine privée sans accès public » signifient **Premium**. La mise en cache, les domaines personnalisés, HTTPS et des règles WAF personnalisées seules relèvent de **Standard**.

<!-- section: configuration | objectives: 3.3.4 -->
## Configurer les points de terminaison, les origines et les itinéraires

Un profil contient ces objets :

| Objet | Rôle | Paramètres clés |
| --- | --- | --- |
| Point de terminaison | Regroupement logique d'itinéraires, avec un nom d'hôte généré comme `contoso-frontend-abc123.z01.azurefd.net` | État activé ; étendue de réutilisation du nom (`TenantReuse` par défaut) |
| Groupe d'origines | Origines qui servent le même contenu | Sonde d'intégrité (chemin, protocole, HEAD ou GET, intervalle), taille de l'échantillon, échantillons réussis, sensibilité de latence, affinité de session |
| Origine | Un back-end : App Service, Stockage ou un hôte personnalisé | Nom d'hôte, en-tête de l'hôte d'origine, ports, priorité (1 à 5), poids (1 à 1 000), Private Link |
| Itinéraire | Relie des domaines et des chemins à un groupe d'origines | Modèles de correspondance, protocoles acceptés, redirection HTTPS, chemin d'origine, protocole de transfert, mise en cache, ensembles de règles |
| Domaine | Domaine personnalisé validé par un enregistrement TXT `_dnsauth.<subdomain>`, puis dirigé vers le point de terminaison par un CNAME | Certificat (managé ou le vôtre), stratégie TLS |

L'**en-tête de l'hôte d'origine** est la valeur `Host` envoyée à l'origine ; le portail y place le nom d'hôte de l'origine. App Service et le Stockage Blob rejettent un en-tête d'hôte qu'ils ne connaissent pas : gardez cette valeur ou ajoutez le domaine personnalisé à l'application.

La **correspondance des itinéraires** retient la correspondance la plus précise : protocole, puis domaine (correspondance exacte, sinon HTTP 404), puis chemin (exact d'abord, puis générique). Avec les itinéraires `/abc/*` et `/*`, `/abc/d` prend `/abc/*` et `/abcd` prend `/*` ; sans itinéraire `/*`, les chemins sans correspondance reçoivent un 404.

**Sélection de l'origine** dans un groupe d'origines :

1. Garder les origines activées que les sondes d'intégrité déclarent saines (seul HTTP 200 compte comme un succès).
2. Garder la plus petite valeur de **priorité** présente (1 est la priorité la plus haute) : on obtient l'actif/passif.
3. Garder les origines dont la latence reste dans la **sensibilité de latence** de la plus rapide. Avec la valeur par défaut de 0 ms, seule l'origine la plus rapide reçoit du trafic.
4. Répartir le trafic selon le **poids** entre les origines restantes : on obtient une distribution pondérée ou actif/actif.

L'**affinité de session** (paramètre du groupe d'origines) utilise le cookie `ASLBSA`. Si toutes les origines échouent à leurs sondes, Front Door les utilise toutes en tourniquet (round robin). Les sondes ne peuvent être désactivées que pour un groupe qui n'a qu'une seule origine activée.

```bicep
resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2021-06-01' = {
  parent: endpoint
  name: 'route-static'
  properties: {
    originGroup: { id: originGroup.id }
    customDomains: [ { id: customDomain.id } ]
    supportedProtocols: [ 'Http', 'Https' ]
    patternsToMatch: [ '/static/*' ]
    httpsRedirect: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Disabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [ 'text/html', 'text/css', 'application/javascript' ]
      }
    }
  }
}
```

> **Piège d'examen.** Les poids ne répartissent pas le trafic entre des origines de priorités différentes et, avec une sensibilité de latence de 0 ms, ils ne s'appliquent qu'à des origines de même latence. Pour un déploiement canary 90/10 entre deux régions, donnez la même priorité aux deux origines et augmentez la sensibilité de latence.

<!-- section: tls | objectives: 3.3.5 -->
## Arrêt TLS et chiffrement de bout en bout

Front Door termine la connexion TLS du client en périphérie, inspecte et route la requête, puis ouvre une connexion **distincte** vers l'origine. Le **protocole de transfert** de l'itinéraire décide de ce second tronçon :

| Protocole de transfert | De Front Door à l'origine |
| --- | --- |
| HTTP only | Non chiffré (déchargement TLS) |
| HTTPS only | TLS rechiffré : TLS de bout en bout |
| Match incoming request | Même protocole que celui du client |

Pour du HTTPS vers l'origine, celle-ci doit présenter un certificat avec une **chaîne complète** jusqu'à une autorité de certification de la liste Microsoft Trusted CA (pas de certificat auto-signé ni d'autorité interne) et un nom de sujet correspondant au **nom d'hôte** de l'origine. La **validation du nom du sujet du certificat** peut être désactivée pour des tests, mais Microsoft le déconseille et Private Link l'exige.

Côté client, TLS 1.0 et 1.1 ne sont pas pris en charge ; la **stratégie TLS** de chaque domaine fixe la version minimale et les suites de chiffrement (prédéfinie `TLSv1.2_2023` par défaut, ou personnalisée). L'option d'itinéraire **Rediriger tout le trafic pour utiliser HTTPS** (Redirect all traffic to use HTTPS) répond aux requêtes HTTP par une redirection. L'authentification par certificat client (mTLS) est réservée à Premium.

Certificats des domaines personnalisés :

| | Certificat managé par Front Door | Votre propre certificat (BYOC) |
| --- | --- | --- |
| Source | Émis par DigiCert ; ajoutez un enregistrement CAA `0 issue digicert.com` si votre domaine restreint les émetteurs | Importé dans Azure Key Vault comme objet certificat (PFX), émis par une autorité approuvée ; clés EC non prises en charge |
| Domaines | Sous-domaine, apex et générique | Tout domaine correspondant au CN ou au SAN du certificat |
| Renouvellement | Automatique quand le CNAME du domaine pointe directement vers le point de terminaison ; sinon revalidation par un nouvel enregistrement TXT 45 jours avant l'expiration | Automatique quand la version du secret est **Latest** ; une version figée doit être resélectionnée manuellement |
| Prérequis | Domaine validé (enregistrement TXT) | Key Vault dans le **même abonnement** que le profil ; accès par une identité managée (Azure RBAC) ou par le principal de service de Front Door (stratégie d'accès) ; « Autoriser les services Microsoft approuvés » si le pare-feu du coffre est actif |

> **Piège d'examen.** Le chiffrement « entre Front Door et les serveurs web » n'est pas un paramètre de certificat du domaine : réglez le protocole de transfert de l'itinéraire sur **HTTPS only** et vérifiez que le certificat de l'origine correspond au nom d'hôte de l'origine.

<!-- section: caching | objectives: 3.3.6 -->
## Configurer la mise en cache

La mise en cache s'active par **itinéraire** et peut être remplacée par un ensemble de règles. Chaque POP gère son propre cache. Seules les requêtes `GET` sont mises en cache. Utilisez des itinéraires distincts pour le contenu statique (mis en cache) et le contenu personnalisé ou authentifié (non mis en cache).

Le **comportement de mise en cache des chaînes de requête** détermine la clé de cache :

| Comportement | Clé de cache |
| --- | --- |
| Ignorer la chaîne de requête (Ignore Query String) | Chemin seul : une copie en cache quelle que soit la chaîne de requête |
| Utiliser la chaîne de requête (Use Query String) | Chaque URL unique, chaîne de requête comprise (l'ordre des paramètres est indifférent) |
| Ignorer les chaînes de requête spécifiées (Ignore Specified Query Strings) | Tous les paramètres sauf ceux de la liste |
| Inclure les chaînes de requête spécifiées (Include Specified Query Strings) | Uniquement les paramètres de la liste |

Durée de conservation en cache :

- Les en-têtes de l'origine décident d'abord : `Cache-Control: s-maxage`, puis `max-age`, puis `Expires`. Sans eux, Front Door met en cache pour une durée aléatoire comprise entre un et trois jours. Le maximum est de 366 jours.
- `Cache-Control: private`, `no-cache` ou `no-store` empêche la mise en cache même quand une règle remplace la durée.
- Une action **Remplacement de la configuration de l'itinéraire** (Route configuration override) peut fixer le comportement de cache : **Respect de l'origine** (Honor origin), **Toujours écraser** (Override always : votre durée remplace celle de l'origine) ou **Remplacer si l'origine est manquante** (Override if origin missing : votre durée seulement si l'origine n'en envoie pas).

Également : les fichiers volumineux sont mis en cache par blocs de 8 Mo (l'origine doit prendre en charge les requêtes de plage d'octets), `Set-Cookie` est retiré des réponses pouvant être mises en cache, et l'en-tête de réponse `X-Cache` indique `TCP_HIT`, `TCP_MISS` ou `CONFIG_NOCACHE`.

Pour retirer du contenu avant son expiration, **videz** le cache : un chemin comme `/images/logo.png`, un caractère générique comme `/scripts/*`, ou `/*` pour tout le contenu des domaines sélectionnés. Un vidage ne tient pas compte de la casse, couvre toutes les variantes de chaîne de requête, atteint tous les POP en 10 minutes environ, et doit citer les sous-domaines pour un domaine générique.

```bash
az afd endpoint purge \
  --resource-group RG-Web \
  --profile-name contoso-afd \
  --endpoint-name contoso-frontend \
  --domains "[www.contoso.com]" \
  --content-paths "[/scripts/*]"
```

> **Conseil d'examen.** Pour publier un nouveau contenu sans attendre la durée de vie (TTL) ni vider le cache, versionnez les noms de fichiers (`app.v2.js`) : la nouvelle URL est une nouvelle clé de cache.

<!-- section: acceleration | objectives: 3.3.7 -->
## Accélération du trafic

Front Door raccourcit le chemin entre les utilisateurs et les origines, même pour un contenu qui ne peut pas être mis en cache :

- **Sélection du POP en unicast** : le DNS renvoie l'adresse IP du meilleur POP, proche de l'utilisateur (ou de son résolveur DNS quand l'emplacement du client est inconnu).
- **TCP fractionné** (split TCP) : les négociations ont lieu avec le POP proche ; Front Door réutilise des connexions de longue durée vers les origines sur le réseau principal Microsoft.
- **Routage fondé sur la latence** : la méthode par défaut envoie le trafic de chaque POP vers l'origine dont la latence mesurée est la plus faible.
- **Compression** : à la volée avec **Brotli** (prioritaire) ou **gzip**, uniquement quand la mise en cache est activée sur l'itinéraire, pour les types MIME configurés et les fichiers de plus de 1 Ko et de moins de 8 Mo.

| Besoin | Configuration |
| --- | --- |
| Pages dynamiques plus rapides pour des utilisateurs éloignés | Itinéraire sans mise en cache : le TCP fractionné et le réseau principal s'appliquent quand même |
| Moins de bande passante pour les fichiers texte | Activer la mise en cache et la compression ; ajuster les types MIME |
| Utilisateurs envoyés vers la région saine la plus proche | Même priorité sur toutes les origines, sélection fondée sur la latence |

> **Piège d'examen.** La case **Activer la compression** (Enable compression) n'apparaît qu'après avoir coché **Activer la mise en cache** (Enable caching) sur l'itinéraire. Un itinéraire qui ne doit jamais mettre en cache ne peut pas utiliser la compression de Front Door ; l'origine peut toujours compresser ses réponses.

<!-- section: rules | objectives: 3.3.8 -->
## Ensembles de règles, réécriture d'URL et redirection d'URL

Un **ensemble de règles** regroupe des règles associées à un ou plusieurs itinéraires. Les règles WAF s'exécutent d'abord, puis les ensembles de règles de l'itinéraire dans l'ordre configuré, puis les règles de chaque ensemble dans l'ordre. Une règle compte jusqu'à **10 conditions de correspondance**, combinées par ET (plusieurs valeurs dans une même condition sont combinées par OU), et jusqu'à **5 actions**. **Arrêter l'évaluation des règles restantes** (Stop evaluating remaining rules) met fin au traitement de cette requête.

Les conditions de correspondance incluent le chemin de la requête, l'URL, l'extension de fichier, la chaîne de requête, un en-tête, les cookies, la méthode, le protocole, le nom d'hôte, le type d'appareil et l'adresse distante (correspondance IP ou géographique). Les expressions régulières et les variables de serveur comme `{url_path:seg1}` sont prises en charge.

| Action | Pour |
| --- | --- |
| Remplacement de la configuration de l'itinéraire | Envoyer les requêtes correspondantes vers un autre groupe d'origines ou protocole de transfert ; activer, désactiver ou ajuster la mise en cache |
| Modifier l'en-tête de requête / Modifier l'en-tête de réponse | Ajouter, remplacer ou supprimer un en-tête (en-têtes de sécurité comme HSTS, masquer un en-tête de serveur) |
| Redirection d'URL | Renvoyer une redirection au client |
| Réécriture d'URL | Modifier le chemin envoyé à l'origine, de façon invisible pour le client |

Paramètres de **redirection d'URL** : type **301** (Moved), **302** (Found), **307** (Temporary redirect) ou **308** (Permanent redirect) ; protocole ; hôte, chemin, chaîne de requête et fragment de destination (chacun remplace la valeur entrante ou la conserve s'il est vide).

Paramètres de **réécriture d'URL** : un **modèle source** (correspondance par préfixe sur le chemin situé après le modèle de correspondance de l'itinéraire), une **destination** et **Conserver le chemin sans correspondance** (Preserve unmatched path) :

| Conserver le chemin sans correspondance | Modèle source | Destination | Requête | Chemin envoyé à l'origine |
| --- | --- | --- | --- | --- |
| Oui | `/` | `/foo/` | `/sub/1.jpg` | `/foo/sub/1.jpg` |
| Oui | `/sub/` | `/foo/` | `/sub/image/1.jpg` | `/foo/image/1.jpg` |
| Non | `/sub/` | `/foo/2.jpg` | `/sub/image/1.jpg` | `/foo/2.jpg` |

```bicep
resource redirectOldShop 'Microsoft.Cdn/profiles/ruleSets/rules@2021-06-01' = {
  parent: ruleSet
  name: 'redirectOldShop'
  properties: {
    order: 1
    conditions: [
      {
        name: 'UrlPath'
        parameters: {
          typeName: 'DeliveryRuleUrlPathMatchConditionParameters'
          operator: 'BeginsWith'
          matchValues: [ 'shop/' ]
        }
      }
    ]
    actions: [
      {
        name: 'UrlRedirect'
        parameters: {
          typeName: 'DeliveryRuleUrlRedirectActionParameters'
          redirectType: 'PermanentRedirect'
          destinationProtocol: 'Https'
          customHostname: 'store.contoso.com'
        }
      }
    ]
    matchProcessingBehavior: 'Stop'
  }
}
```

> **Piège d'examen.** « Le navigateur doit afficher la nouvelle URL » ou « les moteurs de recherche doivent mettre à jour leur index » correspond à une **redirection** (301 ou 308 pour un changement permanent). « Les utilisateurs gardent la même URL tandis que l'origine reçoit un autre chemin » correspond à une **réécriture**. 307 et 308 conservent la méthode de la requête : utilisez-les quand un POST doit rester un POST.

<!-- section: private-link-origin | objectives: 3.3.9 -->
## Sécuriser une origine avec Private Link

Avec **Premium**, Front Door atteint une origine qui n'a pas de point de terminaison public. L'activation de Private Link sur une origine amène Front Door à créer un **point de terminaison privé** dans un réseau virtuel managé par Front Door, dans la région que vous choisissez ; la connexion reste **En attente** jusqu'à ce que le propriétaire de la ressource l'approuve.

Origines prises en charge : App Service et Azure Functions, le Stockage Blob, les sites web statiques de stockage, un **équilibreur de charge interne** via un **service Private Link** que vous créez, API Management, Application Gateway et Azure Container Apps. Les emplacements de déploiement App Service et Static Web Apps ne sont pas pris en charge.

Étapes :

1. Pour une origine équilibreur de charge interne, créer un service Private Link sur la configuration IP frontale de l'équilibreur.
2. Ajouter l'origine, activer **Private Link**, puis choisir la ressource, la sous-ressource cible (`blob`, `sites`...) et la **région** la plus proche de l'origine. La validation du nom du sujet du certificat doit rester activée.
3. Approuver la connexion en attente sur la ressource ou sur le service Private Link (**Connexions de point de terminaison privé**).
4. Bloquer l'accès public à l'origine (App Service le fait automatiquement avec des points de terminaison privés ; pour le stockage, utilisez son pare-feu).

Règles de conception :

- Un groupe d'origines ne peut pas mélanger origines publiques et privées.
- Dans un profil, les origines qui partagent la même ressource, la même sous-ressource et la même région partagent un seul point de terminaison privé, approuvé une fois ; une autre région ou un autre profil impose une nouvelle approbation.
- Chaque cluster régional accepte jusqu'à 7 200 requêtes par seconde par profil ; pour plus de charge ou une redondance régionale, ajoutez des origines qui utilisent des régions Private Link différentes.
- Private Link ne couvre que le trajet de Front Door à l'origine ; les clients atteignent toujours Front Door par internet.

Sans Premium, verrouillez une origine publique : n'autorisez que l'étiquette de service **AzureFrontDoor.Backend** (NSG ou restriction d'accès) et rejetez les requêtes dont l'en-tête `X-Azure-FDID` ne contient pas l'ID de votre profil.

> **Piège d'examen.** Le point de terminaison privé créé par Front Door n'apparaît pas dans votre réseau virtuel et ne vous demande aucun sous-réseau ; ce que vous devez faire, c'est **approuver** la connexion. Les requêtes échouent avec une erreur Front Door tant que l'approbation n'est pas terminée.

<!-- section: key-points -->
## Points clés

- Front Door : mondial, HTTP/HTTPS uniquement. La couche 7 régionale, c'est Application Gateway ; le non-HTTP, c'est Load Balancer ou Traffic Manager.
- Premium ajoute les règles WAF managées, la protection contre les bots, les origines Private Link et le mTLS client ; Standard se met à niveau sur place, sans retour possible.
- Sélection de l'origine : saine, plus petite valeur de priorité, sensibilité de latence, puis poids.
- TLS de bout en bout : protocole de transfert HTTPS only et un certificat d'origine qui correspond au nom d'hôte de l'origine.
- La mise en cache se règle par itinéraire ; la compression exige la mise en cache ; videz le cache ou versionnez les fichiers pour actualiser.
- Une redirection change l'URL du navigateur, une réécriture non.
- Origine Private Link : Premium, approuver la connexion en attente, ne jamais mélanger origines publiques et privées dans un groupe.
