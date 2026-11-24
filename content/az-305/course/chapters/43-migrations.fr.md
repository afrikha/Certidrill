Une question de migration donne un parc local (hyperviseur, serveurs, bases de données, partages de fichiers), des contraintes d'interruption, de bande passante et d'effort, et demande quelle étape du framework, quel outil d'évaluation, quelle cible ou quelle méthode de transfert recommander. La plupart des réponses forment une paire : une stratégie (rehost, replatform...) et l'outil qui la réalise.

<!-- section: caf | objectives: 4.3.1 -->
## Évaluer une migration avec le Cloud Adoption Framework

Le Microsoft Cloud Adoption Framework pour Azure (CAF) organise l'adoption en phases, qui répondent chacune à une question :

| Phase | Question | Principal résultat |
| --- | --- | --- |
| Strategy (stratégie) | À quoi doit ressembler notre adoption d'Azure ? | Motivations, résultats métier, analyse de rentabilité |
| Plan (planification) | Comment nous préparons-nous ? | Inventaire des charges de travail, stratégie de migration par charge, compétences et calendrier |
| Ready (préparation) | Comment construisons-nous l'environnement ? | Zone d'atterrissage Azure |
| Adopt (adoption) | Comment migrons-nous, modernisons-nous et créons-nous les charges de travail ? | Charges de travail migrées, modernisées ou natives du cloud |
| Govern, Secure, Manage (gouverner, sécuriser, gérer) | Comment contrôlons-nous, protégeons-nous et exploitons-nous l'environnement ? | Stratégies, base de référence de sécurité, opérations : en continu, en parallèle de l'adoption |

Une **zone d'atterrissage Azure** doit exister avant que les charges de travail ne bougent. Sa zone d'atterrissage de plateforme fournit la hiérarchie de groupes d'administration avec ses stratégies et les services partagés (identité, connectivité, gestion) ; les équipes de charge de travail reçoivent ensuite des abonnements, les zones d'atterrissage de charge de travail, qui héritent de ces garde-fous.

Pendant la phase Plan, chaque charge de travail reçoit une stratégie de migration :

| Stratégie | Ce qu'elle signifie | À choisir quand |
| --- | --- | --- |
| Retire (mettre hors service) | Désaffecter la charge de travail | Elle n'apporte plus de valeur métier |
| Rehost (réhéberger) | Déplacer tel quel, à l'identique (serveur vers machine virtuelle) | La rapidité et une perturbation minimale priment, aucune modernisation prévue à court terme, date de sortie du centre de données |
| Replatform (changer de plateforme) | Passer à une plateforme d'hébergement managée avec des modifications de code minimales (application web vers App Service, SQL Server vers SQL Managed Instance) | Vous voulez vous décharger du système d'exploitation et des correctifs |
| Refactor (refactoriser) | Modifier le code sans ajouter de fonctionnalités | Réduire la dette technique, adopter des services et des modèles cloud |
| Rearchitect (réarchitecturer) | Repenser l'architecture (décomposer en services) | Les composants doivent se mettre à l'échelle indépendamment |
| Rebuild (reconstruire) | Redévelopper avec des services natifs du cloud | L'application existante ne peut pas répondre aux exigences |
| Replace (remplacer) | Adopter un produit SaaS | Une solution commerciale couvre le besoin |
| Retain (conserver) | La laisser où elle est | Stable, conforme, aucun motif de déplacement |

La méthodologie Migrate de la phase Adopt compte cinq étapes : planifier la migration, préparer les charges de travail, exécuter la migration, optimiser dans le cloud, désaffecter la source. Ses conseils de planification sont testés comme du bon sens : découvrir les dépendances et déplacer les composants dépendants dans la même vague, migrer la hors-production avant la production et les charges simples avant les complexes, définir les critères de retour arrière avant chaque bascule. Une migration avec interruption (arrêter, copier, redémarrer) est plus simple et convient aux charges disposant d'une fenêtre de maintenance ; une migration à interruption quasi nulle réplique en continu et bascule à la fin, pour les charges critiques.

> **Piège d'examen.** « Modifications minimales » et « le plus rapide » désignent rehost, même si une cible PaaS serait meilleure à long terme. « Réduire la charge de gestion avec des modifications de code minimales » désigne replatform. Lisez quelle contrainte la question énonce.

<!-- section: assess | objectives: 4.3.2 -->
## Évaluer les serveurs, données et applications locaux

**Azure Migrate** est le hub gratuit de découverte, d'évaluation et de migration des serveurs, des bases de données et des applications web. Il fonctionne en trois temps.

