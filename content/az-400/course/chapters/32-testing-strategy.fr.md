Une stratégie de test décide quels tests s'exécutent à quel endroit du flux de livraison et ce qui arrête un changement : des tests en échec bloquent la pull request, une couverture sous l'objectif bloque la fusion, une approbation ou un contrôle d'intégrité arrête un déploiement. L'examen demande quel type de test répond à une exigence, quelle tâche ou quel paramètre l'exécute et en publie les résultats dans Azure Pipelines ou GitHub Actions, et quelle barrière (vérification, règle de protection, porte de mise en production) impose la qualité, la sécurité ou la gouvernance au bon moment.

<!-- section: quality-release-gates | objectives: 3.2.1 -->
## Barrières de qualité et de mise en production

Les barrières existent à deux moments : **avant la fusion** (stratégies de branche, règles de protection de branche, rulesets : voir le chapitre sur les branches) et **avant le déploiement**.

Dans les pipelines YAML d'Azure Pipelines, les barrières de déploiement sont des **vérifications (checks)** configurées sur une ressource protégée, le plus souvent un **environnement** (aussi les connexions de service, pools d'agents, dépôts, groupes de variables, fichiers sécurisés). Elles ne sont pas écrites dans le fichier YAML : l'auteur d'un pipeline ne peut donc pas les retirer.

