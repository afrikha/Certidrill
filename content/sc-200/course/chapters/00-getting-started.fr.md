La SC-200 est l'examen de l'analyste des opérations de sécurité : quelqu'un qui travaille chaque jour dans le portail Microsoft Defender et dans Microsoft Sentinel, configure les outils du SOC, répond aux incidents et chasse les menaces en KQL. Les questions portent sur la pratique : quel paramètre, quel rôle, quel connecteur, quelle table, quel type de règle, quelle action de réponse, quel opérateur KQL. Ce chapitre présente le format, une méthode pour lire les questions, les paires de fonctionnalités que l'examen vous demande de distinguer et un plan de travail.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | Microsoft Certified: Security Operations Analyst Associate |
| Durée | 100 minutes d'examen |
| Questions | Nombre non publié ; environ 40 à 60 sur la plupart des examens Microsoft |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn peut être ouvert pendant l'examen, sur le même chronomètre |
| Validité | Un an, renouvelée gratuitement par une évaluation en ligne sur Microsoft Learn |
| Guide d'étude | Compétences mesurées au 21 octobre 2026 |

Les trois domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Gérer un environnement d'opérations de sécurité | 40 à 45 % |
| Répondre aux incidents de sécurité | 35 à 40 % |
| Effectuer la chasse aux menaces | 20 à 25 % |

Le premier domaine est le plus lourd : notifications et paramètres de Defender for Endpoint, réponse automatisée, rôles et rétention de Sentinel, connecteurs de données et règles de détection. Le guide d'octobre 2026 ajoute des fonctionnalités récentes : le data lake de Microsoft Sentinel et ses tâches KQL, Sentinel Graph et les graphes de chasse, le serveur Sentinel MCP, la gestion des cas et l'investigation agentique avec Security Copilot. Le cours les présente telles que Microsoft Learn les documente en novembre 2026.

Formats de questions, à peu près du plus au moins fréquent : une réponse parmi quatre, listes déroulantes qui complètent une requête KQL ou une phrase, « sélectionnez deux réponses », affirmations Oui/Non, glisser-déposer (associations), étapes à ordonner et, parfois, une zone réactive. Les questions à plusieurs éléments rapportent un point par élément correct. Deux sections ont leurs propres règles :

