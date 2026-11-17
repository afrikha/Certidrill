Azure Monitor est la plateforme derrière toutes les questions de journalisation et de monitoring : il collecte les métriques et les journaux, stocke les journaux dans des espaces de travail Log Analytics, les achemine vers d'autres destinations et déclenche des alertes. L'examen vous demande de décider quoi collecter, où le stocker, où l'envoyer et quel outil observe quelle charge de travail.

<!-- section: log-sources | objectives: 1.1.1 -->
## Quoi journaliser et d'où partent les données

Une conception de journalisation commence par les sources, car elles ne se comportent pas de la même façon :

| Source | Contenu | Collectée sans configuration | Rétention par défaut |
| --- | --- | --- | --- |
| Métriques de plateforme | Valeurs numériques d'une ressource à intervalles réguliers | Oui | 93 jours |
| Journal d'activité | Opérations du plan de contrôle sur un abonnement : qui a créé, modifié ou supprimé quoi | Oui | 90 jours, sans frais |
| Journaux de ressources | Opérations à l'intérieur d'une ressource (plan de données) : lecture d'un secret, requêtes vers un compte de stockage, correspondances de règles de pare-feu | **Non** : il faut un paramètre de diagnostic | Celle de la destination |
| Journaux du système d'exploitation invité et des charges de travail | Événements Windows, Syslog, compteurs de performances, journaux texte | Non : agent Azure Monitor et règle de collecte de données | Celle de l'espace de travail |
| Télémétrie applicative | Requêtes, dépendances, exceptions, traces | Non : instrumentation Application Insights, fondée sur OpenTelemetry | Celle de l'espace de travail |
| Journaux Microsoft Entra | Connexions, audit de l'annuaire, provisionnement | Oui, dans Microsoft Entra ID | 7 jours avec Microsoft Entra ID Free, 30 jours avec P1 ou P2 |

Les machines situées hors d'Azure (en local ou dans un autre cloud) sont d'abord connectées avec **Azure Arc** ; elles utilisent ensuite le même agent et les mêmes règles de collecte de données que les machines virtuelles Azure.

La réponse par défaut d'une solution de journalisation est un **espace de travail Log Analytics** : tout ce qui doit être interrogé en KQL, corrélé entre sources ou utilisé dans une alerte de journal y va. Microsoft Sentinel s'active sur un espace de travail, et Application Insights y stocke sa télémétrie.

> **Piège d'examen.** Le journal d'activité n'enregistre que les opérations du plan de contrôle. « Qui a lu ce secret » ou « qui a téléchargé cet objet blob » est une question de plan de données : la réponse se trouve dans les journaux de ressources du coffre de clés ou du compte de stockage, qui n'existent qu'une fois qu'un paramètre de diagnostic les envoie quelque part.

<!-- section: workspace-design | objectives: 1.1.1 -->
## Concevoir les espaces de travail Log Analytics

Partez d'**un seul espace de travail** et n'en ajoutez que pour une raison énoncée. La taille d'un espace de travail ne limite pas ses performances, et un espace de travail accepte les données de ressources de n'importe quelle région et de n'importe quel abonnement de son locataire.

