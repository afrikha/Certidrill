Un back-end d'IA est le plus souvent livré sous forme d'image conteneur : une API Python qui appelle un modèle, un worker de calcul d'incorporations, un service de récupération. Ce chapitre couvre l'endroit où vit l'image (Azure Container Registry), la façon de la générer dans Azure sans moteur Docker local (ACR Tasks) et la manière dont App Service l'exécute avec ses paramètres et ses secrets. Les questions d'examen demandent la commande, la propriété YAML ou le paramètre qui satisfait une contrainte comme « aucune information d'identification dans le pipeline », « regénérer quand l'image de base est corrigée » ou « aucun secret dans le code ».

<!-- section: acr-registry | objectives: 1.1.1 -->
## Stocker et versionner des images dans Azure Container Registry

Un registre a un serveur de connexion `<registry>.azurecr.io`. Une image s'adresse sous la forme `<registry>.azurecr.io/<repository>:<tag>` ou, de façon immuable, par la synthèse (digest) de son manifeste `<repository>@sha256:<digest>`. Les référentiels peuvent être organisés en espaces de noms (`rag/api`, `rag/indexer`).

| Niveau | Stockage inclus | Ce que seul ce niveau ajoute |
| --- | --- | --- |
| Basic | 10 Gio | Niveau d'entrée, débit le plus faible ; ni cache d'artefacts ni tirage anonyme |
| Standard | 100 Gio | Mêmes fonctionnalités que Basic avec plus de stockage et de débit, plus le cache d'artefacts et le tirage anonyme |
| Premium | 500 Gio | Géoréplication, points de terminaison privés, points de terminaison de données dédiés, règles d'accès IP, clés gérées par le client, registres connectés, streaming d'artefacts, stratégie de rétention des manifestes non balisés, pools d'agents dédiés pour les tâches |

Vous pouvez changer de niveau à tout moment sans interruption (`az acr update --name crcontoso --sku Premium`) ; pour descendre depuis Premium, supprimez d'abord les géoréplications et les registres connectés. La redondance de zone est activée par défaut dans les régions prises en charge, pour tous les niveaux.

**Envoyer (push) et tirer (pull) depuis un poste ou un pipeline :**

```bash
az acr login --name crcontoso
docker build -t crcontoso.azurecr.io/rag/api:1.4.0 .
docker push crcontoso.azurecr.io/rag/api:1.4.0

# Copy a public or partner image into the registry without docker pull/push
az acr import --name crcontoso \
  --source docker.io/library/python:3.12-slim --image base/python:3.12-slim

az acr repository list --name crcontoso --output table
az acr repository show-tags --name crcontoso --repository rag/api --output table
```

Le jeton obtenu par `az acr login` est valide **3 heures**. Sans démon Docker (un agent de build qui n'exécute que l'Azure CLI), utilisez `az acr login --name crcontoso --expose-token` et passez le jeton à `docker login` avec le nom d'utilisateur `00000000-0000-0000-0000-000000000000`.

**Options d'authentification :**

| Option | À utiliser pour | Limites |
| --- | --- | --- |
| Identité Microsoft Entra (`az acr login`) | Développeurs qui envoient et tirent des images | Jeton à renouveler toutes les 3 heures |
| Identité managée avec un rôle | Services Azure qui tirent des images (App Service, Container Apps, AKS) ou pipelines sur Azure | Uniquement les services qui prennent en charge les identités managées |
| Principal de service avec un rôle | CI/CD sans surveillance hors d'Azure | Secret à renouveler (1 an par défaut) |
| Utilisateur administrateur | Tests rapides par une seule personne | **Désactivé par défaut** ; push et pull complets, aucune restriction par rôle |
| Jeton limité à des référentiels | Pull ou push limité à certains référentiels, hors Microsoft Entra ID | Non intégré au RBAC Microsoft Entra |

