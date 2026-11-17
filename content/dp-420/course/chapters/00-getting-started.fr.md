Le DP-420 est l'examen de la certification Microsoft Certified: Azure Cosmos DB AI Developer Associate (l'ancienne Azure Cosmos DB Developer Specialty, renommée et passée au niveau associé le 6 octobre 2026). Il vise un développeur qui écrit du C# ou du Python pour Azure Cosmos DB for NoSQL : modèles de données et clés de partition, code SDK, requêtes et stratégies, sécurité et performances, et le volet IA du service (recherche vectorielle, en texte intégral et hybride, RAG, mémoire d'agent, Microsoft Fabric). Il évalue ce que vous codez et configurez : la plupart des questions montrent un extrait de code, une requête, une stratégie JSON ou un paramètre à choisir ou à compléter.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 100 minutes d'examen |
| Questions | Nombre non publié ; prévoyez environ 45 à 58 questions, avec une étude de cas et une série problème-solution |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Aucun point retiré : répondez toujours |
| Questions à plusieurs éléments | En général un point par élément correct |
| Documentation | Microsoft Learn est accessible pendant les examens de niveau associé, mais le chronomètre continue : vérifiez un paramètre, n'apprenez pas un sujet |
| Composants interactifs | Annoncés comme possibles par Microsoft |
| Compétences mesurées | À partir du 6 octobre 2026 (la liste des compétences a été largement réécrite) |
| Fonctionnalités en préversion | La plupart des questions portent sur des fonctionnalités en disponibilité générale ; des préversions couramment utilisées peuvent apparaître |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les trois domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Concevoir et développer des solutions de base de données | 40 à 45 % |
| Sécuriser, optimiser et déployer des solutions de base de données | 30 à 35 % |
| Implémenter des fonctionnalités d'IA et d'analytique dans les solutions de base de données | 20 à 25 % |

Formats attendus : une réponse parmi quatre ou cinq, plusieurs réponses (« chaque réponse correcte présente une partie de la solution »), du code avec deux à quatre listes déroulantes, des affirmations Oui/Non, du glisser-déposer et la mise en ordre d'étapes. On ne peut pas prendre de pause pendant une série problème-solution, et une fois une pause commencée, on ne peut plus revenir aux questions vues avant elle. Certaines questions ne sont pas notées, sans que l'on sache lesquelles.

Si l'examen n'est pas disponible dans votre langue, vous pouvez demander 30 minutes supplémentaires. La version anglaise est mise à jour en premier ; les versions traduites suivent environ huit semaines plus tard.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases : une entreprise fictive, un modèle d'accès (« lire une commande par son ID », « lister les 20 derniers messages d'une conversation »), un volume ou un budget de RU, et **une contrainte décisive** : coût en RU le plus faible, latence la plus faible, garantie de cohérence, isolation des locataires, aucune modification de code. Soulignez d'abord cette contrainte : elle élimine souvent la moitié des options.

