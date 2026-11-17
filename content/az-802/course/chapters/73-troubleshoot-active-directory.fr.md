Quand Active Directory Domain Services (AD DS) tombe en panne, l'examen demande quelle méthode de récupération correspond au dommage (Corbeille Active Directory, restauration ne faisant pas autorité ou faisant autorité, synchronisation de SYSVOL) et quel outil trouve la cause d'un symptôme (erreurs de réplication, contrôleur de domaine introuvable, échecs Kerberos, canal sécurisé rompu).

<!-- section: recycle-bin | objectives: 7.3.1 -->
## Restaurer des objets depuis la Corbeille Active Directory

La Corbeille Active Directory restaure un objet supprimé avec **tous ses attributs à valeur liée et non liée** : un utilisateur restauré retrouve ses appartenances aux groupes, sans sauvegarde et sans redémarrer AD DS.

| Élément | Valeur |
| --- | --- |
| Prérequis | Niveau fonctionnel de la forêt et du domaine Windows Server 2008 R2 ou supérieur ; Domain Admins du domaine cible |
| État par défaut | Désactivée ; l'activation est **irréversible** |
| Portée | Seulement les objets supprimés **après** son activation |
| Activation exécutée sur | Le DC qui détient le rôle de **maître d'attribution de noms de domaine** |
| Durée de vie des objets supprimés | `msDS-DeletedObjectLifetime` ; si non défini, la valeur de `tombstoneLifetime` (180 jours si non défini) |

Un objet supprimé reste dans le conteneur **Deleted Objects**, restaurable avec tous ses attributs, pendant la durée de vie des objets supprimés. Il devient ensuite un objet recyclé que la Corbeille ne peut pas restaurer, puis le garbage collection (toutes les 12 heures) le supprime.

Activez-la dans le Centre d'administration Active Directory (**Enable Recycle Bin** dans le volet **Tasks**) ou avec PowerShell. Restaurez depuis le nœud **Deleted Objects** (**Restore** vers le conteneur d'origine, **Restore To** vers un autre) ou avec `Restore-ADObject` :

```powershell
Enable-ADOptionalFeature -Identity 'Recycle Bin Feature' `
  -Scope ForestOrConfigurationSet -Target 'contoso.com' -Server DC1

Get-ADObject -Filter 'samAccountName -eq "ana"' -IncludeDeletedObjects | Restore-ADObject
```

Quand une unité d'organisation a été supprimée avec son contenu, restaurez **d'abord le parent**, puis ses enfants.

> **Piège d'examen.** Les objets supprimés **avant** l'activation de la Corbeille ne peuvent pas être récupérés avec elle. Le seul recours est une restauration faisant autorité depuis une sauvegarde antérieure à son activation.

<!-- section: dsrm-restore | objectives: 7.3.2 -->
## Récupérer la base de données AD DS avec le DSRM

La base de données est `Ntds.dit` dans `%SystemRoot%\NTDS`, avec ses journaux de transactions `Edb*.log`. Pour la restaurer, le DC démarre en **mode de restauration des services d'annuaire (DSRM)** : AD DS est hors ligne et vous vous connectez en tant qu'Administrator avec le **mot de passe DSRM**.

| Situation | Type de restauration |
| --- | --- |
| La base d'un DC est corrompue, les autres DC sont sains | **Ne faisant pas autorité** : restaurez l'état du système ; la réplication apporte toutes les modifications plus récentes |
| Objets supprimés ou modifiés, modification répliquée partout | **Faisant autorité** pour ces objets, afin qu'ils l'emportent sur la suppression répliquée |
| Objets supprimés, Corbeille activée, dans la durée de vie des objets supprimés | Pas de restauration : Corbeille |

Une restauration est **ne faisant pas autorité par défaut**. Une restauration faisant autorité ajoute une étape `ntdsutil` avant le redémarrage :

```text
bcdedit /set safeboot dsrepair
shutdown /r /t 0

REM In DSRM: restore the system state without rebooting
wbadmin get versions
wbadmin start systemstaterecovery -version:11/14/2026-21:00

ntdsutil
activate instance ntds
authoritative restore
restore subtree "OU=Sales,DC=contoso,DC=com"
quit
quit

