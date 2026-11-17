Azure Database for PostgreSQL serveur flexible stocke côte à côte les données relationnelles d'une application IA et ses incorporations (embeddings) : l'extension `vector` (pgvector) ajoute des types vectoriels, des opérateurs de distance et des index approximatifs, `pg_diskann` ajoute un index propre à Azure, et `azure_ai` appelle Azure OpenAI depuis SQL. Les questions d'examen montrent du code Python à compléter, une définition de table ou d'index à choisir, un paramètre à régler pour le rappel ou la latence, ou un paramètre de connexion à corriger.

<!-- section: connect-query | objectives: 2.2.1 -->
## Se connecter et interroger depuis Python

Les exemples de Learn utilisent **psycopg 3** (`pip install "psycopg[binary]"`, `import psycopg`) et `azure-identity` pour la connexion sans mot de passe. Le nom du serveur a la forme `<server>.postgres.database.azure.com`, PostgreSQL écoute sur le port **5432**, et TLS est obligatoire (`sslmode=require`).

Avec l'authentification Microsoft Entra, le jeton d'accès **est le mot de passe**. Demandez-le pour l'étendue des bases de données open source :

```text
import psycopg
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()          # create once, reuse: tokens are cached
token = credential.get_token("https://ossrdbms-aad.database.windows.net/.default").token

conninfo = (
    "host=contoso-rag.postgres.database.azure.com port=5432 dbname=kb "
    f"user=rag-api password={token} sslmode=require"
)

with psycopg.connect(conninfo) as conn:
    rows = conn.execute(
        "SELECT id, title FROM documents WHERE category = %s LIMIT %s",
        ("contracts", 10),
    ).fetchall()
```

| Élément | Règle |
| --- | --- |
| Étendue | `https://ossrdbms-aad.database.windows.net/.default`, la même pour tous les serveurs |
| Durée de vie du jeton | Limitée (24 heures par défaut dans l'exemple) : renouvelez-le avant d'ouvrir de nouvelles connexions |
| Paramètres | Espaces réservés `%s` et un tuple : ne construisez jamais le SQL avec des f-strings (injection SQL) |
| Transactions | psycopg ouvre une transaction à la première instruction ; `with psycopg.connect(...)` valide en cas de succès et annule en cas d'exception |
| Extensions | En créer une demande l'administrateur du serveur ou un membre de `azure_pg_admin` |

> **Piège d'examen.** Le jeton va dans le champ `password`. Une chaîne de connexion avec `Authentication=ActiveDirectory...` est une syntaxe SQL Server, pas PostgreSQL.

<!-- section: schema-design | objectives: 2.2.2 -->
## Concevoir les tables et choisir les types de données

L'extension `vector` est autorisée au niveau du serveur (paramètre de serveur `azure.extensions`, à vérifier avec `SHOW azure.extensions;`), puis créée dans **chaque base de données** : `CREATE EXTENSION vector;`. L'extension s'appelle `vector`, pas `pgvector`.

| Type | Stockage | Usage |
| --- | --- | --- |
| `vector(n)` | 4 octets par dimension (environ 6 Ko pour 1 536) | Choix par défaut pour les incorporations ; `n` doit correspondre à la sortie du modèle |
| `halfvec(n)` | 2 octets par dimension | Divise le stockage par deux, après un banc d'essai qui montre une qualité acceptable |
| `sparsevec(n)` | Valeurs non nulles et leurs positions | Vecteurs creux ; les index HNSW acceptent jusqu'à 1 000 éléments non nuls |
| Colonnes structurées (`integer`, `numeric`, `boolean`, `timestamptz`, `text`) | Natif | Attributs sur lesquels vous filtrez ou triez : index B-tree, contrôle des types, statistiques précises pour le planificateur |
| `jsonb` | JSON binaire | Attributs dynamiques ; index GIN pour la contenance, moins efficace pour les plages et les statistiques |

Une colonne déclarée `vector` sans dimension ne peut pas être indexée (`column does not have dimensions`), et une insertion d'une autre dimension échoue. Une table peut contenir plusieurs colonnes vectorielles (incorporations du titre et de l'image), chacune avec son index ; aucun index ne couvre deux colonnes vectorielles. Pour le RAG, les documents sont découpés en segments (chunks) : une table parente pour la source et une table enfant avec une ligne par segment.

