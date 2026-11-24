La chasse aux menaces dans Microsoft Defender XDR consiste à rechercher une activité d'attaquant qu'aucune alerte n'a encore signalée. L'analyste écrit du KQL dans le **repérage avancé**, lit le renseignement de l'**analytique des menaces** et, depuis l'arrivée du data lake et du graphe Microsoft Sentinel, explore les relations entre entités avec les **graphes de chasse**, le **rayon d'impact** et le **Sentinel graph**. Les questions d'examen présentent un besoin de chasse et demandent la table, l'opérateur qui complète une requête, l'action disponible depuis les résultats ou l'expérience de graphe à utiliser.

<!-- section: xdr-tables | objectives: 3.1.1 -->
## Choisir la bonne table de repérage avancé

Chaque charge de travail Defender alimente ses propres tables. Choisissez la table d'après la **source du signal** et le **type d'événement** :

| Exigence | Table |
| --- | --- |
| Processus lancés sur les appareils, avec leur ligne de commande et leur parent | `DeviceProcessEvents` |
| Connexions réseau des appareils | `DeviceNetworkEvents` |
| Fichiers créés, modifiés, renommés ou supprimés sur les appareils | `DeviceFileEvents` |
| Modifications du registre | `DeviceRegistryEvents` |
| Chargement de DLL | `DeviceImageLoadEvents` |
| Ouvertures de session sur un appareil (interactive, RDP, réseau) | `DeviceLogonEvents` |
| Détections antivirus, événements ASR et de protection contre les attaques, autres événements de contrôles de sécurité | `DeviceEvents` |
| Propriétés des appareils (système d'exploitation, intégration), cartes réseau | `DeviceInfo`, `DeviceNetworkInfo` |
| Vulnérabilités et inventaire logiciel | `DeviceTvmSoftwareVulnerabilities`, `DeviceTvmSoftwareInventory` |
| Remise et blocage des e-mails (expéditeur, destinataire, verdict) | `EmailEvents` |
| Pièces jointes, URL des e-mails | `EmailAttachmentInfo`, `EmailUrlInfo` |
| Actions après la remise (ZAP, correction manuelle) | `EmailPostDeliveryEvents` |
| Clics Liens fiables (Safe Links) | `UrlClickEvents` |
| Authentifications auprès d'Active Directory et des services en ligne (Defender for Identity) | `IdentityLogonEvents` |
| Requêtes LDAP et autres requêtes vers Active Directory | `IdentityQueryEvents` |
| Événements des contrôleurs de domaine : changements d'appartenance aux groupes, changements de mot de passe, compte désactivé | `IdentityDirectoryEvents` |
| Connexions interactives et non interactives Microsoft Entra | `EntraIdSignInEvents` (ou l'ancienne `AADSignInEventsBeta`) |
| Connexions des principaux de service et des identités managées Microsoft Entra | `EntraIdSpnSignInEvents` |
| Détails des comptes issus d'Entra ID et d'autres sources | `IdentityInfo`, `IdentityAccountInfo` |
| Activités dans Office 365 et d'autres applications cloud (Defender for Cloud Apps) | `CloudAppEvents` |
| Requêtes vers Microsoft Graph | `GraphAPIAuditEvents` |
| Alertes de tous les produits Defender, et leurs entités | `AlertInfo`, `AlertEvidence` |
| Événements de l'interruption automatique des attaques (préversion) | `DisruptionAndResponseEvents` |
| Graphe d'Exposure Management (ressources et leurs relations) | `ExposureGraphNodes`, `ExposureGraphEdges` |

Règles qui décident des réponses :

- Le repérage avancé couvre **30 jours** de données Defender (jusqu'à 90 jours de données prises en charge avec une licence ISOC (Integrated Security Operations Center) éligible). Dès qu'un espace de travail Microsoft Sentinel est connecté au portail Defender, ses tables (`SecurityEvent`, `SigninLogs`, `CommonSecurityLog`, tables personnalisées...) s'interrogent dans le même éditeur, pendant la rétention du niveau Analytics de chaque table. Les données présentes uniquement dans le **data lake** ne sont pas disponibles dans le repérage avancé : utilisez l'exploration du data lake.
- Les tables Defender se filtrent sur `Timestamp` ; les tables Sentinel sur `TimeGenerated`. Toutes les données sont en UTC.
- Les tables d'entités (`DeviceInfo`, `IdentityInfo`...) sont actualisées toutes les heures avec le dernier enregistrement complet de chaque entité.

> **Piège d'examen.** Trois tables « logon ». `DeviceLogonEvents` = ouvertures de session **sur un point de terminaison** (Defender for Endpoint). `IdentityLogonEvents` = authentifications vues par Defender for Identity sur les contrôleurs de domaine (Kerberos, NTLM, LDAP). `EntraIdSignInEvents` = connexions cloud à Microsoft Entra ID. Et `AlertInfo` a une ligne par alerte, tandis qu'`AlertEvidence` a une ligne par entité d'une alerte : joignez-les sur `AlertId`.

<!-- section: kql-threats | objectives: 3.1.2 -->
## Identifier les menaces avec KQL

Une requête part d'une table et fait passer les lignes dans des opérateurs. Les opérateurs que l'examen fait compléter le plus souvent :

| Opérateur ou fonction | Utilisation |
| --- | --- |
| `where` | Filtrer les lignes ; placer d'abord le temps et les filtres les plus sélectifs |
| `project`, `project-away` | Garder ou retirer des colonnes |
| `extend` | Ajouter une colonne calculée |
| `summarize ... by` | Agréger : `count()`, `dcount()`, `make_set()`, `min()`, `max()`, `arg_max()` |
| `bin(Timestamp, 1h)` | Regrouper les horodatages par intervalles, dans `summarize ... by` |
| `ago(7d)`, `between (a .. b)` | Filtre de temps relatif, filtre de plage |
| `arg_max(Timestamp, *)` | Dernière ligne de chaque clé (par exemple le dernier enregistrement de chaque appareil) |
| `join kind=...` | Corréler deux tables sur une clé |
| `union` | Empiler les lignes de plusieurs tables |
| `let` | Nommer une valeur, une liste ou une sous-requête réutilisée plus loin |
| `mv-expand` | Transformer chaque élément d'un tableau dynamique en ligne distincte |
| `parse_json()`, `tostring()` | Lire les champs d'une colonne dynamique comme `AdditionalFields` |
| `top`, `order by`, `take` | Trier et limiter |

Opérateurs de chaîne :

| Opérateur | Correspond à | Casse |
| --- | --- | --- |
| `==` / `=~` | La valeur entière | Sensible / insensible |
| `has` | Un terme entier (indexé, le plus rapide) | Insensible |
| `contains` | N'importe quelle sous-chaîne | Insensible |
| `startswith`, `endswith` | Début, fin de la valeur | Insensible |
| `in`, `in~`, `has_any` | Une liste de valeurs ou de termes | `in` sensible, `in~` et `has_any` insensibles |

Types de jointure :

| Type | Résultat |
| --- | --- |
| `innerunique` (par défaut) | Lignes correspondantes, avec le côté gauche dédoublonné sur la clé |
| `inner` | Toutes les combinaisons correspondantes |
| `leftouter` | Toutes les lignes de gauche, avec les colonnes de droite quand elles correspondent |
| `leftanti` | Lignes de gauche **sans** correspondance à droite |
| `leftsemi` | Lignes de gauche qui ont une correspondance, colonnes de gauche uniquement |

```kusto
let lookback = 1d;
DeviceLogonEvents
| where Timestamp > ago(lookback)
| where ActionType == "LogonFailed" and LogonType == "RemoteInteractive"
| summarize Failures = count(), Accounts = dcount(AccountName) by DeviceName, RemoteIP, bin(Timestamp, 1h)
| where Failures > 20
```

```kusto
EmailEvents
| where Timestamp > ago(7d) and ThreatTypes has "Phish"
| join kind=inner (UrlClickEvents | where ActionType == "ClickAllowed") on NetworkMessageId
| project Timestamp, RecipientEmailAddress, SenderFromAddress, Subject, Url
```

```kusto
DeviceProcessEvents
| where Timestamp > ago(7d)
| where FileName =~ "powershell.exe" and ProcessCommandLine has_any ("-enc", "-EncodedCommand")
| summarize arg_max(Timestamp, *) by DeviceId
```

La première requête trouve une attaque RDP par force brute heure par heure, la deuxième les destinataires qui ont cliqué sur une URL d'hameçonnage autorisée, la troisième la dernière commande PowerShell encodée de chaque appareil.

> **Piège d'examen.** La jointure par défaut est `innerunique`, pas `inner` : elle garde une ligne de gauche par clé et peut masquer des doublons. « Appareils intégrés qui n'ont jamais envoyé d'événement réseau » correspond à `leftanti`. Et `has "power"` ne correspond pas à `powershell` : `has` cherche des termes entiers, `contains` des sous-chaînes.

<!-- section: advanced-hunting | objectives: 3.1.3 -->
## Créer des requêtes de repérage avancé

Ouvrez **Investigation & response > Hunting > Advanced hunting** dans le portail Defender.

- Le **mode guidé** construit une requête sans KQL (table, filtres, conditions) ; le **mode avancé** est l'éditeur KQL. Une requête guidée peut être ouverte dans l'éditeur.
- Le volet du schéma liste les tables et leurs colonnes ; les requêtes s'enregistrent sous **My queries** ou **Shared queries** pour le locataire, et les exemples de requêtes servent de point de départ.
- Une requête utilisée régulièrement devient une **règle de détection personnalisée** (**Create detection rule** depuis l'éditeur), qui l'exécute selon une planification et déclenche des alertes.
- Depuis un incident, **Go hunt** ouvre une requête prédéfinie sur une entité ; **Link to incident** rattache des résultats sélectionnés à un incident.
- Avec les données Microsoft Sentinel, le mode guidé et **Take actions** ne prennent en charge que les données Defender XDR, et les signets ne sont pas pris en charge dans le repérage avancé (utilisez **Link to incident**).

Quotas, appliqués séparément aux requêtes manuelles et aux détections personnalisées :

| Quota | Limite |
| --- | --- |
| Plage de temps | 30 jours de données Defender (90 jours de données prises en charge avec une licence ISOC éligible) ; tables Sentinel selon leur rétention Analytics |
| Lignes renvoyées | 100 000 |
| Durée | 10 minutes |
| Taille des résultats | 64 Mo (au-delà, les résultats sont tronqués) |
| Processeur | Budget du locataire actualisé toutes les 15 minutes ; les requêtes sont bloquées quand il est épuisé |

**Agir depuis les résultats.** Sélectionnez des lignes, puis **Take actions**. La requête doit renvoyer les colonnes qui identifient la cible :

| Cible | Actions | Colonnes requises |
| --- | --- | --- |
| Appareils | Isoler, collecter un package d'investigation, analyse antivirus, enquête automatisée, restreindre l'exécution des applications | `DeviceId` |
| Fichiers | Mise en quarantaine | `DeviceId` et `SHA1` ou `SHA256` (ou les versions `InitiatingProcess`) |
| Utilisateurs | Désactiver l'utilisateur, réinitialiser l'authentification de l'utilisateur | `AccountSid` (ou une autre colonne de SID) ; `AccountObjectId` pour les utilisateurs Entra ID |
| E-mails | Déplacer vers un dossier de la boîte aux lettres, suppression réversible ou définitive, soumettre à Microsoft, enquête automatisée | `NetworkMessageId`, `RecipientEmailAddress` ; la suppression exige aussi `EmailDirection` et `SenderFromAddress` |

Chaque action est enregistrée dans **Action center > History**. Les actions sur les e-mails exigent un rôle autorisé à rechercher et purger des e-mails, les actions sur les appareils l'autorisation **Active remediation actions**.

> **Piège d'examen.** « Supprimer le message d'hameçonnage de toutes les boîtes aux lettres depuis les résultats de chasse » échoue si la requête ne projette que `RecipientEmailAddress` : ajoutez `NetworkMessageId`, `EmailDirection` et `SenderFromAddress`. Et une requête qui doit s'exécuter toutes les heures est une règle de détection personnalisée, pas une requête enregistrée.

<!-- section: threat-analytics | objectives: 3.1.4 -->
## Interpréter l'analytique des menaces

L'**analytique des menaces** (**Threat intelligence > Threat analytics**) publie des rapports de Microsoft Threat Intelligence sur des acteurs, des campagnes, des outils, des techniques et des vulnérabilités, et relie chaque rapport à **votre** environnement.

Le tableau de bord présente trois listes : **Latest threats**, **High-impact threats** (le plus d'alertes actives et résolues dans votre locataire) et **Highest exposure threats** (gravité des vulnérabilités et nombre d'appareils exploitables). Les rapports se filtrent par étiquette de menace (Ransomware, Phishing, Activity group, Vulnerability) et par catégorie (Actor, OSINT...).

| Onglet du rapport | Utilisation |
| --- | --- |
| Overview | Synthèse, graphiques d'impact (incidents, alertes), graphiques de résilience |
| Analyst report | Analyse complète : chaîne d'attaque, techniques MITRE ATT&CK, recommandations, conseils de chasse |
| Related incidents | Incidents de votre locataire liés à la menace |
| Impacted assets | Appareils, utilisateurs, boîtes aux lettres, applications, ressources cloud touchés |
| Endpoints exposure | Niveau d'exposition et état de déploiement des mises à jour de sécurité (Defender Vulnerability Management) |
| Recommended actions | Atténuations suivies dans Microsoft Secure Score (protection cloud, protection PUA, protection en temps réel...) |
| Indicators | IOC de la menace |

Lire un rapport :

- Des alertes actives dans **Related incidents** signifient que la menace est présente maintenant dans le locataire : commencez par là.
- Une **Endpoints exposure** élevée sans alerte signifie pas encore attaqué mais vulnérable : déployez les mises à jour et les **Recommended actions**.
- Utilisez les conseils de chasse de l'**Analyst report** dans le repérage avancé pour rechercher une activité antérieure aux détections.
- Des notifications par e-mail peuvent être configurées pour les rapports nouveaux ou mis à jour.

Consulter les rapports, les incidents et les ressources touchées exige **Security data basics (read)** ; les données d'exposition et les actions recommandées exigent aussi **Vulnerability management (read)** ou **Exposure Management (read)**.

> **Piège d'examen.** Recommended actions ne montre que les atténuations suivies dans Secure Score ; les autres recommandations sont dans l'Analyst report. Et un utilisateur qui voit le rapport mais pas l'onglet d'exposition n'a pas l'autorisation de lecture de la gestion des vulnérabilités ou d'Exposure Management ; il ne lui manque pas un rôle Defender for Endpoint.

<!-- section: hunting-graphs | objectives: 3.1.5 -->
## Créer des graphes de chasse et le rayon d'impact

Un **graphe de chasse** représente un scénario de chasse sous forme de nœuds (appareils, comptes, adresses IP, ressources cloud) et d'arêtes (relations), pour trouver des chemins d'attaque et des points de passage obligés que les tables masquent. Prérequis : l'intégration au **data lake Microsoft Sentinel** (le graphe est provisionné avec lui ; Learn réserve la fonctionnalité aux clients intégrés avant le 23 septembre 2026), au moins un **accès en lecture seule à Microsoft Security Exposure Management** et les autorisations du repérage avancé.

Pour en créer un :

1. Dans **Advanced hunting**, sélectionnez l'icône de graphe de chasse ou **Create new > Hunting graph**.
2. Sélectionnez **Search with Predefined scenarios**, choisissez un scénario et saisissez ses entrées.
3. Ajustez les filtres, puis **Run scenario**.

| Scénario prédéfini | Entrée |
| --- | --- |
| Attack paths to critical asset | Ressource critique cible |
| Paths between two entities | Départ et cible |
| Entity relationship map | Entité source |
| Access to key vaults, Users with access to sensitive data | Coffre de clés cible, compte de stockage cible |
| Paths to domain admins, Paths to domain compromise (DCSync) | Aucune |
| Kerberoast paths to critical assets, AS-REP roast paths to critical assets | Aucune |

Filtres : **Show only the shortest paths** ; nœud source (critique, vulnérable, exposé à Internet) ; nœud cible (contient des données sensibles, vulnérable) ; type d'arête (member of, has permissions to, can authenticate as, has credentials of...) ; direction de l'arête.

Le **rayon d'impact** répond à « si cette entité est compromise, que peut atteindre l'attaquant ? ». Dans le graphe d'un incident, sélectionnez un nœud puis **View blast radius** : le graphe ajoute les chemins de propagation possibles de ce nœud vers des cibles critiques, jusqu'à **sept sauts**. Il montre des chemins **possibles**, pas une activité confirmée de l'attaquant. Il exige la même intégration au data lake (avant le 23 septembre 2026) et l'autorisation Exposure management (read).

> **Piège d'examen.** Le graphe de l'incident montre ce qui s'est passé (les alertes et leurs entités) ; le rayon d'impact ajoute ce qui pourrait se passer ensuite. « Montrer quels serveurs critiques un compte compromis pourrait atteindre » correspond au rayon d'impact, pas à l'histoire de l'alerte ni à une requête KQL sur `DeviceLogonEvents`.

<!-- section: sentinel-graph | objectives: 3.1.6 -->
## Analyser les relations entre entités avec le Sentinel graph

Le **Microsoft Sentinel graph** est la couche d'analytique de graphe de Microsoft Sentinel : utilisateurs, appareils, ressources cloud, données, activités et actions de l'attaquant sous forme de nœuds et d'arêtes. Il s'active avec le data lake et alimente plusieurs expériences :

| Expérience | Où |
| --- | --- |
| Graphe de l'incident avec rayon d'impact, graphe de chasse | Portail Defender |
| Chemins d'attaque | Microsoft Security Exposure Management, Defender for Cloud |
| Graphe des risques liés aux données | Purview Insider Risk Management, Data Security Investigations |
| Graphes personnalisés (préversion) | Construits dans un notebook Jupyter avec l'extension Microsoft Sentinel pour Visual Studio Code, publiés par une **tâche de graphe** (graph job), interrogés en **GQL** dans le portail Defender |

Une tâche de graphe à la demande conserve le graphe 30 jours ; une tâche planifiée le reconstruit selon sa planification. Les graphes personnalisés et leurs requêtes sont facturés sur le compteur Sentinel graph.

Dans le repérage avancé, les relations s'interrogent aussi en KQL sur les tables du graphe d'exposition, avec les opérateurs de graphe `make-graph` et `graph-match` :

```kusto
ExposureGraphEdges
| make-graph SourceNodeId --> TargetNodeId with ExposureGraphNodes on NodeId
| graph-match (SourceNode)-[edges]->(TargetNode)
    where TargetNode.NodeLabel == "microsoft.compute/virtualmachines"
    project IncomingNodeLabels = SourceNode.NodeLabel
| summarize by IncomingNodeLabels
```

Les clients d'IA atteignent le même graphe par les outils de graphe du serveur MCP Sentinel (`find_blastradius`, `find_walkable_paths`, `find_exposure_perimeter`), qui sont en préversion.

> **Piège d'examen.** `ExposureGraphNodes` et `ExposureGraphEdges` sont des tables de repérage avancé qui décrivent des ressources et des autorisations, pas une activité : « quelles identités peuvent accéder à ce coffre de clés » est une question de graphe, « qui a accédé au coffre de clés hier » relève d'une table d'activité.

<!-- section: key-points -->
## Points clés

- Choisir la table d'après la source : `Device*` (Defender for Endpoint), `Email*` et `UrlClickEvents` (Defender for Office 365), `Identity*` (Defender for Identity), `EntraIdSignInEvents`, `CloudAppEvents`, `Alert*`.
- Repérage avancé : 30 jours de données Defender (90 avec une licence ISOC éligible), tables Sentinel du niveau Analytics dans le même éditeur, pas les données présentes uniquement dans le lake ; 100 000 lignes, 10 minutes, 64 Mo.
- KQL : `has` (terme) ou `contains` (sous-chaîne) ; jointure par défaut `innerunique` ; `leftanti` pour « sans correspondance » ; `arg_max` pour la dernière ligne.
- Les actions depuis les résultats exigent les colonnes d'identification (`DeviceId`, `SHA1`, `NetworkMessageId`...).
- Analytique des menaces : related incidents = attaqué maintenant ; endpoints exposure = vulnérable ; recommended actions = atténuations Secure Score.
- Graphe de chasse et rayon d'impact : intégration au data lake (avant le 23 septembre 2026) plus lecture d'Exposure Management ; le rayon d'impact montre des chemins possibles jusqu'à sept sauts.
