Au niveau professionnel, la tarification est une décision d'architecture prise pour toute une organisation : quels engagements l'équipe financière centrale achète et comment ils profitent à des dizaines de comptes, quel environnement d'exécution utilise une charge de travail (Graviton, Lambda, Step Functions Standard ou Express, Fargate Spot), comment la capacité suit la demande et comment une fonctionnalité d'IA est facturée au jeton. Les questions donnent des courbes d'utilisation, une tolérance aux interruptions, des échéances et des contraintes de propriété, et seul le qualificatif (« MOST cost-effective », « LEAST operational overhead », « sans engagement à long terme ») départage deux conceptions viables.

<!-- section: purchase-portfolio | objectives: 3.1.1 -->
## Construire un portefeuille d'achats

Raisonnez par couches, de l'usage le plus prévisible au moins prévisible :

| Couche d'usage | Option d'achat | Pourquoi |
| --- | --- | --- |
| Socle qui tourne 24 h/24 pendant au moins un an | Savings Plans ou Reserved Instances | Remise la plus forte pour un engagement horaire fixe |
| Variation quotidienne ou saisonnière au-dessus du socle | On-Demand, avec mise à l'échelle | Aucun engagement perdu quand l'usage baisse |
| Travail interruptible et relançable | Spot Instances, Fargate Spot | Capacité inutilisée à prix très réduit |
| Capacité qui doit exister à un moment donné | On-Demand Capacity Reservations, RI zonales, Capacity Blocks for ML | Garantit la capacité ; la remise ne vient que d'un engagement distinct |
| Débit réservé dans un service géré | Capacité provisionnée (DynamoDB en mode provisionné avec capacité réservée, niveau Reserved ou Provisioned Throughput de Bedrock) | Prix unitaire plus bas ou débit garanti pour une demande stable |

Types de Savings Plans et leur portée :

| Plan | Jusqu'à | Couvre | Flexibilité de l'engagement |
| --- | --- | --- | --- |
| Compute Savings Plans | 66 % | EC2 quels que soient la famille, la taille, l'OS, la location (tenancy) ou la Région ; Fargate ; Lambda | La plus élevée |
| EC2 Instance Savings Plans | 72 % | Une famille d'instances dans une Région, toute taille, tout OS, toute location | Famille et Région fixées |
| SageMaker AI Savings Plans | 64 % | Usage d'instances SageMaker AI, toute famille, taille, Région ou composant | Dans SageMaker AI uniquement |
| Database Savings Plans | 35 % | Dernières générations provisionnées et usage sans serveur d'Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS, OpenSearch Service | Durée d'un an, tout moteur, famille, taille, zone de disponibilité ou Région |

Application et partage des remises :

- Dans une organisation, les remises des Reserved Instances s'appliquent d'abord, puis les EC2 Instance Savings Plans, puis les Compute Savings Plans. L'engagement est un montant en dollars par heure ; l'usage au-delà est facturé On-Demand, et l'engagement inutilisé reste facturé.
- Avec la facturation consolidée, les RI et Savings Plans d'un compte peuvent profiter aux autres ; le partage peut être désactivé pour un compte (par exemple une unité opérationnelle qui doit garder ses propres remises pour la refacturation).
- Les conditions d'un Savings Plan ne peuvent pas être modifiées après l'achat. Les RI Standard peuvent être revendues sur le Reserved Instance Marketplace ; les RI Convertible peuvent être échangées mais pas revendues.
- Les frais des Dedicated Instances (2 USD par heure et par Région) et les frais de cluster Amazon EKS ne sont pas réduits par les Savings Plans ; les nœuds de travail EC2, si.

Modèle professionnel courant : une équipe centrale de gestion financière du cloud achète des Compute Savings Plans dans un compte dédié, au niveau du socle de toute l'organisation indiqué par les recommandations de Cost Explorer, et laisse les équipes utiliser n'importe quelle famille d'instances, Région ou Fargate. Les équipes certaines de rester sur une famille dans une Région ajoutent des EC2 Instance Savings Plans.

> **Piège d'examen.** Une Capacity Reservation réserve de la capacité au prix On-Demand ; ce n'est pas une remise. Quand l'énoncé exige à la fois une capacité garantie pour un lancement et un prix plus bas, combinez une On-Demand Capacity Reservation avec un Savings Plan ou une RI régionale. Une RI zonale donne aussi les deux, mais pour un seul type d'instance dans une seule zone.

<!-- section: spot-at-scale | objectives: 3.1.1 -->
## La capacité Spot à grande échelle

Spot se choisit pour le travail interruptible : niveaux web sans état au-dessus d'une base, consommateurs de files d'attente, CI, rendu, big data, traitements par lots avec points de reprise. Une conception professionnelle supprime les points uniques qui font échouer Spot :

