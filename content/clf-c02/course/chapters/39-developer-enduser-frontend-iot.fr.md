Ce chapitre couvre quatre autres familles du guide d'examen : les outils pour développeur, le calcul pour l'utilisateur final, le front-end web et mobile, et l'Internet des objets (IoT). Les questions énoncent un besoin (« compiler et tester le code automatiquement », « tracer les requêtes lentes », « donner aux employés un bureau dans le cloud », « héberger une application web depuis un dépôt Git », « connecter des millions de capteurs ») et demandent le service AWS qui y répond.

<!-- section: developer-tools | objectives: 3.8.4 -->
## Services d'outils pour développeur

| Service | Ce qu'il fait |
| --- | --- |
| **AWS CLI** (Command Line Interface) | Un seul outil pour piloter les services AWS depuis un terminal et les automatiser dans des scripts |
| **AWS SDKs** | Bibliothèques pour appeler les services AWS depuis le code d'une application (Java, Python, JavaScript, .NET...) |
| **AWS CodeBuild** | Service de **build** entièrement géré : compile le code source, exécute les tests et produit des packages prêts à déployer. Aucun serveur de build à gérer ; vous payez le temps de build |
| **AWS CodePipeline** | Service de **livraison continue** entièrement géré : modélise le processus de publication comme un **pipeline** d'étapes (source, build, test, déploiement) qui s'exécute automatiquement à chaque modification du code |
| **AWS X-Ray** | Collecte les **traces** des requêtes au fil de leur parcours dans une application distribuée ; affiche une **carte des traces** (trace map) des services concernés et aide à trouver le composant qui cause la latence ou les erreurs |

Outils liés vus dans d'autres chapitres : **AWS CloudFormation** déploie l'infrastructure en tant que code, **Amazon CloudWatch** collecte métriques et journaux.

<!-- section: developer-choice | objectives: 3.8.11 -->
## Outils pour développer, déployer et dépanner

| Exigence | Service |
| --- | --- |
| Exécuter des commandes AWS depuis un terminal ou un script shell | AWS CLI |
| Appeler les services AWS depuis le code d'une application | AWS SDKs |
| Compiler le code et exécuter les tests unitaires à chaque commit, sans gérer de serveurs de build | AWS CodeBuild |
| Automatiser tout le processus de publication, du dépôt jusqu'à la production | AWS CodePipeline (avec CodeBuild pour l'étape de build) |
| Trouver quel microservice ralentit les requêtes des utilisateurs | AWS X-Ray |
| Collecter les journaux d'une application et déclencher une alarme sur une métrique | Amazon CloudWatch |
| Créer la même infrastructure dans plusieurs environnements à partir de modèles | AWS CloudFormation |

> **Piège d'examen.** X-Ray et CloudWatch aident tous deux au dépannage, mais X-Ray suit **une requête** à travers les services (traçage), tandis que CloudWatch collecte **métriques, journaux et alarmes**. CodeBuild **compile** ; CodePipeline **orchestre** les étapes et appelle CodeBuild.

<!-- section: end-user-computing | objectives: 3.8.5 -->
## Services de calcul pour l'utilisateur final

Les services de calcul pour l'utilisateur final exécutent des bureaux, des applications ou des navigateurs dans AWS et **ne diffusent que l'affichage** (les pixels) vers l'appareil de l'utilisateur. Les données restent dans AWS, ce qui aide la sécurité quand des appareils sont perdus ou non gérés.

| Service | Ce que reçoivent les utilisateurs | Usage type |
| --- | --- | --- |
| **Amazon WorkSpaces** | Un **bureau virtuel** complet (Windows ou Linux) : WorkSpaces Personal (bureau persistant pour un utilisateur) ou WorkSpaces Pools (bureaux non persistants) | Employés à distance, prestataires, centres d'appels, remplacement d'une infrastructure de bureaux virtuels sur site ; facturation mensuelle ou horaire |
| **Amazon AppStream 2.0**, désormais documenté sous le nom **Amazon WorkSpaces Applications** | Des **applications de bureau** diffusées vers un navigateur web ou un client, sans bureau complet | Donner aux utilisateurs une application (logiciel de conception, application métier ancienne) sur n'importe quel appareil, sans l'installer ; une seule version centrale à maintenir |
| **Amazon WorkSpaces Secure Browser** | Un **navigateur web** qui s'exécute dans AWS et est diffusé vers l'utilisateur | Accès sécurisé aux sites web internes et aux applications SaaS depuis des appareils non gérés, sans client VPN et sans données sur l'appareil ; la session est effacée à la fin ; paiement à l'usage, par utilisateur connecté et par mois |

<!-- section: vm-output-choice | objectives: 3.8.12 -->
## Présenter la sortie de machines virtuelles sur les machines des utilisateurs

