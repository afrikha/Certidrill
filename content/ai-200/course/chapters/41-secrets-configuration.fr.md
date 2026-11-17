Un back-end IA a besoin de deux sortes de paramètres externes : des secrets (clés API, chaînes de connexion, mots de passe) et de la configuration ordinaire (points de terminaison, noms de déploiements de modèles, seuils, indicateurs de fonctionnalités). Azure Key Vault conserve les premiers, Azure App Configuration la seconde, et le code atteint les deux avec une identité managée et `DefaultAzureCredential`, jamais avec des informations d'identification écrites dans le code. Les questions d'examen donnent une contrainte (aucun secret dans le code, rotation sans redéploiement, un paramètre partagé par plusieurs applications, changer une valeur sans redémarrage) et demandent le service, l'appel SDK ou le paramètre.

<!-- section: choose-store | objectives: 4.1.1, 4.1.2 -->
## Key Vault, App Configuration ou paramètres d'application

| Exigence | Réponse |
| --- | --- |
| Stocker une clé API, un mot de passe ou une chaîne de connexion | Secret Key Vault |
| Stocker une clé de chiffrement utilisée pour des opérations wrap, sign ou encrypt | Clé Key Vault |
| Stocker un certificat TLS et le renouveler automatiquement | Certificat Key Vault |
| Partager des paramètres non secrets entre plusieurs applications et environnements | Clés-valeurs App Configuration avec étiquettes |
| Activer ou désactiver une fonctionnalité à l'exécution sans redéployer | Indicateur de fonctionnalité App Configuration |
| Un paramètre propre à une application App Service ou à un emplacement de déploiement | Paramètre d'application App Service (variable d'environnement) |
| Un paramètre non secret qui doit aussi pointer vers un secret | Référence Key Vault dans App Configuration |
| N'enregistrer aucune information d'identification | Identité managée avec authentification Microsoft Entra auprès du service cible |

App Configuration chiffre ses données, mais Microsoft indique que Key Vault reste le meilleur endroit pour les secrets : chiffrement matériel, accès granulaire et opérations de gestion comme la rotation. Les deux services s'utilisent côte à côte.

> **Piège d'examen.** Si le service cible accepte l'authentification Microsoft Entra (Azure OpenAI dans Foundry, Stockage, Cosmos DB, Service Bus), la meilleure réponse est une identité managée avec un rôle de plan de données, pas une clé stockée dans Key Vault. Key Vault est la réponse quand un secret doit exister.

<!-- section: key-vault-access | objectives: 4.1.1 -->
## Accès à Key Vault : modèle d'autorisation et rôles

Un coffre autorise les opérations du plan de données avec l'un de deux modèles d'autorisation : **Azure RBAC** ou les **stratégies d'accès au coffre**. À partir de la version d'API 2026-02-01, Azure RBAC est le modèle par défaut des nouveaux coffres. Passer un coffre existant à RBAC invalide toutes les stratégies d'accès : attribuez d'abord les rôles équivalents. Microsoft recommande un coffre par application et par environnement, avec des rôles attribués à l'étendue du coffre.

| Rôle (modèle Azure RBAC) | Ce qu'il permet |
| --- | --- |
| Key Vault Secrets User | Lire le contenu des secrets. Le rôle d'une application qui ne fait que lire |
| Key Vault Secrets Officer | Toute action sur les secrets sauf la gestion des autorisations (créer, supprimer, modifier les propriétés) |
| Key Vault Reader | Lire les métadonnées du coffre et de ses objets, **pas** les valeurs des secrets |
| Key Vault Crypto Officer | Toute action sur les clés, y compris la stratégie de rotation |
| Key Vault Administrator | Toutes les opérations du plan de données sur les clés, secrets et certificats |
| Key Vault Purge Operator | Supprimer définitivement les coffres supprimés de manière réversible |
| Key Vault Contributor | Gérer la ressource coffre (plan de contrôle). Aucun accès aux secrets |

Avec les stratégies d'accès, l'équivalent de Key Vault Secrets User est l'autorisation **Get** sur les secrets (ajoutez **List** pour les énumérer). Les attributions de rôles prennent plusieurs minutes à s'appliquer.

> **Piège d'examen.** Key Vault Reader et Key Vault Contributor ne peuvent pas lire la valeur d'un secret. L'identité de l'application a besoin de Key Vault Secrets User (ou de Get sur les secrets). Key Vault Contributor peut toutefois s'accorder l'accès par une stratégie d'accès sur un coffre qui utilise ce modèle.

<!-- section: retrieve-secrets | objectives: 4.1.1 -->
## Récupérer des secrets dans le code

Installez `azure-identity` et `azure-keyvault-secrets`. `DefaultAzureCredential` utilise l'identité managée dans Azure et, en local, les informations d'identification Azure CLI ou d'environnement du développeur : le même code s'exécute partout.

