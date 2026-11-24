Azure SQL protège les données dans trois états : au repos (chiffrement transparent des données, chiffrement de colonne), en transit (TLS, règles de pare-feu, connectivité privée) et en cours d'utilisation (Always Encrypted, avec ou sans enclaves sécurisées). Les questions d'examen nomment ce qui doit être protégé et contre qui (une sauvegarde volée, un administrateur de base de données, Internet) et attendent la seule fonctionnalité qui correspond.

| Menace ou exigence | Fonctionnalité |
| --- | --- |
| Fichiers, sauvegardes et journaux illisibles s'ils sont volés ; aucune modification de l'application | TDE |
| Garder le contrôle de la clé de chiffrement, pouvoir révoquer l'accès aux données | TDE avec une clé gérée par le client dans Azure Key Vault |
| Les administrateurs de base de données et les opérateurs cloud ne doivent jamais voir les valeurs en clair | Always Encrypted |
| Idem, avec des requêtes de plage, `LIKE` ou le chiffrement sur place | Always Encrypted avec enclaves sécurisées |
| Chiffrer quelques valeurs avec des clés stockées dans la base, déchiffrées en T-SQL | Chiffrement au niveau des colonnes (`ENCRYPTBYKEY`) |
| Seules certaines adresses IP peuvent se connecter | Règles de pare-feu IP au niveau du serveur ou de la base |
| Trafic depuis un sous-réseau, le serveur garde son point de terminaison public | Point de terminaison de service de réseau virtuel et règle de réseau virtuel |
| Adresse IP privée, pas de point de terminaison public, accès local par VPN ou ExpressRoute | Point de terminaison privé (Azure Private Link) |

<!-- section: tde | objectives: 2.2.1 -->
## Chiffrement transparent des données

TDE chiffre les fichiers de base de données, le journal des transactions et les **sauvegardes** au niveau des pages, en temps réel, sans aucune modification de l'application. Une **clé de chiffrement de base de données (DEK)** symétrique chiffre les pages ; le **protecteur TDE** chiffre la DEK.

| Point | Azure SQL Database | SQL Managed Instance | SQL Server sur machine virtuelle |
| --- | --- | --- | --- |
| Par défaut | Activé pour les nouvelles bases | Activé pour les nouvelles bases | Désactivé : à activer vous-même |
| Protecteur | Certificat géré par le service ou clé gérée par le client, défini sur le **serveur** (ou par base pour SQL Database) | Clé gérée par le service ou par le client, définie sur l'instance | Certificat dans `master`, ou clé asymétrique par EKM (connecteur Azure Key Vault) |
| Activer ou désactiver | Portail, PowerShell, CLI | T-SQL `ALTER DATABASE ... SET ENCRYPTION` | T-SQL |

TDE géré par le service utilise un certificat propre au serveur, renouvelé par Microsoft. **TDE géré par le client (BYOK)** utilise une clé d'Azure Key Vault ou d'Azure Key Vault Managed HSM : une clé RSA ou RSA-HSM de 2 048 ou 3 072 bits (le seul type pour SQL Managed Instance) ou, pour Azure SQL Database uniquement, une clé symétrique AES de 128, 192 ou 256 bits dans Key Vault Premium ou Managed HSM (AES-256 est recommandée pour les nouveaux protecteurs) :

1. Le coffre de clés doit avoir la **suppression réversible et la protection contre le vidage** activées, sinon la configuration échoue.
2. Le serveur ou l'instance a besoin d'une **identité managée** affectée par le système ou par l'utilisateur avec **Key Vault Crypto Service Encryption User** (modèle Azure RBAC) ou les autorisations de clé get, wrapKey et unwrapKey (modèle de stratégie d'accès).
3. Si le coffre a un pare-feu, autorisez les services Microsoft approuvés ou utilisez un point de terminaison privé.
4. Sélectionnez la clé comme protecteur TDE ; activez éventuellement la **rotation automatique des clés** (désactivée par défaut ; le serveur prend une nouvelle version de clé en moins de 24 heures).

```bash
az sql server key create --resource-group RG1 --server sql-contoso \
  --kid https://kv-contoso.vault.azure.net/keys/tde-key/0123456789abcdef0123456789abcdef
az sql server tde-key set --resource-group RG1 --server sql-contoso \
  --server-key-type AzureKeyVault \
  --kid https://kv-contoso.vault.azure.net/keys/tde-key/0123456789abcdef0123456789abcdef
```

