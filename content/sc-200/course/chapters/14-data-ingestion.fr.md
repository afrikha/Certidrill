Microsoft Sentinel ne détecte que ce qu'il ingère. Les questions d'examen décrivent une source de données (contrôleurs de domaine, appliance pare-feu Linux, abonnements Azure, flux de menaces, application maison) et demandent quel connecteur, quelle configuration d'agent ou quelle table utiliser, souvent avec « réduire les coûts d'ingestion » ou « utiliser les règles d'analytique intégrées sans les modifier » comme contrainte décisive.

<!-- section: connector-selection | objectives: 1.3.1 -->
## Choisir le bon connecteur de données

Les connecteurs s'installent depuis le **hub de contenu (Content hub)** : installez la solution du produit, puis ouvrez la page du connecteur sous **Configuration > Connecteurs de données**. Les principales familles :

| Source | Connecteur | Table de destination |
| --- | --- | --- |
| Journal Sécurité Windows des serveurs (machines virtuelles Azure ou serveurs Azure Arc) | Windows Security Events via AMA | `SecurityEvent` |
| Événements collectés sur un collecteur d'événements Windows (WEF) | Windows Forwarded Events | `WindowsEvent` |
| Machines Linux, équipements réseau qui envoient du Syslog simple | Syslog via AMA | `Syslog` |
| Pare-feu, proxys et appliances qui envoient du CEF | Common Event Format (CEF) via AMA | `CommonSecurityLog` |
| Fichiers journaux texte écrits par une application sous Windows ou Linux | Custom Logs via AMA | Une table personnalisée `_CL` |
| Opérations Azure au niveau de l'abonnement | Azure Activity | `AzureActivity` |
| Ressources Azure (Key Vault, stockage, SQL...) | Connecteur de service basé sur les paramètres de diagnostic | Tables des journaux de ressources |
| Incidents, alertes et événements bruts de Defender XDR | Microsoft Defender XDR | Incidents, alertes et tables du repérage avancé |
| Flux STIX/TAXII, renseignement sur les menaces Microsoft | Threat Intelligence - TAXII, Microsoft Defender Threat Intelligence | `ThreatIntelIndicators`, `ThreatIntelObjects` |
| Une application qui pousse du JSON en HTTPS | API d'ingestion de journaux (Logs Ingestion API, aucune page de connecteur) | Une table personnalisée `_CL` ou une table Azure prise en charge |

Tout connecteur basé sur AMA exige le port 443 sortant depuis la machine qui exécute l'agent vers Microsoft Sentinel, et toute machine qui n'est pas une machine virtuelle Azure doit d'abord être intégrée à **Azure Arc** : serveurs physiques, machines virtuelles locales et machines virtuelles d'autres clouds.

> **Piège d'examen.** Choisir un connecteur, c'est aussi choisir une table. De nombreuses règles d'analytique Windows intégrées, y compris des règles quasi en temps réel, interrogent `SecurityEvent`. Les événements transférés par WEF arrivent dans `WindowsEvent` : ces règles ne les voient pas, sauf si vous adaptez les requêtes ou utilisez les analyseurs ASIM.

Dans le portail Defender, les alertes des produits de sécurité Microsoft arrivent par le connecteur Microsoft Defender XDR, dans l'espace de travail principal uniquement.

<!-- section: windows-security-ama | objectives: 1.3.2 -->
## Windows Security Events via AMA et règles de collecte de données

L'agent Azure Monitor (AMA) reçoit ses instructions des **règles de collecte de données (DCR)** : quelles machines, quels événements, quelle destination. Une DCR est indépendante de l'espace de travail et de la machine : une même règle peut servir pour de nombreux serveurs.

Configuration depuis la page du connecteur :

1. **Configuration > Connecteurs de données > Windows Security Events via AMA > Ouvrir la page du connecteur > +Ajouter une règle de collecte de données**.
2. **Informations de base** : nom de la règle, abonnement, groupe de ressources.
3. **Ressources** : ajoutez des machines virtuelles Azure et des serveurs Azure Arc. AMA est installé sur les machines sélectionnées qui ne l'ont pas.
4. **Collecter** : choisissez le jeu d'événements.
5. **Vérifier + créer**.

Autorisation requise : lecture et écriture sur l'espace de travail Sentinel.

