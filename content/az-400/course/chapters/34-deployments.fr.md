Une stratégie de déploiement décide comment une nouvelle version atteint les utilisateurs, quelle part de l'audience elle touche d'abord et à quelle vitesse vous pouvez revenir en arrière. Les questions d'examen donnent une contrainte (aucun temps d'arrêt, tester avec de vrais utilisateurs, restauration instantanée, modification de schéma) et attendent le modèle, la fonctionnalité Azure ou la tâche de pipeline correspondants.

<!-- section: deployment-strategies | objectives: 3.4.1 -->
## Stratégies de déploiement

| Stratégie | Fonctionnement | Restauration | À choisir quand |
| --- | --- | --- | --- |
| Bleu/vert (blue-green) | Deux environnements identiques ; déployer sur celui qui est inactif, tester, puis basculer tout le trafic | Rebasculer | Bascule et restauration instantanées, et vous pouvez payer deux environnements |
| Canari (canary) | Envoyer une petite part du trafic (ou des serveurs) vers la nouvelle version, observer les métriques, puis augmenter | Ramener la part du trafic | Valider avec du trafic réel en limitant le rayon d'impact |
| En anneau (ring) | Publier vers des groupes d'utilisateurs successifs : anneau 0 (équipe), anneau 1 (premiers utilisateurs), puis tout le monde | Arrêter le déploiement à l'anneau en cours | Large base d'utilisateurs, exposition par audience |
| Progressif (rolling) | Remplacer les instances par lots derrière un équilibreur de charge | Redéployer la version précédente lot par lot | Pool fixe de serveurs, pas de second environnement |
| Exposition progressive | Terme générique : canari, anneaux et déploiements par pourcentage conditionnés par des signaux d'intégrité | S'arrêter à l'étape en cours | Promotion automatisée fondée sur la télémétrie |
| Indicateurs de fonctionnalités | Code déployé masqué ; un indicateur active la fonctionnalité pour les utilisateurs choisis | Désactiver l'indicateur, sans redéploiement | Séparer le déploiement de la mise en production, coupe-circuit |
| Tests A/B | Deux variantes montrées à deux groupes d'utilisateurs, mesurées sur un indicateur métier | Terminer l'expérience | Choisir la variante la plus performante |

> **Piège d'examen.** Le canari et les tests A/B répartissent tous deux les utilisateurs, mais un canari valide l'**intégrité** d'une nouvelle version avant le déploiement complet, alors qu'un test A/B compare des **variantes** pour en retenir une. Le bleu/vert déplace 100 % du trafic d'un coup ; le canari le déplace progressivement.

Les travaux de déploiement d'Azure Pipelines implémentent trois stratégies avec des hooks de cycle de vie :

| Stratégie | Hooks |
| --- | --- |
| `runOnce` | `preDeploy`, `deploy`, `routeTraffic`, `postRouteTraffic`, puis `on: failure` ou `on: success`, chacun une fois |
| `rolling` | Mêmes hooks par lot de `maxParallel` (nombre ou pourcentage) ; pris en charge uniquement pour les ressources machine virtuelle |
| `canary` | `preDeploy` une fois, puis `deploy`, `routeTraffic`, `postRouteTraffic` pour chaque valeur de `increments` |

```yaml
jobs:
- deployment: Web
  environment:
    name: prod
    resourceType: VirtualMachine
  strategy:
    rolling:
      maxParallel: 25%
      deploy:
        steps:
        - script: ./deploy.sh
      postRouteTraffic:
        steps:
        - script: ./smoke-test.sh
      on:
        failure:
          steps:
          - script: ./rollback.sh
```

Un travail de déploiement télécharge automatiquement les artefacts du pipeline dans le hook `deploy`, mais n'extrait pas le code source : ajoutez `checkout: self` quand des scripts du dépôt sont nécessaires.

<!-- section: dependency-order | objectives: 3.4.2 -->
## Ordonner de manière fiable les déploiements des dépendances

Déployez d'abord ce dont les autres dépendent : réseau et infrastructure partagée, puis données (schéma de base de données), puis services back-end, puis front-ends.