- **Diversifiez** sur de nombreux types d'instances et toutes les zones de disponibilité. La sélection des types d'instances par attributs (plages de vCPU et de mémoire au lieu d'une liste) permet à un groupe Auto Scaling ou à EC2 Fleet d'utiliser automatiquement les nouveaux types.
- Utilisez la stratégie d'allocation **`price-capacity-optimized`**, qui choisit, parmi les pools les moins chers, ceux qui risquent le moins d'être interrompus.
- Activez le **Capacity Rebalancing** pour que le groupe lance un remplaçant dès qu'EC2 envoie une recommandation de rééquilibrage, avant l'avis d'interruption de deux minutes.
- Gardez l'état hors de l'instance (SQS, DynamoDB, S3) et rendez le travail idempotent pour qu'un message retraité ne cause aucun dommage.
- Faites couvrir la base On-Demand d'une politique d'instances mixtes par des Savings Plans et laissez Spot couvrir le reste.

| Énoncé de la charge de travail | Achat attendu |
| --- | --- |
| Analytique nocturne relançable, sans échéance avant le matin | Spot, diversifié, avec points de reprise |
| Service de paiement qui « ne doit pas être interrompu », charge stable | Savings Plans pour la base, On-Demand pour les pics |
| Cluster d'entraînement qui a besoin de nombreux GPU pendant deux semaines le mois prochain | Capacity Blocks for ML |
| Capacité de reprise après sinistre qui doit être disponible dans la Région de reprise | On-Demand Capacity Reservations dans cette Région |

<!-- section: workload-architecture-costs | objectives: 3.1.2 -->
## Choisir un environnement d'exécution optimisé en coûts

**Graviton.** Les instances basées sur Graviton coûtent jusqu'à 20 % de moins que des instances x86 comparables et consomment jusqu'à 60 % d'énergie en moins pour les mêmes performances. Des services gérés comme Amazon RDS, Amazon Aurora et Amazon EKS fonctionnent sur Graviton, et Lambda et Fargate proposent une architecture Arm64. Le travail de migration porte sur la compilation, pas sur l'infrastructure : les langages interprétés et Java passent généralement sans changement, le code compilé et les bibliothèques natives ont besoin d'une version Arm, et les images de conteneur doivent être publiées comme images multi-architectures dans Amazon ECR pour qu'une même balise s'exécute sur les deux. Compute Optimizer peut recommander des types Graviton.

**AWS Lambda.** Vous payez les requêtes et la durée multipliée par la mémoire configurée ; la mémoire fixe aussi la part de CPU, donc plus de mémoire peut finir plus vite pour un coût égal ou inférieur. Rien n'est facturé au repos. Les fonctions durables Lambda (durable functions) exécutent des flux en plusieurs étapes pendant jusqu'à un an avec des points de contrôle ; pendant les opérations d'attente, la fonction est suspendue sans frais de calcul, donc un flux qui attend un événement pendant des jours ne paie que son temps de traitement. AWS les positionne pour les flux étroitement liés au code de l'application, et Step Functions pour l'orchestration entre services AWS avec conception visuelle.

**AWS Step Functions.** Le type de flux de travail détermine à la fois le comportement et la facture :

| Attribut | Flux de travail Standard | Flux de travail Express |
| --- | --- | --- |
| Durée maximale | Un an | Cinq minutes |
| Facturation | Par transition d'état | Par exécution, durée et mémoire |
| Sémantique d'exécution | Exactement une fois | Au moins une fois (asynchrone), au plus une fois (synchrone) |
| Débit de transitions d'état | Soumis à quota | Sans limite |
| Modèles `.sync` (tâche) et `.waitForTaskToken` (rappel) | Pris en charge | Non pris en charge |
| Historique d'exécution | Conservé par Step Functions pendant 90 jours | Uniquement dans CloudWatch Logs, si la journalisation est activée |

| Exigence | Conception |
| --- | --- |
| Des millions d'exécutions courtes de traitement d'événements par jour | Express |
| Approbation de commande qui attend un humain jusqu'à une semaine | Standard avec un jeton de tâche de rappel |
| Étape de paiement non idempotente qui ne doit jamais s'exécuter deux fois | Standard |
| Long processus métier avec une boucle interne à fort volume | Flux parent Standard qui démarre des flux enfants Express pour la boucle interne |
| Attendre un événement externe pendant des jours dans le code d'une fonction | Fonctions durables Lambda |

> **Conseil d'examen.** Interroger en boucle (une fonction Lambda qui vérifie une tâche chaque minute, ou un flux Standard avec des états Wait et Choice) fait payer chaque vérification. Une intégration `.sync` ou un jeton de rappel permet au flux d'attendre sans payer de transitions d'interrogation.

> **Piège d'examen.** Les flux Express paraissent moins chers pour tout, mais ils ne dépassent pas cinq minutes et ne prennent en charge ni `.sync` ni le rappel. Un énoncé avec une tâche longue, une approbation humaine ou une exigence d'exécution exactement une fois demande Standard.

<!-- section: rightsizing-scaling | objectives: 3.1.3 -->
## Dimensionnement adapté et mise à l'échelle sur métriques

**AWS Compute Optimizer** analyse les instances EC2, groupes Auto Scaling, volumes EBS, fonctions Lambda, services ECS sur Fargate, licences de logiciels commerciaux, Aurora et RDS, passerelles NAT, DynamoDB, ElastiCache, MemoryDB, DocumentDB, WorkSpaces et SageMaker. Il ne fait rien tant que vous n'avez pas adhéré (opt in) ; depuis le compte de gestion, vous pouvez inscrire toute l'organisation.

| Paramètre | Options | Par défaut |
| --- | --- | --- |
| Période d'analyse (lookback) | 14 jours, 32 jours (capture les cycles mensuels), 93 jours (métriques d'infrastructure améliorées, payantes) | 14 jours |
| Seuil de CPU (EC2) | P90, P95, P99.5 | P99.5 |
| Marge de CPU (EC2) | 30 %, 20 %, 0 % | 20 % |
| Marge de mémoire (EC2) | 30 %, 20 %, 10 % | 20 % |
| Instances préférées | Un ensemble de familles choisi (par exemple celles couvertes par vos RI ou Savings Plans) | Toutes |

