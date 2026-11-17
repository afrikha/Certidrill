Avant de déployer le moindre hôte de session, vous décidez où vivent les ressources, quel Windows tourne sur les hôtes, comment les utilisateurs sont licenciés, quel type de pool d'hôtes les sert et combien de machines virtuelles de quelle taille il lui faut. Les questions d'examen décrivent une population d'utilisateurs et une contrainte (coût, isolation, clients externes, graphisme, pic de connexions) et demandent le système d'exploitation, la licence, le type et les paramètres du pool d'hôtes, ou le nombre et la taille des hôtes.

<!-- section: resource-organization | objectives: 1.3.1 -->
## Groupes de ressources, abonnements et groupes d'administration

Une organisation type en entreprise sépare les ressources par cycle de vie et par responsable :

| Niveau | Contenu |
| --- | --- |
| Groupe d'administration | Les abonnements de la zone d'atterrissage Azure Virtual Desktop, sous la hiérarchie de groupes d'administration de la plateforme : Azure Policy et Azure RBAC attribués une fois pour tous les abonnements, présents et futurs |
| Abonnements de plateforme | Connectivité (réseau virtuel hub, Pare-feu Azure, passerelle VPN ou ExpressRoute), identité (contrôleurs de domaine ou Microsoft Entra Domain Services), gestion |
| Abonnement de services partagés | Azure Compute Gallery, espaces de travail Log Analytics, règles de collecte de données, automatisation |
| Abonnements de charge de travail | Hôtes de session, comptes de stockage, coffres de clés, points de terminaison privés ; l'échelle décide de leur nombre |

Dans un abonnement de charge de travail, utilisez un groupe de ressources par cycle de vie et par région :

| Groupe de ressources | Contenu | Pourquoi le séparer |
| --- | --- | --- |
| Objets du service | Pools d'hôtes, groupes d'applications, espaces de travail, plans de mise à l'échelle | Métadonnées légères et durables ; à déléguer aux administrateurs Azure Virtual Desktop |
| Calcul du pool | Machines virtuelles des hôtes de session, disques, interfaces réseau | Reconstruit à chaque mise à jour d'image ; supprimé et recréé sans toucher au reste |
| Stockage | Comptes de stockage des profils et d'App attach, ou comptes NetApp | Contient les données utilisateur : protégez-le par un verrou et des rôles plus stricts |
| Réseau | Réseau virtuel spoke, NSG, tables de routage | Souvent géré par l'équipe réseau |

Les règles qui décident des réponses :

- Les métadonnées des pools d'hôtes, des groupes d'applications et des espaces de travail sont stockées dans la zone géographique de la région choisie (étendue de déploiement **géographique**, par défaut), ou dans cette seule région (étendue **régionale**, proposée dans quelques régions). Les hôtes de session peuvent s'exécuter dans n'importe quelle région.
- Gardez les hôtes de session d'un pool dans une seule région, près des utilisateurs, avec leur réseau virtuel, le stockage des profils et les images. Pour des utilisateurs répartis sur deux régions, créez un pool d'hôtes par région.
- Microsoft recommande au plus **5 000 machines virtuelles par abonnement et par région** ; au-delà, ajoutez des abonnements en spokes appairés au hub, ou utilisez une autre région.
- Limites du service : 10 000 hôtes de session par pool d'hôtes, 500 RemoteApp par groupe d'applications, 200 attributions de rôles par objet Azure Virtual Desktop.
- Les préfixes de nom des hôtes de session ne peuvent pas dépasser 11 caractères : Azure ajoute un suffixe et le nom NetBIOS est limité à 15 caractères.
- Les étiquettes (centre de coûts, environnement, responsable) alimentent les filtres de Cost Management et l'automatisation.

> **Piège d'examen.** Une question qui demande où attribuer une stratégie ou un rôle « pour tous les abonnements Azure Virtual Desktop, y compris ceux créés plus tard » attend le groupe d'administration, pas chaque abonnement.

