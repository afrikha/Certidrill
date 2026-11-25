La haute disponibilité maintient une charge de travail en service malgré la panne d'un serveur, d'un centre de données ou d'une zone, sans restauration. Les questions d'examen énoncent une panne à surmonter, un SLA, un RPO ou un RTO et une contrainte de coût, et demandent l'option de redondance la moins chère qui les respecte.

<!-- section: ha-principles | objectives: 3.2.1, 3.2.2, 3.2.3 -->
## Lire l'exigence : à quelle panne faut-il survivre

La haute disponibilité (HA) est une redondance qui prend le relais automatiquement, le plus souvent dans une seule région, avec peu ou pas de perte de données. La reprise d'activité (DR) redémarre la charge de travail dans une autre région, avec une perte de données (RPO, objectif de point de récupération) et une interruption (RTO, objectif de temps de récupération) mesurées. La sauvegarde protège contre la suppression et la corruption, que la réplication recopie fidèlement : ce n'est jamais une réponse de disponibilité.

| Panne énoncée dans la question | Étendue de la réponse | Options typiques |
| --- | --- | --- |
| Un serveur, un rack, une mise à jour planifiée de l'hôte | Dans un centre de données | Groupe à haute disponibilité, plusieurs instances, LRS, réplicas intégrés d'un niveau PaaS |
| Un centre de données ou une zone de disponibilité | Entre les zones d'une région | Zones de disponibilité, niveaux redondants interzones, ZRS |
| Une région entière | Entre régions | Géoréplication, groupes de basculement, GRS ou GZRS, Azure Site Recovery, un équilibreur de charge mondial |

Les zones de disponibilité sont des emplacements physiquement séparés d'une région, chacun avec son alimentation, son refroidissement et son réseau. Une ressource **zonale** est épinglée à une zone que vous choisissez : elle ne survit à la panne d'une zone que si vous déployez d'autres instances dans d'autres zones. Une ressource **redondante interzone** est répartie ou répliquée entre les zones par la plateforme (ZRS, une base de données redondante interzone). Une ressource **régionale** (non zonale) n'a pas de zone : Azure la place n'importe où, sans garantie.

Les composants en série multiplient leurs SLA : un niveau web à 99,95 % devant une base de données à 99,99 % donne environ 99,94 %, moins que chaque partie.

> **Piège d'examen.** Une conception redondante interzone ne survit pas à une panne régionale. « Panne d'un centre de données » signifie zones ; « panne régionale » signifie une deuxième région.

> **Conseil d'examen.** La réplication synchrone (entre zones) donne un RPO de zéro ; la réplication asynchrone (entre régions) donne toujours un RPO supérieur à zéro.

<!-- section: compute-vms | objectives: 3.2.1 -->
## Haute disponibilité des machines virtuelles

Une machine virtuelle unique est un point de défaillance unique. Les options, par ordre croissant de protection :

| Option | Protège contre | À savoir |
| --- | --- | --- |
| Groupe à haute disponibilité | Panne d'un rack et mises à jour planifiées de l'hôte, dans un seul centre de données | Jusqu'à 3 domaines d'erreur et 20 domaines de mise à jour, fixés à la création ; SLA de 99,95 % pour deux machines virtuelles ou plus ; sans surcoût ; pour les régions sans zones |
| Zones de disponibilité | Panne d'un centre de données | Deux machines virtuelles ou plus dans deux zones ou plus : SLA de 99,99 % ; une machine virtuelle zonale ne peut pas changer de zone, elle est redéployée |
| Groupes de machines virtuelles identiques | Idem, plus la mise à l'échelle automatique | Le mode d'orchestration Flexible est recommandé ; un groupe réparti sur plusieurs zones équilibre les instances entre les zones |
| Azure Site Recovery | Panne d'une région, ou d'une zone avec la réplication de zone à zone | Réplication asynchrone vers n'importe quelle région secondaire ; une réponse de DR avec un RTO, pas de HA |

Des machines redondantes ont aussi besoin :

