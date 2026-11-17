Une requête traverse Application Gateway selon une chaîne fixe : un **écouteur** l'accepte, une **règle de routage** choisit un pool principal (ou une redirection), les **paramètres de back-end** définissent comment la passerelle se connecte au serveur, et un **ensemble de réécriture** peut modifier les en-têtes et l'URL au passage. Les questions d'examen donnent une partie de cette chaîne et demandent quel composant ajouter ou modifier, ou dans quel ordre les règles sont évaluées.

<!-- section: appgw-listeners | objectives: 3.2.6 -->
## Écouteurs

Un écouteur fait correspondre les requêtes entrantes sur quatre valeurs : **adresse IP frontale**, **port frontal**, **protocole** et, pour les écouteurs multisites, **nom d'hôte**.

| Paramètre | Valeurs et règles |
| --- | --- |
| Adresse IP frontale | Publique ou privée ; les deux écouteurs IPv4 (public et privé) peuvent partager un port, les écouteurs IPv6 public et privé ne le peuvent pas |
| Port frontal | 1 à 64999 en v2 (certains ports exclus, comme 22 avec Private Link) |
| Protocole | HTTP, HTTPS (couche 7), TLS, TCP (proxy de couche 4) |
| Type | **De base** (Basic) : tout nom d'hôte sur cette adresse IP et ce port. **Multisite** : jusqu'à 5 noms d'hôte, caractères génériques `*` et `?` autorisés (`*.contoso.com`) |
| Certificat | Obligatoire en HTTPS : un fichier PFX (clé privée et chaîne complète) ou une référence Key Vault |
| Profil SSL | Facultatif : stratégie TLS propre à l'écouteur et authentification des clients |
| Pages d'erreur personnalisées | Pour les codes 400, 403, 405, 408, 500, 502, 503, 504, globales ou par écouteur |

HTTP/2 s'applique aux connexions des clients en HTTPS uniquement ; il est activé par défaut quand la passerelle est créée dans le portail. WebSocket ne demande aucun paramètre.

**Ordre de traitement.** En v2, la **priorité de la règle** (1 à 20000, unique, 1 en premier) décide quel écouteur sert une requête qui correspond à plusieurs écouteurs. Donnez aux écouteurs multisites propres à un site un numéro plus petit qu'aux écouteurs génériques, et les numéros les plus élevés aux écouteurs de base. Sinon, `*.contoso.com` ou un écouteur de base capte `shop.contoso.com`.

```bash
az network application-gateway frontend-port create --resource-group RG-Web \
  --gateway-name agw-web --name port-443 --port 443
az network application-gateway http-listener create --resource-group RG-Web \
  --gateway-name agw-web --name lst-shop --frontend-port port-443 \
  --host-names shop.contoso.com --ssl-cert cert-contoso
az network application-gateway http-listener create --resource-group RG-Web \
  --gateway-name agw-web --name lst-wildcard --frontend-port port-443 \
  --host-names "*.contoso.com" --ssl-cert cert-contoso
```

> **Piège d'examen.** Deux sites sur la même adresse IP et le même port exigent des écouteurs **multisites**. Un écouteur de base accepte tous les noms d'hôte sur son adresse IP et son port, donc un écouteur de base placé en tête de priorité prend toutes les requêtes de ce port.

<!-- section: appgw-routing-rules | objectives: 3.2.7 -->
## Règles de routage des requêtes

Une règle relie **un écouteur** (chaque écouteur a une seule règle) à une cible de back-end et à des paramètres de back-end, ou à une redirection.

| Type de règle | Comportement |
| --- | --- |
| De base (Basic) | Toutes les requêtes de l'écouteur vont vers un pool principal avec un paramètre de back-end |
| Basée sur le chemin (Path-based) | Un mappage de chemins d'URL : des modèles de chemin, chacun avec son pool et son paramètre de back-end, plus un pool et un paramètre **par défaut** pour les requêtes qui ne correspondent à aucun chemin |
| Avancée (préversion) | Conditions sur des attributs de la requête HTTP |

Modèles de chemin :

- Ils commencent par `/` et peuvent finir par `*` : `/images/*` et `/images*` sont valides ; `/images/*.jpg`, `/*.jpg` et `/Repos/*/Comments/*` ne le sont pas.
- Insensibles à la casse ; seul le chemin est comparé, pas la chaîne de requête.
- Évalués **dans l'ordre de la liste** : placez les chemins les plus précis en premier et les chemins génériques en dernier.
- Le chemin d'origine complet est transmis ; utilisez **Override backend path** ou une réécriture d'URL si le back-end sert le contenu depuis un autre chemin.

