Azure Web Application Firewall (WAF) inspecte les requêtes HTTP et HTTPS en couche 7 et bloque les attaques web courantes comme l'injection SQL et le cross-site scripting avant qu'elles n'atteignent l'application. Le même modèle de stratégie WAF s'exécute sur Azure Front Door (global, en périphérie) et sur Azure Application Gateway (régional, dans un réseau virtuel), avec des différences que l'examen teste : niveaux, versions des ensembles de règles, modes et endroits où une stratégie peut être associée.

<!-- section: waf-capabilities | objectives: 5.3.1 -->
## Faire correspondre les exigences aux fonctionnalités du WAF

| Exigence | Fonctionnalité WAF |
| --- | --- |
| Protéger contre les principales attaques OWASP (injection SQL, XSS, LFI, RFI, injection de commandes, violations de protocole) sans modifier le code | Ensemble de règles managé : Default Rule Set (DRS) ou l'ensemble de règles principal OWASP (CRS) |
| Autoriser ou bloquer des plages d'IP clientes précises | Règle personnalisée avec une condition de correspondance IP |
| Autoriser ou bloquer des pays ou régions | Règle personnalisée avec l'opérateur `GeoMatch` |
| Limiter le nombre de requêtes qu'un client envoie sur une période | Règle personnalisée de limitation de débit |
| Bloquer des requêtes selon un en-tête, la chaîne de requête, l'URI, la méthode, un cookie, le contenu ou la taille du corps | Règle personnalisée de correspondance (correspondance de chaîne ou contrainte de taille) |
| Bloquer les bots malveillants, autoriser les moteurs de recherche vérifiés | Ensemble de règles Bot Manager (catégories malveillants, bons, inconnus) |
| Supprimer un faux positif sur un seul champ (par exemple un jeton d'authentification) | Liste d'exclusion (par règle, groupe de règles ou ensemble de règles) ou remplacement de règle |
| Rejeter les requêtes ou chargements trop volumineux | Limites de taille du corps de la requête et de chargement de fichiers |
| Observer avant de bloquer | Mode de détection, ou action Log sur une règle |

Les règles d'une stratégie suivent un seul modèle : les **règles personnalisées** d'abord, par ordre de priorité (le plus petit nombre d'abord ; la première correspondance applique son action et arrête le traitement des règles personnalisées), puis les **ensembles de règles managés**. Les actions sont **Allow**, **Block**, **Log** et, pour les règles managées, **Anomaly score** ; Front Door propose aussi **Redirect**, et les deux plateformes proposent une **question JavaScript** (JavaScript challenge) contre les bots (en préversion sur Application Gateway).

> **Piège d'examen.** Le WAF ne filtre que le HTTP(S). Filtrer SSH, SMB ou des ports TCP quelconques relève du Pare-feu Azure ou des NSG ; le DDoS volumétrique réseau relève d'Azure DDoS Protection. Les règles d'application du Pare-feu Azure n'inspectent pas les requêtes web entrantes : c'est le rôle du WAF.

<!-- section: waf-design | objectives: 5.3.2 -->
## Concevoir un déploiement de WAF

| Plateforme | Portée | Capacités WAF |
| --- | --- | --- |
| Azure Front Door **Premium** | Globale, dans les emplacements de périphérie Microsoft | Règles personnalisées, DRS managé, Bot Manager, limitation de débit, géofiltrage, question JavaScript |
| Azure Front Door **Standard** | Globale | **Règles personnalisées uniquement** (ni ensembles de règles managés, ni protection contre les bots) |
| Azure Application Gateway **WAF_v2** | Régionale, dans un réseau virtuel (front-end public ou privé) | Règles personnalisées, DRS ou CRS, Bot Manager, limitation de débit, stratégies par site et par URI |
| Azure Application Gateway pour conteneurs | Régionale, pour l'entrée Kubernetes | Prise en charge des stratégies WAF |

Règles de conception :

- Utilisateurs dans le monde entier, origines multirégions, ou attaques à arrêter près de leur source : **WAF sur Front Door Premium**.
- Application régionale, applications internes (privées) ou protection propre à un chemin dans un site : **Application Gateway WAF_v2**.
- Les deux peuvent se superposer (Front Door en périphérie, Application Gateway dans la région). Verrouillez le point d'entrée régional pour qu'il n'accepte que le trafic de Front Door (étiquette de service `AzureFrontDoor.Backend` et en-tête `X-Azure-FDID`).
- Application Gateway **v1** (Standard et WAF) a été mis hors service le **28 avril 2026** : les nouvelles conceptions utilisent v2, et les stratégies WAF ne peuvent être associées qu'à **WAF_v2**. **Azure Front Door (classique)** est mis hors service le **31 mars 2027**.
- Une stratégie WAF est une ressource distincte : stratégies **Global WAF (Front Door)** pour Front Door, **Regional WAF (Application Gateway)** pour Application Gateway. Une stratégie d'un type ne peut pas être attachée à l'autre plateforme.

Limites qui orientent une conception sur Application Gateway WAF_v2 avec CRS 3.2 ou DRS : jusqu'à 100 sites (écouteurs), 100 règles personnalisées par stratégie, 200 exclusions, inspection du corps de la requête jusqu'à 2 Mo, chargements de fichiers jusqu'à 4 Go (limite par défaut 100 Mo). Avec CRS 3.1 ou antérieur, la limite du corps de la requête est de 128 Ko, les chargements de fichiers sont plafonnés à 750 Mo, et le nombre de sites comme celui des exclusions tombe à 40.

> **Conseil d'examen.** « Ensembles de règles managés sur Front Door » signifie **Premium**. Un profil Front Door Standard soumis à une exigence de protection OWASP doit être mis à niveau vers Premium (sur place), ou la protection doit être placée sur Application Gateway.

<!-- section: waf-modes | objectives: 5.3.3 -->
## Configurer le mode de détection ou de prévention

| Mode | Comportement |
| --- | --- |
| Détection | Les correspondances sont journalisées (journaux WAF via les paramètres de diagnostic), rien n'est bloqué. Mode par défaut d'une nouvelle stratégie créée dans le portail |
| Prévention | Les requêtes correspondantes subissent l'action de la règle (blocage, redirection...) et sont journalisées. Les requêtes bloquées reçoivent **403** par défaut |

Les règles managées utilisent le **scoring d'anomalie** (CRS 3.x, DRS sur Application Gateway, DRS 2.0 et ultérieur sur Front Door). Chaque règle correspondante ajoute au score de la requête selon sa gravité, et la requête n'est traitée que lorsque le total atteint le **seuil de 5** :

| Gravité | Score |
| --- | --- |
| Critical | 5 |
| Error | 4 |
| Warning | 3 |
| Notice | 2 |

Une seule correspondance Critical bloque une requête en mode de prévention ; une seule correspondance Warning, non. Dans les journaux, les correspondances individuelles apparaissent comme **Matched** ; la décision finale apparaît comme **Blocked** (prévention) ou **Detected** (détection). Sur Front Door, l'action du score d'anomalie (Block, Log ou Redirect) se choisit pour l'ensemble de règles managé. Les règles personnalisées n'utilisent pas le scoring : leur action s'applique directement.

Déploiement recommandé : démarrer en **Détection**, envoyer les journaux WAF vers Log Analytics, ajuster les exclusions et les règles personnalisées pour les faux positifs, puis passer en **Prévention**. Pour évaluer une seule nouvelle règle tout en restant en prévention, réglez l'action de cette règle sur **Log**.

```bash
az network application-gateway waf-policy policy-setting update \
  --resource-group RG-Web --policy-name WAFP-Shop \
  --mode Prevention --state Enabled
```

> **Piège d'examen.** Un WAF en mode de détection qui « ne bloque pas une injection SQL évidente » fonctionne comme prévu : passez en mode de prévention. Désactiver la règle ou ajouter une règle personnalisée n'est pas la réponse.

<!-- section: waf-front-door-rules | objectives: 5.3.4 -->
## Configurer les ensembles de règles du WAF sur Azure Front Door

**Ensembles de règles managés (Premium) :**

- **Default Rule Set (DRS)** : `Microsoft_DefaultRuleSet` 2.0 et ultérieur utilisent le scoring d'anomalie ; DRS 2.1 (fondé sur OWASP CRS 3.3.2) et DRS 2.2 (CRS 3.3.4) ajoutent des règles Microsoft Threat Intelligence. DRS 2.2 fonctionne par défaut au niveau de paranoïa 1 (règles PL2 désactivées). Les versions antérieures (1.x) bloquent à chaque correspondance. Changer de version réinitialise les personnalisations des règles : réappliquez remplacements et exclusions.
- Ensemble de règles **Bot Manager** (1.0, 1.1) : par défaut, les bots malveillants sont bloqués, les bons bots autorisés et les bots inconnus journalisés ; les actions se modifient par catégorie (block, allow, log, redirect, question JavaScript).
- Par règle ou groupe de règles managé : activer, désactiver, changer l'action ; **exclusions** sur les noms d'en-tête, de cookie, d'argument de chaîne de requête ou de champ du corps, au niveau de la règle, du groupe de règles ou de l'ensemble de règles.

**Règles personnalisées (Standard et Premium) :**

| Élément | Options |
| --- | --- |
| Type de règle | **Correspondance** (Match) ou **Limitation de débit** (Rate limit) |
| Variables de correspondance | `RemoteAddr` (IP d'origine du client, généralement issue de `X-Forwarded-For`), `SocketAddr` (IP qui se connecte à la périphérie, par exemple un proxy), `RequestMethod`, `QueryString`, `PostArgs`, `RequestUri`, `RequestHeader`, `RequestBody`, `Cookies` |
| Opérateurs | `IPMatch`, `GeoMatch`, `Equal`, `Contains`, `BeginsWith`, `EndsWith`, `Regex`, comparaisons de taille, avec négation et transformations facultatives |
| Actions | Allow, Block, Log, Redirect, question JavaScript (Premium) |
| Limitation de débit | Seuil par **1 ou 5 minutes**, regroupé par IP de socket (par défaut) et, en Premium, par pays/région, numéro AS ou empreinte JA4 |

Géofiltrage : incluez le code **ZZ** (pays/région inconnu) pour éviter les faux positifs sur les adresses non cartographiées, et combinez `GeoMatch` avec une condition `RequestUri` pour des règles géographiques propres à un chemin. Les compteurs de limitation de débit sont tenus **par emplacement de périphérie** : dimensionnez les seuils sur le trafic qu'un seul emplacement reçoit.

Paramètres de stratégie : **mode**, **état**, **URL de redirection** (obligatoire si une règle utilise Redirect), **code d'état et corps de réponse personnalisés en cas de blocage** (403 par défaut), inspection du corps de la requête.

> **Piège d'examen.** Les utilisateurs derrière un proxy d'entreprise partagent tous le même `SocketAddr`. Pour bloquer ou limiter un client selon sa véritable adresse quand le trafic passe par un proxy, utilisez `RemoteAddr` ; pour bloquer le proxy lui-même, utilisez `SocketAddr`.

<!-- section: waf-appgw-rules | objectives: 5.3.5 -->
## Configurer les ensembles de règles du WAF sur Application Gateway

**Ensembles de règles managés :**

| Ensemble de règles | Remarques |
| --- | --- |
| DRS 2.2 | Recommandé pour les nouvelles stratégies ; fondé sur CRS 3.3.4 plus des règles Microsoft Threat Intelligence ; niveau de paranoïa 1 par défaut |
| DRS 2.1 | Fondé sur CRS 3.3.2 ; toujours pris en charge, mise à niveau recommandée |
| CRS 3.2 | Nouveau moteur WAF (meilleures performances, limites plus élevées, exclusions par règle, limitation de débit) ; impossible de revenir à 3.1 |
| CRS 3.1, 3.0 | Ancien moteur ; nouvelles fonctionnalités indisponibles |
| Bot Manager 0.1, 1.0, 1.1 | Utilisé en complément d'un seul ensemble de règles OWASP/DRS |

Un seul ensemble de règles OWASP ou DRS est actif à la fois. Les niveaux de paranoïa 3 et 4 ne sont pas pris en charge.

**Règles personnalisées :** règles de correspondance avec des variables (`RemoteAddr`, `RequestMethod`, `QueryString`, `PostArgs`, `RequestUri`, `RequestHeaders`, `RequestBody`, `RequestCookies`), des opérateurs (`IPMatch` avec `RemoteAddr`, `GeoMatch`, `Equal`, `Contains`, `BeginsWith`, `EndsWith`, `Regex`, opérateurs de taille) et les actions Allow, Block, Log. Jusqu'à 100 règles personnalisées par stratégie.

**Limitation de débit** (exige le nouveau moteur, sélectionnez CRS 3.2 ou ultérieur) : un seuil de requêtes par fenêtre de temps, une condition de correspondance et une variable de **regroupement** : `ClientAddr` (par défaut), `GeoLocation`, `None` (tout le trafic correspondant partage un seul compteur) ou les variantes `X-Forwarded-For`. Elle utilise une fenêtre glissante, et les compteurs sont tenus séparément pour chaque association (passerelle ou écouteur).

Les **exclusions** retirent un attribut de la requête de l'évaluation : variable de correspondance (`RequestHeaderKeys`, `RequestHeaderValues`, `RequestCookieKeys`, `RequestCookieValues`, `RequestArgKeys`, `RequestArgValues` ; les anciennes variables `...Names` restent pour la compatibilité), opérateur (`Equals`, `StartsWith`, `EndsWith`, `Contains`, `EqualsAny`) et sélecteur, appliquées globalement ou à des règles précises (étendue par règle avec CRS 3.2 ou ultérieur).

**Paramètres de taille des requêtes** (paramètres de stratégie, CRS 3.2 ou ultérieur) : **vérification du corps de la requête** (inspection activée ou non), **limite d'inspection maximale du corps de la requête**, **application de la limite du corps de la requête** et **taille maximale du corps de la requête (Ko)**, **application de la limite de chargement de fichiers** et **limite de chargement de fichiers (Mo)**. Seul un contenu `multipart/form-data` avec un nom de fichier compte comme chargement de fichier. Une règle personnalisée de haute priorité sur les en-têtes, les cookies ou l'URI est évaluée avant les limites de taille.

> **Piège d'examen.** « Autoriser le chargement de fichiers de 500 Mo à travers le WAF » se résout en augmentant la **limite de chargement de fichiers** (WAF_v2 avec CRS 3.2 ou DRS accepte jusqu'à 4 Go), pas en désactivant l'inspection du corps de la requête ni en passant en mode de détection.

<!-- section: waf-policy | objectives: 5.3.6 -->
## Implémenter une stratégie WAF

Une stratégie WAF contient : les **paramètres de stratégie** (état, mode, limites de taille, réponse de blocage personnalisée), les **règles personnalisées**, les **règles managées** (ensembles de règles, remplacements, exclusions). Ordre d'implémentation :

1. Créer la stratégie (portail : **Créer une ressource > Web Application Firewall (WAF)**), en choisissant **Stratégie pour** : Global WAF (Front Door) ou Regional WAF (Application Gateway) ; pour Front Door, choisir aussi le niveau (Classique, Standard ou Premium) du profil qu'elle protégera.
2. Sélectionner les ensembles de règles managés et leurs versions (Front Door Premium ou Application Gateway).
3. Ajouter les règles personnalisées (listes d'IP autorisées, géographie, limitation de débit) avec leurs priorités.
4. Régler le mode sur Détection, associer la stratégie, collecter les journaux, ajouter les exclusions.
5. Passer en Prévention.

```bash
az network application-gateway waf-policy create \
  --resource-group RG-Web --name WAFP-Shop \
  --type Microsoft_DefaultRuleSet --version 2.1

az network application-gateway waf-policy policy-setting update \
  --resource-group RG-Web --policy-name WAFP-Shop \
  --mode Detection --state Enabled \
  --request-body-check true --file-upload-limit-in-mb 500
```

Une ancienne passerelle Application Gateway dont les paramètres WAF résident dans sa propre **configuration WAF** doit être migrée vers une stratégie WAF pour bénéficier des fonctionnalités récentes (migration dans le portail ou PowerShell). Firewall Manager peut aussi lister et associer les stratégies WAF de façon centralisée.

> **Conseil d'examen.** Les valeurs CLI de `--type` sont `Microsoft_DefaultRuleSet`, `OWASP`, `Microsoft_BotManagerRuleSet` et `Microsoft_HTTPDDoSRuleSet` : une question qui demande « CRS 3.2 » attend `OWASP` avec la version `3.2`, une question qui demande « DRS » attend `Microsoft_DefaultRuleSet`.

<!-- section: waf-association | objectives: 5.3.7 -->
## Associer une stratégie WAF

**Application Gateway WAF_v2** (onglet **Association** de la stratégie : Application Gateway, Écouteur HTTP ou Chemin d'itinéraire) :

| Association | S'applique à | À utiliser pour |
| --- | --- | --- |
| Passerelle d'application (niveau global) | Chaque écouteur et chemin sans stratégie plus spécifique | Socle commun |
| Écouteur HTTP (niveau par site) | Un site (nom d'hôte) | Exclusions ou règles différentes par site |
| Règle basée sur le chemin (niveau par URI) | Un chemin d'un mappage de chemins d'URL | Règles plus strictes sur `/payments` ou `/login` |

La stratégie **la plus spécifique** l'emporte : celle par URI prime sur celle par site, qui prime sur la stratégie globale. Associer une nouvelle stratégie là où il en existe déjà une la **remplace**.

```bash
az network application-gateway http-listener update \
  --resource-group RG-Web --gateway-name AGW-Shop \
  --name lst-adatum --waf-policy WAFP-Adatum
```

**Azure Front Door** : associez une stratégie à des **domaines** précis (Standard ou Premium). Les paramètres de stratégie de Premium documentent aussi le **profil** et des **itinéraires** (routes) précis comme étendues : quand plusieurs étendues s'appliquent, l'**itinéraire** l'emporte sur le **domaine**, qui l'emporte sur le **profil**. Un domaine ne peut être associé qu'à une seule stratégie à la fois : retirez-le de l'association existante avant de l'ajouter à une autre stratégie. La stratégie est répliquée dans tous les emplacements de périphérie.

> **Piège d'examen.** Sur Application Gateway, une stratégie par site exige un **écouteur** multisite par site ; une stratégie par URI exige une règle de routage **basée sur le chemin**. Une règle de base sans mappage de chemins d'URL ne peut pas recevoir de stratégie par URI.

<!-- section: key-points -->
## Points clés

- Front Door Premium : DRS managé, Bot Manager et règles personnalisées ; Front Door Standard : règles personnalisées uniquement ; Application Gateway : WAF_v2 uniquement (v1 mis hors service le 28 avril 2026).
- Les règles personnalisées s'exécutent d'abord, par priorité ; les règles managées utilisent le scoring d'anomalie avec un seuil de 5 (Critical 5, Error 4, Warning 3, Notice 2).
- La détection journalise, la prévention agit (403 par défaut) ; les nouvelles stratégies démarrent en détection : ajustez, puis basculez.
- Application Gateway : DRS 2.2 recommandé, CRS 3.2 et ultérieur utilisent le nouveau moteur (inspection du corps jusqu'à 2 Mo, chargements jusqu'à 4 Go, exclusions par règle, limitation de débit), sans retour arrière.
- Front Door : `RemoteAddr` est le client d'origine, `SocketAddr` l'IP qui se connecte ; ajoutez `ZZ` aux règles géographiques ; la limitation de débit compte par emplacement de périphérie sur 1 ou 5 minutes.
- Association : Application Gateway global, par site (écouteur), par URI (règle de chemin), la plus spécifique l'emporte ; Front Door domaines, plus profil et itinéraires en Premium, l'itinéraire l'emporte.
