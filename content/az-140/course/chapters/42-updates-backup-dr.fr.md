Microsoft exploite le plan de contrôle d'Azure Virtual Desktop ; tout le reste est à vous de le mettre à jour, de le sauvegarder et de le récupérer : hôtes de session, profils FSLogix, applications, données utilisateur et identités. Azure Virtual Desktop n'a **aucune fonctionnalité native de reprise d'activité** : vous la construisez avec un second pool d'hôtes, FSLogix Cloud Cache, Azure Site Recovery, la réplication du stockage et Sauvegarde Azure. Les questions donnent un type de pool d'hôtes et un objectif de récupération, et demandent la conception qui correspond.

<!-- section: update-strategy | objectives: 4.2.1 -->
## Recommander une stratégie de mise à jour des hôtes de session

Deux stratégies existent :

| Stratégie | Comment | Convient à |
| --- | --- | --- |
| **Par l'image** (recommandée en regroupé) | Corriger l'image de référence (système, Microsoft 365 Apps, Teams, Edge, applications), publier une nouvelle version d'image, remplacer les hôtes de session | Pools d'hôtes regroupés : tous les hôtes identiques, pas de dérive, pas de correctifs pendant les heures de travail |
| **Sur place** | Les paramètres Windows Update for Business, Microsoft Intune, Configuration Manager ou un autre outil corrigent les machines virtuelles en marche | Pools d'hôtes personnels, dont les machines virtuelles portent l'état de l'utilisateur et ne peuvent pas être recréées |

