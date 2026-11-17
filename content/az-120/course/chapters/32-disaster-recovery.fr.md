La haute disponibilité maintient un système SAP en service dans une région ; la reprise d'activité (DR) le relance dans une autre région après une panne étendue. Les questions d'AZ-120 donnent un RPO, un RTO, un budget et un paysage, puis demandent quelle méthode de réplication utilise chaque couche, ce qu'il faut préparer dans la région de reprise, quelle stratégie de sauvegarde répond à l'exigence et comment tester sans toucher à la production.

<!-- section: dr-design | objectives: 3.2.2 -->
## Concevoir la reprise d'activité avec des considérations régionales

Partez des objectifs métier : le **RTO** (durée d'indisponibilité acceptable) et le **RPO** (quantité de données validées que l'on peut perdre). Chaque technique donne un RPO différent, et Microsoft ne donne pas de valeurs génériques : on les déduit de la méthode de réplication.

| Choix de conception | Ce que dit Learn |
| --- | --- |
| Reprise de zone à zone | Reproduit une conception de reprise métropolitaine, mais peut ne pas suffire face à une catastrophe géographiquement étendue |
| Paire de régions | Chaque région a une région associée dans la même zone géographique (Brésil Sud fait exception). Les paires peuvent être **asymétriques** : les SKU de série M ou Azure NetApp Files peuvent manquer dans la région associée |
| Distance | La conformité peut imposer une distance minimale ; plus de distance signifie plus de latence et potentiellement un RPO plus élevé |
| Stockage GRS | S'applique aux comptes de stockage standard, qui ne conviennent pas aux SGBD SAP ni aux disques de données |
| Sauvegarde Azure | Réplique les sauvegardes uniquement entre régions associées |

Un modèle courant exécute la non-production dans la région de reprise et la sacrifie lors du basculement.

La capacité est l'autre contrainte régionale :

- Vérifiez que les SKU de machines virtuelles, Azure NetApp Files et Azure Files existent dans la région (et la zone) de reprise.
- Un abonnement de reprise distinct a ses propres quotas par famille de machines virtuelles.
- Site Recovery seul ne garantit pas la capacité de calcul. La **réservation de capacité à la demande** réserve de la capacité sans engagement de durée et s'intègre à Site Recovery pour garantir les basculements. Les réservations de 1 ou 3 ans sont en général peu rentables pour un site de reprise inactif.

> **Piège d'examen.** Les zones de disponibilité sont une réponse de haute disponibilité. Quand l'exigence mentionne une « catastrophe régionale » ou une « distance minimale », la réponse est une deuxième région, pas une deuxième zone.

<!-- section: site-recovery | objectives: 3.2.1 -->
## Azure Site Recovery et les couches SAP

Site Recovery réplique en continu les machines virtuelles et les disques managés vers la région cible via un compte de stockage de cache dans la région source. Il ne garantit pas la cohérence des bases de données et a des limites d'évolution des données (churn). Il protège donc la **couche application**, tandis que les bases de données utilisent la **réplication native**.

| Composant | Méthode de reprise |
| --- | --- |
| SAP Web Dispatcher (instances parallèles) | Site Recovery |
| Serveurs d'applications | Site Recovery, machine virtuelle par machine virtuelle ; leurs systèmes de fichiers partagés suivent la méthode du stockage |
| ASCS/SCS et ERS | Site Recovery pour les machines virtuelles et les disques, plus un travail manuel sur l'équilibreur de charge, Pacemaker, la clôture et NFS |
| SAP HANA | Réplication système HANA (HSR) |
| SQL Server / Oracle / Db2 / SAP ASE / MaxDB | Always On / Data Guard (FarSync) / HADR / ASE HADR Always On / base de données de secours |
| Contrôleurs de domaine Active Directory | Réplication Active Directory (un contrôleur de domaine actif dans la région de reprise) |
| NFS sur Azure NetApp Files | Réplication interrégion des volumes |
| NFS sur Azure Files | Script personnalisé (par exemple rsync) ; SMB sur Azure Files : Robocopy |
| Disque partagé Azure (cluster Windows) | Site Recovery avec disque partagé Azure |