Rôles : **AcrPull** (pull) et **AcrPush** (push et pull) sur le registre. Un registre en mode **RBAC Registry + ABAC Repository Permissions** (disponible sur tous les niveaux) utilise à la place les rôles de référentiel, qui acceptent des conditions les limitant à certains référentiels : **Container Registry Repository Reader** (pull), **Container Registry Repository Writer** (push, sans suppression), **Container Registry Repository Contributor** (suppression en plus). **Container Registry Tasks Contributor** gère les tâches et `az acr build` / `az acr run` sans aucun accès aux données.

**Stratégie de balisage (tags) :**

| Type de balise | Exemple | Usage |
| --- | --- | --- |
| Balise stable | `python:3.12`, `rag/api:1` | Images de base : la balise continue de recevoir des correctifs |
| Balise unique | `rag/api:1.4.0-7f3c2a1`, ID de build | **Déploiements** : chaque nœud et chaque réplica redémarré tire exactement la même image |
| Synthèse (digest) | `rag/api@sha256:...` | Référence totalement immuable, mais peu lisible et sans lien avec le build |

> **Piège d'examen.** Déployer `:latest` ou une autre balise stable signifie qu'un scale-out ou un redémarrage peut tirer une image différente de celle qui tourne déjà. La réponse à « toutes les instances doivent exécuter le même build » est une balise unique (ou la synthèse), pas `latest`.

Quand une balise stable est envoyée de nouveau, l'image précédente devient un **manifeste non balisé** : il occupe toujours du stockage et peut toujours être tiré par sa synthèse.

**Gérer le contenu :**

```bash
# Lock a deployed image: no overwrite, no delete
az acr repository update --name crcontoso --image rag/api:1.4.0 --write-enabled false

# Allow updates but block deletion of a whole repository
az acr repository update --name crcontoso --repository rag/api \
  --delete-enabled false --write-enabled true

# Premium (preview): delete untagged manifests 30 days after they are untagged
az acr config retention update --registry crcontoso \
  --status enabled --days 30 --type UntaggedManifests

# Any tier (preview): purge tags older than 7 days, and untagged manifests
az acr run --registry crcontoso \
  --cmd "acr purge --filter 'rag/api:.*' --ago 7d --untagged" /dev/null
```

| Besoin | Réponse |
| --- | --- |
| Protéger l'image de production contre un push ou une suppression accidentels | `az acr repository update ... --write-enabled false` |
| Supprimer automatiquement les manifestes non balisés, registre Premium | Stratégie de rétention (0 à 365 jours, 7 par défaut) ; ne s'applique qu'aux manifestes devenus non balisés après son activation |
| Nettoyer les anciennes balises selon une planification, tout niveau | `acr purge` dans une tâche planifiée ; testez d'abord avec `--dry-run` |
| Des systèmes tirent les images par synthèse | Ne purgez pas et ne faites pas expirer les manifestes non balisés : leurs images disparaîtraient |

> **Piège d'examen.** Sans `--untagged`, `acr purge` ne supprime que les balises ; les manifestes et les couches restent et continuent d'occuper du stockage. Les images verrouillées (`write-enabled` ou `delete-enabled` à false) sont ignorées, sauf si vous ajoutez `--include-locked`. Les données d'image supprimées sont irrécupérables.

<!-- section: acr-tasks | objectives: 1.1.2 -->
## Générer et exécuter des images avec ACR Tasks

ACR Tasks génère et exécute des conteneurs **dans Azure** : aucun moteur Docker sur le poste du développeur ni sur l'agent du pipeline, et l'image arrive directement dans le registre.

| Type de tâche | Commande | Quand |
| --- | --- | --- |
| Tâche rapide | `az acr build` | Un build et un push, à la demande (« docker build + docker push dans le cloud ») |
| Exécution rapide d'un fichier YAML | `az acr run -f <file>.yaml <context>` | Une exécution multiétape, à la demande |
| Tâche déclenchée | `az acr task create` | Exécutions automatiques sur un commit du code source, une mise à jour de l'image de base ou une planification |

```bash
# Quick task: send the local folder as context, build and push
az acr build --registry crcontoso --image rag/api:1.4.0 .

# Build for another platform (default Linux/amd64)
az acr build --registry crcontoso --image rag/api:1.4.0-arm64 \
  --platform linux/arm64/v8 .
```

