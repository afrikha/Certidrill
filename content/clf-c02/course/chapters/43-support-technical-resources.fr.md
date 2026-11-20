AWS propose de l'aide à plusieurs niveaux : de la documentation et des réponses communautaires gratuites pour tous, des plans Support payants avec des ingénieurs et des délais de réponse, et des outils comme Trusted Advisor et AWS Health qui surveillent votre compte. Les questions d'examen demandent où trouver une ressource, quel est le plan le moins cher qui inclut une fonctionnalité, et quel outil ou quelle équipe traite une situation.

<!-- section: official-resources | objectives: 4.3.1, 4.3.5 -->
## Ressources sur les sites officiels d'AWS

| Ressource | Où | Ce que vous y trouvez |
| --- | --- | --- |
| **Documentation AWS** | docs.aws.amazon.com | Guides de l'utilisateur, guides du développeur, références d'API, didacticiels pour chaque service |
| **Livres blancs et guides AWS** (whitepapers) | aws.amazon.com/whitepapers | Documents techniques rédigés par AWS et ses partenaires : architecture, sécurité, Well-Architected Framework, optimisation des coûts |
| **Blogs AWS** | aws.amazon.com/blogs | Actualités, lancements, procédures pas à pas et bonnes pratiques, par thème (AWS News Blog, Architecture, Security...) |
| **AWS Architecture Center** | aws.amazon.com/architecture | Architectures de référence, diagrammes et bonnes pratiques |
| **FAQ et pages de tarification des services** | aws.amazon.com/`<service>` | Réponses aux questions courantes, prix, limites |
| **AWS Skill Builder** | skillbuilder.aws | Cours de formation numériques et ateliers pratiques |

<!-- section: technical-resources | objectives: 4.3.6 -->
## Ressources techniques AWS

| Ressource | Pour |
| --- | --- |
| **AWS re:Post** | Poser des questions techniques et y répondre dans une communauté gérée par AWS ; les réponses viennent de la communauté et d'experts AWS |
| **AWS Knowledge Center** (sur re:Post) | Lire des articles et des vidéos qui répondent aux **questions les plus fréquentes** que les clients posent à AWS Support |
| **AWS Prescriptive Guidance** | Suivre des **guides** (bonnes pratiques de planification et de mise en œuvre) et des **modèles** (patterns : étapes, architectures et code) pour des projets de migration, de modernisation et d'optimisation, issus d'experts techniques AWS et de partenaires AWS |
| **AWS Solutions Library** | Déployer des solutions et des recommandations validées pour des problèmes métier et techniques courants |

> **Conseil d'examen.** « Question courante avec une réponse pas à pas d'AWS Support » désigne le Knowledge Center ; « demander à la communauté » désigne re:Post ; « planifier une grande migration avec des modèles éprouvés » désigne Prescriptive Guidance.

<!-- section: support-plans | objectives: 4.3.2, 4.3.7 -->
## Plans AWS Support

Chaque compte dispose de **Basic Support**, gratuit. Trois plans payants ajoutent le support technique par des ingénieurs AWS. Developer, Business et Enterprise On-Ramp sont d'anciens plans en cours d'abandon.

| Fonctionnalité | Basic Support | AWS Business Support+ | AWS Enterprise Support | AWS Unified Operations |
| --- | --- | --- | --- | --- |
| Service clientèle, compte et facturation, documentation, re:Post | Oui | Oui | Oui | Oui |
| Demandes de support technique | Non | 24 h/24 et 7 j/7 par téléphone, web et chat | 24 h/24 et 7 j/7 par téléphone, web et chat | 24 h/24 et 7 j/7 par téléphone, web et chat |
| Vérifications Trusted Advisor | Vérifications de base | Ensemble complet | Ensemble complet et Trusted Advisor Priority | Ensemble complet et Trusted Advisor Priority |
| AWS Health API et Support API | Non | Oui | Oui | Oui |
| Technical Account Manager (TAM) désigné | Non | Non | Oui | Oui, avec des ingénieurs spécialistes du domaine |
| Système critique pour l'entreprise ou la mission en panne | Sans objet | Moins de 30 minutes | Moins de 15 minutes | Moins de 5 minutes |
| Système de production en panne | Sans objet | Moins de 1 heure | Moins de 1 heure | Moins de 1 heure |
| Prix minimal | Gratuit | 29 USD par mois | 5 000 USD par mois | Non indiqué ; engagement initial de 3 mois, puis au mois |

Tous les plans payants répondent en moins de 4 heures pour un système de production dégradé, en moins de 12 heures pour un système dégradé et en moins de 24 heures pour une demande de conseils généraux.

Choisir un plan :

- Seulement de la documentation, l'aide de la communauté et des questions de facturation : **Basic Support**.
- Une aide technique 24 h/24 et 7 j/7 pour des charges de production, au coût le plus bas : **Business Support+**.
- Un TAM désigné, des revues stratégiques, une réponse critique en 15 minutes, l'accès à AWS Security Incident Response : **Enterprise Support**.
- La réponse critique la plus rapide (5 minutes), la gestion des événements d'infrastructure et des conseils d'architecture applicative : **Unified Operations**.