Si le serveur perd l'accès à la clé (autorisation révoquée, clé supprimée), la base commence à refuser les connexions et devient **Inaccessible** en 10 minutes au plus (30 minutes après une erreur 4XX de Key Vault ; une erreur réseau 5XX intermittente bénéficie d'un délai de 24 heures et se résout d'elle-même). Rétablie en moins de 30 minutes, elle se rétablit automatiquement. Au-delà, corrigez la cause, puis, dans la page **Transparent data encryption**, sélectionnez **Retry existing key** et **Validate key** : il faut la clé d'origine (une nouvelle version de clé ne suffit pas), et certains paramètres peuvent être perdus (groupe de basculement, étiquettes, configuration du pool élastique, scale-out en lecture, pause automatique, historique de restauration à un point dans le temps, stratégies de rétention à long terme). Conservez les anciennes versions de clé : les anciennes sauvegardes en ont encore besoin. Avec la géoréplication ou un groupe de basculement, les deux serveurs ont besoin d'autorisations sur chaque coffre de clés qui contient une clé nécessaire ; si les serveurs utilisent des clés différentes, ajoutez les deux clés aux deux serveurs avant de créer le lien ou le groupe de basculement.

SQL Server sur machine virtuelle, la procédure classique :

```text
USE master;
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'Str0ng!Master#Key';
CREATE CERTIFICATE TdeCert WITH SUBJECT = 'TDE certificate';
BACKUP CERTIFICATE TdeCert TO FILE = 'D:\Keys\TdeCert.cer'
  WITH PRIVATE KEY (FILE = 'D:\Keys\TdeCert.pvk',
  ENCRYPTION BY PASSWORD = 'Str0ng!Backup#Key');

USE Sales;
CREATE DATABASE ENCRYPTION KEY WITH ALGORITHM = AES_256
  ENCRYPTION BY SERVER CERTIFICATE TdeCert;
ALTER DATABASE Sales SET ENCRYPTION ON;

SELECT DB_NAME(database_id), encryption_state_desc
FROM sys.dm_database_encryption_keys;
```

> **Piège d'examen.** Une sauvegarde chiffrée par TDE ne se restaure sur un autre SQL Server qu'après la création du **certificat** (avec sa clé privée) sur la cible. Même idée dans SQL Managed Instance : une sauvegarde manuelle `COPY_ONLY` d'une base protégée par TDE **géré par le service** n'est pas prise en charge, car personne ne peut exporter ce certificat. Passez à une clé gérée par le client, ou utilisez la restauration à un point dans le temps pour déplacer la base.

À retenir aussi : `master` n'est pas chiffrée par TDE, `tempdb` est chiffrée automatiquement, et un export BACPAC n'est pas chiffré. TDE ne fait rien contre un utilisateur qui peut interroger la base : il protège les fichiers, pas les résultats des requêtes.

<!-- section: object-encryption | objectives: 2.2.2 -->
## Chiffrement au niveau de l'objet

Le chiffrement au niveau des colonnes (ou des cellules) chiffre des valeurs individuelles avec des clés que la base stocke dans une hiérarchie : **clé principale de base de données > certificat > clé symétrique**. Il fonctionne dans SQL Server, Azure SQL Database et SQL Managed Instance. La colonne doit être de type `varbinary`, et l'application déchiffre en T-SQL après avoir ouvert la clé.

```text
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'Str0ng!Db#Master';
CREATE CERTIFICATE CardCert WITH SUBJECT = 'Card numbers';
CREATE SYMMETRIC KEY CardKey WITH ALGORITHM = AES_256
  ENCRYPTION BY CERTIFICATE CardCert;

ALTER TABLE Sales.Payment ADD CardNumberEnc varbinary(160);

OPEN SYMMETRIC KEY CardKey DECRYPTION BY CERTIFICATE CardCert;
UPDATE Sales.Payment
SET CardNumberEnc = ENCRYPTBYKEY(KEY_GUID('CardKey'), CardNumber);
SELECT CONVERT(nvarchar(25), DECRYPTBYKEY(CardNumberEnc)) AS CardNumber
FROM Sales.Payment;
CLOSE SYMMETRIC KEY CardKey;
```

