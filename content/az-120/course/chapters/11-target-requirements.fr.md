Avant tout déploiement, une migration SAP vers Azure est une liste de décisions : taille cible, combinaison prise en charge, calcul, stockage et réseau, abonnements et quotas, licences, coût, contrat de support, puis chemin et outils de migration. Les questions donnent un paysage source et une contrainte (SAPS, mémoire, interruption, OS, base de données, budget) et demandent quelle option convient.

<!-- section: sizing | objectives: 1.1.1 -->
## Estimer la taille cible

Le dimensionnement SAP s'exprime en **SAPS** (SAP Application Performance Standard), l'unité des SAP Standard Application Benchmarks. Les machines virtuelles Azure certifiées ont une valeur SAPS publiée et ne surallouent ni le processeur ni la mémoire.

| Situation | Source du dimensionnement |
| --- | --- |
| Nouveau système (greenfield) | Un projet **SAP Quick Sizer** fondé sur les volumes de documents métier ; son résultat est ensuite traduit en calcul, stockage et réseau Azure |
| Système existant (brownfield) | La charge actuelle : rapports SAP EarlyWatch Alert et rapports de charge du SGBD, mesures de processeur, d'IOPS et de débit, SAPS du matériel actuel tirés des benchmarks SAP |
| Aucune des deux n'est fiable | Une preuve de concept sur Azure |
| Déploiement S/4HANA guidé | Le Centre Azure pour les solutions SAP propose des tailles de machines virtuelles à partir des SAPS et de la mémoire saisis |

1. Partez de la mémoire et du processeur, et répartissez les SAPS entre une part **base de données** et une part **application**.
2. Dimensionnez d'abord la **machine virtuelle de base de données** : la couche base de données n'évolue pas horizontalement, la couche application ajoute des serveurs d'applications.
3. Pour SAP HANA, la mémoire est la dimension principale.
4. Mesurez les IOPS et le débit du SGBD source pour dimensionner le stockage, pas seulement la capacité.
5. Associez le résultat à une machine virtuelle : les SAPS par taille viennent de la **note SAP 1928533** ; les tailles pour HANA, du **répertoire matériel SAP HANA** (Certified IaaS Platforms).

> **Piège d'examen.** Les SAPS des machines virtuelles sont publiés par SAP dans la note SAP 1928533, pas dans la documentation Azure. Une taille absente de cette note n'est pas prise en charge pour SAP, quels que soient ses vCPU et sa mémoire.

<!-- section: supported-scenarios | objectives: 1.1.2 -->
## Les scénarios pris en charge

Microsoft ne prend en charge que les architectures SAP qu'il documente, avec la note SAP 1928533 (produits, types de machines virtuelles, versions minimales de l'OS et du SGBD) ; la **SAP Product Availability Matrix (PAM)** confirme l'OS et le SGBD d'une version SAP. Azure est uniquement x86-64 : les charges de travail AIX, HP-UX, Solaris, IBM i ou mainframe passent à Windows Server, SUSE, Red Hat ou Oracle Linux.

| Scénario | Statut |
| --- | --- |
| 2 niveaux (SGBD et application sur une seule machine virtuelle) | Pris en charge ; pas de cluster de basculement à haute disponibilité dans cette disposition ; plafonner la mémoire du SGBD et de SAP |
| 3 niveaux (application et SGBD sur des machines virtuelles distinctes) | Pris en charge pour SQL Server, Oracle, Db2, SAP HANA, MaxDB et SAP ASE sous Windows, SUSE, Red Hat et Oracle Linux |
| Plusieurs instances de SGBD sur une machine virtuelle (y compris HANA MCOS) | Pris en charge avec mémoire plafonnée et disques distincts ; jamais dans un cluster à haute disponibilité |
| HANA scale-out | Uniquement sur les machines virtuelles marquées pour le clustering dans le répertoire matériel HANA ; avec un nœud de secours, uniquement NFS sur Azure NetApp Files |
| Reprise d'activité | Une autre région Azure ; réplication native **asynchrone** du SGBD pour la base de données, Azure Site Recovery possible pour la seule couche application |
| Oracle | OS invité Windows ou Oracle Linux uniquement ; Oracle RAC non pris en charge |
| HANA Large Instances | En fin de vie : pas de nouveaux clients ; utiliser des machines virtuelles certifiées HANA |
| Azure VMware Solution | En général non pris en charge par SAP pour les charges de travail SAP |