```text
CREATE TABLE source_documents (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       text NOT NULL,
    source_url  text,
    tenant_id   integer NOT NULL,
    ingested_at timestamptz DEFAULT now()
);

CREATE TABLE document_chunks (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id integer NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL,
    content     text NOT NULL,
    token_count integer,
    attributes  jsonb DEFAULT '{}',
    embedding   vector(1536),
    UNIQUE (document_id, chunk_index)
);
```

Index pour les métadonnées :

| Besoin | Index |
| --- | --- |
| Égalité ou plage sur des colonnes | B-tree ; un index composite `(category_id, price)` sert les filtres sur `category_id` et sur les deux, pas sur `price` seul (règle de la colonne de gauche) |
| Contenance et tests de clés `jsonb` (`@>`, `?`, `?|`, `?&`) | `USING gin (attributes)` |
| Plage sur un champ `jsonb` | Index d'expression `((attributes->>'price')::numeric)` |
| Requêtes qui portent toujours le même prédicat | Index partiel `... WHERE in_stock = true` |
| Des dizaines de millions de lignes, un filtre sur une date ou un locataire, d'anciennes données à supprimer | Partitionnement par plage, liste ou hachage ; un index créé sur la table parente est créé sur chaque partition |

> **Piège d'examen.** Un index partiel n'est utilisé que si le `WHERE` de la requête correspond à son prédicat sous la même forme : un index défini avec `WHERE tier = 'premium'` n'est pas utilisé par `WHERE tier LIKE 'premium'`.

<!-- section: vector-indexes | objectives: 2.2.3 -->
## Indexer les vecteurs pour la latence et le calcul

Sans index, pgvector exécute une recherche **exacte** : rappel parfait, une analyse séquentielle dont le coût croît avec la table. Un index de plus proches voisins approximatifs (ANN) échange un peu de rappel contre de la vitesse ; Learn le juge indispensable au-delà d'un million de lignes et peu utile sous environ 10 000.

| Index | Construction | Points forts | Paramètres (défaut) |
| --- | --- | --- | --- |
| IVFFlat | Entraînement k-means sur les lignes existantes : chargez d'abord les données | Construction rapide, peu de mémoire ; plafond de rappel plus bas, reconstruction parfois nécessaire quand les données dérivent | `lists` à la construction ; `ivfflat.probes` à la requête (1) |
| HNSW | Graphe multicouche, sans entraînement : peut être créé sur une table vide | Meilleur compromis vitesse-rappel ; plus de mémoire (environ 50 % des données vectorielles) et construction plus lente | `m` (16), `ef_construction` (64) ; `hnsw.ef_search` à la requête (40) |
| DiskANN (`pg_diskann`, Azure uniquement) | Graphe, sans entraînement | Rappel élevé avec des constructions rapides, adapté aux très grandes tables ; la quantification de produit réduit la mémoire | `max_neighbors` (32), `l_value_ib` (100) ; `diskann.l_value_is` à la requête (100) |

La **classe d'opérateurs doit correspondre à l'opérateur de la requête**, sinon le planificateur ignore l'index :

| Distance | Opérateur | Classe d'opérateurs |
| --- | --- | --- |
| Cosinus | `<=>` | `vector_cosine_ops` |
| Euclidienne (L2) | `<->` | `vector_l2_ops` |
| Produit scalaire négatif | `<#>` | `vector_ip_ops` |

Les trois renvoient une **distance** : plus elle est petite, plus les vecteurs sont similaires. Pour des vecteurs normalisés à une longueur de 1, comme les incorporations OpenAI, le produit scalaire donne le même classement que le cosinus et c'est le plus rapide.

```text
CREATE INDEX CONCURRENTLY idx_chunks_embedding
ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

BEGIN;
SET LOCAL hnsw.ef_search = 100;      -- higher recall for this transaction only
SELECT id, content FROM document_chunks
ORDER BY embedding <=> %s::vector
LIMIT 10;
COMMIT;
```

Règles de réglage :

