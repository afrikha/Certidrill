Les questions sur la sécurité d'Azure SQL combinent trois couches : qui peut atteindre le serveur logique ou l'instance managée (réseau), qui peut se connecter et comment les données sont chiffrées (identité et clés), et comment l'activité est enregistrée et surveillée (audit et Microsoft Defender for Databases). La plupart des réponses dépendent d'un détail d'étendue : serveur ou base de données, Azure SQL Database ou Azure SQL Managed Instance, abonnement ou ressource.

<!-- section: sql-network | objectives: 2.2.1 -->
## Accès réseau à Azure SQL

Pour un serveur logique Azure SQL Database, **Sécurité > Mise en réseau** comporte trois paramètres qui fonctionnent ensemble.

| Paramètre | Valeurs | Faits d'examen |
| --- | --- | --- |
| Accès au réseau public | Désactiver (par défaut), Réseaux sélectionnés | Désactivé : seuls les points de terminaison privés se connectent (erreur 47073), et les règles de pare-feu ne peuvent être ni créées ni modifiées (erreur 42101) |
| Version TLS minimale | 1.2 (la plus basse prise en charge), 1.3 | Les clients sous le minimum échouent avec l'erreur 47072. Une fois un minimum imposé, impossible de revenir à la valeur par défaut |
| Stratégie de connexion | Default, Redirect, Proxy | Redirect est recommandée plutôt que Proxy (latence la plus faible, débit le plus élevé) |

Avec **Réseaux sélectionnés**, le pare-feu admet :

