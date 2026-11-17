Une base de données vit rarement seule : les applications l'atteignent par une API, les opérateurs la surveillent avec Azure Monitor, et d'autres services réagissent à ses modifications. Ce chapitre couvre le générateur d'API de données (Data API builder, DAB), qui expose des tables, des vues et des procédures stockées sous forme de points de terminaison REST, GraphQL et MCP à partir d'un seul fichier JSON, son déploiement et sa supervision, ainsi que les cinq façons de réagir aux modifications de données. Les questions d'examen montrent un extrait de configuration à compléter ou à corriger, ou un ensemble de contraintes à associer à une fonctionnalité de gestion des modifications.

<!-- section: dab-config | objectives: 2.4.1 -->
## Créer un fichier de configuration Data API builder

DAB est un moteur open source sans code à écrire : un fichier de configuration, `dab-config.json` par défaut, décrit la source de données, les paramètres d'exécution et les entités. L'interface CLI écrit ce fichier :

```bash
dab init --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode production \
  --auth.provider EntraID \
  --auth.audience "api://contoso-orders" \
  --auth.issuer "https://login.microsoftonline.com/<tenant-id>/v2.0"

dab add Product --source SalesLT.Product --source.type table --permissions "anonymous:read"
dab update Product --permissions "authenticated:create,read,update,delete"
dab validate
dab start
```