Explicitement **non pris en charge** :

- Niveaux application et SGBD dans des régions différentes, partagés entre le local et Azure, ou répartis entre deux fournisseurs cloud.
- Une appliance virtuelle réseau sur le chemin entre les serveurs d'applications et le SGBD.
- Des partages SMB pour les fichiers du SGBD ; NFS pour les fichiers du SGBD, sauf NFS 4.1 sur Azure NetApp Files pour SAP HANA, Oracle sur Oracle Linux et Db2 sur SUSE ou Red Hat.
- Azure Site Recovery pour les machines virtuelles du SGBD.
- Pacemaker sur Oracle Linux ; les frameworks de haute disponibilité autres que Pacemaker et le clustering de basculement Windows Server exigent le support de leur éditeur.
- Microsoft Entra ID comme domaine de SAP NetWeaver ou S/4HANA sous Windows : utilisez Active Directory Domain Services (les comptes Microsoft Entra restent utilisables pour l'authentification unique).

> **Piège d'examen.** « Azure Site Recovery pour tout le système SAP » est faux dès que la machine virtuelle de base de données est incluse : Site Recovery protège les serveurs d'applications ; la base de données utilise sa propre réplication asynchrone.

<!-- section: compute-storage-network | objectives: 1.1.3 -->
## Les exigences de calcul, de stockage et de réseau

**Calcul.** SAP HANA en production ne s'exécute que sur les machines virtuelles du répertoire matériel HANA ; HANA hors production peut utiliser les types de machines virtuelles de la note SAP 1928533. Les séries M et Mv2 exigent des versions minimales d'OS plus récentes. Le disque temporaire ne contient que des données jetables ; on ne peut pas redimensionner directement entre familles avec et sans disque temporaire, ni convertir la génération 1 en génération 2.

**Stockage.** Le résumé de la matrice de stockage de Microsoft :

| Usage | Recommandé | Non pris en charge |
| --- | --- | --- |
| Disque du système d'exploitation | SSD Premium (SSD Standard hors production uniquement) | HDD Standard |
| /hana/data, /hana/log | SSD Premium, SSD Premium v2, Disque Ultra, Azure NetApp Files | HDD Standard, SSD Standard, Azure Files |
| /sapmnt, répertoire de transport global | Azure Files SSD (NFS ou SMB), Azure NetApp Files, disques managés | Azure Files HDD |
| Données et journal d'un SGBD non HANA | SSD Premium, SSD Premium v2, Disque Ultra | HDD Standard dans tous les cas, SSD Standard en production |

- Le SSD Premium pour `/hana/log` sur les séries M et Mv2 exige l'**Accélérateur d'écriture** (Write Accelerator) ; le SSD Premium v2 et le Disque Ultra atteignent les objectifs de latence de HANA sans lui et ne le prennent pas en charge.
- Le SSD Premium v2 et le Disque Ultra ne s'utilisent pas avec des machines virtuelles en groupe à haute disponibilité.
- Les fichiers de base de données utilisent uniquement des disques managés **LRS** ; la redondance de zone ou géographique des disques n'est pas une méthode de résilience pour un SGBD.

**Réseau.**

- Machines virtuelles d'application et de base de données dans le **même réseau virtuel**, dans des sous-réseaux différents. Les séparer dans des réseaux virtuels appairés n'est pas pris en charge.
- Pas d'appliance virtuelle réseau entre l'application et la base de données : elle peut doubler la latence.
- **Accelerated Networking** sur chaque carte réseau de chaque machine virtuelle SAP, partout où c'est techniquement possible.
- Équilibreurs de charge de référence SKU Standard ; l'équilibreur de charge Basic ne doit pas être utilisé.
- La latence entre application et base de données se classe avec la note SAP 1100926. Dans la plupart des régions, un déploiement zonal la respecte ; un **groupe de placement de proximité** ne s'utilise que si la latence mesurée est trop élevée, pour un seul système SAP.

<!-- section: subscriptions-quotas | objectives: 1.1.4 -->
## Les modèles d'abonnement et les limites de quota

Les quotas de vCPU standard s'appliquent **par abonnement et par région** à deux niveaux : le total des vCPU régionaux et les vCPU par famille de machines virtuelles (par exemple la série M). Augmenter un quota de famille augmente la limite régionale d'autant, dans cette région seulement. Les quotas Spot sont distincts.

| Besoin | Action |
| --- | --- |
| Déployer des machines virtuelles de série M dans un nouvel abonnement | Demander une augmentation du quota de la famille dans la région (portail **Quotas** > Calcul > Nouvelle demande de quota, ou demande de support si elle n'est pas satisfaite automatiquement) |
| Garantir que la capacité existe, par exemple pour la reprise d'activité | **Réservation de capacité à la demande** pour une taille de machine virtuelle dans une région ou une zone, facturée au tarif du paiement à l'utilisation, utilisée ou non |
| Baisser le prix d'une capacité qui tourne en continu | Réservations ou plans d'économies : des remises seulement, sans garantie de capacité |

```bash
# Current vCPU usage and limits per family in a region
az vm list-usage --location westeurope --output table
```

Le quota est une autorisation de déployer ; la capacité est du matériel. Les réservations de capacité ne prennent en charge ni les groupes à haute disponibilité, ni les groupes de placement de proximité, ni le Disque Ultra, ni la série M v1, les tailles Msv3 High Memory et Mdsv3 High Memory ou Very High Memory, et les abonnements Essai gratuit ou Azure for Students n'y sont pas éligibles.

Autres limites : 980 groupes de ressources par abonnement, et des limites par machine virtuelle sur les disques de données et le débit disque et réseau. Des abonnements distincts (production, hors production, hub) donnent des réserves de quota distinctes et des frontières distinctes de stratégie et d'accès.

> **Piège d'examen.** Une réservation ou un plan d'économies n'augmente pas un quota et ne garantit pas la capacité : une demande de quota augmente la limite, une réservation de capacité garantit le matériel.

<!-- section: licensing | objectives: 1.1.5 -->
## Les licences logicielles

| Logiciel | Comment il est licencié sur Azure |
| --- | --- |
| Applications SAP et SAP HANA | Licences achetées auprès de SAP par le client (note SAP 1380654) ; Azure ne les vend pas |
| SUSE / Red Hat | Les images de la Place de marché en **paiement à l'utilisation** (SUSE Linux Enterprise Server for SAP Applications, RHEL for SAP) incluent l'abonnement dans le prix de la machine virtuelle ; **BYOS** utilise votre propre abonnement |
| Windows Server, SQL Server | Licence incluse dans le prix de la machine virtuelle, ou **Azure Hybrid Benefit** avec des licences éligibles |
| Oracle Database | Apportez votre propre licence Oracle ; invité Windows ou Oracle Linux uniquement |
| Logiciel de haute disponibilité tiers (SIOS) | Licencié et pris en charge par l'éditeur |

**Azure Hybrid Benefit pour Linux** fait passer une machine virtuelle RHEL ou SLES du paiement à l'utilisation à BYOS et inversement, sans redéploiement : `RHEL_BYOS` ou `SLES_BYOS` pour BYOS, `NONE` pour revenir à la facturation de l'image (les offres SAP en paiement à l'utilisation apparaissent comme `SLES_SAP`, `RHEL_SAPAPPS`, `RHEL_SAPHA`). Red Hat exige d'abord l'inscription à **Red Hat Cloud Access**.

```bash
az vm update --resource-group rg-sap-prd --name vm-hana01 --license-type SLES_BYOS
```

Sous Linux, les exigences de support de SAP pour la distribution s'appliquent aussi.

<!-- section: cost-implications | objectives: 1.1.6 -->
## Les implications des coûts

| Poste de coût | Ce qui le détermine |
| --- | --- |
| Calcul des machines virtuelles | Taille et heures ; paiement à l'utilisation, réservation ou plan d'économies (1 ou 3 ans) ; une machine virtuelle libérée (deallocated) n'est plus facturée pour le calcul |
| Disques managés | Taille provisionnée ; le SSD Premium v2 et le Disque Ultra facturent aussi les IOPS et le débit provisionnés |
| Azure NetApp Files | Taille et niveau de service du pool de capacité provisionné, pas les données réellement stockées |
| Réseau | Frais de peering, transfert de données sortant, ExpressRoute |
| Haute disponibilité et reprise d'activité | Une deuxième machine virtuelle par couche en cluster ; une machine virtuelle de base de données de reprise ; des réservations de capacité |

| Exigence | Choix |
| --- | --- |
| Machines virtuelles de production stables, même taille et même région pendant des années | Réservations : les économies les plus fortes quand elles sont entièrement utilisées |
| Tailles, familles ou régions appelées à changer | Plan d'économies : un engagement horaire appliqué à toutes les régions et aux services de calcul |
| Hors production utilisée seulement aux heures de bureau | Arrêter et libérer selon un planning (le Centre Azure pour les solutions SAP peut démarrer et arrêter les systèmes inscrits) |

> **Piège d'examen.** Une machine virtuelle arrêtée mais non libérée reste facturée pour le calcul, et réduire des volumes Azure NetApp Files sans redimensionner le pool de capacité n'économise rien.

<!-- section: support-plan | objectives: 1.1.7 -->
## Le plan de support Azure

La note SAP 2015553 (SAP on Azure: support prerequisites) définit le contrat de support Microsoft exigé pour exécuter SAP sur des machines virtuelles Azure :

- **Professional Direct** est le minimum, pour le support d'Azure lui-même.
- **Microsoft Unified** (successeur de Premier Support) est recommandé pour SAP sous Windows Server et/ou SQL Server, car il couvre aussi ces produits.

| Plan | Périmètre | Réponse initiale la plus rapide |
| --- | --- | --- |
| Basic | Inclus pour tous les clients ; pas de support technique | Aucune |
| Developer | Essai et hors production | 8 heures ouvrées |
| Standard | Charges de travail de production | 1 heure (gravité A) |
| Professional Direct | Usage d'Azure critique pour l'entreprise | 1 heure (gravité A) |
| Unified Enterprise | Dépendance critique à Azure et à d'autres produits Microsoft | 15 minutes pour Azure (gravité 1) |

Également exigés pour le support : l'**extension de machine virtuelle Azure pour les solutions SAP** sur chaque machine virtuelle SAP, et la connectivité SAProuter. Les incidents SAP s'ouvrent sur les composants `BC-OP-NT-AZR` (Windows) ou `BC-OP-LNX-AZR` (Linux).

> **Piège d'examen.** Le support Standard couvre la production, mais il ne satisfait pas la note SAP 2015553 : le plan le plus bas acceptable pour SAP sur Azure est Professional Direct.

<!-- section: migration-approaches | objectives: 1.1.8 -->
## Lift-and-shift, lift-shift-migrate, lift-shift-migrate vers HANA

| Approche | Ce qui change | Méthode type | À choisir quand |
| --- | --- | --- | --- |
| Lift-and-shift | Rien d'autre que la plateforme : même famille d'OS, même SGBD | Copie de système homogène : sauvegarde et restauration, ou réplication du SGBD (Data Guard, Always On, HANA System Replication) | L'OS et le SGBD sont déjà pris en charge sur Azure ; le risque le plus faible |
| Lift-shift-migrate | L'OS et/ou le SGBD changent (par exemple AIX avec Db2 vers Windows avec SQL Server) | Copie de système hétérogène avec SWPM (export et import R3load) | La plateforme source n'existe pas sur Azure (non x86, SGBD non pris en charge) |
| Lift-shift-migrate vers HANA | La base de données devient SAP HANA, souvent avec une mise à niveau SAP | SUM avec la Database Migration Option (DMO), ou DMO with System Move | Le passage à Azure est combiné au passage à HANA ou au chemin vers S/4HANA |

Une migration **en deux étapes** fait un lift-and-shift, teste, puis exécute DMO vers HANA sur Azure : deux interruptions et deux cycles de test. Une migration **en une étape** (DMO with System Move) migre, met à niveau et déplace en une seule interruption.

> **Conseil d'examen.** « Conserver la base de données et l'OS actuels » signifie lift-and-shift ; « la plateforme actuelle n'est pas prise en charge dans Azure » signifie lift-shift-migrate ; « migrer vers SAP HANA » oriente vers DMO.

<!-- section: migration-tools | objectives: 1.1.9 -->
## La stratégie et les outils de migration

**Ordre.** Déplacez d'abord les systèmes de bac à sable et à faible risque, l'ERP de production en dernier ; les systèmes étroitement couplés (ERP et GTS, par exemple) ensemble ; les nouveaux systèmes démarrent dans Azure.

| Outil ou méthode | À utiliser pour |
| --- | --- |
| Copie de système homogène SWPM | Même famille d'OS et même SGBD : sauvegarde et restauration, réplication du SGBD ou copie des journaux de transactions (log shipping) |
| Copie hétérogène SWPM (R3load, Migration Monitor, fractionnement de tables) | Migration OS/DB vers n'importe quel SGBD cible, avec un contrôle fin de l'interruption |
| SUM DMO | Mise à niveau SAP plus migration vers SAP HANA en une étape, avec contrôles intégrés |
| DMO with System Move | DMO du local vers Azure : export en local, transfert, import sur Azure ; le mode de transfert parallèle (`dmotocloud.sh`) raccourcit l'interruption par rapport au mode séquentiel |
| DMO optimisé pour l'interruption (downtime-optimized DMO) | Les grandes tables migrées pendant le fonctionnement avec SLT ; service fourni par SAP ; non combinable avec DMO with System Move |
| AzCopy | Copier les dumps d'export vers Azure, souvent plus vite par internet que par ExpressRoute pour les très grandes bases |
| Azure Site Recovery | Reprise d'activité de la couche application ; jamais les machines virtuelles de base de données |

Les très grandes bases de données (plus de 20 To) demandent des serveurs d'export et d'import dédiés et un fractionnement de tables mesuré ; prévoyez environ 2 To par heure pour une migration hétérogène.

> **Piège d'examen.** DMO cible uniquement SAP HANA. Un énoncé qui change d'OS et passe à SQL Server, Oracle ou Db2 demande une copie de système hétérogène classique avec SWPM, pas DMO.

<!-- section: key-points -->
## Points clés

- Dimensionnez d'abord la machine virtuelle de base de données ; les SAPS par machine virtuelle viennent de la note SAP 1928533, les tailles HANA de production du répertoire matériel HANA.
- Une région et un réseau virtuel pour l'application et la base de données, sans NVA entre les deux ; l'Accélérateur d'écriture seulement pour les volumes de journal sur SSD Premium de la série M.
- Le quota autorise un déploiement, une réservation de capacité garantit le matériel, une réservation ou un plan d'économies ne fait que baisser le prix.
- Le plan de support minimum pour SAP sur Azure est Professional Direct (note SAP 2015553).
- Même plateforme : lift-and-shift avec une copie homogène ; nouvel OS ou nouveau SGBD : copie hétérogène SWPM ; vers HANA : DMO, avec System Move pour une migration en une étape vers Azure.
