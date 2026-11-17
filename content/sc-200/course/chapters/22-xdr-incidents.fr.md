Dans le portail Defender, Microsoft Sentinel et Defender XDR partagent une file d'attente d'incidents et un moteur de corrélation. Ce chapitre couvre l'examen des incidents Sentinel dans ce portail, l'utilisation de Security Copilot et de ses agents, le suivi des attaques multi-étapes et des mouvements latéraux entre domaines, et la gestion du travail avec les cas. Les questions d'examen portent sur l'emplacement d'une fonctionnalité, le rôle qu'elle exige et ce que chaque portail prend encore en charge avant la fin de l'expérience dans le portail Azure.

<!-- section: sentinel-incidents | objectives: 2.1.7 -->
## Examiner les incidents Microsoft Sentinel

Après le 31 mars 2027, Microsoft Sentinel n'est plus pris en charge que dans le portail Defender. Les alertes Sentinel et Defender XDR y arrivent dans **Investigation et réponse > Incidents et alertes > Incidents** :

- Le moteur de Defender XDR crée et corrèle tous les incidents, y compris ceux des règles d'analytique Sentinel ; le **nom du fournisseur d'incidents** est toujours Microsoft XDR.
- Les incidents créés par l'API, par un playbook ou manuellement dans le portail Azure ne sont pas synchronisés vers le portail Defender.
- L'ajout ou le retrait d'alertes Sentinel dans un incident n'est pris en charge que dans le portail Defender : pour retirer une alerte, ajoutez-la à un autre incident.
- La synchronisation des incidents Defender avec Sentinel peut prendre jusqu'à 5 minutes, et l'exécution des règles d'automatisation jusqu'à 10 minutes.

Étapes d'enquête sur la page de l'incident : lisez l'**histoire de l'attaque (attack story)** et le graphe, examinez les **Alertes** (avec la raison de leur corrélation), ouvrez les **Ressources** et les pages d'entités, vérifiez **Preuves et réponse**, puis pivotez vers les données brutes avec **Go hunt** ou, pour les incidents issus de règles d'analytique, **Run query**, qui exécute la requête de la règle dans le repérage avancé.

