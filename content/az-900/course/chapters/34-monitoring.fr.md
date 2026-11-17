Trois outils répondent à trois questions différentes : comment mon environnement pourrait-il être meilleur (Azure Advisor), Azure lui-même est-il en bonne santé pour moi (Azure Service Health), et que font mes ressources (Azure Monitor).

<!-- section: advisor | objectives: 3.4.1 -->
## Azure Advisor

**Azure Advisor** évalue vos ressources et formule des **recommandations personnalisées**, avec les actions à entreprendre : tout de suite, plus tard ou jamais (ignorer). Il est gratuit, disponible depuis le portail et par une API, et il peut vous notifier des nouvelles recommandations.

Ses cinq catégories :

| Catégorie | Recommandations pour |
| --- | --- |
| **Fiabilité** | Assurer et améliorer la continuité des applications critiques |
| **Sécurité** | Détecter les menaces et les vulnérabilités qui pourraient mener à des violations |
| **Performances** | Améliorer la vitesse des applications |
| **Excellence opérationnelle** | Améliorer l'efficacité des processus et des flux de travail, la facilité de gestion des ressources et les pratiques de déploiement |
| **Coût** | Optimiser et réduire les dépenses Azure globales |

Exemples : redimensionner ou arrêter une machine virtuelle sous-utilisée (coût), activer l'authentification multifacteur (sécurité), répartir des machines virtuelles sur des zones de disponibilité (fiabilité).

<!-- section: service-health | objectives: 3.4.2 -->
## Azure Service Health

**Azure Service Health** vous tient informé de l'état de santé de la plateforme Azure pour ce qui vous concerne. Il réunit trois services :

| Service | Portée | Usage |
| --- | --- | --- |
| **État d'Azure** (Azure Status) | **Tous** les services Azure dans **toutes** les régions, pour tout le monde | Une vue mondiale des pannes importantes, sur une page d'état publique |
| **Service Health** | Seulement les **services et régions que vous utilisez** | Problèmes de service en cours, **maintenance planifiée** à venir, avis d'intégrité ; vous pouvez définir des **alertes** pour être notifié |
| **Resource Health** | **Vos ressources individuelles**, comme une machine virtuelle | Savoir si une ressource précise est disponible, et si un problème vient de la plateforme |

Service Health conserve aussi un historique des événements, avec des rapports officiels qui expliquent la cause d'un incident.

> **Piège d'examen.** « Y a-t-il une panne dans la région où tournent mes machines virtuelles ? » relève de Service Health. « Ma machine virtuelle est-elle en bonne santé ? » relève de Resource Health. « Quelle est l'utilisation du processeur de ma machine virtuelle ? » relève d'Azure Monitor.

<!-- section: azure-monitor | objectives: 3.4.3 -->
## Azure Monitor

**Azure Monitor** est la plateforme qui sert à **collecter** des données sur vos ressources, à les **analyser**, à les **visualiser** et à **agir**. Il surveille les ressources Azure, les ressources locales et celles d'autres clouds.

Son organisation :

- **Sources de données** : applications, systèmes d'exploitation, ressources Azure, abonnements, locataire.
- **Magasins de données** : les **métriques** (valeurs numériques dans le temps) et les **journaux** (événements enregistrés).
- **Usages** : tableaux de bord et classeurs pour visualiser, requêtes pour analyser, alertes et mise à l'échelle automatique pour réagir.

Trois composants sont nommés à l'examen :

| Composant | Rôle |
| --- | --- |
| **Azure Log Analytics** | L'outil du portail où vous **écrivez et exécutez des requêtes de journal** sur les données collectées par Azure Monitor, en langage de requête Kusto : de la simple récupération d'enregistrements à l'analyse statistique |
| **Azure Monitor alerts** (alertes) | Vous **notifient** automatiquement quand un seuil ou une condition est atteint, sur des métriques (quasi temps réel) ou sur des journaux. Une alerte a une gravité et utilise des **groupes d'actions** qui disent qui est notifié et ce qui est fait ; elle peut aussi déclencher une action corrective |
| **Application Insights** | Surveille vos **applications web**, qu'elles s'exécutent dans Azure, en local ou dans un autre cloud. S'installe avec un SDK dans l'application ou avec un agent |

Ce qu'Application Insights surveille : taux de requêtes, temps de réponse et taux d'échec ; taux et échecs des dépendances (appels à des services externes) ; vues de pages et performances de chargement ; nombres d'utilisateurs et de sessions ; compteurs de performances comme le processeur et la mémoire. Il peut aussi envoyer périodiquement des requêtes synthétiques pour vérifier que l'application répond, même quand personne ne l'utilise.

Choisir entre les trois outils :

| Besoin | Outil |
| --- | --- |
| « Des recommandations pour réduire les coûts et améliorer la sécurité » | Azure Advisor |
| « Être prévenu d'une maintenance planifiée d'Azure qui touche mes ressources » | Azure Service Health |
| « Recevoir un e-mail quand le processeur d'une machine virtuelle dépasse 80 % » | Azure Monitor alerts |
| « Interroger les journaux collectés depuis mes ressources » | Azure Log Analytics |
| « Comprendre pourquoi mon application web est lente » | Application Insights |

<!-- section: key-points -->
## Points clés

- Advisor : recommandations personnalisées dans cinq catégories (fiabilité, sécurité, performances, excellence opérationnelle, coût).
- État d'Azure : vue mondiale. Service Health : les services et régions que vous utilisez, avec la maintenance planifiée et des alertes. Resource Health : vos ressources individuelles.
- Azure Monitor : collecter, analyser, visualiser, agir ; métriques et journaux ; Azure, local et multicloud.
- Log Analytics : requêtes de journal. Alertes : notifications et groupes d'actions. Application Insights : performances et usage des applications web.
