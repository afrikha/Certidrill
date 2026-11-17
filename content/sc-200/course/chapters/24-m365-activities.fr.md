Beaucoup d'incidents aboutissent dans Microsoft 365 : une boîte aux lettres compromise, une règle de transfert dans la boîte de réception, des fichiers téléchargés depuis SharePoint, une application qui lit des données par Microsoft Graph. Trois outils répondent à trois questions différentes. **Microsoft Purview Audit** dit qui a fait quoi et quand. La **recherche de contenu** de Microsoft Purview eDiscovery trouve le contenu lui-même (le message d'hameçonnage, le document divulgué) et peut supprimer des e-mails. Les **journaux d'activité Microsoft Graph** enregistrent chaque requête d'API adressée à Microsoft Graph dans le locataire. L'examen donne un besoin d'enquête et demande l'outil, le rôle, la limite ou la requête.

<!-- section: purview-audit | objectives: 2.3.1 -->
## Examiner avec Microsoft Purview Audit

Le journal d'audit unifié enregistre les activités des utilisateurs et des administrateurs dans Exchange Online, SharePoint, OneDrive, Microsoft Teams, Microsoft Entra ID et d'autres services. L'audit est activé par défaut.

| | Audit (Standard) | Audit (Premium) |
| --- | --- | --- |
| Rétention par défaut | 180 jours | 1 an pour Microsoft Entra ID, Exchange, OneDrive et SharePoint ; 180 jours pour les autres services |
| Stratégies de rétention des journaux d'audit | Non disponibles | Jusqu'à 1 an, ou jusqu'à 10 ans avec la licence complémentaire 10-Year Audit Log Retention |
| Exportation depuis une recherche | 50 000 lignes | 1 000 000 de lignes |
| API Office 365 Management Activity | Bande passante de base | Environ le double |

Audit (Premium) ajoute aussi des propriétés à certains événements, par exemple l'étiquette de confidentialité dans les enregistrements `MailItemsAccessed` et des détails supplémentaires dans les événements Teams. La rétention de dix ans n'est pas rétroactive : elle s'applique à partir de la création de la stratégie.

**Lancer une recherche.** Dans le portail Microsoft Purview, ouvrez **Audit**, remplissez les critères et lancez la recherche. L'utilisateur a besoin du rôle **Audit Logs** ou **View-Only Audit Logs**.

| Critère | Utilisation |
| --- | --- |
| Plage de dates et d'heures (UTC) | 7 derniers jours par défaut, **180 jours** au maximum par recherche |
| Activities - friendly names / operations names | Groupes d'activités ou noms d'opérations exacts, séparés par des virgules (`New-InboxRule,Set-InboxRule`) |
| Record types, Workloads | Limiter à un service |
| Users | Vide = tous les utilisateurs et comptes de service |
| File, folder, or site | Nom partiel ou URL, `*` comme caractère générique final |
| Keyword Search | Champs indexés du schéma commun uniquement |
| Admin Units | Limiter à des unités administratives |

Limites et comportement des recherches :

- Jusqu'à **10** travaux de recherche en parallèle par compte d'utilisateur, et **une seule** recherche sans filtre à la fois.
- Une recherche continue après la fermeture du navigateur ; dans un grand locataire, une recherche large peut prendre jusqu'à 48 heures. Les recherches terminées sont conservées **30 jours**.
- Les événements d'Exchange, SharePoint, OneDrive et Teams apparaissent en général 60 à 90 minutes après les faits ; les autres services peuvent prendre plus de temps.
- Un administrateur limité à des unités administratives ne voit que les enregistrements générés par les utilisateurs de ces unités.

La même recherche s'exécute dans Exchange Online PowerShell, que le portail utilise :

```powershell
Get-AdminAuditLogConfig | Format-List UnifiedAuditLogIngestionEnabled

Search-UnifiedAuditLog -StartDate 2026-11-01 -EndDate 2026-11-08 `
  -UserIds ana@contoso.com -Operations New-InboxRule,Set-InboxRule,MailItemsAccessed `
  -ResultSize 1000
```

Activités qu'un analyste recherche typiquement après la compromission d'un compte :

| Question | Opérations |
| --- | --- |
| L'attaquant a-t-il créé une règle de transfert ou de suppression ? | `New-InboxRule`, `Set-InboxRule`, `UpdateInboxRules` |
| Quels messages l'attaquant a-t-il lus ? | `MailItemsAccessed` |
| Quels fichiers ont été emportés ? | `FileAccessed`, `FileDownloaded`, `FileSyncDownloadedFull` |
| L'attaquant a-t-il accordé des accès ? | `Add member to role.`, `Consent to application.` (Microsoft Entra ID), `Add-MailboxPermission` |

Pour une exportation massive ou continue vers un SIEM, utilisez l'**API Office 365 Management Activity** plutôt que des scripts autour de l'applet de commande. Dans le portail Defender, la table de repérage avancé `CloudAppEvents` expose aussi les activités Microsoft 365 quand le connecteur d'application Microsoft 365 de Defender for Cloud Apps est connecté.