| Critère dans la question | Recommandation |
| --- | --- |
| Un seul locataire Microsoft Entra, aucune contrainte particulière | Un seul espace de travail |
| Plusieurs locataires | Un espace de travail par locataire (la plupart des ressources ne peuvent envoyer qu'à un espace de travail de leur propre locataire) ; Azure Lighthouse pour travailler sur l'ensemble |
| Les données doivent rester dans une région donnée pour des raisons réglementaires | Un espace de travail dans chacune de ces régions ; sinon un seul espace de travail pour toutes les régions |
| Chaque équipe ne doit voir que les journaux de ses propres ressources | Pas une raison de diviser : utilisez l'accès en contexte de ressource, et l'accès au niveau des tables pour un contrôle plus fin |
| Les coûts doivent être refacturés par service | Vérifiez d'abord si Cost Management ou une requête de journal est assez précis ; un espace de travail par responsable de coûts seulement si ce n'est pas le cas |
| Rétention différente pour la même table selon les ressources | Des espaces de travail séparés, car la rétention se règle par table |
| Données opérationnelles et données de sécurité (Microsoft Sentinel) | Les réunir pour une visibilité croisée et pour atteindre un niveau d'engagement ; les séparer quand l'équipe de sécurité l'exige ou quand la tarification Sentinel appliquée aux données opérationnelles coûte plus cher |
| Microsoft Sentinel et Microsoft Defender pour le cloud | Le même espace de travail |
| Les données critiques doivent survivre à une panne régionale | Les ingérer dans des espaces de travail de régions différentes |

**Contrôle d'accès.** Le mode d'accès par défaut, *Utiliser les autorisations de ressource ou d'espace de travail*, permet à un utilisateur qui peut lire une ressource d'interroger les journaux de cette ressource sans aucune autorisation sur l'espace de travail (accès en contexte de ressource). Un utilisateur qui a accès à l'espace de travail lui-même voit toutes ses données, sauf si l'accès au niveau des tables le restreint.

Les **plans de table** arbitrent entre coût et fonctionnalités, table par table :

| Plan | Données adaptées | Requêtes et alertes | Coût d'ingestion |
| --- | --- | --- | --- |
| Analytics | Données à forte valeur pour le monitoring continu et la détection | Toutes les fonctionnalités, tous les types d'alertes, insights ; requêtes incluses | Standard |
| Basic | Données de dépannage et de réponse aux incidents | KQL complet, alertes de journal simples uniquement ; chaque requête est facturée | Réduit |
| Auxiliary | Journaux détaillés, données d'audit et de conformité rarement lues | Requêtes plus lentes, pas d'alertes ; chaque requête est facturée | Minimal |

**Rétention.** Les tables Analytics conservent les données 30 jours par défaut pour les requêtes interactives (90 jours avec Microsoft Sentinel et pour Application Insights), extensibles à 2 ans. Au-delà, la rétention à long terme conserve les données de n'importe quel plan jusqu'à **12 ans** au total ; les données anciennes s'interrogent avec un travail de recherche.

**Coût et chiffrement.** Un niveau d'engagement accorde une remise sur un volume quotidien prévisible. Un **cluster dédié** (engagement d'au moins 100 Go par jour) permet à plusieurs espaces de travail de la même région de partager un niveau d'engagement, et il est obligatoire pour les clés gérées par le client, Customer Lockbox et le double chiffrement des données de journal.

> **Conseil d'examen.** « Chiffrer les journaux avec une clé que l'entreprise contrôle » désigne un cluster dédié, pas un compte de stockage. « Conserver cinq ans pour les audits, rarement interrogé, au moindre coût » désigne la rétention à long terme ou le plan Auxiliary, pas cinq ans de rétention interactive.

<!-- section: routing | objectives: 1.1.2 -->
## Acheminer les journaux

Les **paramètres de diagnostic** acheminent les journaux de ressources et les métriques de plateforme d'une ressource, le journal d'activité d'un abonnement ou d'un groupe d'administration, et les journaux Microsoft Entra (configurés dans Microsoft Entra ID). Il existe quatre destinations :

| Destination | À recommander pour | Contrainte |
| --- | --- | --- |
| Espace de travail Log Analytics | Requêtes, alertes, corrélation, Microsoft Sentinel | N'importe quelle région et n'importe quel abonnement ; un autre locataire via Azure Lighthouse |
| Compte de stockage | Archivage à faible coût, stockage immuable pour les audits | Compte standard ; même région que la ressource quand celle-ci est régionale |
| Hub d'événements | Diffusion vers un SIEM non-Microsoft ou vers un pipeline personnalisé | Même région que la ressource quand celle-ci est régionale |
| Solution partenaire | Produits de monitoring intégrés à Azure | Dépend du partenaire |

Règles qui décident des réponses :

- Chaque ressource a besoin de son propre paramètre de diagnostic, avec au maximum **cinq** paramètres par ressource. Un paramètre ne peut contenir qu'**une destination de chaque type** : envoyer les mêmes journaux à deux espaces de travail demande deux paramètres.
- Un paramètre sélectionne des catégories de journaux ou un groupe de catégories (`allLogs`, `audit`). Il ne peut pas filtrer à l'intérieur d'une catégorie.
- Pour configurer toutes les ressources existantes et futures, attribuez une stratégie **Azure Policy** avec l'effet `deployIfNotExists` sur un groupe d'administration ou un abonnement, et lancez une tâche de correction pour les ressources existantes.
- L'envoi du journal d'activité vers un espace de travail n'entraîne aucuns frais d'ingestion.

Pour les machines, la **règle de collecte de données** (DCR) est l'objet de routage : elle indique quels événements et compteurs l'agent Azure Monitor collecte et vers quels espaces de travail ils partent. Une machine peut être associée à plusieurs règles ; le même serveur peut donc alimenter un espace de travail d'exploitation et un espace de travail de sécurité.

