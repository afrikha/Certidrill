Un conteneur emballe une application avec ses dépendances et partage le noyau de son hôte : il démarre donc en quelques secondes. L'examen AZ-104 couvre trois services : un registre pour stocker les images, et deux façons de les exécuter sans gérer de machines virtuelles.

<!-- section: choose-container-service | objectives: 3.3.2, 3.3.3 -->
## Quel service pour quel besoin

| Service | Ce que c'est | À choisir pour |
| --- | --- | --- |
| **Azure Container Registry** (ACR) | Registre privé d'images conteneur | Stocker, générer et répliquer des images |
| **Azure Container Instances** (ACI) | Un groupe de conteneurs démarré à la demande, facturé à la seconde | Tâches simples ou courtes, traitements par lots, tests ; pas d'orchestration, **pas de mise à l'échelle automatique** |
| **Azure Container Apps** | Plateforme serverless pour applications et microservices | **Mise à l'échelle automatique** sur HTTP ou sur événements, **y compris jusqu'à zéro**, révisions, fractionnement du trafic, sans gérer Kubernetes |
| Azure Kubernetes Service (AKS) | Cluster Kubernetes managé | Contrôle complet de Kubernetes (hors du périmètre de cet examen) |

<!-- section: acr | objectives: 3.3.1 -->
## Azure Container Registry

Un registre a un nom unique au monde : 5 à 50 caractères alphanumériques **en minuscules**, sans tiret. Son serveur de connexion dépend de l'**étendue d'étiquette de nom de domaine** (DNL, domain name label) choisie à la création, qui ne peut plus être modifiée : `<nom>-<hachage>.azurecr.io` avec la protection DNL (Tenant Reuse, Subscription Reuse, Resource Group Reuse, No Reuse), qui empêche la prise de contrôle de sous-domaine, ou `<nom>.azurecr.io` avec **Unsecure**. Les images s'adressent sous la forme `<serveur de connexion>/<référentiel>:<balise>` ; les exemples ci-dessous utilisent un registre sans hachage DNL.

| Niveau | Fonctionnalités |
| --- | --- |
| Basic | Entrée de gamme : mêmes fonctions de base, stockage et débit les plus faibles |
| Standard | Plus de stockage et de débit ; convient à la plupart des besoins de production |
| **Premium** | Limites les plus hautes, plus la **géoréplication**, les **points de terminaison privés** (Private Link), les clés gérées par le client, la stratégie de rétention des manifestes sans balise |

Le niveau se change à tout moment (les géoréplications doivent être supprimées avant de descendre depuis Premium). La **redondance de zone** n'est pas une fonctionnalité Premium : elle est activée par défaut dans tous les niveaux, dans les régions qui prennent en charge les zones de disponibilité. Docker Content Trust (Premium) est en cours de retrait : il ne peut plus être activé sur un nouveau registre depuis le 31 mai 2026 et il est supprimé le 31 mars 2028 (Microsoft oriente vers le projet Notary).

**Authentification :**

| Méthode | Usage |
| --- | --- |
| Identité Microsoft Entra (`az acr login`) | Développeurs |
| **Identité managée** ou principal de service avec un rôle | Services qui tirent ou poussent des images : ACI, Container Apps, AKS, pipelines |
| **Utilisateur administrateur** | Compte unique avec deux mots de passe régénérables, **désactivé par défaut**, tous les droits de push et de pull, impossible à restreindre. Pour les tests seulement |

Rôles : **AcrPull** (pull), **AcrPush** (pull et push), **AcrDelete** (supprimer des artefacts) ; Contributor et Owner gèrent le registre lui-même.

```bash
az acr create -g RG1 -n crcontoso --sku Standard
az acr login -n crcontoso
docker tag web:1.0 crcontoso.azurecr.io/web:1.0
docker push crcontoso.azurecr.io/web:1.0

# Build in Azure without a local Docker engine (ACR Tasks quick task)
az acr build --registry crcontoso --image web:1.0 .
# Copy an image from another registry without pulling it locally
az acr import -n crcontoso --source docker.io/library/nginx:latest --image nginx:latest
```

**ACR Tasks** génère les images dans Azure : tâches rapides (`az acr build`), tâches déclenchées par un commit de code source, par la **mise à jour d'une image de base**, ou selon une **planification** (`az acr task create --schedule "0 2 * * *"`, expression cron en UTC).