| Exigence | Conception |
| --- | --- |
| Infrastructure avant l'application dans un même pipeline | Phases distinctes, `dependsOn: Infra` sur la phase de l'application |
| Deux services indépendants, une base de données partagée | Phase de base de données d'abord, puis les deux phases de services avec `dependsOn: Database` (elles s'exécutent en parallèle) |
| Un pipeline de bibliothèque doit se terminer avant que le pipeline de l'application démarre | Déclencheur `resources.pipelines` sur le pipeline de la bibliothèque |
| Déployer uniquement la version qui a réussi la phase précédente | Promouvoir le même artefact, ne jamais rebuilder à chaque phase |
| Deux exécutions ne doivent pas déployer en même temps vers le même environnement | Vérification Exclusive lock sur l'environnement, ou `concurrency` dans GitHub Actions |
| Ressources d'un même fichier Bicep | Dépendances implicites par les références symboliques ; `dependsOn` uniquement en l'absence de référence |
| GitHub Actions | `needs: [infra, database]` sur le job de déploiement |

> **Conseil d'examen.** « Ordonné de manière fiable » renvoie à des dépendances explicites (`dependsOn`, `needs`, déclencheurs de ressource de pipeline), pas à des astuces de temporisation comme une tâche Delay.

<!-- section: minimize-downtime | objectives: 3.4.3 -->
## Réduire les temps d'arrêt : équilibrage de charge, déploiements progressifs et emplacements