Les **transformations** sont des instructions KQL exécutées à l'ingestion, avant que les données soient stockées et facturées : elles suppriment des lignes et des colonnes ou remodèlent les enregistrements. Elles se trouvent dans la DCR qui collecte les données. Les données qui n'arrivent pas par une DCR, comme les journaux de ressources envoyés par les paramètres de diagnostic, sont traitées par l'unique **DCR de transformation de l'espace de travail**.

Une **règle d'exportation de données** envoie en continu les nouveaux enregistrements des tables choisies d'un espace de travail vers un compte de stockage ou un hub d'événements situé dans la même région que l'espace de travail. Elle fonctionne pour les tables Analytics et Basic et n'exporte jamais les données historiques.

| Exigence | Acheminement |
| --- | --- |
| Analyser et corréler les journaux de nombreuses ressources, et créer des alertes dessus | Paramètres de diagnostic et DCR vers un espace de travail Log Analytics |
| Conserver les journaux pendant des années au moindre coût, presque jamais lus | Compte de stockage (avec une stratégie d'immuabilité quand les audits l'exigent), ou rétention à long terme dans l'espace de travail |
| Alimenter Splunk, QRadar ou un autre SIEM externe en quasi-temps réel | Hub d'événements |
| Détecter les menaces et y répondre avec un SIEM Microsoft | Microsoft Sentinel sur l'espace de travail |
| Supprimer les enregistrements inutiles ou les colonnes sensibles avant de les payer | Transformation dans une DCR |
| Copier en continu ce qui arrive déjà dans l'espace de travail vers un stockage bon marché | Règle d'exportation de données |
| Les agents et les requêtes ne doivent pas utiliser de points de terminaison publics | Étendue de liaison privée Azure Monitor (AMPLS) avec un point de terminaison privé |
| Un fournisseur de services doit travailler sur les journaux de locataires clients | Des espaces de travail dans chaque locataire, délégués via Azure Lighthouse |

Une **AMPLS** regroupe des espaces de travail, des ressources Application Insights et des points de terminaison de collecte de données derrière un seul point de terminaison privé. Son mode d'accès *Privé uniquement* bloque l'accès aux ressources Azure Monitor extérieures à l'étendue, ce qui empêche l'exfiltration de données ; le mode *Ouvert* les autorise encore. Utilisez une seule AMPLS pour tous les réseaux qui partagent le même DNS.

> **Piège d'examen.** La contrainte de région s'applique aux comptes de stockage et aux hubs d'événements, pas aux espaces de travail. Une ressource régionale située en Europe Ouest peut envoyer ses journaux à un espace de travail de n'importe quelle région, mais un hub d'événements ou un compte de stockage utilisé comme destination doit se trouver en Europe Ouest.

<!-- section: monitoring | objectives: 1.1.3 -->
## Choisir les outils de monitoring

Azure Monitor possède deux familles de données. Les **métriques** sont numériques, légères et en quasi-temps réel : utilisez-les pour les tableaux de bord et les alertes sur seuil ; la collecte des métriques de plateforme ne coûte rien. Les **journaux** sont des enregistrements détaillés avec une latence plus élevée, facturés à l'ingestion et à la rétention : utilisez-les pour le dépannage, l'audit et la corrélation.

| Besoin | Recommandation |
| --- | --- |
| Performances, échecs et dépendances d'une application | Application Insights : cartographie d'application, vues des échecs et des performances, métriques en temps réel |
| Vérifier de l'extérieur qu'un point de terminaison web répond | Tests de disponibilité Application Insights |
| Performances du système invité des machines virtuelles, des groupes de machines virtuelles identiques et des serveurs avec Azure Arc | VM Insights, avec l'agent Azure Monitor |
| Clusters Kubernetes | Container Insights, métriques Prometheus managées dans un espace de travail Azure Monitor, tableaux de bord Grafana |
| Tests continus de connectivité et de latence entre points de terminaison, y compris locaux | Moniteur de connexion de Network Watcher |
| Quels flux traversent les réseaux virtuels | Journaux de flux de réseau virtuel avec l'analyse du trafic (traffic analytics) |
| Une panne Azure ou une maintenance planifiée qui touche vos services et vos régions | Azure Service Health |
| Savoir si une ressource est indisponible à cause de la plateforme | Azure Resource Health |
| Recommandations sur les coûts, la sécurité, la fiabilité et les performances | Azure Advisor |
| Corréler des événements de sécurité de nombreuses sources et automatiser la réponse | Microsoft Sentinel (SIEM et SOAR ; ses playbooks sont des applications logiques) |
| Posture de sécurité, conformité réglementaire et protection des charges de travail | Microsoft Defender pour le cloud |