| Règle | Étendue | Comment la créer | Limites |
| --- | --- | --- | --- |
| Règle IP au niveau du serveur | Toutes les bases du serveur ; stockée dans `master` | Portail, CLI, PowerShell (Owner ou Contributor de l'abonnement, SQL Server Contributor, SQL Security Manager) ou `sp_set_firewall_rule` dans `master` | 256 par serveur |
| Règle IP au niveau de la base de données | Une base ; stockée dans la base (portable avec elle) | T-SQL uniquement : `sp_set_database_firewall_rule`, avec `CONTROL DATABASE` | 256 par base |
| Règle de réseau virtuel | Toutes les bases du serveur | Sous-réseau avec le point de terminaison de service `Microsoft.Sql` (Network Contributor), puis la règle (SQL Server Contributor) | 128 par serveur |
| Autoriser les services et les ressources Azure à accéder à ce serveur | Règle `AllowAllWindowsAzureIps` (0.0.0.0) | Une case à cocher, désactivée par défaut | Admet **tous** les services Azure, y compris les abonnements d'autres clients |

Évaluation : les règles au niveau de la base cible sont vérifiées d'abord, puis les règles au niveau du serveur ; sans correspondance, la connexion échoue. Les changements peuvent mettre jusqu'à cinq minutes (`DBCC FLUSHAUTHCACHE` force l'actualisation). Les clients hors d'Azure ont besoin du TCP 1433 sortant.

```bash
az sql server firewall-rule create --resource-group RG-Sql --server sql-contoso \
  --name HQ --start-ip-address 131.107.10.0 --end-ip-address 131.107.10.255
az sql server update --resource-group RG-Sql --name sql-contoso \
  --enable-public-network false
```

Un **point de terminaison privé** (sous-ressource `sqlServer`, zone `privatelink.database.windows.net`) est le moyen de supprimer complètement l'exposition à Internet. Azure SQL Managed Instance réside dans son propre sous-réseau et n'a pas de règles de pare-feu de serveur : l'accès est contrôlé par le NSG de ce sous-réseau, et son **point de terminaison public** facultatif (port 3342) est désactivé par défaut.

> **Piège d'examen.** « Autoriser les services et les ressources Azure à accéder à ce serveur » ne veut pas dire « mon abonnement ». Pour n'admettre qu'une application de votre réseau virtuel, utilisez une règle de réseau virtuel ou un point de terminaison privé et laissez la case décochée.

<!-- section: sql-identity-encryption | objectives: 2.2.1 -->
## Authentification et chiffrement

L'**authentification Microsoft Entra** exige un **administrateur Microsoft Entra** sur le serveur ou l'instance managée (un utilisateur ou un groupe). L'**authentification Microsoft Entra uniquement** désactive alors l'authentification SQL : les connexions SQL, y compris l'administrateur du serveur, ne peuvent plus se connecter, mais elles ne sont pas supprimées.

| Fait | Valeur |
| --- | --- |
| Prérequis | L'administrateur Microsoft Entra est défini |
| Qui peut l'activer ou la désactiver | SQL Security Manager (ainsi qu'Owner ou Contributor) ; **pas** SQL Server Contributor ni SQL Managed Instance Contributor |
| Imposer pour les nouveaux serveurs | Définitions Azure Policy intégrées |
| Vérifier en T-SQL | `SERVERPROPERTY('IsExternalAuthenticationOnly')` renvoie 1 |

```bash
az sql server ad-only-auth enable --resource-group RG-Sql --name sql-contoso
az sql mi ad-only-auth enable --resource-group RG-Sql --name sqlmi-contoso
```

Le **chiffrement transparent des données (TDE)** chiffre au repos les fichiers de données, les journaux et les sauvegardes avec une clé de chiffrement de base de données (DEK), elle-même protégée par le **protecteur TDE**. Les nouvelles bases utilisent un protecteur **géré par le service**. Un protecteur **géré par le client** (BYOK) se définit au niveau du serveur (SQL Database) ou de l'instance (SQL Managed Instance) et est hérité par les bases ; des clés au niveau de la base sont aussi possibles pour SQL Database.

| Exigence du TDE géré par le client | Valeur |
| --- | --- |
| Magasin de clés | Azure Key Vault ou Managed HSM, dans n'importe quelle région |
| Paramètres du coffre | Suppression réversible et protection contre la suppression définitive, sinon la configuration échoue |
| Clé | RSA ou RSA-HSM de 2048 ou 3072 bits (SQL Database et SQL Managed Instance) ou, pour SQL Database uniquement, AES de 128, 192 ou 256 bits dans Key Vault Premium ou Managed HSM (AES-256 recommandé pour les nouveaux protecteurs) ; activée, non expirée |
| Identité du serveur | Identité managée affectée par le système ou par l'utilisateur |
| Accès | Rôle **Key Vault Crypto Service Encryption User** (modèle RBAC) ou `get`, `wrapKey`, `unwrapKey` (modèle de stratégie d'accès) |
| Pare-feu du coffre | Autoriser les services Microsoft approuvés, sauf si vous utilisez un point de terminaison privé |
| Rotation | La rotation automatique est désactivée par défaut ; activée, le protecteur passe à la dernière version de la clé sous 24 heures. Un identificateur de clé sans version (SQL Database uniquement) utilise toujours la dernière version activée. Conservez les anciennes versions : les sauvegardes en ont besoin |
| Géoréplication | Les deux serveurs doivent accéder aux coffres qui contiennent les clés |

Passer d'une clé gérée par le service à une clé gérée par le client ne rechiffre que la DEK : opération en ligne, sans interruption. Si le serveur perd l'accès à la clé (autorisation retirée, clé ou coffre supprimé, changement de pare-feu, identité supprimée), les bases deviennent **inaccessibles** en une dizaine de minutes (erreurs 4XX de Key Vault : au bout de 30 minutes ; les erreurs 5XX intermittentes bénéficient d'un délai de 24 heures). Si l'accès revient sous 30 minutes, elles se rétablissent automatiquement en une heure ; au-delà, restaurez la version d'origine de la clé (une nouvelle version ne suffit pas), puis sélectionnez **Retry existing key** et **Validate key** sur la page **Transparent data encryption**.

Autres contrôles de plateforme que l'examen met en opposition :

| Exigence | Fonctionnalité |
| --- | --- |
| Chiffrer au repos les fichiers et les sauvegardes | TDE |
| Garder des colonnes sensibles chiffrées vis-à-vis du moteur de base de données et de ses administrateurs | Always Encrypted |
| Masquer une partie d'une valeur dans les résultats de requête pour les utilisateurs non privilégiés | Masquage dynamique des données (ce n'est pas du chiffrement) |
| Ne renvoyer que les lignes qu'un utilisateur a le droit de voir | Sécurité au niveau des lignes |

> **Piège d'examen.** Retirer à l'identité du serveur l'accès au protecteur TDE rend toute la base inaccessible, pas seulement des colonnes chiffrées. La révocation est un arrêt d'urgence volontaire ; l'hygiène du coffre (protection contre la suppression définitive, conservation des anciennes versions de clé) est ce qui évite une perte accidentelle.

<!-- section: sql-auditing | objectives: 2.2.2 -->
## Auditer Azure SQL Database et SQL Managed Instance

L'audit enregistre les événements de base de données vers une ou plusieurs destinations : un compte **Stockage Azure**, un espace de travail **Log Analytics** ou **Event Hubs**.

| Sujet | Azure SQL Database | Azure SQL Managed Instance |
| --- | --- | --- |
| Où le configurer | Portail, CLI, PowerShell, REST au niveau du serveur ou de la base | T-SQL `CREATE SERVER AUDIT`, plus des paramètres de diagnostic pour Log Analytics ou Event Hubs |
| Étendue | Une stratégie de serveur s'applique à toutes les bases existantes et nouvelles ; une stratégie de base coexiste avec elle | Audit de serveur plus spécifications d'audit de serveur ou de base |
| Événements par défaut | `BATCH_COMPLETED_GROUP`, `SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP`, `FAILED_DATABASE_AUTHENTICATION_GROUP` | Ce que liste la spécification d'audit |
| Authentification au stockage | Identité managée (recommandée) ou clés d'accès au stockage | Informations d'identification avec un jeton SAS pour `TO URL` |
| Rétention | Jours de rétention pour le stockage ; 0 (par défaut) signifie illimité | `RETENTION_DAYS` dans `CREATE SERVER AUDIT`, 0 signifie illimité |
| Opérations du support Microsoft | Audit des opérations du support Microsoft | Audit de serveur distinct avec `OPERATOR_AUDIT = ON` et la catégorie de diagnostic DevOps operations Audit Logs |

```bash
az sql server audit-policy update --resource-group RG-Sql --name sql-contoso \
  --state Enabled --blob-storage-target-state Enabled \
  --storage-account staudit01 --retention-days 180 \
  --log-analytics-target-state Enabled \
  --log-analytics-workspace-resource-id "<workspace resource ID>"
```

Envoyer les journaux d'audit vers Log Analytics ou Event Hubs crée un paramètre de diagnostic nommé `SQLSecurityAuditEvents_...` ; le supprimer fait échouer l'audit sans message. Les journaux d'audit écrits dans le stockage sont des objets blob d'ajout au format `.xel` ; depuis la refonte de l'audit de serveur de juillet 2025 (SQL Database), une seule session d'événements étendus au niveau du serveur capture les événements de toutes les bases, et tous les journaux d'audit du serveur vont dans un seul dossier `master`. Un compte de stockage derrière un pare-feu ou un réseau virtuel doit être **v2 universel** (general-purpose v2), et le serveur s'authentifie alors avec son identité managée.

Pour SQL Managed Instance :

```text
CREATE CREDENTIAL [https://staudit01.blob.core.windows.net/sqlmi-audit]
WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = '<SAS token without ?>';

CREATE SERVER AUDIT [Audit-Logins]
TO URL (PATH = 'https://staudit01.blob.core.windows.net/sqlmi-audit', RETENTION_DAYS = 180);

CREATE SERVER AUDIT SPECIFICATION [Spec-Logins]
FOR SERVER AUDIT [Audit-Logins]
ADD (SUCCESSFUL_LOGIN_GROUP), ADD (FAILED_LOGIN_GROUP)
WITH (STATE = ON);

ALTER SERVER AUDIT [Audit-Logins] WITH (STATE = ON);
```

Pour envoyer plutôt les événements d'audit de Managed Instance vers Log Analytics ou Event Hubs, ajoutez un paramètre de diagnostic avec la catégorie **SQLSecurityAuditEvents**, puis créez l'audit avec `TO EXTERNAL_MONITOR`. Les opérations du support Microsoft exigent un audit de serveur **distinct** : sélectionner **Microsoft support operations** sur un audit existant le remplace, et il ne journalise plus que les opérations du support.

> **Piège d'examen.** Activer l'audit à la fois sur le serveur et sur une base ne remplace pas l'un par l'autre : les deux s'exécutent et vous obtenez deux pistes d'audit. Utilisez la stratégie de serveur pour « toutes les bases, y compris les futures », et une stratégie de base uniquement pour une destination ou un ensemble d'événements différent.

<!-- section: defender-for-databases | objectives: 2.2.3 -->
## Configurer Defender for Databases

Dans **Defender for Cloud > Paramètres d'environnement > abonnement > Plans Defender**, le plan **Bases de données** regroupe quatre plans, chacun facturé séparément. Passer Bases de données sur **Activé** active les quatre ; pour activer ou modifier un seul plan, suivez l'article d'activation propre à ce plan.

| Plan | Protège | Remarques |
| --- | --- | --- |
| Defender for Azure SQL Databases | Azure SQL Database (bases uniques, pools élastiques), SQL Managed Instance, pools SQL dédiés Azure Synapse | Évaluation des vulnérabilités et Advanced Threat Protection |
| Defender for SQL servers on machines | SQL Server sur des machines virtuelles Azure et SQL Server activé par Azure Arc | Les machines hors Azure doivent être activées par Azure Arc |
| Defender for open-source relational databases | Serveurs flexibles Azure Database for PostgreSQL et MySQL ; Amazon RDS (PostgreSQL, MySQL, MariaDB, Aurora) | Non pris en charge sur les machines activées par Azure Arc |
| Defender for Azure Cosmos DB | Azure Cosmos DB for **NoSQL** uniquement | Ne lit pas les données du compte ; aucun impact sur les performances |

```bash
az security pricing create --name SqlServers --tier Standard
az security pricing create --name OpenSourceRelationalDatabases --tier Standard
```

Activé au niveau de l'abonnement, il protège toutes les ressources prises en charge, existantes et futures. Defender for Azure SQL peut aussi être activé sur un seul serveur logique ou une seule instance managée depuis sa page **Microsoft Defender for Cloud**.

**Advanced Threat Protection** génère des alertes pour les injections SQL potentielles, les modèles d'accès et de requête anormaux (par exemple une attaque par force brute) et les activités suspectes (un utilisateur qui se connecte depuis une machine ayant communiqué avec un serveur de commande et de contrôle de minage de cryptomonnaie). Les alertes apparaissent dans Defender for Cloud avec des étapes d'atténuation et peuvent être examinées dans Microsoft Sentinel.

L'**évaluation des vulnérabilités SQL** recherche les erreurs de configuration, les autorisations excessives et les données sensibles non protégées, avec des scripts de correction.

| | Configuration express (recommandée) | Configuration classique |
| --- | --- | --- |
| Stockage des résultats d'analyse | Géré par Defender for Cloud, sans compte de stockage | Votre compte Stockage Azure |
| Dépendance | Identité managée affectée par le système (SQL Managed Instance uniquement) | Le compte Stockage Azure |
| Analyses récurrentes | Toujours actives | Activables ou désactivables |
| Lignes de base | Par lot ou par règle ; s'appliquent sans nouvelle analyse | Par règle ; s'appliquent après une nouvelle analyse |
| Modifier les paramètres | SQL Security Manager ou Security Admin | SQL Security Manager **et** Storage Blob Data Reader **et** Owner du compte de stockage |
| Voir les résultats dans les recommandations | Security Admin ou Security Reader | Security Admin ou Security Reader |

> **Piège d'examen.** Defender for Azure Cosmos DB ne couvre que l'API NoSQL : un compte Cosmos DB for MongoDB ou Cassandra ne reçoit aucune alerte de sa part. De même, PostgreSQL ou MySQL exécuté sur un serveur activé par Azure Arc n'est pas couvert par le plan des bases de données relationnelles open source.

<!-- section: key-points -->
## Points clés

- L'accès au réseau public sur Désactiver ne laisse que les points de terminaison privés ; la règle « Autoriser les services Azure » admet tous les clients Azure.
- Les règles IP au niveau de la base sont en T-SQL uniquement et vérifiées avant celles du serveur ; les règles de réseau virtuel exigent le point de terminaison de service `Microsoft.Sql`.
- L'authentification Microsoft Entra uniquement exige d'abord un administrateur Entra ; SQL Security Manager peut l'activer, pas SQL Server Contributor.
- TDE géré par le client : suppression réversible et protection contre la suppression définitive, clé RSA (ou AES pour SQL Database), identité managée avec Key Vault Crypto Service Encryption User ; perdre la clé rend les bases inaccessibles.
- L'audit de serveur couvre toutes les bases ; l'audit de Managed Instance se fait en T-SQL `CREATE SERVER AUDIT` vers une URL ou `EXTERNAL_MONITOR`.
- Defender for Databases = quatre plans ; la configuration express de l'évaluation des vulnérabilités n'exige pas de compte de stockage.
