IaaS, PaaS et SaaS se distinguent par ce que le fournisseur gère à votre place. Savoir où passe la limite pour chacun répond à la fois aux questions « quel type de service » et aux questions de responsabilité partagée.

<!-- section: iaas | objectives: 1.3.1 -->
## Infrastructure as a service (IaaS)

IaaS est la catégorie la plus souple : le fournisseur entretient le matériel, la connectivité réseau et la sécurité physique, et **vous gérez tout le reste** : installation, configuration et maintenance du système d'exploitation, configuration du réseau, bases de données, stockage et applications. Vous louez en quelque sorte du matériel dans un centre de données cloud.

Exemples Azure : Machines virtuelles Azure, Réseau virtuel Azure, Stockage sur disque Azure.

Scénarios types :

- **Migration lift-and-shift** : vous reconstruisez dans le cloud les mêmes serveurs qu'en local et vous y déplacez les charges telles quelles.
- **Test et développement** : des environnements standard que vous créez, dupliquez et arrêtez rapidement, en gardant un contrôle complet.

<!-- section: paas | objectives: 1.3.2 -->
## Platform as a service (PaaS)

PaaS est le juste milieu. Le fournisseur entretient l'infrastructure physique **et** les systèmes d'exploitation, les intergiciels, les outils de développement et les services de décisionnel. **Vous apportez l'application et ses données**, et vous gérez les contrôles d'accès, sans vous soucier des licences ni des correctifs de la plateforme. Selon la configuration du service, certains paramètres de réseau et de sécurité de l'application sont partagés.

Exemples Azure : Azure App Service, Azure SQL Database, Azure Functions, Azure Container Apps.

Scénarios types :

- **Infrastructure de développement** : les développeurs s'appuient sur des composants prêts à l'emploi (scalabilité, haute disponibilité, mutualisation) et écrivent moins de code.
- **Analytique et décisionnel** : des outils fournis avec la plateforme analysent les données et alimentent les décisions.

<!-- section: saas | objectives: 1.3.3 -->
## Software as a service (SaaS)

SaaS est une application complète, prête à l'emploi, que vous louez. C'est le modèle le moins souple et le plus simple à démarrer : le fournisseur gère tout, du centre de données à l'application. **Vous restez responsable des données que vous y mettez, des appareils qui s'y connectent et des comptes des utilisateurs.**

Exemples : Microsoft 365, Dynamics 365, la messagerie Outlook.

Scénarios types : messagerie, applications de productivité, suivi des finances et des dépenses.

<!-- section: service-type-use-cases | objectives: 1.3.4 -->
## Choisir un type de service

| | IaaS | PaaS | SaaS |
| --- | --- | --- | --- |
| Vous gérez | Système d'exploitation, intergiciels, runtime, applications, données | Applications et données | Données, appareils, comptes |
| Le fournisseur gère | Centre de données, matériel, réseau, virtualisation | Aussi le système d'exploitation, les intergiciels, le runtime | Aussi l'application |
| Souplesse et contrôle | Les plus élevés | Moyens | Les plus faibles |
| Effort d'exploitation | Le plus élevé | Moyen | Le plus faible |
| À choisir quand | Il vous faut le contrôle complet du système d'exploitation, ou vous déplacez des serveurs existants tels quels | Vous voulez déployer votre code sans gérer de serveurs | Une application toute faite couvre le besoin |

Lire un scénario :

| Scénario | Réponse |
| --- | --- |
| « Migrer une machine virtuelle vers Azure sans la modifier » | IaaS |
| « Installer un logiciel spécifique qui demande l'accès au système d'exploitation » | IaaS |
| « Héberger une application web ; l'équipe ne veut pas appliquer de correctifs aux serveurs » | PaaS |
| « Une base de données managée dont Microsoft gère les sauvegardes et les mises à niveau » | PaaS |
| « Donner cette semaine à tous les employés une messagerie et un calendrier partagé » | SaaS |

Les offres serverless comme Azure Functions sont en général classées dans PaaS : encore moins à gérer, et une facturation à l'exécution.

> **Piège d'examen.** Une machine virtuelle est de l'IaaS même si elle ne fait tourner qu'une base de données. Azure SQL Database est du PaaS ; SQL Server installé sur une machine virtuelle Azure est de l'IaaS.

<!-- section: key-points -->
## Points clés

- IaaS : vous louez de l'infrastructure et gérez le système d'exploitation et tout ce qui est au-dessus. Le plus de contrôle, le plus de travail.
- PaaS : vous apportez le code et les données ; la plateforme, système d'exploitation compris, est gérée pour vous.
- SaaS : vous utilisez une application finie ; vous ne gérez que les données, les appareils et les comptes.
- Lift-and-shift et environnements de test pointent vers IaaS ; infrastructures de développement et bases managées vers PaaS ; messagerie et outils de productivité vers SaaS.
