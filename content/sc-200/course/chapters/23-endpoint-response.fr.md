Quand une alerte concerne un appareil intégré à Microsoft Defender for Endpoint, l'analyste travaille depuis la page de l'appareil dans le portail Microsoft Defender : lire la chronologie, agir sur l'appareil (isoler, contenir, collecter, analyser, ouvrir une session de réponse dynamique), examiner les preuves et les entités (fichiers, adresses IP, utilisateurs) et traiter ce que l'interruption automatique des attaques a déjà fait. Les questions d'examen posent une exigence (« collecter des données forensiques sans interaction de l'utilisateur », « exécuter un script », « bloquer le fichier partout ») et demandent la bonne action, son prérequis ou sa limite.

<!-- section: device-timeline | objectives: 2.2.1 -->
## Analyser la chronologie de l'appareil

Ouvrez la page de l'appareil (depuis **Assets > Devices**, une alerte ou un incident), puis l'onglet **Timeline**. La chronologie liste les événements et les comportements observés sur cet appareil, dans l'ordre chronologique.

| Fonctionnalité | À retenir |
| --- | --- |
| Plage de temps | 30 derniers jours par défaut ; dernier jour, dernière semaine, 30 derniers jours ou plage personnalisée |
| Recherche | Barre de recherche pour trouver des événements précis dans la chronologie |
| Filtres | **Data type** (événements ou techniques), groupes d'événements ; les filtres actifs s'affichent en haut |
| Indicateur (flag) | Icône de drapeau sur un événement pour marquer les événements clés et construire une chronologie propre de la compromission ; le filtre **Flagged events** n'affiche qu'eux |
| Personnaliser les colonnes | Choisir les colonnes affichées |
| Exportation | Date du jour ou plage de dates de **sept jours au maximum** |
| Flèches sur la barre de temps | Signalent les enquêtes automatisées |

Les **techniques** sont des techniques MITRE ATT&CK que Defender for Endpoint a déduites des événements. Elles apparaissent en gras avec une icône bleue ; l'ID et le nom ATT&CK sont des étiquettes sous **Additional information**, et en sélectionner une ouvre un volet latéral avec les tactiques et techniques associées.

Sélectionner un événement ouvre un panneau avec ses détails et, quand les données existent, un graphe des entités liées. **Hunt for related events** ouvre une requête de repérage avancé qui renvoie l'événement sélectionné et les autres événements du même appareil à peu près au même moment ; depuis une technique, elle renvoie les événements liés à la technique, pas la technique elle-même.

La visibilité dépend de ce que l'appareil audite : les événements de pare-feu 5025, 5031 et 5157 n'apparaissent que si la stratégie d'audit **Audit Filtering Platform Connection** est activée.

> **Piège d'examen.** La chronologie est une vue par appareil dans le portail. Pour trouver le même comportement sur tous les appareils, ou pour conserver et réexécuter la logique, utilisez le repérage avancé (par exemple `DeviceProcessEvents`) et, s'il doit s'exécuter automatiquement, une règle de détection personnalisée.

<!-- section: device-actions | objectives: 2.2.2 -->
## Actions de réponse sur un appareil

La barre d'actions de la page de l'appareil propose ces actions. Chaque action demande un commentaire et est suivie dans l'**Action center**.

| Action | Effet | Annulation |
| --- | --- | --- |
| Manage tags | Ajoute des étiquettes utilisées pour les groupes d'appareils et le filtrage | Supprimer l'étiquette |
| Initiate automated investigation | Lance une enquête automatisée ; les alertes de l'appareil et de la même menace sur d'autres appareils la rejoignent | |
| Initiate live response session | Ouvre un shell distant sur l'appareil (section suivante) | Se déconnecter |
| Collect investigation package | Construit un zip de données forensiques, téléchargé depuis l'Action center | |
| Run antivirus scan | Analyse rapide ou complète de l'Antivirus Microsoft Defender, y compris quand il fonctionne en mode passif | |
| Restrict app execution | Seuls les fichiers signés par Microsoft peuvent s'exécuter | **Remove app restrictions** |
| Isolate device | Coupe l'appareil du réseau tout en gardant sa connexion au service Defender : isolation **complète** ou **sélective** | **Release from isolation** |
| Contain device | Les autres appareils intégrés bloquent toute communication entrante et sortante avec cet appareil | **Release from containment** |

Isolation ou confinement :

