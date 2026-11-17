Quand une solution d'IA comporte plusieurs services, des workers en arrière-plan et une charge qui suit une file d'attente, elle a besoin d'un orchestrateur. Azure Container Apps apporte les révisions, la répartition du trafic et la mise à l'échelle pilotée par les événements sans gérer Kubernetes ; Azure Kubernetes Service (AKS) apporte l'API Kubernetes complète, pilotée par des fichiers manifeste. Les questions demandent la commande, la propriété YAML ou l'étape de diagnostic : quelle modification crée une révision, quelle règle de mise à l'échelle réveille un worker, quelle commande `kubectl` explique un pod qui ne démarre pas.

<!-- section: aca-deploy-revisions | objectives: 1.2.1 -->
## Déployer sur Azure Container Apps : environnements et révisions

| Concept | Signification |
| --- | --- |
| Environnement | Limite sécurisée autour d'un groupe d'applications : même réseau virtuel, même destination des journaux (espace de travail Log Analytics par défaut), même configuration Dapr |
| Application conteneur | Un ou plusieurs conteneurs, leur configuration (entrée, secrets, registres) et leurs règles de mise à l'échelle |
| Révision | Instantané immuable du modèle (template) de l'application ; nommée `<app>--<suffix>` |
| Réplica | Une instance en cours d'exécution d'une révision |

Il existe deux types d'environnements : **profils de charge de travail** (le type par défaut ; profil Consumption facturé à l'usage avec mise à l'échelle jusqu'à zéro, plus des profils Dedicated facultatifs avec du matériel réservé) et **Consumption uniquement** (hérité). Placez dans des environnements distincts les applications qui ne doivent jamais partager de ressources de calcul, ou le test et la production ; placez dans le même environnement les applications qui s'appellent entre elles, partagent un réseau virtuel ou un espace de travail de journaux.

```bash
az containerapp env create --resource-group rg-rag --name cae-rag \
  --location westeurope --enable-workload-profiles

az containerapp create --resource-group rg-rag --name ca-rag-api \
  --environment cae-rag \
  --image crcontoso.azurecr.io/rag/api:1.4.0 \
  --registry-server crcontoso.azurecr.io --registry-identity system \
  --ingress external --target-port 8000 \
  --secrets "openai-key=keyvaultref:https://kv-rag.vault.azure.net/secrets/openai-key,identityref:system" \
  --env-vars SEARCH_ENDPOINT=https://srch-rag.search.windows.net OPENAI_API_KEY=secretref:openai-key \
  --revision-suffix v1
```

