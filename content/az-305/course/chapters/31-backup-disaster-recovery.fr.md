Toute question de récupération cache deux nombres : la quantité de données que l'entreprise accepte de perdre et la durée pendant laquelle elle accepte d'être à l'arrêt. Ils départagent une sauvegarde, un réplica et un service de basculement, et l'option la moins chère qui respecte les deux est la réponse.

<!-- section: recovery-objectives | objectives: 3.1.1 -->
## Objectifs de récupération et solution de récupération

L'**objectif de point de récupération (RPO)** est la perte de données maximale acceptable, mesurée en temps avant l'incident. L'**objectif de délai de récupération (RTO)** est le temps maximal acceptable pour remettre la charge de travail en service.

| Besoin | Solution | Ordre de grandeur |
| --- | --- | --- |
| Récupérer après une suppression, une corruption ou un rançongiciel ; conserver les données des mois ou des années | Sauvegarde Azure | RPO fixé par la fréquence de sauvegarde (souvent un jour), RTO fixé par le temps de restauration |
| Redémarrer des machines entières dans une autre région ou zone après un sinistre | Azure Site Recovery | RPO de quelques secondes à quelques minutes (réplication continue), RTO de quelques minutes |
| Aucune interruption quand un centre de données ou une zone tombe en panne | Haute disponibilité : zones et réplicas | RPO et RTO proches de zéro, dans une seule région |

> **Piège d'examen.** Site Recovery réplique aussi les corruptions et les suppressions, et conserve les points de récupération 15 jours au plus : il ne remplace pas une sauvegarde. Une sauvegarde restaurée dans une autre région respecte rarement un RTO de quelques minutes : elle ne remplace pas la reprise d'activité. Un scénario qui demande à la fois « conserver 7 ans » et « RTO de 30 minutes » a besoin des deux services.

**Azure Site Recovery** orchestre la réplication, le basculement et la restauration automatique :

| Scénario | Cible | À savoir |
| --- | --- | --- |
| Machines virtuelles Azure, de région à région | Une autre région Azure | Un compte de stockage de cache dans la région source ; les machines virtuelles ne sont créées dans la région cible qu'au basculement |
| Machines virtuelles Azure, de zone à zone | Une autre zone de disponibilité de la même région | Les données ne quittent jamais la région (résidence des données) ; réseau plus simple, mais aucune protection contre un sinistre touchant toute la région |
| Machines virtuelles VMware et serveurs physiques | Azure | Une appliance de réplication locale et le service Mobilité sur chaque machine |
| Machines virtuelles Hyper-V | Azure | Fournisseur Site Recovery et agent Recovery Services sur les hôtes Hyper-V ; rien n'est installé dans les machines virtuelles |

La réplication est continue pour les machines virtuelles Azure et VMware, et peut descendre à une fréquence de 30 secondes pour Hyper-V. Des points de récupération cohérents en cas d'incident sont créés toutes les 5 minutes ; les instantanés cohérents au niveau des applications sont facultatifs, à la fréquence fixée dans la stratégie de réplication. Microsoft s'engage sur un RTO d'une heure au plus et ne donne aucun contrat SLA pour le RPO.

Éléments de conception :

- Un **plan de récupération** regroupe des machines et ordonne le basculement d'une application multiniveau, avec des scripts, des actions manuelles et des runbooks Azure Automation.
- Un **test de basculement** réalise un exercice dans un réseau isolé sans perturber la réplication ni la production.
- Placez le coffre Recovery Services dans la région **cible**, pour que le basculement reste possible pendant que la région source est en panne.
- Après un basculement, reprotégez les machines pour répliquer dans le sens inverse, puis effectuez la restauration automatique.

| Exigence | Recommandation |
| --- | --- |
| Des machines virtuelles Azure doivent fonctionner dans une autre région en moins d'une heure, RPO de 15 minutes | Site Recovery, de région à région |
| Même besoin, mais les données ne doivent pas quitter la région | Site Recovery, de zone à zone |
| Des charges de travail VMware locales doivent basculer vers Azure, sans second centre de données | Site Recovery vers Azure |
| Une application à trois niveaux doit démarrer dans un ordre défini ; la récupération doit être prouvée sans interruption | Plan de récupération ; test de basculement |
| Restaurer un fichier supprimé il y a trois mois | Sauvegarde Azure |