> **Piège d'examen.** `UnifiedAuditLogIngestionEnabled` doit être lu dans **Exchange Online PowerShell** : dans Security & Compliance PowerShell, la propriété affiche toujours `False`. Et une exigence comme « conserver les enregistrements d'audit Exchange 3 ans » demande une stratégie de rétention des journaux d'audit plus la licence complémentaire de 10 ans, pas une plage de recherche plus longue.

<!-- section: content-search | objectives: 2.3.2 -->
## Examiner avec la recherche de contenu de Microsoft Purview eDiscovery

L'audit indique qu'un message a été envoyé ou un fichier partagé ; la **recherche de contenu** trouve les éléments eux-mêmes dans les boîtes aux lettres Exchange Online, les sites SharePoint et OneDrive, Microsoft Teams, les groupes Microsoft 365 et Viva Engage, puis fournit des statistiques, un échantillon et l'exportation.

Les expériences classiques Recherche de contenu, eDiscovery (Standard) et eDiscovery (Premium) ont été retirées le 31 août 2025 (sauf pour Microsoft 365 exploité par 21Vianet). La recherche de contenu se trouve désormais dans **eDiscovery** du portail Microsoft Purview : toutes les recherches de contenu appartiennent à un **cas Content Search généré par le système**, accessible par défaut aux gestionnaires et administrateurs eDiscovery (groupe de rôles **eDiscovery Manager**). Limitez qui voit les recherches avec les **Case settings** de ce cas (membres du cas).

Construire une recherche :

1. Dans **eDiscovery**, ouvrez le cas Content Search (ou un autre cas) et créez une recherche.
2. Ajoutez les **sources de données** : utilisateurs (leur boîte aux lettres et leur OneDrive), groupes, sites.
3. Écrivez la requête avec le **générateur de conditions** ou directement en **KeyQL** (Keyword Query Language).
4. Exécutez la requête pour obtenir les **statistiques** (nombre et taille estimés des éléments, principaux emplacements), puis examinez un **échantillon** des résultats.
5. Exportez les résultats ou, dans eDiscovery (Premium), ajoutez-les à un **jeu à réviser** (review set).

```text
from:attacker@fabrikam.com AND subject:"Invoice overdue" AND received>=2026-11-01
participants:ana@contoso.com AND attachmentnames:payroll.xlsx
```

| Fonctionnalité | eDiscovery (Standard) | eDiscovery (Premium) |
| --- | --- | --- |
| Recherches avec KeyQL et conditions, statistiques, échantillons, exportation, conservations | Oui | Oui |
| Rechercher et supprimer des données (e-mails, messages Teams) | Oui | Oui |
| Jeux à réviser, étiquetage, analytique, OCR, requêtes KQL sur les jeux à réviser | Non | Oui (E5) |

**Supprimer des e-mails malveillants ou divulgués** (recherche et purge) sépare deux autorisations : rechercher exige le groupe de rôles **eDiscovery Manager** ou le rôle **Compliance Search** ; supprimer exige le rôle **Search And Purge** (par exemple par le groupe de rôles **Organization Management** de Microsoft Purview, pas le groupe Exchange Online du même nom).

```powershell
Connect-IPPSSession -EnableSearchOnlySession
$Search = New-ComplianceSearch -Name "Remove Phishing Message" -ExchangeLocation All `
  -ContentMatchQuery '(Received:11/13/2026..11/14/2026) AND (Subject:"Action required")'