```text
import os
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.core.exceptions import ResourceNotFoundError

client = SecretClient(
    vault_url=os.environ["VAULT_URL"],  # https://kv-contoso-prod.vault.azure.net
    credential=DefaultAzureCredential(),
)

secret = client.get_secret("openai-api-key")              # latest version
print(secret.properties.version)
pinned = client.get_secret("openai-api-key", version="ec96f02080254f109c51a1f14cdb1931")

for props in client.list_properties_of_secrets():          # names and attributes, no values
    print(props.name, props.expires_on)

try:
    client.get_secret("missing-secret")
except ResourceNotFoundError as e:
    print(e.message)
```

| Méthode | Comportement |
| --- | --- |
| `get_secret(name)` | Dernière version. Passez `version=` pour en lire une précise |
| `set_secret(name, value, expires_on=..., content_type=..., tags=...)` | Crée le secret, ou une **nouvelle version** si le nom existe |
| `update_secret_properties(name, enabled=False)` | Modifie uniquement les attributs, jamais la valeur |
| `list_properties_of_secrets()` / `list_properties_of_secret_versions(name)` | Propriétés uniquement, **aucune valeur** |
| `begin_delete_secret(name)` | Opération de longue durée (poller) ; supprime toutes les versions |
| `begin_recover_deleted_secret(name)` / `purge_deleted_secret(name)` | Récupérer ou supprimer définitivement un secret supprimé de manière réversible |

Le client asynchrone se trouve dans `azure.keyvault.secrets.aio` (avec `azure.identity.aio`) et nécessite un transport asynchrone comme `aiohttp`.

**Limitation (throttling).** Un coffre accepte 4 000 transactions « autres » (dont les lectures de secrets) par tranche de 10 secondes et par région ; une limite à l'échelle de l'abonnement vaut cinq fois la limite d'un coffre. Au-delà, Key Vault renvoie **HTTP 429**. Recommandations de Microsoft : mettre les secrets en cache **en mémoire** et ne les relire que lorsque la valeur en cache ne fonctionne plus (par exemple après une rotation), réessayer les réponses 429 avec une temporisation exponentielle, et ne jamais lire le coffre à chaque requête.

La plateforme d'hébergement peut aussi résoudre les secrets à votre place : le code se contente de lire une variable d'environnement.

| Plateforme | Syntaxe | Actualisation d'une référence sans version |
| --- | --- | --- |
| App Service, Azure Functions | Paramètre d'application `@Microsoft.KeyVault(SecretUri=https://kv1.vault.azure.net/secrets/db-password)` ou `@Microsoft.KeyVault(VaultName=kv1;SecretName=db-password)` | Sous 24 heures ; toute modification de configuration redémarre l'application et récupère aussitôt les valeurs |
| Azure Container Apps | Secret `keyvaultref:<secret URL>,identityref:<identity resource ID or system>`, puis une variable d'environnement qui référence le secret | Sous 30 minutes ; les révisions actives qui l'utilisent sont redémarrées |

Les deux utilisent l'identité managée de l'application (App Service : affectée par le système par défaut, ou l'identité définie dans `keyVaultReferenceIdentity`), qui a besoin de Key Vault Secrets User. Un URI qui inclut une version épingle cette version, qui ne suit alors jamais la rotation.

> **Piège d'examen.** Quand une référence Key Vault d'App Service ne peut pas être résolue (rôle manquant, secret supprimé, erreur de syntaxe), l'application reçoit comme valeur la chaîne littérale `@Microsoft.KeyVault(...)`, et non une erreur au démarrage. Vérifiez l'état de la référence dans les paramètres d'application ou avec le détecteur Key Vault Application Settings Diagnostics.

<!-- section: rotate-secrets | objectives: 4.1.1 -->
## Rotation des secrets

Faire une rotation, c'est écrire une nouvelle **version** sous le même nom de secret. Le code qui lit la dernière version (aucune version dans l'appel ni dans la référence) la récupère ; le code épinglé sur une version, non.

| Objet | Rotation automatique |
| --- | --- |
| Clé | Stratégie de rotation : action `Rotate` après `timeAfterCreate` ou avant l'expiration, action `Notify` avant l'expiration, sept jours minimum. Nécessite Key Vault Crypto Officer |
| Certificat | Renouvellement automatique à un pourcentage de la durée de vie ou à un nombre de jours avant l'expiration |
| Secret | Pas de stratégie de rotation : un événement **Event Grid** déclenche une fonction **Azure Functions** qui crée la nouvelle information d'identification et appelle `set_secret` |

Key Vault publie ces événements de secrets dans Event Grid (un abonnement sur le coffre est nécessaire) :