| Exigence | Action |
| --- | --- |
| L'appareil compromis est intégré et ne doit plus communiquer qu'avec Defender | Isolate device |
| Idem, mais les utilisateurs doivent garder Outlook et Microsoft Teams | Isolation sélective |
| L'appareil n'est pas géré ou on ne peut pas compter sur lui pour appliquer l'isolation | Contain device (appliqué par les autres appareils intégrés ; jusqu'à 100 appareils à la fois recommandé, propagation en 5 minutes au plus) |

Points qui décident des réponses :

- Isoler un hôte Hyper-V bloque aussi le trafic de toutes ses machines virtuelles enfants.
- Derrière un VPN en tunnel complet, un appareil isolé ne joint plus le service cloud Defender : utilisez le split tunneling.
- Sous Linux, ajouter ou modifier une règle `iptables` sur un appareil isolé lève l'isolation.
- Restrict app execution exige l'Antivirus Microsoft Defender et s'appuie sur une stratégie d'intégrité du code App Control (WDAC).
- Isoler un appareil exige un rôle avec l'autorisation **Active remediation actions**, et l'appareil doit appartenir à un groupe d'appareils accessible à l'utilisateur.
- L'isolation est levée automatiquement au bout de sept jours. Si l'appareil est hors connexion quand l'isolation est soumise, Defender pour point de terminaison réessaie pendant trois jours au plus ; au-delà, isolez-le de nouveau une fois qu'il est actif.

Le **package d'investigation** est une collecte unique d'artefacts forensiques. Sous Windows, il contient entre autres :

| Dossier | Contenu |
| --- | --- |
| Autoruns | Un fichier par clé de registre de point d'extensibilité de démarrage automatique (ASEP) |
| Installed programs | CSV des programmes installés |
| Network connections | Connexions actives, caches ARP et DNS, configuration IP, journaux du pare-feu |
| Prefetch files | Copie du dossier Prefetch |
| Processes, Services, Scheduled tasks | Fichiers CSV |
| Security event log | Le journal des événements Sécurité |
| SMB sessions | Sessions SMB entrantes et sortantes |
| Users and Groups | Un fichier par groupe avec ses membres |
| Temp Directories | Contenu du dossier `%Temp%` de chaque utilisateur |
| CollectionSummaryReport.xls | Ce qui a été collecté, avec l'état et les codes d'erreur |

Sous macOS et Linux, le package existe aussi (processus, connexions réseau, historique des connexions, sudoers, historique du shell sous macOS, sortie du Client Analyzer sous Linux).

> **Piège d'examen.** Package d'investigation ou réponse dynamique ? Le package collecte un ensemble fixe d'artefacts en un clic, sans shell. La réponse dynamique est interactive : récupérer un fichier précis, exécuter un script, corriger. « Collecter des informations forensiques sur les processus, les services et les autoruns » correspond au package ; « copier un fichier journal précis » ou « exécuter un script PowerShell » correspond à la réponse dynamique.

<!-- section: live-response | objectives: 2.2.2 -->
## Réponse dynamique (live response)

La réponse dynamique donne un shell distant sur un appareil pour l'analyse forensique et la correction. Prérequis :

- **Settings > Endpoints > Advanced features** : activez **Live response** ; **Live response for servers** pour Windows Server ; **Live response unsigned script execution** seulement si des scripts PowerShell non signés doivent s'exécuter. Seul un administrateur ou un utilisateur autorisé à gérer les paramètres du portail modifie ces paramètres.
- L'utilisateur a besoin d'un rôle avec l'autorisation **Live response capabilities** : **Basic** donne les commandes en lecture seule, **Advanced** ajoute les commandes qui modifient l'appareil ou chargent des fichiers.
- Charger un fichier dans la bibliothèque depuis la console exige l'autorisation **Manage security settings** ; le charger depuis la page **Library management** ne l'exige pas.

| Limite | Valeur |
| --- | --- |
| Sessions simultanées par locataire | 50 |
| Sessions simultanées par utilisateur | 5 |
| Sessions par appareil | 1 |
| Délai d'expiration d'une session inactive | 30 minutes |
| Délai d'expiration d'une commande | 10 minutes (30 minutes pour `getfile`, `findfile` et `run`) |
| Taille de fichier pour `getfile` | 3 Go |
| Taille d'un fichier de la bibliothèque | 250 Mo |
| Taille de fichier pour `putfile` | 300 Mo sous Windows, 10 Mo sur les autres plateformes |

