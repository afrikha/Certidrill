Au niveau professionnel, les plateformes de microservices soulèvent des décisions que les questions de niveau associé ignorent : quel orchestrateur une équipe peut exploiter avec ses compétences, comment des services situés dans des VPC et des comptes différents se trouvent et s'autorisent, comment les images restent corrigées, comment chaque couche se met à l'échelle, où le trafic entre et où le code s'exécute en périphérie, et comment un produit SaaS sépare ses locataires. Ce chapitre couvre ces décisions et les pièges entre des options qui fonctionnent toutes.

<!-- section: container-orchestration | objectives: 1.1.6 -->
## Orchestration de conteneurs avec Amazon ECS, Amazon EKS et AWS Fargate

| Critère | Amazon ECS | Amazon EKS |
| --- | --- | --- |
| API et outils | Définitions de tâches et services propres à AWS | API Kubernetes, Helm, opérateurs, manifestes portables |
| Charge opérationnelle | La plus faible : aucune version de plan de contrôle à mettre à niveau | Mises à niveau de version Kubernetes et modules complémentaires à gérer (réduites par EKS Auto Mode) |
| À choisir quand | Nouveaux microservices, équipe centrée sur AWS, « LEAST operational overhead » | Compétences ou charges de travail Kubernetes existantes, portabilité multicloud, outils de l'écosystème Kubernetes |
| Autorisations des pods ou des tâches | Rôle de tâche (l'application appelle AWS) et rôle d'exécution de tâche (extraire les images, écrire les journaux) | EKS Pod Identity ou rôles IAM pour les comptes de service (IRSA) |

Options de calcul :

| Option | Qui gère les instances | À utiliser pour |
| --- | --- | --- |
| Fargate | AWS, sans serveur : un environnement isolé par tâche ou par pod | Aucune gestion d'instances ; isolation par tâche |
| Fargate Spot (ECS) | AWS, capacité inutilisée avec un préavis d'interruption de 2 minutes | Tâches tolérantes aux pannes et interruptibles, à prix réduit |
| ECS Managed Instances | AWS gère les instances EC2 ; vous choisissez leurs attributs | Souplesse d'EC2 avec une exploitation proche de Fargate |
| Fournisseur de capacité groupe Auto Scaling ECS | Vous (AMI, correctifs), ECS met le groupe à l'échelle | Contrôle complet des hôtes, agents démons |
| EKS Auto Mode | AWS : mise à l'échelle des nœuds basée sur Karpenter, nœuds immuables basés sur Bottlerocket d'une durée de vie maximale de 21 jours, équilibrage de charge, stockage en mode bloc et réseau des pods intégrés | Kubernetes avec le moins d'exploitation des nœuds |
| Groupes de nœuds gérés EKS | Vous choisissez les AMI et les versions ; EKS automatise les mises à jour des nœuds | Configuration personnalisée des nœuds |

ECS recommande les **fournisseurs de capacité** plutôt que les types de lancement : un service passe de Fargate à Managed Instances ou à des groupes Auto Scaling en changeant sa stratégie de fournisseur de capacité. Les nœuds EKS Auto Mode n'autorisent aucun accès SSH ou SSM ; la personnalisation passe par des NodePools et NodeClasses personnalisés.

> **Piège d'examen.** Le rôle d'exécution de tâche sert à l'agent ECS pour extraire les images d'Amazon ECR et envoyer les journaux ; le rôle de tâche est celui que le code applicatif utilise pour appeler DynamoDB ou S3. « Le conteneur reçoit AccessDenied en écrivant dans S3 » désigne le rôle de tâche, pas le rôle d'exécution.

<!-- section: service-mesh | objectives: 1.1.7 -->
## Communication entre services et maillage de services

AWS a mis fin à **AWS App Mesh** le 30 septembre 2026 : sa console et ses ressources ne sont plus accessibles, ce n'est donc jamais une bonne réponse. Les choix gérés sont :

| | Amazon ECS Service Connect | Amazon VPC Lattice |
| --- | --- | --- |
| Portée | Services ECS d'un espace de noms AWS Cloud Map (même Région), sur plusieurs clusters, et sur plusieurs comptes quand l'espace de noms est partagé avec AWS RAM | Services et ressources sur plusieurs VPC et comptes : EC2, tâches ECS, pods Kubernetes, Lambda, ALB, cibles IP |
| Chemin des données | Conteneur proxy géré dans chaque tâche : équilibrage de charge à tour de rôle, détection des valeurs aberrantes, délais d'expiration | Réseau de services entièrement géré ; aucun sidecar |
| Découverte | Noms courts (`http://orders:8080`) | Noms DNS résolus par Route 53 Resolver vers VPC Lattice |
| Sécurité | Chiffrement TLS avec AWS Private CA (certificats renouvelés automatiquement) | Groupes de sécurité sur les associations de VPC, politiques d'authentification IAM (SigV4) par réseau de services et par service |
| Observabilité | Métriques standard dans ECS et CloudWatch, journaux d'accès Envoy | Métriques et journaux d'accès par requête vers CloudWatch Logs, Firehose ou S3 |
| Réseau | Dans le réseau du VPC | Fonctionne avec des CIDR qui se chevauchent, sans appairage ni Transit Gateway ; aucun frais de transfert de données entre zones de disponibilité |

Concepts de VPC Lattice : un **service** (écouteurs, règles, groupes cibles) est associé à un **réseau de services** ; les VPC associés au réseau de services atteignent tous les services pour lesquels ils sont autorisés. Les configurations de ressources et les passerelles de ressources partagent de la même façon des ressources TCP (une base RDS, une cible IP ou un nom de domaine). Un point de terminaison de VPC de type réseau de services donne accès depuis le site local par Direct Connect ou VPN. Sur EKS, l'AWS Gateway API Controller crée les ressources VPC Lattice à partir des objets Kubernetes Gateway API.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::444455556666:role/checkout-task-role" },
    "Action": "vpc-lattice-svcs:Invoke",
    "Resource": "arn:aws:vpc-lattice:eu-west-1:111122223333:service/svc-0a1b2c3d4e5f6a7b8/*",
    "Condition": { "StringEquals": { "vpc-lattice-svcs:RequestMethod": "GET" } }
  }]
}
```

> **Conseil d'examen.** « Des microservices répartis sur de nombreux comptes et VPC aux CIDR qui se chevauchent doivent s'appeler avec une autorisation IAM et sans plomberie réseau » désigne VPC Lattice partagé avec AWS RAM. « Services ECS uniquement, noms courts, équilibrage de charge et métriques sans infrastructure supplémentaire » désigne Service Connect.

<!-- section: ecr-images | objectives: 1.1.8 -->
## Gérer les images de conteneur avec Amazon ECR

**Analyse.** ECR propose deux modes d'analyse au niveau du registre :

| | Analyse de base | Analyse améliorée |
| --- | --- | --- |
| Moteur | Technologie native AWS avec la base CVE | Amazon Inspector |
| Couverture | Paquets du système d'exploitation | Paquets du système d'exploitation et des langages de programmation |
| Fréquence | Analyse à l'envoi (scan on push) ou manuelle | Analyse à l'envoi et réanalyse continue à mesure que de nouvelles CVE apparaissent |
| Notifications | Résultats par l'API | Résultats Inspector envoyés à EventBridge (et à Security Hub) |

Changer de mode rend les analyses établies indisponibles jusqu'au retour au mode précédent. Les images archivées ne peuvent pas être analysées.

Les **politiques de cycle de vie** font expirer ou archivent les images dans les 24 heures qui suivent la correspondance avec une règle. Les règles sont évaluées ensemble et appliquées selon `rulePriority` (la plus basse d'abord ; une règle dont le `tagStatus` vaut `any` doit avoir le numéro le plus élevé). Les types de comptage sont `imageCountMoreThan`, `sinceImagePushed`, `sinceImagePulled` et `sinceImageTransitioned` ; les actions sont `expire` ou `transition` vers la classe de stockage `archive`. Lancez toujours d'abord un aperçu de la politique de cycle de vie.

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep the 20 most recent release images",
      "selection": { "tagStatus": "tagged", "tagPatternList": ["release-*"], "countType": "imageCountMoreThan", "countNumber": 20 },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Archive images not pulled for 90 days",
      "selection": { "tagStatus": "any", "countType": "sinceImagePulled", "countUnit": "days", "countNumber": 90 },
      "action": { "type": "transition", "targetStorageClass": "archive" }
    }
  ]
}
```