Le portail Azure (jusqu'à son retrait) ajoute ses propres widgets :

| Fonctionnalité | Détail |
| --- | --- |
| Chronologie de l'incident | Alertes et signets dans l'ordre chronologique, avec les tactiques MITRE et l'ID d'alerte système |
| Incidents similaires | Jusqu'à 20 incidents similaires, avec une raison de similarité ; non pris en charge dans le portail Defender |
| Principaux insights | Requêtes de la recherche en sécurité, de 24 heures avant la première alerte jusqu'à la dernière alerte |
| Graphe d'investigation | Exige un mappage d'entités dans la règle ; incidents de 30 jours au plus |
| Onglet Entités | Volet latéral d'entité avec une chronologie de sept jours ; page d'entité complète au-delà |

Autorisations : **Microsoft Sentinel Responder** pour examiner et mettre à jour les incidents (un invité qui attribue des incidents a aussi besoin de Directory Reader) ; seul l'auteur modifie un commentaire, et la suppression de commentaires exige **Microsoft Sentinel Contributor**. La modification des commentaires n'est pas prise en charge dans le portail Defender.

Corrigez avec des règles d'automatisation et des playbooks exécutés sur l'incident ; l'exécution manuelle d'un playbook sur une alerte ou une entité n'est pas prise en charge dans le portail Defender. Clôturez en passant l'état à **Résolu** avec une classification (Vrai positif, Activité informationnelle attendue, Faux positif) et un commentaire.

```kusto
SecurityIncident
| where TimeGenerated > ago(30d)
| summarize arg_max(TimeGenerated, *) by IncidentNumber
| where Status == "Closed"
| summarize Incidents = count() by Classification, Severity
```

> **Piège d'examen.** `SecurityIncident` stocke une ligne par mise à jour d'incident. Utilisez `arg_max(TimeGenerated, *) by IncidentNumber` pour garder le dernier état avant de compter, sinon les incidents sont comptés plusieurs fois.

<!-- section: security-copilot | objectives: 2.1.8 -->
## IA agentique et Security Copilot intégré

Copilot dans Defender est disponible pour les utilisateurs disposant d'un accès provisionné à Security Copilot, avec les plug-ins concernés activés (Microsoft Defender, Defender Threat Intelligence, Natural Language to KQL). Fonctionnalités intégrées :

| Fonctionnalité | Où elle aide |
| --- | --- |
| Résumer les incidents | La page de l'incident : un résumé de l'attaque et de son impact |
| Réponses guidées | Actions de triage, de confinement et de correction recommandées pour l'incident |
| Analyse de script, Analyse de fichier | Explique une ligne de commande ou un fichier suspect des preuves |
| Résumé d'appareil, Résumé d'identité | Les informations clés sur un appareil ou un utilisateur |
| Générer des requêtes KQL | Repérage avancé : du langage naturel vers KQL |
| Rapport d'incident | Un rapport sur l'incident et les actions entreprises |

**Defender Chat** (préversion), ouvert par le bouton **Copilot**, répond en langage courant en tenant compte du contexte de la page (« quels utilisateurs sont impliqués dans cet incident ? »). Pour les demandes en plusieurs étapes, il propose un plan que vous **approuvez** ou **rejetez** avant toute exécution. Les **notes d'analyste générées par l'IA** exigent l'activation au niveau du locataire (**Opt-in to analyst notes** dans les fonctionnalités avancées), une licence Security Copilot et Security Data Read ou Manage ; leur génération prend jusqu'à 20 minutes.

Les agents agissent de façon autonome, dans certaines limites. L'**agent de triage du hameçonnage (Phishing Triage Agent)** trie les alertes de type **Email reported by user as malware or phish** :

1. Prérequis : Security Copilot avec des unités de calcul de sécurité (SCU) provisionnées, Defender pour Office 365 Plan 2 avec le RBAC unifié, **Monitor reported messages in Outlook** activé, la stratégie d'alerte **Email reported by user as malware or phish** activée.
2. Identité : un nouvel **ID d'agent Microsoft Entra (Microsoft Entra Agent ID)** (recommandé) ou un compte d'utilisateur existant, dont il hérite des autorisations.
3. Verdict : les alertes False Positive sont résolues ; les alertes True Positive restent ouvertes pour un analyste. Chaque verdict s'accompagne d'une explication en langage naturel et d'un graphe du raisonnement de l'agent ; les incidents reçoivent la balise **Agent**.
4. Retour : **Change classification** avec une justification ; il n'enseigne l'agent que si vous sélectionnez **Use this feedback to teach the agent** (une fois par alerte).

> **Piège d'examen.** L'agent ne trie pas les alertes déjà résolues par le réglage des alertes. Désactivez la règle **Auto-Resolve - Email reported by user as malware or phish** et toute règle de réglage personnalisée qui résout ces alertes.

Le même agent, étendu sous le nom de **Security Alert Triage Agent**, prend en charge des alertes d'identité et cloud (préversion). Les agents consomment des unités de calcul de sécurité une fois leur période d'essai terminée.

<!-- section: complex-attacks | objectives: 2.1.9 -->
## Examiner les attaques multi-étapes et les mouvements latéraux

Un incident corrèle les alertes des points de terminaison, des identités, de la messagerie, des applications SaaS, des ressources cloud et des données Sentinel en une seule histoire d'attaque. Son **Résumé** aligne les alertes sur MITRE ATT&CK et montre jusqu'où l'attaque a progressé dans la chaîne d'attaque (kill chain).

| Outil | Pour |
| --- | --- |
| Graphe de l'incident | Voir où l'attaque a commencé, comment elle s'est propagée dans le temps et jusqu'où elle est allée ; **Play** rejoue les alertes et les nœuds dans l'ordre |
| Group similar nodes, filtres par type d'entité | Simplifier les grands graphes |
| Onglet Alertes, raison de corrélation | Comprendre pourquoi les alertes ont été liées |
| Onglet Ressources | Appareils, utilisateurs, boîtes aux lettres, applications et ressources cloud, classés par risque |
| Analyse du rayon d'impact (blast radius) | Chemins de propagation possibles depuis un nœud compromis vers des cibles critiques |
| Go hunt | Exécuter des requêtes sur une entité (All Activity, Related Alerts) et lier les résultats à l'incident |

L'**analyse du rayon d'impact** remplace l'analyse des chemins d'attaque. Elle exige un locataire intégré au data lake de Microsoft Sentinel et **Exposure management (read)** ou plus ; elle affiche les huit chemins les mieux notés, jusqu'à sept sauts (cinq pour le cloud, cinq en local, trois pour l'hybride). Les chemins sont des itinéraires possibles, pas la preuve que l'attaquant les a empruntés.

La chasse complète le graphe. Comptes ayant des alertes dans plusieurs charges de travail :

```kusto
AlertEvidence
| where Timestamp > ago(7d)
| where EntityType == "User" and isnotempty(AccountObjectId)
| summarize Sources = make_set(ServiceSource), Alerts = dcount(AlertId) by AccountObjectId
| where array_length(Sources) >= 3
```

Mouvement latéral possible : un compte qui se connecte à distance à de nombreux appareils.

```kusto
DeviceLogonEvents
| where Timestamp > ago(1d)
| where ActionType == "LogonSuccess" and LogonType in ("RemoteInteractive", "Network")
| summarize Targets = dcount(DeviceName), TargetList = make_set(DeviceName, 20) by AccountName, RemoteIP
| where Targets > 5
```