- IVFFlat : commencez avec `lists` = lignes / 1000 jusqu'à un million de lignes, `sqrt(lignes)` au-delà ; `probes` = `lists` / 10, ou `sqrt(lists)` pour les grandes tables. Sonder toutes les listes revient à une recherche exhaustive.
- HNSW : `ef_construction` au moins égal à `2 * m` ; augmentez `m` (32) pour le rappel au prix de la mémoire et du temps de construction ; modifier `m` ou `ef_construction` impose une reconstruction ; gardez `hnsw.ef_search` au moins égal à `LIMIT`, 100 à 200 pour une grande précision, environ 20 pour les appels où la latence est critique.
- `CREATE INDEX` bloque les écritures ; `CREATE INDEX CONCURRENTLY` ne les bloque pas, mais prend plus de temps. Suivez une construction avec `pg_stat_progress_create_index` ; reconstruisez avec `REINDEX INDEX CONCURRENTLY` quand le rappel se dégrade.
- pgvector indexe des colonnes `vector` d'au plus **2 000 dimensions** ; au-delà, réduisez les dimensions (beaucoup de charges de travail utilisent 768 ou 1 024) ou utilisez DiskANN, qui atteint 16 000 dimensions avec `product_quantized = true`.
- Vérifiez le plan avec `EXPLAIN (ANALYZE, BUFFERS)` : analyse d'index, workers parallèles, index partiel et élimination de partitions. `idx_scan` dans `pg_stat_user_indexes` indique si un index est utilisé.

> **Piège d'examen.** Un index construit avec `vector_cosine_ops` ne sert pas `ORDER BY embedding <-> ...`. La requête revient à une analyse séquentielle, avec des résultats justes mais lents.

<!-- section: resources | objectives: 2.2.4 -->
## Dimensionner le calcul, la mémoire et le stockage pour les vecteurs

| Niveau | Mémoire par vCore | Charges de travail vectorielles |
| --- | --- | --- |
| Burstable (série B) | 2 à 4 Gio | Développement et tests uniquement : les crédits CPU s'épuisent sous une charge soutenue, pas de PgBouncer intégré |
| General Purpose (série D) | 4 Gio | Moins d'environ un million de vecteurs, 4 à 8 vCores |
| Memory Optimized (série E) | 6,75 à 9,5 Gio | Des millions de vecteurs : la mémoire doit dépasser d'au moins 50 % la taille de l'index vectoriel |

Les recherches vectorielles sont rapides quand l'index reste en mémoire. Estimez-le : 1 536 dimensions occupent environ 6 Ko par ligne, donc un million de lignes demandent environ 6 Go pour la colonne, et un index HNSW ajoute à peu près la moitié. Montez en puissance (plus de vCores et de mémoire) contre la latence et la pression mémoire ; montez en charge avec des **réplicas en lecture** (jusqu'à cinq, asynchrones) pour un trafic de lecture qui tolère un léger retard, en gardant les requêtes de lecture après écriture sur le serveur principal. Les vCores peuvent être modifiés après la création et le stockage augmenté (32 Gio à 64 Tio).

| Paramètre | Recommandation |
| --- | --- |
| `shared_buffers` | Fixé selon le niveau (environ 25 % de la mémoire) ; un taux d'accès au cache inférieur à 99 % suggère plus de mémoire |
| `work_mem` | Par opération et par connexion : augmentez-le par transaction (`SET LOCAL work_mem = '256MB'`), pas globalement |
| `maintenance_work_mem` | Mémoire d'une construction d'index : augmentez-la (et le calcul) pendant la construction, puis redescendez |
| `max_parallel_maintenance_workers`, `parallel_workers` de la table | Constructions d'index parallèles ; `max_worker_processes` impose un redémarrage |
| `max_parallel_workers_per_gather` | Recherches exactes parallèles sans index |
| `random_page_cost` | 1,1 à 1,5 sur un stockage SSD au lieu de 4,0 |

```bash
az postgres flexible-server parameter set \
  --resource-group rg-rag --server-name contoso-rag \
  --name azure.extensions --value "vector,azure_ai,pg_diskann"
```

Surveillez CPU percent, Memory percent, Storage IO percent et Active connections dans Azure Monitor ; un Storage IO élevé signifie souvent que le jeu de données actif ne tient pas en mémoire.

