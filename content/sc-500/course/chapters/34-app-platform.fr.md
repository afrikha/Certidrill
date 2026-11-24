Les services de plateforme partagent un petit ensemble de leviers de sécurité : qui peut appeler le point de terminaison (authentification, clés, restrictions IP, points de terminaison privés), quelle identité le service utilise pour joindre d'autres ressources (identités managées plutôt que secrets) et ce qui inspecte le trafic (Web Application Firewall, stratégies API Management, Defender for Cloud).

<!-- section: defender-containers | objectives: 3.3.1 -->
## Defender for Containers

Defender for Containers couvre les clusters Kubernetes (AKS, Amazon EKS, Google GKE, Kubernetes avec Arc), leurs nœuds et les registres dont ils tirent les images :

| Fonctionnalité | Comment |
| --- | --- |
| Posture (erreurs de configuration) | Découverte sans agent via l'API Kubernetes, recommandations sur le plan de contrôle et renforcement du plan de données avec **Azure Policy pour Kubernetes** (par exemple, refuser les conteneurs privilégiés) |
| Évaluation des vulnérabilités | Analyses sans agent des images de registre, des conteneurs en cours d'exécution et des nœuds, réanalysées chaque jour |
| Protection contre les menaces à l'exécution | **Capteur Defender** sur les nœuds plus journaux d'audit Kubernetes ; alertes mappées sur MITRE ATT&CK ; anti-programme malveillant, détection et blocage de la dérive binaire |
| Chaîne d'approvisionnement | **Déploiement contrôlé** (gated deployment) : un contrôleur d'admission audite ou bloque le déploiement d'images qui enfreignent vos règles de vulnérabilité |

Activation : **Paramètres d'environnement** > abonnement > **Conteneurs** sur On > **Paramètres**, puis choix des composants : **Capteur Defender** (avec *Enable Defender Security Gating* et *Enable Defender Runtime Anti Malware*), **Azure Policy**, **Accès à l'API Kubernetes**, **Accès au registre** (avec **Security findings** lors du push d'image) et **Analyse sans agent des machines** (analyse des nœuds, avec étiquettes d'exclusion).

> **Piège d'examen.** La détection à l'exécution (un mineur de cryptomonnaie qui démarre dans un pod, un binaire absent de l'image) exige le **capteur Defender**. Les recommandations comme « les conteneurs privilégiés doivent être évités » sont évaluées et appliquées par le module complémentaire **Azure Policy**, pas par le capteur.

<!-- section: aks-security | objectives: 3.3.2 -->
## Azure Kubernetes Service

| Exigence | Contrôle |
| --- | --- |
| Serveur d'API joignable uniquement depuis le réseau virtuel | Cluster privé (`--enable-private-cluster`) |
| Serveur d'API public limité aux réseaux d'administration | Plages d'adresses IP autorisées (jusqu'à 200 ; équilibreur de charge Standard ; **pas avec un cluster privé**) |
| Autorisations Kubernetes gérées comme attributions de rôles Azure | Intégration Microsoft Entra + Azure RBAC pour l'autorisation Kubernetes (`--enable-aad --enable-azure-rbac`) |
| Aucun kubeconfig d'administrateur statique | `--disable-local-accounts` (`az aks get-credentials --admin` échoue alors) |
| Les pods accèdent à Azure sans secret | Microsoft Entra Workload ID (émetteur OIDC + identité de charge de travail) |
| Restreindre le trafic entre pods | Stratégies réseau Kubernetes |
| Secrets d'etcd chiffrés avec votre clé | Chiffrement etcd KMS avec Azure Key Vault |

Rôles intégrés pour Azure RBAC sur Kubernetes, attribuables à l'étendue du cluster ou d'un espace de noms :

