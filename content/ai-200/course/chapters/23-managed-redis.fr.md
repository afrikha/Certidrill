Azure Managed Redis est le magasin de données en mémoire d'une solution IA : il met en cache les résultats de base de données, les réponses des modèles et les sessions avec une expiration, et son module de recherche (RediSearch) indexe les incorporations (embeddings) pour la recherche de similarité vectorielle. Les questions d'examen montrent du code `redis-py` à compléter : la connexion, une commande avec la bonne expiration, une invalidation après une écriture, un schéma d'index vectoriel ou une requête KNN.

<!-- section: connect | objectives: 2.3.1 -->
## Se connecter depuis Python

Azure Managed Redis exécute le logiciel Redis Enterprise (Redis 7.4) et s'utilise avec le client standard `redis-py`. Ses niveaux diffèrent par le rapport entre mémoire et vCPU :

| Niveau | Mémoire:vCPU | Usage |
| --- | --- | --- |
| Memory Optimized | 8:1 | Grands jeux de données, débit modéré, développement et test |
| Balanced | 4:1 | Charges de travail standard |
| Compute Optimized | 2:1 | Débit le plus élevé |
| Flash Optimized | RAM plus NVMe | Très grands jeux de données à moindre coût ; pas de RediSearch, RedisBloom ni RedisTimeSeries |

La haute disponibilité (un réplica sur un second nœud, réparti entre zones quand la région en a) est activée par défaut ; ne la désactivez que pour le développement, car une panne de nœud fait alors perdre des données. L'authentification Microsoft Entra ID, les points de terminaison privés et TLS sont disponibles à tous les niveaux.

```text
import redis
from redis_entraid.cred_provider import create_from_default_azure_credential

credential_provider = create_from_default_azure_credential(
    ("https://redis.azure.com/.default",),
)

r = redis.Redis(
    host="contoso-cache.westeurope.redis.azure.net",
    port=10000,
    ssl=True,
    decode_responses=True,               # str instead of bytes
    credential_provider=credential_provider,
)
```

| Paramètre | Règle |
| --- | --- |
| Port | **10000** pour Azure Managed Redis ; 6380 était le port TLS d'Azure Cache for Redis |
| Authentification | Clé d'accès dans `password` pour les configurations simples ; Microsoft Entra ID avec le package `redis-entraid` et l'étendue `https://redis.azure.com/.default` en production |
| Classe cliente | `redis.Redis` pour les stratégies Enterprise et non cluster ; `redis.cluster.RedisCluster` pour la stratégie de clustering OSS |
| `decode_responses` | `True` pour des valeurs texte ; `False` pour des valeurs binaires comme les octets d'un vecteur, des images ou des objets sérialisés avec pickle |
| Connexions | `redis-py` regroupe les connexions : créez un client par processus et réutilisez-le |

> **Piège d'examen.** Du code copié d'un exemple Azure Cache for Redis utilise le port 6380 et échoue avec Azure Managed Redis, qui écoute sur 10000. Azure Cache for Redis est en cours de mise hors service ; les nouvelles solutions utilisent Azure Managed Redis.

<!-- section: caching-expiration | objectives: 2.3.1 -->
## Mettre en cache avec expiration

Le modèle **cache-aside** (chargement différé) est le choix par défaut pour les résultats de base de données et les appels de modèle coûteux : lire le cache, en cas d'absence lire la source, puis écrire le résultat dans le cache **avec une durée de vie (TTL)**.

```text
import json

def get_product_summary(product_id: str) -> dict:
    key = f"product:{product_id}:summary"
    cached = r.get(key)
    if cached:
        return json.loads(cached)                       # cache hit

    summary = summarize_with_model(load_product(product_id))   # cache miss
    r.set(key, json.dumps(summary), ex=900)             # 15-minute TTL
    return summary
```

