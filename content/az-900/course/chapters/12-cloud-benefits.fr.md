L'examen nomme huit avantages du cloud, regroupés par paires. Les questions donnent une courte situation et demandent quel avantage elle illustre : les définitions ci-dessous doivent donc être précises dans votre esprit.

<!-- section: availability-scalability | objectives: 1.2.1 -->
## Haute disponibilité et scalabilité

La **haute disponibilité** signifie que les ressources sont disponibles quand on en a besoin, quelle que soit la perturbation. Azure l'exprime dans des **contrats de niveau de service** (SLA) : un pourcentage garanti de temps de fonctionnement, comme 99,9 % ou 99,99 %. Plus le pourcentage est élevé, plus il faut de redondance et plus cela coûte.

La **scalabilité** est la capacité à ajuster les ressources à la demande : plus de ressources quand le trafic atteint un pic, moins quand il retombe, pour ne pas payer de capacité inutilisée.

| Direction | Ce qui change | Exemple |
| --- | --- | --- |
| Mise à l'échelle **verticale** : scale-up ou scale-down | La **puissance** d'une ressource | Donner plus de processeurs ou de mémoire à une machine virtuelle |
| Mise à l'échelle **horizontale** : scale-out ou scale-in | Le **nombre** de ressources | Ajouter des machines virtuelles ou des conteneurs derrière un équilibreur de charge |

L'**élasticité** est la scalabilité rendue automatique : la plateforme ajoute et retire des ressources d'elle-même quand la charge varie.

> **Piège d'examen.** « Ajouter des processeurs au serveur » est vertical ; « ajouter des serveurs » est horizontal. La haute disponibilité consiste à rester en service ; la scalabilité à absorber la charge. Une question sur un pic de trafic pointe vers la scalabilité, une question sur une panne vers la disponibilité.

<!-- section: reliability-predictability | objectives: 1.2.2 -->
## Fiabilité et prévisibilité

La **fiabilité** est la capacité d'un système à se remettre d'une défaillance et à continuer de fonctionner. Le cloud la favorise par conception : les ressources peuvent être déployées dans plusieurs régions du monde, de sorte que si une région subit un événement catastrophique, une autre continue de tourner.

La **prévisibilité** permet d'avancer avec confiance. Elle a deux faces :

| Type | Sens | Ce qui l'apporte |
| --- | --- | --- |
| Prévisibilité des **performances** | Connaître les ressources nécessaires pour offrir une bonne expérience aux clients | Mise à l'échelle automatique, équilibrage de charge, haute disponibilité |
| Prévisibilité des **coûts** | Connaître ou prévoir ce que le cloud coûtera | Suivi en temps réel de l'utilisation des ressources, analyse des coûts, calculatrice de prix |

<!-- section: security-governance | objectives: 1.2.3 -->
## Sécurité et gouvernance

**Gouvernance.** Que vous déployiez de l'infrastructure ou des logiciels, les fonctionnalités du cloud vous aident à respecter les normes de l'entreprise et la réglementation :

- Les modèles font que chaque ressource déployée respecte vos normes.
- L'audit fondé sur des stratégies signale les ressources non conformes et peut les corriger.
- Mettre à jour une norme met à jour ce qui est déployé à partir d'elle.

**Sécurité.** Vous choisissez le niveau de contrôle qui correspond à vos besoins :

- Avec IaaS, vous gérez vous-même les systèmes d'exploitation et les logiciels, correctifs compris : contrôle maximal.
- Avec PaaS et SaaS, le fournisseur s'occupe des correctifs et de la maintenance.
- Le cloud est conçu pour résister à des attaques comme le déni de service distribué (DDoS) et fournit des outils de sécurité que vous devriez sinon construire.

<!-- section: manageability | objectives: 1.2.4 -->
## Facilité de gestion

L'examen distingue deux sortes de facilité de gestion :

| Type | Porte sur | Exemples |
| --- | --- | --- |
| Gestion **du** cloud | La gestion de vos ressources cloud | Mettre automatiquement à l'échelle les déploiements selon le besoin ; déployer des ressources à partir d'un modèle préconfiguré ; surveiller l'intégrité des ressources et remplacer automatiquement celles qui défaillent ; recevoir des alertes automatiques fondées sur des métriques |
| Gestion **dans** le cloud | La façon de gérer votre environnement cloud | Un portail web ; une interface en ligne de commande ; des API ; PowerShell |

<!-- section: key-points -->
## Points clés

- Haute disponibilité = rester disponible, mesurée par les SLA. Scalabilité = s'ajuster à la demande.
- Vertical : plus de puissance pour une ressource. Horizontal : plus de ressources.
- Fiabilité = se remettre des défaillances, aidée par les déploiements dans plusieurs régions.
- Prévisibilité des performances (mise à l'échelle automatique, équilibrage de charge) et des coûts (suivi, prévision).
- Gouvernance par les modèles et les stratégies ; sécurité avec un niveau de contrôle qui dépend du type de service.
- Gestion du cloud (automatisation des ressources) contre gestion dans le cloud (portail, CLI, API, PowerShell).