| Exigence | Service |
| --- | --- |
| Chaque employé a besoin d'un bureau Windows persistant dans le cloud, accessible depuis un ordinateur portable, une tablette ou un client léger | Amazon WorkSpaces |
| Diffuser une application de bureau Windows vers le navigateur des utilisateurs sans leur donner de bureau | Amazon AppStream 2.0 (WorkSpaces Applications) |
| Des prestataires doivent accéder à des applications web internes depuis leurs propres appareils, sans téléchargement de données | Amazon WorkSpaces Secure Browser |

> **Piège d'examen.** Amazon EC2 exécute des machines virtuelles, mais ne fournit pas d'expérience de bureau aux utilisateurs finaux. Quand l'énoncé parle de « bureau », de « diffuser des applications » ou d'« isolation du navigateur » pour des employés, la réponse est dans la famille WorkSpaces.

<!-- section: amplify | objectives: 3.8.6, 3.8.13 -->
## Front-end web et mobile : AWS Amplify

**AWS Amplify** est un ensemble d'outils et de services pour **créer, déployer et héberger rapidement des applications web et mobiles full-stack** :

| Composant | Ce qu'il fait |
| --- | --- |
| **Amplify Hosting** | Se connecte à un dépôt Git, compile et déploie l'application web à chaque commit (CI/CD) et la diffuse dans le monde entier via Amazon CloudFront ; domaines personnalisés, aperçus par branche |
| **Création du back-end** | Ajoute des fonctionnalités cloud avec peu de code : connexion des utilisateurs (Amazon Cognito), données et API (AWS AppSync, Amazon DynamoDB), stockage de fichiers (Amazon S3), fonctions (AWS Lambda) |
| **Bibliothèques clientes et composants d'interface** | Relient le front-end (React, Next.js, Angular, Vue, iOS, Android, Flutter, React Native) à ces fonctionnalités du back-end |

| Exigence | Service |
| --- | --- |
| Des développeurs front-end veulent héberger une application web monopage depuis un dépôt Git avec des déploiements automatiques | AWS Amplify Hosting |
| Ajouter l'authentification et un back-end de données à une application mobile avec peu d'expertise cloud | AWS Amplify |
| Publier une API REST devant des fonctions Lambda | Amazon API Gateway (Amplify peut l'utiliser, mais c'est le service d'API) |

> **Conseil d'examen.** « Front-end », « application mobile », « full-stack », « développeurs web avec peu d'expérience AWS » désignent AWS Amplify. Un simple site web statique peut aussi être hébergé dans Amazon S3 avec CloudFront, mais Amplify ajoute le CI/CD et les fonctionnalités de back-end.

<!-- section: iot | objectives: 3.8.7, 3.8.14 -->
## Services IoT : AWS IoT Core

**AWS IoT Core** connecte des appareils IoT (capteurs, machines, véhicules, appareils électroménagers) au Cloud AWS de façon sécurisée et à grande échelle :

| Fonctionnalité | Rôle |
| --- | --- |
| **Passerelle d'appareils et agent de messages** (message broker) | Les appareils se connectent et échangent des messages en MQTT, HTTPS ou MQTT sur WebSocket ; des milliards d'appareils et des milliers de milliards de messages |
| **Authentification et autorisation** | Chaque appareil s'authentifie, en général avec un certificat X.509 ; des politiques IoT contrôlent ce qu'il peut faire |
| **Registre** | Enregistre chaque appareil (objet, thing) et ses attributs |
| **Shadow d'appareil** (device shadow) | Stocke le dernier état signalé et l'état souhaité d'un appareil, pour que les applications puissent le lire ou le modifier même quand l'appareil est hors ligne |
| **Moteur de règles** | Filtre et achemine les messages des appareils vers des services AWS : Lambda, DynamoDB, S3, Kinesis, SNS, SQS |

**AWS IoT Device Management** complète IoT Core pour intégrer, organiser, surveiller et mettre à jour à distance des flottes d'appareils.

| Exigence | Service |
| --- | --- |
| Connecter des capteurs au cloud et acheminer leurs mesures vers une base de données | AWS IoT Core |
| Connaître l'état actuel d'un appareil hors ligne | Shadow d'appareil AWS IoT Core |
| Envoyer une mise à jour de micrologiciel à une flotte d'appareils | AWS IoT Device Management |

<!-- section: key-points -->
## Points clés

- AWS CLI : terminal et scripts. SDKs : code d'application. CodeBuild : build et tests. CodePipeline : pipeline de publication. X-Ray : traçage des requêtes.
- WorkSpaces : bureaux virtuels. AppStream 2.0 (WorkSpaces Applications) : applications diffusées. WorkSpaces Secure Browser : navigateur diffusé pour les applications web et SaaS.
- Le calcul pour l'utilisateur final diffuse des pixels ; les données restent dans AWS.
- AWS Amplify : créer, déployer et héberger des applications web et mobiles full-stack ; Amplify Hosting apporte le CI/CD depuis Git et la diffusion par CloudFront.
- AWS IoT Core : connexion sécurisée des appareils, messagerie MQTT, registre, shadow d'appareil, moteur de règles. IoT Device Management : intégration, surveillance et mise à jour des flottes.