| Commande (`redis-py`) | Effet |
| --- | --- |
| `r.set(key, value, ex=300)` / `r.setex(key, 300, value)` | Écrire avec un TTL en secondes |
| `r.set(key, value, px=5000)` / `r.psetex(key, 5000, value)` | Écrire avec un TTL en millisecondes |
| `r.set(key, value, nx=True, ex=30)` | Écrire seulement si la clé n'existe pas (verrou simple ou premier écrivain gagnant) |
| `r.expire(key, 3600)` / `r.pexpire` / `r.expireat(key, unix_time)` | Ajouter ou modifier le TTL d'une clé existante, quel que soit son type de données |
| `r.ttl(key)` / `r.pttl(key)` | TTL restant ; `-1` = pas d'expiration, `-2` = la clé n'existe pas |
| `r.persist(key)` | Supprimer l'expiration |
| `r.hset(key, mapping={...})` / `r.hget` / `r.hgetall` | Stocker un objet sous forme de hachage de champs |
| `r.mset({...})` / `r.mget(k1, k2)` | Plusieurs clés en un appel |
| `r.pipeline()` ... `pipe.execute()` | Regrouper des commandes en un seul aller-retour réseau |

Choisissez le TTL selon la fréquence de modification des données et le retard acceptable : 1 à 5 minutes pour des données qui changent souvent, 15 à 60 minutes pour un rythme modéré, 1 à 24 heures pour des données stables, davantage pour des données de référence statiques. Nommez les clés de façon hiérarchique avec des deux-points (`user:1001:profile`) pour que les clés liées partagent un préfixe.

Les mêmes commandes servent les autres modèles de Learn : un **magasin de sessions** (données de session sous `session:<id>` avec un TTL glissant renouvelé par `expire` à chaque requête), un cache de contenu pour des fragments de page, et la déduplication avec les filtres de Bloom de RedisBloom. Le nombre de connexions clientes qu'une instance accepte augmente avec son niveau et sa taille (15 000 pour la plus petite taille Balanced), une raison de plus de partager un client par processus.

> **Piège d'examen.** `r.set(key, value)` suivi plus tard de `r.expire(key, 60)` fait deux allers-retours et laisse la clé sans TTL si le processus s'arrête entre les deux. Définissez la valeur et le TTL en une seule commande : `ex=` ou `setex`. Et une mise à jour avec un simple `set` supprime le TTL existant.

<!-- section: invalidation | objectives: 2.3.1 -->
## Invalider et évincer

Un TTL borne le retard ; l'**invalidation** supprime une entrée dès que la source change. En cache-aside, le code qui écrit dans la base de données supprime les clés liées, et la lecture suivante les recharge :

```text
def update_user_profile(user_id: int, profile: dict) -> None:
    save_to_database(user_id, profile)               # 1. update the system of record
    r.delete(f"user:{user_id}:profile",              # 2. invalidate related entries
             f"user:{user_id}:summary",
             f"dashboard:user:{user_id}")

def invalidate_user(user_id: int) -> int:
    deleted, cursor = 0, 0
    while True:                                      # SCAN is incremental, KEYS blocks the server
        cursor, keys = r.scan(cursor, match=f"user:{user_id}:*", count=100)
        if keys:
            deleted += r.delete(*keys)
        if cursor == 0:
            return deleted
```

| Exigence | Technique |
| --- | --- |
| Les données peuvent avoir quelques minutes de retard | TTL seul |
| Les lecteurs doivent voir une modification immédiatement | Supprimer les clés après l'écriture en base (en gardant un TTL comme filet de sécurité) |
| Supprimer toutes les clés d'un utilisateur ou d'un locataire | `SCAN` avec `match=` et suppression par lots ; jamais `KEYS` en production |
| La mémoire est pleine | La stratégie d'éviction supprime des clés : les stratégies `volatile-*` choisissent parmi les clés qui ont un TTL, `allkeys-*` parmi toutes les clés, `noeviction` refuse les écritures |
| Redémarrer plus vite après un incident | Persistance des données (instantanés sur disque) ; ce n'est pas une sauvegarde et le cache n'est pas le système de référence |

