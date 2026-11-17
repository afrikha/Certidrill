Un compte de stockage se protège en quatre couches que les questions SC-500 testent séparément : les paramètres de sécurité du compte lui-même (transport, accès anonyme, clés, chiffrement), le pare-feu du stockage, la protection contre les menaces avec Microsoft Defender for Storage, et l'autorisation de chaque requête (rôles Microsoft Entra, signatures d'accès partagé et stratégies d'accès stockées). Une requête n'aboutit que si elle passe le contrôle réseau **et** le contrôle d'autorisation.

<!-- section: account-hardening | objectives: 2.1.1 -->
## Renforcer le compte de stockage

La plupart des paramètres se trouvent dans la page **Paramètres > Configuration** du compte et s'imposent à grande échelle avec Azure Policy (`Audit` pour signaler, `Deny` pour bloquer la création ou la modification d'un compte non conforme).

| Paramètre (portail) | Propriété | Valeur sécurisée | Effet et détails |
| --- | --- | --- | --- |
| Transfert sécurisé requis (Secure transfer required) | `supportsHttpsTrafficOnly` | Activé | Les requêtes en HTTP échouent |
| Version TLS minimale | `minimumTlsVersion` | `TLS1_2` | Les requêtes avec un TLS plus ancien échouent avec 400 (Bad Request). Le portail définit 1.2 pour les nouveaux comptes ; avec la CLI, PowerShell ou un modèle, la propriété n'est pas définie par défaut, ce qui accepte TLS 1.0 et supérieur. TLS 1.3 ne peut pas être imposé comme minimum |
| Autoriser l'accès anonyme aux objets blob (Allow Blob anonymous access) | `allowBlobPublicAccess` | Désactivé | Prime sur le niveau d'accès de chaque conteneur. Jusqu'à 30 secondes de propagation |
| Autoriser l'accès par clé de compte de stockage (Allow storage account key access) | `allowSharedKeyAccess` | Désactivé | Les requêtes signées avec une clé de compte, y compris les SAS de service et les SAS de compte, échouent avec 403. Non défini (null) signifie autorisé |
| Utiliser par défaut l'autorisation Microsoft Entra dans le portail Azure | `defaultToOAuthAuthentication` | Activé | Le portail utilise l'identité Entra de l'utilisateur au lieu de la clé pour parcourir les données ; l'utilisateur peut toujours basculer |
| Chiffrement d'infrastructure | `requireInfrastructureEncryption` | Activé quand la conformité exige un double chiffrement | Seconde couche AES-256 avec une clé différente, gérée par Microsoft. **Uniquement à la création du compte** |

```bash
az storage account update --resource-group RG-Data --name stcontosodata \
  --https-only true --min-tls-version TLS1_2 \
  --allow-blob-public-access false --allow-shared-key-access false
```

Les niveaux d'accès d'un conteneur sont **Privé** (par défaut), **Blob** (lecture anonyme des objets blob, pas de la liste du conteneur) et **Conteneur** (lecture et liste anonymes). Quand le compte interdit l'accès anonyme, les conteneurs en Blob ou Conteneur n'acceptent plus les requêtes anonymes ; inutile de modifier chaque conteneur. Le conteneur `$web` d'un site web statique reste public.

> **Piège d'examen.** Désactiver l'accès par clé partagée (Shared Key) casse toutes les SAS signées avec la clé du compte et, par défaut, l'accès aux partages de fichiers Azure dans le portail. L'ordre recommandé par Microsoft : repérer les clients qui utilisent Shared Key (métriques et journaux), les faire passer à Microsoft Entra ID ou à des SAS de délégation d'utilisateur, puis désactiver la clé, puis passer la stratégie de `Audit` à `Deny`.

Le **chiffrement au repos** est toujours actif (AES-256, clés gérées par Microsoft). Les clés gérées par le client (CMK) donnent le contrôle et la révocation :

| Exigence CMK | Valeur |
| --- | --- |
| Magasin de clés | Azure Key Vault ou Azure Key Vault Managed HSM, dans n'importe quels région, abonnement ou locataire Microsoft Entra |
| Paramètres du coffre | Suppression réversible **et** protection contre la suppression définitive activées |
| Clé | RSA ou RSA-HSM, 2048, 3072 ou 4096 bits |
| Identité | Compte existant : identité managée affectée par le système ou par l'utilisateur. **Nouveau compte : affectée par l'utilisateur uniquement** |
| Autorisations de l'identité | `get`, `wrapkey`, `unwrapkey` sur la clé |
| Version de clé | Omettre la version pour suivre la rotation automatiquement (vérifiée chaque jour) ; attendre 24 heures avant de désactiver l'ancienne version |
| Révocation | Désactiver la clé : lectures et écritures échouent avec 403 pour tous |
| Couverture | Stockage Blob Azure et Azure Files toujours ; Queue et Table seulement si choisi à la création du compte |

