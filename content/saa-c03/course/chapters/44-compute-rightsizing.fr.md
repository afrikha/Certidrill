Acheter le calcul à bas prix n'est que la moitié du travail ; l'autre moitié consiste à ne pas en acheter trop. Les questions d'examen montrent une flotte surdimensionnée ou inactive, un profil de charge ou un modèle de trafic, et demandent la famille et la taille d'instance, la méthode de mise à l'échelle ou l'équilibreur de charge qui fournit les performances requises au moindre coût.

<!-- section: instance-families | objectives: 4.2.7, 4.2.14 -->
## Familles d'instances et nommage

Un nom de type d'instance se lit série, génération, options, puis taille : `c7gn.xlarge` est optimisé pour le calcul (`c`), de 7e génération, avec processeur Graviton (`g`), optimisé pour le réseau (`n`), de taille `xlarge`.

| Famille | Optimisée pour | Charges de travail typiques |
| --- | --- | --- |
| M | Usage général, vCPU et mémoire équilibrés | Serveurs d'applications, petites et moyennes bases de données, charges mixtes |
| T | Performances extensibles (base plus crédits de CPU) | CPU moyen faible avec de courts pics : petits serveurs web, dev et test |
| C | Calcul (ratio vCPU/mémoire élevé) | Traitement par lots, transcodage multimédia, modélisation scientifique, diffusion publicitaire, serveurs de jeux |
| R, X, U, Z | Mémoire (R optimisée pour la mémoire, X intensive en mémoire, U et Z haute mémoire) | Bases de données et caches en mémoire, analytique big data en temps réel, SAP HANA |
| I, D, Im, Is | Stockage (stockage d'instance NVMe local rapide ou HDD dense) | Bases NoSQL, entrepôts de données, systèmes de fichiers distribués, E/S aléatoires intensives |
| P, G, Trn, F, VT | Calcul accéléré (GPU, Trainium, FPGA, transcodage vidéo) | Entraînement et inférence ML, rendu graphique, encodage vidéo |
| Hpc | Calcul haute performance | Simulations fortement couplées à grande échelle |

| Lettre d'option | Signification |
| --- | --- |
| `g` | Processeur AWS Graviton (Arm) |
| `a` | Processeur AMD |
| `i` | Processeur Intel |
| `d` | Volumes de stockage d'instance NVMe locaux |
| `n` | Optimisée pour le réseau et EBS |
| `e` | Mémoire ou stockage d'instance supplémentaires |
| `z` | Fréquence de CPU élevée |
| `flex` | Instance Flex |

**Virtualisation.** Les instances de génération actuelle s'exécutent sur l'AWS Nitro System avec la virtualisation matérielle (AMI HVM) ; les tailles `.metal` donnent un accès direct au serveur physique pour les charges qui en ont besoin (licences, hyperviseurs personnalisés, fonctionnalités matérielles).

**Instances T à performances extensibles.** Elles gagnent des crédits de CPU sous leur niveau de base et les dépensent au-dessus. En mode standard, le CPU est limité au niveau de base quand les crédits sont épuisés ; en mode illimité (unlimited), l'instance continue de monter en charge et les crédits excédentaires sont facturés. Une instance T qui tourne la plupart du temps au-dessus de sa base coûte plus cher qu'une instance M de même taille : passez à une famille à performances fixes.

> **Conseil d'examen.** Associez le goulet d'étranglement cité dans l'énoncé à la lettre de famille : « limité par le CPU » → C, « gros jeu de données en mémoire » → R ou X, « E/S locales séquentielles ou aléatoires élevées » → I ou D, « GPU » → P ou G, « presque toujours inactif avec des pics » → T. Graviton (`g`) est la réponse côté coût quand le logiciel s'exécute sur Arm.

<!-- section: instance-sizing | objectives: 4.2.15, 4.2.7 -->
## Choisir la taille d'instance

Dans une famille, chaque taille double à peu près les vCPU, la mémoire et le prix (`large` → `xlarge` → `2xlarge`) : descendre d'une taille divise le coût environ par deux.

Démarche de dimensionnement :

1. Collectez au moins deux semaines de métriques : CPU, réseau et disque depuis CloudWatch, et la **mémoire**, métrique interne au système invité collectée uniquement par l'**agent CloudWatch**.
2. Regardez la pointe, pas la moyenne, et dimensionnez pour la pointe avec une marge (ou montez en charge horizontalement pour elle).
3. Utilisez **AWS Compute Optimizer** : après votre inscription (opt-in), il analyse par défaut les 14 derniers jours (93 jours avec les métriques d'infrastructure améliorées, payantes) et classe les instances en sous-provisionnées, surprovisionnées ou optimisées, avec des types recommandés. Il couvre aussi les groupes Auto Scaling, les volumes EBS, les fonctions Lambda, les services ECS sur Fargate, RDS et Aurora, entre autres.
4. Changez de famille quand le profil ne correspond pas : une mémoire à 90 % et un CPU à 10 % sur une instance M suggèrent une instance R de plus petite taille.
5. Privilégiez la dernière génération : elle offre en général plus de performances pour un prix égal ou inférieur.

| Observation | Action |
| --- | --- |
| CPU au maximum à 15 %, mémoire à 30 %, charge stable | Taille inférieure dans la même famille, ou instance T |
| CPU constamment au-dessus de 80 %, temps de réponse dégradé | Taille supérieure, ou davantage d'instances derrière un équilibreur de charge |
| Limité par la mémoire, CPU faible | Famille optimisée pour la mémoire (R), éventuellement plus petite |
| Charge très variable dans la journée | Garder une taille plus petite et monter en charge horizontalement avec un groupe Auto Scaling |
| Fonction Lambda à durée élevée et faible mémoire | Augmenter la mémoire : le CPU croît avec la mémoire (1 769 Mo valent environ un vCPU), ce qui réduit souvent le coût total |

> **Piège d'examen.** EC2 ne publie pas l'utilisation de la mémoire par défaut. Une démarche de dimensionnement qui doit tenir compte de la mémoire exige l'agent CloudWatch sur les instances ; Compute Optimizer utilise ensuite ces métriques.

<!-- section: utilization | objectives: 4.2.8 -->
## Optimiser l'utilisation du calcul

La capacité inactive est la principale source de gaspillage. Trois leviers d'architecture la réduisent :

| Levier | Comment il fait économiser | Exemple |
| --- | --- | --- |
| Conteneurs | Plusieurs services partagent un hôte ; les tâches sont regroupées densément | ECS sur EC2 avec la stratégie de placement `binpack` et des fournisseurs de capacité, ou Fargate pour ne payer que la taille des tâches |
| Sans serveur | Aucune capacité inactive ; paiement à la requête et à la durée | Lambda derrière API Gateway pour une API avec de longues périodes calmes |
| Microservices | Chaque composant se met à l'échelle séparément au lieu de mettre à l'échelle tout le monolithe pour un seul chemin sollicité | Service de redimensionnement d'images sur Spot, service de catalogue sur Fargate |

Autres techniques :

- **Découpler avec des files d'attente** (SQS) : les workers se mettent à l'échelle selon la profondeur de la file et peuvent tourner sur Spot ; aucune capacité n'est gardée pour les pics.
- **Traitement événementiel** : événement S3 → Lambda au lieu d'une instance qui interroge sans cesse pour trouver les nouveaux fichiers.
- **Fenêtres batch** : exécutez les traitements non urgents en lots avec AWS Batch sur Spot plutôt que sur des serveurs toujours actifs.
- **Consolider** les instances peu utilisées : plusieurs VM sous-utilisées peuvent devenir des conteneurs sur moins d'hôtes.

> **Piège d'examen.** « Les instances tournent à 5 % de CPU la majeure partie de la journée et traitent un fichier quelques fois par heure » n'est pas une question de dimensionnement : la réponse la plus rentable consiste en général à remplacer les instances par une fonction Lambda déclenchée par l'événement.

<!-- section: scaling | objectives: 4.2.9, 4.2.11 -->
## Stratégies de mise à l'échelle : horizontale, verticale et mise en veille prolongée

| Méthode | Comment | Avantages | Inconvénients |
| --- | --- | --- | --- |
| Verticale (scale up) | Passer à un type d'instance plus grand | Aucune modification de l'application ; adaptée à une base de données unique ou un monolithe ancien | Exige un arrêt puis un démarrage (interruption) ; plafonnée par la plus grande taille ; vous payez la taille de pointe en permanence |
| Horizontale (scale out) | Ajouter ou retirer des instances, en général avec un groupe Auto Scaling derrière un équilibreur de charge | Suit la demande, survit aux pannes d'instance et de zone, peut mêler du Spot | L'application doit être sans état (sessions dans ElastiCache ou DynamoDB) |

Politiques EC2 Auto Scaling :

| Politique | À utiliser quand |
| --- | --- |
| Suivi de cible (target tracking) | Maintenir une métrique à une cible (CPU moyen à 50 %, requêtes par cible) ; choix recommandé par défaut |
| Mise à l'échelle par étapes (step scaling) | Ajustements différents selon l'ampleur du dépassement de l'alarme |
| Mise à l'échelle simple (simple scaling) | Un ajustement, puis un temps de stabilisation avant le suivant |
| Mise à l'échelle planifiée (scheduled scaling) | Modèles connus : augmenter à 8 h, réduire à 20 h ; ramener le hors-production à zéro la nuit |
| Mise à l'échelle prédictive (predictive scaling) | Cycles quotidiens ou hebdomadaires récurrents : lance la capacité avant la charge prévue |

Réduire la capacité retire de la capacité payée : fixez un minimum réaliste (deux instances dans deux zones pour la production ; zéro est possible hors production).

Les **démarrages longs** poussent les équipes à surprovisionner. Deux réponses économiques :

- **Pools d'instances préchauffées** (warm pools) : des instances préinitialisées gardées à côté du groupe Auto Scaling à l'état Stopped (le moins cher : vous ne payez que les volumes EBS et les adresses IP Elastic) ou Hibernated, mises en service quand le groupe monte en charge. Des instances préchauffées à l'état Running sont déconseillées, car elles sont facturées comme des instances normales.
- **Mise en veille prolongée EC2** (hibernation) : enregistre la RAM sur le volume racine EBS et reprend les processus et les caches au démarrage. Aucuns frais d'instance pendant la veille ; vous payez le stockage EBS, contenu de la RAM compris. Prérequis : activée **au lancement** (pas sur une instance existante), volume racine EBS chiffré et assez grand pour la RAM, RAM inférieure à 150 Gio sous Linux (16 Gio ou moins sous Windows), une famille prise en charge (par exemple M5, C5, R5, T3), pas de bare metal. Pour Spot, la demande doit être persistante.

```bash
aws ec2 run-instances --image-id ami-0abcdef1234567890 --instance-type m5.large \
  --hibernation-options Configured=true \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"Encrypted":true}}]'
aws ec2 stop-instances --instance-ids i-0123456789abcdef0 --hibernate
```

> **Piège d'examen.** « Conserver l'état en mémoire et reprendre vite, sans rien payer en calcul pendant la pause » correspond à la mise en veille prolongée, pas à l'arrêt (qui perd la RAM) ni à une instance plus petite. La mise en veille prolongée ne s'active pas après coup : l'instance doit être relancée avec l'option activée.

<!-- section: load-balancing | objectives: 4.2.10 -->
## Choisir une stratégie de répartition de charge

| | Application Load Balancer | Network Load Balancer | Gateway Load Balancer |
| --- | --- | --- | --- |
| Couche | 7 (HTTP, HTTPS, gRPC) | 4 (TCP, UDP, TLS) | Passerelle de couche 3 plus répartition de couche 4 (paquets IP) |
| Routage | Chemin, hôte, en-tête HTTP, méthode, chaîne de requête, IP source | Port et protocole | Tout le trafic vers une flotte d'appliances, GENEVE sur le port 6081 |
| Cibles | Instances, adresses IP, fonctions Lambda, tâches ECS | Instances, adresses IP, un Application Load Balancer | Instances, adresses IP (appliances virtuelles) |
| IP statique | Non (nom DNS) | Oui, une par zone, IP Elastic possible | Atteint via des points de terminaison Gateway Load Balancer |
| Atouts | Authentification des utilisateurs (Cognito, OIDC), WebSockets, HTTP/2 | Performances extrêmes, latence très faible, IP source préservée | Pare-feu tiers, IDS/IPS, inspection approfondie des paquets insérés de façon transparente |
| Usage typique à l'examen | Applications web et microservices | Jeux, IoT, flux financiers, partenaires qui autorisent des IP précises | Appliances d'inspection centralisées |

Considérations de coût :

- Chaque équilibreur de charge est facturé à l'heure plus des unités de capacité. **Un seul ALB avec des règles par hôte et par chemin** peut servir plusieurs applications ou microservices au lieu d'un ALB chacun.
- Un ALB peut appeler des **cibles Lambda** : une API HTTP peu utilisée n'a besoin d'aucune instance en cours d'exécution.
- Quand des clients exigent des adresses IP fixes pour une application HTTP, placez l'**ALB derrière un NLB** (ALB comme cible du NLB) plutôt que d'exécuter des proxys sur EC2.
- La terminaison TLS sur l'ALB ou le NLB décharge les cibles du chiffrement, qui peuvent alors être plus petites.
- Le Classic Load Balancer est une ancienne génération ; ne le choisissez pas pour une nouvelle conception.

> **Piège d'examen.** Le routage par chemin (`/api/*` vers un groupe cible, `/images/*` vers un autre) n'existe que sur l'ALB. Un énoncé qui l'exige avec de l'UDP ne se résout pas avec un seul équilibreur de charge ; un énoncé qui exige des IP statiques et le routage par chemin correspond à un NLB devant un ALB.

<!-- section: key-points -->
## Points clés

- Famille selon le goulet d'étranglement : C calcul, R/X mémoire, I/D stockage local, P/G accélérateurs, M équilibrée, T presque toujours inactive avec des pics ; `g` = Graviton pour un meilleur rapport prix/performances.
- Chaque taille double les ressources et le prix ; dimensionnez sur les pointes, avec Compute Optimizer et l'agent CloudWatch pour la mémoire.
- Supprimez la capacité inactive avec les conteneurs (regroupement dense, Fargate), le sans serveur (Lambda) et des microservices mis à l'échelle séparément.
- La mise à l'échelle horizontale avec suivi de cible, planification et prédiction vaut mieux qu'un surdimensionnement vertical permanent ; la mise à l'échelle verticale exige un arrêt.
- Les pools préchauffés (Stopped ou Hibernated) et la mise en veille prolongée traitent les démarrages longs sans payer d'instances en cours d'exécution.
- ALB pour le routage de couche 7 et les cibles Lambda, NLB pour TCP/UDP et les IP statiques, GWLB pour les appliances en ligne ; regroupez les applications derrière un seul ALB.
