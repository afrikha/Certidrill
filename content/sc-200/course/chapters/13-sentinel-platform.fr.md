Microsoft Sentinel s'exécute sur un espace de travail Log Analytics et s'utilise depuis le portail Microsoft Defender ; après le 31 mars 2027, il n'est plus disponible que là. Ce chapitre couvre les paramètres de plateforme qu'un analyste doit maîtriser : le rôle le moins privilégié pour chaque tâche, la durée pendant laquelle chaque table conserve ses données dans le niveau Analytics, le niveau Data Lake et le niveau XDR par défaut, les classeurs pour les tableaux de bord, et les recommandations d'optimisation SOC qui améliorent la couverture et réduisent l'ingestion inutile.

<!-- section: roles | objectives: 1.2.1 -->
## Les rôles Microsoft Sentinel

Les autorisations du SIEM Sentinel sont des rôles Azure RBAC. Attribuez-les **au groupe de ressources** qui contient l'espace de travail, pour qu'ils couvrent aussi les playbooks et les classeurs. Si vous les attribuez plutôt sur l'espace de travail, attribuez-les aussi sur la ressource de solution **SecurityInsights** de cet espace.

| Rôle | Permet |
| --- | --- |
| Microsoft Sentinel Reader | Consulter les données, incidents, classeurs, recommandations et autres ressources Sentinel |
| Microsoft Sentinel Responder | Reader + gérer les incidents (attribuer, changer le statut et la gravité, commenter) |
| Microsoft Sentinel Contributor | Responder + créer et modifier les règles d'analytique, classeurs et autres ressources, installer et mettre à jour les solutions du hub de contenu |
| Microsoft Sentinel Playbook Operator | Lister, consulter et exécuter manuellement les playbooks |
| Microsoft Sentinel Automation Contributor | Permet à Microsoft Sentinel d'ajouter des playbooks aux règles d'automatisation ; pas pour les comptes d'utilisateurs |

Les tâches qui demandent un autre rôle :