| Rôle | Accès |
| --- | --- |
| Azure Kubernetes Service RBAC Reader | Lecture de la plupart des objets d'un espace de noms ; ni Secrets, ni rôles, ni liaisons de rôles |
| Azure Kubernetes Service RBAC Writer | Lecture et écriture de la plupart des objets, Secrets compris ; ni rôles ni liaisons de rôles |
| Azure Kubernetes Service RBAC Admin | Administrateur d'un espace de noms, rôles et liaisons de rôles compris |
| Azure Kubernetes Service RBAC Cluster Admin | Toutes les ressources de tous les espaces de noms |

```bash
az aks update -g RG1 -n aks1 --enable-azure-rbac
az aks update -g RG1 -n aks1 --disable-local-accounts
az role assignment create --role "Azure Kubernetes Service RBAC Reader" \
  --assignee dev@contoso.com --scope "<cluster ID>/namespaces/team-a"
```

> **Piège d'examen.** Après la désactivation des comptes locaux sur un cluster existant, faites tourner les certificats du cluster pour révoquer ceux que des utilisateurs détiennent peut-être déjà.

<!-- section: acr-security | objectives: 3.3.3 -->
## Azure Container Registry

Options d'authentification :

| Méthode | Usage | Remarques |
| --- | --- | --- |
| Identité Microsoft Entra individuelle (`az acr login`) | Développeurs | Jeton valable 3 heures |
| Principal de service | Pipelines CI/CD | Azure RBAC |
| Identité managée | Services Azure qui tirent des images (Container Apps, ACI, App Service) | À privilégier : aucun secret |
| Utilisateur administrateur | Tests par un seul utilisateur | **Désactivé par défaut** ; push et pull complets, pas de RBAC ; à éviter |
| Jetons non Entra avec mappages d'étendue | Accès limité à des référentiels pour des systèmes externes | Tous les niveaux |

Autorisation : **AcrPull** (pull), **AcrPush** (push et pull), **AcrDelete**. Les rôles **Container Registry Repository Reader / Writer / Contributor** fonctionnent dans les deux modes d'autorisation : Reader pour les orchestrateurs qui extraient des images (AKS, Container Apps, Container Instances), Writer pour les pipelines CI/CD qui envoient des images, Contributor s'ils en suppriment aussi. Un registre en mode d'autorisation **RBAC Registry + ABAC Repository Permissions** utilise **Container Registry Repository Reader / Writer / Contributor** avec des conditions ABAC pour limiter l'accès à certains référentiels ; dans ce mode, AcrPull, AcrPush et AcrDelete ne sont pas pris en compte, et Owner, Contributor et Reader n'ont aucun accès au plan de données (AcrPull correspond à Repository Reader plus **Container Registry Repository Catalog Lister**). Le passage à ce mode invalide les informations d'identification émises avant le changement : les clients reçoivent une erreur HTTP 401 jusqu'à ce qu'ils les actualisent.

| Fonctionnalité | Niveau |
| --- | --- |
| Points de terminaison privés, règles d'accès IP | Premium |
| Clés gérées par le client | Premium |
| Pull anonyme | Standard et Premium |
| Autorisations limitées aux référentiels | Tous les niveaux |

> **Piège d'examen.** Docker Content Trust ne peut plus être activé sur de nouveaux registres depuis le 31 mai 2026 et sera supprimé le 31 mars 2028 (tout comme le rôle AcrImageSigner). La signature d'images passe désormais par le **Notary Project** (signatures stockées comme artefacts OCI).

<!-- section: aci-aca | objectives: 3.3.4 -->
## Azure Container Instances et Azure Container Apps

**Container Instances** :

- Déployez le groupe de conteneurs dans un **réseau virtuel** pour qu'il n'ait qu'une adresse IP privée ; le trafic sortant depuis un réseau virtuel passe par une passerelle NAT.
- Transmettez les secrets avec `secureValue` au lieu de `value` : le portail et `az container show` n'affichent que le nom. Les volumes secrets sont l'alternative pour les fichiers.
- Utilisez une identité managée plutôt que des mots de passe de registre ou des clés incorporées.