**Géoréplication** (Premium) : un seul registre, un seul serveur de connexion, des réplicas dans plusieurs régions ; un push est répliqué partout et un pull est servi par le réplica le plus proche. Chaque réplica est facturé.

**Réseau** : avec un point de terminaison privé, la zone `privatelink.azurecr.io` résout le registre vers ses adresses privées ; l'accès réseau public peut alors être désactivé.

<!-- section: aci | objectives: 3.3.2 -->
## Azure Container Instances

L'unité de déploiement est le **groupe de conteneurs** : un ou plusieurs conteneurs sur le même hôte, qui partagent cycle de vie, adresse IP, ports et volumes (comme un pod Kubernetes). Les conteneurs d'un groupe se parlent sur `localhost`.

```bash
az container create -g RG1 -n aci-job1 --image crcontoso.azurecr.io/job:1.0 \
  --os-type Linux --cpu 1 --memory 1.5 --restart-policy OnFailure \
  --assign-identity <identity ID> --acr-identity <identity ID> \
  --environment-variables MODE=batch --secure-environment-variables KEY=<secret> \
  --azure-file-volume-account-name stor1 --azure-file-volume-account-key <key> \
  --azure-file-volume-share-name share1 --azure-file-volume-mount-path /mnt/data

az container show -g RG1 -n aci-job1 --query instanceView.state
az container logs -g RG1 -n aci-job1
az container exec -g RG1 -n aci-job1 --exec-command "/bin/sh"
```

| Réglage | Valeurs et règles |
| --- | --- |
| Type de système | Linux ou Windows, fixé pour le groupe |
| Processeur et mémoire | Demandés par conteneur ; le groupe reçoit la somme |
| **Stratégie de redémarrage** | **Always** (par défaut ; services de longue durée), **OnFailure** (redémarre seulement sur un code de sortie non nul ; tâches à exécution unique), **Never** |
| Réseau | Adresse IP publique avec une étiquette de nom DNS facultative (`<étiquette>.<région>.azurecontainer.io`), ou déploiement dans un **sous-réseau** d'un réseau virtuel (IP privée, sous-réseau délégué à ACI) |
| Stockage | Les conteneurs sont sans état. Volumes : **partage de fichiers Azure**, `emptyDir`, secret, `gitRepo` |
| Récupération de l'image | Registre public, informations d'identification du registre, ou identité managée avec AcrPull |

Règles sur lesquelles s'appuient les questions :

- Avec **OnFailure** ou **Never**, un conteneur qui se termine avec succès s'arrête ; le groupe passe à l'état *Terminated* et **la facturation s'arrête**.
- **Les groupes multiconteneurs et les volumes Azure Files sont réservés aux conteneurs Linux.** Un groupe Windows exécute un seul conteneur.
- Les groupes multiconteneurs se déploient avec un **fichier YAML** ou un modèle ARM/Bicep, pas avec de simples paramètres de `az container create`.
- Les variables d'environnement sécurisées ne sont pas affichées dans les propriétés du groupe.

<!-- section: container-apps | objectives: 3.3.3 -->
## Azure Container Apps

| Concept | Sens |
| --- | --- |
| **Environnement** | Limite sécurisée autour d'un ensemble d'applications : même réseau virtuel, même destination des journaux (espace de travail Log Analytics). Les applications à isoler vont dans des environnements différents. Les applications d'un même environnement peuvent s'appeler entre elles, y compris par Dapr |
| **Application conteneur** | L'application : un ou plusieurs conteneurs, sa configuration, ses règles de mise à l'échelle |
| **Révision** | Un instantané immuable d'une version de l'application |
| **Réplica** | Une instance en cours d'exécution d'une révision |

```bash
az containerapp env create -g RG1 -n cae-prod --location westeurope
az containerapp create -g RG1 -n ca-web --environment cae-prod \
  --image crcontoso.azurecr.io/web:1.0 --registry-server crcontoso.azurecr.io \
  --registry-identity system --ingress external --target-port 8080 \
  --min-replicas 0 --max-replicas 5
```

L'**entrée** (ingress) décide qui peut atteindre l'application :