| | Chiffrement au niveau des colonnes | Always Encrypted |
| --- | --- | --- |
| Où le chiffrement a lieu | Dans le moteur de base de données | Dans le pilote client |
| Clés | Dans la base | Clé principale de colonne hors de la base (Key Vault, magasin de certificats) |
| Protège contre un DBA | Non : quiconque a `CONTROL` sur les clés déchiffre | Oui |
| Modification de l'application | Les requêtes doivent appeler `ENCRYPTBYKEY` / `DECRYPTBYKEY` | Paramètre de chaîne de connexion, requêtes paramétrées |

Les fonctions `ENCRYPTBYPASSPHRASE`, `ENCRYPTBYCERT` et `ENCRYPTBYASYMKEY` existent aussi ; les clés symétriques sont préférées pour les performances. Sauvegardez la clé principale de base de données et les certificats.

<!-- section: firewall-rules | objectives: 2.2.3 -->
## Règles de pare-feu au niveau du serveur et de la base de données

Azure SQL Database refuse toutes les connexions à son point de terminaison public tant qu'une règle de pare-feu n'autorise pas l'adresse IP du client.

| | Règle au niveau du serveur | Règle au niveau de la base de données |
| --- | --- | --- |
| Étendue | Toutes les bases du serveur logique | Une base (`master` comprise) |
| Stockée dans | `master` | La base elle-même : elle suit la géoréplication et les copies |
| Gérée avec | Portail, PowerShell, CLI, REST, T-SQL | **T-SQL uniquement** |
| Limite | 256 par serveur | 256 par base |
| T-SQL | `sp_set_firewall_rule`, `sys.firewall_rules` | `sp_set_database_firewall_rule`, `sys.database_firewall_rules` |

Évaluation : les règles **au niveau de la base** demandée sont vérifiées en premier ; si aucune ne correspond, les règles au niveau du serveur ; si aucune ne correspond, la connexion échoue avec l'erreur 40615. Le premier paramètre au niveau du serveur doit exister avant de pouvoir créer des règles au niveau de la base.

```text
-- In master: server-level rule
EXECUTE sp_set_firewall_rule @name = N'HQ',
  @start_ip_address = '203.0.113.0', @end_ip_address = '203.0.113.255';

-- In the user database: database-level rule
EXECUTE sp_set_database_firewall_rule @name = N'ReportingApp',
  @start_ip_address = '198.51.100.20', @end_ip_address = '198.51.100.20';
```

```bash
az sql server firewall-rule create --resource-group RG1 --server sql-contoso \
  --name HQ --start-ip-address 203.0.113.0 --end-ip-address 203.0.113.255
```

