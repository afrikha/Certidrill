Les détections transforment les données en alertes. Dans le portail Defender, vous choisissez entre les **règles de détection personnalisées** de Defender XDR et les **règles d'analytique** de Microsoft Sentinel (planifiées, quasi en temps réel, renseignement sur les menaces, Machine Learning), et vous mesurez ce qu'elles couvrent avec la page MITRE ATT&CK. Les questions d'examen donnent une exigence (fréquence, source de données, réponse automatique, réglage) et demandent quel type de règle ou quel paramètre convient.

<!-- section: custom-detection-create | objectives: 1.4.1 -->
## Créer des règles de détection personnalisées depuis le repérage avancé

Une règle de détection personnalisée exécute une requête de repérage avancé (Advanced hunting) selon une planification ; chaque correspondance crée une alerte et peut déclencher des **actions de réponse**. Microsoft présente désormais les détections personnalisées comme la méthode à privilégier pour créer de nouvelles règles sur les données de Microsoft Sentinel et de Defender XDR.

Deux points d'entrée : exécutez une requête dans **Repérage > Repérage avancé** et sélectionnez **Créer une règle de détection** (les résultats sont validés d'abord), ou sélectionnez **+ Créer une règle de détection** dans la liste des règles de détection personnalisées. L'assistant : détails de l'alerte, enrichissement (entités, détails personnalisés), actions, étendue, vérification.

