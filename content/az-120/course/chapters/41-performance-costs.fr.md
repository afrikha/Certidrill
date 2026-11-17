Un paysage SAP sur Azure n'est jamais terminé : l'utilisation évolue, de nouvelles séries de machines virtuelles apparaissent et les engagements expirent. Les questions d'AZ-120 sur ce groupe d'objectifs décrivent un symptôme (latence élevée entre niveaux, disque plafonné, machine virtuelle surdimensionnée, base HANA volumineuse, facture élevée) et demandent l'outil ou la modification qui le corrige au moindre coût ou effort.

<!-- section: advisor | objectives: 4.1.1 -->
## Recommandations Azure Advisor pour SAP

Azure Advisor donne des recommandations dans cinq catégories : **Coût**, **Sécurité**, **Fiabilité**, **Excellence opérationnelle** et **Performances**. Les recommandations génériques s'appliquent aux machines virtuelles SAP comme aux autres (redimensionner ou arrêter les machines virtuelles sous-utilisées, acheter des réservations ou des plans d'économies d'après l'historique d'utilisation).

Les recommandations propres à SAP viennent du **Centre Azure pour les solutions SAP**. Quand un système SAP est déployé avec lui ou inscrit comme Virtual Instance for SAP solutions (VIS), les contrôles qualité exécutent **plus de 100 vérifications** sur les ressources de la VIS, **toutes les heures**. Chaque écart par rapport aux bonnes pratiques SAP sur Azure devient une recommandation Advisor pour l'instance ASCS, d'application ou de base de données, avec l'action à mener.

| Catégorie de contrôle | Exemples |
| --- | --- |
| Infrastructure Azure | Mise en réseau accélérée, adresse IP publique sur les cartes réseau SAP, machines virtuelles sans Sauvegarde Azure |
| Paramètres du système d'exploitation | Paramètres généraux, paramètres pour les systèmes de fichiers Azure NetApp Files |
| Équilibreur de charge de haute disponibilité | Ports HA, adresse IP flottante, keep-alive avec un délai de 30 minutes maximum |
| Systèmes de fichiers de la base HANA | Disposition des systèmes de fichiers des volumes HANA |
| Configuration Pacemaker | Clusters HANA et ASCS sur SUSE et Red Hat |

Le classeur **Quality Insights** de la VIS (sous **Supervision**) présente trois onglets : **Advisor Recommendations**, **Virtual Machine**, **Configuration Checks**. Les recommandations sont actualisées toutes les heures : après une correction, attendez l'exécution suivante ; vous pouvez créer des alertes Advisor sur elles. Advisor masque pendant sept jours les recommandations des ressources supprimées : une VIS supprimée puis réinscrite peut mettre jusqu'à sept jours à les afficher de nouveau.

> **Piège d'examen.** Advisor n'exécute pas de contrôles propres à SAP sur une simple machine virtuelle. Le prérequis est une VIS : déployez le système avec le Centre Azure pour les solutions SAP ou inscrivez le système existant.

<!-- section: network-performance | objectives: 4.1.2 -->
## Analyser et optimiser les performances réseau

L'aller-retour entre les serveurs d'applications et le SGBD conditionne les temps de réponse SAP. Les règles :

| Règle | Détail |
| --- | --- |
| Aucune appliance virtuelle réseau entre application et SGBD | Une NVA peut doubler la latence, limiter le débit et faire échouer les clusters Pacemaker. Les règles NSG et ASG sont autorisées |
| Même réseau virtuel | Séparer les couches application et SGBD dans des réseaux virtuels appairés n'est pas pris en charge, et le trafic de peering est facturé. Utilisez des sous-réseaux d'un même réseau virtuel, ou des ASG |
| Mise en réseau accélérée | Sur toutes les cartes réseau de toutes les machines virtuelles SAP quand c'est techniquement possible |
| Plus de cartes réseau | N'ajoute pas de bande passante : toutes les cartes réseau d'une machine virtuelle partagent son quota réseau |
| NSG | Ne réduisent pas les performances ; appliquez-les au niveau du sous-réseau |
| Groupe de placement de proximité | Uniquement si le placement par défaut ne répond pas au besoin de latence ; un seul système SAP par groupe |