| Entrée | Accessible depuis |
| --- | --- |
| Désactivée | Personne (traitements d'arrière-plan) |
| **Interne** (limitée à l'environnement) | Les autres applications du même environnement seulement |
| **Externe** | L'adresse IP entrante de l'environnement : internet pour un environnement externe, le réseau virtuel seulement pour un **environnement interne** |

Le **port cible** est le port sur lequel le conteneur écoute.

**Révisions :**

- Les changements de **portée révision** (la section `template` : image, variables d'environnement, ressources, règles de mise à l'échelle) créent une **nouvelle révision**.
- Les changements de **portée application** (la section `configuration` : secrets, entrée, mode de révision, fractionnement du trafic, informations d'identification du registre) s'appliquent à toutes les révisions et n'en créent pas. Après avoir changé un secret, redémarrez la révision ou déployez-en une nouvelle pour qu'il soit pris en compte.
- **Mode révision unique** (par défaut) : la nouvelle révision remplace l'ancienne. **Mode révisions multiples** : plusieurs révisions sont actives et le trafic est réparti par pondération (bleu-vert, tests A/B).

```bash
az containerapp revision set-mode -g RG1 -n ca-web --mode multiple
az containerapp ingress traffic set -g RG1 -n ca-web \
  --revision-weight ca-web--v1=80 ca-web--v2=20
```

Les secrets se définissent au niveau de l'application et sont référencés par des variables d'environnement (`secretref:`) ; une identité managée tire les images d'ACR avec AcrPull.

<!-- section: container-scaling | objectives: 3.3.4 -->
## Dimensionner et mettre à l'échelle les conteneurs

**Azure Container Instances**

- Le processeur et la mémoire sont fixés à la création. Les changer, comme le type de système ou la stratégie de redémarrage, revient à **supprimer et recréer** le groupe de conteneurs (son adresse IP peut changer).
- Il n'y a pas de mise à l'échelle automatique : pour absorber plus de charge, déployez plus de groupes de conteneurs, ou passez à Container Apps.

**Azure Container Apps**

- Ressources par conteneur sur le profil Consommation : de 0,25 vCPU / 0,5 Gi à 4 vCPU / 8 Gi, toujours **2 Gi de mémoire par vCPU**. Le total de tous les conteneurs de l'application doit correspondre à une combinaison prise en charge.
- Une révision évolue **entre `minReplicas` et `maxReplicas`** selon ses règles de mise à l'échelle :

| Règle de mise à l'échelle | Déclencheur | Mise à l'échelle à zéro |
| --- | --- | --- |
| **HTTP** | Requêtes HTTP simultanées par réplica (10 par défaut) | Oui |
| TCP | Connexions TCP simultanées | Oui |
| **Personnalisée** (scalers KEDA) | Événements : longueur d'une file Azure Service Bus, Event Hubs, file d'attente de stockage... | Oui |
| Processeur ou mémoire | Taux d'utilisation | **Non** |

- Sans aucune règle, une règle HTTP par défaut s'applique, de 0 à 10 réplicas.
- Avec `minReplicas = 0`, l'application **descend à zéro** quand elle est inactive et ne coûte rien ; la première requête attend alors le démarrage d'un réplica. Fixez `minReplicas` à 1 ou plus pour éviter ce démarrage à froid.
- Une application sans entrée et sans règle personnalisée qui descend à zéro n'est jamais réveillée : donnez-lui une règle fondée sur des événements ou un `minReplicas` d'au moins 1.
- Changer les règles de mise à l'échelle crée une nouvelle révision.

```bash
az containerapp update -g RG1 -n ca-worker --min-replicas 0 --max-replicas 10 \
  --scale-rule-name orders --scale-rule-type azure-servicebus \
  --scale-rule-metadata queueName=orders messageCount=20 \
  --scale-rule-auth connection=sb-connection
```

<!-- section: key-points -->
## Points clés

- ACR Premium uniquement : géoréplication et points de terminaison privés. Utilisateur administrateur désactivé par défaut ; préférez AcrPull ou AcrPush sur une identité.
- `az acr build` génère dans Azure ; ACR Tasks se déclenche sur commit, mise à jour d'image de base ou planification.
- ACI : groupe de conteneurs ; stratégie de redémarrage Always, OnFailure, Never ; multiconteneur et volumes Azure Files sous Linux seulement ; redimensionner = recréer ; pas de mise à l'échelle automatique.
- Container Apps : environnement > application > révision > réplica. Les changements du template créent une révision ; ceux de la configuration, non.
- Entrée externe ou interne ; le fractionnement du trafic exige le mode révisions multiples.
- Règles HTTP, TCP, personnalisées (KEDA) ; descente à zéro avec `minReplicas = 0`, sauf avec les règles processeur ou mémoire.