> **Piège d'examen.** Un **espace de travail Azure Monitor** n'est pas un espace de travail Log Analytics. Le premier stocke des métriques Prometheus et OpenTelemetry interrogées en PromQL (les métriques Prometheus sont conservées 18 mois) ; le second stocke des journaux et des traces interrogés en KQL.

<!-- section: alerts-visualization | objectives: 1.1.3 -->
## Alertes et visualisation

Une **règle d'alerte** détecte une condition ; un **groupe d'actions** indique qui est notifié (e-mail, SMS, notification push, appel vocal) et ce qui s'exécute (runbook Automation, fonction, application logique, webhook, hub d'événements, connecteur ITSM) ; une **règle de traitement des alertes** modifie les alertes déclenchées, par exemple pour supprimer les notifications pendant une fenêtre de maintenance.

| Type d'alerte | Signal | À recommander quand |
| --- | --- | --- |
| Métrique | Valeurs de métrique évaluées à intervalles réguliers, par rapport à un seuil statique ou dynamique | La donnée existe déjà sous forme de métrique : latence la plus faible |
| Recherche dans les journaux | Une requête KQL exécutée selon une planification | La condition demande une logique de requête, ou la donnée n'existe que dans les journaux |
| Journal d'activité | Un nouvel événement du journal d'activité | Une opération donnée se produit : une machine virtuelle est supprimée, un rôle est attribué |
| Service Health | Problèmes de service, maintenance planifiée, avis d'intégrité | Les équipes doivent être prévenues des événements de plateforme dans leurs régions |
| Resource Health | Un changement d'état d'intégrité d'une ressource | Une ressource devient indisponible pour une raison liée à la plateforme |
| Détection intelligente | Apprentissage automatique sur la télémétrie Application Insights | Une hausse anormale des échecs doit être repérée sans fixer de seuils |
| Prometheus | Règles PromQL sur des métriques Prometheus managées | Charges de travail Kubernetes surveillées avec Prometheus |

Un **seuil dynamique** apprend le comportement normal d'une métrique et convient aux charges de travail à cycles quotidiens ou hebdomadaires. Une seule règle d'alerte de métrique peut couvrir toutes les ressources du même type dans une région d'un abonnement, ce qui évite une règle par machine virtuelle. Les alertes de recherche dans les journaux sont facturées selon leur fréquence d'évaluation : ne les choisissez pas quand une alerte de métrique suffit.

| Visualisation | À recommander quand |
| --- | --- |
| Classeurs Azure | Rapports interactifs combinant de nombreuses sources de données Azure, y compris les ressources avec Azure Arc |
| Tableaux de bord Azure | Une vue unique dans le portail qui mêle des vignettes Azure Monitor et d'autres services Azure |
| Azure Managed Grafana | Tableaux de bord opérationnels pour Kubernetes, le multicloud ou des sources de données non-Azure, partagés hors du portail |
| Power BI | Rapports métier et tendances à long terme pour les parties prenantes |

<!-- section: key-points -->
## Points clés

- Les métriques de plateforme (93 jours) et le journal d'activité (90 jours) existent sans configuration ; les journaux de ressources demandent un paramètre de diagnostic ; les données de l'invité demandent l'agent Azure Monitor et une règle de collecte de données.
- Un seul espace de travail Log Analytics par défaut ; divisez pour les locataires, la résidence des données, une rétention différente de la même table ou la facturation, pas pour le contrôle d'accès.
- Les plans Analytics, Basic et Auxiliary échangent des fonctionnalités contre du coût ; la rétention totale va jusqu'à 12 ans.
- Espace de travail pour analyser, compte de stockage pour archiver, hub d'événements pour diffuser vers un SIEM externe ; une destination de chaque type par paramètre de diagnostic, cinq paramètres par ressource.
- Azure Policy avec `deployIfNotExists` déploie les paramètres de diagnostic à grande échelle ; les transformations filtrent les données à l'ingestion.
- Alertes de métrique d'abord, alertes de recherche dans les journaux quand il faut une requête, alertes de journal d'activité pour les opérations et pour Service Health.
- Application Insights pour les applications, VM Insights pour les machines, Moniteur de connexion pour la connectivité, Microsoft Sentinel pour les événements de sécurité.