| Commandes de base (lecture) | Commandes avancées (modification) |
| --- | --- |
| `cd`, `dir`, `processes`, `services`, `connections`, `drivers`, `registry`, `scheduledtasks`, `persistence`, `startupfolders`, `fileinfo`, `findfile`, `getfile`, `jobs`, `fg`, `status` | `library`, `putfile`, `run`, `remediate`, `undo`, `analyze` (Windows) ; `scan`, `collect` (macOS ou Linux) ; `isolate`, `release` (macOS uniquement) |

```text
getfile "C:\Users\ana\AppData\Local\Temp\invoice.js" &
jobs
fg 1234
library
run Collect-Artifacts.ps1
remediate file "C:\Users\ana\AppData\Local\Temp\invoice.js"
processes -output json
```

- Un script ne s'exécute avec `run` qu'après avoir été chargé dans la **bibliothèque** du locataire ; `putfile` copie un fichier de la bibliothèque sur l'appareil.
- `&` envoie une commande longue en arrière-plan ; `fg` la ramène au premier plan.
- L'onglet **Command log** conserve chaque commande avec son état, son entrée et sa sortie.

> **Piège d'examen.** `getfile` est une commande de base ; `run` et `putfile` sont avancées. Un utilisateur qui peut télécharger des fichiers mais pas exécuter de script a l'autorisation Basic de réponse dynamique. Une erreur de signature de script signifie que **Live response unsigned script execution** est désactivé.

<!-- section: evidence-entities | objectives: 2.2.3 -->
## Enquêtes sur les preuves et les entités

Dans un incident, l'onglet **Evidence and Response** liste les entités trouvées dans ses alertes (fichiers, processus, services, adresses IP, URL, e-mails), chacune avec un **verdict** (Malicious, Suspicious, Clean) et un **état de correction**. Les actions de correction en attente d'approbation (**Pending approval**) s'approuvent ou se rejettent là ou dans l'**Action center**. L'onglet **Assets** regroupe les appareils, les utilisateurs, les boîtes aux lettres et les applications.

Chaque entité a sa propre page :

| Page d'entité | Ce qu'elle montre |
| --- | --- |
| Fichier | Détails et métadonnées PE, incidents et alertes liés, appareils où il a été observé (tendance sur 30 jours), noms qu'il a portés, prévalence (appareils de l'organisation sur les 30 derniers jours, première et dernière observation, prévalence mondiale), ratio VirusTotal et détection antivirus, contenu et capacités mappés sur MITRE ATT&CK |
| Adresse IP | Géolocalisation et ASN, alertes liées, appareils qui ont communiqué avec elle (100 au maximum), prévalence sur 30 jours par défaut |
| Domaine, compte d'utilisateur | Alertes liées et appareils concernés, pour revenir à la chronologie d'un appareil |

Actions sur un fichier :

| Action | Comportement et limites |
| --- | --- |
| Stop and quarantine file | Arrête les processus, met le fichier en quarantaine et supprime ses données persistantes (comme les clés de registre) sur les appareils où il a été vu au cours des 30 derniers jours, jusqu'à **1 000 appareils** ; l'action expire au bout de 3 jours pour les appareils hors connexion. Pas pour les fichiers signés par Microsoft |
| Ajouter un indicateur (bloquer ou autoriser) | Bloque ou autorise le hachage du fichier sur tous les appareils à partir de ce moment ; fichiers PE ; exige la fonctionnalité avancée **Allow or block file** et la protection cloud |
| Download file / Collect file | Zip protégé par mot de passe ; **Collect file** quand Defender ne stocke pas déjà le fichier |
| Deep analysis | Exécute un fichier PE dans un bac à sable cloud : comportements, fichiers déposés, modifications du registre, adresses IP contactées ; résultats en quelques minutes |
| Go hunt | Ouvre le repérage avancé sur le fichier |

> **Piège d'examen.** « Bloquer le fichier sur tous les appareils, y compris ceux où il n'a pas encore été vu » est un **indicateur**, pas Stop and quarantine : la mise en quarantaine n'agit que là où le fichier a été observé et se limite à 1 000 appareils. Microsoft recommande de faire les deux.

Télécharger un exécutable portable depuis la page du fichier exige Security Administrator, l'autorisation Advanced de réponse dynamique ou l'autorisation Alerts avec l'autorisation de collecte de fichiers ; un fichier non PE exige Security Administrator ou Advanced de réponse dynamique.

<!-- section: attack-disruption | objectives: 2.2.4 -->
## Incidents traités par l'interruption automatique des attaques

L'interruption automatique des attaques contient les ressources que l'attaquant utilise pendant que l'attaque est en cours, à partir de signaux corrélés à haut niveau de confiance. Le travail de l'analyste consiste à reconnaître ces incidents, vérifier ce qui a été fait, terminer l'enquête et libérer les ressources.