- **Étude de cas.** Une entreprise décrite en onglets (vue d'ensemble, environnement existant, exigences), suivie de quatre à six questions. Une fois sorti, vous ne pouvez plus y revenir.
- **Série problème-solution.** Le même objectif revient avec une solution différente à chaque fois ; vous dites si la solution atteint l'objectif. Chaque réponse est définitive, et plusieurs solutions peuvent être justes, ou aucune.

> **Conseil d'examen.** Microsoft Learn est accessible, mais chercher coûte du temps. Servez-vous-en pour confirmer une colonne de table ou le nom d'un paramètre, jamais pour apprendre un sujet pendant l'examen. Les listes déroulantes KQL se résolvent plus vite par la pratique que par la documentation.

<!-- section: reading-questions -->
## Lire une question de SOC

Un énoncé type décrit un locataire (« Vous disposez d'un abonnement Microsoft 365 E5 qui utilise Microsoft Defender XDR et d'un espace de travail Microsoft Sentinel nommé LAW1 »), nomme des groupes d'appareils, des utilisateurs ou des tables, formule une exigence et une contrainte, puis demande « Que devez-vous configurer ? », « Quelle table devez-vous interroger ? » ou « Quel opérateur devez-vous utiliser ? ». Procédez dans cet ordre :

1. Lisez la dernière phrase : vous demande-t-on un paramètre, un rôle, un type de règle, une table ou un opérateur ?
2. Repérez le produit où se passe le scénario : paramètres du portail Defender, Defender for Endpoint, analytique Sentinel, Logic Apps.
3. Soulignez la contrainte. Elle élimine les distracteurs plausibles.

| Mots de l'énoncé | Ce qu'ils désignent en général |
| --- | --- |
| « réduire l'effort administratif » | La fonctionnalité intégrée : une règle d'automatisation plutôt qu'un playbook, une solution du hub de contenu, une règle de réglage intégrée, l'automatisation complète sur un groupe d'appareils |
| « privilège minimum » | Le rôle Sentinel le plus étroit (Reader, Responder, Playbook Operator) ou un rôle personnalisé Defender XDR limité à des groupes d'appareils |
| « sans code » | Règle d'automatisation, réglage des alertes, règle de notification |
| « appeler un système externe », « publier dans Teams », « ouvrir un ticket » | Playbook (Azure Logic Apps) |
| « dès que possible », « en moins d'une minute » | Règle quasi en temps réel (NRT), ou détection personnalisée à fréquence continue |
| « interroger de temps en temps », « conserver des années au moindre coût » | Niveau Data Lake, longue rétention totale, tâche KQL ou travail de recherche |
| « uniquement les appareils du groupe X » | Étendue par groupe d'appareils : règles de notification, indicateurs, niveaux d'automatisation, RBAC |
| « contenir automatiquement un utilisateur ou un appareil compromis » | Interruption automatique des attaques, ou enquête automatisée en automatisation complète |

Dans une liste déroulante KQL, le reste de la requête est l'indice : le nom de la table vous dit quelles colonnes existent, un `summarize` avant le blanc vous dit que l'opérateur suivant travaille sur des lignes agrégées, et un `join` exige la même clé des deux côtés.

```kusto
DeviceProcessEvents
| where Timestamp > ago(7d)
| where FileName =~ "powershell.exe" and ProcessCommandLine has "-enc"
| summarize Executions = count() by DeviceName, AccountName
| where Executions > 5
| order by Executions desc
```

> **Piège d'examen.** Les tables du repérage avancé de Defender XDR se filtrent sur `Timestamp` ; les tables Microsoft Sentinel et Log Analytics comme `SecurityEvent`, `SigninLogs` ou `Syslog` se filtrent sur `TimeGenerated`. Une requête qui filtre une table Sentinel sur `Timestamp` est une mauvaise réponse classique.

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Règle d'automatisation Sentinel | Playbook | Règle centrale sans code qui trie incidents et alertes et peut exécuter un playbook ; workflow Logic Apps pour les actions en plusieurs étapes et les systèmes externes |
| Règle d'analyse planifiée | Règle NRT / règle de détection personnalisée | Règle Sentinel exécutée à intervalle sur une période de recherche ; règle Sentinel exécutée chaque minute ; règle Defender XDR construite à partir d'une requête de repérage avancé, avec des actions de réponse sur les appareils, fichiers ou utilisateurs |
| Réglage des alertes | Règle d'automatisation qui ferme les incidents | Règle Defender XDR qui masque ou résout les alertes correspondantes à leur création ; règle Sentinel qui modifie les incidents une fois créés |
| Enquête et réponse automatisées | Interruption automatique des attaques | Examine une alerte et propose ou applique la correction selon le niveau d'automatisation ; contient les utilisateurs et appareils d'une attaque en cours à partir de signaux de haute confiance |
| Niveaux d'automatisation des groupes d'appareils | Fonctionnalités avancées | Approbation des corrections par groupe d'appareils ; interrupteurs valables pour tout le locataire, comme la réponse dynamique ou l'EDR en mode bloc |
| Réponse dynamique (live response) | Collecte du package d'investigation | Shell distant interactif sur un appareil ; ZIP ponctuel de données forensiques |
| Niveau Analytics | Niveau Data Lake | Requêtes rapides, règles d'analyse et classeurs, jusqu'à deux ans ; stockage à bas coût jusqu'à douze ans, interrogé par des tâches KQL et des notebooks |
| Rétention Defender XDR | Rétention Sentinel | 30 jours de données de repérage avancé dans Defender XDR ; rétention plus longue quand les tables sont stockées dans l'espace de travail Sentinel |
| Événements de sécurité Windows via AMA | Transfert d'événements Windows (WEF) | Règle de collecte de données sur chaque machine avec l'agent Azure Monitor ; événements collectés sur un collecteur central, puis envoyés par son agent |
| Syslog via AMA | CEF via AMA | Messages Syslog simples dans `Syslog` ; messages au format CEF des appliances dans `CommonSecurityLog` |
| Rôles Sentinel | Autorisations des playbooks | Reader, Responder, Contributor agissent sur le contenu Sentinel ; Logic App Contributor et Microsoft Sentinel Automation Contributor déterminent qui modifie et qui exécute les playbooks |

<!-- section: scope -->
## Ce que l'examen ne teste pas

Le guide d'étude exclut le déploiement et les licences des produits Defender, la conception des stratégies Microsoft Purview ou d'identité, et l'ancien agent Log Analytics. Quand une question cite un produit Defender, elle porte sur ce qu'un analyste y configure ou y fait, pas sur l'intégration des appareils ou l'achat de plans. La collecte de données utilise toujours l'agent Azure Monitor et des règles de collecte de données.

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre. Les paramètres et l'automatisation viennent d'abord, car chaque question sur un incident suppose que vous connaissez le niveau d'automatisation, le rôle et la règle qui a produit l'alerte.
2. Procurez-vous un locataire d'essai Microsoft 365 E5 et un abonnement Azure. Connectez un espace de travail Sentinel au portail Defender, installez une solution du hub de contenu, créez une règle d'automatisation, une règle planifiée et une détection personnalisée : la plupart des listes déroulantes deviennent faciles une fois les écrans vus.
3. Écrivez du KQL tous les jours. Exécutez les requêtes du cours dans le repérage avancé jusqu'à ce que `where`, `summarize`, `join`, `extend`, `project`, `let`, `union`, `mv-expand`, `bin`, `ago` et `arg_max` deviennent automatiques.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication et relisez les sections liées à vos erreurs.
5. Réservez l'examen réel quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
