Un SIEM ne vaut que par les données qu'il reçoit. Ce chapitre couvre la façon dont Microsoft Sentinel les collecte : connecteurs de service à service pour les ressources Azure et Microsoft Entra ID, syslog et CEF au moyen d'un redirecteur de journaux Linux, événements de sécurité Windows et transfert d'événements Windows au moyen de règles de collecte de données (DCR) et de l'agent Azure Monitor (AMA), tables personnalisées pour les données qu'aucun connecteur ne prend en charge, et journal d'audit Microsoft Purview interrogé depuis le portail Defender. Les questions d'examen donnent une source et une contrainte, puis demandent quel connecteur, quelle table, quel rôle ou quelle étape vient en premier.

<!-- section: azure-connectors | objectives: 4.2.4 -->
## Connecteurs de données Microsoft pour les ressources Azure

Les connecteurs s'installent avec leur solution depuis le hub de contenu, puis se configurent sur leur page de connecteur. Ils utilisent l'une de trois méthodes :

| Méthode | Fonctionnement | Exemples |
| --- | --- | --- |
| Basée sur une API | Connexion de service à service activée depuis la page du connecteur | Microsoft Defender XDR, Defender for Cloud |
| Paramètres de diagnostic | La ressource envoie ses journaux à l'espace de travail ; pour de nombreux connecteurs, **Azure Policy** applique le paramètre de diagnostic à toutes les ressources d'un type dans une étendue | Azure Activity, Microsoft Entra ID, Key Vault, Stockage, Pare-feu Azure |
| Basée sur un agent | L'agent Azure Monitor collecte sur les machines au moyen d'une DCR | Événements de sécurité Windows, syslog, CEF |

**Connecteurs basés sur Azure Policy** (Azure Activity, Azure Storage Account et d'autres). Sur la page du connecteur, sélectionnez **Lancer l'Assistant Attribution Azure Policy** : sous **Informations de base**, choisissez l'étendue (abonnement, éventuellement un groupe de ressources) ; sous **Paramètres**, choisissez l'espace de travail Sentinel et les catégories de journaux ; sous **Correction**, cochez **Créer une tâche de correction**, sinon seules les ressources créées après l'attribution sont configurées. Il faut le rôle **Owner** sur l'étendue de l'attribution de stratégie. Un connecteur autonome basé sur les paramètres de diagnostic demande la lecture et l'écriture sur l'espace de travail. Le statut d'un connecteur basé sur une stratégie n'est vert que si des données sont arrivées dans les 14 derniers jours.

| Connecteur | Prérequis | Tables |
| --- | --- | --- |
| Azure Activity | Attribution de stratégie à l'étendue de l'abonnement ; déconnecter les abonnements encore sur la méthode héritée | `AzureActivity` (ingestion gratuite, 90 jours de rétention gratuits) |
| Microsoft Entra ID | Microsoft Sentinel Contributor sur l'espace de travail, **Security Administrator** sur le locataire, lecture et écriture sur les paramètres de diagnostic Microsoft Entra | `SigninLogs`, `AuditLogs`, `AADNonInteractiveUserSignInLogs`, `AADServicePrincipalSignInLogs`, `AADManagedIdentitySignInLogs`, `AADProvisioningLogs`, `AADRiskyUsers`, `AADUserRiskEvents`, `MicrosoftGraphActivityLogs`... |
| Azure Key Vault | Paramètres de diagnostic sur les coffres | `AzureDiagnostics` |
| Azure Storage Account | Owner pour chaque étendue d'attribution de stratégie ; une stratégie par service (blob, file d'attente, table, fichier) | `StorageBlobLogs`, `StorageQueueLogs`, `StorageTableLogs`, `StorageFileLogs` |
| Pare-feu Azure | Paramètres de diagnostic | `AZFWNetworkRule`, `AZFWApplicationRule`, `AZFWDnsQuery`... ou `AzureDiagnostics` |
| Subscription-based Microsoft Defender for Cloud (Legacy) | Contributor ou Owner sur chaque abonnement, au moins un plan Defender sur celui-ci, fournisseur `SecurityInsights` inscrit | `SecurityAlert` |
| Tenant-based Microsoft Defender for Cloud (Preview) | Collecte les alertes Defender for Cloud de tout le locataire sans activer chaque abonnement | `SecurityAlert` |