**Découvrir.** Une appliance Azure Migrate légère, déployée localement, collecte en continu les données de configuration et de performances, l'inventaire logiciel, les instances SQL Server et les applications web ASP.NET, sans rien installer sur les serveurs.

| Source | Déploiement de l'appliance | Limite de découverte par appliance |
| --- | --- | --- |
| VMware | Modèle OVA ou script | 10 000 serveurs, jusqu'à 10 serveurs vCenter |
| Hyper-V | Modèle VHD ou script | 5 000 serveurs, jusqu'à 300 hôtes |
| Serveurs physiques, autres clouds | Script | 1 000 serveurs |

**Établir l'analyse de rentabilité.** Elle compare le coût total de possession en local et dans Azure, montre les économies d'Azure Hybrid Benefit et du passage des dépenses d'investissement aux dépenses d'exploitation, et permet de comparer « migrer entièrement vers IaaS » et « moderniser avec PaaS ».

**Évaluer.** Une évaluation vérifie la préparation à Azure, puis dimensionne la cible, puis estime le coût mensuel. Il en existe quatre types : machine virtuelle Azure, Azure SQL (SQL Database, SQL Managed Instance ou SQL Server sur une machine virtuelle), Azure App Service (applications web) et Azure VMware Solution.

| Paramètre | Effet |
| --- | --- |
| Dimensionnement basé sur les performances | Dimensionne la cible d'après l'utilisation collectée du processeur, de la mémoire et des disques : évite de payer pour des serveurs surdimensionnés |
| Dimensionnement en l'état local (As-is on-premises) | Conserve l'allocation actuelle : à utiliser quand aucun historique de performances n'existe ; les applications web sont toujours évaluées ainsi, car l'appliance ne collecte aucune donnée de performances pour elles |
| Utilisation en centile | Le centile des échantillons retenu, le 95e par exemple pour ignorer les valeurs aberrantes |
| Facteur de confort | Un multiplicateur qui ajoute une marge pour les pics saisonniers ou la croissance : 2,0 double la taille calculée |

L'**analyse des dépendances** montre quels serveurs se parlent, d'après leurs connexions TCP, afin qu'ils migrent dans la même vague. L'analyse sans agent s'exécute depuis l'appliance et est celle recommandée ; l'analyse avec agent est en cours d'abandon.

Pour SQL Server, un parc connecté par Azure Arc peut aussi être évalué depuis le portail Azure, avec une cible Azure SQL et une taille recommandées. Data Migration Assistant a été mis hors service en juillet 2025.

> **Piège d'examen.** Un serveur dimensionné « en l'état local » reproduit son surprovisionnement dans Azure. Quand la question dit « réduire les coûts Azure » et que les serveurs sont sous-utilisés, la réponse est une évaluation basée sur les performances, après suffisamment de jours de collecte.

> **Conseil d'examen.** « Identifier les serveurs à migrer ensemble » désigne l'analyse des dépendances ; « estimer les économies pour justifier le projet » désigne l'analyse de rentabilité ; « vérifier si les serveurs peuvent s'exécuter dans Azure et à quelle taille » désigne une évaluation.

<!-- section: migrate-workloads | objectives: 4.3.3 -->
## Migrer des charges de travail vers IaaS et PaaS

Pour réhéberger des serveurs en machines virtuelles Azure, l'outil de migration d'Azure Migrate réplique les disques pendant que les serveurs continuent de fonctionner, permet une migration de test dans un réseau isolé, puis bascule.

| Source | Méthode recommandée | Fonctionnement |
| --- | --- | --- |
| Machines virtuelles VMware | Sans agent | L'appliance Azure Migrate réplique au moyen d'instantanés VMware ; rien n'est installé dans les machines |
| VMware, quand les prérequis du sans agent ne sont pas remplis | Avec agent | Une appliance de réplication et l'agent du service Mobilité dans chaque machine |
| Machines virtuelles Hyper-V | Sans agent | Fournisseur de réplication installé sur les hôtes Hyper-V, aucun agent dans les machines |
| Serveurs physiques, machines virtuelles dans AWS ou Google Cloud, autres hyperviseurs | Avec agent | Traités comme des serveurs physiques : appliance de réplication et agent du service Mobilité |

D'autres cibles couvrent d'autres stratégies :