Le **contexte** peut être un dossier local, l'URL d'un dépôt Git (`https://github.com/contoso/rag-api.git#main:src`, branche puis sous-dossier), une URL Azure Repos, une archive tar distante ou un artefact OCI. Plateformes prises en charge : Linux (amd64, arm, arm64, 386) et Windows (amd64).

**Déclencheurs d'une tâche :**

| Déclencheur | Comportement |
| --- | --- |
| Commit du code source | Activé par défaut sur un contexte GitHub ou Azure Repos ; nécessite un jeton d'accès personnel (étendue `repo` pour un dépôt GitHub privé). Non pris en charge pour GitHub Enterprise. Déclencheur de pull request : désactivé par défaut |
| Mise à jour de l'image de base | Regénère l'image applicative quand son image de base est mise à jour dans le registre ou dans un registre public comme Docker Hub |
| Minuteur | Expression cron `{minute} {hour} {day} {month} {day-of-week}` en **UTC**, sans champ des secondes ; plusieurs minuteurs par tâche autorisés si leurs planifications diffèrent |

```bash
# Rebuild on every commit to main, and on base image updates
az acr task create --registry crcontoso --name build-rag-api \
  --context https://github.com/contoso/rag-api.git#main \
  --file Dockerfile --image rag/api:{{.Run.ID}} \
  --git-access-token $GIT_PAT

# Nightly run at 02:30 UTC without any source context
az acr task create --registry crcontoso --name nightly-purge \
  --cmd "acr purge --filter 'rag/.*:.*' --ago 30d --untagged" \
  --schedule "30 2 * * *" --context /dev/null

az acr task timer add --registry crcontoso --name build-rag-api \
  --timer-name weekly --schedule "0 4 * * Sun"
az acr task run --registry crcontoso --name build-rag-api
az acr task logs --registry crcontoso --name build-rag-api
```

Les exécutions manuelles diffusent leur journal dans la console ; les exécutions automatiques le stockent seulement (portail ou `az acr task logs`).

Les **tâches multiétapes** sont des fichiers YAML qui enchaînent des étapes `build`, `push` et `cmd` ; chaque étape `cmd` exécute un conteneur, si bien qu'une tâche peut générer une image, exécuter ses tests, puis ne l'envoyer que si les tests ont réussi :

```yaml
version: v1.1.0
stepTimeout: 900
steps:
  - id: build
    build: -t $Registry/rag/api:$ID -f Dockerfile .
  - id: test
    cmd: $Registry/rag/api:$ID python -m pytest
    when: ["build"]
  - id: push
    push:
      - $Registry/rag/api:$ID
    when: ["test"]
```

| Élément | Signification |
| --- | --- |
| `build` | Comme `docker build` ; l'image n'est **pas envoyée** tant qu'aucune étape `push` ne le fait |
| `push` | Envoie une ou plusieurs images générées ou dont la balise a été changée |
| `cmd` | Exécute un conteneur (une image sans préfixe de registre vient de Docker Hub) |
| `when` | Dépendances vers des ID d'étapes ; `["-"]` = démarrer tout de suite, en parallèle |
| `$Registry`, `$ID`, `$Date`, `$Commit`, `$Branch` | Alias des variables d'exécution `{{.Run.Registry}}`, `{{.Run.ID}}`... |
| `stepTimeout` / `timeout` | Secondes par étape, **600 par défaut** |
| `secrets` | Valeurs lues dans Key Vault au moment de l'exécution avec une identité managée, au lieu d'arguments de ligne de commande |

> **Piège d'examen.** Tout ce qui est passé en ligne de commande ou dans l'URL d'un contexte peut apparaître dans les traces de diagnostic d'ACR, jetons compris. Gardez les secrets dans les `secrets` de la tâche (Key Vault) ou dans son identité managée, pas dans des arguments de ligne de commande ni dans des URL.

> **Conseil d'examen.** Les exécutions de tâches sont temporairement suspendues pour les abonnements qui fonctionnent avec des crédits gratuits Azure. Si, dans un scénario, la tâche ne démarre jamais sur un tel abonnement, c'est la cause, pas le YAML.