Autres contrôles : l'**immuabilité des balises** (une balise publiée ne peut pas être écrasée), la **réplication** du registre privé vers d'autres Régions et comptes (déploiements multi-Régions et reprise après sinistre), les règles de **cache d'extraction (pull through cache)** qui mettent en cache dans ECR des registres publics en amont, et les politiques de référentiel ou les conditions d'organisation pour les extractions entre comptes.

> **Piège d'examen.** L'analyse de base à l'envoi vérifie une image une seule fois. « Être alerté quand une nouvelle vulnérabilité touche des images déjà en production, y compris des bibliothèques Java et Python » exige l'analyse améliorée (continue, paquets des langages) avec une règle EventBridge sur les résultats Inspector.

<!-- section: auto-scaling | objectives: 1.1.9 -->
## Mise à l'échelle des charges de travail sans serveur et conteneurisées

**Lambda.** La simultanéité correspond aux requêtes en cours. Chaque fonction monte jusqu'à 1 000 environnements d'exécution toutes les 10 secondes, dans la limite du quota de simultanéité du compte (1 000 par défaut par Région, ajustable).

| Contrôle | Effet | Coût |
| --- | --- | --- |
| Simultanéité réservée | Garantit et plafonne la simultanéité d'une fonction (protège une base de données d'un excès de connexions) | Gratuit |
| Simultanéité provisionnée | Environnements pré-initialisés, aucun démarrage à froid, sur une version ou un alias uniquement | Facturée tant qu'elle est configurée |
| Application Auto Scaling sur la simultanéité provisionnée | Mise à l'échelle planifiée pour les pics connus, suivi de cible sur `LambdaProvisionedConcurrencyUtilization` | Seule la capacité planifiée est payée |