> **Conseil d'examen.** « Coût le plus bas pour une preuve de concept » désigne Burstable. « Des millions d'incorporations, l'index doit rester en mémoire » désigne Memory Optimized. « Regroupement de connexions » exclut Burstable.

<!-- section: vector-rag | objectives: 2.2.5 -->
## Recherche vectorielle et RAG avec filtres de métadonnées

Une requête RAG incorpore la question de l'utilisateur avec le **même modèle** que les segments stockés, récupère les segments les plus proches que l'utilisateur a le droit de voir, puis les envoie au modèle de conversation comme ancrage. L'incorporation peut être calculée par l'application ou en SQL avec l'extension `azure_ai` :

```text
SELECT azure_ai.set_setting('azure_openai.endpoint', 'https://contoso-oai.openai.azure.com');
SELECT azure_ai.set_setting('azure_openai.subscription_key', '<key>');

UPDATE document_chunks
SET embedding = azure_openai.create_embeddings('text-embedding-3-small', content)::vector
WHERE embedding IS NULL;
```

`azure_openai.create_embeddings` prend le **nom du déploiement**, le texte (ou un tableau `text[]` avec `batch_size`, 100 par défaut), et `timeout_ms`, `throw_on_error` (true par défaut : une erreur annule la transaction), `max_attempts` (1 par défaut) et `retry_delay_ms`. Elle renvoie un `real[]`, converti en `vector`.

Récupération avec un filtre de métadonnées, un seuil de distance et un top-k, depuis Python :

```text
question_vector = embed(question)          # list of 1536 floats from the same model

sql = """
SELECT c.content, d.title, d.source_url,
       1 - (c.embedding <=> %(q)s::vector) AS similarity
FROM document_chunks AS c
JOIN source_documents AS d ON d.id = c.document_id
WHERE d.tenant_id = %(tenant)s
  AND c.embedding <=> %(q)s::vector < 0.5
ORDER BY c.embedding <=> %(q)s::vector
LIMIT 5
"""
with pool.connection() as conn:
    chunks = conn.execute(sql, {"q": str(question_vector), "tenant": tenant_id}).fetchall()
```

| Exigence | Technique |
| --- | --- |
| Seulement le locataire, la catégorie ou la plage de dates de l'appelant | Filtre `WHERE` sur des colonnes de métadonnées indexées, dans la même requête que le `ORDER BY` sur la distance |
| Filtre sélectif (quelques pour cent des lignes) | Préfiltrage : l'index de métadonnées réduit les candidats avant le calcul des distances |
| Filtre qui ne peut pas utiliser d'index | Post-filtrage : une CTE récupère plus de candidats (`LIMIT 100`), la requête externe filtre et en garde 10 |
| Écarter les correspondances faibles | Seuil de distance (`<=> ... < 0.5`) ; similarité cosinus = 1 − distance cosinus |
| Rester dans le contexte du modèle | Top-k avec `LIMIT`, plus une somme cumulée de `token_count` |
| Citer les sources | Joindre le segment à son document et renvoyer le titre et l'URL |
| DiskANN avec un filtre qui élimine beaucoup de voisins | Laissez `diskann.iterative_search` actif (`relaxed_order` par défaut, `strict_order` pour des lots triés) ; `off` renvoie au plus `l_value_is` lignes quel que soit le `LIMIT` |

> **Piège d'examen.** Un index approximatif explore un nombre fixe de candidats avant que le `WHERE` soit appliqué : un filtre sélectif peut renvoyer moins de lignes que `LIMIT`. Augmentez `hnsw.ef_search`, utilisez un index partiel pour une valeur de filtre fréquente, ou post-filtrez un ensemble de candidats plus large.

<!-- section: connection-optimization | objectives: 2.2.6 -->
## Optimiser les connexions

PostgreSQL utilise un processus par connexion : des milliers de connexions inactives ou de courte durée gaspillent la mémoire, et chaque niveau a une limite de connexions (50 en B1ms, 859 en General Purpose 2 vCores, 5 000 en Memory Optimized 16 vCores). Deux couches réduisent ce coût.