<!-- section: compute-backup | objectives: 3.1.2 -->
## Sauvegarde et récupération des ressources de calcul

La charge de travail détermine le type de coffre :

| Coffre | Charges de travail |
| --- | --- |
| Coffre Recovery Services | Machines virtuelles Azure, SQL Server et SAP HANA dans des machines virtuelles Azure, Azure Files, machines locales avec l'agent MARS, Microsoft Azure Backup Server (MABS) ou DPM |
| Coffre de sauvegarde | Disques managés Azure, Stockage Blob Azure, Azure Data Lake Storage, Azure Database for PostgreSQL, Azure Kubernetes Service (AKS) |

**Machines virtuelles Azure.** Une extension de sauvegarde prend un instantané de tous les disques, puis transfère les blocs modifiés vers le coffre. Les instantanés sont cohérents au niveau des applications sous Windows (VSS) ; sous Linux, ils sont cohérents au niveau du système de fichiers, sauf si vous fournissez des scripts de pré-traitement et de post-traitement. L'instantané conservé à côté des disques permet une **restauration instantanée**, plus rapide qu'une restauration depuis le coffre. Vous pouvez restaurer une machine entière, ses disques ou des fichiers individuels.

| | Stratégie standard | Stratégie améliorée |
| --- | --- | --- |
| Fréquence | Une fois par jour (RPO jusqu'à 24 heures) | Plusieurs fois par jour, jusqu'à toutes les 4 heures |
| Instantanés de restauration instantanée | 1 à 5 jours (2 par défaut) | 1 à 30 jours (7 par défaut), redondants interzone |
| Ultra Disk, Premium SSD v2 | Non pris en charge | Pris en charge |
| Changement de type de stratégie | Peut passer à la stratégie améliorée | Ne peut pas revenir à la stratégie standard |

La **restauration interrégion (Cross Region Restore)** restaure dans la région jumelée à tout moment, pour des exercices ou pendant une panne. Elle exige un coffre géoredondant, et la région secondaire peut avoir jusqu'à 36 heures de retard.

| Exigence | Recommandation |
| --- | --- |
| RPO de 4 heures pour des machines virtuelles, ou disques Ultra Disk | Sauvegarde de machines virtuelles Azure, stratégie améliorée |
| Plusieurs sauvegardes par jour, cohérentes en cas d'incident, d'un disque de données ou d'un disque partagé, sans agent | Sauvegarde de disque Azure (coffre de sauvegarde ; instantanés incrémentiels conservés dans votre abonnement) |
| État du cluster et volumes persistants d'un cluster AKS | Sauvegarde AKS (extension de sauvegarde dans le cluster, coffre de sauvegarde) |
| Fichiers, dossiers et état du système de quelques serveurs Windows locaux | Agent MARS vers un coffre Recovery Services |
| Sauvegarde tenant compte des applications pour SQL Server local, ou des machines virtuelles Hyper-V ou VMware locales | MABS ou DPM : sauvegarde sur disque local, puis vers le coffre |
| Application App Service | Sauvegardes automatiques (toutes les heures, conservées 30 jours, rien à configurer) ; sauvegardes personnalisées vers votre compte de stockage pour une rétention plus longue ou une sauvegarde via un réseau virtuel |

**Protéger le coffre.** Trois paramètres répondent à un rançongiciel ou à un administrateur malveillant :

- La **suppression réversible** conserve les données de sauvegarde supprimées 14 jours par défaut, jusqu'à 180 jours ; les nouveaux coffres Recovery Services ne peuvent pas la désactiver.
- Un **coffre immuable** bloque les opérations qui feraient perdre des points de récupération (supprimer des données de sauvegarde, réduire la rétention). Son verrouillage est irréversible.
- L'**autorisation multi-utilisateur** protège les opérations critiques (désactiver la suppression réversible ou l'immuabilité, réduire la rétention) par un Resource Guard détenu par un autre administrateur, idéalement dans un autre abonnement ou un autre locataire.

Le stockage du coffre est géoredondant par défaut, ou bien localement redondant ou redondant interzone. Pour un coffre Recovery Services, choisissez avant de configurer la première sauvegarde.

