Une requête vers un compte de stockage doit franchir deux contrôles : le contrôle **réseau** (l'appelant passe-t-il le pare-feu ?) et le contrôle d'**autorisation** (l'appelant détient-il une clé, un jeton ou un rôle ?). Ce chapitre couvre les deux.

<!-- section: authorization-overview | objectives: 2.1.2, 2.1.4 -->
## Quatre façons d'autoriser une requête

| Méthode | Preuve présentée | Portée | Révocation |
| --- | --- | --- | --- |
| Microsoft Entra ID | Un jeton OAuth ; l'accès est donné par des **rôles de données** Azure RBAC | Compte, conteneur, partage... | Retirer l'attribution de rôle |
| Clé partagée (Shared Key) | L'une des deux **clés d'accès du compte** | Tout le compte, tous les droits | Régénérer la clé |
| Signature d'accès partagé (SAS) | Un jeton signé dans l'URL | Services, ressources, autorisations et durée limités | Selon le type de SAS |
| Accès anonyme | Rien | Les objets blob d'un conteneur dont le niveau d'accès le permet | Changer le niveau d'accès du conteneur |

Microsoft recommande Microsoft Entra ID chaque fois que le client le prend en charge. Les stockages Blob, File d'attente et Table ainsi qu'Azure Files (REST et SMB) le prennent en charge.

<!-- section: storage-firewall | objectives: 2.1.1 -->
## Pare-feux et réseaux virtuels du stockage

La page **Mise en réseau** du compte règle l'*accès réseau public* :

| Réglage | Effet |
| --- | --- |
| Activé à partir de tous les réseaux | Valeur par défaut. N'importe quel réseau atteint le point de terminaison public (l'autorisation s'applique toujours) |
| Activé à partir des réseaux virtuels et adresses IP sélectionnés | L'action par défaut devient **Deny** ; seules les sources listées passent |
| Désactivé | Le point de terminaison public rejette tout ; seuls les **points de terminaison privés** fonctionnent |

Règles que l'on peut ajouter quand l'accès est restreint :

| Règle | Autorise | Détails |
| --- | --- | --- |
| Règle de réseau virtuel | Un **sous-réseau** d'un réseau virtuel | Le sous-réseau doit avoir le **point de terminaison de service** `Microsoft.Storage` (même région que le compte, ou sa région jumelée) ou `Microsoft.Storage.Global` (toute région). Le portail l'active pour vous ; la CLI et PowerShell demandent une étape séparée. Sans surcoût |
| Règle de réseau IP | Une adresse IPv4 **publique** ou une plage CIDR | Pour les clients locaux ou internet. Les plages privées (10.x, 172.16.x, 192.168.x) sont refusées. `/31` et `/32` ne sont pas acceptés : saisissez des adresses individuelles. **Sans effet sur les clients de la même région Azure que le compte** : utilisez pour eux une règle de réseau virtuel |
| Règle d'instance de ressource | Une instance précise de ressource Azure (par exemple une fabrique Azure Data Factory) | L'accès dépend toujours du rôle donné à son identité managée |
| Exception : services Azure approuvés | Une liste de services Microsoft exécutés hors de votre réseau (Sauvegarde Azure, Azure Site Recovery, Event Grid...) | Ne couvre pas vos propres machines virtuelles |

```bash
az storage account update -g RG1 -n stor1 --default-action Deny
az network vnet subnet update -g RG1 --vnet-name VNet1 -n Subnet1 \
  --service-endpoints Microsoft.Storage
az storage account network-rule add -g RG1 --account-name stor1 \
  --vnet-name VNet1 --subnet Subnet1
az storage account network-rule add -g RG1 --account-name stor1 --ip-address 131.107.8.0/24
```

Un **point de terminaison privé** donne au compte une adresse IP privée dans un sous-réseau. Il en faut un par sous-ressource (`blob`, `file`, `queue`, `table`, `dfs`, `web`). Avec la zone DNS privée `privatelink.blob.core.windows.net` liée au réseau virtuel, les clients continuent d'utiliser `stor1.blob.core.windows.net`, qui se résout désormais vers l'adresse privée. Le trafic d'un point de terminaison privé est autorisé même quand l'accès réseau public est désactivé, et il fonctionne aussi depuis le réseau local via un VPN ou ExpressRoute.

> **Piège d'examen.** Les règles réseau ouvrent un chemin ; elles n'autorisent rien. L'appelant a toujours besoin d'une clé, d'une SAS ou d'un rôle. À l'inverse, une clé valide ne sert à rien depuis un réseau que le pare-feu rejette.

<!-- section: sas | objectives: 2.1.2 -->
## Signatures d'accès partagé (SAS)

Une SAS délègue un accès limité sans partager la clé du compte.

| Type de SAS | Signée avec | Couvre | Stratégie d'accès stockée | Validité maximale |
| --- | --- | --- | --- | --- |
| **SAS de délégation d'utilisateur** | Une clé de délégation d'utilisateur, obtenue avec des informations d'identification Microsoft Entra | Stockage Blob et Data Lake Storage ; depuis janvier 2026, aussi Azure Files, les files d'attente et les tables | Non | 7 jours (durée de vie de la clé) |
| **SAS de service** | Une clé du compte | Un seul service : un conteneur, un objet blob, un partage de fichiers, une file d'attente ou une table | **Oui** (facultative) | Fixée par vous |
| **SAS de compte** | Une clé du compte | Un ou plusieurs services, plus les opérations au niveau du service | Non | Fixée par vous |

Une SAS est l'URI de la ressource suivi du jeton :

```text
https://stor1.blob.core.windows.net/reports/q1.pdf?sv=2024-11-04&ss=b&srt=o&sp=r
  &st=2026-11-16T08:00Z&se=2026-11-16T18:00Z&spr=https&sip=131.107.8.10&sig=<signature>
```

| Champ | Sens |
| --- | --- |
| `sv` | Version du service de stockage |
| `ss` | Services (SAS de compte) : `b` blob, `f` fichier, `q` file d'attente, `t` table |
| `srt` | Types de ressources (SAS de compte) : `s` service, `c` conteneur, `o` objet |
| `sp` | Autorisations : `r` lecture, `w` écriture, `d` suppression, `l` liste, `a` ajout, `c` création... |
| `st` / `se` | Heures de début et d'expiration (UTC) |
| `spr` | Protocole autorisé : `https` ou `https,http` |
| `sip` | Adresse IP ou plage autorisée |
| `si` | Identificateur d'une stratégie d'accès stockée (SAS de service) |
| `sig` | Signature |

Dans une SAS de compte, lister les objets blob d'un conteneur est une opération de **conteneur** (`srt=c`, autorisation `l`) et lire un objet blob est une opération d'**objet** (`srt=o`, autorisation `r`).

```bash
# User delegation SAS: no account key involved
az storage blob generate-sas --account-name stor1 --container-name reports --name q1.pdf \
  --permissions r --expiry 2026-11-16T18:00Z --https-only --auth-mode login --as-user
```

Bonnes pratiques qui apparaissent comme réponses :

- Préférez une SAS de délégation d'utilisateur ; donnez la validité la plus courte et le moins d'autorisations possible ; exigez HTTPS.
- Laissez l'heure de début vide, ou fixez-la 15 minutes dans le passé, pour éviter les échecs dus aux écarts d'horloge.
- Une SAS émise ne peut être ni listée ni auditée : quiconque détient l'URL peut s'en servir jusqu'à son expiration.

Comment révoquer une SAS avant son expiration :

| SAS | Révocation |
| --- | --- |
| SAS de service liée à une stratégie d'accès stockée | Supprimer ou modifier la stratégie |
| SAS de service ou de compte sans stratégie | Régénérer la **clé du compte qui l'a signée** (ce qui casse tout ce qui utilise cette clé) |
| SAS de délégation d'utilisateur | Révoquer les clés de délégation d'utilisateur, ou retirer le rôle de l'identité qui l'a créée |

<!-- section: stored-access-policies | objectives: 2.1.3 -->
## Stratégies d'accès stockées

Une stratégie d'accès stockée se définit **sur un conteneur, un partage de fichiers, une file d'attente ou une table**. Elle contient une heure de début, une heure d'expiration et des autorisations. Une **SAS de service** la référence par son identificateur et hérite de ses réglages.

- Modifier la stratégie modifie toutes les SAS qui la référencent ; la supprimer (ou renommer son identificateur) les révoque aussitôt, sans toucher aux clés du compte.
- Une valeur se définit dans la stratégie **ou** dans la SAS, pas dans les deux.
- Au plus **cinq** stratégies par conteneur, partage, file d'attente ou table.
- Une stratégie nouvelle ou modifiée peut mettre jusqu'à 30 secondes à prendre effet.
- Les SAS de compte et les SAS de délégation d'utilisateur ne peuvent pas utiliser de stratégie d'accès stockée.

```bash
az storage container policy create --account-name stor1 --container-name lab-results \
  --name lab-read --permissions rl --expiry 2026-12-31T00:00Z
az storage container generate-sas --account-name stor1 --name lab-results --policy-name lab-read
```

<!-- section: access-keys | objectives: 2.1.4 -->
## Clés d'accès

Chaque compte a **deux** clés de 512 bits, `key1` et `key2`. Une clé donne un accès complet à toutes les données et permet de générer des SAS. Il y en a deux pour que l'une reste valide pendant la rotation de l'autre :

1. Basculez les applications sur `key2`.
2. Régénérez `key1`.
3. Basculez les applications sur la nouvelle `key1`.
4. Régénérez `key2`.

- Régénérer une clé invalide immédiatement l'ancienne valeur et **toutes les SAS de service ou de compte signées avec elle**. Les SAS de délégation d'utilisateur ne sont pas touchées.
- Une **stratégie d'expiration des clés** fixe un intervalle de rappel de rotation et permet à Azure Policy de signaler les clés trop anciennes. Elle ne régénère jamais les clés elle-même. Sur les comptes anciens, les deux clés doivent avoir été régénérées au moins une fois.
- Les clés peuvent être stockées dans **Azure Key Vault**, qui peut aussi en assurer la rotation.
- Lire les clés demande `Microsoft.Storage/storageAccounts/listKeys/action` : Owner, Contributor, Storage Account Contributor et Storage Account Key Operator Service Role. **Reader ne le peut pas**.
- Pour bloquer complètement les clés, réglez **Autoriser l'accès à la clé du compte de stockage** sur Désactivé (`--allow-shared-key-access false`). Les requêtes par clé partagée et les SAS de service et de compte sont alors rejetées ; Microsoft Entra ID et les SAS de délégation d'utilisateur continuent de fonctionner.

```bash
az storage account keys list -g RG1 -n stor1
az storage account keys renew -g RG1 -n stor1 --key key1
```

<!-- section: files-identity-access | objectives: 2.1.5 -->
## Accès basé sur l'identité pour Azure Files

Les partages de fichiers SMB peuvent authentifier les utilisateurs avec Kerberos au lieu de la clé du compte. Une seule source d'identité est activée par compte de stockage :

| Source d'identité | À utiliser quand | Prérequis |
| --- | --- | --- |
| **AD DS** local | Les clients sont joints à votre domaine existant | Visibilité directe des contrôleurs de domaine ; identités synchronisées vers Microsoft Entra ID (ou une autorisation par défaut au niveau du partage) ; compte de stockage inscrit dans AD DS (module AzFilesHybrid, `Join-AzStorageAccount`) |
| **Microsoft Entra Domain Services** | Vous voulez un domaine managé dans Azure | Clients joints au domaine managé |
| **Microsoft Entra Kerberos** | Identités hybrides ou cloud uniquement sur des clients joints ou joints de façon hybride à Microsoft Entra (par exemple les profils FSLogix) | Aucune visibilité des contrôleurs de domaine requise |

L'accès est ensuite vérifié à deux niveaux, et **le plus restrictif l'emporte** :

| Niveau | Mécanisme | Valeurs |
| --- | --- | --- |
| Partage | Rôle Azure RBAC sur le partage ou le compte | Storage File Data SMB Share **Reader** (lecture), **Contributor** (lecture, écriture, suppression), **Elevated Contributor** (modification des ACL en plus) |
| Répertoire et fichier | ACL Windows (autorisations NTFS) | Définies avec l'Explorateur de fichiers, `icacls` ou `Set-Acl` après montage du partage |

Une **autorisation par défaut au niveau du partage** peut remplacer les attributions de rôles individuelles : elle s'applique à toutes les identités authentifiées, et c'est le seul moyen de servir des identités non synchronisées vers Microsoft Entra ID. Sans aucune autorisation au niveau du partage, l'accès est refusé quelles que soient les autorisations NTFS.

Le montage avec la clé du compte de stockage reste toujours possible et donne un contrôle total ; c'est ainsi que l'on configure en général les ACL la première fois. SMB utilise le **port TCP 445**, souvent bloqué par les fournisseurs d'accès : depuis le réseau local, préférez un VPN ou ExpressRoute avec un point de terminaison privé.

<!-- section: key-points -->
## Points clés

- Deux contrôles indépendants : les règles réseau, puis l'autorisation.
- Règles IP : adresses publiques seulement, sans effet dans la même région. Les règles de réseau virtuel demandent un point de terminaison de service sur le sous-réseau. *Désactivé* ne laisse que les points de terminaison privés.
- SAS de délégation d'utilisateur : signée avec des informations d'identification Microsoft Entra, sans clé de compte, 7 jours au plus. SAS de service : un seul service, peut utiliser une stratégie d'accès stockée. SAS de compte : plusieurs services, pas de stratégie.
- Stratégie d'accès stockée : cinq par conteneur ; la supprimer révoque ses SAS.
- Régénérer une clé révoque les SAS signées avec cette clé. Régénérez `key1` et `key2` en alternance.
- Désactiver la clé partagée ne laisse que Microsoft Entra ID et les SAS de délégation d'utilisateur.
- Azure Files : rôle au niveau du partage plus ACL NTFS, le plus restrictif s'applique.