Comment les repérer :

| Où | Indice |
| --- | --- |
| File d'attente des incidents | Étiquette **Attack Disruption**, plus une étiquette du type de menace (par exemple ransomware) |
| Page de l'incident | Bannière en surbrillance sous le titre ; carte de synthèse **Attack disruption** avec **View activities** et **View related assets** |
| Graphe de l'incident | Libellés d'état sur les ressources, comme appareil contenu ou utilisateur désactivé |
| API | Suffixe de titre `(attack disruption)` |

Actions qu'elle peut prendre :

| Action | Produit |
| --- | --- |
| Contenir un appareil, contenir une adresse IP, isoler un appareil, contenir un utilisateur | Defender for Endpoint |
| Désactiver un utilisateur (Active Directory, et Microsoft Entra ID s'il est synchronisé) | Defender for Identity |
| Révoquer la session d'un utilisateur, suspendre un utilisateur | Microsoft Entra ID |
| Agir sur une application OAuth compromise | Defender for Cloud Apps |
| Safeboot hardening, GPO hardening, proactive user containment (protection prédictive) | Defender for Endpoint |

La suspension d'un utilisateur dans Okta et l'attachement d'une stratégie de refus à un utilisateur AWS, par les connecteurs Microsoft Sentinel, sont en préversion.

**Contain user** bloque pour ce compte les protocoles entrants liés à l'attaque (ouvertures de session réseau, RPC, SMB, RDP) sur les appareils intégrés, met fin à ses sessions distantes et ne désactive pas le compte ; il est levé automatiquement dans les cinq jours, et l'annuler plus tôt (**Undo** dans l'Action center ou sur l'utilisateur) exige Global Administrator. **Contain IP** s'applique aux adresses d'appareils non découverts ou non intégrés.

Démarche de correction :

1. Ouvrez l'incident et lisez la carte de synthèse et le graphe de l'incident.
2. Dans l'onglet **Activities** (le suivi des actions y est en préversion), filtrez **Performed by: AttackDisruption** et lisez la colonne **Policy status** (préversion : **Active**, **Inactive**, **Not applicable**, **No status**) pour voir ce qui est encore appliqué.
3. Examinez et corrigez la cause racine (réinitialiser les informations d'identification, supprimer la persistance, nettoyer les appareils).
4. Libérez les ressources : dans le graphe de l'incident, sélectionnez la ressource puis **Release from containment** (appareil) ou **Enable user** (compte), ou utilisez le volet de détails de l'action dans l'**Action center**.

```kusto
DisruptionAndResponseEvents
| where Timestamp > ago(30d)
| project Timestamp, ActionType, DeviceName, SourceUserName, SourceIpAddress, PolicyName
| order by Timestamp desc
```

```kusto
DeviceEvents
| where ActionType contains "ContainedUser"
```

La première requête (`DisruptionAndResponseEvents` est une table en préversion) liste les événements d'interruption d'attaque dans toute l'organisation (blocages et applications des stratégies d'interruption déclenchées, et actions automatiques effectuées) ; la seconde trouve les connexions ou accès bloqués parce qu'un utilisateur a été contenu (`ContainedDevice` pour un appareil contenu).

> **Piège d'examen.** Libérer la ressource est la dernière étape, pas la première : libérer avant la fin de l'enquête permet à l'attaquant de reprendre. Et les ressources qui ne doivent jamais être contenues automatiquement (un serveur critique, un compte de service) sont **exclues** des actions de réponse automatisées à l'avance, pas libérées après chaque incident.

<!-- section: key-points -->
## Points clés

- Chronologie : un appareil, 30 jours par défaut, indicateurs, techniques, exportation de sept jours au maximum ; **Hunt for related events** ouvre le repérage avancé.
- Isoler (appareil intégré, isolation complète ou sélective avec Outlook et Teams) ou contenir (appliqué par les autres appareils, pour les appareils non gérés).
- Package d'investigation = collecte forensique fixe ; réponse dynamique = shell interactif, scripts de la bibliothèque, autorisation Basic ou Advanced.
- Réponse dynamique : 1 session par appareil, expiration après 30 minutes d'inactivité, `getfile` jusqu'à 3 Go.
- Stop and quarantine agit là où le fichier a été vu (1 000 appareils) ; un indicateur bloque partout et pour l'avenir.
- Incidents d'interruption d'attaque : étiquette, bannière, carte de synthèse ; vérifier l'onglet Activities (préversion), corriger, puis libérer depuis le graphe de l'incident ou l'Action center.
