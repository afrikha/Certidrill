Les questions de dépannage donnent un message d'erreur ou un symptôme (un pipeline marqué Failed alors que son gestionnaire d'erreurs s'est exécuté, un notebook refusé avec HTTP 430, un raccourci qui n'affiche aucune table) et demandent la cause ou la correction. Apprenez où chaque moteur écrit l'erreur réelle, puis les causes classiques.

<!-- section: pipeline-errors | objectives: 3.2.1 -->
## Erreurs de pipeline

Ouvrez l'exécution (hub de surveillance ou onglet **Output**), puis l'activité en échec : son message d'erreur, son code d'erreur et sa sortie désignent généralement la cause. Corrigez-la, puis relancez **à partir de l'activité en échec** pour ne pas répéter les activités réussies.

Paramètres généraux qui provoquent ou évitent des échecs :

| Paramètre | Valeur par défaut | Remarque |
| --- | --- | --- |
| Timeout | 12 heures | Maximum sept jours, format `D.HH:MM:SS` ; une activité qui le dépasse échoue |
| Retry, Retry interval | Intervalle de 30 secondes | Pour les erreurs temporaires (limitation, réseau) |
| Secure input / Secure output | Désactivé | Masque l'entrée ou la sortie dans les journaux (secrets, jetons) |
| Activity state | Activated | Une activité désactivée ne s'exécute pas ; **Mark activity as** Succeeded, Failed ou Skipped décide de la branche qui suit |

**Conditions de dépendance.** Chaque flèche entre activités est une condition : **Upon Success** (par défaut), **Upon Failure**, **Upon Completion** (réussie ou en échec) ou **Upon Skip** (l'activité ne s'est pas exécutée). Upon Completion ne peut pas coexister avec Upon Success ou Upon Failure depuis la même activité. Une activité qui a plusieurs flèches entrantes ne s'exécute que lorsque **toutes** ses conditions sont remplies (ET).

