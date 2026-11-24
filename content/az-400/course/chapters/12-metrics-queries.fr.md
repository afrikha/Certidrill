Une équipe DevOps n'améliore que ce qu'elle mesure. L'examen attend que vous choisissiez la bonne métrique pour une question (planification, développement, tests, sécurité, livraison, opérations), l'outil qui la produit (un widget de tableau de bord, une requête d'éléments de travail, Analytics, un rapport de pipeline, une vue d'ensemble de la sécurité, une requête KQL) et la configuration qui la rend juste. Lisez attentivement les définitions : plusieurs questions portent sur le point de départ et le point d'arrivée d'une durée.

<!-- section: dashboards | objectives: 1.2.1 -->
## Tableaux de bord et métriques de flux

Un **tableau de bord** Azure DevOps appartient à une équipe ou au projet et contient des **widgets**. Ajouter un widget au tableau de bord d'une équipe exige d'être membre de l'équipe ; modifier un tableau de bord exige d'être administrateur d'équipe ou de projet, ou de disposer d'autorisations sur le tableau de bord. Les widgets n'affichent que les données que l'utilisateur connecté a le droit de voir.

Les métriques de flux décrivent la façon dont le travail traverse le système :

| Métrique | Définition | Où la voir |
| --- | --- | --- |
| Délai de livraison (lead time) | De la création d'un élément de travail jusqu'à ce qu'il atteigne un état Completed | Widget Lead Time |
| Temps de cycle (cycle time) | De la première entrée d'un élément de travail dans un état In Progress jusqu'à son état Completed | Widget Cycle Time |
| Travail en cours (WIP) | Éléments commencés et non terminés | Cumulative Flow Diagram, limites de WIP du tableau |
| Débit | Éléments terminés par période | Widget Velocity, widget Burnup |
| Temps de récupération | Du début d'un incident de production au rétablissement du service | Éléments de travail d'incident ou horodatages des alertes, dans une requête ou un rapport |

Les quatre métriques DORA mesurent la performance de livraison : la **fréquence de déploiement**, le **délai de mise en production des modifications** (du commit à la production), le **taux d'échec des modifications** (part des déploiements qui provoquent une défaillance) et le **temps de restauration du service** (aussi appelé temps moyen de récupération, MTTR). Les deux premières mesurent la vitesse, les deux dernières la stabilité.

> **Piège d'examen.** Le délai de livraison commence à la **création** de l'élément ; le temps de cycle commence quand le travail **débute**. Un énoncé qui dit « combien de temps les clients attendent entre la demande et la livraison » demande le délai de livraison ; « combien de temps l'équipe met une fois qu'elle a commencé » demande le temps de cycle.