<!-- section: operating-system | objectives: 1.3.2 -->
## Choisir le système d'exploitation des hôtes de session

Systèmes d'exploitation pris en charge pour les hôtes de session, 64 bits uniquement :

| Système d'exploitation | Sessions par hôte | Usage type |
| --- | --- | --- |
| Windows 11 Entreprise multisession | Plusieurs | Pools d'hôtes regroupés : le choix par défaut |
| Windows 11 Entreprise | Une | Pools d'hôtes personnels |
| Windows 10 Entreprise multisession et Windows 10 Entreprise | Plusieurs / une | Déploiements existants uniquement |
| Windows Server 2025, 2022, 2019, 2016 | Plusieurs | Applications qui exigent un système serveur, ou organisations licenciées avec des CAL RDS |

Non pris en charge pour les hôtes de session : éditions 32 bits, éditions N, KN et LTSC, disques Ultra comme disque du système d'exploitation, disques de système d'exploitation éphémères, groupes de machines virtuelles identiques et machines virtuelles Azure Arm64.

| Exigence | Réponse |
| --- | --- |
| Beaucoup d'utilisateurs, expérience Windows client, coût par utilisateur le plus bas | Windows 11 Entreprise multisession, regroupé |
| Un utilisateur a besoin de droits d'administrateur local ou d'une machine dédiée et persistante | Windows 11 Entreprise, personnel |
| Un éditeur ne prend en charge que Windows Server, ou les utilisateurs sont licenciés avec des CAL RDS | Windows Server 2025 |
| Les utilisateurs ont Microsoft 365 E3 et ont besoin des Microsoft 365 Apps | Image Windows 11 Entreprise multisession avec Microsoft 365 Apps de la Place de marché Azure |

Windows 10 a atteint la fin de son support le 14 octobre 2025. Les hôtes de session Windows 10 dans Azure Virtual Desktop sont éligibles aux mises à jour de sécurité étendues (ESU) sans licence supplémentaire, en version 22H2, mais Microsoft recommande de ne les utiliser que lorsqu'une dépendance applicative ou matérielle empêche le passage à Windows 11.

> **Piège d'examen.** Windows 11 Entreprise multisession n'est pas Windows Server : il est couvert par le droit Windows client des utilisateurs (Microsoft 365 E3, E5, F3...), pas par des CAL RDS. C'est un hôte de session Windows Server qui exige des CAL RDS.

<!-- section: licensing | objectives: 1.3.3 -->
## Choisir un modèle de licence

| Système de l'hôte de session | Utilisateurs internes (employés, étudiants, prestataires) | Utilisateurs externes (clients de votre application SaaS) |
| --- | --- | --- |
| Windows 11 ou 10 Entreprise, mono-session ou multisession | Microsoft 365 E3, E5, A3, A5, F3, Business Premium, Student Use Benefit ; Windows Entreprise E3, E5 ; Windows Éducation A3, A5 ; Windows VDA par utilisateur | Tarification de l'accès par utilisateur, en inscrivant l'abonnement Azure |
| Windows Server 2016 à 2025 | CAL RDS avec Software Assurance (par utilisateur ou par appareil), ou licences d'abonnement utilisateur RDS | Non pris en charge : la tarification par utilisateur n'est pas disponible pour Windows Server |

La licence n'accorde que des droits d'accès. Le calcul, le stockage et le réseau sont toujours facturés par Azure en plus.

La **tarification de l'accès par utilisateur** est réservée aux usages commerciaux externes :

- Inscrivez l'abonnement Azure ; les frais apparaissent sur sa facture.
- Un utilisateur n'est facturé d'un prix mensuel forfaitaire que s'il se connecte au moins une fois dans le mois de facturation : niveau **Apps** s'il n'a utilisé que des RemoteApp, niveau **Desktops + apps** s'il a utilisé un bureau complet.
- Au plus un frais par utilisateur et par période de facturation, même sur plusieurs abonnements du locataire.
- Elle couvre les droits d'accès à Azure Virtual Desktop et FSLogix, pas les Microsoft 365 Apps, Microsoft Defender XDR ni l'impression universelle.
- Un abonnement inscrit facture aussi les utilisateurs qui détiennent déjà une licence éligible : placez les utilisateurs internes dans un abonnement distinct, non inscrit.