| Jeu d'événements | Contenu | Quand le choisir |
| --- | --- | --- |
| All Security Events | Tous les événements des journaux Sécurité et AppLocker | Visibilité complète, coût le plus élevé |
| Common | Une piste d'audit utilisateur complète : connexion et déconnexion (4624, 4634), modifications de groupes, opérations Kerberos clés sur les contrôleurs de domaine | Audit standard à un volume maîtrisé |
| Minimal | Un petit ensemble pouvant signaler une menace : 4624, 4625, 4688, 1102, modifications de comptes et de groupes. Pas de piste d'audit complète | Volume le plus faible des jeux prédéfinis |
| Custom | Événements sélectionnés par des requêtes XPath | Exactement les ID d'événements nécessaires |

Le filtrage se fait **à la source** : les événements exclus par la DCR ne sont jamais envoyés, c'est ainsi que l'on réduit les coûts d'ingestion. Règles XPath : AMA ne prend en charge que XPath 1.0, et les règles de collecte de données acceptent jusqu'à 20 expressions (`Get-WinEvent` en accepte 23) ; `contains` et `starts-with` ne sont pas pris en charge. Chaque entrée a la forme `LogName!XPath` :

```text
Security!*[System[(EventID=4624 or EventID=4625 or EventID=4688)]]
Security!*[System[(EventID=4648)]] and *[EventData[Data[@Name='ProcessName']='C:\Windows\System32\consent.exe']]
```

Testez la partie XPath en local avant de l'ajouter à la DCR :

```powershell
$XPath = '*[System[(EventID=4625)]]'
Get-WinEvent -LogName 'Security' -FilterXPath $XPath -MaxEvents 5
```

> **Piège d'examen.** Une DCR Azure Monitor générique avec la source de données **Journaux des événements Windows** envoie les événements de sécurité dans la table `Event`. Seul le connecteur Sentinel Windows Security Events via AMA les envoie dans `SecurityEvent`, là où le contenu Sentinel les attend.

```kusto
SecurityEvent
| where TimeGenerated > ago(1h)
| where EventID == 4625
| summarize FailedLogons = count() by TargetAccount, Computer
| where FailedLogons > 20
```

<!-- section: windows-event-forwarding | objectives: 1.3.3 -->
## Planifier le transfert d'événements Windows

Le transfert d'événements Windows (WEF) envoie les événements de nombreuses machines Windows vers un serveur **collecteur d'événements Windows (WEC)**. Sentinel collecte ensuite le journal Événements transférés (Forwarded Events) du collecteur avec AMA : un seul agent au lieu d'un par source. Raisons typiques : des milliers de postes de travail, des machines qui ne peuvent pas recevoir d'agent, ou une infrastructure WEF existante.

| Décision | Options |
| --- | --- |
| Type d'abonnement | **Initié par la source (push)** : clients configurés par stratégie de groupe, le plus simple et le plus évolutif. **Initié par le collecteur (pull)** : le WEC liste les clients, pour un petit ensemble de machines surveillées de près |
| Périmètre | Abonnement **de base (baseline)** pour tous les appareils, faible volume ; abonnement **suspect** (ciblé) pour les appareils sous enquête, avec « read existing events » à true |
| Authentification | Kerberos dans le domaine (chiffré, authentification mutuelle) ; HTTPS avec certificats quand Kerberos n'est pas possible |
| Capacité | Prévoyez environ 3 000 événements par seconde en moyenne par serveur WEC ; les E/S disque, les connexions TCP ouvertes et la taille du registre sont les limites. Publiez plusieurs URI de WEC pour la haute disponibilité |

Configuration minimale des clients par stratégie de groupe :