Les widgets **Lead Time** et **Cycle Time** partagent la même configuration : équipe, éléments de travail (un niveau de backlog ou un type d'élément de travail ; choisissez un niveau de backlog pour filtrer sur un couloir), critères de champ facultatifs (par exemple `Release = Milestone 1`) et période, soit une **période glissante** en jours, soit une **date de début**. Seuls les types d'éléments de travail présents sur un backlog peuvent être sélectionnés. Le graphique place chaque élément terminé, une moyenne mobile et une bande d'écart type ; les éléments très au-dessus de la bande sont les valeurs aberrantes à examiner.

Le **Cumulative Flow Diagram** montre le nombre d'éléments dans chaque colonne du tableau au fil du temps : une bande qui s'élargit est un goulet d'étranglement, et la distance horizontale entre la première et la dernière bande donne une approximation du temps de cycle.

Les sources de données derrière les widgets :

| Source | À utiliser pour | Limites |
| --- | --- | --- |
| Requêtes d'éléments de travail et graphiques de requête | Listes, comptages et graphiques simples sur l'état actuel | Graphiques uniquement à partir de requêtes en liste plate renvoyant 1 000 éléments ou moins |
| Widgets Analytics | Tendances : délai de livraison, temps de cycle, vélocité, burndown, flux cumulé, tendances des tests | Azure Boards doit être activé pour les widgets de suivi du travail |
| Vues Analytics et Power BI | Rapports personnalisés et croisements avec d'autres données | Jeux de données préfiltrés via le connecteur Power BI |
| Requêtes OData sur Analytics | Agrégations personnalisées, tout outil de reporting | Dernière version prise en charge `v2.0`, préversion `v4.0-preview` |

Analytics est activé automatiquement pour chaque projet Azure DevOps Services et remplace l'ancienne plateforme SQL Server Reporting Services. C'est une copie des données ; ce n'est donc pas un stockage en temps réel : les modifications peuvent mettre jusqu'à environ 30 secondes à apparaître.

<!-- section: planning-metrics | objectives: 1.2.2 -->
## Métriques et requêtes pour la planification des projets

| Question | Widget ou rapport |
| --- | --- |
| Combien de travail l'équipe livre-t-elle par sprint ? | Velocity (Analytics, une équipe) |
| Allons-nous terminer le sprint ? | Sprint Burndown |
| Allons-nous terminer la version avec plusieurs équipes ? | Burndown ou Burnup (plusieurs équipes, types d'éléments de travail et périodes) |
| L'équipe dépasse-t-elle sa capacité ? | Sprint Capacity |
| Où le travail s'accumule-t-il ? | Cumulative Flow Diagram |
| Combien de bogues actifs, par gravité ? | Query Tile ou Chart for Work Items sur une requête partagée |

Velocity et Burndown additionnent un champ numérique (Story Points, Effort ou Size selon le processus) ou comptent les éléments : estimez de façon homogène, sinon la tendance ne veut rien dire.

Les **requêtes d'éléments de travail** existent en trois types :

| Type | Usage |
| --- | --- |
| Liste plate d'éléments de travail | Mises à jour en bloc, tri, graphiques et vignettes de tableau de bord, exportation Excel |
| Éléments de travail et liens directs | Dépendances, éléments associés, éléments sans parent |
| Arborescence d'éléments de travail | Hiérarchies parent-enfant |

Les requêtes enregistrées sous **My Queries** sont privées ; les **Shared Queries** sont visibles de tous les membres du projet et exigent l'autorisation Contribute sur le dossier. Les macros rendent les requêtes réutilisables : `@Me`, `@Today - 7`, `@StartOfMonth`, `@CurrentIteration`, `@Project`, `@TeamAreas`.

Une requête est stockée en WIQL (Work Item Query Language) :

```text
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
FROM workitems
WHERE [System.TeamProject] = @project
    AND [System.WorkItemType] = 'Bug'
    AND [System.State] <> 'Closed'
    AND [Microsoft.VSTS.Common.Severity] = '1 - Critical'
ORDER BY [System.CreatedDate] DESC
```

Les requêtes `FROM workItemLinks` interrogent les liens plutôt que les éléments, avec un `MODE` (`MustContain`, `MayContain`, `DoesNotContain`, ou `Recursive` pour les arborescences). `ASOF '2026-09-30'` exécute la requête sur les données telles qu'elles étaient à cette date. Une requête WIQL ne peut pas dépasser 32 000 caractères, et l'API REST WIQL ne renvoie que les ID des éléments de travail.

Pour les agrégations que les requêtes ne savent pas faire, interrogez Analytics en OData, par exemple pour le délai de livraison et le temps de cycle moyens des user stories terminées depuis le 1er octobre :

```text
https://analytics.dev.azure.com/fabrikam/Tailspin/_odata/v4.0-preview/WorkItems?$filter=WorkItemType eq 'User Story' and StateCategory eq 'Completed' and CompletedDate ge 2026-10-01T00:00:00Z&$apply=aggregate(LeadTimeDays with average as AvgLeadTime, CycleTimeDays with average as AvgCycleTime)
```

<!-- section: development-metrics | objectives: 1.2.3 -->
## Métriques et requêtes pour le développement

Les métriques de développement montrent à quelle vitesse le code passe d'une branche à la branche par défaut, et si ce chemin est sain :

| Métrique | Source |
| --- | --- |
| Pull requests actives et leur ancienneté | Widget Pull Request (Azure Repos), filtres de la liste des pull requests (GitHub) |
| Délai avant la première revue, délai avant la fusion | Données des pull requests dans Analytics ou l'API REST ; chronologie de la pull request sur GitHub |
| Taux de réussite des builds sur les pull requests | Rapport Pipeline pass rate filtré sur les branches des pull requests |
| Activité de commit et contributeurs | Widget Code Tile, données de gestion de versions d'Analytics ; Insights du dépôt GitHub (Pulse, Contributors) |
| Éléments de travail sans code lié | Requête sur les éléments de travail sans lien Branch, Commit ni Pull Request |

Servez-vous de ces métriques pour trouver les temps d'attente (des pull requests qui attendent un réviseur pendant des jours), pas pour classer les développeurs : compter les commits ou les lignes par personne récompense le mauvais comportement.

> **Conseil d'examen.** Quand un énoncé demande de réduire le temps d'attente des pull requests, la réponse relève généralement du processus, pas du reporting : réviseurs automatiques (`CODEOWNERS`, la stratégie de branche **Automatically included reviewers**), pull requests plus petites et vérifications requises rapides.

<!-- section: testing-metrics | objectives: 1.2.4 -->
## Métriques et requêtes pour les tests

L'**analytique des tests** d'Azure Pipelines s'appuie sur les résultats de test que publie le pipeline. Dans l'onglet **Analytics** d'une exécution de pipeline, le rapport **Test failures** montre la tendance du taux de réussite, la répartition des résultats et les tests qui échouent le plus sur une période (14 jours par défaut), que vous pouvez regrouper, par exemple par fichier de test. Sur un tableau de bord :

| Widget | Affiche |
| --- | --- |
| Test Results Trend | Les résultats d'un pipeline de build ou de mise en production |
| Test Results Trend (Advanced) | Les tendances quasi temps réel du nombre de tests, du taux de réussite et de la durée sur plusieurs pipelines (Analytics) |
| Requirements Quality | Le taux de réussite et les tests en échec par exigence, et les exigences sans test |
| Chart for Test Plans | La progression de la création ou les résultats d'exécution d'un plan ou d'une suite de tests |

Les **tests instables** (flaky tests) réussissent et échouent sans modification du code. Dans Azure DevOps Services, activez la gestion des tests instables dans **Project settings > Test management** :

| Détection | Fonctionnement |
| --- | --- |
| Détection système | Un test qui échoue puis réussit quand il est réexécuté dans la même exécution de pipeline (réexécution par la tâche VSTest, ou réexécution des travaux en échec) est marqué instable |
| Détection personnalisée | Votre propre logique marque les tests comme instables ou non via l'API REST ; la marque reste jusqu'à ce que vous la retiriez |

Vous pouvez ensuite exclure les tests instables du résumé des tests : leurs résultats sortent du pourcentage de réussite et apparaissent sous **Tests not reported**, si bien qu'un échec instable ne fait plus échouer l'exécution. Les testeurs peuvent aussi marquer ou démarquer manuellement un test comme instable ; la modification s'applique à partir de l'exécution suivante.

> **Piège d'examen.** L'exclusion des tests instables du résumé ne fonctionne qu'avec les tâches **Visual Studio Test** et **Publish Test Results**. Les autres exécuteurs de tests exigent un script personnalisé. Passer de la détection système à la détection personnalisée, ou l'inverse, efface l'historique d'instabilité.

La couverture du code est l'autre métrique de test attendue par l'examen : publiez-la depuis le pipeline et imposez un minimum par une vérification sur les pull requests (voir le chapitre sur les tests).

<!-- section: security-metrics | objectives: 1.2.5 -->
## Métriques et requêtes pour la sécurité

Les métriques de sécurité comptent les vulnérabilités ouvertes par gravité, le délai pour les corriger, la part des dépôts couverts par l'analyse et les secrets bloqués avant d'atteindre un dépôt.

| Besoin | Outil |
| --- | --- |
| Alertes de tous les dépôts GitHub d'une organisation | Vue d'ensemble de la sécurité GitHub (onglet **Security** de l'organisation) : alertes Dependabot, d'analyse du code et d'analyse des secrets |
| Alertes et couverture de tous les dépôts Azure Repos | **Organization settings > Security overview** avec GitHub Advanced Security for Azure DevOps |
| Une seule vue sur Azure DevOps, GitHub et GitLab, plus les résultats sur l'infrastructure as code | La sécurité DevOps de Microsoft Defender for Cloud |

La **Security overview** d'Azure DevOps comporte trois onglets :

| Onglet | Affiche |
| --- | --- |
| Risk | Les alertes par gravité des projets et dépôts où Advanced Security est activé, sur la branche par défaut de chaque dépôt ; le filtre de période affiche par défaut les sept derniers jours |
| Coverage | L'activation de chaque fonctionnalité pour chaque dépôt (dépôts désactivés et supprimés exclus) |
| Alerts | Les alertes individuelles d'analyse du code, d'analyse des dépendances et d'analyse des secrets, filtrées par outil, gravité, état, projet et dépôt |

Risk et Coverage s'exportent en CSV ; l'onglet Alerts exporte les 1 000 premières alertes qui correspondent aux filtres. Les métriques agrégées au niveau de l'organisation des onglets Risk et Coverage sont en préversion privée : leur disponibilité varie selon l'organisation. Advanced Security pour Azure DevOps est vendu sous la forme de deux produits, **GitHub Secret Protection for Azure DevOps** (protection push et alertes d'analyse des secrets) et **GitHub Code Security for Azure DevOps** (alertes de dépendances, analyse du code CodeQL et résultats d'outils tiers), facturés selon les committers actifs et activés par dépôt, par projet ou pour l'organisation.

La **sécurité DevOps de Defender for Cloud** fournit aux équipes de sécurité les résultats d'analyse par gravité et par type (code, secrets, dépendances, infrastructure as code), des recommandations de posture DevOps, la couverture Advanced Security et un inventaire des dépôts connectés, avec un classeur DevOps personnalisable. Les annotations de pull request sont disponibles pour les dépôts Azure DevOps.

> **Piège d'examen.** La vue d'ensemble de la sécurité d'Azure DevOps ne compte que les alertes de la **branche par défaut** : les alertes trouvées uniquement sur une branche de fonctionnalité n'apparaissent pas dans Risk. La couverture ne s'active qu'après la soumission d'un résultat d'analyse, mais une analyse réussie sur **n'importe quelle** branche suffit, et l'ancienneté de l'analyse n'est pas prise en compte.

<!-- section: delivery-metrics | objectives: 1.2.6 -->
## Métriques et requêtes pour la livraison

Les métriques de livraison répondent à « à quelle fréquence, à quelle vitesse et avec quelle sûreté mettons-nous en production ? » :

| Métrique | Source Azure Pipelines | Source GitHub |
| --- | --- | --- |
| Fréquence de déploiement | Historique des déploiements d'un environnement ; widget Deployment Status | Historique des déploiements d'un environnement |
| Réussite des pipelines | Rapport **Pipeline pass rate** : taux de réussite, tendance des échecs par phase, tâches qui échouent le plus | Historique et état des exécutions de workflow |
| Vitesse des pipelines | Rapport **Pipeline duration** : tendance de la durée et tâches les plus lentes | Durées des exécutions de workflow |
| Taux d'échec des modifications | Déploiements en échec ou annulés divisés par l'ensemble des déploiements | Même calcul à partir des déploiements et des incidents |

Les rapports de pipeline s'ouvrent depuis l'onglet **Analytics** d'un pipeline, affichent par défaut les 14 derniers jours et se filtrent par branche. Le widget **Build History** affiche les exécutions récentes d'un pipeline sous forme d'histogramme coloré ; **Release Pipeline Overview** affiche les phases et l'état d'un pipeline de mise en production classique.

> **Piège d'examen.** Le rapport **Pipeline pass rate** mesure les exécutions qui réussissent et désigne les **tâches** qui échouent le plus ; le rapport **Test failures** mesure les **tests**. Un énoncé sur « l'étape qui casse le plus de builds » demande le rapport Pipeline pass rate.

<!-- section: operations-metrics | objectives: 1.2.7 -->
## Métriques et requêtes pour les opérations

Les métriques opérationnelles proviennent d'Azure Monitor et d'Application Insights : disponibilité, taux de requêtes, taux d'échec, temps de réponse, échecs des dépendances et saturation des ressources. Le temps de détection et le temps de récupération se mesurent à partir des alertes et des incidents. Interrogez-les en KQL dans un espace de travail Log Analytics :

```kusto
AppRequests
| where TimeGenerated > ago(24h)
| summarize Requests = count(), Failed = countif(Success == false), P95Ms = percentile(DurationMs, 95) by bin(TimeGenerated, 1h)
| extend FailureRate = round(100.0 * Failed / Requests, 2)
| order by TimeGenerated asc
```

| Public | Tableau de bord |
| --- | --- |
| Équipe de développement : travail, builds, tests | Tableau de bord Azure DevOps |
| Opérations : télémétrie en direct et alertes | Classeurs Azure Monitor, tableaux de bord Azure, Azure Managed Grafana |
| Direction : livraison et données métier combinées | Power BI avec les vues Analytics ou OData |

Les chapitres sur l'instrumentation détaillent la collecte de télémétrie, les alertes et KQL ; ici, retenez qu'une métrique opérationnelle n'est utile qu'avec un objectif (un objectif de niveau de service) et une alerte qui se déclenche quand il n'est pas atteint.

<!-- section: key-points -->
## Points clés

- Délai de livraison = de la création à l'achèvement ; temps de cycle = du début du travail à l'achèvement ; les deux exigent Analytics et des types d'éléments de travail de backlog.
- DORA : fréquence de déploiement, délai de mise en production des modifications, taux d'échec des modifications, temps de restauration du service.
- Les graphiques de requête exigent une requête en liste plate de 1 000 éléments ou moins ; `ASOF` en WIQL interroge le passé ; OData sur Analytics agrège.
- Analytics est quasi temps réel (jusqu'à environ 30 secondes), activé par défaut dans Azure DevOps Services.
- L'exclusion des tests instables fonctionne avec les tâches Visual Studio Test et Publish Test Results.
- Security overview : Risk, Coverage, Alerts ; Risk ne compte que la branche par défaut, la couverture s'active après une analyse sur n'importe quelle branche ; Defender for Cloud unifie Azure DevOps, GitHub et GitLab.
- Pipeline pass rate désigne les tâches en échec ; Test failures désigne les tests en échec.