Les préférences se définissent au niveau de l'organisation, du compte ou de la Région. Les recommandations de mémoire exigent des métriques de mémoire issues de l'agent CloudWatch ou d'un produit d'observabilité externe. Pour la non-production, le préréglage « économies maximales » (P90, 0 % de marge CPU, 10 % de marge mémoire) donne la réduction de taille la plus agressive.

```bash
# From the management account: opt in every member account
aws compute-optimizer update-enrollment-status --status Active --include-member-accounts
```

**Politiques de mise à l'échelle.** Le dimensionnement adapté règle la taille de l'unité ; la mise à l'échelle règle le nombre d'unités.

| Profil de demande | Politique |
| --- | --- |
| Charge proportionnelle à une métrique (CPU, requêtes par cible, arriéré de file par tâche) | Suivi de cible (target tracking) |
| Calendrier connu (heures ouvrées, clôture de fin de mois) | Mise à l'échelle planifiée, y compris jusqu'à zéro la nuit pour la non-production |
| Cycle quotidien ou hebdomadaire récurrent avec des instances lentes à démarrer | Mise à l'échelle prédictive combinée au suivi de cible |
| Grands sauts soudains qui demandent des réactions selon leur ampleur | Mise à l'échelle par étapes (step scaling) |

**Fargate Spot.** Les tâches ECS sur Fargate Spot coûtent jusqu'à 70 % de moins que le prix Fargate. Quand AWS récupère la capacité, la tâche reçoit un avertissement de deux minutes, envoyé comme événement de changement d'état de tâche ECS à EventBridge et comme SIGTERM aux conteneurs ; `stopTimeout` peut aller jusqu'à 120 secondes (30 par défaut). Fargate ne remplace pas la capacité Spot par de la capacité Fargate normale : mélangez les deux dans une stratégie de fournisseurs de capacité, où un seul fournisseur peut avoir une `base` et où `weight` répartit le reste.

```bash
aws ecs create-service --cluster reporting --service-name pdf-workers \
  --task-definition pdf-worker:12 --desired-count 12 \
  --capacity-provider-strategy capacityProvider=FARGATE,base=2,weight=1 capacityProvider=FARGATE_SPOT,weight=3 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0a1b2c3d4e5f60718],securityGroups=[sg-0123456789abcdef0]}"
```

> **Piège d'examen.** Compute Optimizer recommande ; il ne redimensionne rien. Appliquer une recommandation à grande échelle exige de l'automatisation (par exemple un runbook Systems Manager Automation ou une modification de l'infrastructure en tant que code), et Auto Scaling doit toujours absorber les variations de charge une fois la nouvelle taille choisie.

<!-- section: ai-ml-costs | objectives: 3.1.4 -->
## Le coût des charges de travail d'IA et de ML

**Les niveaux de service d'Amazon Bedrock** se choisissent par requête avec le paramètre `service_tier` (`reserved`, `priority`, `default`, `flex`) ; sans lui, c'est Standard qui sert la requête.

| Niveau | Prix | Usage |
| --- | --- | --- |
| Reserved | Prix fixe par tranche de 1 000 jetons par minute, réservation d'un ou trois mois (minimum 100 000 jetons d'entrée et 10 000 jetons de sortie par minute), via l'équipe de compte | Trafic critique qui exige une capacité garantie ; le débordement passe en Standard |
| Priority | Majoration de 75 % par rapport à Standard | Appels exposés aux clients qui exigent les réponses les plus rapides sans réservation |
| Standard | Prix à la demande | Génération et analyse courantes |
| Flex | Remise de 50 % par rapport à Standard | Évaluations, résumés, étapes agentiques qui tolèrent un traitement plus long |

