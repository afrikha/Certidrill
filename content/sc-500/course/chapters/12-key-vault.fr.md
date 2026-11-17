Azure Key Vault tient les secrets, les clés de chiffrement et les certificats à l'écart du code et des fichiers de configuration. La SC-500 teste les décisions de sécurité qui l'entourent : le niveau tarifaire, les paramètres de récupération qu'on ne peut jamais désactiver, le modèle d'autorisation, l'exposition réseau, le cycle de vie de chaque objet, et les deux fonctionnalités de Defender for Cloud qui trouvent les secrets exposés et surveillent les coffres.

<!-- section: deploy | objectives: 1.2.1 -->
## Déployer un coffre de clés

| Option | Choisissez-la quand |
| --- | --- |
| Coffre de clés, niveau **Standard** | Secrets, certificats et clés protégées par logiciel (logiciel validé FIPS 140 niveau 1) |
| Coffre de clés, niveau **Premium** | Les clés doivent être **protégées par HSM** (RSA-HSM, EC-HSM), générées et conservées dans des HSM validés FIPS 140-3 niveau 3 ; elles ne quittent jamais la limite du HSM |
| **Managed HSM** | Un type de ressource distinct : un pool HSM monolocataire réservé aux clés, avec son propre contrôle d'accès local basé sur les rôles |

Règles de conception : un coffre **par application et par environnement** (développement, préproduction, production) et par région. Un coffre partagé par plusieurs équipes expose tous les secrets à quiconque l'administre.

```bash
az keyvault create --name kv-orders-prod-weu --resource-group rg-orders-prod \
  --location westeurope --sku premium \
  --enable-rbac-authorization true \
  --retention-days 90 --enable-purge-protection true \
  --public-network-access Disabled
```

- `--enable-rbac-authorization` vaut `true` par défaut dans Azure CLI, et à partir de la version **2026-02-01** de l'API REST, Azure RBAC est le modèle d'autorisation par défaut des nouveaux coffres.
- `--retention-days` (7 à 90, 90 par défaut) ne se définit **qu'à la création**.
- Déployer un coffre (plan de contrôle) exige **Key Vault Contributor** ou Contributor sur le groupe de ressources.

<!-- section: vault-settings | objectives: 1.2.2 -->
## Paramètres d'un coffre de clés

