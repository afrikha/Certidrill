Le DP-800 est l'examen de la certification Microsoft Certified: SQL AI Developer Associate. Il s'adresse à un développeur de bases de données qui conçoit et construit des solutions sur SQL Server, Azure SQL et la base de données SQL dans Microsoft Fabric, et qui y ajoute des fonctionnalités d'IA : embeddings, recherche vectorielle et hybride, appels à des modèles de langage depuis le T-SQL. Il teste ce que vous écrivez et configurez : la plupart des questions montrent du T-SQL, une configuration du générateur d'API de données (Data API builder) ou un pipeline de déploiement à lire, compléter ou corriger, ou un ensemble de contraintes qui décide de la fonctionnalité à utiliser.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 120 minutes d'examen |
| Questions | Nombre non publié ; prévoyez environ 45 à 58, dont une étude de cas et une série « la solution atteint-elle l'objectif ? » |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est accessible pendant l'examen, mais y chercher coûte du temps : servez-vous-en pour confirmer une syntaxe, pas pour apprendre un sujet |
| Laboratoires | Aucun annoncé sur Microsoft Learn |
| Compétences mesurées | Guide d'étude « à compter du 12 mars 2026 » ; la page française affiche déjà une version du 19 octobre 2026 avec des modifications mineures |
| Fonctionnalités en préversion | La plupart des questions portent sur des fonctionnalités en disponibilité générale ; une fonctionnalité en préversion peut apparaître si elle est couramment utilisée |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les trois domaines :

| Domaine | Poids |
| --- | --- |
| Concevoir et développer des solutions de base de données | 35 à 40 % |
| Solutions de base de données sécurisées, optimisées et déployées | 35 à 40 % |
| Implémenter des fonctionnalités IA dans les solutions de base de données | 25 à 30 % |

Formats attendus : une réponse parmi quatre ou cinq (le plus fréquent), du code avec deux à quatre listes déroulantes à compléter, plusieurs réponses (« chaque réponse correcte présente une partie de la solution »), affirmations Oui/Non, glisser-déposer de fragments de code, et mise en ordre d'étapes de déploiement. Dans une série « la solution atteint-elle l'objectif ? », le même scénario revient avec une solution différente à chaque fois, et vous ne pouvez pas revenir à une question précédente de la série. Les questions à plusieurs éléments rapportent en général un point par élément correct.

Si l'examen n'est pas disponible dans votre langue, vous pouvez demander 30 minutes supplémentaires.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases : une entreprise fictive, une définition de table ou un extrait de code, puis les contraintes qui décident de la réponse : privilège minimum, aucune modification de l'application, latence, coût, plateforme (SQL Server 2022, SQL Server 2025, Azure SQL Database, base de données SQL dans Fabric). Soulignez d'abord les contraintes et la plateforme : beaucoup de fonctionnalités récentes n'existent que sur certaines plateformes ou exigent un niveau de compatibilité.

| Mots de la question | Pensez à |
| --- | --- |
| « interroger les données telles qu'elles étaient à une date passée » | Table temporelle et `FOR SYSTEM_TIME AS OF` |
| « prouver que personne, administrateurs compris, n'a modifié les lignes » | Table de registre, condensés en stockage immuable |
| « interroger des fichiers Parquet sans les charger » | Table externe (virtualisation des données) |
| « stocker et interroger des documents JSON, indexer une propriété » | Colonne `json` avec `CREATE JSON INDEX`, ou colonne calculée `JSON_VALUE` |
| « la même série de numéros pour plusieurs tables » | Séquence |
| « supprimer instantanément une année de données » | `SWITCH` de partition ou `TRUNCATE ... WITH (PARTITIONS (...))` |
| « réutilisable dans une clause `FROM` avec un paramètre » | Fonction table inline |
| « les utilisateurs l'exécutent sans autorisation sur les tables » | Procédure stockée avec l'autorisation `EXECUTE` |
| « valider un format d'e-mail dans une contrainte » | `CHECK` avec `REGEXP_LIKE` (niveau de compatibilité 170) |
| « rapprocher des noms malgré des fautes de frappe » | `EDIT_DISTANCE`, `JARO_WINKLER_SIMILARITY` (préversion) |
| « les administrateurs ne doivent jamais voir le texte en clair » | Always Encrypted |
| « n'afficher que les quatre derniers chiffres au support » | Masquage dynamique des données |
| « chaque commercial ne voit que les lignes de sa région » | Row-Level Security |
| « trouver des documents de sens proche » | Embeddings et recherche vectorielle |
| « mots-clés exacts et sens à la fois » | Recherche hybride avec fusion de classement réciproque (RRF) |
| « exposer des tables en REST et GraphQL sans écrire d'API » | Data API builder |
| « envoyer chaque modification de ligne vers Azure Event Hubs » | Streaming d'événements de modification (CES) |