`dab init` **écrase** un fichier existant sans fusion. `dab add` crée une entité, `dab update` la modifie (un rôle par `--permissions`), `dab validate` vérifie le fichier et `dab start` lance le moteur. Autres commandes : `dab configure`, `dab export`, `dab add-telemetry`, `dab auto-config`.

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('DATABASE_CONNECTION_STRING')",
    "options": { "set-session-context": true }
  },
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql" },
    "host": {
      "mode": "production",
      "cors": { "origins": [ "https://shop.contoso.com" ], "allow-credentials": false },
      "authentication": {
        "provider": "EntraId",
        "jwt": {
          "audience": "api://contoso-orders",
          "issuer": "https://login.microsoftonline.com/<tenant-id>/v2.0"
        }
      }
    }
  },
  "entities": {}
}
```

| Section | Contenu |
| --- | --- |
| `$schema` | Schéma JSON utilisé pour la validation |
| `data-source` | `database-type` (`mssql` pour SQL Server et Azure SQL ; aussi `postgresql`, `mysql`, `cosmosdb_nosql`, `cosmosdb_postgresql`), `connection-string`, `options` |
| `data-source-files` | Fichiers de configuration enfants (un par base de données) |
| `runtime` | `rest`, `graphql`, `mcp`, `host`, `cache`, `pagination`, `telemetry`, `health` |
| `entities` | Les objets exposés et leurs autorisations |
| `autoentities` | DAB 2.0 : règles qui exposent les objets correspondant à un modèle (`dbo.%`), SQL uniquement |
| `azure-key-vault` | Point de terminaison du coffre utilisé par `@akv('secret-name')` |

Les secrets n'apparaissent jamais en clair : `@env('NAME')` lit une variable d'environnement (ou un fichier `.env`) et `@akv('name')` lit un secret Key Vault. Avec une identité managée, la chaîne de connexion ne contient aucun secret : `Authentication=Active Directory Managed Identity;` (ajoutez `User Id=<client id>` pour une identité affectée par l'utilisateur).

Fournisseurs d'authentification (`runtime.host.authentication.provider`) :

| Fournisseur | Usage |
| --- | --- |
| `Unauthenticated` (par défaut) | Chaque requête s'exécute en tant que `anonymous` |
| `EntraId` (anciennement `AzureAd`) | Valide les jetons Microsoft Entra ID ; `jwt.audience` et `jwt.issuer` obligatoires |
| `AppService` | Fait confiance aux en-têtes définis par l'authentification App Service (Easy Auth) |
| `StaticWebApps` | Derrière l'authentification Azure Static Web Apps |
| `Custom` | Jetons JWT d'un autre fournisseur d'identité |
| `Simulator` | Tests locaux uniquement ; démarre seulement en mode `development` |

Un client choisit l'un de ses rôles avec l'en-tête `X-MS-API-ROLE` ; sans cet en-tête, une requête authentifiée utilise le rôle `authenticated`. `set-session-context: true` envoie les revendications (claims) du jeton à SQL dans `SESSION_CONTEXT`, où des prédicats de sécurité au niveau des lignes ou des procédures peuvent les lire.

> **Piège d'examen.** Le mode d'hôte `development` active Swagger UI, le client GraphQL Nitro, les contrôles d'intégrité anonymes et la journalisation de débogage. Il sert au travail local ; les déploiements de production gardent `"mode": "production"`.

<!-- section: dab-entities | objectives: 2.4.2 -->
## Configurer les entités : autorisations, mise en cache, pagination, filtrage

```json
"Product": {
  "source": { "object": "SalesLT.Product", "type": "table" },
  "rest": { "enabled": true, "path": "/products" },
  "graphql": { "enabled": true, "type": { "singular": "Product", "plural": "Products" } },
  "permissions": [
    {
      "role": "anonymous",
      "actions": [ { "action": "read", "fields": { "include": [ "*" ], "exclude": [ "StandardCost" ] } } ]
    },
    {
      "role": "authenticated",
      "actions": [
        { "action": "create" },
        { "action": "read" },
        { "action": "update", "policy": { "database": "@item.OwnerId eq @claims.oid" } }
      ]
    }
  ],
  "cache": { "enabled": true, "ttl-seconds": 60 }
}
```

| Paramètre | Règles |
| --- | --- |
| `permissions[].role` | `anonymous`, `authenticated` ou un rôle personnalisé. Un rôle non configuré hérite du rôle plus large : rôle nommé, puis `authenticated`, puis `anonymous` |
| `actions` | `create`, `read`, `update`, `delete`, `execute` (procédures stockées), `*` (CRUD pour les tables et les vues, `execute` pour les procédures) |
| `fields.include` / `fields.exclude` | Restriction par colonne, pour chaque action |
| `policy.database` | Prédicat de style OData avec `@item.<field>` et `@claims.<claim>`, ajouté à la requête. Pris en charge pour `read`, `update` et `delete` ; pas pour `create` ni `execute` |
| `cache` | `enabled`, `ttl-seconds` (par défaut : la valeur du runtime), `level` `L1` (en mémoire) ou `L1L2` (mémoire plus un cache Redis distribué configuré dans `runtime.cache.level-2`) |

> **Piège d'examen.** La mise en cache d'une entité ne fonctionne que si `runtime.cache.enabled` vaut `true` (`false` par défaut) ; sinon, le bloc `cache` de l'entité n'a aucun effet. La durée de vie par défaut du runtime est de 5 secondes.

La **pagination** se configure dans `runtime.pagination` : `default-page-size` (100 par défaut), `max-page-size` (100 000 par défaut) et `next-link-relative`. Les requêtes demandent davantage avec `$first` (REST) ou `first` (GraphQL), `-1` signifiant la taille de page maximale, et continuent avec le curseur retourné dans `nextLink` (REST) ou `endCursor` / `hasNextPage` (GraphQL).

Le **filtrage, la recherche et le tri** ne demandent aucune configuration ; ce sont des options de requête :

| Besoin | REST | GraphQL |
| --- | --- | --- |
| Filtrer | `GET /api/products?$filter=ListPrice ge 100 and Color eq 'Red'` | `products(filter: { Color: { eq: "Red" } })` |
| Rechercher dans du texte | `$filter` avec les opérateurs OData | `filter: { Name: { contains: "bike" } }` |
| Trier | `$orderby=ListPrice desc, Name asc` | `orderBy: { ListPrice: DESC }` |
| Colonnes | `$select=ProductID,Name` | Les champs listés dans la requête |
| Paginer | `$first=20&$after=<cursor>` | `first: 20, after: "<cursor>"` |

Les segments de chemin et les paramètres de requête REST **respectent la casse**. Un `GET` sur une clé inexistante retourne `200 OK` avec un tableau `value` vide, pas `404`.

<!-- section: dab-endpoints | objectives: 2.4.3 -->
## Configurer les points de terminaison REST, GraphQL et MCP

| Paramètre | Valeur par défaut | Remarques |
| --- | --- | --- |
| `runtime.rest.enabled` / `path` | `true` / `/api` | `false` désactive REST pour toutes les entités, quel que soit le paramètre de l'entité. Pas de sous-chemin comme `/api/data` |
| `runtime.rest.request-body-strict` | | `true` : des champs en trop dans le corps retournent `400 Bad Request` ; `false` : ignorés |
| `runtime.graphql.enabled` / `path` | `true` / `/graphql` | Même logique |
| `runtime.graphql.allow-introspection` | `true` | `false` masque le schéma aux clients |
| `runtime.graphql.depth-limit` | `null` (aucune limite) | Limite les requêtes imbriquées |
| `runtime.graphql.multiple-mutations.create.enabled` | `false` | Créer des lignes liées en une seule mutation |
| `runtime.mcp.enabled` / `path` | `true` / `/mcp` | Point de terminaison Model Context Protocol pour les agents d'IA ; `dml-tools` active les outils un par un (`describe-entities`, `read-records`, `create-record`...) |
| `rest.path`, `graphql.type` de l'entité | `/{entity}`, nom de l'entité | Renommer la route ou les types GraphQL |
| `rest.enabled`, `graphql.enabled` de l'entité | `true` | Exposer une entité sur un seul protocole |

URL REST : `/api/{entity}` pour la collection, `/api/{entity}/{key}/{value}` pour une ligne (`/api/products/ProductID/680`). `POST` crée ; `PUT` remplace et `PATCH` met à jour, tous deux insérant quand la clé n'existe pas, sauf pour les clés `IDENTITY` où une clé absente retourne `404`. GraphQL génère `products` (liste), `product_by_pk`, `createProduct`, `updateProduct` et `deleteProduct`.

| Besoin du client | Point de terminaison |
| --- | --- |
| CRUD simple, mise en cache HTTP, tout langage | REST |
| Récupérer des données liées en un seul aller-retour, choisir les champs retournés | GraphQL |
| Un agent d'IA découvre et appelle les opérations de données comme des outils | MCP |

> **Piège d'examen.** Pour garder REST mais en retirer une entité, définissez `"rest": { "enabled": false }` **sur l'entité**. Mettre `runtime.rest.enabled` à `false` supprime REST pour toutes les entités.

<!-- section: dab-objects | objectives: 2.4.4 -->
## Exposer des tables, des vues, des procédures stockées et des relations

| `type` de la source | Clé | Actions | REST | GraphQL |
| --- | --- | --- | --- | --- |
| `table` | Clé primaire lue dans la base de données | CRUD | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Requêtes et mutations |
| `view` | **Doit être déclarée** : `fields[].primary-key` (DAB 2.0) ou l'ancien `key-fields` | CRUD si la vue est modifiable | Comme une table | Comme une table |
| `stored-procedure` | Aucune | `execute` uniquement | `POST` par défaut ; `rest.methods` pour autoriser `GET` | `execute<Entity>`, une mutation par défaut (`graphql.operation`) |

```json
"ProductSummary": {
  "source": { "object": "dbo.vProductSummary", "type": "view" },
  "fields": [ { "name": "ProductID", "primary-key": true } ],
  "permissions": [ { "role": "anonymous", "actions": [ "read" ] } ]
},
"GetOrdersByDate": {
  "source": {
    "object": "dbo.usp_GetOrdersByDate",
    "type": "stored-procedure",
    "parameters": [
      { "name": "StartDate", "required": true },
      { "name": "EndDate", "required": true }
    ]
  },
  "rest": { "methods": [ "GET" ] },
  "graphql": { "operation": "query" },
  "permissions": [ { "role": "authenticated", "actions": [ "execute" ] } ]
}
```

Les noms de paramètres s'écrivent sans `@`. Exposer une procédure en lecture seule comme `query` GraphQL plutôt que comme mutation est la correction habituelle à l'examen.

Les **relations** permettent à une requête GraphQL de naviguer d'une entité à une autre :

```json
"Category": {
  "source": { "object": "SalesLT.ProductCategory", "type": "table" },
  "relationships": {
    "products": {
      "cardinality": "many",
      "target.entity": "Product",
      "source.fields": [ "ProductCategoryID" ],
      "target.fields": [ "ProductCategoryID" ]
    }
  }
}
```

| Relation | Configuration |
| --- | --- |
| Un-à-plusieurs (une catégorie a plusieurs produits) | `cardinality: many` du côté « un » |
| Plusieurs-à-un (un produit a une catégorie) | `cardinality: one`, définie sur `Product` |
| Plusieurs-à-plusieurs par une table de jointure non exposée | `cardinality: many` + `linking.object`, `linking.source.fields`, `linking.target.fields` |
| Navigation dans les deux sens | Définir une relation sur **chaque** entité |

`source.fields` et `target.fields` peuvent être déduits quand une clé étrangère existe. Les deux entités doivent se trouver dans le même fichier de configuration.

> **Piège d'examen.** Les relations sont une fonctionnalité GraphQL : REST ne les prend pas en charge. Une exigence de retourner les commandes avec leurs lignes en une seule requête oriente vers GraphQL.

<!-- section: dab-deploy | objectives: 2.4.5 -->
## Déployer Data API builder

| Cible | Remarques |
| --- | --- |
| Azure Container Apps | Image conteneur, règles de mise à l'échelle, entrée (ingress) sur le port cible 5000 |
| Azure App Service | Application web ; s'associe à l'authentification App Service (fournisseur `AppService`) |
| Azure Container Instances | Conteneur unique, hébergement simple |
| Azure Kubernetes Service | Plateforme Kubernetes existante ; contrôles d'intégrité pour les sondes |
| Docker local ou `dab start` | Développement et tests |

L'image est `mcr.microsoft.com/azure-databases/data-api-builder`. Un modèle courant intègre le fichier de configuration dans une image personnalisée envoyée dans Azure Container Registry :

```text
FROM mcr.microsoft.com/azure-databases/data-api-builder:latest
COPY dab-config.json /App/dab-config.json
```

```bash
az acr build --registry contosoacr --image dab:1 .
```

L'application conteneur reçoit ensuite la chaîne de connexion dans une variable d'environnement (`DATABASE_CONNECTION_STRING`, référencée par `@env()`), ou mieux, utilise une **identité managée** : la chaîne de connexion ne contient aucun mot de passe et l'identité est créée comme utilisateur de base de données avec uniquement les autorisations nécessaires aux entités. L'URL de l'application retourne un rapport d'intégrité (`"status": "healthy"`).

Liste de contrôle du déploiement : `dab validate` dans le pipeline, mode d'hôte `production`, secrets par `@env()` ou `@akv()`, un fournisseur d'authentification autre que `Unauthenticated` dès que des écritures sont exposées, CORS limité aux origines des clients, et introspection désactivée si le schéma doit rester privé.

<!-- section: azure-monitor | objectives: 2.4.6 -->
## Recommander des configurations Azure Monitor

DAB envoie sa télémétrie par `runtime.telemetry` (ou `dab add-telemetry`) :

```json
"telemetry": {
  "application-insights": {
    "enabled": true,
    "connection-string": "@env('APPLICATIONINSIGHTS_CONNECTION_STRING')"
  },
  "log-level": { "default": "warning" }
}
```

| Destination | Configuration | Usage |
| --- | --- | --- |
| Application Insights | `application-insights.connection-string` | Requêtes (REST et GraphQL, durée, code d'état), dépendances (chaque requête SQL, durée, succès), exceptions, traces distribuées |
| OpenTelemetry | `open-telemetry.endpoint`, `service-name`, `exporter-protocol` (`grpc` ou `httpprotobuf`) | Tout collecteur OpenTelemetry |
| Azure Log Analytics | `azure-log-analytics` avec `auth.custom-table-name`, `dcr-immutable-id`, `dce-endpoint` | Journaux DAB dans une table personnalisée, par une règle et un point de terminaison de collecte de données |
| Fichier | `file.path`, `rolling-interval` | Fichiers journaux locaux |
| Niveau de journalisation | `log-level` par espace de noms | Le seul paramètre rechargé à chaud en production |

```kusto
dependencies
| where timestamp > ago(1h) and type == "SQL"
| summarize calls = count(), avgDuration = avg(duration), failures = countif(success == false) by data
| top 20 by avgDuration desc
```

Pour la base de données elle-même, un **paramètre de diagnostic** (désactivé par défaut) diffuse les métriques et les journaux :

| Destination | Usage |
| --- | --- |
| Espace de travail Log Analytics | Requêtes KQL, alertes, classeurs, corrélation avec les données Application Insights |
| Azure Event Hubs | SIEM tiers ou diffusion personnalisée (même région que la base de données) |
| Stockage Azure | Archive à faible coût avec une stratégie de rétention |

Les catégories d'Azure SQL Database comprennent les métriques Basic, `QueryStoreRuntimeStatistics`, `QueryStoreWaitStatistics`, `Errors`, `DatabaseWaitStatistics`, `Timeouts`, `Blocks`, `Deadlocks`, `AutomaticTuning` et `SQLInsights`. Chaque base de données (et chaque pool élastique) se configure séparément.

| Exigence | Recommandation |
| --- | --- |
| Trouver quels appels d'API sont lents et quelles requêtes SQL en sont la cause | Application Insights sur DAB (requêtes et dépendances) |
| Alerter sur les interblocages ou les délais d'attente dans la base de données | Paramètre de diagnostic vers Log Analytics, règle d'alerte de journal |
| Conserver les journaux pendant des années au coût minimal | Paramètre de diagnostic vers un compte de stockage |
| Journaux du conteneur de l'application DAB | Environnement Container Apps lié à un espace de travail Log Analytics |
| Maîtriser le coût d'ingestion d'une API très sollicitée | Échantillonnage dans Application Insights, `log-level` plus élevé |

<!-- section: change-handling | objectives: 2.4.7 -->
## Gérer les modifications : CES, CDC, suivi des modifications, Functions, Logic Apps

| Fonctionnalité | Ce qu'elle capture | Remise | Remarques |
| --- | --- | --- | --- |
| Streaming d'événements de modification (CES) | Chaque `INSERT`, `UPDATE`, `DELETE` avec les anciennes et nouvelles valeurs, sous forme de CloudEvents (JSON ou Avro) | **Poussée** en quasi temps réel vers Azure Event Hubs ou Fabric Eventstream | Préversion. Mode de récupération complète ; incompatible avec CDC ou la réplication transactionnelle sur la même base |
| Capture des données modifiées (CDC) | Chaque modification avec les valeurs avant et après, dans des tables de modifications | Lue par des requêtes sur une plage de LSN | Historique pour l'audit et la synchronisation |
| Suivi des modifications (Change Tracking) | Quelles lignes ont changé (clé et opération), pas les valeurs | Lue avec `CHANGETABLE` et un numéro de version | Léger ; rétention définie sur la base de données |
| Déclencheur SQL d'Azure Functions | Lots de lignes modifiées remis au code | La fonction interroge, s'appuie sur le suivi des modifications | Traitement serverless qui se met à l'échelle hors de la base |
| Connecteur SQL d'Azure Logic Apps | Nouveaux éléments (« When an item is created ») ou autres modifications de lignes (déclencheurs intégrés Standard) | Le déclencheur interroge selon une planification | Flux de travail low-code ; les déclencheurs intégrés Standard exigent le suivi des modifications |

```text
-- CES (Azure SQL Database): master key, credential, enable, stream group, tables
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<password>';
CREATE DATABASE SCOPED CREDENTIAL EventHubCredential WITH IDENTITY = 'Managed Identity';
EXEC sys.sp_enable_event_stream;
EXEC sys.sp_create_event_stream_group
    @stream_group_name      = N'OrdersStream',
    @destination_type       = N'AzureEventHubs',
    @destination_location   = N'contoso-ns.servicebus.windows.net:9093/orders',
    @destination_credential = EventHubCredential,
    @max_message_size_kb    = 256,
    @partition_key_scheme   = N'None';