| Exigence | Recommander |
| --- | --- |
| Déplacer rapidement des centaines de machines VMware, garder les outils et les compétences vSphere, éviter de convertir les machines ou de changer leurs adresses IP | Azure VMware Solution : un cloud privé VMware (vSphere, vSAN, NSX) sur des hôtes Azure dédiés, trois hôtes au minimum, avec VMware HCX pour la migration |
| Déplacer une application ASP.NET d'IIS vers une plateforme managée | App Service Migration Assistant pour un serveur ; Azure Migrate pour découvrir, évaluer et migrer des applications web à grande échelle |
| L'application dépend de composants qu'App Service ne fournit pas | La conteneuriser avec l'outil de conteneurisation d'applications d'Azure Migrate, puis l'exécuter dans des conteneurs App Service ou dans AKS |
| Déplacer le niveau base de données vers PaaS | Section suivante |

Azure Site Recovery réplique aussi des machines, mais c'est le service de reprise d'activité ; pour une migration, Microsoft vous dirige vers Azure Migrate.

> **Piège d'examen.** « Aucun agent ne peut être installé sur les serveurs » permet encore la migration sans agent pour VMware et Hyper-V, mais pas pour les serveurs physiques ni les instances AWS, qui exigent toujours l'agent du service Mobilité.

<!-- section: migrate-databases | objectives: 4.3.4 -->
## Migrer des bases de données

Choisissez d'abord la cible, d'après ce que les bases de données utilisent :

| Exigence | Cible |
| --- | --- |
| Application nouvelle ou modernisée, fonctionnalités limitées à la base de données, administration minimale | Azure SQL Database |
| Lift-and-shift de SQL Server avec des fonctionnalités à l'échelle de l'instance : SQL Server Agent, requêtes entre bases de données, CLR, Service Broker, serveurs liés | Azure SQL Managed Instance |
| Accès au système d'exploitation, version précise de SQL Server, SSRS ou SSAS sur le même serveur, agents tiers | SQL Server sur Machines virtuelles Azure |

Choisissez ensuite l'outil, d'après l'interruption acceptée. Une migration **hors connexion** arrête l'application pendant toute la copie ; une migration **en ligne** continue de répliquer les modifications et l'application ne s'arrête que pour la bascule.

| Outil | Cibles | Usage |
| --- | --- | --- |
| Azure Database Migration Service | SQL Database (hors connexion) ; SQL Managed Instance et SQL Server sur machines virtuelles Azure (en ligne ou hors connexion) | Service managé pour les migrations à grande échelle, piloté depuis le portail, PowerShell ou Azure CLI ; il ne migre ni les connexions (logins) ni les bases de données chiffrées par TDE |
| Lien Managed Instance | SQL Managed Instance, depuis SQL Server 2016 ou ultérieur | Réplication en quasi-temps réel par un groupe de disponibilité distribué : la migration en ligne avec le moins d'interruption ; l'instance est lisible pendant la migration |
| Log Replay Service | SQL Managed Instance | Restaure les sauvegardes complètes, différentielles et de journaux depuis le Stockage Blob jusqu'à la bascule |
| Sauvegarde et restauration natives depuis le Stockage Blob | SQL Managed Instance, SQL Server sur machines virtuelles Azure | Le plus simple quand une fenêtre d'interruption est acceptée |
| Importation BACPAC | SQL Database | Petites bases de données, avec interruption |
| Réplication transactionnelle | SQL Database, SQL Managed Instance | Réplication continue de tables choisies |
| SQL Server Migration Assistant (SSMA) | SQL Server, SQL Database, SQL Managed Instance | Convertit les schémas et migre les données depuis Oracle, Db2, MySQL, SAP ASE et Access |
| Service de migration d'Azure Database pour PostgreSQL | Serveur flexible PostgreSQL | Hors connexion ou en ligne, depuis un environnement local, des machines virtuelles Azure, Amazon RDS ou Aurora, Google Cloud SQL |

> **Piège d'examen.** Azure SQL Database n'accepte que des migrations hors connexion par Database Migration Service. « Interruption minimale » avec une cible SQL Database exige un autre mécanisme comme la réplication transactionnelle, ou une cible SQL Managed Instance.

> **Conseil d'examen.** Une source qui n'est pas SQL Server (Oracle, Db2, MySQL) à destination d'Azure SQL passe toujours par SSMA pour la conversion du schéma.

<!-- section: migrate-data | objectives: 4.3.5 -->
## Migrer des données non structurées

La méthode découle du volume de données, de la bande passante disponible et du caractère ponctuel ou récurrent du transfert. Un calcul rapide : à 100 Mbit/s, 10 To demandent plus de neuf jours de transfert continu, et 100 To environ trois mois.