Autres leviers :

- **Inférence par lots** : 50 % moins chère que l'inférence à la demande pour certains modèles ; fichiers d'entrée et de sortie dans S3, notifications de tâche via EventBridge. Pour le travail hors ligne, par exemple classer une archive de documents pendant la nuit.
- **Mise en cache des invites (prompt caching)** : un long préfixe répété (invite système, définitions d'outils, un contrat chargé) est mis en cache ; les lectures du cache sont facturées à un tarif plus bas, les écritures peuvent coûter plus que l'entrée normale. Durée de vie par défaut de 5 minutes, renouvelée à chaque réussite ; certains modèles proposent 1 heure. Elle exige une taille minimale de préfixe et ne fonctionne qu'à la demande, pas par lots.
- **Intelligent Prompt Routing** : envoie chaque invite au modèle le moins cher ou le plus puissant d'une famille ; jusqu'à 30 % de coût en moins.
- **Choix du modèle** : le plus petit modèle qui atteint le niveau de qualité est la plus grande économie ; mesurez-le par des évaluations avant de vous engager.
- **Mise en cache des réponses dans l'application** : des questions identiques ou normalisées servies depuis DynamoDB ou ElastiCache évitent complètement l'appel au modèle, ce que la mise en cache des invites ne fait pas.
- **Provisioned Throughput** : unités de modèle à l'heure, sans engagement ou pour 1 ou 6 mois ; exigé pour certains modèles personnalisés, non pris en charge via les profils d'inférence. Les modèles personnalisés importés sont facturés par Custom Model Unit et par minute, par fenêtres de 5 minutes, et redescendent à zéro après 5 minutes sans appel.

**Options d'inférence d'Amazon SageMaker AI** :

| Option | Usage | Limites |
| --- | --- | --- |
| Point de terminaison en temps réel | Trafic soutenu à faible latence ; instance facturée tant qu'il tourne | Charge utile de 25 Mo, 60 s (8 minutes en streaming) |
| Inférence sans serveur | Trafic intermittent, aucun coût au repos | Charge utile de 4 Mo, 60 s |
| Inférence asynchrone | Requêtes volumineuses ou lentes mises en file ; peut redescendre à zéro | Charge utile de 1 Go, jusqu'à une heure |
| Transformation par lots (batch transform) | Jeux de données entiers hors ligne, sans point de terminaison permanent | Tourne pendant des heures ou des jours |

Les parcs de points de terminaison stables sont couverts par les SageMaker AI Savings Plans.

> **Conseil d'examen.** Faites correspondre l'exigence de latence avant le prix : « résultats attendus demain » oriente vers l'inférence par lots de Bedrock ou le niveau Flex, « les utilisateurs du chat attendent des réponses en moins d'une seconde en pointe » vers Priority ou Reserved, et « outil interne intermittent » vers Standard ou l'inférence sans serveur de SageMaker AI.

<!-- section: key-points -->
## Points clés

- Superposez les achats : engagements pour le socle 24 h/24, On-Demand pour la variation, Spot pour le travail interruptible, réservations seulement là où la capacité doit être garantie.
- Les RI s'appliquent d'abord, puis les EC2 Instance Savings Plans, puis les Compute Savings Plans ; les remises sont partagées dans l'organisation sauf si le partage est désactivé.
- Database Savings Plans : jusqu'à 35 %, un an, couvrent le sans serveur et de nombreux moteurs ; SageMaker AI Savings Plans : jusqu'à 64 %.
- Spot à grande échelle : nombreux types et zones, `price-capacity-optimized`, Capacity Rebalancing, travail sans état et idempotent.
- Graviton coûte jusqu'à 20 % de moins qu'un x86 comparable ; publiez des images multi-architectures.
- Step Functions : Standard pour le travail long, exactement une fois, avec rappel ou `.sync` ; Express pour les exécutions à fort volume de cinq minutes au plus. Les fonctions durables Lambda ne facturent pas de calcul pendant l'attente.
- Compute Optimizer : inscrivez l'organisation, 14 ou 32 jours gratuits, 93 jours payants, la mémoire exige l'agent CloudWatch ; il recommande, l'automatisation applique.
- Fargate Spot : jusqu'à 70 % de remise, avertissement de deux minutes, pas de repli automatique ; combinez-le avec Fargate dans une stratégie de fournisseurs de capacité.
- Bedrock : Flex à -50 %, Priority à +75 %, Reserved pour une capacité garantie, lots à -50 %, mise en cache des invites pour les préfixes répétés.