```yaml
environmentVariables:
  - name: 'DB_HOST'
    value: 'sql1.contoso.local'
  - name: 'DB_PASSWORD'
    secureValue: 'stored-only-inside-the-container'
```

**Container Apps** :

| Exigence | Paramètre |
| --- | --- |
| Application joignable uniquement depuis les applications de l'environnement | Entrée (ingress) **interne** |
| Environnement entier sans point de terminaison public | Environnement créé avec `--internal-only true` dans votre sous-réseau |
| Seules certaines IP publiques peuvent appeler | Restrictions IP : **uniquement des règles Allow** ou **uniquement des règles Deny**, jamais mélangées ; aucune règle = tout le monde |
| Tirer depuis ACR sans informations d'identification | Identité managée avec AcrPull |
| Secrets | Références Key Vault avec une identité managée |
| Les utilisateurs doivent se connecter | Authentification intégrée |
| Les appelants présentent des certificats | Mode de certificat client (`clientCertificateMode`) |
| Chiffrer le trafic entre applications | Chiffrement de pair à pair sur l'environnement |

Le trafic HTTP sur le port 80 est redirigé vers HTTPS par défaut. Certains rôles intégrés incluent `listSecrets`, qui renvoie les valeurs des secrets en clair : vérifiez les autorisations d'un rôle avant de l'attribuer.

```bash
az containerapp ingress access-restriction set -n app1 -g RG1 \
  --rule-name office --ip-address 203.0.113.0/24 --action Allow
```

<!-- section: functions | objectives: 3.3.5 -->
## Azure Functions

Les déclencheurs HTTP ont un niveau d'autorisation : `anonymous`, `function` (par défaut, une clé de fonction ou d'hôte) ou `admin` (clé principale). La clé circule dans le paramètre de requête `code` ou dans l'en-tête `x-functions-key`. Les clés sont des secrets partagés, pas une identité : pour une véritable authentification des clients, activez l'**authentification App Service** (Microsoft Entra ID) ou placez **API Management** devant.

Réseau et secrets :

- **Restrictions d'accès** (règles IP et de service entrantes, évaluées par priorité ; aucune règle = tout est autorisé).
- **Points de terminaison privés** sur les plans Flex Consumption, Elastic Premium et Dedicated (App Service), avec des zones DNS privées.
- **Intégration au réseau virtuel** pour l'accès sortant aux ressources privées.
- Références Key Vault dans les paramètres d'application (`@Microsoft.KeyVault(SecretUri=...)`) et **connexions basées sur l'identité**, par exemple `AzureWebJobsStorage__accountName` avec une identité managée au lieu d'une chaîne de connexion.
- HTTPS uniquement, TLS le plus récent, FTP désactivé ou FTPS uniquement, origines CORS explicites (jamais `*`), débogage à distance désactivé. `functionsRuntimeAdminIsolationEnabled` désactive les points de terminaison `/admin`.

> **Piège d'examen.** Les paramètres d'une application de fonction sont visibles par toutes ses fonctions. Pour isoler une fonction qui a besoin d'une information d'identification, déplacez-la dans une application de fonction distincte.

<!-- section: logic-apps | objectives: 3.3.6 -->
## Azure Logic Apps

| Exigence | Consommation | Standard |
| --- | --- | --- |
| Authentifier les appelants du déclencheur Request | OAuth avec une stratégie d'autorisation Microsoft Entra ID (Issuer, Audience) ; SAS désactivable | Easy Auth |
| Restreindre les appelants entrants | **Paramètres du workflow** : **Uniquement d'autres Logic Apps** ou **Plages d'adresses IP spécifiques** | **Mise en réseau** > **Restrictions d'accès** |
| Rôles | Logic App Contributor, Logic App Operator | Logic Apps Standard Reader, Operator, Developer, Contributor |