bcdedit /deletevalue safeboot
shutdown /r /t 0
```

`restore object` marque un objet, `restore subtree` un objet et tous ses enfants. Les versions de leurs attributs augmentent de **100 000 par jour écoulé depuis la sauvegarde**, pour qu'ils l'emportent sur chaque partenaire (`verinc` remplace cette valeur, uniquement pour restaurer par-dessus une restauration faisant autorité incorrecte). Ntdsutil écrit aussi un **fichier LDIF** qui restaure les liens arrière, comme les appartenances aux groupes d'autres domaines.

> **Piège d'examen.** Ne redémarrez pas en mode normal entre la restauration de l'état du système et la restauration faisant autorité : la suppression répliquée depuis les autres DC écraserait les objets restaurés.

Un mot de passe DSRM oublié se réinitialise depuis un DC en fonctionnement : `ntdsutil`, `set dsrm password`, `reset password on server null` (`null` désigne le serveur local).

> **Conseil d'examen.** **AD DS redémarrable** (arrêt du service `NTDS`) sert à la maintenance hors connexion, comme la défragmentation hors connexion ; un DC dans l'état AD DS arrêté ne peut ni traiter les connexions ni répliquer.

<!-- section: sysvol-recovery | objectives: 7.3.3 -->
## Récupérer SYSVOL

Un GPO comprend un **conteneur de stratégie de groupe** (un objet AD, répliqué par AD) et un **modèle de stratégie de groupe** (des fichiers sous `%SystemRoot%\SYSVOL\Domain\Policies`, répliqués par la **réplication DFS**). Un contenu SYSVOL supprimé se réplique comme toute modification : récupérer revient à choisir la copie qui l'emporte.

| Situation | Procédure |
| --- | --- |
| Un DC a un SYSVOL endommagé, les autres sont sains | Synchronisation **ne faisant pas autorité** de ce DC uniquement |
| SYSVOL endommagé partout, bonne copie restaurée sur un DC | Synchronisation **faisant autorité** de ce DC (de préférence l'émulateur PDC) et ne faisant pas autorité sur **tous** les autres |
| Restauration de l'état du système sur le même matériel et la même instance du système d'exploitation | `wbadmin start systemstaterecovery` avec `-authsysvol` |
| Restauration complète (bare metal) | Mettre `msDFSR-Options` à 1 après la restauration |

Les attributs se trouvent sur `CN=SYSVOL Subscription,CN=Domain System Volume,CN=DFSR-LocalSettings,CN=DC1,OU=Domain Controllers,DC=contoso,DC=com` (ADSI Edit, ou l'Attribute Editor d'Utilisateurs et ordinateurs Active Directory avec **Advanced Features**) : `msDFSR-Enabled` (`FALSE` arrête la réplication de SYSVOL sur le DC) et `msDFSR-Options` (`1` = faisant autorité).

- **Ne faisant pas autorité** : mettez `msDFSR-Enabled` à `FALSE`, forcez la réplication AD, exécutez `dfsrdiag pollad` (événement **4114**) ; remettez `TRUE`, forcez la réplication AD, exécutez `dfsrdiag pollad` (événements **4614** et **4604**).
- **Faisant autorité** : arrêtez DFSR sur **chaque** DC ; sur le DC faisant autorité, mettez `msDFSR-Enabled` à `FALSE` et `msDFSR-Options` à `1`, sur les autres `msDFSR-Enabled` à `FALSE` ; forcez la réplication AD ; démarrez DFSR sur le DC faisant autorité, remettez `TRUE`, exécutez `dfsrdiag pollad` (événement **4602**) ; puis démarrez DFSR sur les autres, mettez `TRUE` et exécutez `dfsrdiag pollad` sur chacun.

> **Piège d'examen.** Rendre un DC faisant autorité sans rendre tous les autres ne faisant pas autorité crée des conflits. La console Gestion DFS et `dfsradmin` ne permettent pas ces synchronisations.

<!-- section: replication | objectives: 7.3.4 -->
## Résoudre les problèmes de réplication AD

Chaque DC détient au moins les partitions de domaine, de configuration et de schéma ; le KCC construit la topologie. La réplication exige la connectivité réseau, le DNS, l'authentification, une heure à moins de 5 minutes, une base saine et une topologie valide.

| Outil | Usage |
| --- | --- |
| `repadmin /replsummary` | DC en échec de réplication entrante ou sortante : commencez ici |
| `repadmin /showrepl` | Dernière tentative entrante par partition et partenaire d'un DC, avec son erreur |
| `repadmin /syncall` | Synchronise un DC avec tous ses partenaires |
| Sites et services Active Directory | **Replicate Now** sur un objet de connexion |
| `Get-ADReplicationFailure` | Les mêmes informations sous forme d'objets PowerShell |

```text
repadmin /replsummary
repadmin /showrepl * /csv > showrepl.csv
repadmin /syncall DC2 /AdeP
```

| Erreur | Signification | Première vérification |
| --- | --- | --- |
| 8524 | Échec de recherche DNS | Enregistrement CNAME `_msdcs` ou A du DC source, `dcdiag /test:dns`, puis `ipconfig /registerdns` et redémarrage de Netlogon sur la source ; ou métadonnées obsolètes d'un DC supprimé |
| 1722 | Le serveur RPC n'est pas disponible | Pare-feu (TCP 135 et ports RPC dynamiques), DNS, carte réseau ; testez avec `portqry` |
| 8453 | L'accès à la réplication a été refusé | Autorisation **Replicating Directory Changes**, session non élevée ; `dcdiag /test:CheckSecurityError` |
| 8614 | Durée de vie de désactivation dépassée | Voir la section suivante |

> **Piège d'examen.** 1722 et 8524 sont des problèmes d'accessibilité ; 8453 est un problème d'autorisations. Ouvrir des ports de pare-feu ne corrige jamais 8453.

<!-- section: replication-consistency | objectives: 7.3.4 -->
## Objets persistants et restauration USN

Une suppression est mémorisée pendant la **durée de vie de désactivation** (tombstone lifetime, 180 jours dans les forêts actuelles). Un DC qui ne réplique pas pendant plus longtemps peut conserver des objets que les autres ont supprimés : des **objets persistants** (lingering objects).

| Symptôme | Signification | Réponse |
| --- | --- | --- |
| Erreur 8614, événement **2042** | Pas de réplication avec cette source depuis plus que la durée de vie de désactivation ; réplication arrêtée | Recherchez les sauts d'horloge, supprimez les objets persistants, puis autorisez temporairement la réplication avec le partenaire divergent |
| Événement **2095**, Netlogon suspendu, `Dsa Not Writable` = 4 | **Restauration USN** (USN rollback) : une ancienne copie de la base a été remise en place par une méthode non prise en charge (image, disque dur virtuel copié, instantané de disque) | Rétrogradez et nettoyez les métadonnées, ou restaurez une sauvegarde de l'état du système prise en charge |

```text
repadmin /removelingeringobjects DC3 2a1b7c3e-0f45-4d0e-9a8e-0c5d9f1b2e77 "DC=contoso,DC=com" /advisory_mode
repadmin /regkey * +strict
```

`/advisory_mode` se contente de journaliser ; le GUID est le GUID de l'objet DSA d'un DC de référence sain. La **cohérence stricte de la réplication** empêche les destinations de recréer des objets persistants. Windows Server 2012 et versions ultérieures détectent un changement de **VM-Generation ID** Hyper-V et réinitialisent l'ID d'invocation, ce qui protège les DC virtualisés.

> **Piège d'examen.** Ne supprimez jamais la valeur `Dsa Not Writable` pour relancer un DC restauré à un USN antérieur : il devient définitivement non pris en charge.

<!-- section: on-premises-ad | objectives: 7.3.5 -->
## Résoudre les problèmes d'AD DS local

Les clients localisent les DC grâce aux enregistrements DNS SRV inscrits par **Netlogon**. La plupart des problèmes « impossible de trouver un contrôleur de domaine » ou « impossible de joindre le domaine » viennent du DNS : membres et DC doivent utiliser des serveurs DNS qui résolvent les zones AD, jamais un résolveur public.

| Besoin | Outil |
| --- | --- |
| Santé générale d'un DC | `dcdiag` |
| Inscription DNS pour AD | `dcdiag /test:dns` |
| Quel DC, émulateur PDC ou catalogue global un client trouve | `nltest /dsgetdc:contoso.com` avec `/pdc` ou `/gc` |
| Réinscrire les enregistrements DNS d'un DC | `nltest /dsregdns`, ou `ipconfig /registerdns` et redémarrage de Netlogon |
| Supprimer un DC qui n'existe plus | Nettoyage des métadonnées : supprimez ses NTDS Settings dans Sites et services, ou `ntdsutil` `metadata cleanup` |
| Vérifier la base | `ntdsutil` `semantic database analysis` |

```text
dcdiag /test:DNS /v /e /f:dcdiag-dns.txt
nltest /dsgetdc:contoso.com /pdc /force
net share
```

Sur un DC, `net share` doit lister **SYSVOL** et **NETLOGON** ; sinon sa réplication initiale de SYSVOL n'est pas terminée et la stratégie de groupe échoue pour ses clients. Quand l'**émulateur PDC** est indisponible, vérifiez la synchronisation de l'heure, les mises à jour de mots de passe et la modification des GPO ; s'il ne revient pas, prenez le rôle de force (`ntdsutil` `roles`).

> **Conseil d'examen.** Les erreurs 8524 vers un DC supprimé se corrigent par le nettoyage des métadonnées, pas par des enregistrements DNS.

<!-- section: kerberos | objectives: 7.3.6 -->
## Résoudre les problèmes liés à Kerberos et à l'authentification

Kerberos exige des horloges à moins de **5 minutes** d'écart, une résolution DNS correcte et un **nom de principal du service (SPN)** inscrit sur un seul compte.

| Symptôme | Cause et correction |
| --- | --- |
| `KRB_AP_ERR_SKEW` | Écart d'horloge supérieur à 5 minutes : les membres se synchronisent sur les DC, les DC sur l'émulateur PDC de leur domaine, l'émulateur PDC du domaine racine de la forêt sur une source externe |
| `KDC_ERR_S_PRINCIPAL_UNKNOWN` | SPN sur aucun compte : `setspn -S` sur le compte de service |
| `KDC_ERR_PRINCIPAL_NOT_UNIQUE` | SPN sur plusieurs comptes : trouvez-le avec `setspn -X`, supprimez le doublon |
| `KRB_AP_ERR_MODIFIED` | Le service ne peut pas déchiffrer le ticket (SPN sur le mauvais compte, nom DNS pointant vers le mauvais serveur) |
| L'accès par adresse IP n'utilise que NTLM | Aucun SPN ne correspond à une adresse IP : utilisez le nom DNS |

```powershell
w32tm /query /status
setspn -X
setspn -S HTTP/app1.contoso.com CONTOSO\svc-app1
klist purge
klist -li 0x3e7 purge
```

`klist -li 0x3e7 purge` vide les tickets du compte d'ordinateur, par exemple après l'ajout de l'ordinateur à un groupe.

| Délégation | Configurée sur | Entre domaines |
| --- | --- | --- |
| Non contrainte | Le frontal ; la moins sécurisée | Prise en charge |
| Délégation contrainte Kerberos | Le frontal liste les SPN du back-end | Non prise en charge |
| Délégation contrainte basée sur les ressources | Le back-end liste les frontaux autorisés | Prise en charge |

> **Piège d'examen.** Pour un service back-end dans un autre domaine ou une autre forêt, la réponse est la délégation contrainte basée sur les ressources. Ne la combinez pas avec la délégation contrainte sur les mêmes serveurs.

<!-- section: secure-channel | objectives: 7.3.7 -->
## Résoudre les problèmes de canal sécurisé et d'approbation des comptes d'ordinateur

Chaque membre s'authentifie par un **canal sécurisé** Netlogon avec le mot de passe de son compte d'ordinateur, qu'il change tous les **30 jours** par défaut. Quand les mots de passe local et AD divergent (serveur revenu à un ancien point de contrôle, compte réinitialisé dans AD, nom réutilisé), la connexion échoue avec « The trust relationship between this workstation and the primary domain failed ».

| Besoin | Outil |
| --- | --- |
| Tester le canal d'un membre | `Test-ComputerSecureChannel` |
| Le réparer sans quitter le domaine | `Test-ComputerSecureChannel -Repair -Credential CONTOSO\admin` |
| Réinitialiser le mot de passe de l'ordinateur | `Reset-ComputerMachinePassword -Server DC1 -Credential CONTOSO\admin` |
| Vérifier ou réinitialiser le canal, y compris sur un DC | `nltest /sc_verify:contoso`, `nltest /sc_reset:contoso` |
| Réinitialiser le mot de passe machine d'un contrôleur de domaine | `netdom resetpwd` avec le service KDC arrêté |

Pour réinitialiser le mot de passe de DC2 : arrêtez le service **Kerberos Key Distribution Center** sur DC2 (type de démarrage Manuel), videz ses tickets, exécutez la commande ci-dessous sur DC2, redémarrez DC2, puis remettez le KDC en Automatique.

```text
netdom resetpwd /s:DC1 /ud:CONTOSO\administrator /pd:*
```

> **Piège d'examen.** `Test-ComputerSecureChannel` donne de faux résultats sur les contrôleurs de domaine : utilisez-y `nltest` ou `netdom`. Rejoindre à nouveau le domaine est le dernier recours, pas la première étape.

<!-- section: key-points -->
## Points clés

- Corbeille : niveau fonctionnel 2008 R2, irréversible, maître d'attribution de noms de domaine, conserve les appartenances, seulement pour les objets supprimés après l'activation.
- Restauration de sauvegarde = DSRM + état du système, ne faisant pas autorité par défaut ; faisant autorité = `ntdsutil` avant le redémarrage.
- SYSVOL : un seul DC endommagé = ne faisant pas autorité ; faisant autorité = `msDFSR-Options` à 1 (ou `-authsysvol`) plus ne faisant pas autorité partout ailleurs.
- Réplication : 8524 = DNS, 1722 = chemin RPC, 8453 = autorisations, 8614 = durée de vie de désactivation ; restauration USN = événement 2095.
- Kerberos : 5 minutes, un SPN par compte, noms DNS. Canal sécurisé : `Test-ComputerSecureChannel -Repair` sur les membres, `nltest` ou `netdom` sur les DC.