| Tâche | Rôle |
| --- | --- |
| Créer ou modifier des playbooks | Logic App Contributor |
| Créer ou supprimer des classeurs avec Reader ou Responder | Ajouter **Workbook Contributor** |
| Utilisateur invité qui doit attribuer des incidents | Microsoft Sentinel Responder + **Directory Reader** (rôle Microsoft Entra) |
| Connecter une source de données | Autorisation d'écriture sur l'espace de travail, plus ce qu'exige le connecteur |
| Accorder à Sentinel une autorisation sur un groupe de ressources de playbooks | Owner ou User Access Administrator sur ce groupe de ressources |
| Limiter une équipe à certaines tables ou ressources | RBAC au niveau des tables ou RBAC dans le contexte de la ressource ; pour les nouvelles configurations, Azure Monitor recommande le RBAC granulaire (**Log Analytics Data Reader** avec des conditions d'attribution de rôle), qui couvre aussi l'accès au niveau des lignes |

Les attributions recommandées par Microsoft : les analystes reçoivent Responder (plus Playbook Operator), les ingénieurs Contributor (plus Logic App Contributor), un principal de service d'automatisation Contributor. Owner, Contributor et Reader sur le groupe de ressources donnent aussi accès à Sentinel, de façon bien trop large. Les attributions sont cumulatives.

Les **autorisations du data lake** sont des rôles Microsoft Entra ou du RBAC unifié, pas des rôles Sentinel :

| Besoin | Autorisation |
| --- | --- |
| Lire le data lake de tous les espaces de travail | Global Reader, Security Reader, Security Operator, Security Administrator (ou Global Administrator) |
| Lire un autre espace de travail dans le lac | Un rôle Azure sur cet espace, par exemple Log Analytics Reader ou Microsoft Sentinel Reader |
| Écrire avec des tâches KQL ou des notebooks, gérer les tâches du data lake | Security Operator ou Security Administrator (ou Global Administrator) |
| Modifier les paramètres des tables dans le portail Defender | **Data (manage)** en RBAC unifié (Data operations), ou Log Analytics Contributor sur l'espace de travail ; depuis **Table insights**, Microsoft Sentinel Contributor plus Log Analytics Contributor |

> **Piège d'examen.** Responder peut gérer un incident mais pas y exécuter un playbook : ajoutez **Playbook Operator**. Contributor peut attacher un playbook à une règle mais pas modifier l'application logique : il faut **Logic App Contributor**.

<!-- section: retention | objectives: 1.2.2 -->
## La rétention des données : niveaux Analytics, Data Lake et XDR

Chaque table appartient à un niveau qui détermine ce que vous pouvez faire de ses données et ce qu'elles coûtent :

| Niveau | Usage | Rétention |
| --- | --- | --- |
| **Analytics** | Règles d'analytique, détections personnalisées, repérage avancé, classeurs, playbooks, requêtes rapides | Rétention Analytics de 30 jours à 2 ans ; **90 jours gratuits** pour les tables des solutions Sentinel ; rétention totale jusqu'à 12 ans |
| **Data Lake** | Stockage à bas coût de données volumineuses ou secondaires ; tâches KQL, notebooks, tâches planifiées, règles de synthèse | De 30 jours à 12 ans |
| **XDR par défaut** | Tables du repérage avancé de Defender XDR, incluses dans la licence Defender | 30 jours ; non ingérées dans l'espace de travail sauf si vous prolongez la rétention |

Une table Analytics a deux paramètres : la **rétention Analytics** (données chaudes, entièrement interrogeables) et la **rétention totale**. Par défaut, les données du niveau Analytics sont mises en miroir dans le data lake ; la rétention totale au-delà de la rétention Analytics n'est conservée que dans le lac. Une table Data Lake n'a qu'une valeur de rétention et pas d'analytique en temps réel.

Pour les modifier : **Microsoft Sentinel > Configuration > Tables** (ou **Data & connectors > Tables**), sélectionnez la table, **Manage table**, fixez le niveau et la rétention, **Save**. Toutes les tables ne peuvent pas passer au niveau Data Lake : certaines tables XDR et de solutions doivent rester en Analytics.

| Modification | Effet |
| --- | --- |
| Réduire la rétention Analytics | Immédiat ; les données plus anciennes restent dans le lac jusqu'à la fin de la rétention totale |
| Réduire la rétention totale | La suppression attend 30 jours, ce qui permet de revenir en arrière |
| Augmenter la rétention totale | S'applique aux données déjà ingérées et pas encore supprimées |
| Passer une table d'Analytics à Data Lake | Arrête les alertes, le repérage avancé, les règles d'analytique et les détections personnalisées sur cette table |

Les **tables Defender XDR** (`DeviceProcessEvents`, `EmailEvents`, `IdentityLogonEvents`...) conservent 30 jours dans le repérage avancé. Pour les garder plus longtemps, fixez leur rétention Analytics ou totale au-delà de 30 jours dans le portail Defender : elles sont alors ingérées dans l'espace de travail Sentinel (l'ingestion est facturée, le stockage est gratuit jusqu'à 90 jours). Choisissez le **niveau Data Lake** pour les conserver à bas coût par conformité : elles restent 30 jours dans le repérage avancé sans surcoût et vont dans le lac pour le reste. Ramener les deux valeurs à 30 jours arrête l'ingestion.

| Exigence | Paramètre |
| --- | --- |
| Chasser dans `DeviceNetworkEvents` sur 180 jours avec des requêtes rapides | Rétention Analytics de 180 jours |
| Conserver `SecurityEvent` 7 ans pour l'audit, interrogée quelques fois par an | Rétention Analytics courte, rétention totale de 7 ans |
| Stocker des journaux de pare-feu volumineux uniquement pour les investigations | Niveau Data Lake |
| Garder la télémétrie des points de terminaison 1 an sans payer le stockage Analytics au-delà de 90 jours | Analytics 90 jours, rétention totale 1 an |

```kusto
Usage
| where TimeGenerated > ago(30d)
| where IsBillable == true
| summarize IngestedGB = sum(Quantity) / 1000 by DataType
| order by IngestedGB desc
```

> **Piège d'examen.** Porter la rétention Analytics à deux ans est la réponse coûteuse à « conserver par conformité ». Quand les données sont rarement interrogées, gardez une rétention Analytics courte et allongez la rétention **totale**, ou utilisez le niveau Data Lake. Et des données présentes uniquement dans le lac ne peuvent pas alimenter les règles d'analytique : une tâche KQL doit d'abord promouvoir les résultats dans une table Analytics.

<!-- section: workbooks | objectives: 1.2.3 -->
## Les classeurs Microsoft Sentinel

Les classeurs sont des classeurs Azure Monitor qui visualisent les données de l'espace de travail : texte, paramètres, requêtes KQL et graphiques.

| Tâche | Comment |
| --- | --- |
| Utiliser un modèle | **Gestion des menaces > Classeurs** > onglet **Modèles**, vérifier **Types de données requis**, **Enregistrer** (crée une ressource Azure), **Afficher le classeur enregistré** |
| Obtenir d'autres modèles | Installer la solution du hub de contenu qui les contient |
| Créer de zéro | **Ajouter un classeur** > **Modifier**, ajouter du texte, des paramètres et des requêtes (source de données **Journaux**, type de ressource **Log Analytics**, un ou plusieurs espaces de travail), **Terminer la modification**, **Enregistrer** avec un nom, un abonnement et un groupe de ressources |
| Personnaliser la copie d'un modèle | **Modifier** sur le classeur enregistré, ou **Enregistrer sous** pour le cloner |
| Actualiser | **Actualiser**, ou **Actualisation automatique** de 5 minutes à 1 jour (désactivée par défaut) |
| Supprimer | Onglet **Mes classeurs** > **Supprimer** (les modèles ne peuvent pas être supprimés) |

Un classeur est enregistré dans le groupe de ressources de l'espace de travail comme ressource Azure ; il peut donc avoir ses propres attributions de rôles. Seule la définition JSON est enregistrée, jamais les données. Consulter demande **Workbook Reader**, créer ou modifier demande **Workbook Contributor** (ou Microsoft Sentinel Contributor). Microsoft recommande d'interroger des **analyseurs ASIM** plutôt que les tables brutes, pour qu'un même classeur fonctionne avec toutes les sources d'un même type.

Les paramètres rendent un classeur interactif. Un paramètre de plage de temps nommé `TimeRange` s'utilise ainsi dans les requêtes :

```kusto
SigninLogs
| where TimeGenerated {TimeRange}
| where ResultType != "0"
| summarize FailedSignIns = count() by bin(TimeGenerated, 1h), AppDisplayName
| render timechart
```

> **Piège d'examen.** Un utilisateur qui doit seulement consulter un classeur a besoin de Workbook Reader (ou d'un rôle Sentinel), pas de Workbook Contributor. Un modèle de classeur n'affiche rien tant que les types de données qu'il exige ne sont pas ingérés : vérifiez **Types de données requis** avant d'accuser les autorisations.