> **Conseil d'examen.** « Les sauvegardes doivent rester dans la région » désigne un coffre redondant interzone ou localement redondant. « Restaurer dans une autre région pendant une panne régionale » désigne un coffre géoredondant avec la restauration interrégion. « Un administrateur de sauvegarde compromis ne doit pas pouvoir supprimer les sauvegardes » désigne l'autorisation multi-utilisateur et un coffre immuable verrouillé.

<!-- section: database-backup | objectives: 3.1.3 -->
## Sauvegarde et récupération des bases de données

**Azure SQL Database et SQL Managed Instance** se sauvegardent eux-mêmes : sauvegardes complètes chaque semaine, sauvegardes différentielles toutes les 12 ou 24 heures, sauvegardes du journal des transactions environ toutes les 10 minutes.

| Capacité | Ce qu'elle apporte |
| --- | --- |
| Restauration à un instant dans le passé | N'importe quel instant sur 1 à 35 jours (7 par défaut, 7 au plus au niveau Basic). Crée une nouvelle base de données ; restaure aussi une base de données supprimée |
| Conservation à long terme | Sauvegardes complètes hebdomadaires, mensuelles ou annuelles conservées jusqu'à 10 ans |
| Redondance du stockage de sauvegarde | Géoredondant par défaut ; localement redondant, redondant interzone ou géoredondant interzone |
| Géorestauration | Restaure la dernière sauvegarde géorépliquée dans n'importe quelle région. Exige un stockage de sauvegarde géoredondant |

Les sauvegardes seules donnent une récupération régionale lente. Comparez les objectifs :

| Option | RPO | RTO |
| --- | --- | --- |
| Configuration redondante interzone (haute disponibilité) | 0 | Généralement moins de 30 secondes |
| Géoréplication active ou groupe de basculement | Supérieur à 0 : les modifications pas encore répliquées | Généralement moins de 60 secondes |
| Géorestauration | Généralement des minutes ou des heures | Généralement des minutes ou des heures |

La **géoréplication active** se configure par base de données, autorise jusqu'à quatre secondaires lisibles et n'existe que pour SQL Database ; après un basculement, l'application se connecte à un autre serveur. Un **groupe de basculement** fait basculer ensemble un jeu de bases de données derrière des points de terminaison d'écouteur en lecture-écriture et en lecture seule qui ne changent pas ; c'est la seule option pour SQL Managed Instance.

> **Piège d'examen.** « Aucune modification de la chaîne de connexion après le basculement » ou « basculer d'un coup toutes les bases de données de l'application » désigne un groupe de basculement. « Une copie lisible dans une troisième région » ou « quatre secondaires » désigne la géoréplication active. La géorestauration est la protection régionale la moins chère, mais son RTO peut atteindre des heures.

**SQL Server sur machines virtuelles Azure** :

| Besoin | Option |
| --- | --- |
| Sauvegardes planifiées simples vers un compte de stockage, gérées par machine virtuelle | Sauvegarde automatisée (extension SQL IaaS Agent) |
| Gestion centralisée de nombreux serveurs, conservation à long terme, groupes de disponibilité Always On, RPO de 15 minutes | Sauvegarde Azure pour SQL Server dans des machines virtuelles Azure (coffre Recovery Services) |
| Contrôle total avec des scripts existants | Sauvegarde manuelle vers une URL ou vers des disques attachés |

**Bases de données open source et NoSQL.**

- Azure Database for PostgreSQL (serveur flexible) : sauvegardes conservées 7 à 35 jours (1 à 35 pour le serveur flexible MySQL), restauration à un instant dans le passé vers un nouveau serveur. La sauvegarde géoredondante ne peut être choisie qu'à la création ; une géorestauration a un RPO d'une heure au plus. Sauvegarde Azure ajoute la conservation à long terme jusqu'à 10 ans.
- Azure Cosmos DB : sauvegarde périodique par défaut, restaurée par une demande de support ; sauvegarde continue (7, 30 ou 35 jours) pour une restauration à un instant dans le passé en libre-service.

<!-- section: unstructured-backup | objectives: 3.1.4 -->
## Sauvegarde et récupération des données non structurées

**Objets blob.** Sauvegarde Azure propose deux modes, tous deux gérés depuis un coffre de sauvegarde :