Ce que Site Recovery ne fait pas pour un cluster de services centraux :

- Il **ne réplique pas l'équilibreur de charge Azure** : créez un équilibreur de charge interne dans la région de reprise à l'avance (pool principal vide) ou après le basculement.
- Il **ne réplique pas les montages NFS** : `/sapmnt` et les répertoires de transport ont besoin de leur propre réplication.
- La configuration Pacemaker est répliquée avec les disques mais ne fonctionne pas telle quelle ; reconfigurez-la.
- Gardez le même mécanisme de clôture dans les deux régions :

| Clôture | Action de reprise |
| --- | --- |
| SBD avec serveurs cibles iSCSI | Répliquer les machines virtuelles cibles iSCSI avec Site Recovery, redécouvrir le disque iSCSI sur les machines virtuelles de reprise |
| Agent de clôture Azure | Activer les identités managées sur les machines virtuelles de reprise, attribuer le rôle personnalisé, mettre à jour la ressource de l'agent de clôture |
| SBD sur disque partagé Azure | Créer un nouveau disque partagé dans la région de reprise et l'attacher après le basculement |

- Sous Windows, Site Recovery ne réplique pas le **témoin cloud** : déployez-en un dans la région de reprise.

Limites de prise en charge qui reviennent dans les questions :

| Élément | Prise en charge par Site Recovery |
| --- | --- |
| Write Accelerator | Non pris en charge pendant la protection : désactivez-le avant d'activer la réplication, réactivez-le manuellement après le basculement |
| SSD Premium v2 et disque Ultra | Pris en charge en source avec High Churn ; le disque réplica est un SSD Premium (`Premium_LRS`) ; mise en cache de l'hôte non prise en charge |
| Churn | Normal Churn jusqu'à 54 Mo/s par machine virtuelle ; configurations High Churn éligibles jusqu'à 500 Mo/s par machine virtuelle et 250 Mo/s par disque |
| Disques de système d'exploitation éphémères, groupes de sécurité d'application | Non pris en charge |

Un **plan de récupération** ordonne le basculement : les machines virtuelles sont regroupées (toutes dans le groupe 1 par défaut) et des scripts de pré-action ou de post-action s'exécutent entre les groupes, par exemple pour attacher un équilibreur de charge ou mettre à jour le DNS.

Pour SAP HANA entre régions, la latence exclut la HSR synchrone. Utilisez la HSR **asynchrone**, qui ne peut pas donner RPO=0 et dont le basculement est toujours manuel. Combinez-la avec la haute disponibilité intrarégion par réplication **multiniveau** (niveau 1 vers niveau 2 synchrone dans la région, niveau 3 asynchrone dans la région de reprise) ou **multicible** (HANA 2.0 SPS3 et ultérieur ; le site de reprise continue de répliquer pendant la maintenance du secondaire de haute disponibilité). Tous les niveaux utilisent le même mode d'opération, en pratique `logreplay`.

> **Piège d'examen.** « Utiliser Site Recovery pour la machine virtuelle HANA » est faux pour une base de production. Site Recovery sert au niveau application ; la HSR (ou la méthode native du SGBD) protège la base de données.

<!-- section: dr-network | objectives: 3.2.3 -->
## Configuration réseau pour la reprise d'activité

| Élément | Configuration de reprise |
| --- | --- |
| Connectivité locale | ExpressRoute géoredondant : un circuit vers la région primaire et un autre vers la région de reprise ; VPN site à site en secours |
| Réseau virtuel | Un réseau virtuel et des sous-réseaux distincts dans la région de reprise ; peering entre les réseaux virtuels des deux régions pour la HSR et la réplication des fichiers |
| Équilibreurs de charge, Application Gateway (WAF) | Créés séparément dans la région de reprise ; configuration du cluster ajustée |
| Résolution de noms | Mettre à jour le DNS après le basculement plutôt que reconfigurer les clients ; la région de reprise utilise une autre plage d'adresses IP |
| Services de base | Au moins un contrôleur de domaine et un serveur DNS exécutés dans Azure ; AD et DNS doivent fonctionner avant la récupération de SAP |