> **Piège d'examen.** Le plan le moins cher avec un **TAM désigné** est Enterprise Support, pas Business Support+. Le plan le moins cher avec l'**ensemble complet des vérifications Trusted Advisor** ou l'**AWS Health API** est Business Support+.

<!-- section: support-center | objectives: 4.3.4 -->
## AWS Support Center

L'**AWS Support Center**, dans la console, est l'endroit où vous ouvrez et suivez les **demandes de support** (support cases) :

| Type de demande | Disponible avec |
| --- | --- |
| Compte et facturation | Tous les plans, Basic compris |
| Augmentation de quota de service | Tous les plans, Basic compris |
| Support technique | Plans payants uniquement |

- Vous choisissez une **gravité** (conseils généraux, système dégradé, système de production dégradé, système de production en panne, système critique pour l'entreprise ou la mission en panne) ; les délais de réponse dépendent de la gravité et du plan.
- Avec un plan payant, tout utilisateur IAM qui a les autorisations nécessaires peut ouvrir des demandes et demander un contact par web, chat ou téléphone.

<!-- section: trusted-advisor-health | objectives: 4.3.8 -->
## Trusted Advisor et AWS Health

**AWS Trusted Advisor** inspecte votre compte et recommande des améliorations, dans six catégories : **optimisation des coûts (cost optimization), performances, sécurité, tolérance aux pannes (fault tolerance), limites de service (service limits), excellence opérationnelle**.

- Les vérifications d'optimisation des coûts trouvent des économies : équilibreurs de charge inactifs, instances RDS inactives, adresses IP Elastic non associées, volumes EBS surdimensionnés, expiration de baux d'instances réservées, recommandations d'achat de Savings Plans.
- **Basic Support** : toutes les vérifications des limites de service et une sélection de vérifications de sécurité et de tolérance aux pannes, actualisées manuellement. **Plans payants** : toutes les vérifications, l'API Trusted Advisor et la surveillance par Amazon EventBridge.

**AWS Health** signale les événements qui peuvent affecter vos ressources et vos comptes AWS :

| Outil | Ce qu'il fournit | Accès |
| --- | --- | --- |
| **AWS Health Dashboard** | L'état des services (événements publics, sans connexion) et l'état de votre compte : problèmes opérationnels, modifications planifiées (par exemple le retrait d'une instance EC2), notifications de compte, avec les ressources concernées | Tous les clients, sans coût supplémentaire |
| **AWS Health API** | Les mêmes événements, pour les intégrer à vos propres outils d'exploitation ; avec AWS Organizations, une vue organisationnelle de tous les comptes | Business Support+, Enterprise Support ou Unified Operations |

> **Piège d'examen.** Trusted Advisor recommande des **bonnes pratiques** pour vos ressources ; le Health Dashboard signale les **événements AWS** qui les affectent. « Être informé de la maintenance planifiée de mes instances » relève d'AWS Health.

<!-- section: trust-safety | objectives: 4.3.9 -->
## Signaler un abus : AWS Trust and Safety

L'**équipe AWS Trust and Safety** traite les signalements de ressources AWS utilisées à des fins abusives ou illégales : spam et e-mails abusifs, analyse de ports, attaques par déni de service, tentatives d'intrusion, contenu répréhensible, contenu qui enfreint le droit d'auteur.

- Toute personne qui soupçonne un abus **provenant de ressources AWS** le signale à l'équipe Trust and Safety, avec des preuves : l'URL pour un contenu abusif ; l'adresse IP ciblée, un horodatage avec fuseau horaire et des extraits de journaux pour un abus réseau.
- Trust and Safety enquête, peut demander des informations complémentaires à l'auteur du signalement et travaille avec le client qui contrôle la ressource.
- Si vous recevez une notification Trust and Safety concernant l'une de **vos** ressources (par exemple une instance compromise qui envoie du spam), vous répondez à l'équipe Trust and Safety et corrigez le problème. AWS Support ne peut traiter ni les signalements d'abus ni les questions sur ces notifications.

> **Piège d'examen.** Un abus se signale à AWS Trust and Safety, pas à AWS Support, et pas par une demande de support sur votre propre compte.

<!-- section: key-points -->
## Points clés

- Documentation, livres blancs, blogs, Architecture Center : sites officiels d'AWS, gratuits.
- re:Post : questions-réponses communautaires. Knowledge Center : réponses aux questions fréquentes. Prescriptive Guidance : guides et modèles.
- Plans : Basic (gratuit, pas de demande technique), Business Support+ (ingénieurs 24 h/24 et 7 j/7, Trusted Advisor complet, Health API), Enterprise Support (TAM, 15 minutes), Unified Operations (5 minutes).
- Support Center : demandes compte et facturation et quotas pour tous ; demandes techniques avec un plan payant.
- Trusted Advisor : six catégories, vérifications d'optimisation des coûts. Health Dashboard : événements pour tous les clients ; Health API avec un plan payant.
- Abus de ressources AWS : équipe AWS Trust and Safety.
