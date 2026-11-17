Le monitoring ferme la boucle DevOps : la télémétrie des applications et de l'infrastructure revient dans les pipelines, les tableaux et les dépôts. L'examen demande quel insight collecte quelle télémétrie et ce qu'il exige, comment Azure Monitor se connecte à Azure DevOps et à GitHub, comment configurer les insights et graphiques GitHub, et comment être alerté quand un workflow ou un pipeline échoue.

<!-- section: azure-monitor-devops | objectives: 5.1.1 -->
## Azure Monitor et les journaux Azure Monitor avec les outils DevOps

Azure Monitor stocke des **métriques** (métriques de plateforme, collectées gratuitement ; métriques Prometheus et OpenTelemetry dans un **espace de travail Azure Monitor**) et des **journaux** dans un **espace de travail Log Analytics**, interrogés en KQL. Les journaux de ressources arrivent dans un espace de travail par des **paramètres de diagnostic** ; les données invitées des machines par l'agent Azure Monitor et des **règles de collecte de données (DCR)**. Les règles d'alerte (métrique, recherche dans les journaux, journal d'activité) appellent des **groupes d'actions** : e-mail, SMS, notification push, appel vocal, webhook, fonction Azure, application logique, runbook Automation, Event Hubs, ITSM.

| Intégration | Comment |
| --- | --- |
| Arrêter un déploiement tant que l'application n'est pas saine | Vérification **Query Azure Monitor alerts** sur l'environnement ou la connexion de service : réussit seulement si aucune règle d'alerte n'est active lors de l'évaluation, réévaluée à intervalle jusqu'à un délai d'expiration |
| Créer un élément de travail ou une issue quand la production déclenche une alerte | Groupe d'actions avec une application logique ou une fonction qui appelle l'API REST d'Azure Boards ou de GitHub |
| Lancer un workflow de correction depuis une alerte | Webhook de groupe d'actions qui appelle un événement `repository_dispatch` GitHub ou l'API d'exécution de pipelines Azure DevOps |
| Conserver le journal d'audit Azure DevOps au-delà de 90 jours et l'interroger | **Diffusion en continu de l'audit** vers les journaux Azure Monitor (aussi Splunk, Event Grid) |
| Analyser les événements d'audit de GitHub Enterprise dans Azure | Diffusion en continu du journal d'audit de l'entreprise vers Azure Event Hubs ou Stockage Blob Azure |
| Versionner le monitoring avec l'application | Règles d'alerte, groupes d'actions, DCR et classeurs en Bicep, déployés par le pipeline |

La **diffusion en continu de l'audit** exige une organisation adossée à Microsoft Entra ID, l'audit activé (désactivé par défaut) et l'appartenance à Project Collection Administrators ou les autorisations **Manage audit streams** et **View audit log**. Pour les journaux Azure Monitor, saisissez l'ID de ressource de l'espace de travail et l'ID de locataire, puis connectez-vous à Azure. Les événements arrivent dans la table `AzureDevOpsAuditing`, par lots toutes les demi-heures au plus ; un flux désactivé rattrape au maximum les sept jours précédents. Deux flux sont autorisés par type de cible.

```kusto
AzureDevOpsAuditing
| where TimeGenerated > ago(7d)
| where OperationName has "Policy"
| summarize Changes = count() by ActorUPN, OperationName
| order by Changes desc
```

> **Piège d'examen.** Azure DevOps conserve au maximum 90 jours de données d'audit. « Conserver les événements d'audit deux ans et les corréler avec l'activité Azure » exige un flux vers un espace de travail Log Analytics (avec une rétention plus longue), pas un export depuis le portail.

<!-- section: telemetry-collection | objectives: 5.1.2 -->
## Collecter la télémétrie avec les insights d'Azure Monitor

| Insight | Supervise | Collecte | Les données vont dans |
| --- | --- | --- | --- |
| Application Insights | Requêtes, dépendances, exceptions, traces, vues de pages, disponibilité | Instrumentation automatique sur les plateformes prises en charge, ou distribution OpenTelemetry dans le code | Ressource basée sur un espace de travail Log Analytics |
| VM Insights | Performances invitées (processeur, mémoire, disque, réseau) des VM, groupes identiques, serveurs Arc | Agent Azure Monitor + DCR (les serveurs Arc exigent d'abord l'agent Connected Machine) | Métriques OpenTelemetry vers un espace de travail Azure Monitor (recommandé pour les nouveaux déploiements) ou métriques basées sur les journaux vers Log Analytics |
| Container Insights | Nœuds, pods, conteneurs et journaux de conteneurs AKS | Module complémentaire de supervision (agent Azure Monitor conteneurisé : `ama-logs`, `ama-metrics`) | Journaux vers Log Analytics (`ContainerLogV2`, `KubePodInventory`), métriques Prometheus vers un espace de travail Azure Monitor |
| Storage Insights | Capacité, disponibilité, transactions, latence des comptes de stockage | Métriques de plateforme, rien à installer | Métriques ; les journaux de ressources exigent un paramètre de diagnostic |
| Network Insights | Topologie, intégrité et connectivité des ressources réseau | Métriques de plateforme, Network Watcher, journaux de flux | Métriques, Log Analytics pour l'analytique du trafic |

**Application Insights.** Créez une ressource basée sur un espace de travail et donnez à l'application sa **chaîne de connexion** (`APPLICATIONINSIGHTS_CONNECTION_STRING`) ; la chaîne de connexion remplace la clé d'instrumentation. Pour l'instrumentation dans le code, Microsoft recommande la distribution OpenTelemetry (Microsoft OpenTelemetry Distro pour .NET, Node.js et Python ; Azure Monitor OpenTelemetry Distro pour Java). Fonctionnalités : Live Metrics, cartographie d'application, tests de disponibilité, vues Échecs et Performances, recherche de transactions et analyse de l'utilisation (utilisateurs, sessions, événements, entonnoirs, flux, cohortes).

```bicep
resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: 'law-contoso-prod'
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-contoso-web'
  location: resourceGroup().location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: law.id
  }
}

output connectionString string = appi.properties.ConnectionString
```

**VM Insights.** Trois étapes : installer l'agent Azure Monitor une fois, créer des DCR, les associer aux machines. Le portail fait les trois quand vous activez la supervision ; à grande échelle, utilisez Azure Policy, l'interface CLI ou Bicep.

```bash
az vm extension set --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor --vm-name vm-web1 --resource-group rg-web
az monitor data-collection rule association create --name dcr-vminsights \
  --rule-id "<dcr resource ID>" --resource "<vm resource ID>"
```

**Container Insights.** Les journaux et les métriques Prometheus s'activent séparément :

```bash
az aks enable-addons --addon monitoring --name aks-contoso \
  --resource-group rg-aks --workspace-resource-id "<workspace resource ID>"
az aks update --enable-azure-monitor-metrics --name aks-contoso \
  --resource-group rg-aks
```

Les journaux du plan de contrôle (`kube-audit`, `kube-apiserver`) exigent un paramètre de diagnostic sur le cluster. Azure Managed Grafana se lie à l'espace de travail Azure Monitor pour les tableaux de bord Prometheus.

| Exigence | Réponse |
| --- | --- |
| Trouver quelle dépendance ralentit une requête web | Application Insights (cartographie d'application, Performances) |
| Mémoire de 200 VM, y compris les nouvelles | VM Insights activé par Azure Policy |
| Redémarrages de pods et stdout des conteneurs sur AKS | Container Insights (module complémentaire de supervision) |
| Métriques Prometheus avec des tableaux de bord Grafana | Prometheus managé + Azure Managed Grafana |
| Latence d'un compte de stockage sans rien installer | Storage Insights |

> **Piège d'examen.** L'agent Log Analytics (MMA) est retiré ; VM Insights et Container Insights utilisent l'agent Azure Monitor avec des règles de collecte de données. Les métriques d'hôte d'une VM n'exigent rien, la mémoire invitée exige l'agent.

<!-- section: github-insights | objectives: 5.1.3 -->
## Supervision dans GitHub : insights et graphiques

| Où | Quoi | Qui |
| --- | --- | --- |
| Onglet **Insights** du dépôt | Pulse, Contributors, Community, Traffic, Commits, Code frequency, Dependency graph, Network, Forks | Lecteurs du dépôt ; Traffic exige l'accès push |
| **Insights** de l'organisation | **Actions Usage Metrics** (minutes par workflow, job, dépôt, système d'exploitation, type d'exécuteur) et **Actions Performance Metrics** (durée moyenne d'exécution, temps d'attente en file, taux d'échec) | Propriétaires de l'organisation, ou rôle d'organisation personnalisé avec **View organization Actions metrics** |
| **Insights** du projet | Graphiques construits à partir des éléments d'un GitHub Project | Toute personne qui peut voir le projet |

**Insights pour les Projects.** Ouvrez **Insights** en haut à droite du projet. Les **graphiques actuels** montrent l'état présent (éléments par personne assignée, par itération, par statut) ; les **graphiques historiques** suivent l'état des éléments dans le temps (axe X réglé sur Time ; le graphique par défaut est un burn up). Pour configurer un graphique, sélectionnez-le et choisissez **Configure** :

- **Layout** : le type de graphique (barres, colonnes, lignes et variantes empilées).
- **X-axis** : le champ de l'axe horizontal (Assignees, Status, Iteration, un champ personnalisé, ou Time).
- **Group by** (graphiques actuels uniquement) : découper chaque barre selon un second champ.
- **Y-axis** : nombre d'éléments par défaut, ou somme, moyenne, minimum ou maximum d'un champ numérique comme Estimate.
- **Filtre** : la même syntaxe de filtre que les vues du projet, par exemple `label:bug iteration:@current`.

Puis **Save changes**. Les éléments archivés et supprimés ne sont pas suivis.

| Exigence | Réponse |
| --- | --- |
| Points d'histoire restants par sprint | Graphique de projet, axe X Iteration, axe Y somme d'Estimate |
| Issues ouvertes et terminées sur le trimestre | Graphique historique (axe X Time) |
| Quels workflows consomment le plus de minutes | Insights de l'organisation > Actions Usage Metrics |
| Quels jobs attendent le plus longtemps un exécuteur | Actions Performance Metrics (temps d'attente en file) |
| Clones et visiteurs d'un dépôt public | Insights du dépôt > Traffic |

> **Conseil d'examen.** Le temps d'attente en file et le taux d'échec sont des métriques de performances ; les minutes sont des métriques d'utilisation. Accordez à un responsable des mises en production **View organization Actions metrics** par un rôle d'organisation personnalisé plutôt que d'en faire un propriétaire.

<!-- section: pipeline-alerts | objectives: 5.1.4 -->
## Alertes pour les événements dans GitHub Actions et Azure Pipelines

**GitHub Actions.**

- Notifications personnelles : **Settings > Notifications > Actions**, web ou e-mail, éventuellement **uniquement pour les workflows en échec** ; vous êtes averti pour les exécutions que vous avez déclenchées.
- Messagerie : l'application GitHub pour Microsoft Teams ou Slack abonne un canal aux notifications d'exécution des workflows d'un dépôt.
- Dans le workflow : un job avec `if: failure()` qui ouvre une issue ou appelle un webhook ; des webhooks ou des GitHub Apps peuvent s'abonner aux événements `workflow_run` et `workflow_job`.

```yaml
notify:
  needs: deploy
  if: failure()
  runs-on: ubuntu-latest
  permissions:
    issues: write
  steps:
    - run: gh issue create --repo "$GITHUB_REPOSITORY" --title "Deployment failed" --body "$RUN_URL"
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

**Azure Pipelines.**

- **Notifications** : **Paramètres du projet > Notifications > Nouvel abonnement**, catégorie Build ou Release, modèle comme **Build completes** avec un filtre sur l'état, remis à une équipe, à un rôle de l'équipe ou à une adresse e-mail personnalisée. Les utilisateurs gèrent leurs abonnements personnels dans **Paramètres utilisateur > Notifications**. Les Project Administrators gèrent les abonnements du projet, les administrateurs d'équipe ceux de l'équipe ; il n'existe pas d'abonnement à l'échelle de l'organisation.
- **Hooks de service** : **Paramètres du projet > Hooks de service** envoie des événements (build terminé, changement d'état d'exécution, déploiement de mise en production terminé, approbation en attente) vers Slack, Microsoft Teams, des webhooks, Azure Service Bus, des files d'attente Stockage Azure et d'autres.
- L'application Azure Pipelines pour Microsoft Teams ou Slack abonne un canal à un pipeline.
- Dans le pipeline : un job ou une étape avec `condition: failed()`.

```yaml
- job: Notify
  dependsOn: Deploy
  condition: failed()
  steps:
    - bash: |
        curl -sS -H "Content-Type: application/json" \
          -d "{\"text\":\"Deployment $(Build.BuildNumber) failed\"}" "$WEBHOOK_URL"
      env:
        WEBHOOK_URL: $(ChatWebhookUrl)
```

| Exigence | Réponse |
| --- | --- |
| Envoyer un e-mail à l'équipe seulement quand le build de la branche principale échoue | Abonnement aux notifications Azure DevOps, Build completes, filtre sur l'état Failed et la branche |
| Publier chaque déploiement d'un pipeline dans un canal Teams | Application Azure Pipelines ou hook de service |
| Un développeur veut savoir quand son propre workflow échoue | Paramètres de notification GitHub, workflows en échec uniquement |
| Ouvrir automatiquement une issue quand le déploiement en production échoue | Job avec `if: failure()` et `issues: write` |
| Alerter quand l'application se dégrade après un déploiement | Règle d'alerte Azure Monitor avec un groupe d'actions, et la vérification Query Azure Monitor alerts |

> **Piège d'examen.** Les abonnements aux notifications d'Azure DevOps envoient des e-mails ; pour atteindre un outil de messagerie ou un système externe, utilisez un hook de service ou l'application de messagerie. Et Skip initiator est activé par défaut : la personne qui a lancé l'exécution n'est pas avertie par un abonnement d'équipe.

<!-- section: key-points -->
## Points clés

- Journaux dans Log Analytics, métriques Prometheus et OpenTelemetry dans un espace de travail Azure Monitor ; paramètres de diagnostic pour les journaux de ressources, agent Azure Monitor avec DCR pour les invités.
- Intégrations DevOps : vérification Query Azure Monitor alerts, groupes d'actions qui appellent des applications logiques ou des webhooks, diffusion de l'audit vers `AzureDevOpsAuditing`.
- Application Insights : basé sur un espace de travail, chaîne de connexion, distribution OpenTelemetry. VM Insights : agent + DCR. Container Insights : module complémentaire de supervision plus Prometheus managé.
- GitHub : Insights du dépôt, métriques d'utilisation et de performances d'Actions dans l'organisation, graphiques actuels et historiques des Projects configurés avec Layout, X-axis, Group by et Y-axis.
- Alertes : paramètres de notification GitHub, applications de messagerie et `if: failure()` ; abonnements Azure DevOps, hooks de service et `condition: failed()`.
