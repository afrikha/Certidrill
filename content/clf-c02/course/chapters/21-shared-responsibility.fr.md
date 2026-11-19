Sur AWS, la sécurité est une responsabilité partagée : AWS sécurise le cloud lui-même, et le client sécurise ce qu'il met dans le cloud et la façon dont il le configure. L'examen demande quelle partie est responsable d'une tâche donnée, quelles tâches les deux parties effectuent chacune sur sa couche, et comment le partage se déplace quand le client choisit Amazon EC2, Amazon RDS ou AWS Lambda.

<!-- section: model | objectives: 2.1.1, 2.1.2 -->
## Le modèle de responsabilité partagée AWS

| Élément | AWS : sécurité **du** cloud | Client : sécurité **dans** le cloud |
| --- | --- | --- |
| Périmètre | L'infrastructure qui exécute tous les services AWS | Tout ce que le client déploie, stocke et configure |
| Composantes | Matériel, logiciels, réseau et installations ; l'infrastructure mondiale (Régions, zones de disponibilité, emplacements périphériques) ; le système d'exploitation hôte et la couche de virtualisation ; les logiciels des services gérés | Données du client ; applications ; gestion des identités et des accès ; système d'exploitation invité, quand le client en a un ; configuration du réseau et des pare-feu ; choix de chiffrement côté client et côté serveur ; protection du trafic réseau |
| Varie selon le service ? | Augmente quand le service est plus géré | Diminue quand le service est plus géré, mais ne disparaît jamais |

Le modèle allège la charge opérationnelle du client : AWS exploite, gère et contrôle les composants, du système d'exploitation hôte et de la couche de virtualisation jusqu'à la sécurité physique des installations.

> **Piège d'examen.** « Security of the cloud » (sécurité du cloud), c'est AWS ; « security in the cloud » (sécurité dans le cloud), c'est le client. Mémorisez les prépositions : les options d'une question les inversent souvent.

<!-- section: customer-responsibilities | objectives: 2.1.3 -->
## Les responsabilités du client

Quel que soit le service, le client est toujours responsable de :

- **ses données** : les classer, choisir si et comment les chiffrer, et décider qui peut y accéder ;
- **la gestion des identités et des accès** : utilisateurs, groupes, rôles et politiques IAM, MFA, protection de l'utilisateur racine et des clés d'accès ;
- **la configuration des contrôles fournis par AWS** : groupes de sécurité, listes ACL réseau, politiques de compartiment, paramètres Amazon S3 Block Public Access, paramètres de chiffrement ;
- **ses applications et son code**.

Selon le service, le client est aussi responsable :

- du **système d'exploitation invité** de ses instances EC2 : mises à jour et correctifs de sécurité ;
- des **logiciels qu'il installe** sur ces instances (un serveur web, un moteur de base de données, un agent) ;
- de la **configuration réseau** de son VPC : sous-réseaux, tables de routage, règles de pare-feu.

<!-- section: aws-responsibilities | objectives: 2.1.4 -->
## Les responsabilités d'AWS

AWS est toujours responsable de :

- la **sécurité physique** des centres de données : contrôle d'accès, gardiennage, vidéosurveillance, contrôles environnementaux (électricité, refroidissement, protection incendie) ;
- le **matériel** : serveurs, périphériques de stockage, équipements réseau, et leur mise hors service sécurisée ;
- le **réseau mondial** et l'**infrastructure mondiale** : Régions, zones de disponibilité et emplacements périphériques ;
- le **système d'exploitation hôte et la couche de virtualisation** (hyperviseur) qui isolent les clients les uns des autres ;
- pour les services gérés, le **système d'exploitation, la plateforme et les logiciels** qui exécutent le service.

Un client ne peut jamais visiter un centre de données AWS pour l'auditer. AWS prouve ses contrôles par des audits tiers indépendants, dont les rapports sont disponibles dans AWS Artifact (chapitre 22).

<!-- section: shared-controls | objectives: 2.1.5 -->
## Les responsabilités partagées du client et d'AWS

Certains contrôles informatiques existent des deux côtés, chaque partie les appliquant à sa propre couche :