<!-- section: soc-optimization | objectives: 1.2.4 -->
## Les recommandations d'optimisation SOC

L'**optimisation SOC** (portail Defender, **Optimisation SOC**) fournit des recommandations calculées toutes les 24 heures à partir de votre ingestion, de vos règles activées et des recherches de Microsoft. Elle utilise les rôles Sentinel standard et exige que l'espace de travail soit intégré au portail Defender pour inclure la couverture des autres services de sécurité Microsoft.

| Type | Observation | Action suggérée |
| --- | --- | --- |
| Valeur des données | Une table facturable n'est utilisée par aucune règle d'analytique depuis 30 jours, ou pas utilisée du tout, ou seulement par Azure Monitor | Activer des modèles de règles qui l'utilisent, ou la passer à un plan moins cher, arrêter son ingestion ou la déplacer vers un espace de travail hors sécurité |
| Valeur des données, colonnes inutilisées (préversion) | La colonne `ConditionalAccessPolicies` des tables de connexion n'est pas utilisée | Arrêter l'ingestion de la colonne |
| Couverture basée sur les menaces | Des données ou des détections manquent pour un type d'attaque | Activer des modèles de règles, connecter des sources de données ou installer une solution (**Accéder au hub de contenu**) |
| Étiquetage MITRE ATT&CK par IA (préversion) | Détections sans étiquettes MITRE | Appliquer les tactiques et techniques suggérées à une règle ou à toutes |
| Basée sur les risques (préversion) | Lacunes de couverture face aux risques opérationnels, financiers, de réputation, de conformité ou juridiques | Activer des modèles ou connecter des sources |
| Organisations similaires | Tables qu'ingèrent des organisations au profil similaire et pas vous | Connecter les sources de données |