Le **mappage réseau** de Site Recovery relie les réseaux virtuels source et cible dans les deux sens. À l'activation de la réplication, il crée par défaut un réseau cible identique avec le suffixe `-asr`. Le sous-réseau cible est celui qui porte le même nom que le sous-réseau source, sinon le premier sous-réseau par ordre alphabétique.

| Règle d'adresse IP au basculement | Résultat |
| --- | --- |
| Carte réseau source statique ou DHCP | La carte réseau cible garde le même mode |
| Sous-réseau cible avec le même espace d'adressage | Adresse IP source réutilisée si elle est libre, sinon la prochaine adresse disponible |
| Sous-réseau cible avec un espace d'adressage différent | Prochaine adresse disponible du sous-réseau cible |

> **Conseil d'examen.** Les noms d'hôtes virtuels SAP sont résolus par le DNS. Un script de post-basculement dans le plan de récupération qui met à jour les enregistrements DNS est la réponse attendue, pas la modification de la configuration de chaque client.

<!-- section: backup-strategy | objectives: 3.2.4 -->
## Stratégie de sauvegarde pour répondre au contrat SLA

La sauvegarde et restauration est l'option de reprise la moins chère et celle dont le RTO est le plus élevé, car tout doit être restauré. Sauvegarde Azure stocke les données dans un **coffre Recovery Services** répliqué en LRS, ZRS ou GRS. Avec GRS et la **restauration interrégion** (CRR) activée, vous pouvez restaurer dans la région associée.

| Charge de travail | Sauvegarde Azure |
| --- | --- |
| Machines virtuelles Azure, disques managés (y compris partagés) | Pris en charge |
| SAP HANA dans des machines virtuelles Azure, SQL Server dans des machines virtuelles Azure, SAP ASE | Pris en charge |
| Oracle | Pris en charge via la sauvegarde de machine virtuelle avec des instantanés cohérents avec la base de données |
| IBM Db2 | Non pris en charge |
| Azure NetApp Files | Non pris en charge (utiliser les instantanés ANF, AzAcSnap, la sauvegarde ANF) |

Options pour SAP HANA :

| Méthode | Caractéristiques |
| --- | --- |
| Streaming Backint | Intégration Backint certifiée ; complète, différentielle, incrémentielle, journal ; restauration à un point dans le temps ; rétention à long terme |
| Instantané d'instance HANA | Instantanés de disques managés cohérents avec HANA, sauvegarde et restauration instantanées quelle que soit la taille ; journaux toujours envoyés en streaming |
| AzAcSnap | Instantanés ANF cohérents avec l'application pour HANA, Oracle, Db2, SQL Server ; exécuté depuis `cron` |

Chiffres à connaître : sauvegardes de journaux toutes les **15 minutes** au minimum ; taille de base jusqu'à **40 To** ; multistreaming jusqu'à **32 canaux** et 1,5 Go/s pour les sauvegardes de données de plus de 128 Go, sur des machines virtuelles d'au moins 16 processeurs virtuels et 128 Go de RAM (`parallel_data_backup_backint_channels`). La CRR pour HANA donne un RPO de **12 heures plus la fréquence des sauvegardes de journaux**.

> **Piège d'examen.** Un RPO de quelques minutes dans une autre région n'est pas atteint par la restauration interrégion. Il faut la HSR (ou la réplication du SGBD) vers la région de reprise.

<!-- section: backup-policies | objectives: 3.2.5 -->
## Stratégies pour les sauvegardes et les instantanés

Règles de la stratégie de streaming HANA :