Les questions de code montrent du T-SQL à trous : la clause qui rend une CTE récursive, le cadre d'une fonction de fenêtre, la clause NULL de `JSON_OBJECT`, l'ordre des arguments de `REGEXP_REPLACE`. Relisez chaque extrait de ce cours jusqu'à pouvoir dire ce que fait chaque ligne. Le T-SQL de ce cours est présenté dans des blocs de texte brut.

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les notions faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Table temporelle | Table de registre | La table temporelle conserve un historique interrogeable ; le registre rend toute falsification détectable et ne peut pas être désactivé |
| Fonction table inline | Fonction table à instructions multiples | L'inline est un seul `SELECT` développé dans la requête ; l'autre remplit une variable de table que l'optimiseur voit comme opaque |
| Fonction scalaire | Fonction table | Une fonction scalaire retourne une valeur dans une expression ; une TVF retourne des lignes dans le `FROM` |
| `CROSS APPLY` | `OUTER APPLY` | `CROSS` supprime les lignes externes sans résultat ; `OUTER` les conserve avec des NULL |
| `RANK` | `DENSE_RANK` | Après un ex aequo, `RANK` saute des numéros, `DENSE_RANK` non |
| `JSON_VALUE` | `JSON_QUERY` | `JSON_VALUE` retourne une valeur scalaire ; `JSON_QUERY` retourne un objet ou un tableau |
| `THROW` | `RAISERROR` | `THROW` est la méthode moderne, gravité 16, relance avec `THROW;` ; `RAISERROR` est plus ancien et ignore `XACT_ABORT` |
| Always Encrypted | Chiffrement au niveau des colonnes | Always Encrypted chiffre dans le pilote client, le moteur ne voit jamais le texte en clair ; le chiffrement au niveau des colonnes utilise des clés stockées dans la base |
| Masquage dynamique des données | Row-Level Security | Le masquage cache une partie des valeurs dans les résultats ; RLS filtre les lignes retournées |
| Suivi des modifications | Capture des données modifiées (CDC) | Le suivi des modifications enregistre quelles lignes ont changé ; CDC conserve aussi les valeurs modifiées |
| CDC | Streaming d'événements de modification (CES) | CDC stocke les modifications dans des tables de la base ; CES (préversion) les diffuse sous forme de CloudEvents vers Azure Event Hubs ou Fabric Eventstream |
| READ COMMITTED SNAPSHOT | Isolation SNAPSHOT | RCSI donne à chaque instruction une version cohérente ; SNAPSHOT en donne une à toute la transaction, avec des conflits de mise à jour |
| Recherche en texte intégral | Recherche vectorielle | Le texte intégral fait correspondre des mots et leurs formes ; la recherche vectorielle fait correspondre le sens grâce aux embeddings |
| ENN (exact) | ANN (approximatif) | ENN compare la requête à chaque vecteur, exact mais lent à grande échelle ; ANN utilise un index vectoriel, rapide avec une légère perte de rappel |
| Point de terminaison REST | Point de terminaison GraphQL | REST expose une URL par entité ; GraphQL laisse le client choisir les champs et suivre les relations en une seule requête |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le module T-SQL donne le vocabulaire que réutilisent les modules sécurité, performances, intégration et IA.
2. Installez SQL Server 2025 édition Developer ou créez une petite base Azure SQL Database, passez le niveau de compatibilité à 170 et exécutez chaque extrait de ce cours ; modifiez un argument à la fois pour en voir l'effet.
3. Construisez un petit projet de bout en bout : une table avec une colonne `json`, quelques procédures, un projet SQL Database dans le contrôle de code source, une configuration Data API builder, puis des embeddings et une requête vectorielle.
4. Pour chaque fonction récente, notez les plateformes et paramètres qu'elle exige (SQL Server 2025, niveau de compatibilité 170, fonctionnalités en préversion) : les questions en dépendent souvent.
5. Entraînez-vous à trouver rapidement une page sur Microsoft Learn (référence T-SQL, référence de configuration de Data API builder) : pendant l'examen, c'est votre référence.
6. Après chaque module, passez un examen blanc et relisez les sections liées à vos erreurs. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