La couverture basée sur les menaces est notée **High** (plus de 75 % des règles recommandées actives), **Medium** (30 à 74 %) ou **Low** (moins de 30 %). La vue d'ensemble montre aussi les données ingérées sur les 90 derniers jours et la valeur des optimisations récentes.

| Statut | Sens |
| --- | --- |
| Active | Valeur par défaut d'une nouvelle recommandation |
| In progress | Fixé avec **Mark as in progress** |
| Completed | Fixé manuellement, ou automatiquement quand une modification de l'environnement la rend sans objet (par exemple une règle utilise désormais la table) |
| Dismissed | Vous n'agirez pas ; elle quitte la liste |

Les recommandations terminées ou ignorées peuvent être **réactivées** ; le recalcul prend jusqu'à une heure. Les tables utilisées par l'UEBA ou par la règle de correspondance du renseignement sur les menaces ne reçoivent jamais de recommandation de valeur des données. Les recommandations d'organisations similaires ignorent les tables personnalisées, les connecteurs personnalisés et les tables multisources comme `Syslog` et `CommonSecurityLog`.

> **Piège d'examen.** Une recommandation de valeur des données ne change rien par elle-même. Si l'exigence est de réduire le coût d'une table qu'aucune règle n'utilise, agissez (changez le plan ou le niveau, ou arrêtez l'ingestion), puis marquez-la terminée. Avant de rétrograder, vérifiez que la table n'est pas nécessaire à la conformité.

<!-- section: key-points -->
## Points clés

- Attribuez les rôles Sentinel au groupe de ressources. Reader consulte, Responder gère les incidents, Contributor crée le contenu, Playbook Operator exécute les playbooks.
- L'accès au data lake utilise des rôles Microsoft Entra : Security Reader pour lire, Security Operator ou Security Administrator pour écrire et gérer les tâches.
- Niveau Analytics : jusqu'à 2 ans, 90 jours gratuits pour les tables Sentinel ; rétention totale et niveau Data Lake : jusqu'à 12 ans.
- Les tables Defender XDR conservent 30 jours ; portez leur rétention au-delà de 30 jours pour les ingérer dans Sentinel.
- Réduire la rétention totale ne supprime les données qu'au bout de 30 jours ; passer une table au data lake arrête les règles et la chasse sur elle.
- Classeurs : modèles enregistrés comme ressources Azure ; Workbook Reader pour consulter, Workbook Contributor pour modifier ; utilisez les analyseurs ASIM et les paramètres.
- Optimisation SOC : recommandations de valeur des données, de couverture et d'organisations similaires, actualisées toutes les 24 heures, statuts Active, In progress, Completed, Dismissed.