| Type de contrôle | Qui | Exemples |
| --- | --- | --- |
| **Contrôles hérités** (inherited controls) | Entièrement AWS | Contrôles physiques et environnementaux des centres de données |
| **Contrôles partagés** (shared controls) | AWS sur l'infrastructure, le client sur ses propres ressources | **Gestion des correctifs** : AWS corrige l'infrastructure, le client corrige ses systèmes d'exploitation invités et ses applications. **Gestion de la configuration** : AWS configure ses équipements d'infrastructure, le client configure ses systèmes d'exploitation, bases de données et applications. **Sensibilisation et formation** : AWS forme ses employés, le client forme les siens |
| **Contrôles propres au client** (customer-specific controls) | Uniquement le client | Acheminer ou cloisonner des données dans des environnements de sécurité spécifiques, selon l'application déployée |

> **Conseil d'examen.** Quand la question demande une responsabilité **partagée**, la réponse est la gestion des correctifs, la gestion de la configuration ou la sensibilisation et la formation. La sécurité physique n'est jamais partagée : elle est héritée d'AWS.

<!-- section: service-shift | objectives: 2.1.6 -->
## Comment le partage évolue selon le service

Plus un service est géré, plus AWS en prend en charge. Les données du client, ses autorisations d'accès et ses décisions de chiffrement ne passent jamais à AWS.

| Tâche | Amazon EC2 | Amazon RDS | AWS Lambda | Amazon S3, Amazon DynamoDB |
| --- | --- | --- | --- | --- |
| Sécurité physique, matériel, hyperviseur | AWS | AWS | AWS | AWS |
| Correctifs du système d'exploitation | Client (système d'exploitation invité) | AWS | AWS | AWS |
| Correctifs du moteur de base de données | Client, s'il installe une base de données sur l'instance | AWS, pendant une fenêtre de maintenance que le client choisit | Sans objet | Sans objet pour S3 ; AWS pour DynamoDB |
| Environnement d'exécution et mise à l'échelle du service | Client (taille d'instance, Auto Scaling) | Le client choisit la classe d'instance et les options ; AWS exécute le moteur | AWS gère l'environnement d'exécution et met les fonctions à l'échelle | AWS |
| Règles d'accès réseau | Client (groupes de sécurité, listes ACL réseau) | Client (groupes de sécurité de l'instance de base de données) | Client, pour les fonctions connectées à un VPC | Client (politiques de compartiment, autorisations de table) |
| Code de l'application | Client | Client (requêtes, schéma, utilisateurs de la base) | Client (code de la fonction et ses dépendances) | Client |
| Données, autorisations IAM, choix de chiffrement | Client | Client | Client | Client |

- **Amazon EC2** est une infrastructure en tant que service (IaaS) : le client gère presque toutes les couches au-dessus de l'hyperviseur.
- **Amazon RDS** est une base de données gérée : AWS installe, corrige et sauvegarde le moteur et son système d'exploitation ; le client n'a pas accès à ce système d'exploitation et gère les utilisateurs, les données et l'accès réseau de la base.
- **AWS Lambda** est sans serveur : il n'y a aucun serveur ni système d'exploitation à gérer ; le client écrit le code et définit ses autorisations IAM et sa configuration.
- **Amazon S3 et DynamoDB** sont des services abstraits : le client se contente de stocker et de récupérer des données par des points de terminaison et gère ces données, leur chiffrement et leurs autorisations.

> **Piège d'examen.** Passer d'EC2 à RDS ou à Lambda transfère à AWS les correctifs du système d'exploitation, mais **pas** la protection des données. « Qui est responsable de configurer un groupe de sécurité », « de chiffrer les données » ou « d'accorder les autorisations IAM » : toujours le client, quel que soit le service.

<!-- section: key-points -->
## Points clés

- AWS : sécurité du cloud (installations, matériel, réseau, infrastructure mondiale, système d'exploitation hôte et virtualisation).
- Client : sécurité dans le cloud (données, IAM, configuration des groupes de sécurité et du chiffrement, applications, système d'exploitation invité).
- Contrôles partagés : gestion des correctifs, gestion de la configuration, sensibilisation et formation. Hérités : physiques et environnementaux. Propres au client : cloisonnement des données.
- EC2 : le client corrige le système d'exploitation invité. RDS : AWS corrige le système d'exploitation et le moteur. Lambda : aucun système d'exploitation pour le client. Les données et les autorisations restent toujours au client.