- Sauvegarde complète : quotidienne ou hebdomadaire. Une complète quotidienne ne peut pas être combinée avec des sauvegardes différentielles.
- **Soit** différentielle, **soit** incrémentielle, pas les deux ; au plus une par jour, conservée 180 jours au maximum.
- La sauvegarde de journaux ne peut pas être désactivée (HANA la gère) et ne démarre qu'après une sauvegarde complète réussie.
- Rétention minimale pour tout type de sauvegarde : 7 jours. Une sauvegarde complète est conservée jusqu'à l'expiration de sa dernière sauvegarde dépendante ; les sauvegardes en suppression réversible sont conservées 14 jours de plus.

Stratégie d'instantané d'instance HANA : protégez d'abord chaque base avec une stratégie Backint **complètes hebdomadaires plus journaux uniquement** (ni différentielle ni incrémentielle) ; les instantanés sont **quotidiens** ; rétention de la restauration instantanée de 1 à 35 jours (2 par défaut). Sous-types : **Standard** (en disponibilité générale, sans HSR) et **Enhanced** (en préversion, requis pour la HSR, ajoute la rétention dans le coffre, l'immuabilité, la CRR).

Stratégie de machine virtuelle pour les serveurs d'applications :

| | Standard | Enhanced |
| --- | --- | --- |
| Fréquence | Quotidienne | Toutes les 4, 6, 8, 12 ou 24 heures |
| Rétention de la restauration instantanée | 1 à 5 jours | 1 à 30 jours |
| SSD Premium v2, disque Ultra | Non pris en charge | Pris en charge |
| Redondance des instantanés | LRS | ZRS pour les instantanés de restauration instantanée |

Une machine virtuelle protégée avec Enhanced ne peut pas repasser en Standard.