| Mots de la question | Pensez à |
| --- | --- |
| « les utilisateurs doivent toujours voir leurs propres modifications », « coût le plus faible » | Cohérence Session, pas Strong |
| « lire un élément dont l'ID et la clé de partition sont connus », « RU le plus faible » | Lecture ponctuelle (`ReadItemAsync`, `read_item`), pas une requête |
| « trafic imprévisible », « ne payer le pic que lorsqu'il a lieu » | Mise à l'échelle automatique (autoscale) ; serverless si le trafic est intermittent et monorégion |
| « modifier une seule propriété », « réduire la charge réseau » | Patch (mise à jour partielle de document) |
| « tout ou rien », « même client » | Lot transactionnel sur une seule valeur de clé de partition logique |
| « importer des millions d'éléments le plus vite possible » | Exécution en bloc (`AllowBulkExecution`) |
| « ne pas écraser une mise à jour concurrente » | Contrôle d'accès concurrentiel optimiste : `_etag` avec If-Match, HTTP 412 |
| « supprimer automatiquement au bout de 30 jours » | Durée de vie (`DefaultTimeToLive`, `ttl` de l'élément) |
| « un locataire peut dépasser 20 Go » | Clés de partition hiérarchiques avec un dernier niveau à forte cardinalité |
| « toutes les écritures vont sur la date du jour » | Partition chaude : clé synthétique avec suffixe |
| « une partition physique à 100 % alors que les autres sont basses » | Clé de partition chaude, pas un manque de débit |
| « réagir à chaque insertion et mise à jour » | Flux de modification (processeur ou modèle par tirage) |
| « aucune clé dans le code » | Microsoft Entra ID avec un rôle de plan de données Cosmos DB |
| « trouver des documents sémantiquement proches » | Stratégie et index vectoriels, `VectorDistance` |
| « combiner pertinence par mots-clés et pertinence sémantique » | Recherche hybride : `RRF` sur `FullTextScore` et `VectorDistance` |

Les questions de code montrent du C# ou du Python à trous : l'option du client, la méthode, l'option de requête, le paramètre qui porte la clé de partition ou l'ETag. Relisez chaque extrait de ce cours jusqu'à pouvoir dire ce que fait chaque ligne. Le code C#, Python et les requêtes sont présentés dans des blocs de texte brut.

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les notions faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Lecture ponctuelle | Requête sur `c.id` | Une lecture ponctuelle par ID et clé de partition coûte environ 1 RU pour un élément de 1 Ko ; le même élément lu par une requête coûte plus, et beaucoup plus sans la clé de partition |
| Session | Strong | Session garantit la lecture de ses propres écritures à une session, au coût d'un seul réplica ; Strong donne à tous la dernière écriture, double les RU de lecture et n'est pas possible avec des écritures multirégions |
| Bounded staleness (obsolescence limitée) | Consistent prefix (préfixe cohérent) | L'obsolescence limitée borne le retard (K versions ou T secondes) ; le préfixe cohérent garantit seulement l'ordre |
| Débit manuel | Autoscale | Le débit manuel facture chaque heure les RU/s provisionnées ; l'autoscale facture les RU/s les plus élevées atteintes dans l'heure, entre 10 % et 100 % du maximum, à 1,5 fois le tarif manuel (une seule région d'écriture) |
| Autoscale | Serverless | L'autoscale ne descend jamais sous 10 % de son maximum ; le serverless ne facture que les RU consommées mais fonctionne dans une seule région |
| Débit dédié | Débit partagé de base de données | Les RU/s dédiées sont réservées à un conteneur et couvertes par le SLA ; les RU/s partagées sont réparties entre 25 conteneurs au plus, sans garantie par conteneur |
| Partition logique | Partition physique | Une partition logique est une valeur de clé (20 Go maximum) ; une partition physique en héberge beaucoup (50 Go, 10 000 RU/s) |
| Clé de partition hiérarchique | Clé de partition synthétique | Les clés hiérarchiques sont jusqu'à trois chemins réels avec routage par préfixe ; une clé synthétique est une propriété construite par votre code par concaténation ou suffixe |
| Incorporer | Référencer | Incorporez ce qui est borné, lu ensemble et rarement modifié ; référencez ce qui est non borné, plusieurs-à-plusieurs ou souvent modifié |
| Lot transactionnel | Exécution en bloc | Un lot est atomique, sur une seule partition logique, 100 opérations au plus ; l'exécution en bloc maximise le débit et chaque opération réussit ou échoue seule |
| Replace | Patch | Replace envoie l'élément entier ; patch envoie jusqu'à 10 opérations sur des chemins |
| Upsert | Create | Create échoue avec 409 si l'ID existe dans la partition ; upsert crée ou remplace |
| ETag (If-Match) | Jeton de session | L'ETag empêche les mises à jour perdues ; le jeton de session garantit la lecture de ses propres écritures |
| Flux de modification en mode dernière version | Mode toutes les versions et suppressions | La dernière version montre l'état final des éléments modifiés et aucune suppression ; toutes les versions et suppressions montre chaque modification, suppressions comprises |
| Processeur de flux de modification | Modèle par tirage | Le processeur stocke des baux dans un conteneur de bail et répartit le travail entre instances ; le modèle par tirage laisse la position et l'interrogation à votre code |
| Rôle Azure RBAC sur le compte | Rôle de plan de données Cosmos DB | Contributor gère le compte ; lire des éléments avec Microsoft Entra ID exige un rôle de plan de données comme Cosmos DB Built-in Data Reader |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le premier module (modèle de ressources, opérations, partitionnement, flux de modification) donne le vocabulaire que reprennent la sécurité, les performances et la recherche par IA.
2. Créez un compte au niveau gratuit (ou utilisez l'émulateur) et un conteneur partitionné sur une clé réaliste. Chargez quelques milliers d'éléments avec le SDK et affichez le coût en RU de chaque opération : une lecture ponctuelle, le même élément par requête, un patch, un lot.
3. Écrivez les mêmes opérations en C# et en Python : l'examen peut montrer l'un ou l'autre, et les noms de méthodes diffèrent (`ReadItemAsync` et `read_item`, `QueryDefinition` et `parameters`).
4. Changez un paramètre à la fois (cohérence imposée par le client, stratégie d'indexation, taille de page, clé de partition) et observez le coût en RU et le résultat.
5. Entraînez-vous à trouver rapidement une page sur Microsoft Learn (référence du SDK, limites, fonctions de requête) : pendant l'examen, c'est votre référence.
6. Après chaque module, passez un examen blanc et relisez les sections liées à vos erreurs. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