La **redirection** remplace la cible de back-end : type **Permanent (301)**, **Found (302)**, **See other (303)** ou **Temporary (307)** ; cible un autre **écouteur** (HTTP vers HTTPS, avec éventuellement le chemin et la chaîne de requête) ou un **site externe** (la chaîne de requête peut être incluse, pas le chemin). Une redirection sur une règle de base est globale ; dans un mappage de chemins, elle s'applique à un seul chemin.

```bash
# Path-based rule
az network application-gateway url-path-map create --resource-group RG-Web \
  --gateway-name agw-web --name map-shop --paths "/images/*" --address-pool pool-img \
  --http-settings bs-http --default-address-pool pool-app --default-http-settings bs-http
az network application-gateway url-path-map rule create --resource-group RG-Web \
  --gateway-name agw-web --path-map-name map-shop --name video --paths "/video/*" \
  --address-pool pool-video --http-settings bs-http
az network application-gateway rule create --resource-group RG-Web --gateway-name agw-web \
  --name rule-shop --rule-type PathBasedRouting --http-listener lst-shop \
  --url-path-map map-shop --priority 100

# HTTP to HTTPS redirection
az network application-gateway redirect-config create --resource-group RG-Web \
  --gateway-name agw-web --name to-https --type Permanent \
  --target-listener lst-shop --include-path true --include-query-string true
az network application-gateway rule create --resource-group RG-Web --gateway-name agw-web \
  --name rule-shop-http --rule-type Basic --http-listener lst-shop-http \
  --redirect-config to-https --priority 110
```

> **Piège d'examen.** La priorité des règles ordonne les écouteurs, pas les chemins à l'intérieur d'un mappage. Une requête vers `/images/logo.png` avec `/*` listé avant `/images/*` va vers le pool de `/*`.

<!-- section: appgw-http-settings | objectives: 3.2.8 -->
## Paramètres HTTP de back-end