| Paramètre | Comportement |
| --- | --- |
| **Suppression réversible** (soft delete) | Active sur tout nouveau coffre et **impossible à désactiver**. Un coffre ou un objet supprimé reste récupérable pendant la période de rétention ; son nom ne peut pas être réutilisé entre-temps |
| **Protection contre le vidage** (purge protection) | Facultative, désactivée par défaut. Une fois activée, **personne, pas même Microsoft, ne peut la désactiver ni vider** avant la fin de la période de rétention. Exigée par les services qui utilisent vos clés pour chiffrer, comme les clés gérées par le client du Stockage Azure |
| Configuration de l'accès | Modèle d'autorisation (Azure RBAC ou stratégie d'accès du coffre) et accès des ressources : `--enabled-for-deployment` (les VM récupèrent des certificats stockés comme secrets), `--enabled-for-disk-encryption` (Azure Disk Encryption), `--enabled-for-template-deployment` (Resource Manager récupère des secrets pendant les déploiements) |
| Mise en réseau | Pare-feu et points de terminaison privés (voir plus bas) |
| Paramètres de diagnostic | Envoyez les journaux **AuditEvent** vers un espace de travail Log Analytics, un compte de stockage ou un hub d'événements pour savoir qui a accédé à quoi |
| Événements | Des événements Event Grid comme `Microsoft.KeyVault.SecretNearExpiry` ou `Microsoft.KeyVault.CertificateNearExpiry` déclenchent des flux de rotation |

Récupération : dans le portail, **Key vaults > Manage deleted vaults** (ou **Manage deleted** sur la page Secrets, Keys ou Certificates) propose **Recover** ou **Purge**. Récupérer un coffre exige Key Vault Contributor ; le vider exige le rôle **Key Vault Purge Operator** ou Owner de l'abonnement. Un coffre récupéré ne retrouve ni ses attributions de rôles ni ses abonnements Event Grid.

```bash
az keyvault update --name kv-orders-prod-weu --enable-purge-protection true
az keyvault secret recover --vault-name kv-orders-prod-weu --name sql-password
az keyvault recover --name kv-legacy-dev
```

> **Piège d'examen.** La suppression réversible ne protège que contre une suppression **accidentelle** : sans protection contre le vidage, un attaquant qui a l'autorisation de vider supprime puis vide. « Les clés supprimées doivent rester récupérables, même face à un administrateur malveillant » signifie **protection contre le vidage**, et elle est irréversible.

<!-- section: vault-access | objectives: 1.2.3 -->
## Accès à Key Vault

Deux plans, toujours authentifiés par Microsoft Entra ID :

| Plan | Point de terminaison | Autorisation |
| --- | --- | --- |
| Plan de contrôle (gestion) | `management.azure.com` | Azure RBAC uniquement : créer le coffre, modifier ses paramètres, son pare-feu, ses étiquettes |
| Plan de données | `<vault-name>.vault.azure.net` | Azure RBAC (recommandé) **ou** stratégies d'accès du coffre : lire des secrets, utiliser des clés, gérer des certificats |

Rôles du plan de données (modèle d'autorisation Azure RBAC) :

| Rôle | Permet |
| --- | --- |
| Key Vault Administrator | Toutes les opérations du plan de données sur tous les objets ; ni attributions de rôles ni gestion du coffre |
| Key Vault Secrets Officer / Secrets User | Gérer les secrets / lire le contenu des secrets (y compris la clé privée d'un certificat) |
| Key Vault Crypto Officer / Crypto User | Gérer les clés (y compris la stratégie de rotation) / utiliser les clés pour des opérations de chiffrement |
| Key Vault Crypto Service Encryption User | Lire les métadonnées des clés, envelopper et désenvelopper (wrap, unwrap) : le rôle de l'identité managée d'un service qui utilise une clé gérée par le client |
| Key Vault Certificates Officer / Certificate User | Gérer les certificats / lire le contenu complet des certificats |
| Key Vault Reader | Métadonnées seulement, jamais les valeurs des secrets ni le matériel des clés |
| Key Vault Data Access Administrator | Attribuer uniquement les rôles de données Key Vault (limité par une condition) |
| Key Vault Contributor | Plan de contrôle uniquement : gère les coffres, aucun accès aux données, aucune attribution de rôle |

- Attribuez les rôles à l'étendue du **coffre**. N'attribuez sur un secret individuel que pour un secret utilisé par une seule personne ou partagé par plusieurs applications.
- Avec les **stratégies d'accès**, les autorisations (Get, List, Set, Delete, Recover, Backup, Restore, Purge...) se définissent par principal et par type d'objet, au niveau du coffre uniquement. Tout **Contributor** du coffre peut écrire une stratégie d'accès et s'accorder **lui-même** l'accès aux données.
- **Passer** à Azure RBAC exige `Microsoft.Authorization/roleAssignments/write` (Owner, ou User Access Administrator plus Key Vault Contributor) et invalide d'un coup toutes les stratégies d'accès : attribuez d'abord les rôles équivalents.

> **Piège d'examen.** Owner et Contributor ne lisent pas les secrets d'un coffre qui utilise Azure RBAC : il leur faut un rôle de données. Dans un coffre qui utilise des stratégies d'accès, ils ne peuvent pas non plus lire les secrets, mais ils peuvent s'accorder une stratégie d'accès qui le permet.

<!-- section: vault-firewall | objectives: 1.2.4 -->
## Pare-feu de Key Vault et accès privé

| Paramètre (Networking > Firewalls and virtual networks) | Effet |
| --- | --- |
| Allow public access from all networks | Tous les réseaux ; l'authentification et l'autorisation Entra s'appliquent toujours |
| Allow public access from specific virtual networks and IP addresses | Seulement les sous-réseaux listés (avec le point de terminaison de service `Microsoft.KeyVault`) et des adresses IPv4 publiques ou des plages CIDR |
| Disable public access | Points de terminaison privés uniquement |
| Exception : **Allow trusted Microsoft services to bypass this firewall** | Les services approuvés de la liste (par exemple Sauvegarde Azure, Azure Disk Encryption, le déploiement de modèles Resource Manager) atteignent toujours le coffre, même avec l'accès public désactivé. Les services absents de la liste, comme Azure DevOps, sont bloqués |

- Limites : 200 règles de réseau virtuel et 1 000 règles IPv4. Pas d'IPv6, pas de plages privées RFC 1918 dans les règles IP.
- Les changements prennent jusqu'à 15 minutes.
- Les règles de pare-feu ne restreignent que le **plan de données**. Le portail est un client du plan de données : un administrateur hors des réseaux autorisés ouvre le coffre mais ne peut pas lister ses secrets.
- Un **point de terminaison privé** donne au coffre une adresse IP privée dans votre réseau virtuel, avec la zone `privatelink.vaultcore.azure.net`. Le nom public se résout toujours ; c'est la désactivation de l'accès public qui bloque internet.
- Un **périmètre de sécurité réseau** en mode Enforced remplace `publicNetworkAccess` et bloque aussi les services approuvés sauf si une règle du périmètre les admet ; le mode Transition se contente de journaliser.

```bash
az keyvault network-rule add --name kv-orders-prod-weu --ip-address 203.0.113.0/24
az keyvault network-rule add --name kv-orders-prod-weu --vnet-name vnet-app --subnet snet-web
az keyvault update --name kv-orders-prod-weu --default-action Deny --bypass AzureServices
```

> **Conseil d'examen.** « Seulement le sous-réseau de l'application, aucune exposition à internet, et Sauvegarde Azure doit continuer à fonctionner » : un point de terminaison privé, l'accès public désactivé, et l'exception des services approuvés laissée active.

<!-- section: keys-secrets-certificates | objectives: 1.2.5 -->
## Gérer les clés, les secrets et les certificats

| Objet | À savoir |
| --- | --- |
| **Secret** | Jusqu'à 25 Ko, type de contenu facultatif (255 caractères), versions. `exp` et `nbf` sont informatifs : une opération get renvoie quand même un secret expiré. Désactivez une version pour la bloquer |
| **Clé** | RSA ou EC, protégée par logiciel ou par HSM (Premium). Opérations : chiffrer, déchiffrer, signer, vérifier, envelopper, désenvelopper. La clé privée n'est jamais exportée d'un HSM |
| **Certificat** | En créer un crée aussi une clé et un secret du même nom. La **stratégie de certificat** contient le sujet, le type de clé, le caractère exportable ou non, l'émetteur et les **actions de durée de vie** |

**Stratégie de rotation des clés** (Key Vault Crypto Officer) : rotation automatique un certain temps après la création ou avant l'expiration (7 jours minimum), expiration de la nouvelle version, et événement avant expiration. Les services comme le Stockage Azure et le TDE d'Azure SQL utilisent un **URI de clé sans version** et prennent la nouvelle version automatiquement. La rotation réenveloppe les clés de chiffrement des données ; elle ne rechiffre pas les données.

```json
{
  "lifetimeActions": [
    { "trigger": { "timeAfterCreate": "P18M" }, "action": { "type": "Rotate" } },
    { "trigger": { "timeBeforeExpiry": "P30D" }, "action": { "type": "Notify" } }
  ],
  "attributes": { "expiryTime": "P2Y" }
}
```

```bash
az keyvault key rotation-policy update --vault-name kv-orders-prod-weu \
  --name cmk-storage --value policy.json
```

**Certificats** : les actions de durée de vie se déclenchent un nombre de jours avant l'expiration ou à un pourcentage de la durée de vie, et font soit **AutoRenew** (avec une autorité de certification intégrée, **DigiCert** ou **GlobalSign**, ou en auto-signé), soit **EmailContacts** (toute autre autorité : renouvellement manuel). Les contacts de certificat sont partagés par tous les certificats du coffre. Seule une clé RSA ou EC **exportable** permet de télécharger le PFX ou le PEM avec sa clé privée.

Les **secrets** n'ont pas de rotation intégrée : abonnez-vous à `SecretNearExpiry` avec Event Grid et exécutez une fonction qui crée la nouvelle version dans le coffre et dans le service cible.

> **Piège d'examen.** Un certificat émis par une autorité non intégrée ne peut pas se renouveler seul : Key Vault se contente d'envoyer un e-mail aux contacts. « Renouveler automatiquement sans aucune étape manuelle » signifie un émetteur intégré ou un certificat auto-signé.

<!-- section: secrets-scanning | objectives: 1.2.6 -->
## Rechercher des secrets avec Defender CSPM

Les secrets laissés en clair (chaînes de connexion, clés privées SSH, jetons SAS de stockage, secrets clients Entra, jetons d'accès personnels) permettent à un attaquant de se déplacer latéralement. Defender for Cloud les trouve **sans agent** :

| Analyse | Trouve des secrets dans | Plan |
| --- | --- | --- |
| Analyse des machines | Instantanés de disques des VM Azure, des instances AWS EC2, des instances de VM GCP | **Defender CSPM** ou **Defender for Servers Plan 2** |
| Analyse des déploiements cloud | Ressources de déploiement d'infrastructure en tant que code, dans tous les clouds | Defender CSPM |
| Analyse des référentiels de code | Référentiels Azure DevOps | Defender CSPM |

- Ni agent, ni connectivité réseau, ni impact sur les performances : l'analyseur lit des instantanés par les API du cloud.
- Les résultats apparaissent dans l'**inventaire des ressources**, en recommandations sous le contrôle **Remediate vulnerabilities** (*Machines should have secrets findings resolved* ; *EC2 instances should have secrets findings resolved* ; *VM instances should have secrets findings resolved*), dans les requêtes de l'**explorateur de sécurité cloud** (par exemple « VM with plaintext secret that can authenticate to a storage account ») et dans les **chemins d'attaque** d'une VM exposée vers un compte de stockage ou un serveur SQL.
- Consulter les résultats exige Security Reader, Security Admin, Reader, Contributor ou Owner.

Correction : retirez le secret de la machine ou du modèle, stockez-le dans Key Vault, donnez une identité managée à la charge de travail, faites tourner l'identifiant exposé, et préférez des identifiants de courte durée (un SAS court plutôt qu'une chaîne de connexion de stockage).

> **Piège d'examen.** Defender for Servers **Plan 1** ne recherche pas les secrets. Si l'abonnement a le Plan 1 et pas Defender CSPM, activer l'analyse impose de passer au Plan 2 ou d'activer Defender CSPM.

<!-- section: defender-key-vault | objectives: 1.2.7 -->
## Microsoft Defender for Key Vault

**Defender for Key Vault** est le plan de protection des charges de travail qui détecte les tentatives inhabituelles et potentiellement dangereuses d'accéder aux coffres de clés ou de les exploiter, à partir de l'activité de Key Vault, sans agent. Activez-le sur l'abonnement (**Defender for Cloud > Environment settings >** abonnement **> Defender plans > Key Vault: On**) ; la recommandation *Microsoft Defender for Key Vault should be enabled* signale les abonnements où il est désactivé.

Une alerte indique l'ID d'objet, et le nom d'utilisateur principal ou l'adresse IP de la source (pas d'ID d'objet pour un trafic venu de l'extérieur d'Azure, pas d'UPN quand une application a accédé au coffre), avec la liste des secrets consultés et l'heure.

Réponse, dans l'ordre :

1. Identifiez la source ; n'ignorez pas une alerte au seul motif que vous reconnaissez l'utilisateur ou l'application.
2. Contenez : pour une source inconnue, activez le pare-feu de Key Vault et n'autorisez que les réseaux approuvés ; pour une application ou un utilisateur non autorisé, supprimez son attribution de rôle ou sa stratégie d'accès.
3. Mesurez l'impact à partir des secrets consultés et de leurs horodatages, et des journaux de diagnostic.
4. Faites tourner les secrets, clés et certificats concernés, et désactivez ou supprimez les versions compromises.

> **Conseil d'examen.** Les alertes exigent un plan ; les journaux exigent des paramètres de diagnostic. « Être alerté quand un coffre est consulté depuis un emplacement suspect » : Defender for Key Vault. « Conserver une trace de chaque lecture de secret pendant un an » : un paramètre de diagnostic qui envoie AuditEvent vers un espace de travail Log Analytics.

<!-- section: key-points -->
## Points clés

- Premium pour les clés protégées par HSM ; un coffre par application et par environnement ; la durée de rétention est fixée à la création.
- La suppression réversible est toujours active ; la protection contre le vidage est facultative et irréversible, et exigée pour les clés gérées par le client.
- Utilisez le modèle d'autorisation Azure RBAC ; Key Vault Contributor gère les coffres mais ne lit rien ; le changement de modèle invalide les stratégies d'accès.
- Le pare-feu protège le plan de données ; point de terminaison privé plus accès public désactivé ; exception des services approuvés pour les services Azure.
- Stratégies de rotation pour les clés, actions de durée de vie pour les certificats, événements Event Grid avant expiration pour les secrets.
- Recherche de secrets sans agent : Defender CSPM ou Defender for Servers Plan 2. Defender for Key Vault lève des alertes sur les accès suspects.