| Option | Règle |
| --- | --- |
| `--registry-identity system` | Tire l'image d'ACR avec l'identité managée de l'application (AcrPull) ; aucun mot de passe de registre |
| `--secrets name=value` | Secret stocké dans l'application ; les noms de secrets sont limités à 20 caractères |
| `--secrets name=keyvaultref:<uri>,identityref:<id>` | Secret lu dans Key Vault par une identité managée (`system` ou l'ID de ressource d'une identité affectée par l'utilisateur) qui détient **Key Vault Secrets User** |
| `--env-vars NAME=secretref:<secret>` | Variable d'environnement dont la valeur vient d'un secret |
| `--ingress external` / `internal` | Joignable par l'adresse IP entrante de l'environnement / uniquement depuis les applications du même environnement |
| `--target-port` | Port d'écoute du conteneur |

Les secrets peuvent aussi être montés comme fichiers : un volume de type `Secret` écrit un fichier par secret, nommé d'après le secret. Une référence Key Vault sans version suit la rotation : les nouvelles versions sont prises en compte sous 30 minutes et les révisions actives qui utilisent le secret dans une variable d'environnement redémarrent automatiquement.

**Ce qui crée une révision :**

| Modification | Étendue | Nouvelle révision ? |
| --- | --- | --- |
| Image, commande du conteneur, variables d'environnement, processeur et mémoire, sondes, volumes, suffixe de révision, **règles de mise à l'échelle** (`properties.template`) | Révision | Oui |
| Valeurs des secrets, activation de l'entrée, pondérations du trafic, étiquettes, mode de révision, informations d'identification du registre, paramètres Dapr (`properties.configuration`) | Application | Non, appliquée à toutes les révisions |

> **Piège d'examen.** Mettre à jour un secret ne crée pas de révision et n'atteint pas les réplicas en cours d'exécution : redémarrez la révision (`az containerapp revision restart`) ou déployez-en une nouvelle. Avant de supprimer un secret, déployez une révision qui ne le référence plus.

**Modes de révision :**

| Mode | Comportement | Usage type |
| --- | --- | --- |
| Single (par défaut) | La nouvelle révision reçoit tout le trafic dès qu'elle est prête, puis l'ancienne est déprovisionnée ; si la mise à jour échoue, le trafic reste sur l'ancienne révision | Mise à jour progressive simple, sans interruption |
| Multiple | Plusieurs révisions actives ; trafic réparti par pondération ; vous choisissez quand désactiver | Bleu-vert, canary, test A/B d'un nouveau modèle ou d'un nouveau prompt |
| Étiquettes (préversion) | Étiquettes nommées (dev, staging, prod) déplacées d'une révision à l'autre | URL stables par étape, retour arrière simple |

En mode Single, l'ancienne révision reste active jusqu'à ce que la nouvelle soit provisionnée, ait atteint le nombre de réplicas précédent et ait passé ses sondes de démarrage et de disponibilité.

```bash
az containerapp revision set-mode --resource-group rg-rag --name ca-rag-api --mode multiple
az containerapp update --resource-group rg-rag --name ca-rag-api \
  --image crcontoso.azurecr.io/rag/api:1.5.0 --revision-suffix v2
az containerapp ingress traffic set --resource-group rg-rag --name ca-rag-api \
  --revision-weight ca-rag-api--v1=90 ca-rag-api--v2=10
az containerapp revision label add --resource-group rg-rag --name ca-rag-api \
  --label canary --revision ca-rag-api--v2
az containerapp revision deactivate --resource-group rg-rag --name ca-rag-api \
  --revision ca-rag-api--v1
az containerapp revision list --resource-group rg-rag --name ca-rag-api --output table
```

Une étiquette reçoit sa propre URL, qui reste la même quand l'étiquette passe à une autre révision : les testeurs atteignent ainsi la nouvelle révision avec 0 % du trafic de production. Les révisions inactives ne sont pas facturées ; par défaut, jusqu'à 100 révisions inactives sont conservées et les plus anciennes sont purgées au-delà.

> **Piège d'examen.** Les pondérations de trafic exigent le mode de révision **Multiple**. En mode Single, `ingress traffic set` ne peut pas laisser 90 % sur l'ancienne révision : la nouvelle révision prend tout dès qu'elle est prête.

<!-- section: keda-scaling | objectives: 1.2.2 -->
## Mise à l'échelle pilotée par les événements avec KEDA dans Container Apps

Chaque révision évolue entre `minReplicas` (0 par défaut, 1 000 au maximum) et `maxReplicas` (10 par défaut, de 1 à 1 000). Sans aucune règle, une règle HTTP s'applique, de 0 à 10 réplicas.

| Règle | Métrique | Propriété / option CLI |
| --- | --- | --- |
| HTTP | Requêtes HTTP simultanées par réplica, mesurées sur 15 secondes | `concurrentRequests` (10 par défaut) / `--scale-rule-http-concurrency` |
| TCP | Connexions TCP simultanées | `concurrentConnections` (10 par défaut) / `--scale-rule-tcp-concurrency` |
| Personnalisée | Tout scaler KEDA basé sur ScaledObject : Azure Service Bus, Event Hubs, files d'attente Stockage, Kafka, Redis, processeur, mémoire... | `custom.type`, `custom.metadata`, `custom.auth` ou `custom.identity` |

Une règle personnalisée est le déclencheur KEDA recopié dans l'application : `type` et `metadata` gardent les noms KEDA, et chaque `secretTargetRef` du `TriggerAuthentication` KEDA devient une entrée `auth` qui pointe vers un secret de l'application.

```yaml
properties:
  configuration:
    activeRevisionsMode: Single
    secrets:
      - name: sb-connection
        value: <service-bus-connection-string>
  template:
    scale:
      minReplicas: 0
      maxReplicas: 30
      rules:
        - name: embed-queue
          custom:
            type: azure-servicebus
            metadata:
              queueName: embed-requests
              namespace: sb-rag
              messageCount: "20"
            auth:
              - secretRef: sb-connection
                triggerParameter: connection
```

La même règle sans secret, avec une identité managée qui détient un rôle de données sur la file (pris en charge pour les règles Stockage File d'attente Azure, Service Bus et Event Hubs ; non configurable dans le portail) :

```bash
az containerapp update --resource-group rg-rag --name ca-embed-worker \
  --min-replicas 0 --max-replicas 30 \
  --scale-rule-name embed-queue --scale-rule-type azure-servicebus \
  --scale-rule-metadata "queueName=embed-requests" "namespace=sb-rag" "messageCount=20" \
  --scale-rule-identity system
```

**Comportement du scaler :**

| Comportement | Valeur |
| --- | --- |
| Intervalle d'interrogation (règles personnalisées) | 30 secondes |
| Période de refroidissement avant de passer de 1 réplica à 0 | 300 secondes |
| Fenêtre de stabilisation à la réduction | 300 secondes ; à l'augmentation : aucune |
| Paliers d'augmentation | 1, 4, 8, 16, 32... jusqu'à `maxReplicas` |
| Cible | `desiredReplicas = ceil(metric / target)` : 200 messages avec `messageCount` 20 = 10 réplicas |
| Plusieurs règles | La mise à l'échelle démarre dès que la condition d'une règle quelconque est remplie |

> **Piège d'examen.** Un worker dont l'**entrée est désactivée**, avec `minReplicas` à 0 et sans règle personnalisée, descend à zéro et ne redémarre jamais : rien ne peut le réveiller. Donnez-lui une règle d'événement (longueur de file) ou un `minReplicas` d'au moins 1.

> **Piège d'examen.** Les règles de mise à l'échelle font partie du modèle : en modifier une crée une nouvelle révision. Les règles d'événement non HTTP exigent `activeRevisionsMode` à `single` ; en mode Multiple, l'ancienne révision garderait ses anciennes règles.

| Exigence | Réponse |
| --- | --- |
| Ne rien payer quand la file est vide | `minReplicas` à 0 avec une règle de file |
| Pas de démarrage à froid pour une API interactive | `minReplicas` à 1 ou plus |
| Jamais plus de 30 appels de modèle en parallèle | `maxReplicas` à 30 (les nombres de réplicas sont des cibles, pas des garanties) |
| Chaque réplica traite au plus 50 requêtes à la fois | Règle HTTP, `concurrentRequests` à 50 |
| Aucune chaîne de connexion dans la règle | `identity` (`--scale-rule-identity`) avec un rôle de données sur la source |
| Une exécution par message, puis arrêt | Travail (job) Container Apps avec un déclencheur d'événement : mêmes règles KEDA, mais les règles HTTP et TCP ne sont pas prises en charge pour les travaux |

<!-- section: aks-manifests | objectives: 1.2.3 -->
## Déployer sur AKS avec des fichiers manifeste

```bash
az aks get-credentials --resource-group rg-rag --name aks-rag
# Grant AcrPull on the registry to the kubelet managed identity of the node pools
az aks update --resource-group rg-rag --name aks-rag --attach-acr crcontoso
```

`--attach-acr` utilise les autorisations de la personne qui l'exécute (Owner ou un autre rôle capable d'attribuer des rôles) et n'est pas pris en charge sur les registres ACR en mode d'autorisations de dépôt ABAC, qui demandent à la place Container Registry Repository Reader.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rag-api-config
  namespace: rag
data:
  SEARCH_INDEX: docs-v3
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rag-api
  namespace: rag
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rag-api
  template:
    metadata:
      labels:
        app: rag-api
    spec:
      containers:
        - name: api
          image: crcontoso.azurecr.io/rag/api:1.4.0
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: rag-api-config
          env:
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: rag-api-secrets
                  key: openai-key
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              memory: 2Gi
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
---
apiVersion: v1
kind: Service
metadata:
  name: rag-api
  namespace: rag
spec:
  type: ClusterIP
  selector:
    app: rag-api
  ports:
    - port: 80
      targetPort: 8000
```

| Objet | Rôle |
| --- | --- |
| Deployment | État souhaité des pods (image, réplicas) ; une modification du modèle de pod déclenche une mise à jour progressive |
| `selector.matchLabels` | Doit correspondre à `template.metadata.labels`, sinon le Deployment est refusé |
| Service | Nom stable et IP virtuelle devant les pods dont les étiquettes correspondent à son `selector` ; `targetPort` = port du conteneur |
| ConfigMap / Secret | Paramètres non sensibles / valeurs sensibles, injectés comme variables d'environnement ou fichiers |
| `requests` / `limits` | Réservation pour la planification / plafond ; un conteneur qui dépasse sa limite de mémoire est tué (`OOMKilled`) |
| `readinessProbe` / `livenessProbe` | Pod retiré du Service tant qu'il n'est pas prêt / conteneur redémarré quand la sonde échoue |

| Type de Service | Joignable depuis |
| --- | --- |
| ClusterIP (par défaut) | L'intérieur du cluster uniquement |
| LoadBalancer | IP publique d'un équilibreur de charge Azure ; IP privée avec l'annotation `service.beta.kubernetes.io/azure-load-balancer-internal: "true"` |
| NodePort | Un port sur chaque nœud ; rarement la réponse |

```bash
kubectl create namespace rag
kubectl create secret generic rag-api-secrets -n rag --from-literal=openai-key=<value>
kubectl apply -f rag-api.yaml
kubectl rollout status deployment/rag-api -n rag
kubectl set image deployment/rag-api api=crcontoso.azurecr.io/rag/api:1.5.0 -n rag
kubectl rollout undo deployment/rag-api -n rag
kubectl scale deployment/rag-api --replicas=5 -n rag
```

> **Piège d'examen.** `kubectl apply` est déclaratif et idempotent : relancez-le avec le fichier modifié pour mettre à jour. `kubectl create` échoue quand l'objet existe déjà. Un Secret Kubernetes est seulement encodé en Base64, pas chiffré dans le manifeste : ne versionnez jamais ses valeurs avec les manifestes.

<!-- section: troubleshoot-containers | objectives: 1.2.4 -->
## Surveiller et dépanner AKS et Container Apps

**AKS : du symptôme à la commande.**

```bash
kubectl get pods -n rag -o wide
kubectl describe pod rag-api-7d9f8-abcde -n rag      # events at the bottom
kubectl logs rag-api-7d9f8-abcde -n rag -c api
kubectl logs rag-api-7d9f8-abcde -n rag --previous   # log of the crashed container
kubectl get events -n rag --sort-by=.metadata.creationTimestamp
kubectl exec -it rag-api-7d9f8-abcde -n rag -- /bin/sh
kubectl get endpoints rag-api -n rag
```

| État du pod | Cause probable | Où regarder |
| --- | --- | --- |
| `ImagePullBackOff` / `ErrImagePull` | Image ou étiquette erronée, ou les nœuds ne peuvent pas s'authentifier auprès du registre (pas d'AcrPull) | Événements de `kubectl describe pod` |
| `CrashLoopBackOff` | Le processus s'arrête au démarrage : variable manquante, secret erroné, exception non gérée | `kubectl logs --previous` |
| `Pending` | Aucun nœud avec assez de processeur ou de mémoire pour les `requests`, ou un sélecteur de nœud non satisfait | `kubectl describe pod` (FailedScheduling) |
| `OOMKilled` (dernier état) | Limite de mémoire trop basse pour le modèle ou le lot | `kubectl describe pod`, augmenter `limits.memory` |
| En cours d'exécution mais pas prêt | La sonde de disponibilité échoue (chemin ou port erroné) | `kubectl describe pod` |

**Connectivité de bout en bout :** dans le cluster, un Service se joint sous la forme `<service>.<namespace>.svc.cluster.local` (ou `<service>` depuis le même espace de noms). Si les appels échouent, vérifiez dans cet ordre : le Service a des **points de terminaison** (une liste vide signifie que son sélecteur ne correspond à aucun pod prêt), `port` et `targetPort` correspondent au port du conteneur, le DNS résout depuis un pod (`kubectl exec ... -- nslookup rag-api.rag`), puis la stratégie réseau et l'équilibreur de charge.

**Container insights** envoie les données du cluster vers Log Analytics :

```kusto
ContainerLogV2
| where PodNamespace == "rag" and PodName startswith "rag-api"
| project TimeGenerated, PodName, ContainerName, LogMessage, LogSource
| order by TimeGenerated desc
```

| Table | Contenu |
| --- | --- |
| `ContainerLogV2` | stdout et stderr des conteneurs |
| `KubeEvents` | Événements Kubernetes (les événements Normal ne sont pas collectés par défaut) |
| `KubePodInventory` | Pods, leur état et leur contrôleur |
| `KubeNodeInventory` | Nœuds et leur état |

**Container Apps :**

```bash
# Platform events: image pull, probe failures, scaling, revision provisioning
az containerapp logs show --resource-group rg-rag --name ca-rag-api --type system --follow
# Application stdout/stderr (default type: console) of one replica and container
az containerapp logs show --resource-group rg-rag --name ca-rag-api \
  --revision ca-rag-api--v2 --replica <replica-name> --container api --type console --tail 50
az containerapp env logs show --resource-group rg-rag --name cae-rag --follow
# Interactive shell in a replica
az containerapp exec --resource-group rg-rag --name ca-rag-api
```

```kusto
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "ca-rag-api"
| project TimeGenerated, RevisionName_s, ContainerName_s, Log_s
| take 100
```

| Table | Contenu |
| --- | --- |
| `ContainerAppConsoleLogs_CL` | Ce que les conteneurs écrivent sur stdout et stderr |
| `ContainerAppSystemLogs_CL` | Événements du service Container Apps pour l'application |
| `ContainerAppHTTPLogs` | Requêtes HTTP (code d'état, durée), envoyées par les paramètres de diagnostic de l'environnement |

| Symptôme | Vérification |
| --- | --- |
| Révision *Provisioned* mais *Degraded*, « 0/1 replicas ready » | Sondes d'intégrité : pour les sondes TCP, le port doit être égal au port cible de l'entrée ; augmentez le délai initial pour les démarrages lents |
| Révision bloquée en *Provisioning* | Sondes, tirage de l'image (pare-feu ou DNS personnalisé qui bloque le registre) |
| 404 « Container App is stopped or does not exist » depuis l'extérieur | Entrée limitée à l'environnement : `az containerapp ingress update --type external` |
| Délais d'attente, l'application ne répond jamais | Port cible différent du port d'écoute de l'application, mauvais transport (HTTP/1 ou HTTP/2) |
| Le flux de journaux indique « This revision is scaled to zero » | Aucun réplica à suivre : envoyez une requête ou passez `minReplicas` à 1 |
| La résolution de noms échoue dans un réseau virtuel à DNS personnalisé | Le serveur DNS doit transférer vers `168.63.129.16` |

> **Conseil d'examen.** Les journaux de console répondent à « qu'a affiché mon code » ; les journaux système répondent à « pourquoi ma révision n'a-t-elle pas démarré ». Une image impossible à tirer ou une sonde qui échoue apparaît dans les journaux système, pas dans les journaux de console.

<!-- section: key-points -->
## Points clés

- Container Apps : environnement > application > révision > réplica. Les modifications du modèle (image, variables d'environnement, règles de mise à l'échelle) créent une révision ; celles de la configuration (secrets, entrée, trafic) non.
- Secrets : `secretref:` dans les variables d'environnement, `keyvaultref:` + `identityref:` pour Key Vault ; redémarrez ou redéployez après une modification de secret.
- La répartition du trafic et les étiquettes exigent le mode de révision Multiple ; le mode Single ne bascule que quand la nouvelle révision est prête.
- Règles de mise à l'échelle : HTTP (10 requêtes simultanées par défaut), TCP, scalers KEDA personnalisés ; `minReplicas` de 0 à 1 000, `maxReplicas` à 10 par défaut ; pas d'entrée + pas de règle personnalisée + minimum 0 = ne se réveille jamais.
- AKS : `--attach-acr` donne AcrPull à l'identité kubelet ; `kubectl apply`, `rollout status`, `rollout undo` ; le sélecteur doit correspondre aux étiquettes des pods.
- Dépannage : `describe` pour les événements, `logs --previous` pour les plantages, points de terminaison pour la connectivité d'un Service ; journaux système de Container Apps pour les échecs de la plateforme, journaux de console pour la sortie du code.