À grande échelle, Azure Policy déploie la sauvegarde des machines virtuelles avec des définitions intégrées `deployIfNotExists` comme « Configure backup on virtual machines without a given tag to an existing recovery services vault in the same location » (étiquette d'exclusion) et sa variante à étiquette d'inclusion. Elles ciblent un abonnement et un emplacement (pas un groupe d'administration) et un coffre dans le **même emplacement**. Les machines virtuelles existantes nécessitent une tâche de correction. La définition d'audit est « Azure Backup should be enabled for Virtual Machines ».

<!-- section: configure-validate | objectives: 3.2.6 -->
## Configurer et valider les sauvegardes et les instantanés

Pour la sauvegarde en streaming de HANA, dans l'ordre :

1. Créez le coffre Recovery Services dans la **même région** que les machines virtuelles.
2. Ouvrez l'accès sortant à Sauvegarde Azure, Stockage Azure et Microsoft Entra ID : points de terminaison privés, balises de service NSG `AzureBackup`, `Storage`, `AzureActiveDirectory`, ou balise FQDN `AzureBackup` du Pare-feu Azure (l'inspection TLS n'est pas prise en charge). Un proxy HTTP n'est pris en charge que pour le trafic Microsoft Entra.
3. Exécutez le **script de préinscription** en tant que root : il crée `AZUREWLBACKUPHANAUSER` (ou utilise un utilisateur personnalisé) et sa clé `hdbuserstore`. Sinon, la découverte échoue avec `UserErrorHanaScriptNotRun`.
4. Découvrez les bases (la machine virtuelle est inscrite et une extension installée), sélectionnez-les, attribuez la stratégie.

Pour les instantanés d'instance, autorisez aussi `AzureResourceManager` en sortie et attribuez les rôles :

| Rôle | Étendue | Attribué à |
| --- | --- | --- |
| Virtual Machine Contributor | Machine virtuelle source | Administrateur de sauvegarde |
| Disk Backup Reader | Groupe de ressources des disques source | Identité managée de la machine virtuelle |
| Disk Snapshot Contributor | Groupe de ressources des instantanés | Identité managée de la machine virtuelle, et Backup Management Service (attribué manuellement) |

L'instantané prend en charge les systèmes de fichiers `ext3` et `xfs`. Les instantanés sont incrémentiels, stockés sur HDD Standard dans le groupe de ressources choisi, et ne sont pas copiés dans le coffre.

Validez avec l'état de l'élément de sauvegarde : **Healthy**, **Unhealthy**, **NotReachable** (aucune synchronisation depuis plus de 2 heures) ou **IRPending** (première sauvegarde non effectuée). Sur ANF, un instantané cohérent avec l'application se prend avec :

```bash
azacsnap -c backup
```

<!-- section: backup-restore | objectives: 3.2.7 -->
## Effectuer une sauvegarde et une restauration

| Option de restauration HANA | Effet |
| --- | --- |
| Emplacement d'origine | Remplace la base source (non pris en charge pour la HSR) |
| Autre emplacement | Restaure vers une autre instance inscrite, conserve la source |
| Restaurer en tant que fichiers | Dépose les fichiers et les métadonnées dans un chemin (NFS, pas CIFS) pour un `RECOVER DATABASE` manuel n'importe où |

Choisissez **Logs (Point in Time)**, à la seconde près, ou des points de récupération **Full & Differential**. Règles : la cible est dans la **même région** et inscrite auprès du **même coffre** ; deux instances sur une même machine virtuelle ne peuvent pas être distinguées ; après la restauration de SYSTEMDB d'un système MDC, réexécutez le script de préinscription. Les bases HSR se restaurent en autonome : désactivez d'abord la HSR sur la cible. La restauration interabonnement ne fonctionne que pour les sauvegardes en streaming et ne peut pas être combinée avec la CRR. Rôles : Backup Operator sur le coffre, plus un accès en écriture sur les machines virtuelles source et cible.

Pour les machines virtuelles des serveurs d'applications, une restauration crée une nouvelle machine virtuelle, restaure des disques ou remplace les disques existants.

<!-- section: dr-testing | objectives: 3.2.8 -->
## Tester la reprise après sinistre

Testez, documentez et ajustez régulièrement le plan de reprise.

- **Site Recovery** : lancez un **Test de basculement** sur le plan de récupération, choisissez un point de récupération et un **réseau virtuel isolé, hors production** pour éviter les conflits d'adresses IP, validez, puis **Nettoyer le test de basculement**. La réplication de production continue.
- **HSR** : une prise de contrôle interrégion est manuelle. Même lors d'un exercice, vérifiez d'abord que toutes les données validées ont atteint le secondaire.
- **Azure NetApp Files** : le basculement est manuel ; rompre le peering de réplication rend accessible en écriture le volume de destination, en lecture seule jusque-là.
- Ordre de récupération : AD et DNS, base de données, services centraux, serveurs d'applications, Web Dispatcher.

```bash
# On the DR HANA node, as <sid>adm
hdbnsutil -sr_state
hdbnsutil -sr_takeover
```

> **Piège d'examen.** Un test de basculement dans le réseau virtuel de basculement, quand ce réseau est connecté à la production, crée des conflits d'adresses IP et de noms d'hôtes. Choisissez toujours un réseau isolé, hors production.

<!-- section: key-points -->
## Points clés

- Les zones relèvent de la haute disponibilité ; une catastrophe régionale exige une deuxième région, vérifiée pour les SKU, ANF et les quotas.
- Site Recovery pour les machines virtuelles d'application, ASCS et Web Dispatcher ; HSR ou réplication du SGBD pour les bases de données.
- Site Recovery ne réplique ni les équilibreurs de charge, ni les montages NFS, ni le témoin cloud ; Write Accelerator doit être désactivé.
- La réservation de capacité, pas une réservation, garantit le calcul de reprise.
- Stratégie HANA : différentielle ou incrémentielle, journaux toutes les 15 minutes au minimum ; les instantanés exigent complète hebdomadaire plus journaux.
- Le test de basculement cible toujours un réseau virtuel isolé.
