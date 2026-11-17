Chaque connexion à une ressource Azure SQL passe deux contrôles : l'authentification (qui êtes-vous, par l'authentification SQL, l'authentification Windows ou Microsoft Entra ID) et l'autorisation (que pouvez-vous faire, par les principaux de serveur et de base de données, les rôles et les autorisations). Les questions d'examen décrivent une identité, une offre et une contrainte (privilège minimum, aucun mot de passe, effort d'administration minimal) et demandent quel principal créer, où, et avec quelle instruction T-SQL.

<!-- section: entra-authentication | objectives: 2.1.1 -->
## Authentification Microsoft Entra

L'authentification Microsoft Entra commence par un **administrateur Microsoft Entra** sur le serveur logique (Azure SQL Database) ou sur l'instance managée. Sans lui, aucune identité Microsoft Entra ne peut se connecter.

| Fait | Détail |
| --- | --- |
| Nombre d'administrateurs | **Un seul** par serveur ou instance |
| Type d'administrateur | Utilisateur, groupe, principal de service ou identité managée |
| Groupe comme administrateur | Chaque membre du groupe est administrateur |
| Effet dans les bases | Mappé sur `dbo` (membre de `db_owner`) dans chaque base de données utilisateur |
| Suppression de l'administrateur | Désactive **toutes** les connexions Microsoft Entra, même pour les utilisateurs qui ont des autorisations dans la base |
| Portail | Serveur ou instance managée > Paramètres > **Microsoft Entra ID** > **Définir l'administrateur** > Enregistrer |

```bash
az sql server ad-admin create --resource-group RG1 --server-name sql-contoso \
  --display-name "SQL Admins" --object-id 00000000-0000-0000-0000-000000000000

az sql mi ad-admin create --resource-group RG1 --managed-instance mi-contoso \
  --display-name "SQL Admins" --object-id 00000000-0000-0000-0000-000000000000
```

Méthodes d'authentification proposées par les pilotes et les outils :