| Type d'événement | Déclenché quand |
| --- | --- |
| `Microsoft.KeyVault.SecretNearExpiry` | La version actuelle expire dans 30 jours |
| `Microsoft.KeyVault.SecretExpired` | La version actuelle a expiré |
| `Microsoft.KeyVault.SecretNewVersionCreated` | Une nouvelle version a été écrite (utile pour actualiser les caches) |

Les événements de proximité d'expiration et d'expiration reposent sur la date d'expiration du secret : définissez-en une à l'écriture.

```bash
az keyvault secret set --vault-name kv-contoso-prod --name storageKey \
  --value "<key1 value>" --expires "2026-12-31T00:00:00Z" \
  --tags CredentialId=key1 ValidityPeriodDays=60
```

Deux modèles de rotation :

- **Information d'identification unique** (un mot de passe de base de données) : la fonction génère un nouveau mot de passe, met à jour la base, puis écrit la nouvelle version. Pendant une courte fenêtre, les clients qui détiennent l'ancienne valeur échouent et doivent relire le secret.
- **Double information d'identification** (services à deux clés, comme `key1`/`key2` d'un compte de stockage) : chaque nouvelle version stocke l'**autre** clé après l'avoir régénérée. Les clients gardent une clé valide pendant un cycle de rotation complet : aucune interruption.

> **Conseil d'examen.** « Faire tourner un secret automatiquement 30 jours avant son expiration » = une date d'expiration sur le secret + un abonnement Event Grid à `SecretNearExpiry` + une fonction. « Faire tourner une clé tous les 90 jours » = une stratégie de rotation de clé, sans code.

**Suppression réversible et protection contre le vidage.** La suppression réversible est active sur tout nouveau coffre et ne peut pas être désactivée. La rétention va de 7 à 90 jours (90 par défaut) et se définit uniquement à la création. Un secret supprimé peut seulement être listé, récupéré ou vidé ; créer un secret du même nom échoue avec un conflit tant qu'il n'est ni récupéré ni vidé. La **protection contre le vidage** (désactivée par défaut) empêche le vidage avant la fin de la période de rétention. Vider nécessite l'autorisation purge.

<!-- section: app-configuration-store | objectives: 4.1.2 -->
## App Configuration : clés-valeurs, étiquettes et niveaux

Un magasin contient des **clés-valeurs**. Les clés respectent la casse, acceptent tout caractère Unicode sauf `%` et sont généralement hiérarchiques avec `:` ou `/` (`Rag:Search:TopK`). Une clé-valeur, attributs compris, est limitée à 10 Ko. Une **étiquette** crée une variante de la même clé : une par environnement (`Dev`, `Prod`) ou par version de build. Une clé-valeur sans étiquette a l'étiquette nulle, écrite `\0` dans les filtres. Le **type de contenu** facultatif signale les valeurs JSON (`application/json`), les indicateurs de fonctionnalités et les références Key Vault. App Configuration conserve aussi l'historique des modifications de chaque clé-valeur et prend en charge les **instantanés** (un ensemble immuable de clés-valeurs).

```bash
az appconfig kv set -n appcs-contoso --key Rag:Search:TopK --value 5 --label Prod
az appconfig kv set -n appcs-contoso --key Rag:Prompts --value '{"tone":"formal"}' --content-type application/json
az appconfig kv set-keyvault -n appcs-contoso --key Rag:OpenAiKey --label Prod \
  --secret-identifier https://kv-contoso-prod.vault.azure.net/secrets/openai-api-key
az appconfig kv import -n appcs-contoso -s file --path ./settings.json --format json --separator :
az appconfig kv list -n appcs-contoso --key "Rag:*" --label Prod --auth-mode login
```

Le CLI utilise `--auth-mode key` par défaut ; `login` utilise votre connexion Microsoft Entra.

| Niveau | Stockage | Quota de requêtes | SLA | Historique des révisions | Géoréplication |
| --- | --- | --- | --- | --- | --- |
| Free | 10 Mo | 1 000 requêtes par jour | Aucun | 7 jours | Non |
| Developer | 500 Mo | 6 000 requêtes par heure | Aucun | 7 jours | Non |
| Standard | 1 Go | 30 000 requêtes par heure | 99,9 % (99,95 % avec géoréplication) | 30 jours | Oui |
| Premium | 4 Go | Pas de quota | 99,9 % (99,99 % avec géoréplication) | 30 jours | Oui |

Rôles du plan de données : **App Configuration Data Reader** (lire les clés-valeurs) et **App Configuration Data Owner** (lire, écrire, supprimer). Ils ne donnent pas accès à la ressource elle-même. Comptez jusqu'à 15 minutes pour qu'une nouvelle attribution s'applique. Owner et Contributor n'ont pas d'accès direct aux données par Microsoft Entra ID, mais ils peuvent lire les clés d'accès : désactivez l'authentification par clé d'accès (imposée par Azure Policy) pour fermer cette voie.