Séquence typique à reconnaître : e-mail d'hameçonnage (Defender pour Office 365), connexion à risque (Microsoft Entra ID Protection), vol d'informations d'identification ou reconnaissance sur un contrôleur de domaine (Defender pour Identity), exécution à distance sur des serveurs (Defender for Endpoint), exfiltration de données vers une application cloud (Defender pour les applications cloud). Contenez en partant de la position la plus privilégiée : désactivez ou confinez le compte, isolez les appareils, révoquez les sessions, puis supprimez la persistance.

> **Conseil d'examen.** « Identifier les autres ressources que le compte compromis peut atteindre » désigne l'analyse du rayon d'impact ; « à quels appareils le compte s'est-il réellement connecté » désigne une requête de chasse sur `DeviceLogonEvents` ou `IdentityLogonEvents`.

<!-- section: case-management | objectives: 2.1.10 -->
## Gérer les incidents avec la gestion des cas

Les **cas (Cases)** du portail Defender suivent le travail du SOC qui dépasse un incident : un événement couvrant plusieurs incidents, une chasse aux menaces, des IoC et des acteurs de menace, une logique de détection à régler. Les cas exigent un espace de travail Microsoft Sentinel connecté et n'existent que dans le portail Defender.

| Champ | Valeurs |
| --- | --- |
| ID du cas | Commence à 1000, jamais purgé |
| État | New (par défaut), Open, Closed ; les administrateurs ajoutent des états personnalisés |
| Priorité | Very low, Low, Medium, High, Critical |
| Attribué à | Un seul utilisateur |
| Échéance, Description, Incidents liés | Facultatifs |

Chaque cas comporte des **tâches** (nom, état, priorité, propriétaire, échéance ; états New, In progress, Failed, Partially completed, Skipped, Completed), des **commentaires** en texte enrichi avec jusqu'à 10 pièces jointes par commentaire (préversion) et un **journal d'activité** des événements d'audit. Vous liez des incidents depuis le cas ou depuis le menu de la page de l'incident, ainsi que des indicateurs (préversion) ; les projets de Defender Threat Intelligence sont dépréciés au profit de la liaison d'indicateurs à un cas.

| Tâche | RBAC unifié | Rôle Sentinel |
| --- | --- | --- |
| Consulter les cas, tâches, commentaires | Security data basics (read) | Microsoft Sentinel Reader |
| Créer et gérer les cas, tâches, liaisons | Alerts (manage) | Microsoft Sentinel Responder |
| Personnaliser les états des cas | Core Security settings (manage) | Microsoft Sentinel Contributor |

Les **cas d'incident (incident cases)** (préversion, **Cases > Incident**) sont désormais la méthode recommandée pour traiter un incident. La page du cas comporte **Overview** (résumé Copilot, graphe d'attaque), **Artifacts** (alertes, ressources, investigations, preuves, activités) et **Comments & Attachments**. **Manage case** définit la personne attribuée (utilisateur ou groupe), la gravité, l'état, l'échéance, les balises et les champs personnalisés définis par l'administrateur ; les modifications se synchronisent avec l'incident. La consultation exige **Security Data Read** ; la gestion exige **Security Data Manage**.

> **Piège d'examen.** Résoudre un cas d'incident synchronise l'état vers l'incident, mais les alertes associées gardent leur propre état : elles ne sont pas résolues automatiquement. Dans l'ancienne page d'incident, résoudre un incident résout toutes ses alertes actives liées.

Les cas d'incident liés peuvent être fusionnés ; les règles de notification par e-mail des incidents existantes se déclenchent toujours sur les changements d'attribution, d'état, de gravité et de résolution.

<!-- section: key-points -->
## Points clés

- Portail Defender uniquement après le 31 mars 2027 ; fournisseur toujours Microsoft XDR ; les incidents créés par API ou playbook ne se synchronisent pas.
- Microsoft Sentinel Responder examine ; Contributor supprime les commentaires ; Incidents similaires et exécution manuelle de playbooks sur une entité sont absents du portail Defender.
- `SecurityIncident` garde chaque mise à jour : `arg_max` par `IncidentNumber` d'abord.
- Copilot : résumés, réponses guidées, analyse de script et de fichier, génération de KQL, rapports d'incident ; les plans de Defender Chat exigent une approbation.
- Phishing Triage Agent : Defender pour Office 365 Plan 2, alertes de messages signalés, balise Agent, apprentissage uniquement sur demande.
- Attaques complexes : graphe de l'incident avec Play, résumé aligné sur MITRE, rayon d'impact (data lake, Exposure management read), chasse sur `AlertEvidence` et les tables de connexion.
- Cas : espace de travail Sentinel requis, états New/Open/Closed plus personnalisés, trois niveaux de RBAC.
- Cas d'incident : Security Data Read ou Manage ; résoudre ne résout pas les alertes.