**Autoriser les services et les ressources Azure à accéder à ce serveur** crée la règle `AllowAllWindowsAzureIps` (0.0.0.0 à 0.0.0.0). Elle autorise tous les services Azure, **y compris les abonnements d'autres clients** : préférez les points de terminaison de service ou les points de terminaison privés. Les modifications de règles peuvent prendre jusqu'à cinq minutes (`DBCC FLUSHAUTHCACHE` force l'actualisation). Gérer les règles au niveau du serveur exige SQL Server Contributor, SQL Security Manager ou Owner.

> **Piège d'examen.** « Chaque base doit avoir sa propre liste d'adresses IP autorisées, et cette liste doit suivre la base après un basculement de géoréplication » désigne des règles **au niveau de la base de données**, créées en T-SQL. Le portail ne peut pas les créer.

SQL Managed Instance n'a pas de règles de pare-feu IP : elle vit dans un sous-réseau, et l'accès est filtré par le **groupe de sécurité réseau (NSG)** de ce sous-réseau. Les clients ont aussi besoin du port TCP 1433 sortant.

<!-- section: always-encrypted | objectives: 2.2.4 -->
## Always Encrypted

Always Encrypted chiffre les colonnes sensibles **dans le pilote client** : le moteur de base de données stocke et renvoie le texte chiffré et ne voit jamais les clés en clair. Il sépare les personnes qui possèdent les données de celles qui administrent la base.

| Clé | Rôle | Où elle se trouve |
| --- | --- | --- |
| Clé principale de colonne (CMK) | Protège les clés de chiffrement de colonne | Hors de la base : Azure Key Vault, magasin de certificats Windows, HSM. La base ne stocke que ses métadonnées |
| Clé de chiffrement de colonne (CEK) | Chiffre les données de la colonne | Stockée chiffrée dans la base |

| Type de chiffrement | Comportement | Requêtes possibles |
| --- | --- | --- |
| Déterministe | Même texte en clair, même texte chiffré | Égalité (`=`), `IN`, jointures d'égalité, `GROUP BY`, `DISTINCT`, index. Révèle des motifs sur les colonnes à peu de valeurs |
| Aléatoire | Même texte en clair, texte chiffré différent | Aucune sur la colonne sans enclave ; le plus sûr |

Mise en œuvre :

1. Dans SSMS, clic droit sur la table ou la base > **Encrypt Columns** (assistant Always Encrypted) : choisir les colonnes, le type de chiffrement, la CEK et le magasin de la CMK. L'assistant peut s'exécuter immédiatement ou générer un script PowerShell.
2. Avec la **séparation des rôles**, un administrateur de la sécurité crée les clés avec le module PowerShell SqlServer (`New-SqlAzureKeyVaultColumnMasterKeySettings`, `New-SqlColumnMasterKey`, `New-SqlColumnEncryptionKey`) sans accès à la base, et le DBA ne reçoit que les métadonnées.
3. T-SQL ne peut ni créer les clés ni chiffrer les données ; il déclare seulement les métadonnées et les définitions de colonnes.
4. Les applications ajoutent `Column Encryption Setting=Enabled` à la chaîne de connexion, utilisent des requêtes **paramétrées** et ont besoin d'accéder à la CMK (par exemple les autorisations Key Vault get, unwrapKey et verify).

```text
CREATE TABLE HR.Employee (
  EmployeeID int IDENTITY PRIMARY KEY,
  NationalID char(11) COLLATE Latin1_General_BIN2
    ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = CEK1,
      ENCRYPTION_TYPE = DETERMINISTIC,
      ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'),
  Salary money
    ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = CEK1,
      ENCRYPTION_TYPE = RANDOMIZED,
      ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256')
);
```

Limites à connaître : les colonnes de chaînes en chiffrement déterministe exigent un classement `_BIN2` ; pas de comparaison avec des littéraux (utiliser des paramètres) ; non pris en charge pour `xml`, `timestamp`, `rowversion`, `image`, `ntext`, `text`, `sql_variant`, `hierarchyid`, `vector`, les types spatiaux, les colonnes d'identité, calculées, éparses ou de partitionnement, ni les colonnes masquées par le masquage dynamique des données ; pas de contraintes par défaut ou de vérification, d'index de recherche en texte intégral ni de réplication sur les colonnes chiffrées ; pas de `FOR XML` ni de `FOR JSON`, de paramètres table ni de requêtes distribuées sur ces colonnes. Les groupes de disponibilité Always On sont pris en charge. Dans Azure SQL Database, accordez explicitement `VIEW ANY COLUMN MASTER KEY DEFINITION` et `VIEW ANY COLUMN ENCRYPTION KEY DEFINITION` aux utilisateurs qui interrogent des colonnes chiffrées.

> **Piège d'examen.** « Les administrateurs de base de données ne doivent pas pouvoir lire les numéros de carte bancaire » élimine TDE, le masquage dynamique des données et le chiffrement au niveau des colonnes : seul Always Encrypted tient les clés hors du serveur, à condition que les DBA n'aient pas accès à la clé principale de colonne.

<!-- section: secure-enclaves | objectives: 2.2.5 -->
## Always Encrypted avec enclaves sécurisées

Une **enclave sécurisée** est une région de mémoire protégée dans le processus du moteur de base de données. Le pilote client envoie la clé de chiffrement de colonne à l'enclave par un canal sécurisé : le moteur peut ainsi calculer sur le texte en clair **dans l'enclave** sans l'exposer.

Ce qu'apportent les enclaves, avec le chiffrement **aléatoire** et des clés compatibles enclave :

- Opérateurs de comparaison, `BETWEEN`, `IN`, `LIKE`, `DISTINCT`, jointures, `ORDER BY`, `GROUP BY` (Azure SQL Database et SQL Server 2022 ; SQL Server 2019 en prend moins en charge).
- **Chiffrement sur place** : chiffrer, rechiffrer, faire pivoter une clé ou déchiffrer une colonne existante avec `ALTER TABLE ... ALTER COLUMN`, sans déplacer les données vers le client.
- Index non cluster sur les colonnes compatibles enclave en chiffrement aléatoire.

| Plateforme | Enclave | Attestation |
| --- | --- | --- |
| SQL Server 2019 et versions ultérieures sous Windows | VBS | Service Guardian hôte (HGS), ou aucune |
| Azure SQL Database, toute configuration vCore ou DTU | **VBS** (aucun matériel spécial) | Aucune (non prise en charge) |
| Azure SQL Database, matériel vCore série DC | Intel SGX | Microsoft Azure Attestation, obligatoire |

SQL Managed Instance ne figure pas dans la liste des plateformes. Les enclaves Intel SGX arrivent en fin de support le **31 octobre 2027** : après cette date, Azure déplace les bases restantes en série DC vers la série standard et active les enclaves VBS. Les enclaves VBS protègent contre les attaques dans la machine virtuelle, pas contre les comptes privilégiés de l'hôte.

Configuration dans Azure SQL Database avec VBS :

1. Activez l'enclave : base de données > Sécurité > **Chiffrement des données** > onglet Always Encrypted > **Activer les enclaves sécurisées** = ON (propriété de base `preferredEnclaveType` = `VBS`).
2. Créez une clé principale de colonne **compatible enclave** : laissez **Allow enclave computations** coché (propriété de métadonnées `ENCLAVE_COMPUTATIONS`), puis une CEK protégée par elle.
3. Connectez-vous avec Always Encrypted et le protocole d'attestation : dans SSMS, onglet Always Encrypted > Enable Always Encrypted > Enable secure enclaves > Protocol **None**.
4. Chiffrez sur place, puis interrogez avec des paramètres.

```text
-- Connection string for VBS enclaves without attestation
Server=tcp:sql-contoso.database.windows.net;Database=HR;Column Encryption Setting=Enabled;Attestation Protocol=None;

-- In-place encryption of an existing column (enclave-enabled CEK1)
ALTER TABLE HR.Employee ALTER COLUMN LastName nvarchar(50)
  COLLATE Latin1_General_BIN2
  ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = CEK1,
    ENCRYPTION_TYPE = RANDOMIZED,
    ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256');
```

Les requêtes confidentielles exigent le niveau de compatibilité 160 ou supérieur, et les colonnes de caractères un classement `_BIN2` ou UTF-8. Chaque réplica (secondaires de groupe de disponibilité, géo-secondaires) doit prendre en charge les enclaves.

> **Conseil d'examen.** « Colonne chiffrée + recherche de plage ou correspondance de modèle » ou « chiffrer une grande colonne existante sans l'exporter » désigne les enclaves sécurisées. « Uniquement des recherches d'égalité » est satisfait par Always Encrypted déterministe sans enclave.

<!-- section: private-connectivity | objectives: 2.2.6 -->
## Liens privés et points de terminaison de service

| | Point de terminaison de service de réseau virtuel | Point de terminaison privé (Azure Private Link) |
| --- | --- | --- |
| Principe | Sous-réseau marqué `Microsoft.Sql`, plus une **règle de réseau virtuel** sur le serveur | Interface réseau avec une **adresse IP privée** de votre réseau virtuel, mappée au serveur |
| Adresse du serveur | Toujours le point de terminaison public ; le trafic vient du sous-réseau par le réseau principal Azure | IP privée, résolue par la zone DNS privée `privatelink.database.windows.net` |
| Étendue | Niveau serveur uniquement (toutes les bases), sous-réseaux de la même région | Un serveur (Azure SQL Database) ou une instance managée |
| Clients locaux | Non couverts : ils ont toujours besoin de règles de pare-feu IP | Oui, par VPN site à site ou peering privé ExpressRoute |
| Accès public | Reste activé | Peut être désactivé : **Refuser l'accès au réseau public** |
| Protection contre l'exfiltration de données | Non : le sous-réseau peut atteindre n'importe quel serveur de la région | Oui : le point de terminaison correspond à une ressource précise |

```bash
az sql server vnet-rule create --resource-group RG1 --server sql-contoso \
  --name AppSubnet --vnet-name vnet-app --subnet snet-app

az network private-endpoint create --resource-group RG1 --name pe-sql-contoso \
  --vnet-name vnet-app --subnet snet-data \
  --private-connection-resource-id /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/RG1/providers/Microsoft.Sql/servers/sql-contoso \
  --group-id sqlServer --connection-name sql-contoso-link
```

Règles des points de terminaison privés :

- Les clients continuent d'utiliser `sql-contoso.database.windows.net` : le nom est résolu en IP privée par le DNS. Se connecter directement à l'IP ou au nom `privatelink` échoue.
- Un point de terminaison privé ne bloque pas à lui seul l'accès public : sélectionnez **Refuser l'accès au réseau public**. Une fois l'accès refusé, les connexions publiques échouent avec l'erreur 47073, et les règles de pare-feu ne peuvent plus être modifiées (erreur 42101).
- L'administrateur SQL approuve ou rejette les connexions en attente sous Sécurité > Mise en réseau > **Accès privé**.
- Avec la stratégie de connexion **Redirect** (recommandée pour la latence), le trafic via un point de terminaison privé a besoin des ports 1433 à 65535, en entrée vers le réseau virtuel du point de terminaison et en sortie depuis celui du client. Seuls les pilotes ODBC, OLE DB, .NET SqlClient et JDBC 9.4 ou ultérieur sont redirigés ; les autres pilotes passent par le proxy. Proxy n'utilise que 1433, et les points de terminaison privés existants avec la stratégie **Default** utilisent Proxy.

Autres paramètres réseau du serveur logique (Sécurité > Mise en réseau > Connectivité) : la **version TLS minimale** (1.2 est la plus basse encore disponible ; les clients plus anciens échouent avec l'erreur 47072 ; la valeur par défaut accepte TLS 1.2 et ultérieur, et une fois une version imposée, impossible de revenir à la valeur par défaut) et la stratégie de connexion.

Points de terminaison de SQL Managed Instance :

| Point de terminaison | Adresse | Port | Usage |
| --- | --- | --- | --- |
| Local au réseau virtuel (par défaut) | `mi-contoso.0123abcd.database.windows.net`, IP privée du sous-réseau | 1433 | Applications du réseau virtuel ou de réseaux connectés par peering |
| Point de terminaison public | `mi-contoso.public.0123abcd.database.windows.net` | **3342** | Clients sur Internet ; à restreindre par une règle NSG ; trafic client uniquement |
| Point de terminaison privé | IP fixe dans un autre réseau virtuel | 1433 | Trafic client depuis un autre réseau virtuel ; plusieurs points de terminaison par instance |

> **Piège d'examen.** Un point de terminaison de service ne peut pas donner un accès privé aux utilisateurs locaux, et il laisse le point de terminaison public ouvert. « Depuis le site local par ExpressRoute, sans exposition à l'Internet public » désigne un point de terminaison privé avec l'accès au réseau public refusé.

<!-- section: key-points -->
## Points clés

- TDE protège les fichiers et les sauvegardes, pas les résultats des requêtes ; activé par défaut dans Azure SQL, désactivé sur les machines virtuelles SQL Server.
- TDE géré par le client : Key Vault avec suppression réversible et protection contre le vidage, identité managée avec wrapKey et unwrapKey ; perdre la clé rend la base inaccessible.
- Une sauvegarde TDE ne se restaure ailleurs qu'avec le certificat ; pas de sauvegarde `COPY_ONLY` avec TDE géré par le service sur Managed Instance.
- Le chiffrement au niveau des colonnes garde les clés dans la base ; Always Encrypted les tient hors du serveur.
- Déterministe permet l'égalité ; aléatoire ne permet rien sans enclave.
- Enclaves : VBS dans Azure SQL Database sans attestation ; Intel SGX (série DC) prend fin le 31 octobre 2027.
- Règles de pare-feu au niveau de la base : T-SQL uniquement, vérifiées en premier, elles suivent la base. Managed Instance utilise des NSG.
- Point de terminaison de service = sous-réseau vers point de terminaison public ; point de terminaison privé = IP privée, accès local, protection contre l'exfiltration.