> **Piège d'examen.** Une référence Key Vault dans App Configuration stocke uniquement l'URI du secret. App Configuration ne lit jamais le coffre : c'est l'**application** qui lit le secret, donc son identité a besoin d'App Configuration Data Reader sur le magasin **et** de Key Vault Secrets User sur le coffre.

<!-- section: app-configuration-python | objectives: 4.1.2 -->
## Charger la configuration en Python

Le package de fournisseur de configuration `azure-appconfiguration-provider` charge le magasin dans un objet de type dictionnaire (`azure-appconfiguration` est le client de plus bas niveau pour les clés-valeurs individuelles).

```text
import os
from azure.identity import DefaultAzureCredential
from azure.appconfiguration.provider import load, SettingSelector, WatchKey
from featuremanagement import FeatureManager

credential = DefaultAzureCredential()

config = load(
    endpoint=os.environ["AZURE_APPCONFIG_ENDPOINT"],   # https://appcs-contoso.azconfig.io
    credential=credential,
    selects=[
        SettingSelector(key_filter="Rag:*", label_filter="\0"),   # defaults
        SettingSelector(key_filter="Rag:*", label_filter="Prod"), # overrides: last selector wins
    ],
    trim_prefixes=["Rag:"],
    keyvault_credential=credential,          # resolves Key Vault references
    refresh_on=[WatchKey("Sentinel")],       # reload everything when Sentinel changes
    refresh_interval=60,                     # seconds; default 30
    feature_flag_enabled=True,               # feature flags aren't loaded by default
)

top_k = int(config["Search:TopK"])
features = FeatureManager(config)

def handle_request():
    config.refresh()                         # no-op until the interval has elapsed
    if features.is_enabled("SemanticRanker"):
        ...
```

| Option | Comportement à connaître |
| --- | --- |
| Pas de `selects` | Charge toutes les clés-valeurs **sans étiquette** |
| Plusieurs sélecteurs | Chargés dans l'ordre ; pour une même clé, le **dernier** sélecteur l'emporte |
| `trim_prefixes` | Retire le préfixe des clés exposées à l'application |
| Type de contenu JSON | La valeur est désérialisée : `config["Prompts"]["tone"]` |
| `keyvault_credential` / `keyvault_client_configs` / `secret_resolver` | Trois façons de résoudre les références Key Vault ; `secret_refresh_interval` relit les secrets |
| `refresh_on=[WatchKey(...)]` | Surveille uniquement ces clés ; un changement recharge **toutes** les valeurs d'un coup. Met `refresh_enabled` à `True` |
| `refresh()` | Doit être appelée par l'application (par exemple à chaque requête) ; retourne immédiatement avant la fin de l'intervalle |
| `feature_flag_enabled` | `False` par défaut ; `feature_flag_refresh_enabled` surveille les indicateurs séparément |
| `SettingSelector(snapshot_name=...)` | Charge un instantané ; non combinable avec les filtres de clé, d'étiquette ou de balise |
| `startup_timeout` | 100 secondes par défaut ; la découverte des réplicas est active par défaut |

Le modèle de **clé sentinelle** : modifiez toutes les clés nécessaires, puis mettez à jour `Sentinel` en dernier. L'application ne surveille que cette clé : elle recharge un ensemble cohérent et envoie moins de requêtes qu'en surveillant toutes les clés.

> **Piège d'examen.** Modifier une clé-valeur ne change pas une application en cours d'exécution tant qu'elle n'appelle pas `refresh()` après l'intervalle d'actualisation et, avec `refresh_on`, tant que la clé sentinelle surveillée ne change pas. Aucun redémarrage ni redéploiement n'est nécessaire.

<!-- section: key-points -->
## Points clés

- Les secrets vont dans Key Vault, les paramètres partagés non secrets et les indicateurs de fonctionnalités dans App Configuration ; préférez une identité managée à toute information d'identification stockée.
- L'identité qui lit a besoin de Key Vault Secrets User ; Key Vault Reader et Contributor ne lisent pas les valeurs.
- `get_secret(name)` renvoie la dernière version ; `set_secret` ajoute une version ; les listes ne renvoient jamais de valeurs.
- Mettez les secrets en cache en mémoire et temporisez sur HTTP 429.
- Les références sans version suivent la rotation : App Service sous 24 heures, Container Apps sous 30 minutes.
- Rotation d'un secret = date d'expiration + `SecretNearExpiry` (30 jours avant) + Event Grid + fonction ; les clés ont des stratégies de rotation.
- App Configuration : étiquettes pour les environnements, le dernier sélecteur l'emporte, clé sentinelle plus `refresh()` pour la configuration dynamique, l'application résout elle-même les références Key Vault.
