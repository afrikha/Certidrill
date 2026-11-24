Sécuriser un compte Azure Cosmos DB for NoSQL, c'est décider comment les clients prouvent leur identité (clés ou Microsoft Entra ID), ce que chaque identité peut faire sur le plan de contrôle et sur le plan de données, quels réseaux peuvent joindre le compte et quels utilisateurs voient les valeurs sensibles en clair. Les questions d'examen reposent sur la différence entre Azure RBAC et le RBAC natif du plan de données de Cosmos DB, et sur l'effet exact de chaque paramètre réseau.

<!-- section: authentication | objectives: 2.1.1 -->
## Mécanismes d'authentification

| Mécanisme | Ce que c'est | À utiliser quand |
| --- | --- | --- |
| Clés de compte | Clés primaire et secondaire en lecture-écriture, clés primaire et secondaire en lecture seule (HMAC). Une clé en lecture-écriture donne un accès complet à toutes les données du compte, une clé en lecture seule les lit toutes | Code hérité ; à éviter pour les nouvelles charges |
| Microsoft Entra ID | Jetons OAuth d'un utilisateur, d'un principal de service ou d'une **identité managée**, autorisés par des attributions de rôles du plan de données | Le choix recommandé par défaut, nécessaire pour un accès sans clé et à privilèges minimaux |
| Jetons de ressource | Jetons générés à partir d'une **autorisation** (mode `All` ou `Read`) rattachée à un **utilisateur** d'une base de données, pour une ressource. Valides une heure par défaut, jusqu'à cinq heures | Donner un accès temporaire et limité à un client non approuvé par l'intermédiaire d'une couche intermédiaire de confiance |