| Méthode | À utiliser pour |
| --- | --- |
| Microsoft Entra MFA (Universal with MFA, interactive) | Les administrateurs et utilisateurs qui doivent passer l'authentification multifacteur |
| Microsoft Entra Password | Les identités cloud dont le mot de passe est stocké dans Microsoft Entra ID (sans MFA) |
| Microsoft Entra Integrated | Les clients joints à un domaine, avec des identités hybrides fédérées avec AD DS : authentification unique |
| Identité managée (affectée par le système ou par l'utilisateur) | Les applications hébergées dans Azure : basée sur un jeton, **aucun secret à stocker**, le choix recommandé |
| Principal de service avec une clé secrète client | Les applications hors d'Azure ; déconseillé car le secret est un mot de passe |

L'**authentification Microsoft Entra uniquement** désactive l'authentification SQL (et l'authentification Windows sur une instance managée) pour tout le serveur ou toute l'instance. Les connexions SQL existantes ne sont pas supprimées ; elles ne peuvent simplement plus se connecter. Un administrateur Microsoft Entra doit être défini au préalable, et il ne peut pas être supprimé tant que la fonctionnalité est active.

```bash
az sql server ad-only-auth enable --resource-group RG1 --name sql-contoso
az sql mi ad-only-auth enable --resource-group RG1 --name mi-contoso
```

Le rôle **SQL Security Manager** (ou Owner, Contributor) peut l'activer ; SQL Server Contributor et SQL Managed Instance Contributor ne le peuvent pas. Azure Policy peut imposer la création des nouveaux serveurs avec l'authentification Microsoft Entra uniquement.

**SQL Server 2022 et versions ultérieures** accepte aussi l'authentification Microsoft Entra, sous Windows et Linux :

| Où SQL Server s'exécute | Prérequis |
| --- | --- |
| Local ou autres clouds | Inscrire SQL Server et son hôte auprès d'**Azure Arc** (agent Azure Connected Machine et extension Azure pour SQL Server) |
| Machine virtuelle Azure (Windows) | Inscrire auprès de l'**extension SQL IaaS Agent**, pas d'Azure Arc, puis l'activer dans Security Configuration (voir la section suivante) |

> **Piège d'examen.** L'authentification Microsoft Entra ne s'intègre pas à Azure RBAC pour l'accès aux données. SQL DB Contributor ou SQL Server Contributor sur la ressource permet de gérer la base, pas de la lire : l'accès à la base exige toujours un principal de base de données.

<!-- section: vm-mi-authentication | objectives: 2.1.2 -->
## Authentification sur les machines virtuelles SQL Server et SQL Managed Instance

Les deux offres qui conservent une instance SQL Server complète ont des options différentes :

| Méthode | SQL Server sur machine virtuelle Azure | Azure SQL Managed Instance |
| --- | --- | --- |
| Authentification SQL | Oui, si l'instance est en **mode mixte** | Oui (administrateur SQL créé au déploiement) |
| Authentification Windows avec AD DS | Oui, quand la machine virtuelle est jointe à un domaine AD DS | Pas de jonction à un domaine |
| Authentification Windows pour les principaux Microsoft Entra | Non | Oui, par **Microsoft Entra Kerberos** |
| Authentification Microsoft Entra | SQL Server 2022 ou ultérieur, par l'extension SQL IaaS Agent | Oui, administrateur Microsoft Entra et connexions |

**SQL Server sur une machine virtuelle Azure.** L'authentification Windows est toujours activée. Dans le portail, l'onglet **Paramètres SQL Server** de la création de la machine virtuelle active l'authentification SQL avec un nom de connexion et un mot de passe : cela configure le mode mixte. Sur une instance existante, changez le mode d'authentification du serveur dans SSMS (Server properties > Security) et **redémarrez le service SQL Server**.

Pour activer l'authentification Microsoft Entra sur une machine virtuelle SQL Server :

1. Exécutez SQL Server 2022 ou ultérieur sous Windows et inscrivez la machine virtuelle auprès de l'extension SQL IaaS Agent.
2. Donnez à la machine virtuelle une **identité managée** affectée par le système ou par l'utilisateur dans le même locataire.
3. Attribuez à cette identité le rôle Microsoft Entra **Directory Readers**, ou les autorisations d'application Microsoft Graph `User.Read.All`, `GroupMember.Read.All` et `Application.Read.All`.
4. Autorisez les ports sortants 80 et 443 vers Microsoft Entra ID (étiquette de service NSG `AzureActiveDirectory`).
5. Dans le portail : machine virtuelle SQL > Sécurité > **Security Configuration** > Microsoft Entra authentication > Enable, puis sélectionnez l'identité.
6. Créez les connexions avec `CREATE LOGIN ... FROM EXTERNAL PROVIDER`.

Une fois activée, elle **ne peut pas être désactivée**. Les instances de cluster de basculement ne sont pas prises en charge.

**SQL Managed Instance.** L'identité managée de l'instance a besoin de **Directory Readers** (ou des autorisations Graph équivalentes) pour que les connexions et les groupes Microsoft Entra fonctionnent ; une bannière de la page Microsoft Entra ID permet à un Privileged Role Administrator de l'accorder. L'**authentification Windows pour les principaux Microsoft Entra** utilise Microsoft Entra Kerberos : des identités hybrides sur des clients joints à un domaine, joints à Microsoft Entra ou joints hybrides se connectent avec l'authentification Windows, sans Microsoft Entra Domain Services ni nouvelle infrastructure locale. C'est la réponse pour un lift-and-shift d'une application héritée qui ne peut pas modifier son code d'authentification.

> **Piège d'examen.** Managed Instance ne peut pas rejoindre un domaine AD DS. « Conserver l'authentification Windows pour une application déplacée vers SQL Managed Instance » signifie authentification Windows pour les principaux Microsoft Entra (Kerberos), pas une jonction à un domaine.

<!-- section: security-principals | objectives: 2.1.3 -->
## Principaux de sécurité

Les principaux existent à deux niveaux :

| Niveau | Principal | Créé avec | Stocké dans |
| --- | --- | --- | --- |
| Serveur | Connexion SQL, connexion Windows (machine virtuelle), connexion Microsoft Entra | `CREATE LOGIN` | `master` |
| Base de données | Utilisateur mappé à une connexion | `CREATE USER ... FROM LOGIN` | La base de données utilisateur |
| Base de données | Utilisateur de base de données autonome (mot de passe SQL ou identité Microsoft Entra) | `CREATE USER ... WITH PASSWORD` ou `FROM EXTERNAL PROVIDER` | La base de données utilisateur seulement |
| Base de données | Rôle de base de données, rôle d'application | `CREATE ROLE`, `CREATE APPLICATION ROLE` | La base de données utilisateur |

Connexion ou utilisateur autonome :

| Besoin | Choix |
| --- | --- |
| La base change de serveur ou est géorépliquée sans recréer les principaux | Utilisateur autonome : les données d'authentification suivent la base |
| Une identité accède à plusieurs bases avec un seul mot de passe | Connexion dans `master` et un utilisateur dans chaque base |
| Autorisations au niveau du serveur (créer des bases, lire l'état du serveur) | Connexion, ajoutée à un rôle serveur |

> **Piège d'examen.** Avec la géoréplication ou les groupes de basculement, une connexion doit être créée sur le serveur secondaire **avec le même SID**, sinon les utilisateurs de la base répliquée sont orphelins après le basculement. Les utilisateurs autonomes évitent le problème.

Les rôles au niveau du serveur diffèrent selon l'offre :

| Offre | Rôles serveur |
| --- | --- |
| SQL Server (machine virtuelle) et SQL Managed Instance | Rôles serveur fixes classiques : `sysadmin`, `securityadmin`, `serveradmin`, `dbcreator`, `processadmin`... |
| Azure SQL Database | `##MS_DatabaseConnector##`, `##MS_DatabaseManager##`, `##MS_DefinitionReader##`, `##MS_LoginManager##`, `##MS_SecurityDefinitionReader##`, `##MS_ServerStateManager##`, `##MS_ServerStateReader##` |
| Azure SQL Database, `master` seulement | Rôles de base de données `dbmanager` (créer des bases) et `loginmanager` (créer des connexions) |

Azure SQL Database n'a pas de `sysadmin` : l'administrateur du serveur et l'administrateur Microsoft Entra sont les seuls administrateurs complets, et eux seuls peuvent ajouter des connexions aux rôles serveur. `##MS_DatabaseManager##` crée des bases ; le créateur devient `dbo` de cette base uniquement.

Les neuf rôles de base de données fixes : `db_owner`, `db_securityadmin`, `db_accessadmin`, `db_backupoperator`, `db_ddladmin`, `db_datawriter`, `db_datareader`, `db_denydatawriter`, `db_denydatareader`.

<!-- section: entra-users | objectives: 2.1.4 -->
## Créer des utilisateurs à partir d'identités Microsoft Entra

```text
-- Contained users, run in the user database
CREATE USER [adrian@contoso.com] FROM EXTERNAL PROVIDER;   -- user: UPN
CREATE USER [SQL Readers] FROM EXTERNAL PROVIDER;          -- group: display name
CREATE USER [app-orders] FROM EXTERNAL PROVIDER;           -- managed identity or app: display name
CREATE USER [alice@fabrikam.com] FROM EXTERNAL PROVIDER;    -- guest of the tenant

-- Server principal, run in master (Azure SQL Database) or on the instance
CREATE LOGIN [SQL Operators] FROM EXTERNAL PROVIDER;
CREATE USER [SQL Operators] FROM LOGIN [SQL Operators];    -- in each database
```

Règles à retenir :

- Seul un principal **Microsoft Entra** peut exécuter ces instructions : l'administrateur du serveur SQL et les connexions SQL ne peuvent pas créer d'utilisateurs ni de connexions Microsoft Entra, quelles que soient leurs autorisations.
- Les premiers principaux Microsoft Entra sont créés par l'administrateur Microsoft Entra. Créer un utilisateur exige `ALTER ANY USER` ; créer une connexion exige l'administrateur Microsoft Entra ou `loginmanager` / `##MS_LoginManager##`.
- Le serveur résout les noms par Microsoft Graph : dans Azure SQL Database, l'identité du serveur peut détenir `User.Read.All`, `GroupMember.Read.All` et `Application.Read.All` ; SQL Managed Instance a besoin de Directory Readers sur son identité.
- Un nouvel utilisateur reçoit seulement `CONNECT`. Accordez les autorisations à des rôles, et ajoutez les groupes aux rôles.
- Les membres d'un groupe n'ont pas d'utilisateur implicite : ils n'ont pas de schéma par défaut. Créez l'utilisateur du groupe avec `WITH DEFAULT_SCHEMA = dbo` si les membres créent des objets.
- `ALTER LOGIN [name] DISABLE` bloque une connexion Microsoft Entra et tous les utilisateurs créés à partir d'elle, mais pas les utilisateurs autonomes, et n'est pas pris en charge pour les groupes.

> **Conseil d'examen.** « L'application s'exécute dans Azure App Service et ne doit stocker aucun identifiant » signifie : activer une identité managée sur l'application, puis `CREATE USER [app name] FROM EXTERNAL PROVIDER` et accorder un rôle. Ni connexion SQL ni secret de principal de service.

<!-- section: graphical-tools | objectives: 2.1.5 -->
## Autorisations avec les outils graphiques

Les autorisations de base de données et d'objet vivent dans le moteur : l'outil graphique est donc **SQL Server Management Studio (SSMS)**, pas le portail Azure, dont le Contrôle d'accès (IAM) attribue des rôles Azure sur la ressource.

| Tâche dans SSMS | Chemin |
| --- | --- |
| Créer une connexion | Server > Security > Logins > New Login |
| Créer un utilisateur de base de données | Database > Security > Users > New User (type d'utilisateur : with login, without login, Microsoft Entra...) |
| Ajouter un utilisateur à un rôle | User Properties > page **Membership**, ou Role Properties > Add |
| Accorder des autorisations sur la base | Database Properties > page **Permissions** : sélectionner le principal, puis Grant / With Grant / Deny |
| Accorder des autorisations sur un objet | Properties de la table ou de la procédure > page **Permissions**, ou User Properties > page **Securables** > Search |
| Autorisations de colonne | Dans la page Permissions de l'objet, sélectionner Select, puis **Column Permissions** |

Chaque boîte de dialogue a un bouton **Script** qui produit le T-SQL équivalent.

<!-- section: least-privilege | objectives: 2.1.6 -->
## Privilège minimum pour tous les éléments sécurisables

Les éléments sécurisables forment une hiérarchie : **serveur > base de données > schéma > objet** (table, vue, procédure, fonction). Une autorisation accordée à un niveau s'applique à tout ce qui est en dessous : `GRANT SELECT ON SCHEMA::Sales` couvre toutes les tables actuelles et futures du schéma.

| Exigence | Réponse de privilège minimum |
| --- | --- |
| Lire toutes les tables d'une base | `db_datareader`, ou `SELECT` sur la base |
| Lire seulement les tables d'un schéma | `GRANT SELECT ON SCHEMA::Sales` |
| Modifier les données uniquement par des procédures stockées | `GRANT EXECUTE` sur les procédures (ou le schéma), aucune autorisation sur les tables : le **chaînage des propriétés** permet à la procédure d'atteindre les tables du même propriétaire |
| Masquer quelques colonnes | `GRANT SELECT (col1, col2)` au niveau des colonnes, ou une vue |
| Gérer les utilisateurs et les rôles | `db_securityadmin` et `db_accessadmin`, pas `db_owner` |
| Lire les DMV d'une base | `VIEW DATABASE STATE` (ou `VIEW DATABASE PERFORMANCE STATE`) |
| Lire les DMV de tout un serveur logique | `##MS_ServerStateReader##` |
| Se connecter à toutes les bases pour la supervision sans créer d'utilisateurs | `##MS_DatabaseConnector##` |
| Gérer la ressource Azure, pas les données | Rôle Azure SQL DB Contributor (bases), SQL Server Contributor (serveurs), SQL Managed Instance Contributor |
| Gérer l'audit, TDE, le pare-feu et les stratégies de sécurité | Rôle Azure **SQL Security Manager** |

Logique des autorisations :

1. Les autorisations sont **cumulatives** : un utilisateur obtient l'union de ses propres octrois, de ses rôles et de ses groupes.
2. **DENY l'emporte** sur GRANT au même niveau ou à un niveau inférieur, avec une exception : un GRANT au niveau d'une colonne l'emporte sur un DENY au niveau de la table.
3. `REVOKE` retire seulement un GRANT ou un DENY précédent ; il ne bloque pas un accès accordé ailleurs.
4. Les membres de `sysadmin` et les propriétaires d'objets ne peuvent pas se voir refuser d'autorisations ; dans Azure SQL Database, l'administrateur du serveur et l'administrateur Microsoft Entra sont mappés sur `dbo`.

> **Piège d'examen.** Ajouter une application à `db_owner` « pour que ça fonctionne » n'est jamais la réponse de privilège minimum. Créez un rôle personnalisé (`CREATE ROLE`), accordez-lui exactement ce qui est nécessaire, et ajoutez l'utilisateur au rôle.

<!-- section: troubleshoot-access | objectives: 2.1.7 -->
## Résoudre les problèmes d'authentification et d'autorisation

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| Erreur **18456** Login failed | Mot de passe erroné, connexion désactivée, connexion ou utilisateur absent | Vérifier `sys.sql_logins.is_disabled`, `ALTER LOGIN ... ENABLE`, créer le principal |
| 18456 pour un **utilisateur autonome** | La connexion vise `master`, où l'utilisateur autonome n'existe pas | Indiquer le nom de la base dans la chaîne de connexion |
| Erreur **40615** Cannot connect | L'IP du client n'est pas autorisée par le pare-feu | Ajouter une règle IP au niveau du serveur ou de la base |
| Erreur **4060** Cannot open database | Nom de base erroné, ou aucun utilisateur pour la connexion dans la base | Créer l'utilisateur ou corriger le nom |
| Erreur **229** autorisation refusée sur un objet | Authentifié, mais pas autorisé | Accorder l'autorisation à un rôle de l'utilisateur ; chercher un DENY |
| Erreur **33134** sur `CREATE USER ... FROM EXTERNAL PROVIDER` | L'accès conditionnel bloque Microsoft Graph, ou un principal de service exécute l'instruction | Revoir l'accès conditionnel, l'exécuter en tant qu'utilisateur |
| Les utilisateurs Microsoft Entra échouent après un basculement | Pas d'administrateur Microsoft Entra sur le serveur ou l'instance secondaire | Définir un administrateur Microsoft Entra des deux côtés |
| Une modification d'autorisation n'est pas vue | Les autorisations sont mises en cache par connexion (les changements de rôle serveur prennent jusqu'à 5 minutes) | Se reconnecter, ou exécuter `DBCC FLUSHAUTHCACHE` |
| Les connexions SQL échouent partout sur le serveur | L'authentification Microsoft Entra uniquement est activée | Utiliser des identités Microsoft Entra, ou désactiver la fonctionnalité |

Vérifications utiles :

```text
SELECT name, type_desc, authentication_type_desc FROM sys.database_principals;
SELECT * FROM sys.fn_my_permissions(NULL, 'DATABASE');
SELECT HAS_PERMS_BY_NAME('Sales.Orders', 'OBJECT', 'SELECT');
SELECT SERVERPROPERTY('IsExternalAuthenticationOnly');
```

<!-- section: tsql-access | objectives: 2.1.8 -->
## Gérer l'accès avec T-SQL

```text
-- Azure SQL Database: login in master, user in the database
CREATE LOGIN app_login WITH PASSWORD = 'Str0ng!Passw0rd#2026';
CREATE USER app_user FROM LOGIN app_login;

-- Contained SQL user, run in the user database
CREATE USER report_user WITH PASSWORD = 'An0ther!Str0ng#Pass';

-- Custom role with least privilege
CREATE ROLE sales_reader;
GRANT SELECT ON SCHEMA::Sales TO sales_reader;
DENY SELECT ON Sales.Salaries TO sales_reader;
ALTER ROLE sales_reader ADD MEMBER report_user;

-- Procedures only
GRANT EXECUTE ON SCHEMA::Api TO app_user;

-- Remove access
REVOKE SELECT ON SCHEMA::Sales FROM sales_reader;
ALTER ROLE sales_reader DROP MEMBER report_user;

-- Server role in Azure SQL Database, run in master
ALTER SERVER ROLE ##MS_ServerStateReader## ADD MEMBER monitor_login;

-- Server role in SQL Managed Instance or SQL Server
ALTER SERVER ROLE dbcreator ADD MEMBER [deploy@contoso.com];
```

| Instruction | Effet |
| --- | --- |
| `GRANT ... WITH GRANT OPTION` | Le bénéficiaire peut accorder l'autorisation à d'autres |
| `ALTER ROLE ... ADD MEMBER` | Appartenance à un rôle de base de données (remplace `sp_addrolemember`) |
| `ALTER SERVER ROLE ... ADD MEMBER` | Appartenance à un rôle serveur (remplace `sp_addsrvrolemember`) |
| `ALTER USER ... WITH DEFAULT_SCHEMA = dbo` | Schéma par défaut des noms d'objets sans schéma |
| `EXECUTE AS USER = '...'` | Emprunte l'identité d'un utilisateur de base pour tester ses autorisations ; `REVERT` revient. L'emprunt d'identité d'une connexion n'est pas pris en charge dans Azure SQL Database |

Dans Azure SQL Database, `USE` ne change pas de base : connectez-vous à `master` pour les connexions et les rôles serveur, et à la base utilisateur pour les utilisateurs et les autorisations.

<!-- section: key-points -->
## Points clés

- Un seul administrateur Microsoft Entra par serveur ou instance ; choisissez un groupe. Le supprimer arrête toutes les connexions Microsoft Entra.
- L'authentification Microsoft Entra uniquement bloque les connexions SQL sans les supprimer ; SQL Security Manager peut la basculer.
- Seuls les principaux Microsoft Entra créent des utilisateurs Microsoft Entra : `CREATE USER [name] FROM EXTERNAL PROVIDER`.
- L'identité managée est la réponse sans mot de passe pour les applications.
- Managed Instance : Directory Readers pour son identité, authentification Windows par Microsoft Entra Kerberos, pas de jonction à un domaine.
- Machine virtuelle SQL Server : mode mixte pour les connexions SQL ; authentification Microsoft Entra à partir de SQL Server 2022 par l'extension SQL IaaS Agent et une identité managée.
- Les utilisateurs autonomes suivent la base ; les connexions exigent le même SID sur chaque réplica.
- Privilège minimum : rôles personnalisés, octrois au niveau du schéma, EXECUTE sur les procédures ; DENY l'emporte, sauf sur un GRANT de colonne.
- Azure RBAC gère la ressource ; les principaux et autorisations de base de données gèrent les données.