La **mise à jour des hôtes de session** (session host update) applique pour vous les mises à jour par l'image, mais seulement dans un pool d'hôtes créé avec une **configuration d'hôte de session** (une option des pools regroupés choisie à la création ; elle ne peut pas être ajoutée ensuite). Vous modifiez la configuration d'hôte de session (image, taille de machine virtuelle, type de disque, type de sécurité, identifiants de jonction au domaine ou d'administrateur local, inscription Intune, script de configuration personnalisé), puis vous planifiez une mise à jour :

1. Un hôte de session est mis à jour en premier pour valider le processus, puis les autres par **lots** (*Max VMs removed during update*, 1 par défaut).
2. Pour chaque lot : les utilisateurs reçoivent le **message de déconnexion** et sont déconnectés après le **délai de déconnexion** (0 à 60 minutes, 2 par défaut), les hôtes sont drainés et retirés, de nouvelles machines virtuelles sont créées à partir de la nouvelle configuration avec les mêmes noms d'hôte, rejoignent l'annuaire et le pool d'hôtes, puis les anciennes machines sont supprimées.
3. Le réseau, la configuration de disponibilité et l'emplacement sont conservés ; les personnalisations manuelles (fichiers, clés de Registre, certificats) sont perdues : placez-les dans l'image, dans Intune, dans une stratégie de groupe ou dans le script personnalisé.

Règles à retenir : une seule mise à jour par pool d'hôtes à la fois ; impossible de mettre à jour un hôte isolé ; **désactivez la mise à l'échelle automatique** sur le pool d'hôtes pendant la mise à jour ; vérifiez les quotas de l'abonnement, car les nouvelles machines sont créées avant la suppression des anciennes ; l'agent Azure Monitor n'est pas réinstallé automatiquement sur les nouveaux hôtes (utilisez Azure Policy). Avec la **gestion standard**, la mise à jour des hôtes de session n'est pas disponible : vous reconstruisez les hôtes avec vos propres pipelines et un jeton d'inscription.

**Correctifs sur place en multisession avec Intune :** les anneaux de mise à jour Windows ne sont pas pris en charge sur Windows Entreprise multisession ; gérez les mises à jour qualité avec le **catalogue de paramètres** (paramètres *Windows Update for Business* comme les périodes de report et d'échéance).

| Exigence | Réponse |
| --- | --- |
| Corriger chaque mois un pool d'hôtes regroupé sans dérive de configuration et avec un effort d'administration minimal | Nouvelle version d'image + **mise à jour des hôtes de session** (pool d'hôtes avec configuration d'hôte de session) |
| Pool d'hôtes regroupé créé sans configuration d'hôte de session | Reconstruire les hôtes à partir de la nouvelle image avec vos outils ; drainer d'abord les anciens |
| Bureaux personnels avec des applications installées par les utilisateurs | Correctifs sur place (catalogue de paramètres Intune ou Configuration Manager) |
| Maintenance d'un hôte couvert par un plan de mise à l'échelle | Étiquette d'exclusion + mode drainage, puis correctifs |

> **Piège d'examen.** Lancer Windows Update sur chaque hôte regroupé est la mauvaise réponse quand la question insiste sur la cohérence : les hôtes dérivent, et le prochain hôte créé à partir de l'ancienne image n'est pas corrigé. Mettez à jour l'**image**.

<!-- section: disaster-recovery | objectives: 4.2.2 -->
## Planifier et implémenter la reprise d'activité après sinistre

| Pool d'hôtes | Mécanisme de reprise d'activité |
| --- | --- |
| **Regroupé** | Un **second pool d'hôtes** dans la région secondaire, construit à partir de la même image, avec les mêmes groupes d'applications ; profils répliqués par **FSLogix Cloud Cache** |
| **Personnel** | Réplication **Azure Site Recovery** de chaque machine virtuelle hôte de session (Azure vers Azure), avec des plans de récupération pour basculer de nombreuses machines ; pas de pool d'hôtes secondaire ni de Cloud Cache |

Les pools d'hôtes regroupés se conçoivent de deux façons :

| Modèle | Comportement | RPO / RTO indicatifs |
| --- | --- | --- |
| **Actif-actif** | Les deux pools d'hôtes servent les utilisateurs en permanence ; aucune action de basculement. Les utilisateurs voient les deux ressources : utilisez des espaces de travail séparés aux noms clairs, et gardez chaque utilisateur sur un seul pool d'hôtes à la fois | Secondes à minutes / quasi nul |
| **Actif-passif** | Pool secondaire avec peu d'hôtes en marche, étendu par la mise à l'échelle automatique au basculement. Un seul espace de travail ; le basculement est transparent pour les utilisateurs mais exige une action d'administration | Secondes à minutes / 15 à 60 minutes |
| Personnel avec Site Recovery | Machines virtuelles répliquées en continu | 5 à 15 minutes / quelques minutes par machine, plus la nouvelle jonction au domaine et les extensions |

**Basculement actif-passif :** retirez les attributions des groupes d'utilisateurs des groupes d'applications primaires (les utilisateurs connectés sont déconnectés), attribuez les groupes aux groupes d'applications secondaires, puis étendez les hôtes secondaires. La restauration automatique (failback) refait les étapes en sens inverse une fois la région primaire rétablie.

**Capacité.** Les machines virtuelles libérées, les quotas et les instances réservées ne garantissent pas que des machines pourront démarrer dans la région secondaire pendant une panne régionale : utilisez des **réservations de capacité à la demande** quand le démarrage doit être garanti.

**Site Recovery pour les bureaux personnels :** le basculement se déclenche manuellement (portail, API, PowerShell) ou de façon automatisée ; les machines basculées démarrent **non protégées** : **reprotégez-les** pour répliquer vers la région d'origine en vue de la restauration automatique. Les extensions ne sont pas répliquées : réappliquez les extensions personnalisées après le basculement.

**Tests.** Pour les pools d'hôtes regroupés, attribuez un groupe de test (par exemple `GRP-TEST`) aux groupes d'applications secondaires et basculez-le sans toucher à la production.

> **Piège d'examen.** N'utilisez pas le **basculement de test** de Site Recovery sur les hôtes de session Azure Virtual Desktop : la copie s'inscrit auprès du plan de contrôle et entre en conflit avec la machine d'origine. Démarrez les hôtes secondaires selon un planning et testez avec un groupe d'utilisateurs de test. Les hôtes secondaires doivent aussi être démarrés quelques heures au moins tous les 90 jours pour renouveler le jeton qui leur permet de joindre le service.

<!-- section: multi-region | objectives: 4.2.3 -->
## Planifier une implémentation multirégion

**Métadonnées du service.** Les pools d'hôtes, espaces de travail et groupes d'applications stockent leurs métadonnées dans un emplacement que vous choisissez, indépendant de la région des machines virtuelles. Avec les pools d'hôtes **géographiques** classiques, les métadonnées résident dans une base de données commune à toute la zone géographique ; les **pools d'hôtes régionaux** (préversion) les stockent par région, répliquées entre les zones de disponibilité et vers une région jumelée. Les objets géographiques et régionaux ne sont pas interopérables : les objets primaires et secondaires doivent utiliser la même étendue de déploiement.

Liste de contrôle pour une seconde région :

| Couche | Conception dans la région secondaire |
| --- | --- |
| Pool d'hôtes et applications | Second pool d'hôtes, ses propres groupes d'applications de bureau et RemoteApp, mêmes attributions par groupe |
| Images | Une galerie dans chaque région (ou la version d'image répliquée vers la région secondaire), plusieurs réplicas par région |
| Profils | FSLogix **Cloud Cache** avec deux `CCDLocations`, le stockage local placé **en premier** dans chaque région |
| Stockage | Au moins deux comptes de stockage par pool d'hôtes (profils, conteneurs Office), un de plus pour les packages App attach |
| AD DS | Au moins un contrôleur de domaine avec catalogue global et DNS dans la région secondaire ; un serveur Microsoft Entra Connect en mode intermédiaire (staging) dans cette région |
| Microsoft Entra Domain Services | Un **jeu de réplicas** dans la région secondaire |
| Supervision | Un espace de travail Log Analytics pour les deux régions, ou un par région si la primaire peut être perdue |
| Réseau | Un hub dans chaque région avec connectivité hybride, pare-feu et DNS ; testez la latence des utilisateurs vers la région secondaire |

```powershell
# Primary-region session hosts: primary storage first
New-ItemProperty -Path "HKLM:\SOFTWARE\FSLogix\Profiles" -Name CCDLocations -PropertyType MultiString -Value "type=smb,connectionString=\\stprofweu.file.core.windows.net\profiles;type=smb,connectionString=\\stprofneu.file.core.windows.net\profiles" -Force
# Secondary-region session hosts: same value, order reversed
New-ItemProperty -Path "HKLM:\SOFTWARE\FSLogix\Profiles" -Name CCDLocations -PropertyType MultiString -Value "type=smb,connectionString=\\stprofneu.file.core.windows.net\profiles;type=smb,connectionString=\\stprofweu.file.core.windows.net\profiles" -Force
```

Cloud Cache écrit dans un cache local et réplique vers chaque emplacement de façon asynchrone ; il bascule automatiquement quand le premier emplacement est injoignable. Configurez-le pour le conteneur de profil et, s'il est utilisé, pour le conteneur ODFC. Utilisez des disques SSD Premium pour le cache local, dimensionnés au moins pour le plus gros profil (partez de 30 Go par utilisateur simultané).

| Option de stockage des profils | Comportement entre régions |
| --- | --- |
| Azure Files, Premium | **Pas de GRS** : utilisez Cloud Cache entre régions, ZRS dans la région |
| Azure Files, Standard avec GRS | Possible seulement là où une paire de régions existe ; RPO/RTO plus élevés que Cloud Cache et restauration automatique plus difficile |
| Azure NetApp Files | Réplication entre régions, ou réplication entre zones, mais pas les deux sur un même volume ; le basculement n'est pas transparent |

> **Piège d'examen.** Les zones de disponibilité ne sont pas une reprise d'activité : elles protègent contre la panne d'un centre de données, pas contre une panne régionale. Répartissez les hôtes entre zones **et** prévoyez une seconde région quand l'exigence mentionne la panne d'une région.

<!-- section: backup-strategy | objectives: 4.2.4 -->
## Concevoir une stratégie de sauvegarde

Sauvegardez ce qui ne peut pas être reconstruit ; reconstruisez le reste :

| Composant | Stratégie |
| --- | --- |
| Conteneurs de profil FSLogix sur Azure Files | **Sauvegarde Azure** pour Azure Files (coffre Recovery Services) ; redondance du coffre ZRS ou GRS |
| Conteneurs ODFC | Souvent non sauvegardés : les données Outlook, OneDrive et Teams reviennent de Microsoft 365 ; s'ils sont sauvegardés, avec un intervalle plus long |
| Conteneurs FSLogix sur Azure NetApp Files | Stratégies de captures instantanées, plus la **sauvegarde Azure NetApp Files** pour les copies à long terme |
| Packages App attach | Sauvegardez le partage si les packages ne peuvent pas être facilement reconstruits |
| Bureaux personnels | **Sauvegarde Azure** des machines virtuelles quand des données utilisateur sont stockées localement (OneDrive avec le déplacement des dossiers connus réduit ce besoin) |
| Hôtes de session regroupés | Non sauvegardés : recréez-les à partir de l'image |
| Images | Azure Compute Gallery : réplicas dans plusieurs régions, stockage ZRS des réplicas, deux galeries dans des régions séparées |

Sauvegardez la région primaire ; un environnement de reprise d'activité n'a en général pas besoin de ses propres sauvegardes. Des comptes de stockage séparés pour les profils et pour les conteneurs Office permettent d'appliquer des stratégies de sauvegarde différentes.

| Niveau de sauvegarde Azure Files | Fonctionnement |
| --- | --- |
| **Capture instantanée** (snapshot) | Captures instantanées du partage conservées dans le compte de stockage lui-même ; restauration rapide de fichiers ou du partage entier ; aucune copie hors du compte |
| **Archivée** (vaulted, Vault-Standard) | Après chaque capture, les données modifiées sont copiées dans le coffre : copie hors site, protection contre les rançongiciels, restauration interrégion |

Limites : jusqu'à **24 captures planifiées par jour** et **200 points de récupération** par partage ; les points quotidiens sont conservés jusqu'à 200 jours, une rétention plus longue passe par des points hebdomadaires, mensuels et annuels. Activer la sauvegarde active aussi la **suppression réversible** au niveau du compte de stockage (14 jours) et pose un bail sur les captures de sauvegarde pour qu'elles ne puissent pas être supprimées par accident.

```bash
az backup vault create --resource-group rg-avd-bcdr --name rsv-avd-weu --location westeurope
az backup protection enable-for-azurefileshare --vault-name rsv-avd-weu --resource-group rg-avd-bcdr \
  --policy-name DailyProfiles --storage-account stprofweu --azure-file-share profiles
```

> **Conseil d'examen.** Le coffre de sauvegarde d'Azure Files ou des machines virtuelles se trouve dans la **même région** que le compte de stockage ou la machine protégés. Avec des profils dans deux régions par Cloud Cache : sauvegardez la copie primaire.

<!-- section: backup-restore | objectives: 4.2.5 -->
## Configurer la sauvegarde et la restauration des profils, des bureaux personnels et des images

**Profils FSLogix sur Azure Files.** Un profil est un fichier VHD(X) par utilisateur, dans un dossier du partage. Pour restaurer le profil d'un utilisateur :

1. Vérifiez que l'utilisateur est **déconnecté** partout (le VHDX est verrouillé tant qu'il est monté).
2. Dans le coffre, choisissez la **restauration au niveau de l'élément** (Item Level Restore) pour le partage, sélectionnez le point de récupération et le dossier ou le VHDX de l'utilisateur (jusqu'à 99 fichiers ou dossiers par restauration).
3. Restaurez à l'**emplacement d'origine** (en écrasant) pour revenir en arrière sur le profil, ou à un **autre emplacement** pour extraire des données en gardant le profil actuel.

La **restauration du partage complet** (Full Share Restore, à l'emplacement d'origine ou à un autre emplacement) sert pour un partage perdu ou endommagé. Les restaurations partent de la capture instantanée si elle existe, sinon du coffre.

**Profils FSLogix sur Azure NetApp Files** (jusqu'à 255 captures instantanées par volume) :

| Option de restauration | Effet |
| --- | --- |
| Restauration côté client | Copier le VHDX depuis le dossier de captures visible par les clients (visibilité du chemin des captures activée) |
| Restauration d'un fichier depuis une capture | Restaure le fichier sur place ou dans un nouveau fichier, presque instantanément |
| Restauration vers un nouveau volume | Clone la capture vers un nouveau volume, utilisable immédiatement |
| Rétablir le volume | Ramène tout le volume en arrière ; les données ultérieures et les captures plus récentes sont perdues, de façon irréversible |

**Bureaux personnels** avec Sauvegarde Azure (les hôtes de session avec lancement fiable (Trusted launch) exigent une stratégie de sauvegarde **Enhanced**) :

| Option de restauration | Utilisation |
| --- | --- |
| Remplacer l'existant (Replace existing) | Remet les disques du point de récupération sur la machine virtuelle existante, qui doit toujours exister |
| Créer (Create new) | Nouvelle machine virtuelle à partir du point de récupération |
| Restaurer les disques (Restore disks) | Les disques seulement, pour construire la machine vous-même |
| Récupération de fichiers (File recovery) | Monte le point de récupération pour copier des fichiers individuels |

**Images.** Azure Compute Gallery est régional : gardez les versions d'image répliquées vers chaque région d'utilisation (ou une galerie par région), utilisez des réplicas **Standard_ZRS** là où c'est possible, et au moins trois réplicas pour les images de production (un pour 20 machines virtuelles créées simultanément). Protégez-les contre la suppression avec des verrous de ressource, `allowDeletionOfReplicatedLocations` = `false` et `BlockDeletionBeforeEndOfLife`. Pour revenir en arrière après une image défectueuse, gardez la version précédente et réglez `excludeFromLatest` sur la version fautive.

> **Piège d'examen.** Restaurer un VHDX de profil pendant que l'utilisateur est toujours connecté échoue ou est écrasé à la déconnexion. Déconnectez d'abord l'utilisateur, et restaurez à un autre emplacement quand seuls quelques fichiers sont nécessaires.

<!-- section: key-points -->
## Points clés

- Regroupé : mettre à jour l'image, puis remplacer les hôtes ; la mise à jour des hôtes de session exige un pool d'hôtes créé avec une configuration d'hôte de session, désactivez la mise à l'échelle automatique pendant la mise à jour.
- Personnel : mises à jour sur place ; Intune en multisession utilise le catalogue de paramètres, pas les anneaux de mise à jour.
- Reprise d'activité : regroupé = pool d'hôtes secondaire + Cloud Cache (actif-actif ou actif-passif) ; personnel = Site Recovery, sans basculement de test.
- Multirégion : Cloud Cache avec le stockage local en premier, contrôleurs de domaine et serveur Entra Connect en mode intermédiaire dans la région secondaire, une galerie ou des réplicas par région ; les zones ne sont pas une reprise d'activité.
- Sauvegarde : sauvegarde Azure Files pour les profils (capture ou archivée, 200 points de récupération), captures et sauvegarde ANF, sauvegarde des machines virtuelles pour les bureaux personnels, hôtes regroupés reconstruits à partir de l'image.
- Restaurer un profil par restauration au niveau de l'élément, utilisateur déconnecté.