| Exigence | Recommander |
| --- | --- |
| Jusqu'à environ 35 To, bande passante limitée, importation ponctuelle | Azure Data Box Disk : jusqu'à cinq SSD chiffrés de 8 To par commande, importation uniquement |
| Plus de 40 To, bande passante limitée, importation ou exportation | Azure Data Box : un appareil renforcé de 120 To ou 525 To de capacité utilisable |
| Utiliser vos propres disques, ou exporter des objets blob vers des disques | Service Azure Import/Export : importe vers le Stockage Blob et Azure Files, exporte depuis le Stockage Blob uniquement |
| Bonne bande passante, copie scriptée ou répétée vers des objets blob | AzCopy |
| Quelques fichiers, outil graphique | Explorateur Stockage Azure |
| Migrer des partages de fichiers SMB ou NFS, ou des compartiments Amazon S3, comme un projet managé et suivi | Azure Storage Mover |
| Remplacer des serveurs de fichiers en gardant un cache local et l'accès SMB dans les bureaux | Azure File Sync avec la hiérarchisation cloud |
| Pipelines planifiés depuis de nombreux magasins de données, avec transformation | Azure Data Factory |

Data Box Heavy a été mis hors service ; plusieurs appareils Data Box peuvent être commandés pour des volumes supérieurs. Les données d'un Data Box sont chiffrées en AES 256 bits, et l'appareil est effacé après le chargement.

**Azure Storage Mover** est un service de migration entièrement managé : une ressource dans Azure suit les projets. Dans une migration avec agent, un agent déployé près de la source copie les fichiers directement vers des conteneurs d'objets blob ou des partages de fichiers Azure en préservant l'arborescence, les horodatages et les autorisations. Les migrations sans agent n'ont besoin d'aucun agent : depuis des partages SMB (connectivité privée vers le partage, informations d'identification dans Azure Key Vault), depuis des partages NFS (préversion) et depuis des sources cloud comme AWS S3. Il se combine avec Data Box : l'appareil transporte l'essentiel hors connexion, puis Storage Mover ne charge que les modifications faites depuis.

**Azure File Sync** synchronise des serveurs de fichiers Windows avec des partages de fichiers Azure. Utilisé comme outil de migration, il charge en arrière-plan pendant que les utilisateurs continuent de travailler ; avec la hiérarchisation cloud, seuls les fichiers souvent utilisés restent sur le serveur. Pour une cible uniquement cloud, Robocopy vers un partage de fichiers Azure monté et Storage Mover préservent toute la fidélité des fichiers ; AzCopy et l'Explorateur Stockage Azure peuvent perdre des autorisations sur Azure Files.

> **Piège d'examen.** Data Box Disk ne peut pas exporter de données depuis Azure et s'arrête à environ 35 To par commande. Une exportation d'objets blob vers un site local utilise Data Box ou le service Import/Export.

> **Conseil d'examen.** « Bande passante limitée » ou « le transfert prendrait des mois » désigne un appareil hors connexion. « Synchronisation continue » ou « garder le serveur de fichiers local » désigne Azure File Sync. « Les autorisations NTFS doivent être préservées » exclut l'Explorateur Stockage Azure.

<!-- section: key-points -->
## Points clés

- Phases du CAF : Strategy, Plan, Ready, Adopt, puis Govern, Secure et Manage. Une zone d'atterrissage précède la première charge de travail.
- Rehost déplace tel quel ; replatform passe à une plateforme managée avec des modifications de code minimales ; refactor, rearchitect et rebuild modifient de plus en plus le code ; replace adopte du SaaS ; retire et retain ne déplacent rien.
- Azure Migrate : appliance pour la découverte sans agent, analyse de rentabilité pour les économies, évaluations pour la préparation, la taille et le coût, analyse des dépendances pour les vagues de migration.
- Le dimensionnement basé sur les performances avec un facteur de confort évite de migrer le surprovisionnement.
- Réplication sans agent pour VMware et Hyper-V ; avec agent pour les serveurs physiques et les autres clouds. Azure VMware Solution conserve la pile VMware ; App Service Migration Assistant déplace les applications IIS.
- Les fonctionnalités SQL Server à l'échelle de l'instance mènent à SQL Managed Instance, l'accès au système d'exploitation à SQL Server sur une machine virtuelle. Lien Managed Instance pour le moins d'interruption ; Database Migration Service est uniquement hors connexion pour SQL Database ; SSMA pour les autres moteurs.
- Données : Data Box Disk jusqu'à 35 To, Data Box au-delà de 40 To, AzCopy avec une bonne bande passante, Storage Mover pour les migrations managées de partages, File Sync pour les serveurs de fichiers hybrides.