Connexion sans clé avec le SDK, grâce à `DefaultAzureCredential` (identité managée dans Azure, informations d'identification du développeur en local) :

```text
// C#
using Azure.Identity;
using Microsoft.Azure.Cosmos;

CosmosClient client = new CosmosClient(
    "https://cosmos-contoso.documents.azure.com:443/",
    new DefaultAzureCredential());

# Python
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

client = CosmosClient("https://cosmos-contoso.documents.azure.com:443/",
                      credential=DefaultAzureCredential())
```

**Désactiver l'authentification par clé** oblige chaque client à utiliser Microsoft Entra ID. Cela définit la propriété de compte `disableLocalAuth` (option du portail à la création du compte, Bicep `disableLocalAuth: true`, ou CLI) :

```bash
az resource update --resource-group rg-contoso \
  --name cosmos-contoso \
  --resource-type "Microsoft.DocumentDB/databaseAccounts" \
  --set properties.disableLocalAuth=true
```

Ensuite, les requêtes par clé échouent. Modifier le compte exige un rôle Azure avec `Microsoft.DocumentDb/databaseAccounts/*/write`.

**Faire pivoter les clés sans interruption.** Si l'application utilise la clé primaire : régénérez la clé secondaire, validez-la, basculez l'application sur la clé secondaire, puis régénérez la clé primaire (et l'inverse si elle utilise la clé secondaire). La régénération peut prendre d'une minute à plusieurs heures sur les grands comptes.

```bash
az cosmosdb keys list --resource-group rg-contoso --name cosmos-contoso --type read-only-keys
az cosmosdb keys regenerate --resource-group rg-contoso --name cosmos-contoso --key-kind secondary
```

`--key-kind` accepte `primary`, `secondary`, `primaryReadonly` et `secondaryReadonly`. La fonctionnalité de **rotation sécurisée des clés** (fonctionnalités `EnableAccountKeysLastUsageCheckInDisableLocalAuth` et `EnableKeyCheckBeforeRegenerationPreview`) bloque la régénération d'une clé, ou la désactivation de l'authentification locale, quand la clé a été utilisée au cours des 12 dernières heures.

> **Piège d'examen.** Les clés en lecture seule lisent quand même **toutes** les données du compte. Pour « lire uniquement ce conteneur » ou « aucun secret dans la configuration », la réponse est Microsoft Entra ID avec un rôle du plan de données limité au conteneur, pas une clé en lecture seule.

<!-- section: authorization | objectives: 2.1.2 -->
## Autorisation : plan de contrôle et plan de données

Azure Cosmos DB a deux systèmes d'autorisation distincts :

| | Plan de contrôle | Plan de données |
| --- | --- | --- |
| Couvre | Paramètres du compte, clés et chaînes de connexion, bases de données et conteneurs, débit, sauvegarde et restauration, tâches de transfert de données, définitions et attributions de rôles | Création, lecture, remplacement, upsert, patch et suppression d'éléments ; requêtes ; flux de modification ; procédures stockées ; flux de conflits |
| Système | **Azure RBAC** (attributions de rôles `Microsoft.Authorization`) | **RBAC natif de Cosmos DB** (`sqlRoleDefinitions`, `sqlRoleAssignments` stockés dans le compte) |
| Géré avec | Contrôle d'accès (IAM) du portail, `az role assignment create` | CLI, PowerShell, Bicep, ARM. **Pas le portail** |

Rôles intégrés du **plan de contrôle** :

| Rôle | Permet |
| --- | --- |
| DocumentDB Account Contributor | Gérer les comptes Azure Cosmos DB : `databaseAccounts/*` sans NotActions, donc il peut aussi lister et régénérer les clés et écrire les définitions et attributions de rôles du plan de données |
| Cosmos DB Operator | Gérer les comptes, bases de données et conteneurs, mais **sans** clés, chaînes de connexion ni accès aux données, et sans gestion des rôles du plan de données |
| Cosmos DB Account Reader Role | Lire les métadonnées du compte et les **clés en lecture seule** |
| CosmosBackupOperator | Soumettre une demande de restauration (mode périodique) et modifier la rétention des sauvegardes |
| CosmosRestoreOperator | Effectuer une restauration pour un compte en mode de sauvegarde continue |

Rôles intégrés du **plan de données** :

| Rôle | ID | Actions de données |
| --- | --- | --- |
| Cosmos DB Built-in Data Reader | `00000000-0000-0000-0000-000000000001` | `readMetadata`, `items/read`, `executeQuery`, `readChangeFeed` |
| Cosmos DB Built-in Data Contributor | `00000000-0000-0000-0000-000000000002` | `readMetadata`, `containers/*`, `containers/items/*` |

Les actions de données commencent toutes par `Microsoft.DocumentDB/databaseAccounts/` : `readMetadata`, puis sous `sqlDatabases/containers/` : `items/create`, `items/read` (lecture ponctuelle), `items/replace`, `items/upsert`, `items/delete`, `items/unmask`, `executeQuery`, `readChangeFeed`, `executeStoredProcedure`, `manageConflicts`. Règles à retenir :

- `readMetadata` est nécessaire pour **tout** accès par SDK (au démarrage, le SDK lit les régions du compte, les définitions de clé de partition et les adresses des partitions). Il ne permet pas de gérer le débit.
- Exécuter des requêtes avec le SDK exige à la fois `executeQuery` et `readChangeFeed`.
- `notDataActions` n'est pas pris en charge : tout ce qui n'est pas listé est refusé.
- Étendues : le compte (`/`), une base de données (`/dbs/<database>`) ou un conteneur (`/dbs/<database>/colls/<container>`).
- Créer des définitions et des attributions de rôles exige des autorisations du plan de contrôle (`sqlRoleDefinitions/write`, `sqlRoleAssignments/write`).

Rôle personnalisé pour un service de reporting qui lit un conteneur par lectures ponctuelles et requêtes :

```json
{
  "RoleName": "Orders Reader",
  "Type": "CustomRole",
  "AssignableScopes": [ "/" ],
  "Permissions": [
    {
      "DataActions": [
        "Microsoft.DocumentDB/databaseAccounts/readMetadata",
        "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/read",
        "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/executeQuery",
        "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/readChangeFeed"
      ]
    }
  ]
}
```

```bash
az cosmosdb sql role definition create --resource-group rg-contoso \
  --account-name cosmos-contoso --body "@orders-reader.json"

az cosmosdb sql role assignment create --resource-group rg-contoso \
  --account-name cosmos-contoso \
  --role-definition-id "<role-definition-id>" \
  --principal-id "<managed-identity-object-id>" \
  --scope "/dbs/sales/colls/orders"
```

Microsoft recommande des identités distinctes pour le plan de contrôle et le plan de données ([Sécuriser votre compte](https://learn.microsoft.com/fr-fr/azure/cosmos-db/security)), afin qu'une application qui lit des données ne puisse pas aussi modifier le compte.

> **Piège d'examen.** Les rôles Azure RBAC comme Owner, Contributor ou DocumentDB Account Contributor ne donnent **aucun** accès aux données par Microsoft Entra ; ce qu'ils peuvent faire, c'est lister les clés (qui contournent les rôles du plan de données tant que l'authentification locale n'est pas désactivée). Une application qui utilise `DefaultAzureCredential` et reçoit 403 en lecture n'a pas d'attribution de rôle du **plan de données**, à créer avec `az cosmosdb sql role assignment create`.

<!-- section: network-security | objectives: 2.1.3 -->
## Sécurité réseau

Chaque requête doit présenter un jeton d'autorisation valide. Les règles réseau ajoutent un second contrôle : dès qu'une règle IP ou de réseau virtuel existe, seules les sources autorisées obtiennent une réponse ; les autres reçoivent **403 Forbidden** (la connexion elle-même n'est pas refusée). Les modifications peuvent prendre jusqu'à **15 minutes** pour se propager.

| Contrôle | Fonctionnement | À retenir |
| --- | --- | --- |
| Pare-feu IP | Adresses IP publiques ou plages CIDR autorisées (`ipRules` ; CLI `--ip-range-filter`) | Les adresses IP privées sont refusées dans la liste. **Accept connections from within Azure datacenters** ajoute `0.0.0.0` : toutes les adresses IP Azure, y compris les abonnements d'autres clients. **Add Azure Portal Middleware IPs** maintient les fonctionnalités du portail |
| Point de terminaison de service de réseau virtuel | Activer `Microsoft.AzureCosmosDB` sur le sous-réseau, puis ajouter le sous-réseau comme règle de réseau virtuel | Le trafic arrive avec l'identité du sous-réseau et non plus une adresse IP publique, donc les règles IP existantes pour ces machines ne correspondent plus. Jusqu'à 256 sous-réseaux. Les réseaux connectés par peering ne sont pas inclus automatiquement. Même locataire Microsoft Entra |
| Point de terminaison privé (Private Link) | Adresses IP privées dans votre sous-réseau ; sous-ressource cible `Sql` ; zone DNS privée `privatelink.documents.azure.com` | Une adresse IP pour le point de terminaison global plus **une par région**. Fonctionne depuis les réseaux connectés par peering et depuis l'environnement local par VPN ou ExpressRoute. Jusqu'à 200 par compte |
| `publicNetworkAccess: Disabled` | Bloque tout le trafic public et par point de terminaison de service | A priorité sur toutes les règles IP et de réseau virtuel, y compris l'option des centres de données Azure. Seuls les points de terminaison privés restent |
| Périmètre de sécurité réseau (préversion) | Définit une limite réseau autour du compte | L'isole de l'accès depuis l'internet public |

Règles de combinaison :

- Sans aucune règle de pare-feu : tout réseau peut joindre le compte.
- Avec des points de terminaison privés et aucune règle publique, le compte n'est joignable que par les points de terminaison privés. Si tous les points de terminaison privés sont ensuite supprimés et que `publicNetworkAccess` n'est pas `Disabled`, le compte est de nouveau ouvert : définissez `Disabled` dès la création du compte pour éviter toute fenêtre publique.
- Avec un groupe de zones DNS privées, la zone est mise à jour automatiquement quand des régions sont ajoutées ou supprimées ; avec un DNS personnalisé, vous ajoutez et supprimez vous-même les enregistrements. C'est la résolution DNS qui décide si le trafic passe par le point de terminaison privé.
- Ports du mode direct : TCP 10000 à 20000 avec les points de terminaison de service, toute la plage 0 à 65535 avec les points de terminaison privés.
- Ajouter un point de terminaison privé à un compte existant provoque environ cinq minutes d'interruption, sauf si vous ajoutez d'abord des règles IP ou de réseau virtuel pour les clients, attendez 10 minutes, créez le point de terminaison, puis supprimez ces règles.
- L'Explorateur de données du portail a besoin de votre adresse IP cliente dans le pare-feu.

```bash
az network vnet subnet update --resource-group rg-contoso \
  --vnet-name vnet-app --name snet-api \
  --service-endpoints Microsoft.AzureCosmosDB

az cosmosdb network-rule add --resource-group rg-contoso \
  --name cosmos-contoso --virtual-network vnet-app --subnet snet-api
```

Transport et stockage : imposez une version TLS minimale sur le compte (`minimalTlsVersion` n'accepte que `Tls12`, le minimum pour tout compte depuis le 31 août 2025 ; TLS 1.3 est pris en charge) ; les données au repos sont chiffrées avec des clés gérées par le service ou des clés gérées par le client dans Azure Key Vault ; Always Encrypted chiffre côté client les propriétés choisies.

> **Piège d'examen.** « Seul l'App Service du sous-réseau intégré peut se connecter, et le compte ne doit avoir aucun point de terminaison public » signifie un point de terminaison privé plus `publicNetworkAccess` à `Disabled`. Un point de terminaison de service utilise toujours le point de terminaison public du compte, et l'option des centres de données ouvre le compte à tout Azure.

<!-- section: dynamic-data-masking | objectives: 2.1.4 -->
## Masquage dynamique des données

Le masquage dynamique des données (DDM) est une fonctionnalité côté serveur, basée sur une stratégie : les valeurs sont masquées **au moment de la requête** pour les identités qui n'ont pas l'autorisation unmask, tandis que les données stockées restent inchangées.

Ordre de configuration :

1. Activer **Dynamic Data Masking** sur le compte (**Paramètres** > **Fonctionnalités**). Cela peut prendre jusqu'à 15 minutes, et la fonctionnalité **ne peut plus être désactivée** ensuite (retirer tous les chemins de la stratégie arrête le masquage).
2. Accorder les rôles du plan de données. Les lecteurs privilégiés ont besoin de l'action de données `items/unmask` (Cosmos DB Built-in Data Contributor l'inclut via `items/*` ; Built-in Data Reader non). DDM exige Microsoft Entra ID : **les clés de compte ne sont pas prises en charge**.
3. Définir la stratégie de masquage du conteneur (**Paramètres** du conteneur > **Masking Policy**).

| Stratégie | Effet | Exemple |
| --- | --- | --- |
| `Default` | Les chaînes deviennent `XXXX`, les nombres `0`, les booléens `false` | `Redmond` devient `XXXX` |
| `MaskSubstring` | Masque `length` caractères à partir de `startPosition` | Début 3, longueur 5 : `Washington` devient `WasXXXXXon` |
| `Email` | Conserve la première lettre et la fin du domaine | `alpha@microsoft.com` devient `aXXXX@XXXXXXXXX.com` |

```json
{
  "dataMaskingPolicy": {
    "includedPaths": [
      { "path": "/" },
      { "path": "/contact/email", "strategy": "Email" },
      { "path": "/card/number", "strategy": "MaskSubstring", "startPosition": 0, "length": 12 }
    ],
    "excludedPaths": [
      { "path": "/id" },
      { "path": "/customerId" },
      { "path": "/orders/[]/status" }
    ]
  }
}
```

Comportement et limites :

- Un chemin sans stratégie utilise `Default`. Les chemins exclus ne sont autorisés que si `/` est inclus. Les éléments de tableau s'écrivent `[]` ; un chemin ne peut pas se terminer par `[]` ni viser un index comme `[1]`. `MaskSubstring` n'accepte que des positions de départ positives.
- Le masquage ne s'applique qu'aux **réponses de lecture et de requête**. Create, replace, upsert et patch agissent sur les données réelles et peuvent renvoyer des valeurs non masquées dans leurs réponses.
- Les utilisateurs sans unmask ne peuvent pas lire le **flux de modification** (quel que soit le mode).
- Les sauvegardes, les vues matérialisées et les données stockées ne sont pas masquées. La mise en miroir Fabric et le magasin analytique ne sont pas pris en charge par défaut sur les comptes DDM.
- Si `id` ou la clé de partition est masqué, la vue des documents de l'Explorateur de données n'est pas disponible.
- Les requêtes sur des chemins masqués coûtent un peu plus de RU. L'activation de la fonctionnalité est gratuite tant qu'aucune stratégie n'est appliquée.
- Des requêtes complexes peuvent encore permettre de déduire des valeurs : DDM limite l'exposition, il ne remplace pas le contrôle d'accès.

> **Piège d'examen.** DDM n'est pas du chiffrement et ne protège pas contre un détenteur de clé : il exige Microsoft Entra ID et des rôles du plan de données. Pour que les agents du support voient les e-mails masqués et les auditeurs les valeurs en clair, donnez aux auditeurs un rôle avec `items/unmask` et aux agents du support un rôle sans.

<!-- section: key-points -->
## Points clés

- Privilégier Microsoft Entra ID avec des identités managées ; `disableLocalAuth=true` bloque les clés ; faire pivoter les clés en basculant d'abord sur l'autre clé ; les clés en lecture seule lisent quand même tout.
- Plan de contrôle = Azure RBAC (Cosmos DB Operator gère sans clés ni données). Plan de données = rôles natifs Built-in Data Reader (`...001`) et Data Contributor (`...002`), attribués avec `az cosmosdb sql role assignment create` à l'étendue `/`, base de données ou conteneur, jamais dans le portail.
- `readMetadata` est toujours nécessaire ; les requêtes exigent `executeQuery` et `readChangeFeed` ; pas de `notDataActions`.
- Réseau : pare-feu IP (`0.0.0.0` = tout Azure), points de terminaison de service (identité du sous-réseau, point de terminaison public), points de terminaison privés (`Sql`, `privatelink.documents.azure.com`, une adresse IP par région plus la globale), `publicNetworkAccess: Disabled` l'emporte sur toutes les règles ; les requêtes bloquées reçoivent 403.
- DDM : activation unique (irréversible), Entra ID uniquement, `items/unmask` pour voir les valeurs en clair, stratégies Default, MaskSubstring, Email ; lectures et requêtes uniquement.
