Le SOA-C03 est un examen d'exploitation. Une question type décrit une charge de travail qui fonctionne déjà sur AWS, puis un symptôme (une alarme qui ne se déclenche jamais, une instance injoignable, un déploiement qui revient en arrière, une base de données qui ralentit aux heures de pointe) ou une nouvelle exigence d'exploitation (collecter les métriques de mémoire, appliquer les correctifs sur toutes les instances, partager un sous-réseau avec un autre compte). Vous choisissez la modification de configuration, l'automatisation ou l'étape de dépannage qui règle le problème en respectant la contrainte énoncée. Ce chapitre présente le format, une méthode pour lire les questions d'exploitation et les extraits qu'elles montrent, les réflexes que l'examen récompense, les services dont le statut a changé et les fonctionnalités à bien distinguer.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | AWS Certified CloudOps Engineer – Associate (anciennement SysOps Administrator – Associate) |
| Guide d'examen | SOA-C03, version 1.2 du 29 octobre 2026 ; le SOA-C03 a remplacé le SOA-C02 le 30 septembre 2025 |
| Durée | 130 minutes |
| Questions | 65 : 50 notées et 15 non notées, qui ne sont pas signalées |
| Score | Échelle de 100 à 1 000 ; 720 pour réussir |
| Modèle de notation | Compensatoire : seul le score total compte, il n'y a pas de seuil par domaine |
| Réponses fausses ou vides | Une question sans réponse compte comme fausse et il n'y a pas de pénalité pour une réponse au hasard : répondez toujours |
| Candidat visé | Environ un an d'expérience du déploiement, de la gestion et de l'exploitation de charges de travail sur AWS |
| Langues | Anglais et japonais (les versions coréenne et chinoise simplifiée ont été retirées après le 19 novembre 2026) ; pas de version française |

Les cinq domaines :

| Domaine | Poids |
| --- | --- |
| Surveillance, journalisation, analyse, correction et optimisation des performances | 22 % |
| Fiabilité et continuité des activités | 22 % |
| Déploiement, provisionnement et automatisation | 22 % |
| Sécurité et conformité | 16 % |
| Mise en réseau et diffusion de contenu | 18 % |

Il n'existe que deux types de questions. Le **choix multiple** a une seule bonne réponse parmi quatre options (environ quatre questions sur cinq). La **réponse multiple** se termine par « Choose two. » ou « Choose three. » et compte deux bonnes réponses parmi cinq options, ou trois parmi six ; le point n'est acquis que si toutes les réponses choisies sont correctes. Il n'y a **pas de laboratoire** : les labs pratiques du SOA-C02 ont été suspendus le 28 mars 2023, et le guide du SOA-C03 ne cite que les deux types de questions.

Ce qui change par rapport au SOA-C02 : le domaine coût et performance a été intégré à la tâche 1.3 ; le guide ajoute l'agent CloudWatch pour Amazon ECS et Amazon EKS, l'AWS CDK à côté de CloudFormation, l'application de la conformité avec les packs de conformité (conformance packs) AWS Config et la surveillance réseau CloudWatch ; les sites web statiques S3 ont été retirés. La version 1.1 (1er juin 2026) a ajouté Amazon Bedrock, AWS DevOps Agent, AWS Health Dashboard, Kiro, AWS Security Agent, Amazon S3 Files et les quatre stratégies de reprise après sinistre. La conception d'architectures, de pipelines CI/CD ou de réseaux hybrides, le développement logiciel, la définition de la gouvernance, la planification de capacité, l'analyse du TCO et la facturation sont hors périmètre.

> **Conseil d'examen.** Vous ne pouvez pas savoir quelles sont les 15 questions non notées : accordez à chacune le même soin. Les examens blancs Certidrill notent les 65 questions.

<!-- section: reading-questions -->
## Lire une question d'exploitation

Un énoncé compte deux à cinq phrases : une entreprise (« AnyCompany », « a media company »), son environnement, le symptôme ou l'exigence, un qualificatif, puis « Which solution will meet these requirements? ». Beaucoup d'énoncés contiennent un extrait : une sortie de l'AWS CLI, une politique IAM ou une politique de compartiment, un modèle CloudFormation, une configuration de l'agent CloudWatch, un modèle d'événement EventBridge ou des enregistrements de journaux de flux VPC. Procédez dans cet ordre :

