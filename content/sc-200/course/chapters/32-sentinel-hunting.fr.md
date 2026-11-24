Microsoft Sentinel ajoute ses propres outils de chasse à ceux de Defender XDR, et le data lake a changé leur fonctionnement. Les **requêtes de chasse** et les **signets** interrogent le niveau Analytics ; les **tâches KQL** exécutent des requêtes sur le data lake et promeuvent les résultats vers le niveau Analytics ; les **règles de synthèse** agrègent des journaux volumineux dans de petites tables ; les **notebooks** dans Visual Studio Code analysent à grande échelle les données du lake, à côté du **serveur MCP Sentinel** qui permet aux clients d'IA d'interroger les mêmes données en langage naturel. L'examen demande quel outil répond à un besoin, comment le configurer et quelles sont ses limites.

<!-- section: hunting-queries | objectives: 3.2.1 -->
## Créer et surveiller des requêtes de chasse

Dans le portail Defender, ouvrez **Microsoft Sentinel > Threat management > Hunting** (Microsoft Sentinel quitte le portail Azure après le 31 mars 2027). L'onglet **Queries** liste les requêtes de chasse installées avec les solutions du **Content hub** et vos requêtes personnalisées, regroupées par tactique MITRE ATT&CK.

Pour créer une requête : **New query**, puis renseignez le nom, la description, la **Query** KQL, les **Entity mappings** (type d'entité, identificateur, colonne) et la tactique, la technique et la sous-technique **MITRE ATT&CK**, et sélectionnez **Create**. Pour adapter une requête intégrée, **clonez-la** (**Clone**) : seules les requêtes d'une source de contenu personnalisée se modifient sur place ; une requête du content hub se modifie à sa source.

```kusto
SecurityEvent
| where TimeGenerated > ago(1d)
| where EventID == 4688
| where CommandLine has_any ("vssadmin delete shadows", "wbadmin delete catalog")
| project TimeGenerated, Computer, Account, CommandLine
```

Surveiller et exploiter les résultats :

| Fonctionnalité | Ce qu'elle fait |
| --- | --- |
| Run all queries / Run selected queries | Exécute les requêtes et affiche le nombre de résultats de chacune |
| Results delta, Results delta percentage | Dernières 24 heures comparées aux 24 à 48 heures précédentes, pour repérer les pics |
| Favorites | Les requêtes favorites s'exécutent automatiquement à chaque ouverture de la page Hunting |
| N/A dans le filtre Results | Requêtes dont les sources de données ne sont pas connectées |
| Signets (bookmarks) | Lignes conservées d'un résultat avec la requête, des étiquettes, des notes, des mappages d'entités et MITRE ; stockés dans la table `HuntingBookmark`. Créés uniquement dans le portail Azure (**Add bookmark**) ; le portail Defender affiche les signets existants mais ne permet pas d'en ajouter |
| Incident actions | Transformer des signets en nouvel incident ou les ajouter à un incident existant (portail Azure uniquement) |
| Hunts (préversion) | Un projet de chasse : hypothèse, requêtes, signets, état, commentaires et métriques ; les règles d'analytique et les incidents créés depuis la chasse y sont liés |
| New alert rule > Create Microsoft Sentinel alert | Transforme la requête en règle d'analytique planifiée |

Les requêtes de chasse s'exécutent sur le **niveau Analytics** : les données stockées uniquement dans le data lake ne sont interrogées ni par elles ni par les règles d'analytique. Les sessions **Livestream** ne sont plus disponibles : utilisez à la place des tâches KQL, des règles d'analytique (planifiées ou NRT) ou des playbooks.

> **Piège d'examen.** Une requête de chasse ne déclenche jamais d'alerte à elle seule. « Exécuter cette requête de chasse toutes les heures et créer des incidents » correspond à une règle d'analytique créée depuis la requête. « Conserver ces lignes suspectes comme preuves et les rattacher à l'incident 42 » correspond à un signet. Les signets existent dans la page Hunting de Sentinel, pas dans le repérage avancé, et jusqu'au retrait du portail Azure ils se créent et s'ajoutent aux incidents uniquement dans le portail Azure ; dans le portail Defender, utilisez **Link to incident** depuis les résultats du repérage avancé.

<!-- section: kql-jobs | objectives: 3.2.2 -->
## Créer et gérer des tâches KQL dans le data lake

Le data lake s'interroge dans **Microsoft Sentinel > Data lake exploration > KQL queries** : même syntaxe KQL que le repérage avancé, un sélecteur **Selected workspaces** (plusieurs espaces de travail sont combinés avec `union()` ; `workspace("SOC-WS").SigninLogs` en cible un seul), une plage de temps jusqu'à 12 ans et des requêtes asynchrones pour les exécutions longues.

| Requêtes interactives sur le lake | Limite |
| --- | --- |
| Débit | 30 requêtes par minute par locataire |
| Simultanéité | 10 requêtes par locataire (rejetées, pas mises en file d'attente, au-delà) |
| Résultats | 500 000 lignes, 64 Mo |
| Requête asynchrone | 1 heure d'exécution ; résultats mis en cache 24 heures |
| Latence d'ingestion | Environ 15 minutes avant que les nouvelles données soient interrogeables |

Une **tâche KQL** est une requête unique ou planifiée sur les tables du lake (et les tables fédérées) qui écrit ses résultats dans une table. Son usage principal est de **promouvoir** des données du data lake vers le niveau Analytics, où les règles d'analytique, les requêtes de chasse et le repérage avancé peuvent les utiliser ; autres usages : longues requêtes d'investigation, bases de référence et correspondance historique d'IOC.

Créer une tâche (**Create job** depuis l'éditeur KQL, depuis la page **Jobs** ou depuis un modèle) :

1. Nom de la tâche (unique dans le locataire) et description.
2. Destination : un espace de travail Sentinel (niveau Analytics) ou **System tables** (niveau data lake, préversion), et une **nouvelle table** ou une **table existante** de même schéma.
3. La requête et ses espaces de travail sources.
4. **One time** (s'exécute à la soumission) ou **Scheduled job** : par minute, toutes les heures, chaque jour, chaque semaine ou chaque mois, à partir d'au moins 30 minutes après la création, avec une date de fin ou indéfiniment.

| Point | Valeur |
| --- | --- |
| Nouvelle table au niveau Analytics | Suffixe `_KQL_CL` |
| Nouvelle table au niveau data lake | Suffixe `_KQL` |
| Tâches activées par locataire | 100 |
| Exécutions simultanées par locataire | 5 (une nouvelle exécution est rejetée, pas mise en file d'attente) |
| Délai d'expiration de la requête | 1 heure (des résultats partiels peuvent être promus) |
| Tables de sortie par tâche | 1 |
| Non pris en charge | `adx()`, `arg()`, `externaldata()`, `ingestion_time()`, fonctions définies par l'utilisateur |
| `TimeGenerated` | Écrasé s'il date de plus de deux jours : copiez l'heure de l'événement dans une autre colonne |

```kusto
let delay = 15m;
let endTime = now() - delay;
let startTime = endTime - 1h;
let BadIPs = dynamic(["203.0.113.10", "198.51.100.7"]);
CommonSecurityLog
| where TimeGenerated between (startTime .. endTime)
| where DestinationIP in (BadIPs)
| project EventTime = TimeGenerated, DeviceVendor, SourceIP, DestinationIP, DestinationPort
```

Le `delay` absorbe la latence d'ingestion du lake pour ne pas manquer d'événements tardifs entre deux exécutions.

**Gérer les tâches** : la page **Jobs** (tâches KQL, de notebook et de graphe) affiche l'état, les dernière et prochaine exécutions et les problèmes d'intégrité récents. Le volet de détails d'une tâche KQL propose **Enable** / **Disable**, **Edit** (la requête peut changer mais doit garder le même schéma de sortie ; modifier une tâche unique la réexécute), **View history** (exécutions, état, lignes envoyées) et **Delete** (définitif ; une tâche en cours ne peut pas être supprimée). Désactiver ou supprimer une tâche n'arrête pas les exécutions déjà en cours ou en file d'attente ; seules les exécutions futures ne sont plus planifiées. Une tâche dont l'espace de travail source a été supprimé est désactivée automatiquement.

Autorisations : un rôle Microsoft Entra qui peut écrire au niveau Analytics et planifier des tâches (Security Operator ou Security Administrator) et, pour créer de **nouvelles** tables au niveau Analytics, le rôle **Log Analytics Contributor** sur l'espace de travail pour l'identité managée du data lake `msg-resources-<guid>`.

> **Piège d'examen.** Une tâche KQL qui n'arrive pas à créer sa table de destination alors que l'analyste a tous les rôles Entra manque de l'attribution Log Analytics Contributor de l'identité managée `msg-resources-<guid>`. Et tout promouvoir est la réponse coûteuse : le niveau Analytics coûte plus cher, donc ne projetez que les colonnes et les lignes nécessaires.

<!-- section: summary-rules | objectives: 3.2.3 -->
## Créer et gérer des tables de règles de synthèse

Une **règle de synthèse** exécute une agrégation KQL en arrière-plan à intervalle fixe et écrit le résultat dans une table personnalisée du plan **Analytics**. Les journaux bruts volumineux (pare-feu, proxy, DNS) restent dans un niveau bon marché ; les règles d'analytique, les requêtes de chasse et les classeurs interrogent rapidement la petite table de synthèse, même au-delà de la rétention de la table brute.

Créez-la dans **Microsoft Sentinel > Configuration > Summary rules** (l'espace de travail doit être intégré au portail Defender pour passer par Defender), de zéro ou depuis un modèle du content hub (**Content type: Summary rules**). Microsoft Sentinel exige **Microsoft Sentinel Contributor** ; côté Azure Monitor, écrire la règle et sa table de destination exige **Log Analytics Contributor**.

| Paramètre ou règle | Valeur |
| --- | --- |
| Taille d'intervalle (fréquence) | 20, 30, 60, 120, 180, 360, 720 ou 1 440 minutes |
| Délai | Attente facultative avant chaque exécution, pour les données qui arrivent en retard |
| Table source | N'importe quel plan : Analytics (tous les opérateurs), Basic (une table, `lookup` vers cinq tables Analytics au plus), Auxiliary |
| Table de destination | Table personnalisée nouvelle ou existante se terminant par `_CL`, plan Analytics |
| Colonnes ajoutées | `_RuleName`, `_RuleLastModifiedTime`, `_BinSize`, `_BinStartTime` |
| Règles actives | 100 par espace de travail |
| Non pris en charge | `workspaces()`, `app()`, `resource()`, `ADX()`, `ARG()`, `union *`, `bag_unpack`, `narrow`, `pivot`, fonctions définies par l'utilisateur |
| Échecs | 10 nouvelles tentatives en 8 heures, puis l'intervalle est ignoré ; les intervalles en échec peuvent être réexécutés ; après huit nouvelles tentatives consécutives d'intervalles, la règle passe à `isActive: false` et est suspendue |
| Coût | Pas de frais pour la règle ; sources Analytics : ingestion des résultats uniquement ; sources Basic et Auxiliary : données analysées plus ingestion des résultats |

N'ajoutez pas de filtre de temps à la requête : l'intervalle définit la plage de temps. Testez d'abord la requête dans **Hunts** et gardez des résultats petits (Microsoft suggère environ 0,01 % du volume source).

```kusto
CommonSecurityLog_CL
| summarize Connections = count(), FirstSeen = min(TimeGenerated), LastSeen = max(TimeGenerated)
    by SourceIP, DestinationIP, DestinationPort
```

Surveillance : activez la catégorie **Summary Logs** dans les paramètres de diagnostic de l'espace de travail, puis interrogez `LASummaryLogs` (états `Started`, `Succeeded`, `Failed`). Chaque règle peut être consultée, activée, désactivée, modifiée ou supprimée.

| Besoin | Outil |
| --- | --- |
| Agrégation continue d'une table volumineuse, interrogée par des détections | Règle de synthèse |
| Requête planifiée ou unique sur les données du lake, résultats promus au niveau Analytics | Tâche KQL |
| Recherche ponctuelle dans la rétention à long terme d'une table Analytics | Travail de recherche (table `_SRCH`) |

> **Piège d'examen.** Une règle de synthèse ne traite pas l'historique : elle ne traite que des intervalles récents, à partir de son heure de début, et des données du passé récent jusqu'à 24 heures au plus. « Détecter au coût le plus bas l'apparition d'une IP du flux de renseignement sur les menaces dans 1 To/jour de journaux de pare-feu » correspond à une règle de synthèse sur la table bon marché plus une règle d'analytique sur la table de synthèse.

<!-- section: notebooks-mcp | objectives: 3.2.4 -->
## Chasser avec des notebooks et le serveur MCP Sentinel

Les **notebooks du data lake** sont des notebooks Jupyter exécutés depuis **Visual Studio Code** avec l'**extension Microsoft Sentinel**, sur des pools Spark managés, contre les tables du data lake. Prérequis : intégration au data lake, un rôle Microsoft Entra (tous les espaces de travail) ou un rôle Azure RBAC sur l'espace de travail, et éventuellement l'extension GitHub Copilot pour les suggestions de code. Connectez-vous depuis l'icône Microsoft Sentinel de l'extension.

```text
from sentinel_lake.providers import MicrosoftSentinelProvider
data_provider = MicrosoftSentinelProvider(spark)
df = data_provider.read_table("SigninLogs")
failed = df.filter(df.ResultType != "0").groupBy("UserPrincipalName").count()
data_provider.save_as_table(failed, "FailedSignins_SPRK", write_options={"mode": "overwrite"})
```

| Point | Valeur |
| --- | --- |
| Pools | Small (exploration), Medium (jointures, agrégations, ML), Large (deep learning, grosses jointures) |
| Démarrage de session | 3 à 6 minutes la première fois ; les exécutions suivantes sont plus rapides |
| Expiration d'une session interactive | Paramètre d'expiration de session : 30 minutes par défaut, configurable ; les limites du service indiquent une expiration après 20 minutes d'inactivité |
| Expiration d'une requête interactive | 2 heures |
| Expiration et simultanéité des tâches de notebook | 8 heures ; 3 tâches à la fois, les suivantes en file d'attente |
| Bibliothèques | Bibliothèques Azure Synapse et bibliothèque Microsoft Sentinel Provider uniquement ; pas de `pip install` |
| Affichage | 100 000 lignes dans VS Code |

Un notebook peut être planifié comme **tâche de notebook** depuis l'extension pour écrire des résultats dans le data lake ou au niveau Analytics ; dans la page Jobs du portail Defender, vous pouvez consulter son détail et son historique et activer ou désactiver sa planification, mais pas la modifier. Une fois soumise, la tâche n'est plus liée au notebook local : pour la changer, téléchargez la définition de la tâche, modifiez le notebook, puis **Edit job** et **Submit** (un nouveau nom de tâche crée une nouvelle définition de tâche). Créer des tables au niveau Analytics exige la même attribution Log Analytics Contributor de `msg-resources-<guid>` que les tâches KQL.

Le **serveur MCP Microsoft Sentinel** expose des collections d'outils sur le data lake et les données Defender aux clients MCP : Security Copilot, Copilot Studio, Microsoft Foundry et Visual Studio Code (conversation GitHub Copilot en mode agent). Il est hébergé par Microsoft et s'authentifie avec Microsoft Entra ID.

| Collection | URL du serveur |
| --- | --- |
| Exploration des données | `https://sentinel.microsoft.com/mcp/data-exploration` |
| Triage | `https://sentinel.microsoft.com/mcp/triage` |
| Création d'agents Security Copilot | `https://sentinel.microsoft.com/mcp/security-copilot-agent-creation` |

Connecter Visual Studio Code :

1. **Ctrl+Shift+P**, `MCP: Add Server`, choisissez **HTTP (HTTP or Server-Sent Events)**.
2. Saisissez l'URL de la collection et un **Server ID**, puis choisissez tous les espaces de travail ou l'actuel.
3. Autorisez (**Allow**) l'authentification avec un compte qui a au moins **Security Reader**.
4. Ouvrez la conversation en **Agent mode** et vérifiez les outils sous **Configure Tools**.

| Outil d'exploration des données | Utilisation |
| --- | --- |
| `list_sentinel_workspaces` | Liste les noms et ID des espaces de travail ; à exécuter en premier |
| `search_tables` | Trouve les tables du lake pertinentes et renvoie leur schéma |
| `query_lake` | Exécute une requête KQL sur le lake (récupération ciblée, pas exportation massive) |
| `analyze_user_entity`, `analyze_url_entity`, `get_entity_analysis` | Verdict d'IA sur un utilisateur (fenêtre de 7 jours au maximum) ou une URL ; exige **Security Copilot Contributor** et consomme des SCU |
| `find_blastradius`, `find_walkable_paths` et autres outils de graphe (préversion) | Questions de graphe ; exigent un accès en lecture à Exposure Management |

Des outils MCP personnalisés peuvent aussi exposer vos requêtes KQL de repérage avancé enregistrées aux agents, pour des flux déterministes.

> **Piège d'examen.** Security Reader suffit pour lister et appeler les outils MCP, mais l'analyseur d'entités exige aussi Security Copilot Contributor. Et « exporter six mois de connexions pour une analyse hors ligne » correspond à une tâche KQL ou à un notebook, pas à `query_lake`.

<!-- section: key-points -->
## Points clés

- Requêtes de chasse : New query avec mappages d'entités et MITRE, Results delta, Favorites, signets vers les incidents (créés dans le portail Azure), Hunts ; niveau Analytics uniquement ; plus de livestream.
- Tâches KQL : promouvoir des données du lake au niveau Analytics (`_KQL_CL`), uniques ou planifiées, 100 tâches activées, 5 exécutions simultanées, expiration à 1 heure ; `msg-resources-<guid>` exige Log Analytics Contributor pour les nouvelles tables.
- Règles de synthèse : intervalles de 20 à 1 440 minutes, destination `_CL` Analytics, n'importe quel plan source, 100 règles par espace de travail, surveillées dans `LASummaryLogs`.
- Notebooks : VS Code avec l'extension Microsoft Sentinel, pools Spark, `MicrosoftSentinelProvider`, tâches de notebook.
- Serveur MCP Sentinel : URL des collections, `MCP: Add Server` en HTTP, Security Reader au minimum ; `list_sentinel_workspaces` en premier.