**Autorisations** : pour les données Defender XDR, **Security settings (manage)** dans le RBAC unifié, ou le rôle Microsoft Entra Security Administrator (Security Operator ne suffit que si le RBAC est désactivé dans Defender for Endpoint ; avec le RBAC activé, il lui faut aussi l'autorisation **Manage security settings**). Les autorisations sont vérifiées par source de données : avec des autorisations de gestion sur Defender pour Office 365 seulement, vous pouvez utiliser les tables `Email*` mais pas les tables `Identity*`. Pour les données Sentinel, **Microsoft Sentinel Contributor** sur l'espace de travail. L'utilisateur doit aussi avoir des autorisations sur tous les appareils de l'étendue de la règle.

**Exigences de la requête** :

- Renvoyer `Timestamp` (ou `TimeGenerated`) et `ReportId` du même événement ; pour les tables de Defender for Endpoint, aussi `DeviceId`.
- Renvoyer les colonnes de ressources impactées qui mappent automatiquement les entités : `DeviceId`/`DeviceName`, `AccountObjectId`/`AccountSid`/`AccountUpn`, `RecipientEmailAddress`.
- Ne pas filtrer sur `Timestamp` : le service applique lui-même la période de recherche.
- Une règle crée au maximum 150 alertes par exécution.

```kusto
DeviceProcessEvents
| where FileName =~ "powershell.exe"
| where ProcessCommandLine has_any ("-enc", "-EncodedCommand")
| project Timestamp, DeviceId, DeviceName, ReportId, AccountUpn, ProcessCommandLine
```

| Fréquence | Période de recherche |
| --- | --- |
| Continuous (NRT) | Quasi en temps réel |
| Toutes les heures | 4 heures |
| Toutes les 3 heures | 12 heures |
| Toutes les 12 heures | 48 heures |
| Toutes les 24 heures | 30 jours |
| Personnalisée, de 5 minutes à 14 jours (données Sentinel uniquement) | Personnalisable, jusqu'à 30 jours selon la fréquence ; moins de 48 heures quand la règle s'exécute plus d'une fois par heure |

Une nouvelle règle s'exécute d'abord sur les 30 derniers jours, puis à sa fréquence. **Continuous** exige une requête sur une seule table prise en charge (par exemple `DeviceProcessEvents`, `EmailEvents`, `IdentityLogonEvents`, `SigninLogs`, `SecurityEvent`), sans `join`, `union` ni `externaldata`, et sans ligne de commentaire. Seules les colonnes en disponibilité générale sont utilisables, `EmailEvents` est pris en charge sauf ses colonnes `LatestDeliveryLocation` et `LatestDeliveryAction`, et un motif `matches regex` doit être écrit comme un littéral de chaîne encodé. Les détections personnalisées évaluent `ingestion_time()` : des événements tardifs plus anciens que la période de recherche peuvent donc être inclus.

Détails de l'alerte : nom de détection et titre d'alerte uniques, gravité, catégorie, techniques MITRE, description et actions recommandées ; valeurs dynamiques avec `{{ColumnName}}` (jusqu'à trois colonnes par champ) ; jusqu'à 20 détails personnalisés.

**Actions** (données Defender uniquement) :

| Cible | Actions | Colonne requise |
| --- | --- | --- |
| Appareil | Isoler l'appareil, Collecter le package d'investigation, Exécuter une analyse antivirus, Lancer une investigation, Restreindre l'exécution des applications | `DeviceId` |
| Fichier | Autoriser/Bloquer (exige l'autorisation Remediate sur les fichiers), Mettre le fichier en quarantaine | `SHA1` ou `SHA256` (ou `InitiatingProcessSHA1`, `InitiatingProcessSHA256` pour la quarantaine) |
| Utilisateur | Marquer l'utilisateur comme compromis | `AccountObjectId`, `InitiatingProcessAccountObjectId` ou `RecipientObjectId` |
| Utilisateur | Désactiver l'utilisateur, Réinitialiser l'authentification de l'utilisateur | Une colonne de SID (`AccountSid`, `InitiatingProcessAccountSid`, `RequestAccountSid`, `OnPremSid`) ; les identités Microsoft Entra exigent aussi `AccountObjectId` |
| E-mail | Déplacer vers un dossier de boîte aux lettres (Courrier indésirable, Boîte de réception, Éléments supprimés), Supprimer l'e-mail (suppression réversible ou définitive) | `NetworkMessageId` et `RecipientEmailAddress` |

**Étendue** : tous les appareils ou des groupes d'appareils spécifiques ; elle ne concerne que les règles sur des données d'appareils.

> **Piège d'examen.** Une requête avec un `join` ne peut pas utiliser la fréquence Continuous, et une règle sur des données uniquement Sentinel ne peut pas utiliser l'étendue par groupe d'appareils. « Isoler automatiquement l'appareil quand la requête trouve une correspondance » est une action de règle de détection personnalisée, pas un paramètre de règle d'analytique Sentinel.

<!-- section: custom-detection-manage | objectives: 1.4.2 -->
## Gérer les règles de détection personnalisées

**Repérage > Règles de détection personnalisées** liste les règles avec **Last run**, **Last run status**, **Next run** et **Status** (activée ou désactivée). Filtrez avec **Ajouter un filtre**, recherchez par nom ou ID de règle. Avec un espace de travail Sentinel intégré, la liste affiche aussi les règles d'analytique Sentinel.

| Action | Effet |
| --- | --- |
| Run | Exécute la règle immédiatement et réinitialise l'intervalle jusqu'à la prochaine exécution |
| Edit | Ouvre l'assistant : requête, fréquence, détails de l'alerte, actions, étendue |
| Modify query | Ouvre la requête dans le repérage avancé |
| Turn off / Turn on | Arrête ou reprend la règle ; l'historique est conservé |
| Delete | Désactive la règle et la supprime définitivement |
| Include or exclude from correlation | Indique si ses alertes sont corrélées en incidents (incluses par défaut) ; en préversion publique pour les détections personnalisées, disponible pour les règles d'analytique |

La page de détails de la règle affiche **Triggered alerts** (définir l'état et la classification, lier à un incident, relancer la requête) et **Triggered actions**. Les modifications s'appliquent à la prochaine exécution planifiée. Les règles qui remplissent les conditions de Continuous peuvent être migrées avec **Migrate now**. Les règles peuvent aussi être gérées sous forme de code avec l'extension Bicep Microsoft Security (préversion).

> **Conseil d'examen.** Règle bruyante, activité légitime : modifiez la requête pour l'exclure. Règle temporairement inutile : désactivez-la plutôt que de la supprimer, pour pouvoir la réactiver sans changement.

<!-- section: analytics-rule-types | objectives: 1.4.3 -->
## Types de règles d'analytique dans Microsoft Sentinel

**Microsoft Sentinel > Configuration > Analytique** comporte les onglets **Règles actives**, **Modèles de règles** et **Anomalies**. Les modèles sont fournis avec les solutions du hub de contenu.

| Type | Comportement | Personnalisable |
| --- | --- | --- |
| Planifiée (Scheduled) | Requête KQL exécutée toutes les 5 minutes à 14 jours sur une période de 5 minutes à 14 jours | Entièrement |
| Quasi en temps réel (NRT) | S'exécute chaque minute sur les événements ingérés pendant la minute précédente | En grande partie, avec des limites |
| Microsoft Defender Threat Intelligence Analytics | Compare les indicateurs Microsoft de domaine et IPv4 (et les indicateurs d'URL dans le `RequestURL` du CEF) aux journaux CEF, DNS, Syslog et autres | Non (lecture seule) |
| ML Behavior Analytics (préversion) | Détecte les connexions SSH et RDP anormales | Non |
| Anomalie | Lignes de base Machine Learning ; écrit dans `Anomalies`, sans alerte | Dupliquer et régler |
| Sécurité Microsoft (création d'incidents) | Crée des incidents à partir des alertes des produits Microsoft | Non pris en charge dans le portail Defender |
| Fusion (Advanced multistage attack detection) | Corrélait des alertes de faible fidélité | Désactivée lors de l'intégration au portail Defender |

Dans le portail Defender, le moteur de corrélation de Defender XDR crée tous les incidents et remplace Fusion ; les règles de création d'incidents de sécurité Microsoft sont désactivées pour éviter les doublons.

<!-- section: scheduled-nrt-rules | objectives: 1.4.3 -->
## Configurer les règles planifiées et NRT

Les onglets de l'assistant : **Général** (nom, gravité, MITRE ATT&CK, état), **Définir la logique de la règle**, **Paramètres d'incident**, **Réponse automatisée**, **Vérifier et créer**. Autorisation : Microsoft Sentinel Contributor.

```kusto
SigninLogs
| where ResultType == "50126"
| summarize Attempts = count(), Users = dcount(UserPrincipalName) by IPAddress, bin(TimeGenerated, 1h)
| where Users > 10
```

| Paramètre | Valeurs et règles |
| --- | --- |
| Requête de la règle | Doit renvoyer `TimeGenerated` |
| Mappage d'entités | Jusqu'à 10 types d'entités (Account, Host, IP...) |
| Détails personnalisés / Détails de l'alerte | Exposent des champs dans l'alerte ; remplacent nom, description, gravité par des valeurs de champs |
| Exécuter la requête toutes les / Rechercher les données des derniers | 5 minutes à 14 jours ; période supérieure ou égale à la fréquence |
| Démarrer l'exécution | Automatiquement, ou à une heure précise (préversion) |
| Seuil d'alerte | Par exemple « Est supérieur à 0 » ; 0 signifie aucun seuil |
| Regroupement d'événements | Regrouper tous les événements dans une seule alerte (par défaut), ou déclencher une alerte pour chaque événement |
| Suppression | Arrêter l'exécution de la requête après la génération d'une alerte, jusqu'à 24 heures |
| Regroupement d'alertes | Jusqu'à 150 alertes par incident ; par toutes les entités, toutes les alertes, ou entités et détails sélectionnés |

Les règles planifiées attendent cinq minutes les données tardives ; les règles NRT deux minutes, et elles interrogent l'heure d'ingestion. **Limites NRT** : jusqu'à 50 règles NRT par client, sources avec un délai d'ingestion inférieur à 12 heures, jusqu'à 30 alertes à événement unique par exécution (la 30e résume le reste). Les requêtes NRT peuvent référencer plusieurs tables et s'exécuter sur plusieurs espaces de travail.

> **Piège d'examen.** Dans le portail Defender, le moteur de corrélation de Defender XDR a le dernier mot sur le regroupement : les paramètres de regroupement d'alertes ne s'appliquent qu'à la création de l'incident, et **Rouvrir les incidents correspondants fermés** n'est pas disponible ; les nouvelles alertes créent un nouvel incident.

Utilisez **Réponse automatisée** pour associer des règles d'automatisation. Les playbooks à déclencheur d'alerte associés directement aux règles sont dépréciés ; utilisez des règles d'automatisation.

<!-- section: ti-ml-rules | objectives: 1.4.3 -->
## Règles de renseignement sur les menaces et de Machine Learning

**Microsoft Defender Threat Intelligence Analytics** : créez-la depuis **Modèles de règles** (recherchez « threat intelligence »). Elle nécessite au moins un connecteur pris en charge, aucune licence premium, et ses détails sont en lecture seule. Elle compare les indicateurs dans `CommonSecurityLog` (`RequestURL`, `DestinationIP`), `DnsEvents`, `Syslog`, `OfficeActivity`, `AzureActivity` et les tables ASIM DNS et sessions réseau. La gravité va d'Informational à High selon la correspondance (un trafic autorisé est plus grave qu'un trafic bloqué) ; les alertes qui correspondent au même indicateur sur 24 heures sont regroupées dans un incident.

Pour vos propres indicateurs (TAXII, API de chargement), utilisez les **modèles de correspondance du renseignement sur les menaces** pour les indicateurs de domaine, d'e-mail, de hachage de fichier, d'IP et d'URL ; ce sont des règles planifiées sur `ThreatIntelIndicators`, que vous pouvez donc régler.

Les règles **ML Behavior Analytics** (préversion) détectent un comportement de connexion SSH ou RDP anormal à partir de l'IP, de la géolocalisation et de l'historique de l'utilisateur. Activez-les depuis les modèles ; elles ne sont pas personnalisables.

> **Conseil d'examen.** « Des alertes haute fidélité à partir du renseignement sur les menaces de Microsoft avec le moins d'effort » désigne la règle Defender Threat Intelligence Analytics. « Alerter quand le trafic correspond aux indicateurs du flux TAXII de notre partenaire » désigne une règle planifiée de correspondance TI.

<!-- section: mitre-coverage | objectives: 1.4.4 -->
## Analyser la couverture avec la matrice MITRE ATT&CK

**Microsoft Sentinel > Gestion des menaces > MITRE ATT&CK (préversion)** affiche une matrice des tactiques et techniques alignée sur MITRE ATT&CK version 18.

| Vue | Affiche |
| --- | --- |
| Couverture actuelle (par défaut) | Les techniques couvertes par les règles planifiées et NRT **actives** ; la légende compte les détections actives par technique |
| Simulated rules | La couverture que donneraient les détections disponibles mais non configurées, comme les modèles de règles |
| Détails d'une technique | Description, lien vers la base de connaissances MITRE, règles actives et requêtes de chasse ; dans le portail Defender, ratios de couverture recommandée |
| View MITRE by threat scenario | Filtre la matrice pour un scénario |

La couverture provient des tactiques et techniques définies dans l'onglet **Général** de chaque règle et sur les requêtes de chasse ; les incidents en héritent par leurs alertes.

Combler une lacune : repérez une technique sans règle active, consultez la vue simulée, puis activez le modèle correspondant (après avoir installé sa solution du hub de contenu et connecté ses données), ou écrivez une règle personnalisée mappée à la technique.

> **Piège d'examen.** Les modèles ne comptent pas dans la couverture tant qu'aucune règle n'en est créée. Une technique couverte uniquement par des requêtes de chasse n'a aucune détection.

<!-- section: anomalies | objectives: 1.4.5 -->
## Configurer les anomalies

Les règles d'anomalie construisent des lignes de base Machine Learning, généralement sur une période d'entraînement de 7 à 21 jours, et écrivent leurs résultats dans la table **`Anomalies`** au lieu de générer des alertes. Utilisez-les comme contexte pour la chasse, les enquêtes et vos propres règles.

| Type | Objet | Prérequis |
| --- | --- | --- |
| Anomalies UEBA | **Qui** se comporte de façon inhabituelle (lignes de base des entités, pairs) | Activer UEBA et la détection d'anomalies dans l'espace de travail |
| Règles d'anomalie Machine Learning | **Quelle** activité est inhabituelle | Modèles activés par défaut |

Les règles d'anomalie intégrées sont activées par défaut et **ne peuvent être ni modifiées ni supprimées** ; vous pouvez seulement basculer leur état entre **Production** et **Flighting**. Pour en régler une :

1. Dans l'onglet **Anomalies**, sélectionnez la règle puis **Dupliquer** : la copie porte le suffixe « - Customized », est **désactivée** et affiche le badge **FLGT**.
2. **Modifiez** la copie : changez le seuil et les paramètres, vérifiez l'aperçu des résultats.
3. Activez-la : elle s'exécute en **Flighting** tandis que l'originale reste en **Production**.
4. Comparez les résultats, puis passez la copie en **Production** : l'originale passe automatiquement en Flighting.

Une seule copie personnalisée par règle d'anomalie, et une seule version en production à la fois. Une règle qui produit trop d'anomalies a généralement un seuil trop bas.

```kusto
Anomalies
| where TimeGenerated > ago(1d)
| where AnomalyTemplateId contains "<RuleId>"
| project TimeGenerated, RuleName, RuleStatus, Score, AnomalyReasons
```

`RuleStatus` indique si l'anomalie provient de la version Production ou Flighting de la règle. Les détections d'anomalies DGA sur les domaines DNS ont été arrêtées le 8 mars 2026.

> **Piège d'examen.** Les anomalies ne créent jamais d'incident par elles-mêmes. Pour être alerté, écrivez une règle planifiée qui interroge `Anomalies`, éventuellement combinée à un autre signal.

<!-- section: key-points -->
## Points clés

- Règles de détection personnalisées : depuis le repérage avancé, `Timestamp` + `ReportId` (+ `DeviceId`), 150 alertes par exécution, actions de réponse automatiques sur appareils, fichiers, utilisateurs et e-mails.
- Fréquence Continuous : une seule table prise en charge, ni join ni union, aucun commentaire ; fréquence personnalisée uniquement pour les données Sentinel.
- Gérer les règles : Run réinitialise l'intervalle, Turn off conserve la règle, Delete la supprime ; les modifications s'appliquent à la prochaine exécution.
- Planifiée : 5 minutes à 14 jours, `TimeGenerated` obligatoire, 10 types d'entités, suppression jusqu'à 24 heures, 150 alertes par incident.
- NRT : chaque minute, 50 règles par client, 30 alertes à événement unique.
- Portail Defender : la corrélation de Defender XDR remplace Fusion et les règles de création d'incidents Microsoft ; pas de réouverture des incidents fermés.
- Page MITRE ATT&CK : seules les règles planifiées et NRT actives comptent ; la vue simulée montre le potentiel des modèles.
- Anomalies : table `Anomalies`, aucune alerte, une seule copie, en Flighting avant la Production.