| Vérification | Usage |
| --- | --- |
| Approvals (approbations) | Approbation manuelle par des utilisateurs ou des groupes (un seul membre d'un groupe suffit), avec un délai d'expiration ; option pour interdire d'approuver sa propre exécution |
| Branch control (contrôle de branche) | Seulement les exécutions issues de branches autorisées (`refs/heads/main`, `refs/heads/release/*`), avec en option l'exigence d'une protection de branche |
| Business hours (heures ouvrables) | Déployer uniquement dans une plage horaire |
| Required template (modèle requis) | Le pipeline doit étendre un modèle YAML approuvé : des contrôles de gouvernance et de sécurité que les équipes ne peuvent pas contourner |
| Evaluate artifact (évaluer l'artefact) | Évaluer les artefacts d'image de conteneur selon une stratégie personnalisée |
| Invoke Azure Function / Invoke REST API | Demander à un système externe (gestion des changements, résultats de tests, intégrité) de décider |
| Query Azure Monitor alerts | Continuer uniquement si aucune alerte Azure Monitor n'est active |
| Exclusive lock (verrou exclusif) | Une seule exécution à la fois sur la ressource (`lockBehavior: sequential` ou `runLatest`) |

Ordre d'évaluation : vérifications statiques (contrôle de branche, modèle requis, évaluation d'artefact), approbations préalables, vérifications dynamiques, approbations postérieures, puis verrou exclusif. Quand une approbation expire, la phase est ignorée (skipped) ; quand les heures ouvrables ou les alertes Azure Monitor expirent, elle échoue.

Les **pipelines de mise en production classiques** utilisent des **portes de prédéploiement et de post-déploiement (gates)** : Invoke Azure Function, Query Azure Monitor alerts, Invoke REST API, **Query work items** (pas plus de n bogues ouverts), **Check Azure Policy compliance**. Les portes sont réévaluées à intervalle régulier (après un délai avant évaluation) jusqu'à ce qu'elles réussissent toutes dans le même intervalle d'échantillonnage, ou que le délai d'expiration fasse échouer le déploiement. Les portes de post-déploiement sur les alertes Azure Monitor sont le contrôle classique pour « arrêter la mise en production si la nouvelle version génère des erreurs ».

Les **environnements GitHub** utilisent des **règles de protection de déploiement** :

| Règle | Détail |
| --- | --- |
| Required reviewers (réviseurs requis) | Jusqu'à six utilisateurs ou équipes, une seule approbation suffit ; **Prevent self-review** empêche la personne qui a déclenché l'exécution d'approuver |
| Wait timer (minuteur d'attente) | De 1 à 43 200 minutes (30 jours) |
| Deployment branches and tags | Aucune restriction, branches protégées uniquement, ou modèles de noms sélectionnés |
| Custom deployment protection rules | Une GitHub App (par exemple un système d'observabilité ou de gestion des changements) approuve ou rejette |
| Allow administrators to bypass | Activé par défaut ; peut être désactivé |

Pour les dépôts privés, les réviseurs requis, les minuteurs d'attente et les règles personnalisées exigent GitHub Enterprise ; avec les plans Free, Pro et Team, ils s'appliquent aux dépôts publics.

```yaml
jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment: production   # protection rules of the environment apply before the job starts
    steps:
      - run: echo "Deploying build ${{ github.run_number }}"
```

Barrières de sécurité et de gouvernance : les résultats de l'analyse du code, les alertes de l'analyse des secrets et la conformité des licences comme règles de **ruleset** dans GitHub ; les vérifications Required template et Branch control, et la conformité Azure Policy, dans Azure DevOps ; l'échec du pipeline sur les résultats de gravité élevée de l'analyse des dépendances ou des conteneurs.

> **Piège d'examen.** Dans les pipelines YAML, approbations et portes sont des **vérifications sur l'environnement**, pas un mot clé de la phase. « Empêcher les équipes de déployer avec un pipeline qui saute l'analyse de sécurité » correspond à la vérification **Required template** sur l'environnement ou la connexion de service.

<!-- section: testing-strategy | objectives: 3.2.2 -->
## Concevoir une stratégie de test complète

Décalez les tests vers la gauche (shift left) : exécutez la plupart des tests tôt, vite et de façon isolée, et gardez moins de tests lents pour plus tard (la pyramide des tests).

| Type de test | Portée et dépendances | Quand il s'exécute | Outils courants |
| --- | --- | --- | --- |
| Tests locaux | Tests unitaires et rapides sur le poste du développeur, linters, hooks pre-commit | Avant le commit ou le push | Exécuteur de tests de l'IDE, `dotnet test`, `npm test` |
| Tests unitaires | Une classe ou une fonction, sans dépendance externe (simulacres), en millisecondes | À chaque build et chaque pull request | MSTest, xUnit, NUnit, Jest, JUnit |
| Tests d'intégration | Des composants avec leurs vraies dépendances (base de données, file d'attente, API) | En CI après les tests unitaires, ou dans un environnement de test | Conteneurs comme dépendances de service, bases de données de test |
| Tests fonctionnels et d'interface utilisateur | L'application déployée de bout en bout | Après le déploiement dans un environnement de test ou de préproduction | Playwright, Selenium |
| Tests de charge | Le comportement sous le trafic attendu et en pointe : temps de réponse, erreurs, débit | Avant la production, sur un environnement proche de la production, souvent planifiés | **Azure Load Testing** (tests JMeter, Locust ou basés sur une URL) |
| Tests de fumée (smoke tests) | Quelques parcours critiques après chaque déploiement | Juste après le déploiement, avant de basculer le trafic | Script ou appels REST |

La taxonomie de tests de Microsoft exprime la même idée : L0 et L1 sont des tests unitaires sans déploiement, L2 des tests fonctionnels sur un déploiement léger, L3 s'exécutent en production. Placez chaque test au niveau le plus bas capable de détecter le défaut, et rendez chaque test fiable : un test instable qui échoue au hasard finit ignoré et ne bloque plus rien.

Azure Load Testing décrit un test dans une configuration YAML avec des **critères d'échec**, pour qu'une exécution de pipeline échoue quand l'application ralentit :

```yaml
version: v0.1
testId: checkout-api-load
displayName: Checkout API load test
testPlan: checkout.jmx
testType: JMX
engineInstances: 2
failureCriteria:
  clientMetrics:
    - p90(response_time_ms) > 500
    - percentage(error) > 5
autoStop:
  errorPercentage: 80
  timeWindow: 60
```

| Exigence | Test |
| --- | --- |
| Détecter en quelques secondes, à chaque pull request, les régressions de la logique métier | Tests unitaires |
| Vérifier que l'API fonctionne avec le vrai schéma de la base SQL | Tests d'intégration |
| Vérifier que la version supporte 2 000 utilisateurs simultanés avec un p90 sous 500 ms | Test de charge avec critères d'échec |
| Détecter les problèmes avant que le code quitte le poste du développeur | Tests locaux, hooks pre-commit |

> **Conseil d'examen.** Les tests de charge répondent aux exigences de performances et de capacité (temps de réponse, débit, erreurs sous charge), pas à l'exactitude fonctionnelle. Dans un pipeline, les **critères d'échec** transforment un test de charge en barrière.

<!-- section: tests-in-pipeline | objectives: 3.2.3 -->
## Implémenter des tests dans un pipeline

Tâches de test d'Azure Pipelines :

| Tâche | Usage |
| --- | --- |
| `DotNetCoreCLI@2` avec `command: test` | Tests .NET sur tout système d'exploitation ; publie automatiquement les résultats TRX (`publishTestResults: true`) |
| `VSTest@3` | Visual Studio Test sous Windows : assemblys de test, filtre de tests, `.runsettings`, couverture du code, réexécution des tests en échec, répartition entre agents |
| `PublishTestResults@2` | Publie les résultats d'autres exécuteurs : `testResultsFormat` `JUnit` (par défaut), `NUnit`, `VSTest` (TRX), `XUnit`, `CTest` ; `failTaskOnFailedTests` |
| `AzureLoadTest@1` | Exécute un test Azure Load Testing à partir de sa configuration YAML ; l'identité de la connexion de service a besoin de **Load Test Contributor** |

```yaml
steps:
  - script: npm ci && npm test -- --reporters=default --reporters=jest-junit
    displayName: Unit tests
  - task: PublishTestResults@2
    condition: succeededOrFailed()   # publish results even when tests fail
    inputs:
      testResultsFormat: JUnit
      testResultsFiles: '**/junit*.xml'
      failTaskOnFailedTests: true
      testRunTitle: Web unit tests
```

**Agents de test.** Les agents hébergés par Microsoft contiennent déjà les frameworks de test courants et Visual Studio (images Windows). Un agent auto-hébergé a besoin des outils installés : pour `VSTest@3`, Visual Studio ou la tâche **Visual Studio Test Platform Installer** (`VisualStudioTestPlatformInstaller@1`) avec `vsTestVersion: toolsInstaller`. Les tests d'interface utilisateur qui ouvrent une fenêtre de navigateur exigent un agent exécuté **en mode interactif** (avec ouverture de session automatique), pas comme service, ou un navigateur sans interface (headless). Pour raccourcir les longues séries de tests, utilisez un job multi-agent (`strategy: parallel: 3`) et laissez `VSTest@3` répartir les lots (`distributionBatchType: basedOnExecutionTime`) ; chaque agent parallèle consomme un travail parallèle.

```yaml
jobs:
  - job: UITests
    pool:
      vmImage: windows-latest
    strategy:
      parallel: 3
    steps:
      - task: VSTest@3
        inputs:
          testSelector: testAssemblies
          testAssemblyVer2: |
            **\*UITests.dll
            !**\obj\**
          distributionBatchType: basedOnExecutionTime
          rerunFailedTests: true
          rerunMaxAttempts: '2'
```

**Intégration des résultats.** Les résultats publiés apparaissent dans l'onglet **Tests** de l'exécution (échecs, durée, pièces jointes, historique) et dans l'analytique et les rapports de test ; ils sont reliés à l'exécution du pipeline, au commit et aux bogues que l'on peut créer depuis un échec. Azure DevOps propose aussi la détection des **tests instables (flaky tests)**. Avec la validation de build, les tests en échec bloquent la pull request.

**GitHub Actions** n'a pas d'onglet de résultats de tests intégré : les tests s'exécutent comme des étapes, un code de sortie non nul fait échouer le job (et la vérification d'état requise), les fichiers de résultats se conservent avec `actions/upload-artifact@v7`, et un résumé peut être écrit dans `$GITHUB_STEP_SUMMARY`. L'action `azure/load-testing@v1` exécute les tests Azure Load Testing après `azure/login`.

> **Piège d'examen.** `PublishTestResults@2` placé après une étape de test en échec ne s'exécute pas avec la condition par défaut : aucun résultat n'est publié. Utilisez `condition: succeededOrFailed()` (ou `always()`).

<!-- section: code-coverage | objectives: 3.2.4 -->
## Implémenter l'analyse de la couverture du code

La couverture du code mesure la part des lignes (ou des branches) exécutées par les tests. Utilisez-la pour trouver le code non testé et empêcher la couverture de baisser, pas comme une note de qualité à elle seule.

Collecter la couverture :

| Pile | Commande ou paramètre | Sortie |
| --- | --- | --- |
| .NET avec coverlet | `dotnet test --collect "XPlat Code Coverage"` | XML Cobertura |
| .NET avec la couverture du code Microsoft | `dotnet test --collect "Code coverage"` (VSTest), `--coverage` (Microsoft.Testing.Platform), ou `codeCoverageEnabled: true` dans `VSTest@3` | `.coverage` |
| Java | JaCoCo (plug-in Maven ou Gradle) | XML JaCoCo |
| JavaScript | Jest ou Istanbul (`--coverage`) | Cobertura ou LCOV |

Publication dans Azure Pipelines : `PublishCodeCoverageResults@2` accepte les formats courants (`.coverage`, XML Cobertura et JaCoCo, LCOV et d'autres), fusionne plusieurs fichiers de synthèse et produit l'onglet **Code Coverage** avec un rapport HTML. Définissez `failIfCoverageEmpty: true` pour détecter une collecte cassée.

```yaml
steps:
  - task: DotNetCoreCLI@2
    inputs:
      command: test
      projects: '**/*Tests.csproj'
      arguments: '--configuration Release --collect "XPlat Code Coverage"'
  - task: PublishCodeCoverageResults@2
    inputs:
      summaryFileLocation: '$(Agent.TempDirectory)/**/coverage.cobertura.xml'
      failIfCoverageEmpty: true
```

**La couverture comme barrière de pull request dans Azure Repos.** Quand le pipeline exécuté par la validation de build publie la couverture, Azure DevOps publie un état de **couverture différentielle (diff coverage)** : la part des **lignes modifiées** couvertes par des tests, 70 % par défaut. Cela ne fonctionne que pour Azure Repos, et Learn indique le format Visual Studio `.coverage` (produit par `VSTest@3` ou `dotnet test --collect "Code coverage"`) comme entrée prise en charge. Configurez-la dans `azurepipelines-coverage.yml` à la racine du dépôt, et rendez-la bloquante avec une stratégie de branche de type **vérification d'état** sur `<pipeline name>/codecoverage`. Sans cette stratégie, l'état est seulement indicatif.

```yaml
# azurepipelines-coverage.yml
coverage:
  status:
    comments: on   # per-file coverage details as pull request comments
    diff:
      target: 80%
```

**GitHub.** Actions ne calcule pas la couverture lui-même : exécutez l'outil de couverture dans le workflow et faites échouer le job sous un seuil, ou publiez le rapport avec une action de reporting. GitHub Code Quality ajoute une règle de ruleset **Restrict code coverage** (couverture de lignes minimale, baisse maximale par rapport à la branche par défaut), en préversion publique.

> **Piège d'examen.** L'état de couverture de la pull request est une couverture **différentielle** (lignes modifiées), pas la couverture de toute la base de code, et il ne bloque rien tant qu'une stratégie de branche ne l'exige pas.

<!-- section: key-points -->
## Points clés

- Les barrières de déploiement YAML sont des vérifications sur les environnements et d'autres ressources : approbations, contrôle de branche, heures ouvrables, modèle requis, Azure Function, API REST, alertes Azure Monitor, verrou exclusif.
- Pipelines de mise en production classiques : portes de prédéploiement et de post-déploiement, dont Query work items et Check Azure Policy compliance. GitHub : règles de protection des environnements (réviseurs, minuteur d'attente, branches, règles personnalisées par GitHub App).
- Pyramide des tests : beaucoup de tests unitaires, moins de tests d'intégration, peu de tests d'interface et de charge ; les critères d'échec d'Azure Load Testing font des performances une barrière.
- `DotNetCoreCLI@2` et `VSTest@3` publient leurs résultats ; les autres exécuteurs ont besoin de `PublishTestResults@2` avec `succeededOrFailed()`.
- Les agents de test auto-hébergés ont besoin des outils (Test Platform Installer) ; les tests d'interface exigent un agent interactif ; `strategy: parallel` répartit les tests.
- `PublishCodeCoverageResults@2` pour les rapports ; la couverture différentielle des pull requests (70 % par défaut) ne bloque qu'avec une stratégie de vérification d'état.
