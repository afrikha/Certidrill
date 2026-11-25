La stratégie de groupe est le moyen par lequel AD DS pousse la configuration vers les serveurs Windows Server et les clients Windows joints au domaine. Les questions d'examen décrivent une forêt avec des sites, des unités d'organisation (UO) et des liens de GPO, puis demandent quel paramètre l'emporte, pourquoi un GPO ne s'applique pas à un serveur, ou quelle fonctionnalité utiliser : un paramètre de stratégie, une préférence, un filtre ou le traitement par bouclage.

<!-- section: gpo-anatomy | objectives: 1.4.1 -->
## Anatomie d'un GPO et outils

Un objet de stratégie de groupe (GPO) est stocké à deux endroits, répliqués séparément :

| Partie | Où | Répliquée par |
| --- | --- | --- |
| Conteneur de stratégie de groupe (GPC) | AD DS, `CN=Policies,CN=System,DC=contoso,DC=com` : version, état, liens vers les filtres WMI | Réplication AD DS |
| Modèle de stratégie de groupe (GPT) | SYSVOL, `\\contoso.com\SYSVOL\contoso.com\Policies\{GUID}` : fichiers de paramètres, scripts | Réplication DFS (SYSVOL) |

Chaque GPO a deux moitiés : **Configuration ordinateur** (appliquée au démarrage et à l'actualisation en arrière-plan, quel que soit l'utilisateur connecté) et **Configuration utilisateur** (appliquée à l'ouverture de session et à l'actualisation). Chaque moitié contient des **Stratégies** (paramètres logiciels, paramètres Windows comme la sécurité et les scripts, modèles d'administration) et des **Préférences** (voir [Préférences de stratégie de groupe](#preferences)).

Les deux GPO créés avec le domaine :

| GPO | Lié à | À utiliser pour |
| --- | --- | --- |
| Default Domain Policy | Le domaine | Stratégies de comptes du domaine : mot de passe, verrouillage de compte, stratégie Kerberos |
| Default Domain Controllers Policy | L'UO Domain Controllers | Attribution des droits utilisateur et options de sécurité des contrôleurs de domaine |

> **Piège d'examen.** Les paramètres de mot de passe et de verrouillage des comptes **du domaine** ne prennent effet que depuis un GPO lié au **domaine**. Les mêmes paramètres dans un GPO lié à une UO modifient les comptes locaux des ordinateurs de cette UO, pas les utilisateurs du domaine. Des règles de mot de passe différentes pour un groupe d'utilisateurs du domaine demandent une stratégie de mot de passe affinée, pas un GPO d'UO.

Les **modèles d'administration** sont définis par des fichiers ADMX (indépendants de la langue) et ADML (un par langue). Par défaut, l'éditeur les lit dans `C:\Windows\PolicyDefinitions` sur l'ordinateur de l'administrateur. Un **magasin central** fait utiliser les mêmes modèles à tous les administrateurs : créez `\\contoso.com\SYSVOL\contoso.com\Policies\PolicyDefinitions`, copiez-y les fichiers ADMX et les dossiers de langue (`en-US`, `fr-FR`). Quand ce dossier existe, l'Éditeur de gestion des stratégies de groupe l'utilise à la place du dossier local.

Un **GPO Starter** est un modèle qui ne contient que des paramètres de modèles d'administration, utilisé comme base de nouveaux GPO.

Outils : la console de gestion des stratégies de groupe (GPMC, `gpmc.msc`) pour créer, lier, filtrer, sauvegarder et produire des rapports ; l'Éditeur de gestion des stratégies de groupe pour modifier les paramètres ; le module PowerShell `GroupPolicy` (installé avec la GPMC, fait partie des RSAT).

```powershell
# Create a GPO from a starter GPO and link it to an OU
New-GPO -Name "Servers-Baseline" -StarterGpoName "Server Template" |
    New-GPLink -Target "OU=Servers,DC=contoso,DC=com" -LinkEnabled Yes

# Set a registry-based policy value (Administrative Templates)
Set-GPRegistryValue -Name "Servers-Baseline" `
    -Key "HKLM\Software\Policies\Microsoft\Windows NT\Terminal Services" `
    -ValueName "fDenyTSConnections" -Type DWord -Value 0
```

<!-- section: processing-order | objectives: 1.4.1 -->
## Ordre de traitement, héritage et priorité

Les GPO s'appliquent dans l'ordre **L-S-D-UO** : GPO local, puis GPO liés au **site**, puis au **domaine**, puis à chaque **UO**, de la parente jusqu'à l'UO qui contient l'objet. Quand deux GPO configurent le même paramètre avec des valeurs différentes, celui **appliqué en dernier l'emporte** : l'UO la plus proche l'emporte sur le domaine, le domaine sur le site.

Dans un même conteneur, plusieurs GPO sont classés par **ordre des liens** : l'ordre de lien 1 a la priorité **la plus haute**, il est donc traité en dernier.

| Fonctionnalité | Définie sur | Effet |
| --- | --- | --- |
| Bloquer l'héritage | Un domaine ou une UO | Les GPO liés aux conteneurs parents (et aux sites) ne s'appliquent plus en dessous |
| Appliqué (Enforced) | Un **lien** de GPO | Le GPO traverse le blocage de l'héritage et ses paramètres l'emportent sur les GPO liés plus bas |
| Lien activé = Non | Un lien de GPO | Le lien est ignoré ; le GPO existe toujours et peut être lié ailleurs |
| État du GPO | Le GPO | Tous les paramètres activés, paramètres utilisateur désactivés, paramètres ordinateur désactivés, tous les paramètres désactivés |

Quand deux GPO **appliqués** (Enforced) sont en conflit, celui lié **le plus haut** (le plus près du domaine) l'emporte. L'option Appliqué l'emporte toujours sur le blocage de l'héritage.

> **Piège d'examen.** Appliqué est une propriété du lien, Bloquer l'héritage une propriété du conteneur. Pour qu'une base de sécurité définie au niveau du domaine s'applique à une UO dont l'administrateur a bloqué l'héritage, rendez le lien du domaine Appliqué. Retirer le blocage de l'héritage laisserait aussi passer tous les autres GPO parents.

Actualisation : les paramètres ordinateur s'appliquent au démarrage, les paramètres utilisateur à l'ouverture de session, puis les deux s'actualisent en arrière-plan toutes les **90 minutes** avec un décalage aléatoire de **30 minutes** au plus ; les contrôleurs de domaine s'actualisent toutes les **5 minutes**. Les paramètres de sécurité sont réappliqués toutes les 16 heures même si le GPO n'a pas changé. Certains paramètres (installation de logiciels, redirection de dossiers) ne s'appliquent qu'au démarrage ou à l'ouverture de session, jamais en arrière-plan.

```powershell
gpupdate /force                         # local refresh of computer and user settings
Invoke-GPUpdate -Computer SRV1 -Force   # remote refresh through a scheduled task on SRV1
Set-GPLink -Name "Security-Baseline" -Target "DC=contoso,DC=com" -Enforced Yes
Set-GPInheritance -Target "OU=Lab,DC=contoso,DC=com" -IsBlocked Yes
Set-GPLink -Name "Servers-Baseline" -Target "OU=Servers,DC=contoso,DC=com" -Order 1
```

Les GPO liés à un **site** s'appliquent aux ordinateurs dont l'adresse IP correspond à ce site (et aux utilisateurs qui s'y connectent), quel que soit leur domaine dans la forêt.

<!-- section: filtering-loopback | objectives: 1.4.1 -->
## Filtrage et traitement par bouclage

Un GPO lié ne s'applique à un objet de son étendue que si les filtres le permettent :

| Filtre | Fonctionnement | Exigence typique |
| --- | --- | --- |
| Filtrage de sécurité | L'utilisateur ou l'ordinateur doit avoir **Lecture** et **Appliquer la stratégie de groupe** sur le GPO. Par défaut : Authenticated Users | « Appliquer uniquement aux membres du groupe G-Web » |
| Refus de Appliquer la stratégie de groupe | Une entrée de refus sur le GPO pour un groupe | « Appliquer à toute l'UO sauf au groupe G-Exempt » |
| Filtre WMI | Une requête WQL évaluée sur l'ordinateur cible ; faux = le GPO n'est pas appliqué. Un seul filtre WMI par GPO, un filtre peut servir à plusieurs GPO | « Uniquement les serveurs d'une version donnée du système » ou « uniquement les ordinateurs de plus de 8 Go de mémoire » |
| Ciblage au niveau de l'élément | Par élément de préférence, pas par GPO | Voir [Préférences de stratégie de groupe](#preferences) |

> **Piège d'examen.** Si vous remplacez Authenticated Users par un groupe d'utilisateurs dans le filtrage de sécurité, les paramètres utilisateur cessent de s'appliquer : les GPO utilisateur sont lus dans le contexte de sécurité de l'ordinateur. Laissez Lecture (sans Appliquer) à Authenticated Users ou à Domain Computers sur le GPO.

Le **traitement par bouclage** (loopback) fait dépendre les paramètres **utilisateur** de l'**ordinateur** sur lequel l'utilisateur ouvre sa session. C'est un paramètre ordinateur : Configuration ordinateur > Stratégies > Modèles d'administration > Système > Stratégie de groupe > *Configure user Group Policy loopback processing mode*, défini dans un GPO qui s'applique aux ordinateurs (par exemple l'UO des hôtes de session Bureau à distance).

| Mode | Paramètres utilisateur obtenus |
| --- | --- |
| Merge (Fusionner) | Les GPO de l'utilisateur d'abord, puis la Configuration utilisateur des GPO qui s'appliquent à l'ordinateur ; en cas de conflit, ceux de l'ordinateur l'emportent |
| Replace (Remplacer) | Uniquement la Configuration utilisateur des GPO qui s'appliquent à l'ordinateur ; les GPO de l'utilisateur sont ignorés |

```powershell
# A WMI filter query that matches only servers that aren't domain controllers (ProductType 3)
# SELECT * FROM Win32_OperatingSystem WHERE ProductType = "3"

# Security filtering: only G-Web applies the GPO, computers keep Read
Set-GPPermission -Name "Web-Settings" -TargetName "G-Web" -TargetType Group -PermissionLevel GpoApply
Set-GPPermission -Name "Web-Settings" -TargetName "Authenticated Users" -TargetType Group -PermissionLevel GpoRead -Replace
```

> **Conseil d'examen.** « Les utilisateurs obtiennent un bureau verrouillé uniquement quand ils se connectent à RDS1 et RDS2, quelle que soit l'UO de leur compte » signifie bouclage en mode **Replace** sur un GPO lié à l'UO des serveurs. « Garder leurs paramètres habituels et ajouter ceux du serveur » signifie **Merge**.

<!-- section: troubleshoot-backup | objectives: 1.4.1 -->
## Dépannage, sauvegarde et migration

| Outil | Répond à |
| --- | --- |
| `gpresult /r` | Quels GPO ont été appliqués ou filtrés (et pourquoi) pour l'utilisateur et l'ordinateur actuels |
| `gpresult /h report.html` | Le rapport complet du jeu de stratégies résultant (RSoP), avec le GPO gagnant de chaque paramètre |
| Résultats de stratégie de groupe (GPMC) | Le même rapport, collecté sur un ordinateur distant |
| Modélisation de stratégie de groupe (GPMC) | La simulation d'un « et si » (autre UO, autre site, autre appartenance aux groupes, bouclage) avant le changement |
| Observateur d'événements, `Microsoft-Windows-GroupPolicy/Operational` | Détails du traitement et erreurs (contrôleur de domaine injoignable, liaison lente, extension côté client en échec) |

Exécutez `gpresult /scope computer /r` depuis une invite élevée pour voir la partie ordinateur. Un GPO affiché « Refusé (Sécurité) » est filtré par ses autorisations ; « Refusé (Filtre WMI) » par son filtre WMI ; « Non appliqué (Vide) » n'a aucun paramètre dans cette moitié.

Causes courantes d'un GPO qui ne s'applique pas : l'objet n'est pas dans l'UO liée (les GPO se lient aux UO, aux sites et aux domaines, pas aux conteneurs par défaut `Users` et `Computers`), le lien est désactivé, l'héritage est bloqué, un filtrage de sécurité ou WMI, la moitié concernée du GPO est désactivée, un paramètre placé dans la mauvaise moitié (un paramètre ordinateur ne peut pas s'appliquer à des utilisateurs), ou SYSVOL pas encore répliqué sur le contrôleur de domaine utilisé par le client.

Sauvegarde et copie :

```powershell
Backup-GPO -All -Path "\\FS1\GpoBackup"                     # settings, security filtering, WMI filter link
Restore-GPO -Name "Servers-Baseline" -Path "\\FS1\GpoBackup" # same domain, same GPO (GUID)
Import-GPO -BackupGpoName "Servers-Baseline" -Path "\\FS1\GpoBackup" `
    -TargetName "Servers-Baseline" -CreateIfNeeded -MigrationTable "\\FS1\GpoBackup\fabrikam.migtable"
Copy-GPO -SourceName "Servers-Baseline" -TargetName "Servers-Baseline-Test"
```

| Besoin | Opération |
| --- | --- |
| Annuler une mauvaise modification d'un GPO existant | Restore-GPO depuis une sauvegarde |
| Recréer un GPO supprimé par erreur | Restore-GPO (la sauvegarde le recrée avec son GUID) |
| Déplacer des paramètres vers un autre domaine ou une autre forêt | Import-GPO dans un GPO du domaine cible, avec une **table de migration** qui fait correspondre les utilisateurs, groupes et chemins UNC du domaine source |
| Dupliquer un GPO dans le même domaine | Copy-GPO |

> **Piège d'examen.** Restaurer ou importer un GPO ne recrée pas ses **liens** : liez-le de nouveau aux sites, au domaine et aux UO ensuite.

<!-- section: preferences | objectives: 1.4.2 -->
## Préférences de stratégie de groupe

Les préférences configurent des éléments que les stratégies ne couvrent pas (mappages de lecteurs, fichiers, raccourcis, groupes locaux, tâches planifiées, toute valeur de Registre), avec un comportement différent :

| | Paramètres de stratégie | Préférences |
| --- | --- | --- |
| Où la valeur est écrite | Clés de Registre de stratégie (`...\Policies\...`) | L'emplacement normal utilisé par Windows ou l'application |
| L'utilisateur peut-il la modifier | Non, l'interface est verrouillée | Oui, jusqu'à la prochaine actualisation qui la réécrit (ou jamais, avec *Apply once*) |
| Quand le GPO ne s'applique plus | Supprimée automatiquement | Reste en place (« tatouage ») sauf si *Remove this item when it is no longer applied* est coché |
| Ciblage | Par GPO (sécurité, filtre WMI) | Par élément (ciblage au niveau de l'élément) |

Les extensions de préférences se trouvent sous Configuration ordinateur ou Configuration utilisateur > Préférences :

| Groupe | Éléments | Disponible dans |
| --- | --- | --- |
| Paramètres Windows | Environnement, Fichiers, Dossiers, Fichiers Ini, Registre, Raccourcis | Ordinateur et utilisateur |
| Paramètres Windows | Mappages de lecteurs (Drive Maps) | Utilisateur uniquement |
| Paramètres Windows | Partages réseau (Network Shares) | Ordinateur uniquement |
| Paramètres du Panneau de configuration | Sources de données, Périphériques, Options des dossiers, Utilisateurs et groupes locaux, Options réseau, Options d'alimentation, Imprimantes, Tâches planifiées | Ordinateur et utilisateur |
| Paramètres du Panneau de configuration | Services | Ordinateur uniquement |
| Paramètres du Panneau de configuration | Paramètres Internet, Options régionales, Menu Démarrer | Utilisateur uniquement |

Chaque élément a une **action** :

| Action | Élément absent | Élément présent |
| --- | --- | --- |
| Create (Créer) | Créé | Laissé inchangé |
| Replace (Remplacer) | Créé | Supprimé puis recréé avec les valeurs configurées |
| Update (Mettre à jour, par défaut pour la plupart des éléments) | Créé | Seules les propriétés configurées sont modifiées |
| Delete (Supprimer) | Rien | Supprimé |

L'onglet **Commun** de chaque élément ajoute : *Stop processing items in this extension if an error occurs*, *Run in logged-on user's security context* (les éléments utilisateur s'exécutent par défaut sous le compte SYSTEM ; sélectionnez-la quand un élément a besoin de ressources propres à l'utilisateur, comme ses variables d'environnement ou des emplacements réseau inaccessibles à SYSTEM ; Drive Maps et Printers utilisent déjà le contexte de l'utilisateur et n'en ont pas besoin), *Remove this item when it is no longer applied* (impose l'action Replace), *Apply once and do not reapply* et *Item-level targeting*.

Le **ciblage au niveau de l'élément** filtre un élément avec des conditions combinées par ET/OU, inversées avec « n'est pas » et regroupées en collections : groupe de sécurité, unité d'organisation, site, nom d'ordinateur, système d'exploitation, plage d'adresses IP, correspondance de Registre, requête WMI, langue, plage horaire, présence d'une batterie, entre autres.

> **Conseil d'examen.** « Mapper le lecteur `S:` sur `\\FS1\Sales` uniquement pour les membres de G-Sales, et le lecteur `F:` sur `\\FS1\Finance` uniquement pour G-Finance, avec un seul GPO » signifie un GPO avec deux éléments Drive Maps, chacun avec un ciblage au niveau de l'élément sur un groupe de sécurité. Deux GPO avec filtrage de sécurité fonctionnent aussi, mais ne respectent pas « un seul GPO ».

> **Piège d'examen.** Les préférences ne peuvent plus stocker de mots de passe : depuis la mise à jour de sécurité MS14-025, les champs de mot de passe de Local Users and Groups, Drive Maps, Services, Scheduled Tasks (tâches immédiates comprises) et Data Sources sont désactivés, car la valeur stockée pouvait être déchiffrée par n'importe quel utilisateur du domaine. Pour gérer les mots de passe des administrateurs locaux, utilisez Windows LAPS.

**Utilisateurs et groupes locaux** est la méthode à privilégier pour ajouter un groupe du domaine au groupe local Administrateurs des serveurs : action **Update**, groupe « Administrators (built-in) », ajout de `CONTOSO\G-SrvAdmins`. Elle ajoute des membres sans retirer les autres, sauf si *Delete all member users* / *Delete all member groups* est coché. L'ancienne stratégie **Groupes restreints** (Configuration ordinateur > Stratégies > Paramètres Windows > Paramètres de sécurité) avec « Membres de ce groupe » **remplace** toute l'appartenance.

<!-- section: key-points -->
## Points clés

- Ordre L-S-D-UO ; le dernier GPO appliqué l'emporte ; ordre de lien 1 = priorité la plus haute dans un conteneur.
- Appliqué (sur un lien) l'emporte sur Bloquer l'héritage (sur un conteneur) ; entre GPO appliqués, le plus haut l'emporte.
- Stratégie de mot de passe et de verrouillage du domaine uniquement depuis un GPO lié au domaine.
- Le filtrage de sécurité demande Lecture + Appliquer ; les ordinateurs doivent garder Lecture pour que les paramètres utilisateur s'appliquent. Un seul filtre WMI par GPO.
- Bouclage : paramètre ordinateur ; Merge garde les GPO de l'utilisateur, Replace les ignore.
- Restore-GPO dans le même domaine, Import-GPO avec une table de migration entre domaines ; les liens ne sont jamais restaurés.
- Préférences : emplacements de Registre normaux, modifiables par l'utilisateur, conservées après retrait sauf indication contraire ; actions Create, Replace, Update, Delete ; ciblage par élément ; pas de mots de passe.