1. Lisez d'abord les deux dernières phrases : le qualificatif et ce que vous devez choisir.
2. Classez le problème : rien n'est collecté, c'est collecté sans alarme, l'alarme existe sans action, l'action est refusée, ou la ressource est mal configurée.
3. Cherchez dans l'extrait la valeur fautive : une autorisation manquante, une mauvaise dimension, un `DENY` ou un `REJECT`, un port, un état.
4. Éliminez chaque option qui manque une exigence, puis appliquez le qualificatif.

| Mots de l'énoncé | Ce qu'ils sélectionnent en général |
| --- | --- |
| « LEAST operational overhead » (le moins de charge opérationnelle) | Une fonctionnalité intégrée ou une automatisation gérée (action d'alarme, règle gérée AWS Config avec correction automatique, Systems Manager Automation, règle EventBridge) plutôt que des scripts sur une instance ou des tâches cron |
| « automatically », « without manual intervention » (automatiquement, sans intervention manuelle) | Une chaîne pilotée par les événements : métrique ou événement, puis alarme ou règle, puis une cible qui corrige |
| « MOST cost-effective » (le plus rentable) | L'option la moins chère qui respecte encore toutes les exigences fonctionnelles : gp3 plutôt que gp2, règles de cycle de vie, redimensionnement, points de terminaison de passerelle |
| « with the least downtime » (avec le moins d'interruption) | Une modification en ligne (Elastic Volumes, mise à jour propagée ou basculement Multi-AZ, actualisation d'instances) plutôt qu'arrêter, prendre un instantané et reconstruire |
| « memory », « disk space », « processes » (mémoire, espace disque, processus) | L'agent CloudWatch : EC2 ne publie pas ces métriques tout seul |
| « who made the change », « which API call » (qui a fait la modification, quel appel d'API) | AWS CloudTrail |
| « configuration history », « continuous compliance » (historique de configuration, conformité continue) | AWS Config |
| « across all accounts » ou « every Region » (tous les comptes, toutes les Régions) | Les fonctionnalités d'AWS Organizations : StackSets, administrateur délégué, journal de suivi d'organisation, observabilité entre comptes, Automation multicomptes |
| « without opening inbound ports », « no SSH keys » (sans ouvrir de port entrant, sans clé SSH) | Systems Manager Session Manager ou Run Command |
| « near real time » (quasi en temps réel) | Une alarme sur métrique ou une règle EventBridge, pas un rapport planifié |

> **Piège d'examen.** Deux options fonctionnent souvent toutes les deux. L'une ajoute une fonction Lambda ou un script pour faire ce qu'un paramètre natif fait déjà (une action d'alarme, une correction AWS Config, le type de vérification de l'état d'un groupe Auto Scaling). Avec « LEAST operational overhead », c'est le paramètre natif qui l'emporte.

<!-- section: operations-principles -->
## Les réflexes que l'examen récompense

L'examen s'appuie sur les piliers excellence opérationnelle et fiabilité de l'AWS Well-Architected Framework. Les réponses qu'il préfère partagent quelques réflexes :

- **Observer avant d'agir.** Une correction commence par le bon signal : une métrique pour les chiffres, un journal pour le détail, CloudTrail pour l'activité des API, AWS Config pour la configuration des ressources, AWS Health pour les événements côté AWS.
- **Automatiser la réponse.** Un humain qui lit un e-mail n'est jamais la meilleure réponse quand une action d'alarme, une règle EventBridge ou un runbook peut s'en charger.
- **Donner à l'automatisation ses propres autorisations.** La plupart des questions « la cible ne s'exécute jamais » se résument à une politique de ressource manquante, un rôle IAM que le service ne peut pas assumer ou une politique de clé KMS.
- **Modifier par le code.** Utilisez CloudFormation ou l'AWS CDK, détectez la dérive, prévisualisez les modifications avec des jeux de modifications (change sets) et déployez dans de nombreux comptes avec StackSets.
- **Répartir et remplacer.** Plusieurs zones de disponibilité, des vérifications de l'état qui remplacent les cibles défaillantes, des sauvegardes testées.

Statut des services en novembre 2026, appliqué dans toutes les questions Certidrill :

| Service | Statut | Quoi utiliser |
| --- | --- | --- |
| AWS OpsWorks | Fin de vie (OpsWorks Stacks le 26 mai 2024), désactivé pour tous les clients | Systems Manager, CloudFormation |
| AWS Cloud9 | Fermé aux nouveaux clients | Votre propre IDE, AWS CloudShell, Kiro |
| AWS CodeCommit | De nouveau ouvert aux nouveaux clients depuis le 25 novembre 2025 | Peut être une bonne réponse |
| Kits SDK et démon AWS X-Ray | En mode maintenance depuis le 25 février 2026 ; X-Ray lui-même continue | OpenTelemetry (AWS Distro for OpenTelemetry) avec l'agent CloudWatch ou un collecteur |
| Amazon Q Developer | Nouvelles inscriptions fermées le 15 mai 2026 | Kiro |
| Amazon DevOps Guru | Plus de nouveaux clients à partir du 29 octobre 2026 ; accès jusqu'au 30 septembre 2027 | CloudWatch investigations, AWS DevOps Agent |

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

| Famille | Options | Ce qui les distingue |
| --- | --- | --- |
| Télémétrie | Métriques CloudWatch, CloudWatch Logs, CloudTrail, AWS Config | Des séries temporelles numériques ; des événements texte des applications et des services ; qui a appelé quelle API, quand et d'où ; à quoi ressemblait une ressource dans le temps et si elle respecte les règles |
| Alarmes | Alarme sur métrique, alarme composite, filtre de métrique | Un seuil sur une métrique ou une expression, avec n'importe quelle action ; une règle qui combine d'autres alarmes, limitée aux actions de type notification ; un modèle qui transforme des événements de journal en métrique |
| Routage d'événements | Règle EventBridge, EventBridge Pipes, rubrique SNS | Un routage par contenu de nombreux événements vers jusqu'à cinq cibles par règle ; une source vers une cible avec filtrage et enrichissement ; une diffusion en mode push d'un message vers des abonnés |
| Systems Manager | Run Command, Automation, State Manager, Patch Manager, Session Manager | Exécuter une commande une fois sur de nombreuses instances ; un runbook en plusieurs étapes qui appelle des API AWS ; maintenir les instances dans un état défini selon une planification ; analyser et installer les correctifs selon une référence ; un shell audité sans SSH ni port ouvert |
| Vérifications de l'état | Vérifications du statut EC2, vérifications de l'état ELB, vérifications de l'état Route 53 | L'accessibilité matérielle et système d'une instance ; la réponse applicative de chaque cible, utilisée pour router le trafic et, si elle est activée, pour remplacer les instances d'un groupe Auto Scaling ; l'état d'un point de terminaison utilisé par le basculement DNS |
| Résilience des bases de données | RDS Multi-AZ, réplicas en lecture, RDS Proxy | Une instance de secours avec basculement automatique, sans répartition des lectures sur une instance de base de données Multi-AZ ; des copies asynchrones qui servent les lectures ; un pool de connexions qui absorbe les rafales de connexions et raccourcit le basculement |
| Filtrage réseau | Groupes de sécurité, listes ACL réseau | Avec état, règles d'autorisation uniquement, sur les interfaces réseau ; sans état, règles numérotées d'autorisation et de refus, sur les sous-réseaux, donc le trafic de retour exige d'ouvrir les ports éphémères |
| Diagnostic réseau | Journaux de flux VPC, Reachability Analyzer | Des enregistrements du trafic réel accepté ou rejeté ; une analyse statique du chemin entre deux ressources, sans envoyer de paquets |
| Infrastructure as code | Jeu de modifications, détection de dérive, StackSets | L'aperçu de ce qu'une mise à jour va modifier ; l'écart entre le modèle et les ressources modifiées à la main ; un modèle déployé dans de nombreux comptes et Régions |
| Partage | AWS RAM, StackSets | Partager une ressource existante (sous-réseau, passerelle de transit, règle Resolver) avec d'autres comptes ; créer une copie des ressources dans chaque compte |
| Conseils d'optimisation | Compute Optimizer, Trusted Advisor, Cost Explorer | Le redimensionnement à partir des métriques d'utilisation ; des vérifications sur le coût, la sécurité, la tolérance aux pannes, les performances et les limites de service ; l'historique et les prévisions de dépenses |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le module de surveillance construit les signaux sur lesquels agissent les chapitres fiabilité, déploiement et sécurité.
2. Dans un compte de test, installez l'agent CloudWatch sur une instance avec Systems Manager, publiez les métriques de mémoire, créez une alarme qui notifie une rubrique SNS, puis une règle EventBridge qui exécute un runbook Automation.
3. Cassez des choses volontairement et lisez les indices : supprimez une politique de ressource Lambda, refusez un port dans une ACL réseau, modifiez à la main une ressource d'une pile et détectez la dérive.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication, y compris les raisons pour lesquelles les mauvaises options échouent, et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