**PgBouncer intégré** s'exécute sur le serveur (General Purpose et Memory Optimized uniquement). Passez `pgbouncer.enabled` à `true` (sans redémarrage) et connectez-vous au port **6432** au lieu de 5432 ; le nom d'hôte ne change pas et l'authentification Microsoft Entra fonctionne.

| Paramètre | Défaut |
| --- | --- |
| `pgbouncer.pool_mode` | `transaction` |
| `pgbouncer.default_pool_size` | 50 connexions serveur par paire utilisateur et base de données |
| `pgbouncer.max_client_conn` | 5000 |
| `pgbouncer.query_wait_timeout` | 120 secondes |
| `pgbouncer.max_prepared_statements` | 0 (au-dessus de 0 pour les instructions préparées au niveau du protocole en mode transaction) |

| Mode de pool | Connexion serveur conservée | Limites |
| --- | --- | --- |
| Session | Jusqu'à la déconnexion du client | Toutes les fonctionnalités, peu de réduction |
| Transaction (recommandé) | Pendant une transaction | `SET` ne persiste pas d'une transaction à l'autre : utilisez `SET LOCAL` ; `LISTEN`/`NOTIFY` et `PREPARE` au niveau SQL ne fonctionnent pas |
| Statement | Pendant une instruction | Pas de transactions à plusieurs instructions, pas d'instructions préparées |

Le **regroupement côté application** garde des connexions ouvertes dans chaque instance :

```text
from psycopg_pool import ConnectionPool

pool = ConnectionPool(
    conninfo="host=contoso-rag.postgres.database.azure.com port=6432 dbname=kb "
             "user=rag-api sslmode=require connect_timeout=10 "
             "options='-c statement_timeout=30000'",
    kwargs={"password": token},   # Microsoft Entra token, as in the first section
    min_size=5,          # baseline traffic without waiting
    max_size=20,         # database limit divided by the number of instances
    max_idle=300,        # close connections idle for 5 minutes
    max_lifetime=3600,   # recycle connections every hour
)

with pool.connection() as conn:     # returned to the pool even after an exception
    conn.execute("SELECT 1")
```

Dimensionnez `max_size` à partir du serveur : 10 instances et 1 000 connexions autorisées donnent au plus 100 par instance, moins une marge. Créez le pool et les informations d'identification une fois par processus, pas à chaque requête. Une opération de mise à l'échelle, un basculement ou un redémarrage redémarre aussi PgBouncer : l'application doit se reconnecter et réessayer.

> **Piège d'examen.** Les erreurs « too many connections » venant de nombreuses instances d'application se résolvent par le regroupement (PgBouncer sur 6432 et un pool client), pas d'abord par un niveau plus grand. Et passer en Burstable supprime le PgBouncer intégré.

<!-- section: key-points -->
## Points clés

- psycopg 3 avec un jeton Microsoft Entra comme mot de passe, étendue `https://ossrdbms-aad.database.windows.net/.default`, `sslmode=require`, paramètres `%s`.
- Autorisez `vector` dans `azure.extensions`, puis `CREATE EXTENSION vector` dans chaque base ; `vector(n)` doit correspondre au modèle ; attributs filtrables dans des colonnes typées, attributs dynamiques en `jsonb` avec GIN.
- IVFFlat : construction rapide après chargement, `lists` et `probes`. HNSW : meilleur rappel, `m`, `ef_construction`, `hnsw.ef_search` (40). DiskANN : Azure uniquement, grandes tables, quantification. La classe d'opérateurs doit correspondre à `<=>`, `<->` ou `<#>`.
- Indexable jusqu'à 2 000 dimensions avec pgvector ; `CREATE INDEX CONCURRENTLY` en production.
- Memory Optimized pour de grands ensembles de vecteurs, index en mémoire avec 50 % de marge ; Burstable pour le développement uniquement.
- RAG : même modèle d'incorporation, filtre de métadonnées `WHERE` plus `ORDER BY` sur la distance plus `LIMIT` ; `azure_openai.create_embeddings` prend le nom du déploiement.
- PgBouncer sur 6432 en mode transaction (pas en Burstable), `SET LOCAL`, et un `ConnectionPool` dimensionné par instance.