> **Piège d'examen.** Les journaux de connexion exigent une licence **Microsoft Entra ID P1 ou P2** ; les journaux d'audit fonctionnent avec n'importe quelle licence. Les journaux des principaux de service à risque exigent Microsoft Entra Workload ID Premium. Si `SigninLogs` reste vide alors que `AuditLogs` se remplit, vérifiez la licence avant le connecteur.

Pour Defender for Cloud, la **synchronisation bidirectionnelle** (Contributor ou Security Admin sur l'abonnement) ferme l'alerte d'origine dans Defender for Cloud quand l'incident Sentinel qui la contient est fermé. Quand l'espace de travail est intégré au portail Defender, les alertes Defender for Cloud arrivent déjà par Defender XDR et le connecteur basé sur le locataire n'est pas listé ; on installe tout de même la solution Defender for Cloud pour son contenu. Avant l'intégration au portail Defender, Microsoft conseille de connecter le connecteur basé sur le locataire sur l'espace principal et de déconnecter le connecteur hérité de tous les espaces de travail.

<!-- section: syslog-cef | objectives: 4.2.5 -->
## Collecte syslog et CEF

Les appliances qui ne peuvent pas exécuter d'agent envoient leurs journaux à un **redirecteur de journaux Linux** équipé de l'AMA :

```text
Firewall / proxy --(syslog, TCP or UDP 514)--> Linux forwarder: rsyslog or syslog-ng
   --(TCP 28330, AMA 1.28.11 and later)--> Azure Monitor Agent --(HTTPS 443)--> workspace
```

| Élément | Règle |
| --- | --- |
| Connecteurs | **Syslog via AMA** (table `Syslog`) et **Common Event Format (CEF) via AMA** (table `CommonSecurityLog`) |
| Redirecteur | Machine virtuelle Linux avec rsyslog ou syslog-ng et Python 2.7 ou 3 ; l'agent Azure Arc Connected Machine si ce n'est pas une machine virtuelle Azure |
| Ordre | Créer la DCR depuis la page du connecteur (ce qui installe l'AMA), puis exécuter le script d'installation sur le redirecteur |
| Onglet Collecter de la DCR | Un **niveau de journal minimal** par facility : choisir `LOG_ERR` collecte aussi `LOG_CRIT`, `LOG_ALERT` et `LOG_EMERG` |
| Rôles | Virtual Machine Contributor ou Azure Connected Machine Resource Administrator pour déployer l'agent ; **Monitoring Contributor** pour créer ou modifier des DCR |
| Disque | Configurer le démon pour ne pas stocker localement les journaux inutiles : un disque plein arrête l'AMA |

```bash
sudo wget -O Forwarder_AMA_installer.py https://raw.githubusercontent.com/Azure/Azure-Sentinel/master/DataConnectors/Syslog/Forwarder_AMA_installer.py && sudo python Forwarder_AMA_installer.py

# Send a test CEF message to the local daemon
logger -p local4.warn -P 514 -n 127.0.0.1 --rfc3164 -t CEF "0|Mock-test|MOCK|common=event-format-test|end|TRAFFIC|rt=$common=event-formatted-receive_time"
```

Le script configure le démon pour écouter sur le port 514 en TCP et UDP et le redémarre. Vérifiez le résultat après 20 minutes au plus :

```kusto
CommonSecurityLog
| where TimeGenerated > ago(1d)
| where DeviceProduct == "MOCK"
```

> **Piège d'examen.** Si la DCR syslog et la DCR CEF collectent la **même facility**, les messages CEF arrivent deux fois : dans `CommonSecurityLog` et dans `Syslog`. Corrigez en envoyant le CEF sur une facility non utilisée pour syslog, ou en ajoutant à la DCR syslog une transformation au moment de l'ingestion qui écarte les messages CEF.

```json
"transformKql": "source | where ProcessName !contains \"CEF\" and SyslogMessage !contains \"CEF:0\""
```

<!-- section: windows-events | objectives: 4.2.6 -->
## Événements de sécurité Windows et transfert d'événements Windows

Le connecteur **Windows Security Events via AMA** crée une DCR qui collecte les journaux Security (et AppLocker) des machines sélectionnées dans la table `SecurityEvent`, que la plupart des règles d'analyse intégrées interrogent. Les machines qui ne sont pas des machines virtuelles Azure (locales, autres clouds) doivent avoir **Azure Arc** installé avant l'activation du connecteur. La DCR peut se trouver dans n'importe quel abonnement et groupe de ressources du même locataire.

| Ensemble d'événements | Contenu |
| --- | --- |
| Tous les événements | Tous les événements des journaux Security et AppLocker |
| Commun | Un ensemble standard pour l'audit, avec une piste d'audit utilisateur complète (connexion et déconnexion, modifications de groupes, opérations Kerberos) |
| Minimal | Un petit ensemble d'événements pouvant indiquer des menaces (par exemple 4624, 4625, 4688) ; pas de piste d'audit complète |
| Personnalisé | Requêtes XPath : jusqu'à 20 expressions par zone, XPath 1.0 uniquement |

Les entrées XPath ont la forme `LogName!XPathQuery`. Testez localement la partie filtre avec `Get-WinEvent` avant de la placer dans la DCR :

```text
Security!*[System[(EventID=4624 or EventID=4625 or EventID=4688 or EventID=4720)]]
```

```powershell
$XPath = '*[System[(EventID=4624 or EventID=4625)]]'
Get-WinEvent -LogName 'Security' -FilterXPath $XPath -MaxEvents 5
```

**Transfert d'événements Windows (WEF).** Les machines du domaine transfèrent leurs événements à un serveur **collecteur d'événements Windows (WEC)** au moyen d'abonnements configurés dans Windows. Installez l'AMA sur le seul serveur WEC et utilisez le connecteur **Windows Forwarded Events**. Les événements transférés, y compris les événements de sécurité, vont dans la table **`WindowsEvent`**, pas dans `SecurityEvent`. Déployez les analyseurs ASIM pour `WindowsEvent`.

| Exigence | Réponse |
| --- | --- |
| Collecter les événements de sécurité de 300 machines virtuelles Azure avec les règles intégrées fonctionnant sans modification | Windows Security Events via AMA, ensemble Commun |
| Collecter uniquement les échecs de connexion et les créations de comptes | Ensemble Personnalisé avec XPath |
| Des serveurs locaux transfèrent déjà vers un serveur WEC, aucun agent autorisé sur eux | Connecteur Windows Forwarded Events, AMA sur le serveur WEC |
| Un serveur local envoie directement | Azure Arc sur le serveur, puis Windows Security Events via AMA |
| Journal Security collecté par une simple DCR Azure Monitor, sans le connecteur Sentinel | Arrive dans la table `Event`, pas dans `SecurityEvent` |

> **Piège d'examen.** Les règles intégrées qui interrogent `SecurityEvent` ne se déclenchent pas sur des événements stockés uniquement dans `WindowsEvent`. Après un passage à WEF, adaptez les règles (ou utilisez les analyseurs ASIM) ou collectez avec Windows Security Events via AMA.

<!-- section: custom-tables | objectives: 4.2.7 -->
## Tables de journaux personnalisées

Quand aucun connecteur ni aucune table intégrée ne convient, créez une **table personnalisée basée sur une DCR** dans l'espace de travail. Dans le portail : espace de travail > **Tables** > **Créer**, saisissez un nom (le portail ajoute le suffixe `_CL`), choisissez le plan (**Analytics** par défaut, **Basic** ou **Auxiliary / Lake**), sélectionnez ou créez une DCR (et un point de terminaison de collecte de données si nécessaire), chargez un exemple JSON, écrivez éventuellement une transformation, puis **Créer**.

| Règle | Détail |
| --- | --- |
| Nom | Se termine par `_CL` ; le flux de la DCR doit correspondre au nom de la table ; n'y mettez pas d'information sensible |
| `TimeGenerated` | Obligatoire ; ajoutée automatiquement à la transformation si l'exemple ne la contient pas |
| Colonnes | Commencent par une lettre, 2 à 45 caractères, lettres, chiffres et traits de soulignement ; les colonnes personnalisées ajoutées à une table Azure se terminent par `_CF` |
| Noms réservés | `id`, `TenantId`, `Type`, `Title`, `UniqueId`, `_ResourceId`, `_SubscriptionId`... |
| Autorisations | `Microsoft.OperationalInsights/workspaces/*` sur l'espace de travail (Log Analytics Contributor) pour la table ; `Microsoft.Insights/dataCollectionRules/write` (Monitoring Contributor) pour la DCR |
| Modification du schéma | Mettre à jour chaque DCR qui envoie vers la table ; les DCR ne sont pas mises à jour automatiquement |
| Plans Basic et Auxiliary / Lake | Disponibles uniquement pour les tables personnalisées basées sur une DCR et les tables Azure prises en charge |

Deux façons d'alimenter une table personnalisée :

| Source | Mécanisme |
| --- | --- |
| Un fichier journal texte sur une machine Windows ou Linux | Connecteur **Custom Logs via AMA** (préversion) : la table doit exister au préalable avec seulement `TimeGenerated` (datetime) et `RawData` (string), ou `Message` quand les journaux passent par un redirecteur ; la DCR indique le modèle de fichier (caractères génériques autorisés) |
| Une application ou un script qui envoie du JSON | **API d'ingestion des journaux** : une inscription d'application Microsoft Entra avec le rôle **Monitoring Metrics Publisher** sur la DCR ; flux `Custom-MyTable_CL` (préfixe `Microsoft-` pour les tables intégrées) ; un DCE seulement avec une liaison privée ou quand la DCR n'a pas de point de terminaison d'ingestion des journaux |

```text
POST {endpoint}/dataCollectionRules/{dcrImmutableId}/streams/Custom-FabrikamApp_CL?api-version={apiVersion}
```

> **Piège d'examen.** L'appel d'ingestion échoue avec une erreur d'autorisation alors que l'application a Contributor sur l'espace de travail : l'API d'ingestion des journaux vérifie **Monitoring Metrics Publisher sur la DCR**, pas les rôles de l'espace de travail. Et la table cible doit exister avant le premier appel.

<!-- section: purview-audit | objectives: 4.2.10 -->
## Interroger Microsoft Purview Audit dans Defender XDR

Le journal d'audit unifié enregistre l'activité des utilisateurs et des administrateurs dans Exchange, SharePoint, OneDrive, Teams, Microsoft Entra ID et d'autres services Microsoft 365. Dans le portail Defender, sélectionnez **Audit** (`https://security.microsoft.com/auditlogsearch`) : la recherche est identique à la recherche Audit du portail Microsoft Purview.

| Élément | Règle |
| --- | --- |
| Prérequis | Ingestion du journal d'audit activée ; vérifiez `UnifiedAuditLogIngestionEnabled` dans **Exchange Online PowerShell** (Security & Compliance PowerShell affiche toujours `False`) |
| Rôles | **Audit Logs** ou **View-Only Audit Logs** dans Microsoft Purview (les mêmes rôles dans Exchange Online pour les cmdlets) |
| Critères de recherche | Plage de dates (7 derniers jours par défaut, 180 jours au maximum), activités par nom convivial ou nom d'opération, types d'enregistrements, utilisateurs, fichier, dossier ou site, charges de travail, unités administratives, mot clé |
| Travaux de recherche | S'exécutent en arrière-plan ; jusqu'à 10 en parallèle par utilisateur ; conservés 30 jours ; une recherche large peut prendre jusqu'à 48 heures |
| Exportation | 50 000 lignes avec Audit (Standard), 1 000 000 de lignes avec Audit (Premium) |
| Latence | Les enregistrements des services principaux apparaissent en général 60 à 90 minutes après l'événement |
| Rétention | 180 jours par défaut ; 1 an avec E5 pour les enregistrements Microsoft Entra ID, Exchange, OneDrive et SharePoint ; 10 ans avec une licence complémentaire et une stratégie de rétention d'audit |
| Scripts | `Search-UnifiedAuditLog` dans Exchange Online PowerShell, ou l'API Office 365 Management Activity |

```powershell
Connect-ExchangeOnline
Get-AdminAuditLogConfig | Format-List UnifiedAuditLogIngestionEnabled
Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true
```

Dans le **repérage avancé**, la même activité Microsoft 365 est disponible sous forme de tables KQL :

| Table | Source |
| --- | --- |
| `CloudAppEvents` | Microsoft Defender for Cloud Apps : Office 365 et les autres applications cloud connectées. Exige le connecteur d'application Microsoft 365 avec **Activités Microsoft 365** sélectionné (**Paramètres** > **Applications cloud** > **Connecteurs d'applications**) |
| `OfficeActivity` | Connecteur Microsoft Sentinel pour les journaux d'audit Microsoft 365 ; interrogeable dans le repérage avancé une fois l'espace de travail intégré au portail Defender |

```kusto
CloudAppEvents
| where Timestamp > ago(7d)
| where ActionType == "FileDownloaded"
| summarize Downloads = count() by AccountDisplayName, IPAddress
| order by Downloads desc
```

> **Conseil d'examen.** « Rechercher ce qu'un utilisateur a fait dans SharePoint le mois dernier, sans SIEM » oriente vers la recherche **Audit**. « Corréler l'activité Microsoft 365 avec d'autres signaux en KQL » oriente vers le repérage avancé (`CloudAppEvents`) ou vers `OfficeActivity` dans Sentinel. « Conserver les enregistrements plus de 180 jours » oriente vers les stratégies de rétention d'Audit (Premium), ou vers la rétention de Sentinel.

<!-- section: key-points -->
## Points clés

- Les connecteurs des ressources Azure utilisent les paramètres de diagnostic, souvent appliqués par Azure Policy : Owner sur l'étendue de l'attribution, et une tâche de correction pour les ressources existantes.
- Connecteur Microsoft Entra ID : Security Administrator sur le locataire ; les journaux de connexion exigent P1 ou P2.
- Syslog et CEF via AMA : redirecteur Linux, d'abord la DCR, puis le script d'installation ; `Syslog` et `CommonSecurityLog` ; des facilities distinctes pour éviter les doublons.
- Windows Security Events via AMA écrit dans `SecurityEvent` (Tous, Commun, Minimal, XPath personnalisé) ; WEF au moyen du serveur WEC écrit dans `WindowsEvent`. Les machines non Azure ont besoin d'Azure Arc.
- Les tables personnalisées se terminent par `_CL`, exigent `TimeGenerated` et sont alimentées par Custom Logs via AMA ou l'API d'ingestion des journaux (Monitoring Metrics Publisher sur la DCR).
- Purview Audit : page Audit du portail Defender, rôle Audit Logs ou View-Only Audit Logs, 180 jours par défaut ; `CloudAppEvents` dans le repérage avancé.