Pour les charges de travail IA, le même modèle met en cache les incorporations de textes fréquents et les réponses à des prompts répétés. Un **cache sémantique** va plus loin : il stocke l'incorporation de chaque prompt avec la réponse et renvoie une réponse en cache quand un nouveau prompt est assez proche, trouvé avec la recherche vectorielle ci-dessous.

> **Piège d'examen.** Supprimer l'entrée du cache **avant** de mettre à jour la base permet à un lecteur concurrent de recharger l'ancienne valeur dans le cache. Mettez d'abord la source à jour, puis invalidez.

<!-- section: vector-index | objectives: 2.3.2 -->
## Créer un index vectoriel

La recherche vectorielle vient du module **RediSearch**. Les modules ne peuvent être ajoutés **qu'à la création de l'instance** (onglet Avancé), ne peuvent pas être chargés plus tard, et RediSearch exige :

- un niveau en mémoire (pas Flash Optimized) ;
- la stratégie de clustering **Enterprise** ou **non cluster**, pas OSS.

Avec la géoréplication active, seuls RediSearch et RedisJSON peuvent être utilisés.

Un index couvre toutes les clés dont le nom commence par un **préfixe** ; les clés écrites avec ce préfixe sont indexées automatiquement en arrière-plan.

```text
from redis.commands.search.field import NumericField, TagField, TextField, VectorField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

schema = (
    TextField("content"),
    TagField("category"),                  # exact-match filter: @category:{manuals}
    NumericField("year"),                  # range filter: @year:[2024 +inf]
    VectorField(
        "embedding",
        "HNSW",                            # or "FLAT"
        {"TYPE": "FLOAT32", "DIM": 1536, "DISTANCE_METRIC": "COSINE"},
    ),
)

r.ft("idx:docs").create_index(
    fields=schema,
    definition=IndexDefinition(prefix=["doc:"], index_type=IndexType.HASH),
)
```

| Choix | Options |
| --- | --- |
| Algorithme | `FLAT` : force brute, exact, pour moins d'environ 10 000 vecteurs ; `HNSW` : graphe, approximatif (95 à 99 % de précision), rapide sur de grands jeux de données |
| `TYPE` | `FLOAT32` (4 octets par dimension, la norme) ; `FLOAT64` double la mémoire sans bénéfice pour la recherche IA |
| `DIM` | Exactement la sortie du modèle (1536 pour `text-embedding-3-small`) ; les autres tailles sont refusées |
| `DISTANCE_METRIC` | `COSINE` pour les incorporations de texte, `L2` pour les incorporations d'images et spatiales, `IP` seulement pour des vecteurs normalisés |

Les vecteurs sont stockés sous forme d'**octets** dans un hachage, ou sous forme de tableau de nombres dans un document JSON :

| | Hachage (`IndexType.HASH`) | JSON (`IndexType.JSON`, RedisJSON) |
| --- | --- | --- |
| Format du vecteur | `np.array(v, dtype=np.float32).tobytes()` | `v.tolist()` |
| Noms de champs du schéma | `"embedding"` | JSONPath avec alias : `VectorField("$.embedding", ..., as_name="embedding")` |
| Mémoire et vitesse | Moins de mémoire, plus rapide | Surcoût du format JSON |
| Modèle de données | Champs plats | Objets imbriqués, plusieurs vecteurs par élément |

```text
import numpy as np

pipe = r.pipeline()
for doc in docs:
    pipe.hset(f"doc:{doc['id']}", mapping={
        "content": doc["content"],
        "category": doc["category"],
        "year": doc["year"],
        "embedding": np.array(doc["embedding"], dtype=np.float32).tobytes(),
    })
pipe.execute()
```