Autres règles :

- Les collaborateurs externes (invités, B2B) relèvent de l'usage interne : attribuez-leur une licence éligible dans votre locataire. Une licence dans leur locataire d'origine ne compte pas, et la tarification par utilisateur n'est pas un moyen de licencier des invités.
- Les hôtes de session doivent porter le bon type de licence et être activés. Le portail applique `Windows_Client` automatiquement ; pour les machines virtuelles Windows client créées avec PowerShell ou Azure CLI, réglez-le vous-même.
- Les hôtes de session Windows Server ont besoin d'un serveur de licences RDS accessible depuis les hôtes de session.
- Les abonnements Azure Dev/Test permettent aux utilisateurs de se connecter pour des tests d'acceptation sans licence distincte.

```powershell
$vm = Get-AzVM -ResourceGroupName "rg-avd-pool-compute" -Name "avd-sh-0"
$vm.LicenseType = "Windows_Client"
Update-AzVM -ResourceGroupName "rg-avd-pool-compute" -VM $vm
```

> **Piège d'examen.** « Contoso vend l'accès à son application de comptabilité à des entreprises externes » signifie tarification de l'accès par utilisateur sur des hôtes de session Windows client. Si l'application exige Windows Server, il n'existe aucune option par utilisateur conforme dans Azure Virtual Desktop.

<!-- section: host-pool-architecture | objectives: 1.3.4 -->
## Planifier l'architecture du pool d'hôtes

| Caractéristique | Regroupé | Personnel |
| --- | --- | --- |
| Utilisateurs par hôte de session | Plusieurs, jusqu'à la limite maximale de sessions | Un |
| Équilibrage de charge | Breadth-first ou depth-first | Aucun : l'utilisateur revient toujours sur son hôte attribué |
| Attribution | Aucune : n'importe quel hôte | Automatique (premier hôte disponible) ou directe (un administrateur attribue l'hôte) |
| Données utilisateur | Conteneurs FSLogix | Peuvent rester sur le disque du système d'exploitation |
| Mises à jour | Redéploiement des hôtes depuis une image mise à jour | Windows Update, Configuration Manager ou d'autres outils |
| Groupes d'applications | Bureau et RemoteApp | Bureau |

L'équilibrage de charge d'un pool d'hôtes regroupé :