<!-- section: app-service-containers | objectives: 1.1.3 -->
## Exécuter des conteneurs sur Azure App Service

App Service exécute un conteneur personnalisé Linux tiré d'un registre et ajoute ce dont une API web a besoin : TLS, domaines personnalisés, emplacements de déploiement, authentification et mise à l'échelle automatique du plan. Il convient à **un conteneur HTTP** (plus d'éventuels sidecars), pas à une mise à l'échelle pilotée par les événements jusqu'à zéro.

**Tirer l'image d'ACR avec une identité managée**, la méthode recommandée pour les conteneurs Linux et Windows (un principal de service n'est plus pris en charge pour le tirage d'images de conteneurs Windows) :

```bash
az webapp identity assign --resource-group rg-rag --name app-rag-api \
  --query principalId --output tsv
az role assignment create --assignee <principal-id> \
  --scope <registry-resource-id> --role "AcrPull"
az webapp config set --resource-group rg-rag --name app-rag-api \
  --generic-configurations '{"acrUseManagedIdentityCreds": true}'
# User-assigned identity: also give its client ID
az webapp config set --resource-group rg-rag --name app-rag-api \
  --generic-configurations '{"acrUserManagedIdentityID": "<client-id>"}'

az webapp config container set --resource-group rg-rag --name app-rag-api \
  --container-image-name crcontoso.azurecr.io/rag/api:1.4.0
```

Le registre doit accepter les jetons d'audience ARM (`az acr config authentication-as-arm update -r crcontoso --status enabled`), sinon le tirage échoue avec `UNAUTHORIZED`. Un registre joignable uniquement par un point de terminaison privé nécessite aussi l'intégration au réseau virtuel de l'application et `vnetImagePullEnabled` à true. Après un changement d'image, l'ancien conteneur continue de servir jusqu'à ce que le nouveau soit démarré et prêt.

**Paramètres lus par le conteneur :**

| Paramètre | Effet |
| --- | --- |
| Paramètres d'application | Injectés dans le conteneur comme **variables d'environnement** ; en modifier un redémarre l'application |
| `WEBSITES_PORT` | Port d'écoute du conteneur quand ce n'est pas 80 ; un seul port HTTP est exposé ; non injecté dans le conteneur |
| `WEBSITES_ENABLE_APP_SERVICE_STORAGE` | `true` = `/home` persiste entre les redémarrages et est partagé par les instances ; **désactivé par défaut** pour les conteneurs personnalisés |
| `DOCKER_REGISTRY_SERVER_*` | Informations d'identification du registre ; non exposées à l'application |

```text
import os

search_endpoint = os.environ["SEARCH_ENDPOINT"]
openai_key = os.environ["OPENAI_API_KEY"]   # value resolved from Key Vault by App Service
```

**Secrets : références Key Vault.** La valeur d'un paramètre d'application (ou d'une chaîne de connexion) est une référence, qu'App Service résout avec l'identité managée de l'application ; le code lit une variable d'environnement ordinaire.

```text
@Microsoft.KeyVault(SecretUri=https://kv-rag.vault.azure.net/secrets/openai-key)
@Microsoft.KeyVault(VaultName=kv-rag;SecretName=openai-key)
```

```bash
az webapp config appsettings set --resource-group rg-rag --name app-rag-api \
  --settings WEBSITES_PORT=8000 \
  "OPENAI_API_KEY=@Microsoft.KeyVault(SecretUri=https://kv-rag.vault.azure.net/secrets/openai-key)"
```

| Exigence | Configuration |
| --- | --- |
| Accès au coffre | Identité managée de l'application avec **Key Vault Secrets User** (modèle RBAC) ou l'autorisation Get sur les secrets (modèle de stratégie d'accès) |
| Utiliser une identité affectée par l'utilisateur | Définir `keyVaultReferenceIdentity` sur son ID de ressource (`az webapp update --set keyVaultReferenceIdentity=<id>`) ; s'applique à toutes les références de l'application |
| Toujours utiliser la dernière version après une rotation | Référence sans version ; App Service relit la valeur sous **24 heures**, et immédiatement à chaque modification de configuration (redémarrage) |
| Figer une version | Inclure la version dans `SecretUri` ou `SecretVersion` |
| Coffre derrière un pare-feu | Intégration au réseau virtuel ; pour les applications Linux qui joignent un point de terminaison privé, `vnetRouteAllEnabled` |

> **Piège d'examen.** Quand une référence ne peut pas être résolue (rôle manquant, secret supprimé, erreur de syntaxe), l'application reçoit comme valeur la chaîne littérale `@Microsoft.KeyVault(...)`, et le code échoue parce qu'il utilise cette chaîne comme secret. Vérifiez l'état dans la boîte de dialogue de modification du paramètre ou avec le détecteur Key Vault Application Settings Diagnostics.

**Journaux et shell :**

```bash
az webapp log config --resource-group rg-rag --name app-rag-api \
  --docker-container-logging filesystem
az webapp log tail --resource-group rg-rag --name app-rag-api
```

Le terminal SSH du navigateur et la commande `az webapp exec` (en préversion) passent par Kudu et ne demandent aucun serveur SSH dans l'image, mais ils ont besoin d'un shell (`/bin/bash` pour le terminal du navigateur ; `az webapp exec --shell` peut en utiliser un autre, comme `/bin/sh`) : les images distroless ne peuvent pas ouvrir de session. Les journaux de la plateforme (Docker) sont activés par défaut et disponibles aussi à `https://<app>.scm.azurewebsites.net/api/logs/docker`.

**Plusieurs conteneurs :** ajoutez jusqu'à neuf conteneurs **sidecar** à côté du conteneur principal (Centre de déploiement > Conteneurs), par exemple un collecteur OpenTelemetry ; les paramètres d'application sont visibles par tous les conteneurs, et chaque conteneur peut aussi avoir ses propres variables d'environnement. Dans une application avec sidecars, `WEBSITES_PORT` et les paramètres `DOCKER_REGISTRY_SERVER_*` ne s'appliquent pas : chaque conteneur écoute sur son propre port, et seuls les ports 80 et 8080 reçoivent le trafic HTTP externe. Les applications multiconteneurs Docker Compose sont mises hors service le 31 mars 2027 et remplacées par les sidecars.

| Exigence | Service |
| --- | --- |
| Une API web conteneurisée avec emplacements, domaine personnalisé, TLS, authentification intégrée | App Service |
| Mise à l'échelle sur la longueur d'une file ou sur des événements, jusqu'à zéro, révisions avec répartition du trafic | Azure Container Apps (chapitre suivant) |
| API Kubernetes complète, contrôleurs personnalisés, pools de nœuds | AKS (chapitre suivant) |

<!-- section: key-points -->
## Points clés

- Déployez avec une balise unique ou une synthèse, jamais une balise mobile ; verrouillez les images déployées avec `--write-enabled false`.
- Premium uniquement : géoréplication, points de terminaison privés, stratégie de rétention des manifestes non balisés, pools d'agents dédiés. La redondance de zone est activée par défaut pour tous les niveaux.
- Utilisateur administrateur désactivé par défaut ; les services tirent les images avec une identité managée qui détient AcrPull (ou Container Registry Repository Reader sur un registre ABAC).
- `az acr build` = build et push dans Azure sans Docker ; `az acr task create` ajoute les déclencheurs de commit, d'image de base et de minuteur (cron UTC) ; le YAML multiétape enchaîne `build`, `cmd`, `push`.
- App Service : les paramètres d'application deviennent des variables d'environnement, `WEBSITES_PORT` pour un port autre que 80 (pas dans une application avec sidecars, qui reçoit le trafic externe sur le port 80 ou 8080), `acrUseManagedIdentityCreds` pour tirer l'image avec l'identité.
- Les références Key Vault `@Microsoft.KeyVault(...)` exigent l'identité de l'application avec Key Vault Secrets User ; les références sans version suivent la rotation sous 24 heures.