> **Piège d'examen.** Le vecteur doit être en octets `float32` quand `TYPE` vaut `FLOAT32` : une liste Python, une chaîne JSON ou des octets `float64` dans un champ de hachage ne sont pas un vecteur valide. Utilisez un client avec `decode_responses=False` pour relire les octets.

<!-- section: vector-query | objectives: 2.3.2 -->
## Interroger par similarité

```text
from redis.commands.search.query import Query

query_vec = np.array(embed(question), dtype=np.float32).tobytes()

q = (
    Query("(@category:{manuals} @year:[2024 +inf])=>[KNN 5 @embedding $vec AS score]")
    .return_fields("content", "category", "score")
    .sort_by("score")
    .dialect(2)
)
results = r.ft("idx:docs").search(q, query_params={"vec": query_vec})
```

| Élément | Sens |
| --- | --- |
| `*` ou un filtre avant `=>` | Documents à considérer : tous, ou ceux qui correspondent à des filtres d'étiquette, numériques ou texte (requête hybride) |
| `KNN 5 @embedding $vec` | Les 5 plus proches voisins dans le champ vectoriel, le vecteur de requête étant passé en paramètre |
| `AS score` | Renvoie la distance : avec `COSINE`, 0 signifie identique et 2 opposé, donc **plus bas est meilleur** et le tri est croissant |
| `EF_RUNTIME 100` (dans les crochets) | Largeur de recherche HNSW : plus élevée, plus précise et plus lente ; commencez vers 50 et montez à 100–200 si le rappel est faible |
| `.dialect(2)` | Obligatoire pour les requêtes vectorielles |
| `@embedding:[VECTOR_RANGE 0.2 $vec]=>{$YIELD_DISTANCE_AS: score}` | Tous les documents sous un seuil de distance, au lieu d'un k fixe (recherche dans un cache sémantique) |

Dans une application RAG, l'étape de récupération incorpore la question avec le même modèle que les documents stockés, exécute la requête KNN avec les filtres auxquels l'appelant a droit (locataire, catégorie, date), et envoie les champs `content` renvoyés au modèle de conversation. Pour un cache sémantique, exécutez d'abord une requête `VECTOR_RANGE` sur l'index des prompts et n'appelez le modèle que si rien n'est sous le seuil.

> **Conseil d'examen.** Des réponses qui se ressemblent diffèrent souvent par un seul élément : un `.dialect(2)` manquant, `sort_by("score", asc=False)` avec une distance, un `TextField` utilisé avec la syntaxe d'étiquette `{...}`, ou un vecteur de requête d'une autre dimension ou d'un autre type que l'index.

<!-- section: key-points -->
## Points clés

- Azure Managed Redis écoute sur le port 10000 avec TLS ; Microsoft Entra ID via `redis-entraid` et l'étendue `https://redis.azure.com/.default` ; `RedisCluster` seulement pour la stratégie de clustering OSS.
- Cache-aside : lecture, en cas d'absence chargement et `set(..., ex=ttl)` en une commande ; TTL choisi selon l'exigence de fraîcheur.
- `ttl` renvoie -1 (pas d'expiration) ou -2 (pas de clé) ; un simple `set` efface le TTL.
- Invalidez après l'écriture en base avec `delete` ; `SCAN`, jamais `KEYS`, pour les motifs ; les stratégies d'éviction s'appliquent quand la mémoire est pleine.
- RediSearch se choisit à la création, exige un niveau en mémoire et la stratégie Enterprise ou non cluster.
- `VectorField` avec `FLAT` ou `HNSW`, `FLOAT32`, `DIM` = sortie du modèle, `COSINE` pour le texte ; vecteurs en octets `float32` dans les hachages.
- `KNN k @champ $param AS score`, filtres avant `=>`, `dialect(2)`, tri par distance croissante ; `EF_RUNTIME` arbitre entre précision et latence.
