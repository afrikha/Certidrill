Une question de conception de calcul décrit une charge de travail (existante ou nouvelle, web ou d'arrière-plan, régulière ou en rafales, en conteneurs ou non) et quelques contraintes, puis demande quel service, quel niveau ou quelle option recommander. La bonne réponse est le service le plus managé et le moins cher qui donne encore le contrôle exigé.

<!-- section: choose-compute | objectives: 4.1.1 -->
## Choisir le service de calcul d'après la charge de travail

Partez de ce que l'équipe doit contrôler. Plus Azure gère, moins vous corrigez et moins vous pouvez personnaliser.

| Exigence dans la question | Recommander |
| --- | --- |
| Déplacer un serveur tel quel, contrôler le système d'exploitation, installer un logiciel personnalisé ou ancien | Machines virtuelles Azure, dans un groupe de machines virtuelles identiques quand il faut plusieurs instances identiques |
| Conserver un parc VMware et ses outils sans convertir les machines | Azure VMware Solution |
| Application web ou API sur une plateforme managée, avec mise à l'échelle automatique et emplacements de déploiement | Azure App Service |
| Code court piloté par les événements, facturé à l'exécution, mise à l'échelle à zéro | Azure Functions |
| Workflow qui relie des systèmes SaaS et d'entreprise avec peu ou pas de code | Azure Logic Apps |
| Exécuter rapidement un conteneur ou une tâche courte, sans orchestrateur | Azure Container Instances |
| Microservices ou travaux en conteneurs, mise à l'échelle à zéro, aucun cluster à gérer | Azure Container Apps |
| API Kubernetes complète, opérateurs personnalisés, contrôle des nœuds et du réseau | Azure Kubernetes Service (AKS) |
| Des milliers de tâches de calcul parallèles ou fortement couplées | Azure Batch |

Précisez ensuite les composants que les exigences impliquent :

- **Mise à l'échelle.** Le scale-up change la taille d'une instance ; le scale-out ajoute des instances et exige un équilibreur de charge et des instances sans état. La mise à l'échelle automatique suit une métrique ou une planification ; la mise à l'échelle à zéro n'existe que dans les plans serverless.
- **Réseau.** Atteindre une base de données par un point de terminaison privé, ou n'être joignable que depuis un réseau virtuel, écarte les plans sans prise en charge du réseau virtuel.
- **État.** Gardez la session et les données hors des instances (cache, base de données, stockage) pour que toute instance soit remplaçable.
- **Modèle de coût.** Une charge régulière favorise la capacité réservée ; une charge imprévisible ou rare favorise la facturation à la consommation ; une charge interruptible favorise la capacité Spot.

Les plans App Service montrent comment un niveau débloque des fonctionnalités :

| Niveau | Calcul | Scale-out | Fonctionnalités qui arrivent à ce niveau |
| --- | --- | --- | --- |
| Free, Shared | Partagé avec d'autres clients | Non | Développement et test uniquement |
| Basic | Dédié | 3 instances, manuel | Intégration au réseau virtuel, points de terminaison privés, SLA de 99,95 % |
| Standard | Dédié | 10 instances | Mise à l'échelle automatique, 5 emplacements de déploiement |
| Premium v2 à v4 | Dédié | 30 instances | 20 emplacements de déploiement, redondance de zone |
| Isolated v2 | Dédié, dans un App Service Environment de votre réseau virtuel | 100 instances | Isolation réseau, environnement monolocataire |

> **Piège d'examen.** « Réduire l'effort d'administration » élimine les machines virtuelles et AKS dès qu'une option PaaS ou serverless satisfait les autres exigences. « Nécessite l'accès au système d'exploitation » ou « exécute un service Windows non modifiable » ramène les machines virtuelles.

<!-- section: virtual-machines | objectives: 4.1.2 -->
## Recommander une solution basée sur des machines virtuelles

La famille de tailles suit le goulot d'étranglement de la charge de travail :

| Famille | Profil | Charges de travail typiques |
| --- | --- | --- |
| B | À capacité de rafale (burstable) | Processeur peu sollicité en moyenne avec des pics occasionnels : petits serveurs web, développement et test |
| D | Usage général | Applications d'entreprise, bases de données relationnelles, serveurs d'applications |
| F | Optimisée pour le calcul | Traitement par lots, serveurs web chargés, appliances réseau |
| E, M | Optimisée pour la mémoire | Grandes bases de données relationnelles, analytique en mémoire ; M pour les plus grandes (SAP HANA) |
| L | Optimisée pour le stockage | Débit élevé sur disque local : bases de données NoSQL, entrepôts de données |
| N | GPU | Entraînement et inférence de modèles, rendu, bureaux virtuels |
| HB, HX | Calcul haute performance | Dynamique des fluides, modélisation météorologique, conception électronique assistée |
| DC, EC | Informatique confidentielle | Données qui doivent rester chiffrées pendant leur utilisation |

Les disques suivent la même logique :

| Type de disque | IOPS maximales | Usage | Remarques |
| --- | --- | --- | --- |
| Ultra Disk | 400 000 | SAP HANA, bases de données de premier plan, charges à forte intensité transactionnelle | Disque de données uniquement ; performances modifiées sans interruption |
| SSD Premium v2 | 80 000 | Charges de production qui exigent une latence constamment faible | Disque de données uniquement ; IOPS et débit réglés indépendamment de la taille |
| SSD Premium | 20 000 | Charges de production | Peut être un disque de système d'exploitation |
| SSD Standard | 6 000 | Serveurs web, applications peu utilisées, développement et test | |
| HDD Standard | 2 000 | Sauvegarde, accès peu fréquent | |

Les options de coût sont souvent l'exigence décisive :

| Option | Engagement | Usage |
| --- | --- | --- |
| Machines virtuelles Azure Spot | Aucun ; évincées avec un préavis de 30 secondes quand Azure a besoin de la capacité ou que le prix dépasse votre maximum ; pas de SLA | Travail interruptible : lots, développement et test, scale-out sans état |
| Instances de machines virtuelles réservées | Un ou trois ans pour une famille de tailles dans une région | Charges régulières et prévisibles |
| Plan d'économies Azure pour le calcul | Dépense horaire sur un ou trois ans, tous services de calcul et régions confondus | Dépense régulière dont les tailles ou les régions changent |
| Azure Hybrid Benefit | Licences Windows Server et SQL Server existantes avec Software Assurance | Retire la part de licence du prix ; se combine aux réservations |

Une machine virtuelle Spot est libérée par défaut à l'éviction (les disques sont conservés et facturés) ou supprimée. Un prix maximal de -1 signifie qu'elle n'est jamais évincée pour le prix, seulement pour la capacité.

**Azure Dedicated Host** fournit un serveur physique réservé à un abonnement : vous êtes facturé par hôte quel que soit le nombre de machines virtuelles, vous contrôlez le moment où la maintenance de la plateforme s'applique, et il répond aux exigences de conformité d'isolation matérielle et aux scénarios d'apport de vos propres licences. Les **groupes de machines virtuelles identiques** créent et mettent à l'échelle des instances identiques ou mixtes à partir d'une image ; stockez les images dans **Azure Compute Gallery** pour les versionner et les répliquer entre régions.

> **Piège d'examen.** Les machines virtuelles Spot ne conviennent pas à une charge qui doit rester disponible ou qui ne peut pas être interrompue, quelle que soit l'exigence de coût. Pour « le coût le plus bas pour une charge qui s'exécute en continu pendant trois ans », la réponse est une réservation, avec Azure Hybrid Benefit si des licences existent.

<!-- section: containers | objectives: 4.1.3 -->
## Recommander une solution basée sur des conteneurs

| Service | À choisir quand | Ce qu'il ne fait pas |
| --- | --- | --- |
| Azure Container Instances | Un conteneur ou un groupe de conteneurs doit démarrer en quelques secondes, facturé à la seconde, sans infrastructure : agents de build, tâches courtes, pics | Ni mise à l'échelle automatique, ni équilibrage de charge, ni orchestration : cinq instances sont cinq déploiements |
| Azure Container Apps | Des microservices, des API et des travaux d'arrière-plan ont besoin d'une mise à l'échelle automatique pilotée par le trafic HTTP ou les événements (KEDA), de la mise à l'échelle à zéro, de révisions avec fractionnement du trafic et de Dapr | Pas d'accès direct à l'API Kubernetes |
| Azure Kubernetes Service | L'équipe a besoin de l'API Kubernetes, de son écosystème et du contrôle des nœuds, du réseau et des mises à niveau | Vous exploitez le cluster ; AKS Automatic préconfigure le provisionnement des nœuds, la mise à l'échelle, les mises à niveau et les paramètres de sécurité par défaut |
| App Service (Web App for Containers) | Une application web en conteneur veut les fonctionnalités d'App Service : emplacements, authentification intégrée, mise à l'échelle automatique | Pas conçu pour de nombreux microservices ni pour une mise à l'échelle pilotée par les événements |
| Azure Red Hat OpenShift | L'organisation a déjà standardisé sur OpenShift | |

Container Apps propose deux plans : Consumption (serverless, paiement uniquement pendant l'exécution des applications) et Dedicated (profils de charge de travail avec matériel dédié, GPU compris, facturés par instance de profil). AKS peut déborder vers Container Instances grâce aux nœuds virtuels, sans attendre de nouveaux nœuds.

Les images sont stockées dans **Azure Container Registry** :

| Niveau | Stockage inclus | Fonctionnalités |
| --- | --- | --- |
| Basic | 10 Gio | Développement ; mêmes fonctionnalités de base, débit inférieur |
| Standard | 100 Gio | La plupart des charges de production |
| Premium | 500 Gio | Géoréplication, points de terminaison privés, clés gérées par le client, registres connectés |

> **Piège d'examen.** « Un registre joignable uniquement par un point de terminaison privé » ou « la même image tirée depuis la région la plus proche » exige le niveau Premium. La redondance de zone, non : tous les niveaux l'ont.

> **Conseil d'examen.** « Conteneurs » plus « réduire la charge opérationnelle » plus « mise à l'échelle à zéro » désigne Container Apps. AKS n'est la réponse que si la question exige Kubernetes lui-même : l'API, des définitions de ressources personnalisées, un contrôleur d'entrée ou un maillage de services précis.

<!-- section: serverless | objectives: 4.1.4 -->
## Recommander une solution serverless

Serverless signifie aucun serveur à dimensionner, une mise à l'échelle pilotée par les événements et une facturation qui suit l'usage. Azure Functions exécute du code en réponse à des déclencheurs (HTTP, minuteur, file d'attente, Service Bus, Event Grid, Event Hubs, Cosmos DB) ; le plan d'hébergement porte la décision de conception :

| Plan | Mise à l'échelle | Réseau virtuel | Délai d'exécution | Usage |
| --- | --- | --- | --- | --- |
| Flex Consumption | Pilotée par les événements, jusqu'à zéro, jusqu'à 1 000 instances ; instances toujours prêtes en option | Oui | 30 minutes par défaut, illimité | Choix par défaut des nouvelles applications serverless ; Linux uniquement ; pas d'emplacement de déploiement, une seule application par plan |
| Premium | Pilotée par les événements, au moins une instance toujours chaude | Oui | 30 minutes par défaut, illimité | Pas de démarrage à froid, Windows ou Linux, conteneurs personnalisés |
| Dedicated (plan App Service) | Manuelle ou automatique, celle du plan | Oui | 30 minutes par défaut, illimité avec Always On | Réutiliser la capacité libre d'un plan existant ; coût prévisible |
| Container Apps | Pilotée par les événements (KEDA), jusqu'à zéro | Oui | 30 minutes par défaut, illimité ; avec un minimum de zéro réplica, la valeur par défaut dépend des déclencheurs | Fonctions empaquetées en conteneurs à côté d'autres microservices |
| Consumption (hérité) | Pilotée par les événements, jusqu'à zéro | Non | 5 minutes par défaut, 10 au maximum | Applications existantes ; les nouvelles utilisent Flex Consumption ; l'hébergement Linux est mis hors service le 30 septembre 2028 |

Quel que soit le plan, une fonction déclenchée par HTTP doit répondre en 230 secondes. Une opération plus longue répond immédiatement et se poursuit en arrière-plan : un message de file d'attente, ou **Durable Functions**, qui écrit en code des orchestrations avec état (chaînage de fonctions, fan-out et fan-in, attente d'une approbation humaine, minuteurs).

**Azure Logic Apps** construit les mêmes orchestrations dans un concepteur, avec plus de 1 400 connecteurs :

| | Consumption | Standard |
| --- | --- | --- |
| Hébergement | Multilocataire | Monolocataire ; aussi App Service Environment v3 ou votre propre infrastructure (hybride) |
| Workflows par ressource | Un | Plusieurs, avec ou sans état |
| Facturation | À l'exécution | Plan d'hébergement |
| Intégration au réseau virtuel et points de terminaison privés | Non | Oui |

> **Piège d'examen.** « La fonction doit atteindre une base de données par un point de terminaison privé » ou « ne doit subir aucun démarrage à froid » élimine le plan Consumption hérité. Mise à l'échelle à zéro plus réseau privé désigne Flex Consumption ; aucun démarrage à froid désigne Premium ou les instances toujours prêtes.

> **Conseil d'examen.** Des développeurs qui veulent du code et des tests unitaires : Functions et Durable Functions. Une intégration par connecteurs SaaS avec peu de code : Logic Apps. Des utilisateurs métier qui automatisent leurs propres tâches : Power Automate.

<!-- section: batch | objectives: 4.1.5 -->
## Recommander une solution de calcul pour le traitement par lots

Les charges de traitement par lots s'exécutent jusqu'à leur terme sans utilisateur en attente : rendu, simulation de risque, transcodage, traitements nocturnes.

| Exigence | Recommander |
| --- | --- |
| Travaux parallèles ou HPC à grande échelle, avec planification managée et aucun logiciel de cluster à installer | Azure Batch |
| Conserver un planificateur existant (Slurm, PBS Pro, LSF, Grid Engine, HTCondor) ou faire déborder un cluster local vers Azure | Azure CycleCloud |
| Tâche en conteneur qui s'exécute à la demande, selon une planification ou par événement, puis s'arrête | Travail Container Apps |
| Code court planifié | Azure Functions avec un déclencheur de minuteur |
| Traitement par lots dans une plateforme Kubernetes existante | Travaux Kubernetes sur AKS |

**Azure Batch** crée et gère des pools de nœuds de calcul, installe les applications et planifie les travaux et les tâches sur les nœuds. Batch lui-même est gratuit : vous payez les machines virtuelles, le stockage et le réseau. Les pools peuvent se mettre à l'échelle automatiquement avec la charge, et les fichiers d'entrée et de sortie résident dans le Stockage Azure. Deux types de charges existent :

- **Intrinsèquement parallèle** : les tâches ne se parlent pas (simulation de Monte-Carlo, rendu d'images, transcodage). Toute taille convient, et les nœuds Spot réduisent le coût : une tâche préemptée est remise en file d'attente automatiquement.
- **Fortement couplée** : les tâches échangent des messages via MPI (dynamique des fluides, analyse par éléments finis). Utilisez des tailles HPC (HB, HX) ou GPU (N) avec un réseau RDMA à faible latence, et un système de fichiers parallèle comme Azure Managed Lustre ou Azure NetApp Files pour les données partagées.

> **Piège d'examen.** Les nœuds Spot conviennent aux tâches indépendantes que l'on peut relancer. Un long travail MPI sur des nœuds Spot redémarre entièrement dès qu'un seul nœud est préempté : utilisez des nœuds dédiés.

> **Conseil d'examen.** Ne choisissez pas Batch uniquement pour éviter de gérer des machines virtuelles : si l'exigence est « conserver nos scripts et notre planificateur Slurm », passer au modèle de programmation de Batch est une refonte, et CycleCloud est la réponse.

<!-- section: key-points -->
## Points clés

- Choisissez le service le plus managé qui respecte les exigences de contrôle : machines virtuelles pour le système d'exploitation, AKS pour l'API Kubernetes, sinon PaaS ou serverless.
- App Service : mise à l'échelle automatique et emplacements à partir de Standard, redondance de zone à partir de Premium v2, isolation réseau en Isolated v2.
- Famille de machines virtuelles selon le goulot d'étranglement (B rafale, D usage général, F calcul, E et M mémoire, L stockage, N GPU, HB et HX HPC) ; Ultra Disk et SSD Premium v2 sont des disques de données.
- Spot pour le travail interruptible, réservations ou plan d'économies pour le travail régulier, Azure Hybrid Benefit pour les licences existantes, Dedicated Host pour l'isolation matérielle.
- Container Instances : simple et rapide, sans mise à l'échelle. Container Apps : microservices serverless avec mise à l'échelle à zéro. AKS : Kubernetes complet. Container Registry Premium pour la géoréplication et les points de terminaison privés.
- Functions : Flex Consumption par défaut, Premium contre le démarrage à froid ; le plan Consumption hérité n'a ni réseau virtuel ni plus de 10 minutes. Durable Functions pour le code avec état, Logic Apps pour les connecteurs.
- Batch pour les travaux managés à grande échelle, CycleCloud pour conserver un planificateur, travaux Container Apps pour les tâches finies en conteneurs.