1. Configurez l'URI du collecteur (le gestionnaire d'abonnements).
2. Démarrez le service WinRM.
3. Ajoutez le compte **Network Service** au groupe intégré **Event Log Readers** (Lecteurs des journaux d'événements), pour que le client de transfert puisse lire les canaux sécurisés comme Sécurité.

Côté Sentinel :

1. Installez AMA sur le serveur WEC (d'abord Azure Arc s'il ne s'agit pas d'une machine virtuelle Azure).
2. Installez la solution Windows Forwarded Events, ouvrez le connecteur **Windows Forwarded Events** et créez une DCR qui cible le serveur WEC.
3. Installez les analyseurs ASIM pour `WindowsEvent` afin de normaliser les données.

```kusto
WindowsEvent
| where TimeGenerated > ago(1d)
| where Channel == "Security" and EventID == 4625
| extend TargetUserName = tostring(EventData.TargetUserName)
| summarize Failures = count() by TargetUserName, Computer
```

> **Conseil d'examen.** « Collecter les événements de sécurité des contrôleurs de domaine et continuer à utiliser les règles d'analytique Windows intégrées » désigne Windows Security Events via AMA sur chaque contrôleur de domaine. « Collecter les événements de 5 000 postes sans déployer d'agent sur chacun » désigne WEF et le connecteur Windows Forwarded Events, avec des règles adaptées à `WindowsEvent`.

<!-- section: syslog-cef | objectives: 1.3.4 -->
## Syslog via AMA et CEF via AMA

Les deux connecteurs reposent sur un **redirecteur de journaux (log forwarder)** : une machine Linux dédiée (machine virtuelle Azure, ou toute machine dotée de l'agent Azure Arc Connected Machine) qui exécute `rsyslog` ou `syslog-ng` et AMA. Les équipements envoient au redirecteur sur le port 514 (TCP ou UDP) ; le démon transmet les messages à AMA (port TCP 28330 à partir d'AMA 1.28.11) ; AMA les envoie à l'espace de travail.

| | Syslog via AMA | CEF via AMA |
| --- | --- | --- |
| Format | Syslog RFC 3164 ou RFC 5424 | Message Syslog avec un en-tête `CEF:0` : fournisseur, produit, version, classe d'événement, gravité, puis extensions |
| Table | `Syslog` | `CommonSecurityLog` (champs fournisseur, produit, IP, action analysés) |
| Source typique | Serveurs Linux, appliances génériques | Pare-feu et appliances de sécurité (Palo Alto, Check Point, Cisco ASA...) |

Ordre de déploiement :

1. Installez la solution **Syslog** ou **Common Event Format** depuis le hub de contenu.
2. Créez la DCR depuis la page du connecteur : sélectionnez le redirecteur, puis le **niveau de journalisation minimal pour chaque facility** (choisir `LOG_ERR` collecte aussi `LOG_CRIT`, `LOG_ALERT` et `LOG_EMERG`). AMA est installé automatiquement. L'alternative par l'API d'ingestion de journaux permet un filtrage plus fin des niveaux mais impose d'installer AMA manuellement au préalable.
3. Exécutez le script d'installation sur le redirecteur : il configure le démon, ouvre le port 514 en TCP et UDP et redémarre le démon.
4. Pointez les équipements vers le redirecteur.

```bash
sudo wget -O Forwarder_AMA_installer.py https://raw.githubusercontent.com/Azure/Azure-Sentinel/master/DataConnectors/Syslog/Forwarder_AMA_installer.py&&sudo python Forwarder_AMA_installer.py
```

Rôles requis : Virtual Machine Contributor ou Azure Connected Machine Resource Administrator pour déployer l'agent, Monitoring Contributor pour créer la DCR, et un rôle disposant de `Microsoft.Resources/deployments/*`.

> **Piège d'examen.** Si Syslog et CEF utilisent la même facility, les messages sont ingérés deux fois, dans `Syslog` et dans `CommonSecurityLog`. Envoyez le CEF sur des facilities que la DCR Syslog ne collecte pas, ou ajoutez à la DCR Syslog une transformation qui écarte les messages CEF. Depuis AMA 1.41, `ProcessName` peut ne pas contenir « CEF » pour les fournisseurs qui ne respectent pas le format d'en-tête RFC 3164 ou RFC 5424 : filtrez donc à la fois sur `ProcessName` et sur `SyslogMessage` (`CEF:0`).

```kusto
CommonSecurityLog
| where TimeGenerated > ago(1d)
| where DeviceVendor == "Cisco" and DeviceProduct == "ASA"
| summarize Events = count() by Activity, DeviceAction
```

Points de planification : montez en charge avec des redirecteurs dans un groupe de machines virtuelles identiques derrière un équilibreur de charge en tourniquet (round robin) ; configurez TLS dans le démon si les équipements l'utilisent ; ne stockez pas en local les journaux inutiles, car un disque plein arrête AMA. `TimeGenerated` est l'heure de traitement par le redirecteur, pas l'`EventTime` de l'équipement.

<!-- section: azure-activity-diagnostics | objectives: 1.3.5 -->
## Journaux d'activité Azure, Azure Policy et paramètres de diagnostic

Les ressources Azure envoient leurs journaux par des **paramètres de diagnostic**. Sentinel propose deux procédures :

| Procédure | Comment | Couverture |
| --- | --- | --- |
| Autonome | Depuis la ressource : **Paramètres de diagnostic > + Ajouter un paramètre de diagnostic**, sélectionnez les catégories, **Envoyer à l'espace de travail Log Analytics** | Une ressource à la fois |
| Gérée par Azure Policy | Page du connecteur > **Launch Azure Policy Assignment wizard** : étendue, paramètres (espace de travail, types de journaux à True), correction | Toutes les ressources de l'étendue, y compris les futures |

Dans l'assistant de stratégie, l'attribution s'applique aux ressources créées **après** l'attribution. Pour configurer les ressources existantes, sélectionnez **Créer une tâche de correction** dans l'onglet **Correction**. Il faut le rôle **Owner** à l'étendue de l'attribution de stratégie, plus les autorisations de lecture et d'écriture sur l'espace de travail.

> **Piège d'examen.** « Faire en sorte que tous les coffres de clés existants et futurs de l'abonnement envoient leurs journaux » exige l'attribution de stratégie et une tâche de correction. Sans tâche de correction, seuls les nouveaux coffres de clés sont configurés.

Le connecteur **Azure Activity** collecte les événements au niveau de l'abonnement (opérations Resource Manager, intégrité des services, opérations d'écriture) dans `AzureActivity` par les paramètres de diagnostic ; les transformations de DCR ne sont pas prises en charge pour cette table. Si l'ancienne méthode de connexion est encore utilisée, sélectionnez **Disconnect All** sur la page du connecteur avant de configurer la nouvelle. Le journal d'activité lui-même conserve 90 jours ; l'ingestion des journaux d'activité envoyés à un espace de travail n'est pas facturée, et la rétention n'est facturée qu'au-delà des 90 jours par défaut.

