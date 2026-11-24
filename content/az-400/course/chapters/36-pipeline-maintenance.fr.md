Un pipeline qui fonctionne aujourd'hui demande quand même de l'entretien : il ralentit, des tests échouent au hasard, les travaux parallèles manquent et le stockage se remplit. Ce chapitre explique comment mesurer l'intégrité des pipelines, rendre les exécutions plus rapides et moins chères, dimensionner la concurrence, décider ce qui est conservé et combien de temps, et migrer les pipelines classiques vers YAML.

<!-- section: pipeline-health | objectives: 3.6.1 -->
## Superviser l'intégrité des pipelines

L'onglet **Analytics** d'un pipeline Azure Pipelines propose trois rapports, sur les 14 derniers jours par défaut, filtrables par branche :

| Rapport | Affiche | Répond à |
| --- | --- | --- |
| Taux de réussite du pipeline (Pipeline pass rate) | Taux de réussite et tendance, échecs par jour (par phase), **tâches qui échouent le plus** avec leurs exécutions en échec | « Quelle tâche cause le plus d'échecs ? » |
| Durée du pipeline (Pipeline duration) | Durée typique des exécutions réussies, tendance, **tâches les plus longues** | « Quelle étape optimiser ? » |
| Échecs de tests (Test failures) | Tests qui échouent le plus et détails des échecs (analytique des tests) | « Quels tests échouent le plus souvent ? » |

Pour une vue sur plusieurs pipelines, utilisez des widgets de tableau de bord ou le service Analytics (requêtes OData, Power BI). Dans GitHub, utilisez l'historique des exécutions de l'onglet Actions, les résumés de jobs et l'API REST des exécutions et des jobs.

Un **test instable** (flaky) réussit et échoue sans aucune modification du code ni de l'environnement. Dans Azure DevOps Services, la gestion des tests instables s'active dans **Paramètres du projet > Pipelines > Gestion des tests** :

| Détection | Comment |
| --- | --- |
| Détection système | La tâche Visual Studio Test réexécute un test en échec dans la même tâche, ou un utilisateur réexécute les travaux en échec : un test qui échoue puis réussit est marqué instable pour cette branche |
| Détection personnalisée | Un système externe marque le résultat via l'API REST Result Meta Data - Update |
| Manuelle | Marquer un test **Flaky** ou **UnFlaky** ; s'applique uniquement aux exécutions futures |

Une option exclut les tests instables du résumé des tests et du pourcentage de réussite, pour que leurs échecs ne fassent pas échouer le pipeline ; elle fonctionne avec les tâches Visual Studio Test et Publish Test Results. Changer de système de détection efface l'historique d'instabilité.

> **Piège d'examen.** Exclure les tests instables du taux de réussite garde le pipeline au vert, mais ne les corrige pas. La réponse attendue combine souvent la détection (pour les trouver et les isoler) avec un élément de travail pour corriger le test.

<!-- section: pipeline-optimization | objectives: 3.6.2 -->
## Optimiser les coûts, la durée, les performances et la fiabilité