```bash
aws application-autoscaling register-scalable-target --service-namespace lambda \
  --resource-id function:checkout:live --scalable-dimension lambda:function:ProvisionedConcurrency \
  --min-capacity 10 --max-capacity 200
aws application-autoscaling put-scaling-policy --service-namespace lambda \
  --resource-id function:checkout:live --scalable-dimension lambda:function:ProvisionedConcurrency \
  --policy-name pc-target-70 --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue": 0.7, "PredefinedMetricSpecification": {"PredefinedMetricType": "LambdaProvisionedConcurrencyUtilization"}}'
```

L'**auto scaling de service Amazon ECS** (Application Auto Scaling) modifie le nombre de tâches souhaité : suivi de cible (CPU moyen, mémoire, requêtes ALB par cible), mise à l'échelle par étapes, actions planifiées, **mise à l'échelle prédictive** à partir de modèles quotidiens ou hebdomadaires, et mise à l'échelle selon le backlog SQS par tâche. La réduction est suspendue pendant les déploiements. Les fournisseurs de capacité avec mise à l'échelle gérée ajoutent ou retirent ensuite des instances pour accueillir les tâches.

**EKS** se met à l'échelle sur deux couches :

| Couche | Mécanisme |
| --- | --- |
| Pods | Horizontal Pod Autoscaler (réplicas selon le CPU, la mémoire ou des métriques personnalisées) ; KEDA pour des sources d'événements comme la profondeur d'une file |
| Nœuds | Cluster Autoscaler (ajuste la capacité souhaitée des groupes Auto Scaling quand des pods ne peuvent pas être planifiés ; un seul réplica actif) ou Karpenter (lance directement des instances bien dimensionnées et consolide) ; EKS Auto Mode exécute pour vous une mise à l'échelle basée sur Karpenter |

> **Piège d'examen.** Horizontal Pod Autoscaler ajoute des pods, pas des nœuds. Quand de nouveaux pods restent à l'état Pending, ce qui manque est la mise à l'échelle des nœuds (Karpenter, Cluster Autoscaler ou EKS Auto Mode), pas un maximum HPA plus élevé.

<!-- section: ingress | objectives: 1.1.10 -->
## Modèles d'entrée du trafic et équilibrage de charge pour les microservices

| Exigence | Entrée du trafic (ingress) |
| --- | --- |
| Routage HTTP par hôte ou chemin vers de nombreux services, authentification OIDC, AWS WAF | Application Load Balancer |
| Passage direct TCP, UDP ou TLS, IP statique par AZ, conservation de l'IP du client, service PrivateLink | Network Load Balancer |
| Clés d'API et plans d'utilisation, validation des requêtes, limitation par client, back-ends Lambda et HTTP | Amazon API Gateway (API REST ; API HTTP pour un proxy plus simple et moins cher) |
| API publique devant des conteneurs privés | Intégration privée d'API Gateway par un lien VPC V2 (VPC link V2) vers un ALB ou NLB interne (API REST et HTTP) |