Le statut final du pipeline est calculé à partir des **activités feuilles** (si une feuille a été ignorée, c'est son parent qui est évalué) : le pipeline échoue si une activité évaluée a échoué.

| Modèle | Chemins définis | L'activité échoue → statut du pipeline |
| --- | --- | --- |
| Try-Catch | Upon Failure seulement | Succeeded (le gestionnaire est la feuille et a réussi) |
| Do-If-Else | Upon Success et Upon Failure | **Failed** (la branche Upon Success est ignorée, son parent a échoué) |
| Do-If-Skip-Else | Upon Success et Upon Failure, plus une activité finale sur Upon Skip | Succeeded |

> **Piège d'examen.** « Le gestionnaire d'erreurs s'est exécuté, mais l'exécution affiche toujours Failed » est le comportement normal du modèle Do-If-Else. Pour signaler une réussite après avoir traité l'erreur, gardez seulement le chemin Upon Failure (Try-Catch) ou ajoutez l'activité sur Upon Skip ; pour faire échouer l'exécution volontairement avec un message clair, terminez le gestionnaire par une activité **Fail**.

L'activité **Fail** fait échouer le pipeline avec un message d'erreur et un code d'erreur personnalisés, visibles dans l'historique des exécutions. Usage typique : une activité If Condition teste le résultat d'un Lookup (aucune ligne, mauvais nombre) et la branche True exécute Fail. Pour agir quand l'une de plusieurs activités a échoué, reliez-les par Upon Completion à une If Condition :

```text
@or(equals(activity('Copy Orders').Status, 'Failed'), equals(activity('Copy Customers').Status, 'Failed'))
```

Autres causes classiques :

| Symptôme | Cause et correction |
| --- | --- |
| Source inaccessible, erreur d'informations d'identification | Informations d'identification de la connexion expirées ou erronées ; source locale sans passerelle de données en fonctionnement |
| L'activité Copy vers un entrepôt ne peut pas s'exécuter telle quelle | Une destination entrepôt exige une zone de transit (staging) |
| Une exécution planifiée ignore un paramètre | Le nom du paramètre de la planification ne correspond pas exactement au paramètre du pipeline (les différences sont ignorées) |
| Activité Teams inactive après un déploiement | Sa connexion est liée à un utilisateur ; créez une connexion utilisateur dans l'espace de travail cible |

<!-- section: dataflow-errors | objectives: 3.2.2 -->
## Erreurs de Dataflow Gen2

Ouvrez **Recent runs**, sélectionnez l'exécution en échec, puis la **table** ou l'**activité** en échec (l'écriture vers une destination est une activité) : chaque niveau affiche son erreur. Pour aller plus loin, **Download detailed logs** (journaux du moteur mashup, 28 jours). Un point d'exclamation rouge dans l'espace de travail peut aussi signaler l'échec d'un **enregistrement ou d'une validation** : ouvrez l'éditeur et validez.

La plupart des échecs d'actualisation viennent de la destination des données :

| Symptôme | Cause et correction |
| --- | --- |
| `We can't insert null data into a non-nullable column.` | Une colonne détectée comme non nullable reçoit des valeurs null. Supprimez la table de destination, retirez la destination, définissez les types de colonnes en `type nullable ...`, puis ajoutez à nouveau la destination |
| La publication échoue après une modification de la requête | **Schéma fixe** : le schéma de la requête ne correspond plus à la destination. Mettez à jour le mappage, ou utilisez le **schéma dynamique** (Replace uniquement), qui supprime et recrée la table |
| Nouvelle colonne non ajoutée à la table | La méthode de mise à jour est **Append** : les changements de schéma sont impossibles en Append |
| Le chargement vers un entrepôt échoue ou affiche un avertissement | La zone de transit est obligatoire pour une destination entrepôt, l'entrepôt doit être dans le même espace de travail, et seul le schéma fixe est pris en charge |
| Erreur de type au chargement | Types non pris en charge : DateTimeZone et Time ne le sont pas par les destinations lakehouse et entrepôt ; Currency ne l'est pas par l'entrepôt (convertir en décimal) ; Duration seulement par Azure Data Explorer |
| Une table supprimée de la destination n'est pas recréée | C'était une table **existante** : Dataflow Gen2 ne recrée que les tables qu'il a créées |
| Replace échoue sur une base de données KQL | Les bases de données KQL et Azure Data Explorer ne prennent en charge qu'Append |
| Actualisation par passerelle : pas de journaux détaillés | Activez **Admin consent for gateway diagnostics** sur la passerelle |

Les destinations ne s'appliquent qu'aux requêtes tabulaires, pas aux fonctions ni aux listes.

<!-- section: notebook-errors | objectives: 3.2.3 -->
## Erreurs de notebook

Regardez d'abord l'erreur de la cellule, puis la page de détail de l'application Spark : **Logs** (Livy, Prelaunch, Driver) et **Diagnostics** (analyse des erreurs par le conseiller Spark). Les journaux peuvent manquer si le travail est resté en file d'attente ou si le cluster n'a pas pu être créé.

**Limites de capacité.** Une unité de capacité donne deux VCores Spark, avec une rafale (bursting) jusqu'à trois fois (une F64 atteint 384 VCores). Quand la capacité est entièrement utilisée, un notebook interactif échoue avec :

```text
[TooManyRequestsForCapacity] HTTP Response code 430: This Spark job can't be run because you have hit a Spark compute or API rate limit. To run this Spark job, cancel an active Spark job through the Monitoring hub, or choose a larger capacity SKU or try again later.
```

| Origine du travail | Quand la capacité est pleine |
| --- | --- |
| Notebook interactif, API publique des notebooks | Refusé avec HTTP 430, sans file d'attente |
| Pipeline, planificateur, définition de tâche Spark | Mis en file d'attente (FIFO) et relancé automatiquement ; expire après 24 heures |
| Tout travail pendant que la capacité est limitée (throttling) | Refusé, sans file d'attente |

La limite de la file d'attente augmente avec la SKU (64 travaux en F64).

**Sessions.** Les sessions interactives expirent par défaut après 20 minutes (paramètre d'espace de travail **Spark session timeout**) ; un administrateur peut aussi définir une **durée de vie maximale des travaux**, au-delà de laquelle Fabric annule le travail.

**Bibliothèques.**

| Symptôme | Cause et correction |
| --- | --- |
| `%pip install` fonctionne en interactif mais échoue dans le pipeline | L'installation en ligne est désactivée dans les exécutions de pipeline ; ajoutez le paramètre booléen `_inlineInstallationEnabled` = `True` à l'activité notebook, ou mieux, installez la bibliothèque dans un environnement |
| Bibliothèque absente sur les exécuteurs | `!pip` n'installe que sur le pilote ; utilisez `%pip` |
| Variables perdues après une cellule d'installation | `%pip` redémarre l'interpréteur Python ; placez les installations en haut du notebook |
| Installation en ligne refusée | Non prise en charge en mode haute concurrence ni dans un notebook référencé |

**Orchestration par le code.** `notebookutils` (anciennement `mssparkutils`) exécute des notebooks enfants :

```text
# run(path, timeout_seconds=90, arguments, workspace) returns the child's exit value
value = notebookutils.notebook.run("Clean_Orders", 600, {"load_date": "2026-11-01"})

# runMultiple raises RunMultipleFailedException if an activity fails
from notebookutils.common.exceptions import RunMultipleFailedException
try:
    results = notebookutils.notebook.runMultiple(DAG)
except RunMultipleFailedException as ex:
    results = ex.result   # per activity: exitVal and exception
```

Le délai par défaut de `run()` est de 90 secondes : un notebook enfant long échoue si vous ne l'augmentez pas. `notebookutils.notebook.exit()` est sans effet dans un `try`/`except` : appelez-le au premier niveau du code. Dans une exécution de pipeline, `exit()` renvoie la valeur à l'activité notebook et arrête la session.

<!-- section: eventhouse-errors | objectives: 3.2.4 -->
## Erreurs d'eventhouse

**Ingestion.** Les commandes d'ingestion en échec sont listées pendant 14 jours :

```kusto
.show ingestion failures
| where FailedOn > ago(1d) and Table == "Telemetry"
| project FailedOn, Table, FailureKind, ErrorCode, Details, OriginatesFromUpdatePolicy
```

`FailureKind` vaut `Permanent` (données mal formées, mappage, accès interdit : corrigez et réingérez) ou `Transient` (réessayez). Codes d'erreur typiques : `Stream_ClosingQuoteMissing` pour un CSV mal formé, `Download_Forbidden` quand le stockage source refuse l'accès.

**Stratégies de mise à jour.** Quand `OriginatesFromUpdatePolicy` vaut true, la requête de la stratégie de mise à jour (update policy) a échoué : sa sortie doit correspondre à la table cible par les types de colonnes **et leur ordre**.

| `IsTransactional` | Si la stratégie de mise à jour échoue |
| --- | --- |
| `false` (par défaut) | Les données arrivent seulement dans la table source ; l'ingestion réussit et la cible perd des lignes |
| `true` | Rien n'est ingéré, ni dans la source ni dans la cible ; l'ingestion échoue et peut être relancée |

**Erreurs de requête.**

| Erreur | Cause | Correction |
| --- | --- | --- |
| `E_QUERY_RESULT_SET_TOO_LARGE` | Résultat de plus de 500 000 enregistrements ou 64 Mo | Agréger, `project` moins de colonnes, `take` ; `set notruncation;` seulement si c'est vraiment nécessaire ; `.export` pour les gros extraits |
| `E_RUNAWAY_QUERY` | Un opérateur (`join`, `summarize`, `sort`) a dépassé sa mémoire par nœud | Filtrer plus tôt, utiliser `hint.shufflekey`, ou augmenter `maxmemoryconsumptionperiterator` |
| Délai d'expiration | Par défaut 4 minutes pour les requêtes, 10 pour les commandes de gestion, 1 heure au maximum | Optimiser, ou définir `servertimeout` |
| Erreur de complexité de requête | Très longues chaînes de `or`, énorme `union *`, imbrication profonde | Réécrire avec `in()`, réduire les tables et les colonnes |

Un raccourci dans une base de données KQL s'interroge avec `external_table('MyShortcut')` ; un raccourci de base de données ne fonctionne qu'au sein du même locataire et de la même région, et l'utilisateur a besoin d'autorisations sur les deux bases de données.

<!-- section: eventstream-errors | objectives: 3.2.5 -->
## Erreurs de flux d'événements

Sélectionnez le nœud en échec et lisez **Data insights** (Runtime errors, Data conversion errors, Deserialization errors, Backlogged input events, Watermark delay) et **Runtime logs** (filtre sur Error).

| Symptôme | Cause et correction |
| --- | --- |
| Erreurs de désérialisation sur la source | Le format de données choisi pour la source (JSON, Avro ou CSV avec en-tête) ne correspond pas aux événements |
| Erreurs de conversion de données sur une destination | Les événements ne correspondent pas au schéma de la destination : corrigez le mappage ou ajoutez une transformation |
| La source Azure Event Hubs ne se connecte pas | Le hub d'événements est derrière un pare-feu : il doit être public, ou joint par un point de terminaison privé managé ; vérifiez le nom et la valeur de la clé d'accès partagé |
| La sortie d'un filtre ou d'une agrégation n'arrive pas dans l'eventhouse | L'ingestion directe prend le flux brut ; après des opérateurs, utilisez **Event processing before ingestion** |
| Le backlog grossit, le délai de filigrane augmente | Débit trop faible pour l'entrée : augmentez le paramètre **Event throughput** |
| Des événements anciens manquent | Ils ont dépassé la rétention de l'eventstream (1 jour par défaut, jusqu'à 90 jours) |
| La destination n'a pas les premiers événements | L'ingestion a été activée après l'arrivée des données ; réactivez-la avec **Custom time** à un horodatage antérieur |

Les sources avec schéma (schémas du registre de schémas) ne peuvent alimenter que des destinations eventhouse, point de terminaison personnalisé et flux dérivé.

<!-- section: tsql-errors | objectives: 3.2.6 -->
## Erreurs T-SQL

**Conflits écriture-écriture.** Un entrepôt utilise uniquement l'isolation d'instantané (un `SET TRANSACTION ISOLATION LEVEL` est ignoré) et un verrouillage au niveau de la table. Deux transactions qui font `UPDATE`, `DELETE` ou `MERGE` sur la même table entrent en conflit même si elles touchent des lignes différentes : la première à valider gagne, l'autre échoue avec l'erreur **24556** ou **24706** (« Snapshot isolation transaction aborted due to update conflict »). Correction : réessayer avec une temporisation exponentielle, éviter les mises à jour concurrentes sur la même table, garder des transactions courtes. `INSERT` crée de nouveaux fichiers et entre rarement en conflit ; un `MERGE` est en conflit même s'il ne fait qu'ajouter des lignes.

**Instructions qui échouent :**

| Symptôme | Cause |
| --- | --- |
| `INSERT`, `UPDATE` ou `CREATE TABLE` échoue sur le point de terminaison d'analytique SQL | Le point de terminaison est en lecture seule pour les tables ; écrivez dans un entrepôt ou avec Spark (vues, fonctions et procédures peuvent être créées) |
| `CREATE TABLE` avec `datetime`, `money`, `nvarchar`, `tinyint` échoue | Non pris en charge dans les tables : utilisez `datetime2` (jusqu'à 6 chiffres fractionnaires), `decimal`, `varchar` (classement UTF-8), `smallint` |
| `ALTER TABLE` échoue | Seuls l'ajout de colonnes nullables, la suppression de colonnes et l'ajout ou la suppression de clés primaires, uniques et étrangères `NOT ENFORCED` sont pris en charge ; renommez avec `sp_rename` |
| Déclencheur, vue matérialisée, requête récursive, `SET ROWCOUNT`, synonyme | Non pris en charge dans Fabric Warehouse |
| Point d'enregistrement, transaction nommée ou distribuée | Non pris en charge |
| Une nouvelle table du lakehouse n'est pas visible depuis le point de terminaison | Délai de synchronisation des métadonnées (en général moins d'une minute) ; actualisez les métadonnées du point de terminaison |

`varchar(max)` et `varbinary(max)` sont limités à 16 Mo. Utilisez `queryinsights.exec_requests_history` pour retrouver après coup les instructions lentes, et `sys.dm_tran_locks` pour voir les verrous en cours.

> **Piège d'examen.** Deux pipelines qui mettent à jour au même moment des lignes différentes de la même table d'entrepôt entrent quand même en conflit. Sérialisez-les (dépendance ou pipeline unique) ou ajoutez une logique de nouvelle tentative : changer le niveau d'isolation n'est pas une option.

<!-- section: shortcut-errors | objectives: 3.2.7 -->
## Erreurs de raccourci OneLake

| Symptôme | Cause et correction |
| --- | --- |
| Raccourci dans **Tables** non affiché comme une table | La cible n'est pas au format Delta, le raccourci n'est pas au premier niveau de Tables, ou son nom contient un espace |
| Impossible de créer un raccourci dans un sous-dossier de Tables | Seuls les raccourcis de premier niveau sont pris en charge dans Tables ; utilisez **Files** pour tout autre emplacement |
| Accès refusé par un raccourci interne | OneLake utilise l'**identité de l'utilisateur appelant** : l'utilisateur a besoin de l'autorisation de lecture sur l'élément cible |
| Impossible de créer un raccourci ADLS Gen2 ou S3 | L'accès passe par une **connexion** cloud : il faut une autorisation sur la connexion, et ses informations d'identification doivent atteindre les données |
| Raccourci soudain cassé | La cible a été déplacée, renommée ou supprimée |
| Données supprimées à la source | Supprimer des fichiers via un raccourci les supprime dans la cible si vous y avez l'autorisation d'écriture |
| Nom refusé | `%`, `+` et les caractères non latins sont interdits dans les noms et les chemins |
| Nouveau raccourci pas encore visible dans l'API Table | Cela peut prendre jusqu'à une minute |

Limites : 100 000 raccourcis par élément, 10 par chemin OneLake, 5 raccourcis enchaînés vers des raccourcis, 100 connexions externes par élément. Supprimer un raccourci ne supprime jamais la cible.

**Stockage protégé par un pare-feu.** Un compte ADLS Gen2 dont l'accès public est limité à des réseaux sélectionnés, ou désactivé, est joint par l'**accès approuvé à l'espace de travail** (trusted workspace access) :

1. L'espace de travail est sur une capacité de SKU F (pas d'évaluation).
2. Créez une identité d'espace de travail.
3. Sur le compte de stockage, ajoutez une règle d'instance de ressource pour l'espace de travail (modèle ARM ou PowerShell, pas le portail).
4. Donnez à l'identité utilisée par la connexion un rôle Storage Blob Data (Reader, Contributor ou Owner).
5. Créez le raccourci avec l'URL DFS (`https://account.dfs.core.windows.net`), en vous authentifiant avec un compte professionnel, un principal de service ou l'identité de l'espace de travail.

Il cesse de fonctionner une heure après le passage de l'espace de travail sur une capacité d'évaluation ou non F, et il échoue si une stratégie d'accès conditionnel pour les identités de charge de travail couvre tous les principaux de service.

> **Piège d'examen.** Un raccourci qui fonctionne pour l'administrateur de l'espace de travail mais pas pour un collègue révèle un problème d'autorisation sur la cible (raccourci interne) ou sur la connexion (raccourci externe), pas un raccourci cassé.

<!-- section: key-points -->
## Points clés

- Le statut du pipeline dépend des activités feuilles : Try-Catch réussit, Do-If-Else échoue après traitement ; activité Fail pour une erreur personnalisée ; relance à partir de l'activité en échec.
- Les échecs de Dataflow Gen2 viennent surtout de la destination : colonnes nullables, schéma fixe, Append, zone de transit pour l'entrepôt, types non pris en charge.
- HTTP 430 = capacité Spark pleine ; les travaux interactifs ne sont pas mis en file d'attente, ceux des pipelines si (24 heures).
- `%pip` dans un pipeline demande `_inlineInstallationEnabled` ; préférez les environnements. `notebook.run()` expire après 90 secondes par défaut.
- Eventhouse : `.show ingestion failures` (14 jours), stratégies de mise à jour transactionnelles, 500 000 enregistrements ou 64 Mo par résultat.
- Entrepôt : les conflits écriture-écriture au niveau de la table (24556, 24706) demandent des nouvelles tentatives ; le point de terminaison d'analytique SQL est en lecture seule.
- Raccourcis : premier niveau de Tables et Delta ; identité de l'utilisateur pour les cibles internes, connexion pour les externes ; accès approuvé à l'espace de travail pour le stockage derrière un pare-feu.