| | Sauvegarde opérationnelle | Sauvegarde archivée (vaulted backup) |
| --- | --- | --- |
| Où sont les données | Restent dans le compte de stockage source | Copiées dans le coffre de sauvegarde |
| Comment | En continu : restauration à un instant dans le passé, contrôle de version, flux de modification et suppression réversible | Copies planifiées, conservées selon la stratégie |
| Restauration | À n'importe quel instant, dans le compte source uniquement | Dans le compte source ou dans un autre compte de stockage |
| Protège contre | La suppression accidentelle ou la corruption d'objets blob de blocs | Aussi la suppression de conteneurs ou du compte de stockage lui-même |
| Limites | Rétention jusqu'à 360 jours ; objets blob de blocs des comptes standard usage général v2 | Points de récupération uniquement aux heures planifiées |

**Azure Files.** La sauvegarde par instantané conserve des instantanés de partage dans le compte de stockage : restaurer un partage ou des fichiers isolés est rapide, mais les instantanés disparaissent avec le compte. La sauvegarde archivée transfère les données dans le coffre Recovery Services : une copie hors site qui survit à la perte du compte et peut être restaurée dans une autre région. Pour des serveurs de fichiers locaux, synchronisez-les avec Azure File Sync et sauvegardez le partage de fichiers Azure, ou utilisez l'agent MARS sur les serveurs.

Le **basculement du compte de stockage** est le mécanisme de récupération régionale des comptes géoredondants :

| Basculement | Quand | Conséquence |
| --- | --- | --- |
| Géré par le client, non planifié | La région primaire est en panne | Les écritures pas encore répliquées sont perdues (vérifiez l'Heure de la dernière synchronisation) ; le compte devient localement redondant dans la nouvelle région primaire |
| Géré par le client, planifié | Exercice ou événement anticipé, les deux régions disponibles | Aucune perte de données ; le compte reste géoredondant |
| Géré par Microsoft | Sinistre extrême, décidé par Microsoft | Ne fondez pas un plan de récupération dessus |

| Exigence | Recommandation |
| --- | --- |
| Annuler un écrasement massif d'objets blob de blocs survenu il y a deux heures | Sauvegarde opérationnelle (ou restauration à un instant dans le passé) |
| Récupérer des objets blob même si le compte de stockage est supprimé | Sauvegarde archivée |
| Continuer à lire les objets blob pendant une panne régionale, puis écrire à nouveau | RA-GRS ou RA-GZRS, puis basculement géré par le client |
| Une seconde copie utilisable des objets blob de blocs dans une région de votre choix | Réplication d'objets |

> **Piège d'examen.** Le stockage géoredondant n'est pas une sauvegarde : un objet blob supprimé ou chiffré l'est aussi dans la région secondaire. Et toute protection interne au compte (suppression réversible, contrôle de version, sauvegarde opérationnelle, instantanés) disparaît avec le compte de stockage ; seule une sauvegarde archivée ou une copie dans un autre compte en est indépendante.

<!-- section: key-points -->
## Points clés

- Le RPO est la perte de données, le RTO le temps d'arrêt. Sauvegarde Azure pour la rétention et la récupération après une suppression ou un rançongiciel ; Site Recovery pour le basculement de machines avec un RPO de quelques minutes ; les deux quand les deux besoins apparaissent.
- Site Recovery : de région à région, de zone à zone quand les données doivent rester dans la région, des machines locales vers Azure ; les plans de récupération ordonnent le basculement ; les tests de basculement ne perturbent pas la production.
- Coffre Recovery Services pour les machines virtuelles, les bases de données dans des machines virtuelles, Azure Files et les agents locaux ; coffre de sauvegarde pour les disques, les objets blob, PostgreSQL et AKS.
- Stratégie améliorée pour des sauvegardes toutes les 4 heures et les types de disques récents ; la restauration interrégion exige un coffre géoredondant ; suppression réversible, coffre immuable et autorisation multi-utilisateur protègent les sauvegardes.
- SQL Database : restauration à un instant dans le passé sur 1 à 35 jours, conservation à long terme jusqu'à 10 ans, géorestauration pour une récupération régionale lente et bon marché, groupes de basculement pour une récupération rapide avec des points de terminaison stables.
- Objets blob et fichiers : sauvegarde opérationnelle ou par instantané pour une récupération locale rapide, sauvegarde archivée contre la perte du compte ; géoredondance et basculement pour les pannes régionales, jamais comme sauvegarde.