Les paramètres de protection des données complètent le renforcement : **suppression réversible** des objets blob et des conteneurs, contrôle de version des objets blob, **stockage immuable** (WORM : rétention limitée dans le temps de 1 à 146 000 jours, ou conservation légale avec étiquettes), un **verrou de ressource** `CanNotDelete` sur le compte (il protège le compte et sa configuration, pas les données qu'il contient) et **Interdire la réplication d'objets entre locataires**.

> **Piège d'examen.** Une stratégie de rétention limitée dans le temps verrouillée peut être prolongée, jamais raccourcie ni supprimée (cinq prolongations au plus pour une stratégie au niveau du conteneur). N'utilisez une stratégie déverrouillée que pour des tests courts.

<!-- section: storage-firewall | objectives: 2.1.2 -->
## Configurer le pare-feu du stockage

La page **Mise en réseau** du compte règle l'accès au réseau public :

| Option | Effet |
| --- | --- |
| Activé à partir de tous les réseaux | Par défaut : tout réseau atteint le point de terminaison public (l'autorisation s'applique toujours) |
| Activé à partir des réseaux sélectionnés | Seuls les réseaux virtuels, plages IP et instances de ressources listés passent ; tout le reste est refusé |
| Désactivé | Le point de terminaison public rejette tout le trafic ; seuls les points de terminaison privés fonctionnent |
| Sécurisé par périmètre (Secured by perimeter) | L'accès est régi par un périmètre de sécurité réseau |

Avec les réseaux sélectionnés, quatre types de règles autorisent le trafic :

| Règle | Autorise | Limites et conditions |
| --- | --- | --- |
| Règle de réseau virtuel | Un sous-réseau, de n'importe quel abonnement ou locataire | Jusqu'à 400 par compte. Le sous-réseau a besoin d'un point de terminaison de service : `Microsoft.Storage` (comptes de la même région) ou `Microsoft.Storage.Global` (toute région), un seul des deux par sous-réseau |
| Règle de réseau IP | Une adresse IPv4 publique ou une plage CIDR | Jusqu'à 400 par compte. Pas de plages privées (10, 172.16 à 172.31, 192.168), pas de `/31` ni `/32` (saisir des adresses uniques), pas d'IPv6. **Aucun effet sur les clients de la même région Azure** |
| Règle d'instance de ressource | Une instance de ressource précise (par exemple un espace de travail Azure Synapse) | Même locataire que le compte ; son identité managée a toujours besoin d'un rôle |
| Exceptions | Services Microsoft approuvés ; accès en lecture aux journaux et métriques | Les services approuvés priment sur les autres restrictions réseau |

```bash
az storage account update --resource-group RG-Data --name stcontosodata \
  --default-action Deny --bypass AzureServices Logging Metrics
az network vnet subnet update --resource-group RG-Net --vnet-name VNet-App \
  --name snet-app --service-endpoints Microsoft.Storage
az storage account network-rule add --resource-group RG-Data \
  --account-name stcontosodata --vnet-name VNet-App --subnet snet-app
az storage account network-rule add --resource-group RG-Data \
  --account-name stcontosodata --ip-address 131.107.0.0/16
```

Comportements qui décident des réponses :

- Les règles de pare-feu s'appliquent au **plan de données** uniquement. La gestion du compte (plan de contrôle) n'est pas filtrée.
- Un sous-réseau doté d'un point de terminaison de service atteint le compte avec son adresse source **privée** : une règle IP pour l'adresse IP publique du réseau virtuel n'a donc aucun effet.
- Pour des clients locaux via le peering Microsoft d'ExpressRoute, les règles IP listent les adresses publiques NAT utilisées pour ce peering.
- Supprimer un sous-réseau supprime sa règle ; un nouveau sous-réseau du même nom doit être ajouté à nouveau.
- Les modifications qui lèvent des restrictions peuvent mettre jusqu'à une minute à s'appliquer.
- Un **point de terminaison privé** donne au compte une adresse IP privée par sous-ressource (`blob`, `file`, `dfs`...) avec la zone `privatelink.blob.core.windows.net` ; il continue de fonctionner quand l'accès au réseau public est désactivé.

> **Piège d'examen.** Les machines virtuelles de la même région que le compte ne peuvent pas être autorisées par une règle IP, même via leurs adresses IP publiques. Utilisez une règle de réseau virtuel avec un point de terminaison de service, ou un point de terminaison privé.

<!-- section: defender-for-storage | objectives: 2.1.3 -->
## Implémenter Defender for Storage

Defender for Storage est un plan de Defender for Cloud, **sans agent**, qui protège le Stockage Blob Azure, Azure Files et Azure Data Lake Storage. Le plan actuel est facturé par compte de stockage protégé, plus un coût par gigaoctet pour l'analyse des programmes malveillants ; les comptes sous **Defender for Storage (classic)** doivent migrer pour obtenir les fonctionnalités actuelles.

| Composant | Rôle | Remarques |
| --- | --- | --- |
| Surveillance de l'activité | Analyse la télémétrie du plan de données et du plan de contrôle et génère des alertes sur les accès inhabituels ou potentiellement malveillants, comme une extraction suspecte de données | Toujours active avec le plan ; inutile d'activer les journaux de ressources ; aucun impact sur les performances |
| Analyse des programmes malveillants | Analyse les objets blob avec Microsoft Defender Antivirus **au chargement** (on-upload) ou **à la demande** (compte, conteneur, objet blob unique ou préfixe de chemin) | Plafond par défaut de **10 000 Go par compte et par mois**, ajustable ; jusqu'à 50 Go par objet blob ; l'analyse au chargement n'est pas prise en charge pour Azure Files, les objets blob de pages ni les objets blob d'ajout |
| Détection des menaces sur les données sensibles | Repère les données sensibles par échantillonnage intelligent (types d'informations sensibles de Microsoft Purview) pour aider à prioriser les alertes sur les comptes qui en contiennent | Sans coût supplémentaire ; peut être désactivée |

Activez le plan au niveau de l'**abonnement** (recommandé : les comptes existants et nouveaux sont couverts, et vous pouvez exclure des comptes) dans **Defender for Cloud > Paramètres d'environnement > abonnement > Plans Defender > Stockage**, puis utilisez **Paramètres** pour activer ou désactiver l'analyse des programmes malveillants et la détection des menaces sur les données sensibles et régler le plafond. Un compte de stockage peut **remplacer** (override) les paramètres de l'abonnement par sa propre configuration. À grande échelle, utilisez la définition Azure Policy intégrée, qui couvre aussi les futurs abonnements d'un groupe d'administration ; Bicep, ARM, Terraform, PowerShell et l'API REST conviennent aussi.

| Autorisation nécessaire | Qui |
| --- | --- |
| Activer le plan (surveillance de l'activité) au niveau de l'abonnement | Security Admin (ou `Microsoft.Security/pricings` en lecture et écriture) |
| Activer l'analyse des programmes malveillants ou la détection des menaces sur les données sensibles au niveau de l'abonnement | **Owner** de l'abonnement (la fonctionnalité crée des attributions de rôles) |

Les résultats de l'analyse des programmes malveillants vont vers :

- Des **étiquettes d'index d'objets blob** sur chaque objet blob analysé (`No threats found`, `Malicious`, `Error`, `Not scanned`, plus l'heure d'analyse). Actives par défaut ; non inviolables, donc à ne pas utiliser comme seul contrôle.
- Des **alertes de sécurité** dans Defender for Cloud pour les fichiers malveillants, exportables vers Microsoft Sentinel.
- En option, une **rubrique personnalisée Event Grid** (même région, accès au réseau public, type d'événement `Microsoft.Security.MalwareScanningResult`) pour déclencher une fonction ou une application logique, et un espace de travail **Log Analytics** (table `StorageMalwareScanningResults`).
- L'option de **suppression réversible des objets blob malveillants** (désactivée par défaut), qui supprime de façon réversible les objets blob malveillants et active au besoin la suppression réversible des objets blob (rétention de 7 jours par défaut, de 1 à 365).

Activer l'analyse des programmes malveillants crée une rubrique système Event Grid dans le groupe de ressources du compte et une ressource `StorageDataScanner` ; quand le pare-feu utilise les réseaux sélectionnés, ce scanner est ajouté à la liste des **instances de ressources** pour que l'analyse continue de fonctionner.

> **Piège d'examen.** L'analyse des programmes malveillants s'arrête pour le reste du mois quand le plafond est atteint (alertes à 75 % et 100 %). Si les chargements dépassent 10 000 Go par mois sur un compte, relevez le plafond au niveau de l'abonnement ou du compte.

<!-- section: storage-access | objectives: 2.1.4 -->
## Gérer l'accès au stockage

| Méthode | Comment l'accès est accordé | Révocation |
| --- | --- | --- |
| Microsoft Entra ID | Rôles de données Azure RBAC (Storage Blob Data Reader, Contributor, Owner ; Storage Queue Data... ; Storage File Data SMB Share...) | Supprimer l'attribution de rôle |
| Shared Key | L'une des deux clés du compte : accès complet | Effectuer une rotation de la clé |
| Signature d'accès partagé (SAS) | Un jeton signé avec services, ressources, autorisations, dates, plage IP facultative et HTTPS uniquement | Dépend du type |

Détenir `Microsoft.Storage/storageAccounts/listkeys/action` (Owner, Contributor, Storage Account Contributor, Reader and Data Access) revient à lire toutes les données avec la clé. Pour parcourir des données blob avec Entra ID dans le portail, un utilisateur a besoin d'un rôle de données **et** au moins de Reader sur le compte ou au-dessus.

| Type de SAS | Signée avec | Couvre | Stratégie d'accès stockée |
| --- | --- | --- | --- |
| SAS de délégation d'utilisateur | Clé de délégation d'utilisateur obtenue avec des informations d'identification Microsoft Entra (valable jusqu'à 7 jours) | Blob et Data Lake Storage, Queue, Table, Azure Files | Non |
| SAS de service | Clé du compte | Un seul service | **Oui** |
| SAS de compte | Clé du compte | Un ou plusieurs services, plus les opérations au niveau du service | Non |

Le principal qui demande une clé de délégation d'utilisateur a besoin de `.../blobServices/generateUserDelegationKey` à l'étendue du compte, du groupe de ressources ou de l'abonnement (par exemple Storage Blob Delegator ou n'importe quel rôle Storage Blob Data). Une SAS de délégation d'utilisateur continue de fonctionner quand l'accès par clé partagée est désactivé, et elle ne peut pas accorder plus que les autorisations de son créateur. Révoquez-la en appelant **Revoke User Delegation Keys** (le plus rapide) ou en supprimant l'attribution de rôle du créateur.

Une **stratégie d'accès stockée** se définit sur un conteneur, un partage de fichiers, une file d'attente ou une table (**cinq** au plus par ressource) avec un identificateur, une heure de début, une heure d'expiration et des autorisations. Une SAS de service qui y fait référence hérite de ces valeurs ; chaque valeur est définie soit dans la stratégie, soit dans la SAS, jamais dans les deux. Révoquez toutes les SAS qui y sont liées en supprimant la stratégie, en renommant son identificateur ou en plaçant son expiration dans le passé ; les changements prennent jusqu'à 30 secondes.

```bash
az storage container policy create --account-name stcontosodata \
  --container-name invoices --name read-30d --permissions rl \
  --expiry 2026-12-31T00:00Z
az storage blob generate-sas --account-name stcontosodata \
  --container-name invoices --name 2026-11.pdf --policy-name read-30d
az storage blob generate-sas --account-name stcontosodata \
  --container-name invoices --name 2026-11.pdf --permissions r \
  --expiry 2026-11-20T00:00Z --auth-mode login --as-user
```

Deux contrôles de plus : la **stratégie d'expiration SAS** du compte définit une durée de validité maximale recommandée pour les SAS de service et de compte (l'utilisateur reçoit un avertissement et l'événement est journalisé), et une SAS de service sans stratégie d'accès stockée devrait expirer en une heure au plus, car elle ne peut être révoquée qu'en effectuant une rotation de la clé.

| Exigence | Réponse |
| --- | --- |
| Donner à une application un accès limité et révocable sans clés de compte | SAS de délégation d'utilisateur |
| Révoquer de nombreuses SAS de service sans rotation des clés | Stratégie d'accès stockée, puis la supprimer ou la modifier |
| Révoquer une SAS de compte ad hoc | Rotation de la clé de compte qui l'a signée |
| Donner à tout un groupe l'accès en lecture à un conteneur | Storage Blob Data Reader à l'étendue du conteneur |
| Obliger tous les clients à utiliser Microsoft Entra ID | Interdire l'accès par clé partagée |

> **Piège d'examen.** Les stratégies d'accès stockées ne fonctionnent qu'avec les **SAS de service**. Une SAS de délégation d'utilisateur ou une SAS de compte ne peut pas en référencer une : pour une SAS de compte, « révoquer sans rotation des clés » n'a pas d'autre réponse que la rotation de la clé.

<!-- section: key-points -->
## Points clés

- Transfert sécurisé, TLS 1.2 minimum, pas d'accès anonyme et pas de Shared Key sont les quatre interrupteurs du compte ; imposez-les avec Azure Policy `Deny`.
- Les CMK exigent la suppression réversible et la protection contre la suppression définitive sur le coffre, une clé RSA et une identité managée (affectée par l'utilisateur quand le compte est créé) ; le chiffrement d'infrastructure se choisit uniquement à la création.
- Pare-feu du stockage : jusqu'à 400 règles IP et 400 règles de réseau virtuel, IPv4 public uniquement, aucun effet sur les clients de la même région ; les règles filtrent uniquement le plan de données.
- Defender for Storage : plan par compte, analyse des programmes malveillants au chargement et à la demande (plafond mensuel de 10 000 Go par défaut), détection des menaces sur les données sensibles, résultats dans les étiquettes d'index, les alertes, Event Grid et Log Analytics.
- La SAS de délégation d'utilisateur est à privilégier ; les stratégies d'accès stockées (cinq par conteneur) n'existent que pour les SAS de service ; révoquer une SAS de compte impose la rotation de la clé.