- L'URL du déclencheur Request contient une **SAS** (`sp`, `sv`, `sig`) : protégez-la, régénérez régulièrement les clés d'accès ou créez des URL de rappel qui expirent (`NotAfter`).
- **Entrées sécurisées** / **Sorties sécurisées** masquent les données dans l'historique des exécutions et vis-à-vis de Log Analytics. Restreignez l'accès à l'historique des exécutions à une plage IP (`0.0.0.0-0.0.0.0` bloque tout le monde).
- Utilisez des paramètres `securestring` et Key Vault pour les secrets ; pour les appels sortants, privilégiez l'authentification **Identité managée**.

> **Piège d'examen.** Toute personne qui peut modifier un workflow peut utiliser chaque identité managée qui lui est attribuée : un accès de niveau Contributor à un workflow est un accès à tout ce que ses identités peuvent atteindre.

<!-- section: app-service | objectives: 3.3.7 -->
## Azure App Service

| Exigence | Paramètre |
| --- | --- |
| Rediriger HTTP vers HTTPS | HTTPS uniquement (désactivé par défaut) |
| Refuser les anciennes versions de TLS | Version TLS minimale 1.2 ou plus (aussi sur le site SCM) |
| Aucune information d'identification de déploiement en clair | Désactiver l'authentification de base pour FTP et SCM ; FTPS uniquement ou FTP désactivé |
| Les utilisateurs se connectent avant d'atteindre le code | Authentification intégrée : redirection 302 (applications web) ou 401 (API) pour les requêtes non authentifiées |
| TLS mutuel | Certificats clients |
| Secrets hors des paramètres d'application | Références Key Vault + identité managée |
| Aucune exposition publique | Point de terminaison privé, ou App Service Environment ILB |
| Sortie vers des ressources privées | Intégration au réseau virtuel |
| Détection des menaces | Defender for App Service |

Les **restrictions d'accès** sont évaluées par priorité ; dès qu'une règle existe, le trafic non correspondant est refusé, sauf si vous définissez l'action de la règle sans correspondance. Le site SCM (Kudu) a ses propres règles ou peut reprendre celles du site principal. Types de règles : IPv4/IPv6, point de terminaison de service, étiquette de service, plus des filtres d'en-têtes HTTP.

> **Piège d'examen.** Les restrictions d'accès ne s'appliquent pas au trafic qui arrive par un **point de terminaison privé**. Pour n'accepter qu'un seul profil Front Door, combinez une règle d'étiquette de service `AzureFrontDoor.Backend` avec un filtre d'en-tête `X-Azure-FDID` : l'étiquette seule autorise tous les clients de Front Door.

<!-- section: waf | objectives: 3.3.8 -->
## Azure Web Application Firewall

| Élément | Application Gateway | Front Door |
| --- | --- | --- |
| SKU | WAF_v2 (stratégies non prises en charge en v1) | Premium pour les règles managées et la protection contre les bots ; Standard = règles personnalisées uniquement |
| Étendues de stratégie | Globale, par site (écouteur), par URI (règle de chemin) | Profil, domaine, route |
| La plus spécifique l'emporte | Oui | Route, puis domaine, puis profil |