```kusto
AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue =~ "MICROSOFT.AUTHORIZATION/ROLEASSIGNMENTS/WRITE"
| where ActivityStatusValue =~ "Success"
| project TimeGenerated, Caller, CallerIpAddress, ResourceGroup, _ResourceId
```

<!-- section: threat-indicators | objectives: 1.3.6 -->
## Ingérer des indicateurs de menace

Tout le renseignement sur les menaces arrive dans **`ThreatIntelIndicators`** (indicateurs) et **`ThreatIntelObjects`** (acteurs de menace, modèles d'attaque, identités, relations). L'ancienne table `ThreatIntelligenceIndicator` ne reçoit plus de données depuis le 31 juillet 2025 : règles et classeurs doivent interroger les nouvelles tables.

| Méthode | À utiliser quand | Remarques |
| --- | --- | --- |
| Connecteur Microsoft Defender Threat Intelligence | Vous voulez les indicateurs de Microsoft | Standard : indicateurs publics et OSINT ; premium : indicateurs Microsoft et OSINT enrichi |
| Connecteur Threat Intelligence - TAXII | Un fournisseur expose un serveur TAXII 2.0 ou 2.1 | Nécessite la racine d'API et l'ID de collection |
| Threat Intelligence Upload API | Une plateforme de renseignement ou un script pousse des objets STIX | Aucun connecteur ; l'application Microsoft Entra doit avoir **Microsoft Sentinel Contributor** sur l'espace de travail |
| Création manuelle dans l'interface | Un analyste ajoute quelques indicateurs | Portail Defender : **Renseignement sur les menaces > Intel management** |
| Connecteur Threat Intelligence Platforms | Hérité uniquement | En cours de dépréciation ; indicateurs seulement, via l'API Graph tiIndicators |

Les **règles d'ingestion** n'agissent que sur les données issues des connecteurs (pas sur l'API de chargement ni sur les saisies manuelles) : mise à jour d'attributs (par exemple prolonger **Valid until** de 30 jours pour un flux de confiance) ou **Delete** d'objets avant ingestion, comme les indicateurs à faible confiance. Les règles s'exécutent dans l'ordre et mettent jusqu'à 15 minutes à s'appliquer.

```kusto
ThreatIntelIndicators
| where TimeGenerated > ago(30d)
| summarize Indicators = dcount(Id) by SourceSystem
```

> **Conseil d'examen.** Ingérer des indicateurs ne détecte rien en soi. Activez la règle **Microsoft Defender Threat Intelligence Analytics** ou les modèles de règles de correspondance du renseignement sur les menaces (domaine, e-mail, hachage de fichier, IP, URL) pour les comparer à vos journaux.

<!-- section: custom-tables | objectives: 1.3.7 -->
## Créer des tables de journaux personnalisées

Quand aucun connecteur n'écrit dans une table standard, créez une **table personnalisée basée sur une DCR**. Son nom se termine par `_CL` ; le portail ajoute le suffixe, les autres méthodes vous obligent à l'ajouter, et le nom du flux dans la DCR doit correspondre exactement au nom de la table.

Étapes dans le portail, sur l'espace de travail Log Analytics : **Tables > Créer** (nouveau journal personnalisé), nom, **plan de table**, DCR existante ou nouvelle, point de terminaison de collecte de données si nécessaire, **exemple JSON** des données, **transformation** facultative (une requête KQL appliquée à chaque enregistrement), puis **Créer**.

| Plan | Usage |
| --- | --- |
| Analytics | Par défaut ; données utilisées par les règles d'analytique, la chasse et les classeurs |
| Basic | Données volumineuses interrogées moins souvent, à moindre coût |
| Auxiliary / Lake | Stockage peu coûteux pour des données verbeuses ; `TimeGenerated` doit être au format ISO 8601 avec microsecondes |

Règles à retenir :

- `TimeGenerated` est obligatoire dans toute table ; si la source n'a pas cette colonne, la transformation doit la créer.
- Noms de colonnes personnalisées : 2 à 45 caractères, commencent par une lettre, sans espace ni ponctuation, et suffixe `_CF` quand elles sont ajoutées à une table Azure (standard). Les noms réservés comme `TenantId`, `Type` ou `_ResourceId` sont refusés.
- Après une modification de schéma, mettez à jour les DCR vous-même : Azure Monitor ne le fait pas.
- Autorisations : `Microsoft.OperationalInsights/workspaces/*` pour gérer la table (Log Analytics Contributor) et `Microsoft.Insights/dataCollectionRules/write` pour créer la DCR (Monitoring Contributor).

Les données arrivent dans la table par **Custom Logs via AMA** (fichiers texte sur un serveur) ou par l'**API d'ingestion de journaux**. Pour l'API : inscrivez une application Microsoft Entra, créez d'abord la table, créez la DCR, puis attribuez à l'application le rôle **Monitoring Metrics Publisher** sur la DCR. Un point de terminaison de collecte de données n'est nécessaire qu'avec une liaison privée ou quand la DCR n'a pas de point de terminaison d'ingestion de journaux ; l'Assistant de journal personnalisé du portail en demande toutefois toujours un : créez-le d'abord dans la région de l'espace de travail. L'API exige TLS 1.2 ou ultérieur.

```kusto
// DCR transformation: build TimeGenerated and keep only useful columns
source
| extend TimeGenerated = todatetime(EventTime)
| project TimeGenerated, UserName, SourceIP, Action
```

> **Piège d'examen.** L'API HTTP Data Collector est en cours de dépréciation au profit de l'API d'ingestion de journaux. Une nouvelle intégration doit utiliser l'API d'ingestion de journaux avec une DCR, pas une clé d'espace de travail.

<!-- section: key-points -->
## Points clés

- Connecteur = table : `SecurityEvent` (AMA), `WindowsEvent` (WEF), `Syslog`, `CommonSecurityLog` (CEF), `AzureActivity`, tables personnalisées `_CL`.
- Les machines non Azure ont besoin d'Azure Arc avant tout connecteur basé sur AMA ; les DCR filtrent à la source pour réduire les coûts.
- Jeux d'événements : All, Common (piste d'audit complète), Minimal (orienté menaces, sans piste d'audit), Custom (XPath 1.0, jusqu'à 20 expressions).
- WEF centralise la collecte sur un serveur WEC ; Network Service dans Event Log Readers ; les règles intégrées sur `SecurityEvent` ne voient pas les données de `WindowsEvent`.
- Syslog et CEF passent par un redirecteur Linux ; séparez les facilities pour éviter les doublons.
- Attribution Azure Policy plus tâche de correction pour les ressources existantes ; Owner à l'étendue de l'attribution.
- Le renseignement sur les menaces va dans `ThreatIntelIndicators` et `ThreatIntelObjects` ; l'API de chargement exige Microsoft Sentinel Contributor ; les règles d'ingestion ne s'appliquent qu'aux connecteurs.
- Tables personnalisées : `_CL`, `TimeGenerated`, plan choisi à la création ; l'application de l'API d'ingestion a besoin de Monitoring Metrics Publisher sur la DCR.