Start-ComplianceSearch -Identity $Search.Identity
New-ComplianceSearchAction -SearchName "Remove Phishing Message" -Purge -PurgeType SoftDelete
Get-ComplianceSearchAction
```

| Point | Valeur |
| --- | --- |
| Éléments supprimés par boîte aux lettres et par exécution (PowerShell) | 10 |
| Éléments supprimés par emplacement et par exécution (Microsoft Graph, cas Premium) | 100 |
| Boîtes aux lettres d'une recherche utilisée pour une purge | 50 000 au maximum |
| Emplacements | Boîtes aux lettres et dossiers publics uniquement ; une recherche qui inclut des sites SharePoint ou OneDrive échoue à l'étape de purge |
| `SoftDelete` | Les éléments vont dans Éléments récupérables (Deletions) : l'utilisateur peut les récupérer pendant la période de rétention des éléments supprimés |
| `HardDelete` | Les éléments vont dans le dossier Purges : l'utilisateur ne peut pas les récupérer |
| Boîtes aux lettres en conservation | Les éléments sont conservés jusqu'à la fin de la conservation |

> **Piège d'examen.** Un utilisateur eDiscovery Manager trouve le message d'hameçonnage mais reçoit l'erreur indiquant que le paramètre `Purge` est introuvable : il lui manque le rôle **Search And Purge**. Et avec Microsoft Defender for Office 365 Plan 2, Microsoft recommande de corriger les e-mails malveillants depuis Defender for Office 365 (Explorer) plutôt que par recherche et purge.

Les messages de conversation Teams se suppriment avec une procédure distincte, et les éléments déjà présents dans un jeu à réviser ne disparaissent qu'en supprimant le cas.

<!-- section: graph-activity-logs | objectives: 2.3.3 -->
## Examiner avec les journaux d'activité Microsoft Graph

Les journaux d'activité Microsoft Graph sont une piste d'audit de **chaque requête HTTP** que Microsoft Graph reçoit pour le locataire : applications métier, scripts et SDK, applications Microsoft, et clients d'IA qui appellent le Microsoft MCP Server for Enterprise (leur `RequestUri` contient `/enterprise`). Ils servent à retracer ce qu'un compte ou une application compromis a fait par l'API, à repérer des volumes d'appels inhabituels et à examiner des attributions d'autorisations inattendues.

Prérequis et configuration :

- Une licence **Microsoft Entra ID P1 ou P2** pour le locataire.
- **Security Administrator** est le rôle Microsoft Entra le moins privilégié qui peut configurer les paramètres de diagnostic.
- Dans les paramètres de diagnostic de Microsoft Entra, envoyez les journaux d'activité Microsoft Graph vers une destination : un **espace de travail Log Analytics** (pour KQL et Microsoft Sentinel), un **compte de stockage** (rétention longue) ou un **hub d'événements** (autre SIEM).

| Point | Valeur |
| --- | --- |
| Table dans Log Analytics et Microsoft Sentinel | `MicrosoftGraphActivityLogs` |
| Latence | En général moins de 30 minutes, jusqu'à 2 heures |
| Portée | Requêtes vers le locataire de ressources uniquement ; l'activité d'une application multilocataire dans un autre locataire n'est pas visible |
| Filtrage | Pas dans le paramètre de diagnostic ; utilisez une transformation de l'espace de travail pour supprimer des lignes ou des colonnes, ou le plan Basic pour réduire le coût |

Colonnes clés :

| Colonne | Contenu |
| --- | --- |
| `RequestMethod`, `RequestUri`, `ResponseStatusCode` | Ce qui a été appelé et le résultat (401, 403, 429...) |
| `AppId`, `ServicePrincipalId`, `UserId` | Quelle application, quel principal de service ou quel utilisateur a fait l'appel |
| `IPAddress`, `UserAgent`, `Location` | D'où vient l'appel |
| `Roles`, `Scopes` | Rôles d'application ou étendues déléguées du jeton |
| `SignInActivityId` | Jointure avec les journaux de connexion (`UniqueTokenIdentifier`) |
| `TokenIssuedAt`, `SessionId`, `DeviceId` | Contexte du jeton et de la session |

```kusto
MicrosoftGraphActivityLogs
| where TimeGenerated > ago(7d)
| where UserId == "7f3c2a10-0000-4b8e-9c55-1d2e3f4a5b6c"
| where RequestMethod in ("POST", "PATCH", "DELETE")
| summarize Calls = count() by AppId, RequestMethod, tostring(parse_url(RequestUri).Path), IPAddress
| order by Calls desc
```

```kusto
MicrosoftGraphActivityLogs
| where TimeGenerated > ago(7d)
| join kind=leftouter (union SigninLogs, AADNonInteractiveUserSignInLogs, AADServicePrincipalSignInLogs
    | where TimeGenerated > ago(7d))
    on $left.SignInActivityId == $right.UniqueTokenIdentifier
```

La première requête liste les opérations d'écriture d'un utilisateur par application, chemin et adresse IP ; la seconde relie chaque requête Graph à la connexion qui a émis son jeton.

> **Piège d'examen.** Deux tables, deux endroits. `MicrosoftGraphActivityLogs` se trouve dans l'espace de travail Log Analytics (Microsoft Sentinel, après le paramètre de diagnostic). Dans le repérage avancé de Defender XDR, la table équivalente est `GraphAPIAuditEvents`. Et les journaux d'activité Graph montrent les appels d'API, pas les connexions : celles-ci sont dans `SigninLogs` et les tables associées.

<!-- section: key-points -->
## Points clés

- Audit = qui a fait quoi : 180 jours par défaut ; Audit (Premium) conserve les enregistrements Entra ID, Exchange, OneDrive et SharePoint 1 an, stratégies de rétention jusqu'à 10 ans avec la licence complémentaire.
- Recherche d'audit : rôle Audit Logs ou View-Only Audit Logs, plage de 180 jours par recherche, 10 recherches en parallèle, résultats conservés 30 jours, 50 000 ou 1 000 000 de lignes exportées.
- Recherche de contenu = trouver les éléments ; elle se trouve désormais dans le cas Content Search d'eDiscovery, avec KeyQL, statistiques et échantillons.
- Purger des e-mails : eDiscovery Manager pour rechercher, Search And Purge pour supprimer, 10 éléments par boîte aux lettres, 50 000 boîtes aux lettres, boîtes aux lettres uniquement.
- Journaux d'activité Graph : Entra ID P1 ou P2, Security Administrator, paramètre de diagnostic, table `MicrosoftGraphActivityLogs`, jointure sur `SignInActivityId`.