- **D'un équilibreur de charge.** Standard Load Balancer (couche 4) ou Application Gateway v2 (couche 7) cessent d'envoyer le trafic à une instance défaillante. Un frontal redondant interzone garde la même adresse IP pendant la panne d'une zone.
- **De disques résilients.** Les disques managés ne prennent en charge que LRS et ZRS. Un disque ZRS peut être attaché à une machine virtuelle d'une autre zone quand sa zone tombe ; Ultra Disk ne prend en charge que LRS.
- **D'un état répliqué.** Deux machines virtuelles qui détiennent chacune une copie locale des données ne sont hautement disponibles que si l'application les réplique.

Une réservation de capacité à la demande garantit qu'une taille de machine virtuelle est disponible quand un basculement ou un scale-out en a besoin. Un groupe de placement de proximité réduit la latence ; il n'ajoute aucune disponibilité.

> **Piège d'examen.** « L'application doit rester disponible si un centre de données tombe » exclut le groupe à haute disponibilité, dont les machines partagent un seul centre de données. « La région n'a pas de zones de disponibilité » fait du groupe à haute disponibilité la réponse.

<!-- section: compute-paas | objectives: 3.2.1 -->
## Haute disponibilité d'App Service, des conteneurs et de plusieurs régions

Les services de plateforme remplacent eux-mêmes les instances défaillantes. Les questions de conception portent sur les zones et sur une deuxième région.

| Service | Résilience aux zones | À savoir |
| --- | --- | --- |
| App Service | Plan App Service redondant interzone | Plans Premium v2 à Premium v4 ; au moins deux instances ; pas de compteur séparé, vous payez les instances |
| Azure Kubernetes Service | Pools de nœuds répartis entre les zones | Le plan de contrôle est résilient aux zones par défaut ; les zones se choisissent à la création d'un pool de nœuds ; exécutez plusieurs réplicas de pod et utilisez des disques ZRS pour l'état |
| Niveau tarifaire AKS | SLA de durée de fonctionnement du serveur d'API | Free : pas de SLA financièrement garanti ; Standard et Premium : 99,95 % avec zones, 99,9 % sans |
| Service Bus, Azure Container Registry | Redondants interzones par défaut là où les zones existent | Aucune configuration, dans tous les niveaux, sans surcoût |