Les paramètres de back-end (**Paramètres de back-end** dans le portail, `backendHttpSettings` dans l'API) définissent la connexion de la passerelle vers les serveurs. Un même paramètre peut servir plusieurs règles.

| Paramètre | Valeurs et règles |
| --- | --- |
| Protocole et port | HTTP ou HTTPS, port 1 à 65535. HTTPS donne le TLS de bout en bout |
| Affinité basée sur les cookies | Cookie géré par la passerelle `ApplicationGatewayAffinity` (plus `ApplicationGatewayAffinityCORS` avec `SameSite=None; Secure`) ; renommez-le quand des passerelles sont chaînées |
| Drainage des connexions | 1 à 3 600 secondes ; les serveurs en cours de retrait ne reçoivent plus de nouvelles requêtes mais gardent les existantes (30 secondes par défaut quand il n'est pas activé) |
| Délai d'expiration de la requête | 20 secondes par défaut ; jusqu'à 86 400 secondes pour les back-ends privés, 240 secondes pour les back-ends externes |
| Override backend path | Préfixe ou remplace le chemin transmis |
| Sonde personnalisée | Une au plus par paramètre ; sinon la sonde par défaut |
| Nom d'hôte | **Pick host name from backend target** (FQDN du membre du pool) ou **remplacement du nom d'hôte** par un nom que vous indiquez |
| Certificat racine approuvé | Pour les back-ends HTTPS avec une autorité de certification privée ou un certificat auto-signé |
| Connexion de back-end dédiée | Une connexion de back-end par connexion client : nécessaire pour le passage de NTLM ou Kerberos ; incompatible avec HTTP/2 |

Le nom d'hôte détermine ce que reçoivent les back-ends multilocataires. App Service ne répond que sur ses propres noms d'hôte : activez **Pick host name from backend target** (et l'option équivalente de la sonde), ou mieux, associez un domaine personnalisé à l'App Service et conservez le nom d'hôte d'origine de bout en bout.

```bash
az network application-gateway http-settings create --resource-group RG-Web \
  --gateway-name agw-web --name bs-app --port 443 --protocol Https \
  --host-name-from-backend-pool true --cookie-based-affinity Disabled \
  --connection-draining-timeout 60 --timeout 30 --probe probe-app
```

> **Piège d'examen.** Les utilisateurs perdent leur session à chaque requête : activez l'affinité basée sur les cookies dans les paramètres de back-end, pas la persistance de session (un paramètre de Load Balancer). Si les clients n'acceptent pas les cookies, l'affinité ne peut pas fonctionner.

<!-- section: appgw-tls | objectives: 3.2.9 -->
## Transport Layer Security (TLS)

Depuis le **31 août 2025**, les clients et les back-ends doivent utiliser **TLS 1.2 ou supérieur**. Trois conceptions TLS :

| Conception | Configuration |
| --- | --- |
| Terminaison TLS | Écouteur HTTPS avec un certificat ; paramètres de back-end HTTP |
| TLS de bout en bout | Écouteur HTTPS plus paramètres de back-end HTTPS ; la passerelle rechiffre vers le serveur |
| Trafic non HTTP sur TLS | Écouteur TLS sur le proxy de couche 4, avec des paramètres de back-end TLS ou TCP |

**Certificats des écouteurs** : PFX avec la chaîne complète, 16 Ko au maximum en v2 ; son nom commun (CN) correspond au nom d'hôte que demandent les clients. Une référence Key Vault exige :

1. Une **identité managée affectée par l'utilisateur** sur la passerelle (une seule par passerelle).
2. L'accès au coffre pour cette identité : **Key Vault Secrets User** (modèle RBAC) ou **Get** sur les secrets (modèle de stratégie d'accès).
3. Le certificat de l'écouteur qui référence l'identificateur de secret **sans version**, pour que les versions renouvelées soient prises en compte (la passerelle interroge le coffre toutes les 4 heures, et à chaque modification de configuration).

Si le pare-feu du coffre est actif, ajoutez le sous-réseau de la passerelle (avec le point de terminaison de service `Microsoft.KeyVault`) et autorisez les services Microsoft approuvés, ou utilisez un point de terminaison privé avec la zone `privatelink.vaultcore.azure.net` liée au réseau virtuel de la passerelle. Les certificats protégés par HSM ne sont pas pris en charge ; la clé privée doit être exportable. Une référence Key Vault cassée désactive l'écouteur.

```bash
az network application-gateway identity assign --resource-group RG-Web \
  --gateway-name agw-web --identity id-agw-kv
az network application-gateway ssl-cert create --resource-group RG-Web \
  --gateway-name agw-web --name cert-contoso \
  --key-vault-secret-id https://kv-contoso.vault.azure.net/secrets/contoso-com/
```

**TLS de bout en bout en v2** : un certificat de back-end émis par une autorité de certification connue, dont le nom correspond au nom d'hôte des paramètres de back-end, ne demande rien de plus (App Service est approuvé). Un certificat auto-signé ou d'autorité privée exige le chargement de son **certificat racine approuvé** (.cer) dans les paramètres de back-end. La passerelle envoie le nom d'hôte du back-end comme SNI et le vérifie par rapport au certificat ; les paramètres `validateCertChainAndExpiry`, `validateSNI` et `sniName` permettent d'assouplir ces contrôles pour les tests.

**Stratégie TLS** (côté frontal uniquement en v2 ; les connexions vers le back-end négocient TLS 1.3, puis 1.2) :

| Stratégie | Minimum | Remarques |
| --- | --- | --- |
| `AppGwSslPolicy20220101` | TLS 1.2 | Prend en charge TLS 1.3 ; **par défaut** pour la version d'API 2023-02-01 et ultérieures |
| `AppGwSslPolicy20220101S` | TLS 1.2 | Liste de chiffrements plus stricte, TLS 1.3 |
| `AppGwSslPolicy20170401S` | TLS 1.2 | Chiffrements plus anciens quand ils sont exigés |
| `CustomV2` | TLS 1.2 ou 1.3 | Votre propre ordre de chiffrements, prise en charge de TLS 1.3 |

`AppGwSslPolicy20150501` et `AppGwSslPolicy20170401` (TLS 1.0 et 1.1) ne sont plus disponibles. Une stratégie s'applique à toute la passerelle ; un **profil SSL** donne à un écouteur sa propre stratégie.

**TLS mutuel** (Standard_v2 et WAF_v2) : dans un profil SSL, le mode **strict** exige un certificat client valide chaîné à un certificat d'autorité de certification cliente approuvée chargé sur la passerelle (racine plus intermédiaires, 25 Ko par fichier, 100 par profil, 200 par passerelle) ; le mode **passthrough** demande le certificat mais laisse le back-end le valider. Des variables de serveur comme `client_certificate` le transmettent au back-end.

```bash
az network application-gateway ssl-policy set --resource-group RG-Web \
  --gateway-name agw-web --policy-type Predefined --name AppGwSslPolicy20220101S
```

> **Piège d'examen.** Sans SNI (un client qui utilise l'adresse IP), la v2 renvoie le certificat de l'écouteur HTTPS dont la règle a la priorité la plus haute, pas celui d'un écouteur de base.

<!-- section: appgw-rewrite | objectives: 3.2.10 -->
## Ensembles de règles de réécriture

Les réécritures sont une fonctionnalité v2. Structure :

| Niveau | Contenu |
| --- | --- |
| Ensemble de réécriture | Associé à des règles de routage : avec une règle de base il s'applique à tout l'écouteur, avec une règle basée sur le chemin aux chemins choisis. Une règle a un seul ensemble de réécriture ; un ensemble peut servir plusieurs règles |
| Règle de réécriture | Exécutée selon la **séquence de règle** (la plus petite d'abord) |
| Condition (facultative) | En-tête de requête, en-tête de réponse ou variable de serveur comparé à un modèle (expression régulière RE2), option insensible à la casse, négation ; plusieurs conditions sont combinées par un ET |
| Action | Définir ou supprimer un en-tête de requête ou de réponse ; réécrire le chemin d'URL ou la chaîne de requête ; **réévaluer le mappage de chemins** pour router sur le chemin réécrit |

Les valeurs combinent du texte, des en-têtes (`{http_req_X-Forwarded-For}`, `{http_resp_Location}`), des variables de serveur (`{var_client_ip}`, `{var_host}`, `{var_uri_path}`) et des captures d'une condition (`{http_resp_Location_2}`).

| Exigence | Réécriture |
| --- | --- |
| Retirer le port de `X-Forwarded-For` | Définir l'en-tête de requête sur `{var_add_x_forwarded_for_proxy}` ou `{var_client_ip}` |
| Ajouter HSTS ou Content-Security-Policy à toutes les réponses | Définir des en-têtes de réponse, sans condition |
| Masquer `Server` ou `X-Powered-By` | Supprimer des en-têtes de réponse |
| Les redirections d'App Service exposent `azurewebsites.net` | Condition sur `Location` correspondant à `(https?):\/\/.*azurewebsites\.net(.*)$`, puis le définir sur `{http_resp_Location_1}://contoso.com{http_resp_Location_2}` |
| `/shop/item?id=5` doit atteindre le back-end sous la forme `/item/5` | Réécriture d'URL du chemin et de la chaîne de requête |

```bash
az network application-gateway rewrite-rule set create --resource-group RG-Web \
  --gateway-name agw-web --name rs-security
az network application-gateway rewrite-rule create --resource-group RG-Web \
  --gateway-name agw-web --rule-set-name rs-security --name add-hsts --sequence 100 \
  --response-headers Strict-Transport-Security="max-age=31536000"
az network application-gateway rewrite-rule condition create --resource-group RG-Web \
  --gateway-name agw-web --rule-set-name rs-security --rule-name add-hsts \
  --variable var_ssl_enabled --pattern "On" --ignore-case true
az network application-gateway rule update --resource-group RG-Web --gateway-name agw-web \
  --name rule-shop --rewrite-rule-set rs-security
```

Limites et exclusions : 400 ensembles de réécriture, 40 configurations d'en-tête ou d'URL et 40 conditions par ensemble. `Connection`, `Upgrade` et `X-Original-Host` ne peuvent pas être réécrits, et l'en-tête `Host` ne peut pas être supprimé. Les réécritures ne s'appliquent pas aux requêtes redirigées, aux pages d'erreur personnalisées ni aux réponses 4xx et 5xx générées par la passerelle elle-même.

> **Piège d'examen.** Une réécriture d'URL ne change pas le pool principal sauf si **réévaluer le mappage de chemins** (re-evaluate path map) est activé ; sinon, le mappage est comparé au chemin d'origine.

<!-- section: key-points -->
## Points clés

- Écouteur = adresse IP frontale + port + protocole (+ noms d'hôte pour le multisite, jusqu'à 5 avec caractères génériques).
- En v2, la priorité de règle de 1 à 20000 ordonne les écouteurs : sites précis d'abord, génériques et de base en dernier.
- Les règles de chemin sont évaluées dans l'ordre de la liste ; le pool par défaut reçoit le reste ; la redirection cible un écouteur ou un site externe.
- Paramètres de back-end : protocole, port, cookie d'affinité, drainage, délai d'expiration, nom d'hôte, certificat racine approuvé, sonde.
- TLS 1.2 minimum ; Key Vault exige une identité affectée par l'utilisateur et un identificateur de secret sans version ; `AppGwSslPolicy20220101` est la stratégie par défaut.
- Ensembles de réécriture : règles par séquence, conditions combinées par ET, actions sur les en-têtes et l'URL ; v2 uniquement.