- **Modes** : **Détection** journalise seulement ; **Prévention** bloque (403). Commencez en Détection, puis basculez.
- **Règles managées** : Default Rule Set (DRS) de Microsoft ou OWASP CRS 3.x avec score d'anomalie : Critical 5, Error 4, Warning 3, Notice 2 ; un score de 5 bloque.
- Les **règles personnalisées** s'exécutent **avant** les règles managées, par priorité (le plus petit nombre d'abord) : conditions de correspondance, géo-correspondance, listes d'IP, limitation de débit (Front Door : par IP cliente sur 1 ou 5 minutes). Actions : Allow, Block, Log (et Redirect sur Front Door).
- Ensemble de règles **Bot Manager** : bots malveillants bloqués, bons bots autorisés, bots inconnus journalisés par défaut.
- Les **exclusions** retirent un en-tête, un cookie ou un argument (par exemple un jeton d'authentification) de l'inspection pour corriger des faux positifs sans désactiver de règle.
- Journaux : `ApplicationGatewayFirewallLog` (Application Gateway) vers Log Analytics, le stockage ou Event Hubs.

> **Piège d'examen.** Un faux positif sur un champ se corrige avec une **exclusion** (ou en désactivant une règle), pas en passant toute la stratégie en mode Détection.

<!-- section: apim-policies | objectives: 3.3.9 -->
## Stratégies API Management pour la protection du back-end

Les stratégies s'exécutent dans les sections **inbound**, **backend**, **outbound** et **on-error**, à l'étendue globale, produit, API ou opération ; `<base />` hérite des stratégies de l'étendue parente.

| Exigence | Stratégie |
| --- | --- |
| Valider un jeton OAuth de n'importe quel émetteur | `validate-jwt` |
| Valider un jeton Microsoft Entra (audience, revendications) | `validate-azure-ad-token` |
| Autoriser ou bloquer des IP d'appelants | `ip-filter` |
| Limiter le débit par abonnement / par clé (IP, revendication) | `rate-limit` (tous les niveaux) / `rate-limit-by-key` (pas en Consommation) |
| Quota de volume par abonnement / par clé | `quota` (tous les niveaux, étendue produit uniquement) / `quota-by-key` (Developer, Basic, Standard, Premium) |
| APIM s'authentifie auprès du back-end sans secret | `authentication-managed-identity` |
| Certificat client vers le back-end / valider le certificat de l'appelant | `authentication-certificate` / `validate-client-certificate` |
| Rejeter les corps trop volumineux ou mal formés | `validate-content` (aussi `validate-parameters`, `validate-headers`) |
| Appels inter-origines depuis un navigateur | `cors` |

```text
<inbound>
  <base />
  <validate-azure-ad-token tenant-id="contoso.onmicrosoft.com">
    <audiences><audience>api://orders</audience></audiences>
  </validate-azure-ad-token>
  <rate-limit-by-key calls="100" renewal-period="60"
      counter-key="@(context.Request.IpAddress)" />
  <authentication-managed-identity resource="api://orders-backend" />
</inbound>
```

Pour faire d'APIM le seul chemin vers le back-end, verrouillez aussi le back-end lui-même : restrictions d'accès ou point de terminaison privé sur l'application App Service ou de fonction, et une authentification du back-end que l'identité managée d'APIM satisfait. Une instance ne peut être ni mise à niveau depuis le niveau Consommation ni rétrogradée vers celui-ci : une API qui exige `rate-limit-by-key` doit être publiée par une instance d'un autre niveau.

> **Piège d'examen.** `rate-limit` et `quota` comptent par **clé d'abonnement** ; pour limiter par IP d'appelant ou par revendication utilisateur, utilisez les variantes `-by-key`.

<!-- section: key-points -->
## Points clés

- Defender for Containers : capteur pour l'exécution, module Azure Policy pour le renforcement, accès au registre pour l'analyse des images, contrôle (gating) pour le déploiement.
- AKS : cluster privé ou plages IP autorisées (pas les deux), Azure RBAC pour Kubernetes, désactivation des comptes locaux.
- ACR : utilisateur administrateur désactivé, identité managée + AcrPull, points de terminaison privés et clés gérées par le client en Premium, le Notary Project remplace Content Trust.
- Les restrictions IP de Container Apps sont toutes Allow ou toutes Deny ; les secrets d'ACI utilisent `secureValue`.
- Les clés de fonction ne sont pas une authentification ; les points de terminaison privés exigent Flex Consumption, Premium ou Dedicated.
- Les restrictions d'accès App Service ne filtrent pas le trafic des points de terminaison privés ; verrouillage pour Front Door = étiquette de service + `X-Azure-FDID`.
- WAF : règles personnalisées d'abord, la stratégie la plus spécifique l'emporte, exclusions pour les faux positifs.
- APIM : `validate-jwt`/`validate-azure-ad-token`, `ip-filter`, `rate-limit-by-key`, `authentication-managed-identity`.