| Technique | Usage |
| --- | --- |
| Azure Load Balancer, Application Gateway | Sortir une machine virtuelle du pool principal (la sonde d'intégrité échoue), la mettre à jour, la remettre |
| Azure Front Door, Traffic Manager | Déplacer le trafic entre régions ou entre les déploiements bleu et vert |
| Mise à niveau propagée (rolling upgrade) des groupes de machines virtuelles identiques | Mettre à niveau les instances par lots avec surveillance de l'intégrité |
| Stratégie `rolling` d'un travail de déploiement | Lots de machines virtuelles d'un environnement |
| Emplacements de déploiement App Service | Déployer en préproduction (staging), préchauffer, permuter avec la production |

Les emplacements exigent le niveau **Standard, Premium ou Isolated**, sans coût supplémentaire : jusqu'à 5 emplacements en Standard et 20 en Premium et Isolated. Une permutation applique d'abord les paramètres d'emplacement de la cible aux instances de la source et les redémarre, attend le préchauffage, puis bascule le routage : la production reste en ligne et la permutation est elle-même une restauration (permuter à nouveau).

| Permuté avec l'application | Reste dans l'emplacement |
| --- | --- |
| Paramètres d'application et chaînes de connexion non marqués comme paramètre d'emplacement, versions d'infrastructure, mappages de gestionnaires, contenu WebJobs | Paramètres marqués **Paramètre d'emplacement de déploiement**, points de terminaison de publication, domaines personnalisés, certificats non publics et paramètres TLS, paramètres de mise à l'échelle, identités managées, intégration au réseau virtuel |

- **Permutation avec aperçu** s'arrête après l'application des paramètres de la cible, pour valider avant **Terminer la permutation** ou **Annuler la permutation**.
- **Permutation automatique** permute après chaque déploiement dans l'emplacement ; non prise en charge pour les applications web Linux ni pour Web App for Containers.
- Préchauffage : `applicationInitialization` dans `web.config`, ou `WEBSITE_SWAP_WARMUP_PING_PATH` et `WEBSITE_SWAP_WARMUP_PING_STATUSES`.
- **% du trafic** sur un emplacement envoie une part des utilisateurs de production vers lui (canari dans App Service) ; le cookie `x-ms-routing-name` fixe un client sur l'emplacement.

```bash
az webapp deployment slot swap --resource-group rg-shop \
  --name app-shop --slot staging --target-slot production
```

> **Piège d'examen.** Une chaîne de connexion qui doit continuer à pointer vers la base de test après la permutation est marquée comme paramètre d'emplacement de déploiement sur l'emplacement de préproduction. Sans cela, la valeur de préproduction passe en production.

<!-- section: hotfix-path | objectives: 3.4.4 -->
## Plan de gestion des correctifs à priorité élevée

Un plan de correctif répond à trois questions : où le correctif est fait, comment il atteint vite la production, et comment il revient dans la ligne principale.

1. Créez une branche `hotfix/*` à partir du code en production (la branche de mise en production ou l'étiquette de version), pas à partir de `main`, qui peut contenir du travail non publié.
2. Corrigez, ouvrez une demande de tirage avec les stratégies de branche ou règles de protection habituelles (moins de réviseurs est acceptable, jamais de contournement des builds obligatoires ni des analyses de sécurité).
3. Exécutez le même pipeline : un seul build, l'artefact déployé à travers les phases, éventuellement avec des minuteurs d'attente plus courts, sans jamais ignorer les approbations de production.
4. Fusionnez ou sélectionnez (cherry-pick) le correctif dans `main` (et toute autre branche de mise en production active) pour que le bogue ne revienne pas à la version suivante.

En développement basé sur le tronc (trunk-based), corrigez d'abord dans `main`, puis sélectionnez le commit vers la branche de mise en production. Les indicateurs de fonctionnalités sont une atténuation encore plus rapide : désactivez la fonctionnalité défaillante pendant la préparation du correctif.

<!-- section: resiliency | objectives: 3.4.5 -->
## Stratégie de résilience pour le déploiement

| Risque | Atténuation |
| --- | --- |
| Échec transitoire d'une tâche (réseau, limitation) | `retryCountOnTaskFailure` sur la tâche ; relancer une phase en échec depuis l'exécution |
| Mauvaise version détectée après la mise en production | Restauration automatisée dans `on: failure`, permutation inverse, ou redéploiement de l'artefact précédent |
| Problème visible uniquement dans la télémétrie | Vérification Query Azure Monitor alerts, ou contrôles d'intégrité dans `postRouteTraffic`, avant la promotion |
| Panne d'une région | Déployer vers des régions jumelées derrière Front Door ou Traffic Manager, une région à la fois |
| Instance défaillante maintenue en rotation | Chemin de contrôle d'intégrité App Service, sondes d'intégrité de l'équilibreur de charge |
| Dérive de configuration entre environnements | Déployer l'infrastructure et la configuration depuis le code à chaque mise en production |
| Migration longue qui bloque une restauration | Modifications de base de données rétrocompatibles (voir plus bas) |

La restauration par redéploiement de l'**artefact précédent** ne fonctionne que si les artefacts et les exécutions sont conservés (voir la stratégie de rétention dans Gérer les pipelines). Avancer avec un correctif (roll forward) est l'alternative quand les modifications de données ne peuvent pas être annulées.

<!-- section: feature-flags | objectives: 3.4.6 -->
## Indicateurs de fonctionnalités avec le Gestionnaire de fonctionnalités d'Azure App Configuration

Les indicateurs de fonctionnalités se créent dans le magasin App Configuration sous **Opérations > Gestionnaire de fonctionnalités**, en tant que Switch (activé ou désactivé), Rollout (pourcentage, utilisateurs et groupes, planification) ou Experiment (variantes avec allocation). Ils sont stockés comme paires clé-valeur avec le préfixe réservé `.appconfig.featureflag/` et peuvent porter des étiquettes (labels) par environnement.

```json
{
  "id": "NewCheckout",
  "enabled": true,
  "conditions": {
    "requirement_type": "All",
    "client_filters": [
      { "name": "Microsoft.TimeWindow", "parameters": { "Start": "Mon, 01 Dec 2026 08:00:00 GMT" } },
      { "name": "Microsoft.Targeting", "parameters": { "Audience": {
          "Users": [ "anna@contoso.com" ],
          "Groups": [ { "Name": "Ring1", "RolloutPercentage": 50 } ],
          "DefaultRolloutPercentage": 10 } } }
    ]
  }
}
```

| Filtre intégré | Active l'indicateur |
| --- | --- |
| `Microsoft.Percentage` | Pour un pourcentage des évaluations |
| `Microsoft.TimeWindow` | Entre `Start` et `End`, éventuellement de façon récurrente |
| `Microsoft.Targeting` | Pour les utilisateurs et groupes listés, un pourcentage de chaque groupe, un pourcentage par défaut, avec des exclusions prioritaires |

`requirement_type` vaut `Any` par défaut (un filtre satisfait suffit) ou `All`. En .NET, l'application charge les indicateurs avec `UseFeatureFlags()` dans `AddAzureAppConfiguration`, enregistre `AddFeatureManagement()` (`Microsoft.FeatureManagement.AspNetCore`) et teste les indicateurs avec `IsEnabledAsync`, l'attribut `FeatureGate` ou le tag helper `feature`. Les indicateurs sont actualisés toutes les 30 secondes par défaut. L'application lit le magasin avec une identité managée qui détient **App Configuration Data Reader**.

> **Piège d'examen.** Modifier un indicateur ne demande ni exécution de pipeline ni redéploiement. Si l'exigence est « désactiver la fonctionnalité immédiatement sans redéployer », la réponse est l'indicateur, pas une permutation d'emplacements.

<!-- section: deploy-apps | objectives: 3.4.7 -->
## Déployer des conteneurs, des fichiers binaires et des scripts

| Package | Azure Pipelines | GitHub Actions |
| --- | --- | --- |
| Build d'image conteneur et push vers Azure Container Registry | `Docker@2` (`buildAndPush`) | `docker/build-push-action`, ou `az acr build` |
| Conteneur vers App Service | `AzureWebAppContainer@1` | `azure/webapps-deploy@v3` avec `images` |
| Conteneur vers Azure Container Apps | `AzureContainerApps@1` | `azure/container-apps-deploy-action` |
| Binaires (zip, dossier) vers App Service | `AzureWebApp@1` | `azure/webapps-deploy@v3` avec `package` |
| Functions | `AzureFunctionApp@2` | `Azure/functions-action` |
| Scripts | `AzureCLI@2`, `AzurePowerShell@5`, `script`, `pwsh` | `azure/cli`, `run:` après `azure/login` |

```yaml
- task: AzureWebApp@1
  inputs:
    azureSubscription: sc-prod-wif        # workload identity federation service connection
    appType: webAppLinux
    appName: app-shop
    deployToSlotOrASE: true
    resourceGroupName: rg-shop
    slotName: staging
    package: $(Pipeline.Workspace)/drop/*.zip
```

Buildez une seule fois, publiez l'artefact ou l'image avec une étiquette immuable (l'ID de build ou le SHA du commit, pas `latest`), et déployez ce même artefact dans chaque phase.

<!-- section: database-tasks | objectives: 3.4.8 -->
## Déploiements qui incluent des tâches de base de données

| Approche | Outils |
| --- | --- |
| Fondée sur l'état (déclarative) | Projet de base de données SQL Server compilé en DACPAC ; `SqlAzureDacpacDeployment@1` ou SqlPackage `/Action:Publish` ; `azure/sql-action` dans GitHub Actions |
| Fondée sur les migrations | Scripts ordonnés ou migrations Entity Framework Core : `dotnet ef migrations script --idempotent` produit un script réexécutable sans risque ; bundles de migration pour un exécutable autonome |
| Script SQL ponctuel | `SqlAzureDacpacDeployment@1` avec un fichier SQL, ou `Invoke-Sqlcmd` dans `AzurePowerShell@5` |

```yaml
- task: SqlAzureDacpacDeployment@1
  inputs:
    azureSubscription: sc-prod-wif
    ServerName: sql-shop.database.windows.net
    DatabaseName: shopdb
    SqlUsername: $(sqlUser)
    SqlPassword: $(sqlPassword)              # secret variable
    DacpacFile: $(Pipeline.Workspace)/db/Shop.dacpac
```

Règles pour des modifications de schéma sans temps d'arrêt :

- Exécutez l'étape de base de données **avant** celle de l'application, dans sa propre phase ou son propre travail, pour que le nouveau code trouve le nouveau schéma.
- Rendez les modifications **rétrocompatibles** (expansion puis contraction) : ajoutez d'abord une colonne acceptant la valeur NULL ou une nouvelle table, déployez le code qui l'utilise, supprimez l'ancienne colonne dans une version ultérieure. La version précédente de l'application continue de fonctionner, ce qui garde une restauration possible.
- L'adresse IP de l'agent doit être autorisée par le pare-feu du serveur logique, ou l'agent doit atteindre le serveur en privé (agent auto-hébergé dans le réseau virtuel).
- Générez un rapport ou un script de déploiement à relire avant la production, conditionné par une approbation sur l'environnement.

> **Piège d'examen.** Restaurer une sauvegarde de la base n'est pas une stratégie de restauration de déploiement : on perd les données écrites depuis la sauvegarde. Concevez les modifications de schéma pour que l'ancien code fonctionne encore, et restaurez plutôt l'application.

<!-- section: key-points -->
## Points clés

- Bleu/vert : tout le trafic bascule, restauration instantanée ; canari : une petite part d'abord ; anneaux : des audiences ; indicateurs de fonctionnalités : déployer masqué, publier par configuration.
- Ordonnez les dépendances avec les phases et `dependsOn` ou `needs`, les déclencheurs de ressource de pipeline et un artefact unique promu.
- Les emplacements exigent Standard ou plus ; les paramètres d'emplacement restent, tout le reste est permuté ; permutez à nouveau pour restaurer.
- Correctif à partir du code en production, même pipeline et mêmes contrôles, puis fusion vers `main`.
- Indicateurs App Configuration : préfixe `.appconfig.featureflag/`, filtres Percentage, TimeWindow, Targeting.
- Base de données d'abord, modifications rétrocompatibles, DACPAC ou scripts de migration idempotents.
