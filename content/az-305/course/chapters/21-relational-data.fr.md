Les questions relationnelles de l'AZ-305 suivent un même schéma : une charge de travail et quelques contraintes (compatibilité, taille, profil d'utilisation, coût, conformité), à partir desquelles vous recommandez le service, le niveau, la façon de le mettre à l'échelle et la protection de ses données.

<!-- section: choose-service | objectives: 2.1.1 -->
## Choisir le service relationnel

Azure SQL exécute le même moteur à trois niveaux de contrôle. Retenez l'option la plus managée qui prend en charge toutes les fonctionnalités dont la charge de travail a besoin.

| Exigence du scénario | Recommandation |
| --- | --- |
| Nouvelle application cloud, effort d'administration minimal, mise à l'échelle par base de données | Azure SQL Database (base de données unique) |
| Nombreuses bases de données à l'utilisation variable et imprévisible, un seul budget | Pool élastique Azure SQL Database |
| Migrer SQL Server avec des fonctionnalités d'instance et peu de modifications, sans système d'exploitation à gérer | Azure SQL Managed Instance |
| Accès au système d'exploitation, version précise de SQL Server, SSRS ou SSAS sur le serveur, agents tiers | SQL Server sur machines virtuelles Azure |
| Moteur open source PostgreSQL ou MySQL, entièrement managé | Azure Database for PostgreSQL (serveur flexible), Azure Database for MySQL (serveur flexible) |
| Très grande base de données (dizaines de téraoctets, jusqu'à 128 To) sur un service de plateforme | Azure SQL Database Hyperscale |

Ce qui distingue les trois options SQL :

| Capacité | SQL Database | SQL Managed Instance | SQL Server sur machines virtuelles Azure |
| --- | --- | --- | --- |
| SQL Server Agent | Non (travaux élastiques à la place) | Oui | Oui |
| Requêtes et transactions entre bases de données | Non (requête élastique à la place) | Oui, au sein de l'instance | Oui |
| CLR, Service Broker, Database Mail, serveurs liés | Non | Oui | Oui |
| Restauration native d'un fichier `.bak` | Non | Oui, à partir d'une URL | Oui |
| Authentification Windows | Non | Oui, pour les principaux Microsoft Entra (Kerberos) | Oui |
| Modèle réseau | Point de terminaison public avec règles de pare-feu, ou point de terminaison privé | Injectée dans votre réseau virtuel | Dans votre réseau virtuel |
| Mises à jour correctives, sauvegardes, haute disponibilité | Intégrées | Intégrées | À concevoir vous-même (l'extension SQL IaaS Agent en automatise une partie) ; un redimensionnement provoque un temps d'arrêt |
| Taille maximale | 128 To (Hyperscale) | 16 To, 32 To avec Next-gen General Purpose | 256 To de stockage par instance |

> **Piège d'examen.** « Réduire au minimum les modifications de l'application » avec des travaux SQL Agent, des requêtes entre bases de données, du CLR ou des serveurs liés désigne SQL Managed Instance, pas SQL Database. « Le serveur héberge aussi SSRS ou SSAS » ou « l'éditeur exige un accès au système d'exploitation » désigne SQL Server sur machines virtuelles Azure. Aucun des deux services de plateforme n'exécute SSRS ni SSAS ; les packages SSIS s'exécutent dans un runtime d'intégration Azure-SSIS d'Azure Data Factory.

Pour les moteurs open source, recommandez un serveur flexible (PostgreSQL ou MySQL) : haute disponibilité redondante interzone avec un serveur de secours dans une autre zone de disponibilité, serveur que l'on peut arrêter pour suspendre la facturation du calcul (un serveur flexible PostgreSQL arrêté redémarre de lui-même au bout de sept jours), et sauvegardes automatiques conservées 7 jours par défaut et jusqu'à 35 jours.

<!-- section: service-compute-tiers | objectives: 2.1.2 -->
## Niveaux de service et niveaux de calcul

**Modèle d'achat.** Azure SQL Database en propose deux. Le modèle DTU regroupe calcul, stockage et E/S dans des tailles fixes : Basic (5 DTU, 2 Go), Standard (jusqu'à 3 000 DTU, 1 To) et Premium (jusqu'à 4 000 DTU, 4 To). Le modèle vCore dimensionne séparément le calcul et le stockage, et il est le seul à proposer le niveau de calcul serverless, le niveau de service Hyperscale, Azure Hybrid Benefit et la capacité réservée. SQL Managed Instance n'existe qu'en vCore.

Le **niveau de service** (modèle vCore) fixe l'architecture de stockage, donc les performances et la résilience :

| | General Purpose | Business Critical | Hyperscale |
| --- | --- | --- | --- |
| Stockage | Stockage Premium distant | SSD local | Stockage découplé avec cache SSD local |
| Latence d'E/S | 5 à 10 ms | 1 à 2 ms | 1 à 2 ms sur les données fréquemment consultées |
| Taille maximale d'une base de données | 4 To | 4 To | 128 To |
| Réplicas | Un seul, aucun réplica lisible | Trois réplicas secondaires, dont un lisible sans surcoût | 0 à 4 réplicas de haute disponibilité, jusqu'à 30 réplicas nommés |
| OLTP en mémoire | Non | Oui | Non |
| Redondance de zone | Prise en charge | Prise en charge | Prise en charge |
| Usage type | La plupart des charges de travail métier, coût le plus bas | Faible latence, taux de transactions élevé | Bases de données très volumineuses ou à croissance rapide |

Les sauvegardes Hyperscale sont des instantanés de stockage : une restauration prend quelques minutes quelle que soit la taille. Une base de données migrée vers Hyperscale ne peut revenir à General Purpose que dans les 45 jours.

Le **niveau de calcul** détermine la facturation du calcul :

| | Provisionné | Serverless |
| --- | --- | --- |
| Facturation | Prix fixe par heure pour les vCores provisionnés | À la seconde pour les vCores utilisés, entre un minimum et un maximum que vous fixez |
| Mise en pause automatique | Non | Oui : après le délai de mise en pause automatique (15 minutes au minimum, 60 par défaut en General Purpose), seul le stockage est facturé. En Hyperscale, la mise en pause automatique est en préversion (60 minutes au minimum) |
| Disponible dans | General Purpose, Business Critical, Hyperscale, pools élastiques | Bases de données uniques en General Purpose et Hyperscale, sur matériel Standard-series (Gen5) uniquement |
| Idéal pour | Utilisation régulière et prévisible ; bases de données qui ne tolèrent pas un délai de reprise | Utilisation intermittente et imprévisible avec des périodes d'inactivité ; nouvelles bases de données sans historique d'utilisation |

| Exigence | Recommandation |
| --- | --- |
| Base de données de développement utilisée quelques heures par jour, coût minimal | General Purpose, serverless avec mise en pause automatique |
| Latence de lecture de 1 à 2 ms, OLTP en mémoire | Business Critical (ou Premium dans le modèle DTU) |
| Les requêtes de reporting ne doivent pas ralentir le réplica principal, sans surcoût | Business Critical : réplica lisible intégré |
| Base de données de 20 To | Hyperscale |
| Licences SQL Server existantes avec Software Assurance | Modèle vCore avec Azure Hybrid Benefit (General Purpose ou Business Critical) |
| Utilisation stable et prévisible pendant des années | Calcul provisionné avec capacité réservée |

> **Piège d'examen.** Le serverless n'existe ni en Business Critical, ni dans le modèle DTU, ni pour les pools élastiques. Une exigence comme « la première connexion après une période d'inactivité ne doit subir aucun délai » exclut la mise en pause automatique : choisissez le calcul provisionné, ou le serverless avec la mise en pause automatique désactivée.

SQL Managed Instance compte trois niveaux : General Purpose (16 To, 100 bases de données), Next-gen General Purpose (32 To, 500 bases de données, stockage plus rapide) et Business Critical (16 To, SSD local, un réplica lisible, OLTP en mémoire). Il n'a ni Hyperscale ni serverless ; une instance peut en revanche être arrêtée puis redémarrée.

Les serveurs flexibles PostgreSQL et MySQL ont trois niveaux de calcul : Burstable (développement à faible coût et charges de travail à faible concurrence) et General Purpose ou Memory Optimized (charges de travail de production à forte concurrence et aux performances prévisibles).

<!-- section: scalability | objectives: 2.1.3 -->
## Concevoir la scalabilité de la base de données

La mise à l'échelle **verticale** (scale-up) change la taille d'une base de données ; la mise à l'échelle **horizontale** (scale-out) ajoute des bases de données ou des réplicas. Recommandez la technique la plus simple qui supprime le goulet d'étranglement cité dans le scénario.

| Goulet d'étranglement ou exigence | Technique |
| --- | --- |
| Une base de données a besoin de plus de processeur, de mémoire ou d'E/S | Changer la taille de calcul ou le niveau de service (en ligne ; les connexions sont brièvement coupées à la fin) |
| La charge d'une base de données varie dans la journée, de façon imprévisible | Niveau de calcul serverless (mise à l'échelle automatique) |
| Nombreuses bases de données peu utilisées en moyenne, avec des pics à des moments différents | Pool élastique |
| Charge de travail dominée par les lectures, rapports en concurrence avec les transactions | Lecture à l'échelle (read scale-out) sur un réplica lisible |
| Lecteurs dans d'autres régions | Géoréplicas lisibles (géoréplication active, jusqu'à quatre secondaires ; serveur flexible MySQL : jusqu'à 10 réplicas en lecture) |
| Base de données au-delà de 4 To, ou croissance difficile à prévoir | Hyperscale |
| Données ou débit d'écriture au-delà d'une seule base de données ; une base de données par locataire | Partitionnement (sharding) avec les outils de base de données élastique |

**Pools élastiques.** Les bases de données d'un pool partagent des ressources (eDTU ou vCores) pour un prix unique ; vous êtes facturé pour le pool, pas par base de données. Un pool est rentable quand chaque base de données a une utilisation moyenne faible avec des pics peu fréquents qui ne coïncident pas : l'exemple de Microsoft place 20 bases de données culminant chacune à 90 DTU dans un pool de 100 eDTU. Dimensionnez le pool sur la plus grande de deux valeurs : la somme des utilisations moyennes, ou le nombre de bases de données en pic simultané multiplié par leur pic. Vous pouvez fixer un minimum et un maximum par base de données. Toutes les bases de données d'un pool sont sur le même serveur logique.

> **Piège d'examen.** Un pool élastique ne fait économiser que si les pics sont décalés. Plusieurs bases de données à l'utilisation durablement moyenne à élevée ne doivent pas partager un pool : recommandez des bases de données uniques dimensionnées pour leur charge.

**Lecture à l'échelle (read scale-out).** Les bases de données Premium et Business Critical disposent d'un réplica secondaire lisible sans surcoût ; une chaîne de connexion contenant `ApplicationIntent=ReadOnly` y est redirigée. General Purpose, Basic et Standard n'en ont pas. En Hyperscale, la lecture à l'échelle exige au moins un réplica secondaire : des réplicas de haute disponibilité, ou des réplicas nommés mis à l'échelle indépendamment du réplica principal. Les réplicas sont mis à jour de façon asynchrone : une session qui doit relire immédiatement ses propres écritures validées doit utiliser le réplica principal.

Le **partitionnement (sharding)** répartit des données de structure identique sur de nombreuses bases de données. Utilisez-le quand les données ou le débit de transactions dépassent une seule base de données, quand les locataires exigent une isolation physique, ou quand des parties des données doivent rester dans des zones géographiques différentes. Les outils de base de données élastique fournissent la bibliothèque cliente (routage des requêtes vers la bonne partition), l'outil de fractionnement et de fusion (déplacement de données entre partitions), les travaux élastiques (administration de plusieurs bases de données), les transactions élastiques et la requête élastique (encore en préversion). Le partitionnement fonctionne au mieux quand chaque transaction ne touche qu'une seule valeur de clé de partitionnement ; il complique l'application, donc recommandez-le après le scale-up, la lecture à l'échelle et Hyperscale.

<!-- section: data-protection | objectives: 2.1.4 -->
## Protéger les données relationnelles

Associez chaque menace au contrôle conçu pour elle :

| Menace ou exigence | Contrôle | À retenir |
| --- | --- | --- |
| Vol des fichiers de données ou des sauvegardes (données au repos) | Transparent Data Encryption (TDE) | Activé par défaut sur les nouvelles bases de données, avec une clé gérée par le service. Une clé gérée par le client dans Azure Key Vault vous donne le contrôle de la rotation et de la révocation |
| Écoute du réseau (données en transit) | TLS | Toujours imposé par le service |
| Les administrateurs et autres utilisateurs privilégiés ne doivent pas lire les colonnes sensibles (données en cours d'utilisation) | Always Encrypted | Les colonnes sont chiffrées par le pilote client ; la clé n'est jamais exposée au moteur de base de données. Les clés sont stockées dans Azure Key Vault ou dans le magasin de certificats Windows |
| Le support ne doit voir qu'une partie d'une valeur (quatre derniers chiffres) | Masquage dynamique des données | Masque le jeu de résultats pour les utilisateurs non privilégiés ; les données stockées ne changent pas |
| Chaque utilisateur ou locataire ne voit que ses propres lignes | Sécurité au niveau des lignes | Filtre fondé sur l'utilisateur ou le contexte d'exécution |
| Prouver que les données n'ont pas été falsifiées | Registre (ledger) | Preuve cryptographique d'intégrité |
| Enregistrer qui a fait quoi, pour la conformité | Audit | Événements écrits dans un journal d'audit de votre compte de stockage |
| Détecter les injections SQL, les attaques par force brute, les accès anormaux | Microsoft Defender pour SQL | Alertes Advanced Threat Protection et évaluation des vulnérabilités |
| Aucun mot de passe stocké dans les applications, identités centralisées | Authentification Microsoft Entra | Prend en charge l'authentification multifacteur et l'accès conditionnel |
| Tenir la base de données à l'écart de l'Internet public | Point de terminaison privé (SQL Database), injection dans le réseau virtuel (SQL Managed Instance) | Les règles de pare-feu et de réseau virtuel ne font que restreindre un point de terminaison public |

> **Piège d'examen.** Le masquage dynamique des données n'est pas un chiffrement : un utilisateur doté d'autorisations suffisantes, et tout administrateur, lit toujours les vraies valeurs. TDE ne cache rien non plus à un utilisateur authentifié ; il protège les fichiers. Seul Always Encrypted rend les données illisibles pour les administrateurs de base de données.

> **Conseil d'examen.** « L'organisation doit contrôler la clé de chiffrement et pouvoir la révoquer » désigne TDE avec une clé gérée par le client dans Azure Key Vault. « Les colonnes réglementées ne doivent jamais apparaître en clair sur le serveur » désigne Always Encrypted.

Les sauvegardes complètent la protection des données. SQL Database et SQL Managed Instance effectuent des sauvegardes automatiques, permettent la restauration à un instant dans le passé sur 1 à 35 jours (7 par défaut) et conservent des sauvegardes complètes jusqu'à 10 ans avec la conservation à long terme. Le stockage de sauvegarde est géoredondant par défaut ; choisissez un stockage de sauvegarde localement redondant ou redondant interzone quand les sauvegardes doivent rester dans la région, en sachant que la géorestauration n'est alors plus disponible. Le chapitre sur la sauvegarde et la reprise d'activité développe ces choix.

<!-- section: key-points -->
## Points clés

- L'option la plus managée qui convient : SQL Database pour les nouvelles applications, SQL Managed Instance pour les fonctionnalités SQL Server d'instance, SQL Server sur machines virtuelles Azure pour l'accès au système d'exploitation, SSRS ou SSAS.
- General Purpose est le choix par défaut ; Business Critical pour une latence de 1 à 2 ms, l'OLTP en mémoire et un réplica lisible gratuit ; Hyperscale au-delà de 4 To et jusqu'à 128 To.
- Serverless : bases de données uniques en General Purpose ou Hyperscale, facturation à la seconde, mise en pause automatique (en préversion en Hyperscale) ; jamais en Business Critical, en DTU ni en pool élastique.
- Pool élastique pour de nombreuses bases de données aux pics décalés ; lecture à l'échelle pour les charges dominées par les lectures ; partitionnement en dernier.
- TDE protège les fichiers, TLS le réseau, Always Encrypted cache les données aux administrateurs, le masquage dynamique ne les cache que dans les résultats, la sécurité au niveau des lignes filtre les lignes.
- Clé TDE gérée par le client dans Azure Key Vault quand l'organisation doit contrôler ou révoquer la clé.