- **Breadth-first** (largeur d'abord) répartit les nouvelles sessions : il choisit au hasard parmi la moitié des hôtes disponibles qui ont le moins de sessions. Aucune limite de sessions n'est exigée ; un pool d'hôtes créé en breadth-first reçoit une **limite maximale de sessions** de 999999 par défaut, la valeur la plus élevée.
- **Depth-first** (profondeur d'abord) remplit un hôte jusqu'à la limite maximale de sessions, puis le suivant. Une limite maximale de sessions est obligatoire. Il occupe moins d'hôtes, que la mise à l'échelle automatique peut éteindre.
- Quand tous les hôtes atteignent la limite, les nouveaux utilisateurs ne peuvent plus se connecter : relevez la limite ou ajoutez des hôtes. Abaisser la limite n'affecte pas les sessions existantes.
- Le **mode drainage** d'un hôte y bloque les nouvelles sessions, mais un utilisateur qui y a une session existante ou déconnectée y est toujours renvoyé.

Autres choix de conception :

- **Groupes d'applications** : un seul groupe d'applications de bureau par pool d'hôtes, plusieurs groupes RemoteApp. Si un utilisateur reçoit les deux types sur le même pool d'hôtes, seul le **type de groupe d'applications préféré** s'affiche. Chaque groupe d'applications appartient à un seul espace de travail.
- **Approche de gestion**, choisie à la création et jamais modifiable : **configuration d'hôte de session** (regroupé uniquement : le service crée, met à jour et met à l'échelle les hôtes à partir d'une configuration d'image, de taille, de jonction et de réseau) ou **standard** (vous gérez les hôtes avec vos propres outils et des jetons d'inscription).
- **Environnement de validation** : un pool d'hôtes marqué comme validation reçoit les mises à jour du service en premier. Rendez-le semblable à la production et utilisez-le régulièrement.
- Tous les hôtes d'un pool doivent provenir de la même image. Des applications, des tailles ou des types d'identité différents imposent des pools d'hôtes différents.

| Exigence | Réponse |
| --- | --- |
| 300 agents de centre d'appels avec les mêmes applications, coût le plus bas | Regroupé, Windows 11 multisession, depth-first avec mise à l'échelle automatique |
| Des développeurs qui installent leurs propres outils et ont besoin de droits d'administrateur | Personnel, attribution directe ou automatique |
| Répartir les utilisateurs uniformément pour les meilleures performances par utilisateur | Regroupé, breadth-first |
| Publier seulement une application métier pour les utilisateurs de la finance | Groupe d'applications RemoteApp sur un pool d'hôtes regroupé |
| Tester les mises à jour de l'agent et du service avant la production | Un pool d'hôtes de validation |

> **Piège d'examen.** Depth-first sans limite maximale de sessions correcte met tout le monde sur le premier hôte. Breadth-first ignore la limite tant que les hôtes ne sont pas pleins ; depth-first en dépend.

<!-- section: performance | objectives: 1.3.5 -->
## Concevoir pour les performances

Base de dimensionnement multisession (points de départ de Microsoft, à valider par un pilote) :

| Charge de travail | Exemples d'utilisateurs | Utilisateurs max par vCPU | Hôte minimal | Exemples de tailles |
| --- | --- | --- | --- | --- |
| Légère | Saisie de données simple | 6 | 8 vCPU, 16 Go de RAM | D8s_v5, D8as_v4, F8s_v2 |
| Moyenne | Consultants, Word, pages web statiques | 4 | 8 vCPU, 16 Go de RAM | D8s_v5, D16s_v5 |
| Lourde | Ingénieurs, Outlook, PowerPoint, web dynamique | 2 | 8 vCPU, 16 Go de RAM | D8s_v5, D16s_v5 |
| Intensive (Power) | Graphistes, CAO, montage vidéo | 1 | 6 vCPU, 56 Go de RAM | D16ds_v5, série NV |

Base mono-session (personnel) : 2 vCPU et 8 Go pour une charge légère, 4 vCPU et 16 Go pour une charge moyenne, 8 vCPU et 32 Go pour une charge lourde.

Règles pour les hôtes multisession :

- Au moins 4 cœurs (les hôtes à 2 cœurs sont instables avec plusieurs utilisateurs), au plus 32 ; 4 à 24 vCPU donnent le meilleur rendement. Doubler les cœurs ne multiplie la capacité que par 1,5 à 1,9.
- À partir de 20 utilisateurs, plusieurs petits hôtes font mieux qu'un gros, et ils sont plus faciles à drainer, à mettre à jour et à éteindre.
- L'ouverture de session est gourmande en processeur : gardez de la marge pour le pic du matin.
- Le stockage des profils fait partie des performances : Azure Files premium ou Azure NetApp Files, dans la région des hôtes.

**GPU** pour les applications graphiques intensives (3D, CAO, vidéo) ou quand la résolution d'affichage totale dépasse 3840 × 2160, seuil où l'encodage par le processeur commence à produire des artefacts :

| Série de machines virtuelles | Rendu | Encodage |
| --- | --- | --- |
| NVadsA10 v5, NVv3, NCasT4_v3 | Oui | HEVC/H.265 et AVC/H.264 |
| NVv4 | Oui | AVC/H.264 uniquement |

- Évitez NC, NCv2, NCv3, ND et NDv2 : conçues pour le calcul, elles n'accélèrent pas le bureau Windows.
- Les tailles NVIDIA exigent le pilote **GRID** (l'extension NVIDIA GPU Driver l'installe), pas CUDA ; les tailles AMD exigent le pilote AMD distribué par Azure.
- Activez les stratégies **Use hardware graphics adapters for all Remote Desktop Services sessions** et **Configure H.264/AVC hardware encoding for Remote Desktop connections**, puis redémarrez les hôtes.

> **Conseil d'examen.** « Les utilisateurs exécutent une application de CAO et se plaignent d'un affichage saccadé » appelle un hôte GPU de série NV avec le pilote GRID et les stratégies de rendu et d'encodage matériels, pas davantage de vCPU.

<!-- section: vm-capacity | objectives: 1.3.6 -->
## Concevoir pour la capacité des machines virtuelles

Partez de la simultanéité, pas de l'effectif :

1. **Utilisateurs simultanés** au pic : 1 000 employés dont 60 % connectés à 10 h, soit 600 sessions.
2. **Utilisateurs par hôte** : charge moyenne, 4 utilisateurs par vCPU, D8s_v5 (8 vCPU) : 32 utilisateurs par hôte.
3. **Hôtes** : 600 ÷ 32 = 18,75, donc 19 hôtes, plus une marge pour un hôte en mode drainage ou en cours de mise à jour : 20.
4. **Quota** : 20 × 8 = 160 vCPU de la famille DSv5 dans la région. Vérifiez les quotas de vCPU régionaux et par famille de l'abonnement et demandez une augmentation avant le déploiement.
5. **Limite maximale de sessions** : 32, utilisée par depth-first et par la mise à l'échelle automatique pour décider quand démarrer un autre hôte.

Un pool d'hôtes personnel exige une machine virtuelle par utilisateur, actif ou non : 200 développeurs, ce sont 200 machines virtuelles. Start VM on Connect et la mise à l'échelle automatique des pools d'hôtes personnels limitent le coût en libérant les machines inactives.

| Exigence | Réponse |
| --- | --- |
| La capacité suit les heures de bureau | Plan de mise à l'échelle (mise à l'échelle automatique) avec des phases de montée en charge, de pointe, de réduction et d'heures creuses |
| Résister à la perte d'un centre de données | Répartir les hôtes de session entre les zones de disponibilité |
| Plus de 5 000 machines virtuelles dans une région | Plusieurs abonnements, ou une seconde région |
| Des utilisateurs en Europe et en Amérique du Nord | Un pool d'hôtes par région, chacun avec son stockage, près de ses utilisateurs |

> **Piège d'examen.** Le quota de vCPU régional compte les cœurs des machines virtuelles déployées, allouées ou libérées. Les hôtes que la mise à l'échelle automatique éteint consomment toujours du quota : prévoyez-le pour tous les hôtes du pool, pas pour ceux qui tournent en heures creuses.

<!-- section: key-points -->
## Points clés

- Séparez les groupes de ressources par cycle de vie : objets du service, calcul, stockage, réseau ; gouvernance au niveau du groupe d'administration.
- Jusqu'à 5 000 machines virtuelles par abonnement et par région ; 10 000 hôtes de session par pool d'hôtes ; préfixe de nom d'hôte de 11 caractères au plus.
- Windows 11 Entreprise multisession pour le regroupé, Windows 11 Entreprise pour le personnel, Windows Server quand une application ou des licences CAL RDS l'exigent.
- Utilisateurs internes : licences Windows client par utilisateur éligibles, ou CAL RDS pour Windows Server. Utilisateurs externes : tarification de l'accès par utilisateur, Windows client uniquement.
- Breadth-first répartit, depth-first remplit jusqu'à la limite maximale de sessions ; les pools personnels utilisent l'attribution automatique ou directe.
- La configuration d'hôte de session est réservée aux pools regroupés et se choisit à la création.
- Dimensionnez à partir de la simultanéité de pointe : utilisateurs par vCPU, 4 à 24 vCPU par hôte, marge, quota de vCPU ; GPU (série NV, pilote GRID) pour le graphisme.