App Service et AKS sont régionaux : une panne régionale arrête toutes les instances. Une conception multirégion déploie l'application dans deux régions, réplique les données et ajoute un point d'entrée mondial : **Azure Front Door** pour HTTP et HTTPS (basculement rapide, déchargement TLS, mise en cache, pare-feu d'applications web), **Traffic Manager** pour tout protocole via DNS (le basculement est plus lent car les clients mettent en cache les réponses DNS), ou le **niveau mondial de Standard Load Balancer** pour TCP et UDP derrière une seule adresse IP anycast.

L'actif-actif (les deux régions servent le trafic) donne le RTO le plus bas au prix de deux déploiements complets. L'actif-passif garde la deuxième région réduite ou non déployée : moins cher, avec un RTO plus long.

> **Piège d'examen.** Passer à trois instances n'est pas de la redondance de zone : les instances d'un plan qui n'est pas redondant interzone peuvent partager une seule zone.

<!-- section: relational | objectives: 3.2.2 -->
## Haute disponibilité des données relationnelles

Tous les niveaux d'Azure SQL Database sont localement redondants. L'architecture du niveau décide du reste :

| Niveau de service | Architecture | Redondance de zone |
| --- | --- | --- |
| Basic, Standard (DTU) | Stockage distant, un nœud de calcul | Non prise en charge |
| General Purpose (vCore), provisionné ou serverless | Stockage distant, calcul sans état | Prise en charge |
| Premium (DTU), Business Critical (vCore) | Stockage SSD local, un réplica principal et jusqu'à trois réplicas secondaires | Prise en charge sans surcoût ; Business Critical inclut un réplica lisible (lecture à grande échelle, read scale-out) sans frais supplémentaires |
| Hyperscale | Calcul distribué, serveurs de pages et service de journal | Prise en charge, choisie uniquement à la création de la base ; exige un réplica à haute disponibilité et un stockage de sauvegarde redondant interzone |

Une base de données redondante interzone bascule avec un RPO de zéro et un RTO généralement inférieur à 30 secondes. Pour une panne régionale :

| Mécanisme | Étendue | Basculement et points de terminaison |
| --- | --- | --- |
| Géoréplication active | Une base de données ; jusqu'à quatre géosecondaires lisibles, dans la même région ou une autre ; SQL Database uniquement | Lancé par vous ou par l'application ; la chaîne de connexion change |
| Groupe de basculement | Un groupe de bases de données d'un serveur logique, ou toutes les bases utilisateur d'une instance managée ; le secondaire est dans une autre région | Géré par le client (recommandé) ou géré par Microsoft après une période de grâce d'au moins une heure ; un point de terminaison d'écouteur en lecture-écriture et un en lecture seule restent les mêmes |
| Géorestauration | Sauvegardes géoredondantes | Restauration manuelle vers un nouveau serveur ; de quelques minutes à plusieurs heures d'interruption et de perte de données |

La géoréplication et les groupes de basculement sont asynchrones : RPO supérieur à zéro, RTO généralement inférieur à 60 secondes. SQL Managed Instance prend en charge la redondance de zone (General Purpose, Next-gen General Purpose, Business Critical ; Next-gen General Purpose exige Elastic SAN ZRS et n'est donc pas disponible dans certaines régions) et uniquement les groupes de basculement : un seul groupe par instance, les deux instances dans la même zone DNS, et un secondaire désigné comme réplica de secours réservé à la DR ne paie pas de licence SQL Server (son calcul et son stockage restent facturés).

SQL Server sur Machines virtuelles Azure n'a pas de HA intégrée. Un **groupe de disponibilité Always On** protège des bases de données (HA dans la région, DR avec un réplica asynchrone ailleurs, secondaires lisibles) ; une **instance de cluster de basculement** protège toute l'instance sur un stockage partagé (disques partagés Azure, partages de fichiers Premium, Storage Spaces Direct). Répartissez les machines virtuelles entre les zones (99,99 %) ou dans un groupe à haute disponibilité (99,95 %).

Les serveurs flexibles Azure Database pour PostgreSQL et MySQL utilisent un serveur de secours qui ne sert pas de trafic, prend le relais automatiquement et est facturé comme le serveur principal :

| Configuration | Emplacement du serveur de secours | SLA PostgreSQL |
| --- | --- | --- |
| Sans haute disponibilité | Aucun | 99,9 % |
| HA dans la même zone (localement redondante pour MySQL) | Zone du serveur principal | 99,95 % |
| HA redondante interzone | Autre zone ; basculement généralement en 60 à 120 secondes | 99,99 % |

La HA n'est pas disponible dans le niveau Burstable. Les réplicas en lecture sont asynchrones et promus manuellement : ils répondent à « une autre région » et à « mettre à l'échelle les lectures », pas à la HA.

> **Piège d'examen.** « La chaîne de connexion ne doit pas changer après un basculement » désigne un groupe de basculement. « Un secondaire lisible dans la même région » ou « plusieurs secondaires » désigne la géoréplication active.

> **Conseil d'examen.** Pour décharger les rapports d'une base Business Critical sans surcoût, utilisez son réplica de lecture à grande échelle (`ApplicationIntent=ReadOnly`), pas un géosecondaire.

<!-- section: nonrelational | objectives: 3.2.3 -->
## Haute disponibilité des données semi-structurées et non structurées

Le Stockage Azure conserve toujours plusieurs copies ; l'option de redondance décide où.

| Option | Copies | Durabilité sur un an | Survit à |
| --- | --- | --- | --- |
| LRS | Synchrones, dans un centre de données | 11 neuf | La panne d'un nœud ou d'un rack |
| ZRS | Synchrones, sur trois zones ou plus | 12 neuf | La panne d'une zone |
| GRS | LRS, puis asynchrone vers une région secondaire | 16 neuf | Une panne régionale, après un basculement |
| GZRS | ZRS, puis asynchrone vers une région secondaire | 16 neuf | La panne d'une zone, et une panne régionale après un basculement |
| RA-GRS, RA-GZRS | Comme GRS et GZRS | 16 neuf | Idem, et le secondaire est lisible à tout moment |

Les options avec accès en lecture exposent le point de terminaison `<account>-secondary` et font passer le SLA de lecture du niveau chaud (Hot) de 99,9 % à 99,99 %. La propriété Heure de la dernière synchronisation (Last Sync Time) indique la quantité de données qu'un basculement perdrait ; la réplication prioritaire géographique (geo priority replication), une option des comptes GRS et GZRS facturée depuis le 1er janvier 2026, a un SLA selon lequel l'Heure de la dernière synchronisation des objets blob de blocs a 15 minutes de retard au plus pendant 99 % du mois de facturation (un basculement non planifié la désactive).

| Basculement | Quand | Résultat |
| --- | --- | --- |
| Planifié, géré par le client | Les deux régions sont disponibles : test de DR, déplacement proactif | Aucune perte de données attendue ; le compte reste géoredondant |
| Non planifié, géré par le client | Points de terminaison principaux indisponibles | Les écritures postérieures à l'heure de la dernière synchronisation sont perdues ; le compte devient LRS dans la nouvelle région primaire |
| Géré par Microsoft | Sinistre grave d'une région | Hors de votre contrôle ; ne concevez pas dessus |

Un basculement met à jour les entrées DNS, donc les URL ne changent pas. Limites à connaître : les objets blob de blocs Premium et les partages de fichiers SSD ne prennent en charge que LRS et ZRS ; les partages de fichiers HDD d'Azure Files ajoutent GRS et GZRS, sans accès en lecture au secondaire ; le niveau archive (Archive) n'existe qu'avec LRS, GRS et RA-GRS ; les disques managés prennent en charge LRS et ZRS.

Azure Cosmos DB combine la redondance de zone, activée par région, avec la réplication vers d'autres régions :

| Configuration | Panne de la région d'écriture |
| --- | --- |
| Une seule région | Indisponible ; la redondance de zone ne couvre que la panne d'une zone |
| Plusieurs régions, une région d'écriture | Les lectures continuent ; les écritures reprennent après un basculement géré par le service ou forcé |
| Plusieurs régions d'écriture | Aucune interruption attendue ; la cohérence forte n'est pas prise en charge |

Le niveau de cohérence fixe le RPO d'un compte multirégion : zéro en cohérence forte (strong), la fenêtre d'obsolescence en obsolescence limitée (bounded staleness), moins de 15 minutes en session, préfixe cohérent (consistent prefix) et cohérence éventuelle (eventual).

> **Piège d'examen.** RA-GRS donne un accès en lecture au secondaire, jamais en écriture. Pour continuer à écrire pendant une panne régionale, il faut un basculement de compte, ou les écritures multirégions d'Azure Cosmos DB.

> **Conseil d'examen.** « Survivre à la panne d'une zone et à une panne régionale au moindre coût » désigne GZRS ; ajoutez « lire pendant la panne sans basculement » et c'est RA-GZRS.

<!-- section: key-points -->
## Points clés

- Serveur ou rack : groupe à haute disponibilité. Centre de données : zones, niveaux redondants interzones, ZRS. Région : une deuxième région, de la réplication et un point d'entrée mondial.
- Groupe à haute disponibilité : 99,95 %, dans un seul centre de données ; deux machines virtuelles ou plus entre zones : 99,99 %.
- La redondance de zone d'App Service exige Premium v2 ou supérieur et deux instances ; AKS exige des zones sur les pools de nœuds et le niveau Standard pour un SLA.
- Azure SQL : pas de redondance de zone en Basic et Standard ; Business Critical a un réplica lisible gratuit ; Hyperscale décide à la création.
- Groupe de basculement : points de terminaison stables, seule option géographique pour SQL Managed Instance. Géoréplication active : par base de données, jusqu'à quatre secondaires lisibles.
- Serveurs flexibles PostgreSQL et MySQL : serveur de secours dans une autre zone, pas en Burstable ; réplicas en lecture pour les autres régions.
- Stockage : ZRS pour une zone, GRS pour une région, GZRS pour les deux, RA- pour lire le secondaire. Un basculement non planifié laisse le compte en LRS.
- Cosmos DB : plusieurs régions d'écriture pour la disponibilité la plus élevée ; le niveau de cohérence fixe le RPO.