| Objectif | Technique |
| --- | --- |
| Restauration des dépendances plus rapide | `Cache@2` (clé construite à partir d'un fichier de verrouillage) ou `actions/cache` |
| Extraction plus rapide | Extraction superficielle (shallow fetch) : `fetchDepth: 1` sur `checkout` (0 = historique complet) |
| Moins d'exécutions inutiles | Filtres de chemins, `batch: true`, `autoCancel` des demandes de tirage (true par défaut), `[skip ci]`, `concurrency` avec `cancel-in-progress: true` dans GitHub Actions |
| Durée totale plus courte | Travaux parallèles ou matrice, découpage des tests (`parallel: N`), phases indépendantes avec `dependsOn: []` |
| Transfert de fichiers plus rapide entre travaux | Artefacts de pipeline (`publish`, `download`, `PublishPipelineArtifact@1`) plutôt qu'artefacts de build |
| Builds incrémentiels, outils préinstallés | Agents auto-hébergés ou Managed DevOps Pools avec agents avec état |
| Coût plus faible | Hébergé par Microsoft pour des builds occasionnels ; Managed DevOps Pools ou agents de groupe identique avec 0 agent en attente pour une charge irrégulière |
| Fiabilité | `retryCountOnTaskFailure`, `timeoutInMinutes`, versions d'images figées (`ubuntu-24.04` au lieu de `ubuntu-latest`), versions majeures de tâches figées, actions épinglées sur un SHA de commit complet |

```yaml
variables:
  npm_config_cache: $(Pipeline.Workspace)/.npm
steps:
- checkout: self
  fetchDepth: 1
- task: Cache@2
  inputs:
    key: 'npm | "$(Agent.OS)" | package-lock.json'
    restoreKeys: |
      npm | "$(Agent.OS)"
    path: $(npm_config_cache)
    cacheHitVar: NPM_CACHE_RESTORED
- script: npm ci
- task: PublishPipelineArtifact@1
  inputs:
    targetPath: dist
    artifact: web
```

Le cache d'Azure Pipelines : il est limité au pipeline et à la branche, immuable une fois créé (changez la clé pour le renouveler), impossible à vider, il expire après sept jours sans utilisation et il est gratuit. Une exécution de demande de tirage lit les caches de ses branches source, cible et par défaut, mais n'écrit que dans sa branche de fusion. Dans GitHub, les entrées de cache non consultées depuis sept jours sont supprimées et un dépôt dispose de 10 Go par défaut.

> **Piège d'examen.** Le cache accélère les exécutions avec des fichiers utiles mais non indispensables (packages) ; les artefacts de pipeline transmettent des fichiers dont un travail ultérieur a **besoin** (sortie du build). Un cache manquant ne doit jamais casser le build.

<!-- section: pipeline-concurrency | objectives: 3.6.3 -->
## Optimiser la concurrence des pipelines

| Levier | Effet |
| --- | --- |
| Travaux parallèles achetés (hébergés par Microsoft ou auto-hébergés) | Nombre maximal de travaux simultanés dans toute l'organisation ; règle empirique : un travail parallèle pour quatre à cinq utilisateurs |
| Nombre d'agents des pools auto-hébergés, Maximum agents de Managed DevOps Pools | Capacité par pool, toujours plafonnée par les travaux parallèles auto-hébergés |
| `maxParallel` sur une matrice, `max-parallel` dans GitHub | Laisser de la capacité aux autres pipelines |
| Vérification Exclusive lock, `lockBehavior: sequential` ou `runLatest` | Sérialiser les déploiements vers un environnement partagé |
| Groupe `concurrency` GitHub | Une exécution en cours et une exécution en attente par groupe : une nouvelle exécution annule celle en attente ; `cancel-in-progress: true` annule aussi celle en cours |
| `batch: true` sur la CI | Regrouper en une seule exécution les push faits pendant une exécution |

Les travaux parallèles ne peuvent pas être réservés à un projet ou à un pool, et les exécutions en attente d'une approbation ou d'une vérification n'en consomment pas, pas plus que les travaux serveur et les mises en production qui déploient vers un groupe de déploiement. Les exécuteurs hébergés par GitHub ont des limites de concurrence par plan : 20 jobs en Free, 40 en Pro, 60 en Team et 500 en Enterprise pour les exécuteurs standard, avec une limite macOS de 5 (50 en Enterprise).

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false      # don't cancel the deployment in progress
```

Sans paramètre `queue`, un groupe garde une seule exécution en attente, et une exécution plus récente l'annule. `queue: max` garde jusqu'à 100 exécutions en attente, traitées dans l'ordre, et ne peut pas être combiné avec `cancel-in-progress: true`.

> **Conseil d'examen.** Des pipelines attendent longtemps en file alors que des agents d'un pool auto-hébergé sont inactifs ? La limite est le nombre de travaux parallèles auto-hébergés, pas les agents : achetez des travaux parallèles.

<!-- section: retention-strategy | objectives: 3.6.4 -->
## Stratégie de rétention pour les artefacts et les dépendances

**Exécutions de pipeline.** La rétention se définit au niveau du projet dans **Paramètres du projet > Pipelines > Paramètres** ; les stratégies de rétention par pipeline ne sont plus prises en charge.

| Paramètre | Signification |
| --- | --- |
| Jours de conservation des artefacts, symboles et pièces jointes | Âge au-delà duquel ils sont supprimés |
| Jours de conservation des exécutions | Âge au-delà duquel une exécution est supprimée |
| Jours de conservation des exécutions de demandes de tirage | Idem, pour les exécutions de demandes de tirage |
| Nombre d'exécutions récentes à conserver par pipeline | Toujours conservées : pour Azure Repos, par pipeline, branche par défaut et chaque branche protégée |

Une exécution n'est supprimée que si elle est plus ancienne que le nombre de jours configuré, ne fait pas partie des exécutions récentes à conserver, n'est pas conservée indéfiniment et n'est pas retenue par une mise en production. La règle des exécutions récentes ne conserve que les exécutions réussies et partiellement réussies. La suppression d'une exécution efface les journaux, les artefacts, les symboles, les résultats de tests et les métadonnées ; la rétention des exécutions de tests est un paramètre distinct (**Paramètres du projet > Test > Rétention**). Pour conserver plus longtemps une exécution de production, ajoutez un **bail de rétention** (API REST Leases depuis un script, avec `$(System.DefinitionId)` et `$(Build.BuildId)`) ou conservez-la depuis le menu de l'exécution. Les stratégies s'exécutent une fois par jour.

**Packages.** Les packages d'Azure Artifacts ne relèvent pas de la rétention des exécutions. Un Feed Owner active la **rétention des packages** sur le flux :

| Paramètre | Effet |
| --- | --- |
| Nombre maximal de versions par package | Les versions au-delà de ce nombre deviennent candidates à la suppression |
| Jours de conservation des packages récemment téléchargés | Une version téléchargée pendant cette période est conservée |

Une version n'est supprimée que si les deux conditions sont remplies. **Les packages promus dans une vue en sont exemptés.** Les versions supprimées passent 30 jours dans la corbeille et comptent toujours dans le stockage ; un numéro de version supprimé ne peut pas être réutilisé.

**GitHub.** Les artefacts et les journaux sont conservés 90 jours par défaut, valeur configurable de 1 à 90 jours pour les dépôts publics et de 1 à 400 jours pour les dépôts privés, au niveau de l'organisation ou du dépôt, et par artefact avec `retention-days` sur `actions/upload-artifact`.

> **Piège d'examen.** Pour conserver indéfiniment un package publié sans désactiver la rétention du flux, promouvez-le dans une vue comme `@release`. Pour conserver indéfiniment une exécution de pipeline, utilisez un bail de rétention, pas une valeur de jours de conservation plus élevée.

<!-- section: classic-to-yaml | objectives: 3.6.5 -->
## Migrer un pipeline classique vers YAML

Les **pipelines de build classiques** peuvent être exportés : ouvrez la définition du pipeline (pas une exécution), sélectionnez le menu à trois points, puis **Export to YAML**. Créez ensuite un pipeline YAML, collez le fichier, corrigez ce qui n'a pas été converti et exécutez-le. Les **pipelines de mise en production classiques** n'ont pas d'export YAML : exportez chaque tâche individuellement et reconstruisez les phases sous forme de travaux de déploiement.

| Élément classique | Équivalent YAML |
| --- | --- |
| Pipeline de build | Phase de build, exportée avec Export to YAML |
| Pipeline de mise en production avec des phases | Phases avec des travaux de déploiement ciblant des environnements |
| Approbations et portes de prédéploiement | Approbations et vérifications sur l'environnement |
| Groupe de déploiement | Environnement avec des ressources machine virtuelle |
| Groupe de tâches | Modèle d'étapes ou de travail |
| Variables définies dans l'interface | `variables` dans le YAML ou paramètres du pipeline ; les groupes de variables sont réutilisés tels quels |
| Artefact de mise en production et déclencheur de déploiement continu | Un seul pipeline à phases multiples, ou `resources.pipelines` avec un déclencheur |
| Mise en production planifiée, fuseau horaire local | Cron `schedules` en **UTC** |
| Rétention des mises en production | Paramètres de rétention du projet et baux de rétention |

Ordre recommandé : inventorier les pipelines, groupes de tâches et groupes de variables ; exporter et commiter le YAML de build ; convertir les groupes de tâches en modèles ; recréer les environnements avec leurs approbations et vérifications ; exécuter le pipeline YAML en parallèle du pipeline classique jusqu'à obtenir les mêmes résultats ; puis désactiver le pipeline classique et le garder pour l'historique. Les paramètres d'organisation et de projet **Disable creation of classic build pipelines** et **Disable creation of classic release pipelines** empêchent la création de nouveaux pipelines classiques.

> **Piège d'examen.** Les environnements et les travaux de déploiement n'existent pas dans les pipelines classiques, et les groupes de tâches n'existent pas en YAML : une migration les remplace, elle ne les importe pas.

<!-- section: key-points -->
## Points clés

- Onglet Analytics : taux de réussite (tâches qui échouent le plus), durée (tâches les plus longues), échecs de tests ; 14 jours par défaut.
- Gestion des tests instables dans Paramètres du projet > Gestion des tests ; détection système, personnalisée ou manuelle.
- Mettez en cache les dépendances, utilisez l'extraction superficielle, les filtres de chemins et l'annulation automatique ; transmettez la sortie du build avec des artefacts de pipeline.
- Concurrence = travaux parallèles achetés ; les agents au-delà de ce nombre attendent.
- La rétention des exécutions est définie par projet, les baux conservent des exécutions précises ; la rétention du flux garde les versions présentes dans des vues.
- Export to YAML n'existe que pour les builds classiques ; les mises en production deviennent travaux de déploiement, environnements et vérifications.