Sur EKS, l'**AWS Load Balancer Controller** surveille les objets Kubernetes : un `Ingress` crée un ALB, un Service de type `LoadBalancer` crée un NLB et, depuis la version 2.14, un `Gateway` Kubernetes crée aussi un ALB. Le type de cible `ip` enregistre directement les IP des pods (obligatoire pour les pods Fargate, et moins de sauts) ; le type de cible `instance` passe par les ports des nœuds. Un **IngressGroup** regroupe de nombreux objets Ingress dans un seul ALB : des dizaines de services partagent ainsi un équilibreur de charge et son coût. Sans le contrôleur, l'ancien fournisseur cloud crée des Classic Load Balancers.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/group.name: shop-public
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: orders
                port:
                  number: 8080
```

> **Conseil d'examen.** « Réduire le coût de 30 ALB accessibles sur Internet créés par 30 objets Ingress Kubernetes » désigne un IngressGroup qui partage un seul ALB avec des règles d'hôte ou de chemin.

<!-- section: edge | objectives: 1.1.11 -->
## Calcul en périphérie avec CloudFront Functions et Lambda@Edge

| | CloudFront Functions | Lambda@Edge |
| --- | --- | --- |
| Langage | JavaScript | Node.js et Python |
| Événements | Requête de l'utilisateur (viewer request), réponse à l'utilisateur (viewer response) | Requête et réponse utilisateur, requête et réponse d'origine |
| Échelle et durée | Des millions de requêtes par seconde, moins d'une milliseconde | Jusqu'à 10 000 requêtes par seconde par Région, jusqu'à 30 secondes |
| Mémoire et taille | 2 Mo de mémoire, 10 Ko de code | 128 Mo (événements utilisateur) ou jusqu'à 10 240 Mo (événements d'origine) ; paquet de 50 Mo |
| Réseau, système de fichiers, corps de la requête | Non | Oui |
| Magasin de données | CloudFront KeyValueStore | Appels à d'autres services (par exemple DynamoDB) |
| Usages types | Normalisation de la clé de cache, modification d'en-têtes, redirections et réécritures, validation de JWT | Appels à des services externes, bibliothèques tierces, inspection du corps, choix de l'origine avec recherche |

Restrictions de Lambda@Edge : la fonction se trouve dans la Région USA Est (Virginie du Nord), est référencée par une version numérotée (ni `$LATEST` ni un alias) et ne prend en charge ni l'accès VPC, ni les variables d'environnement, ni les couches, ni les images de conteneur, ni arm64, ni la simultanéité provisionnée. Pour un comportement de cache, chaque type d'événement n'a qu'une fonction, et CloudFront Functions et Lambda@Edge ne peuvent pas être combinés sur les événements utilisateur ; une CloudFront Function sur la requête utilisateur avec Lambda@Edge sur la requête d'origine est autorisée.

> **Piège d'examen.** La réponse la moins chère et à la plus faible latence pour réécrire des en-têtes, rediriger ou vérifier des jetons à des millions de requêtes par seconde est CloudFront Functions. Ne choisissez Lambda@Edge que si l'énoncé exige des appels réseau, le corps de la requête, plus de mémoire ou des événements d'origine.

<!-- section: multi-tenancy | objectives: 1.1.13 -->
## Architectures mutualisées et isolation des locataires

L'AWS SaaS Lens définit trois modèles de déploiement :

| Modèle | Ressources | Atouts | Coûts |
| --- | --- | --- | --- |
| Silo | Dédiées à chaque locataire (compte, VPC, base de données ou pile) | Isolation la plus forte, coût par locataire, pas de voisin bruyant, adapté aux locataires réglementés | Coût plus élevé et exploitation par locataire |
| Pool | Partagées par tous les locataires | Économies d'échelle, un seul déploiement | Isolation imposée par le code et les politiques, risque de voisin bruyant |
| Bridge | Mixte : certains services cloisonnés, d'autres mutualisés, ou niveaux premium cloisonnés | Isolation là où elle compte | Deux modèles d'exploitation |

Le **contexte de locataire** doit provenir d'une identité de confiance, jamais d'un paramètre de requête. Avec Amazon Cognito : un groupe d'utilisateurs par locataire (séparation la plus forte, MFA et image de marque par locataire), un client d'application par locataire, des groupes, ou un attribut personnalisé comme `custom:tenantID` dans un groupe d'utilisateurs partagé, en lecture seule pour les clients d'application. Le jeton porte le locataire ; les mécanismes d'autorisation d'API Gateway et les services le lisent dans le jeton.

**Imposer l'isolation dans un pool** :

- **IAM avec balises de session.** Un service de distribution de jetons endosse un rôle avec une balise de session `TenantId` ; les politiques limitent l'accès selon cette balise, par exemple aux éléments DynamoDB dont la clé de partition est l'ID du locataire, ou à des préfixes S3 par locataire.
- **Sécurité au niveau des lignes.** Dans Aurora PostgreSQL, une politique RLS filtre les lignes selon une variable de session définie à partir du jeton : une clause `WHERE` oubliée ne peut pas divulguer de données.
- **Chiffrement propre à chaque locataire.** Une clé KMS par locataire (supprimer ou désactiver la clé rend illisibles les données de ce locataire), ou une clé partagée avec l'ID du locataire dans le contexte de chiffrement, que CloudTrail enregistre et que les politiques de clé peuvent exiger.
- **Isolation du calcul.** Le mode d'isolation des locataires de Lambda, défini uniquement à la création de la fonction, sert chaque `tenant-id` depuis ses propres environnements d'exécution ; il n'est pas pris en charge avec la simultanéité provisionnée, SnapStart ou les URL de fonction.
- **Voisins bruyants.** Plans d'utilisation API Gateway par niveau de locataire, files SQS par niveau, simultanéité réservée pour les niveaux premium.

```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem"],
  "Resource": "arn:aws:dynamodb:eu-west-1:111122223333:table/orders",
  "Condition": {
    "ForAllValues:StringEquals": { "dynamodb:LeadingKeys": ["${aws:PrincipalTag/TenantId}"] }
  }
}
```

> **Piège d'examen.** Un attribut personnalisé de locataire dans un groupe d'utilisateurs partagé n'est qu'une mutualisation superficielle : il ne permet pas de donner aux locataires des paramètres MFA ou de connexion différents. « Chaque locataire entreprise exige sa propre configuration de fournisseur d'identité et sa propre politique de mot de passe » désigne un groupe d'utilisateurs par locataire.

<!-- section: key-points -->
## Points clés

- ECS pour la plus faible charge opérationnelle, EKS pour les compétences Kubernetes et la portabilité ; Fargate supprime les hôtes, ECS Managed Instances et EKS Auto Mode délèguent l'exploitation des instances à AWS.
- App Mesh est arrêté (30 septembre 2026) : utilisez ECS Service Connect dans les espaces de noms ECS, VPC Lattice sur plusieurs VPC et comptes avec des politiques d'authentification IAM.
- L'analyse améliorée d'ECR (Inspector) est continue et couvre les paquets des langages ; les politiques de cycle de vie font expirer ou archivent selon le nombre, l'âge, la dernière extraction ou l'ancienneté de l'archivage.
- La simultanéité réservée Lambda plafonne et réserve, la simultanéité provisionnée supprime les démarrages à froid ; ECS met les tâches à l'échelle avec Application Auto Scaling ; EKS exige la mise à l'échelle des pods (HPA, KEDA) et des nœuds (Karpenter, Cluster Autoscaler, Auto Mode).
- AWS Load Balancer Controller : Ingress ou Gateway vers ALB, Service vers NLB, cibles `ip`, IngressGroup pour partager un ALB ; API Gateway atteint les services privés par un lien VPC V2.
- CloudFront Functions pour une logique légère côté utilisateur à très grande échelle ; Lambda@Edge pour les appels réseau, les corps de requête et les événements d'origine, déployée depuis us-east-1 en version numérotée.
- Silo, pool ou bridge ; contexte de locataire issu des jetons Cognito ; isolation par balises de session et LeadingKeys, sécurité au niveau des lignes, clés KMS par locataire ou contexte de chiffrement, mode d'isolation des locataires de Lambda.