EXEC sys.sp_add_object_to_event_stream_group N'OrdersStream', N'dbo.Orders';

-- CDC
EXEC sys.sp_cdc_enable_db;
EXEC sys.sp_cdc_enable_table @source_schema = N'dbo', @source_name = N'Orders',
     @role_name = NULL, @supports_net_changes = 1;
SELECT * FROM cdc.fn_cdc_get_all_changes_dbo_Orders(
    sys.fn_cdc_get_min_lsn('dbo_Orders'), sys.fn_cdc_get_max_lsn(), 'all');

-- Change Tracking (also required by the Azure Functions SQL trigger)
ALTER DATABASE SalesDB SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
ALTER TABLE dbo.Orders ENABLE CHANGE_TRACKING;
SELECT ct.OrderID, ct.SYS_CHANGE_OPERATION
FROM CHANGETABLE(CHANGES dbo.Orders, @last_sync_version) AS ct;
```

Détails de CES : sur Managed Instance et SQL Server 2025, le type de destination est `AzureEventHubsApacheKafka` (AMQP est déprécié depuis le 15 août 2026) ; configurer CES exige `db_owner` ou `CONTROL DATABASE` ; une table appartient à un seul groupe de flux ; seuls les points de terminaison publics d'Event Hubs sont pris en charge ; `vector`, `json`, `xml` et quelques autres types sont ignorés ; la sécurité au niveau des lignes et le masquage dynamique des données ne filtrent pas le flux. Les événements en attente empêchent la troncation du journal : surveillez `sys.dm_change_feed_errors` et la taille du journal.

Le **déclencheur SQL d'Azure Functions** crée une table de baux dans le schéma `az_func` et remet des éléments `SqlChange<T>` (`Insert`, `Update`, `Delete`), les plus anciens d'abord, par lots (`MaxBatchSize` 100 et `PollingIntervalMs` 1 000 par défaut). Son identité a besoin de `SELECT` et `VIEW CHANGE TRACKING` sur la table, ainsi que des droits pour créer et utiliser le schéma `az_func` ; `db_datareader` et `db_datawriter` ne suffisent pas. Si la fonction s'arrête plus longtemps que la rétention des modifications, les modifications plus anciennes sont perdues.

> **Conseil d'examen.** « Plusieurs consommateurs, sans interrogation, en moins d'une seconde » → CES. « Valeurs avant et après, historique d'audit » → CDC. « Seulement quelles lignes ont changé, surcharge minimale » → suivi des modifications. « Exécuter du code à chaque modification, serverless » → déclencheur SQL d'Azure Functions. « Flux de travail low-code qui envoie un e-mail ou appelle un autre service » → Logic Apps.

> **Piège d'examen.** Le déclencheur SQL d'Azure Functions repose sur le suivi des modifications, pas sur CDC : activer CDC sur la table ne fait pas déclencher la fonction.

<!-- section: key-points -->
## Points clés

- `dab init` crée (et écrase) `dab-config.json` ; `dab add` / `dab update` gèrent les entités ; secrets par `@env()` ou `@akv()`, idéalement une identité managée.
- Autorisations : rôle + actions + champs et stratégie de base de données facultatifs (`@item`, `@claims`) ; `execute` pour les procédures.
- Le cache exige `runtime.cache.enabled` ; pagination par défaut 100 / 100 000 ; `$filter`, `$orderby`, `$select`, `$first`, `$after` en REST, `filter`, `orderBy`, `first`, `after` en GraphQL.
- Les vues exigent une clé déclarée ; les procédures utilisent par défaut `POST` et une mutation GraphQL ; les relations sont réservées à GraphQL.
- Déployez le conteneur `data-api-builder` sur Container Apps, App Service, Container Instances ou AKS en mode `production`.
- Télémétrie : Application Insights pour la durée des appels d'API et des dépendances SQL ; les paramètres de diagnostic envoient les journaux de la base vers Log Analytics, Event Hubs ou le stockage.
- Modifications : CES pousse vers Event Hubs ; CDC conserve les valeurs ; le suivi des modifications conserve les clés ; Functions et les déclencheurs intégrés Logic Apps s'appuient sur le suivi des modifications.