Mesurez avec l'outil SAP **`niping`** (notes SAP 500235 et 1100926), pas avec `ping`, qui ne suit pas le chemin de la mise en réseau accélérée. Pour choisir les zones, déployez le SKU de machine virtuelle de la base dans les trois zones, gardez les deux zones de plus faible latence, puis mesurez depuis des machines virtuelles d'application. Le mappage des zones diffère selon l'abonnement : les mesures ne valent que pour l'abonnement utilisé.

Traitez la classification à 0,7 ms de la note SAP 1100926 comme une indication approximative, pas comme une limite de prise en charge.

> **Piège d'examen.** Ajouter une deuxième carte réseau ou un pare-feu entre les niveaux n'améliore jamais la latence SAP. Les corrections sont la mise en réseau accélérée, le retrait de la NVA du chemin et, si besoin, un groupe de placement de proximité.

<!-- section: reservations-savings | objectives: 4.1.3 -->
## Plans d'économies ou réservations pour les machines virtuelles SAP

| | Réservation Azure (instances de machine virtuelle réservées) | Plan d'économies Azure pour le calcul |
| --- | --- | --- |
| Engagement | Une taille ou une famille d'instances dans une région | Une dépense horaire sur le calcul éligible, par exemple 5 USD par heure |
| Flexibilité | Ce service et cette région uniquement (flexibilité de taille d'instance dans la famille) | Toute région et tout service de calcul éligible, jusqu'à l'engagement horaire |
| Durée | 1 ou 3 ans | 1 ou 3 ans |
| Remise | La plus forte si elle est pleinement utilisée | Inférieure à celle des réservations |
| Idéal pour | Charges stables sans changement de type, de famille ou de région | Charges dynamiques ou évolutives, plusieurs familles, changements de région |
| Annulation ou remboursement | Possible dans la limite de 50 000 USD d'engagement annulé par période glissante de 12 mois | Impossible |

Mécanismes à connaître :

- Quand les deux s'appliquent, **les réservations sont appliquées en premier**, puis le plan d'économies. Chaque heure du plan d'économies est perdue si elle n'est pas utilisée, et s'applique d'abord à l'utilisation qui a la plus forte remise.
- Le paiement se fait en une fois ou mensuellement, pour le même coût total.
- Aucun ne couvre les logiciels : les plans d'économies pour le calcul ne couvrent ni les logiciels, ni le réseau, ni le stockage. Les licences Windows ou SQL Server peuvent être couvertes par Azure Hybrid Benefit. Les plans logiciels SUSE et Red Hat ne peuvent être ni échangés ni remboursés.
- Les échanges de réservations sont autorisés pendant une période de grâce « jusqu'à nouvel ordre ». Les réservations achetées après le 1er février 2027 ne seront plus échangeables quand le service est couvert par les plans d'économies. Aucuns frais de résiliation anticipée ne sont facturés aujourd'hui.
- Une réservation sous-utilisée peut être convertie en plan d'économies.

Séquence recommandée : redimensionner d'abord, échanger ou convertir les réservations sous-utilisées, puis acheter des réservations pour la base stable et un plan d'économies pour la partie variable.

> **Conseil d'examen.** Les machines virtuelles HANA et ASCS de production qui tournent 24 h/24 sur une taille fixe dans une région conviennent à une réservation de 3 ans. Des serveurs d'applications qui passeront à une nouvelle série pendant la durée conviennent à un plan d'économies. Pour une région de reprise inactive, préférez la réservation de capacité à un engagement de 1 ou 3 ans.

<!-- section: resize-vms | objectives: 4.1.4 -->
## Redimensionner les machines virtuelles Azure

Décidez avec les métriques avant de redimensionner :

| Signal | Signification | Action |
| --- | --- | --- |
| VM Uncached IOPS ou Bandwidth Consumed Percentage à 100 % | La limite de stockage de la machine virtuelle plafonne les E/S | Taille de machine virtuelle supérieure (ou série aux limites plus élevées) |
| Data Disk IOPS ou Bandwidth Consumed Percentage à 100 % | La limite du disque plafonne les E/S | Disque plus grand, entrelacement ou réglages SSD Premium v2 ; pas une machine virtuelle plus grande |
| Processeur et mémoire durablement faibles | Machine virtuelle surdimensionnée | Taille certifiée inférieure (recommandation Advisor de redimensionnement) |

Règles pour SAP :

- La taille cible doit être prise en charge pour SAP (note SAP 1928533) et, pour HANA, figurer dans le répertoire du matériel SAP HANA.
- Le redimensionnement redémarre la machine virtuelle. Si la nouvelle taille n'est pas disponible sur le cluster matériel actuel, toutes les machines virtuelles du groupe à haute disponibilité doivent être arrêtées et redimensionnées.
- On ne peut pas redimensionner directement entre une série avec disque temporaire et une série sans ; les machines virtuelles de génération 1 ne peuvent pas passer à des familles uniquement de génération 2 comme Mv2.
- Certaines familles ne peuvent pas partager un groupe de placement de proximité, ce qui peut bloquer un redimensionnement.

```bash
az vm list-vm-resize-options --resource-group rg-sap-prd --name vm-hana01 --output table
az vm resize --resource-group rg-sap-prd --name vm-hana01 --size Standard_M64ds_v2
```

> **Piège d'examen.** Un disque à 100 % d'IOPS consommées alors que la métrique non mise en cache de la machine virtuelle est basse ne se règle pas avec une machine virtuelle plus grande. Corrigez le disque.

<!-- section: storage-costs | objectives: 4.1.5 -->
## Optimiser les coûts de stockage

| Stockage | Modèle de coût et usage |
| --- | --- |
| HDD Standard | Uniquement pour les sauvegardes SAP ; aucune machine virtuelle active de développement, d'assurance qualité ou de production |
| SSD Standard | Minimum pour la non-production peu exigeante ; 500 IOPS par disque, pas de SLA d'IOPS |
| SSD Premium | Facturé par catégorie de taille (513 à 1 024 Gio coûtent pareil) ; performances liées à la taille ; bursting pour les disques de 512 Gio ou moins, jusqu'à 30 minutes |
| SSD Premium v2 | Facturé par Gio provisionné, inclut 3 000 IOPS et 125 Mo/s ; IOPS et débit supplémentaires facturés à part et réglés indépendamment ; certifié HANA sans Write Accelerator ; meilleur rapport prix/performances pour SAP |
| Disque Ultra | Capacité, IOPS et débit facturés séparément ; modifiés sans redémarrage de la machine virtuelle ; pour des E/S très fluctuantes |
| Azure NetApp Files | Pools de capacité à partir de 1 Tio par pas de 1 Tio ; la QoS manuelle découple le débit de la taille du volume ; volumes redimensionnés et débit modifié sans interruption |

Leviers d'optimisation :

- Entrelacez plusieurs petits SSD Premium au lieu d'un grand disque acheté seulement pour le débit : deux P15 atteignent 250 Mio/s pour 512 Gio, alors qu'un disque unique exige un P40 (2 Tio).
- Les disques managés ne peuvent pas être réduits ; les changements de taille, de niveau et de débit ont des délais de carence. Dimensionnez avec soin.
- Avec la QoS manuelle d'ANF, donnez du débit au volume de journaux sans payer de capacité inutilisée.
- Les instantanés de disques utilisés par Sauvegarde Azure sont incrémentiels et stockés sur HDD Standard.
- L'option **Change Storage Type to save costs** du connecteur SAP LaMa bascule les disques des systèmes arrêtés en stockage Standard.

> **Piège d'examen.** Write Accelerator sert aux volumes de journaux de la série M sur SSD Premium. Il n'est pas pris en charge sur SSD Premium v2 ni sur disque Ultra, qui n'en ont pas besoin.

<!-- section: archiving | objectives: 4.1.6 -->
## Optimiser la performance des données par l'archivage

Le coût de HANA dépend de la mémoire. Sortir des données de la mémoire réduit la taille de la machine virtuelle, des disques et la durée des sauvegardes.

| Température des données | Emplacement | Options |
| --- | --- | --- |
| Chaude | En mémoire | HANA standard |
| Tiède | Niveau de stockage HANA | Native Storage Extension (NSE) ; nœud d'extension ; dynamic tiering pour HANA natif |
| Froide | Stockage économique | SAP IQ (NLS pour BW, data aging) ; SAP Data Intelligence avec Azure Data Lake Storage ; archivage des données dans un magasin ILM |

| Option | Faits clés |
| --- | --- |
| NSE | HANA 2.0 SPS 04 ou ultérieur, toute machine virtuelle certifiée HANA, cache tampon de 10 % de la mémoire HANA par défaut, réversible, ne réduit pas la taille disque |
| Nœud d'extension | BW on HANA, BW/4HANA, HANA natif ; exige un scale-out ; aucune licence supplémentaire ; ni système d'exploitation, ni réseau, ni disque partagé avec les nœuds standard |
| SAP ILM Store sur Azure Blob | Fichiers d'archive et pièces jointes de S/4HANA dans Stockage Blob Azure |

Configurez le compte de stockage du magasin ILM comme le décrit Learn : inscrivez une application dans Microsoft Entra ID avec une clé secrète client, attribuez-lui **Storage Blob Data Contributor** sur le compte (et à personne d'autre), activez le transfert sécurisé, désactivez l'accès public aux objets blob et l'accès par clé de compte de stockage, TLS 1.2 minimum.

L'archivage retire de façon irréversible des données métier de la base ; NSE ne fait que déplacer les données. Commencez par caractériser les données, puis choisissez l'option selon le produit SAP : S/4HANA utilise NSE (tiède) et SAP IQ (froid) ; BW ajoute les nœuds d'extension et NLS.

> **Conseil d'examen.** « Réduire l'empreinte mémoire de S/4HANA sans supprimer de données » désigne NSE. « Réduire la taille de la base et conserver les fichiers d'archive pour la conformité » désigne l'archivage dans un magasin ILM sur Azure Blob.

<!-- section: app-db-optimization | objectives: 4.1.7 -->
## Optimiser les serveurs d'applications et les bases de données SAP

Niveau application :

- Faites un scale-out avec des machines virtuelles de serveurs d'applications plus nombreuses et plus petites plutôt qu'une grande ; répartissez les utilisateurs avec les groupes de connexion (transaction SMLG).
- Arrêtez les systèmes de non-production hors des heures de travail avec le Centre Azure pour les solutions SAP et libérez les machines virtuelles, pour que le calcul ne soit pas facturé.
- Utilisez un arrêt progressif (soft stop) pour que les appels RFC et HTTP équilibrés se terminent avant l'arrêt de l'instance.

```bash
az workloads sap-virtual-instance stop --resource-group rg-sap-qas --name QAS \
  --soft-stop-timeout-seconds 300 --deallocate-vm true
az workloads sap-virtual-instance start --resource-group rg-sap-qas --name QAS --start-vm true
```

Niveau base de données :

| Levier | Effet |
| --- | --- |
| Machine virtuelle certifiée bien dimensionnée | Adapter la mémoire au dimensionnement HANA après archivage ou NSE |
| SSD Premium v2 ou QoS manuelle d'ANF | Payer les IOPS et le débit dont la base a besoin, pas la capacité |
| Write Accelerator sur les disques de journaux de la série M | Respecte la latence des journaux HANA sur SSD Premium |
| Reprise d'activité optimisée en coût | Une machine virtuelle de reprise plus petite hébergeant l'assurance qualité, sans préchargement des données, redimensionnée au basculement |
| Azure Hybrid Benefit | Réutilise les licences Windows Server et SQL Server |
| Engagements | Réservations pour les machines virtuelles de base stables, plan d'économies pour les niveaux application changeants |

> **Piège d'examen.** Arrêter SAP depuis le Centre Azure pour les solutions SAP n'arrête pas la facturation sans libération des machines virtuelles. Sans `--deallocate-vm`, seule l'application SAP s'arrête.

<!-- section: key-points -->
## Points clés

- Les recommandations Advisor propres à SAP exigent une VIS ; les contrôles s'exécutent toutes les heures.
- Chemin direct entre application et SGBD : pas de NVA, même réseau virtuel, mise en réseau accélérée ; mesure avec `niping`.
- Réservations pour les tailles et régions stables, plans d'économies pour le changement ; les réservations s'appliquent en premier ; les plans d'économies ne sont pas remboursables.
- Lisez les métriques de pourcentage consommé de la machine virtuelle et des disques avant de redimensionner ; les tailles cibles doivent être certifiées SAP.
- SSD Premium v2 pour le rapport prix/performances ; les disques ne se réduisent pas ; Write Accelerator uniquement pour la série M sur SSD Premium.
- NSE déplace les données tièdes ; l'archivage dans un magasin ILM retire les données froides.
