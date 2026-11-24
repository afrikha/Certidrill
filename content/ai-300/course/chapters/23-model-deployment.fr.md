Un modèle inscrit sert des prédictions à travers un **point de terminaison** (endpoint) : un URI stable et une authentification devant un ou plusieurs **déploiements** qui portent le modèle, son code, son environnement et son calcul. Les points de terminaison en ligne répondent à chaque requête en temps réel ; les points de terminaison par lots exécutent un travail de scoring asynchrone sur des fichiers. Les questions d'examen demandent quel type de point de terminaison convient à une charge de travail, quelle clé YAML ou quel indicateur CLI manque, ce que signifie un code d'erreur et comment basculer le trafic vers une nouvelle version du modèle sans interruption.

<!-- section: endpoint-types | objectives: 2.3.1 -->
## Choisir un type de point de terminaison

| Exigence | Réponse |
| --- | --- |
| Réponse à faible latence par requête (application web, API) | **Point de terminaison en ligne** |
| Scorer de grands volumes de fichiers selon une planification ou à la demande ; résultats écrits dans le stockage | **Point de terminaison par lots** |
| Aucune infrastructure à gérer, isolement de réseau managé, coût par déploiement | Point de terminaison en ligne **managé** |
| Cluster Kubernetes existant (AKS ou compatible Azure Arc) géré par votre équipe | Point de terminaison en ligne **Kubernetes** |
| Tester un nouveau modèle en parallèle avec des copies du trafic réel | Point de terminaison en ligne managé (la mise en miroir n'est pas prise en charge sur Kubernetes) |

| | Point de terminaison en ligne managé | Point de terminaison en ligne Kubernetes |
| --- | --- | --- |
| Approvisionnement, mise à jour, suppression des nœuds | Gérés par Azure | Votre responsabilité |
| Réseau virtuel | Isolement de réseau managé | Votre responsabilité |
| Trafic mis en miroir | Pris en charge | Non pris en charge |
| Vue des coûts | Par point de terminaison et déploiement | Par cluster |
| Authentification | `key`, `aml_token`, `aad_token` | `key`, `aml_token` |

Authentification des points de terminaison en ligne (`auth_mode` dans le YAML du point de terminaison) :

| Mode | Durée de vie | Remarques |
| --- | --- | --- |
| `key` | Les clés n'expirent pas ; faites-les tourner (principale et secondaire) | Le plus simple pour un client externe |
| `aml_token` | Courte ; renouvelez après `refreshAfterTimeUtc` | Obtenu avec `az ml online-endpoint get-credentials` |
| `aad_token` | Durée de vie des jetons Microsoft Entra ID | **Points de terminaison en ligne managés uniquement** ; l'appelant a besoin de `Microsoft.MachineLearningServices/workspaces/onlineEndpoints/score/action` (inclus dans AzureML Data Scientist) |

Les **points de terminaison par lots** n'acceptent que l'authentification Microsoft Entra : un utilisateur, un principal de service ou une identité managée présente un jeton, et le travail par lots s'exécute sous cette identité, qui a besoin d'autorisations pour créer des travaux et lire ou écrire les données.

> **Piège d'examen.** « Aucune clé à stocker ni à faire tourner, accès contrôlé par Azure RBAC » sur un point de terminaison en ligne signifie `auth_mode: aad_token` et un rôle avec `score/action` pour l'appelant. Cela fonctionne sur les points de terminaison en ligne managés, pas sur les points de terminaison en ligne Kubernetes.

<!-- section: online-deployment | objectives: 2.3.1 -->
## Déployer sur un point de terminaison en ligne managé

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineEndpoint.schema.json
name: churn-api
auth_mode: aad_token
```

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineDeployment.schema.json
name: blue
endpoint_name: churn-api
model: azureml:churn-classifier:4
code_configuration:
  code: ./onlinescoring
  scoring_script: score.py
environment: azureml:churn-inference-env:2
instance_type: Standard_DS3_v2
instance_count: 3
app_insights_enabled: true
request_settings:
  request_timeout_ms: 10000
  max_concurrent_requests_per_instance: 2
```

```bash
az ml online-endpoint create --file endpoint.yml
az ml online-deployment create --file blue-deployment.yml --all-traffic
```

- Le **script de scoring** a `init()` (s'exécute une fois quand le conteneur démarre ou est mis à jour : charger le modèle) et `run()` (s'exécute à chaque requête).
- Les **modèles MLflow** utilisent le déploiement sans code : omettez `code_configuration` et `environment` ; un environnement organisé et un script de scoring généré sont utilisés, et la signature produit le swagger.
- `instance_count` : au moins **3** pour la haute disponibilité. Le quota est réservé selon `ceil(1.2 × instances) × cœurs de la SKU` : les 20 % supplémentaires sont gardés pour les mises à niveau.
- `request_settings` : `request_timeout_ms` vaut 5 000 par défaut (180 000 au maximum) ; `max_concurrent_requests_per_instance` vaut 1 par défaut. Avec le serveur d'inférence Azure Machine Learning ou les images d'inférence, une valeur supérieure à 1 demande aussi que le modèle gère les requêtes simultanées : passez `WORKER_COUNT` comme variable d'environnement. `max_queue_wait_ms` est déprécié : augmentez `request_timeout_ms` pour couvrir les délais d'attente en file.
- Sondes (`liveness_probe`, `readiness_probe`) : `initial_delay` 10 s, `period` 10 s, `timeout` 2 s, `failure_threshold` 30 par défaut. Augmentez `initial_delay` pour un modèle lent à charger.
- `egress_public_network_access: disabled` (méthode d'isolement réseau héritée) limite le déploiement aux ressources de l'espace de travail sécurisées dans le réseau virtuel et télécharge le modèle, le code et les images par des points de terminaison privés ; il ne peut pas être modifié après la création. Microsoft recommande fortement un **réseau virtuel managé d'espace de travail** à la place ; avec celui-ci, ne définissez pas cet indicateur. Le scoring entrant passe par le point de terminaison privé de l'espace de travail.
- La **mise à l'échelle automatique** utilise des règles de mise à l'échelle automatique Azure Monitor sur le déploiement : basées sur une métrique (CPU au-dessus de 70 %), sur une planification (heures ouvrées), ou les deux.

> **Conseil d'examen.** `--all-traffic` sur `az ml online-deployment create` envoie 100 % du trafic du point de terminaison au nouveau déploiement. Sans cet indicateur, un nouveau déploiement reçoit 0 % : le point de terminaison continue de servir par les déploiements existants.

<!-- section: batch-deployment | objectives: 2.3.1 -->
## Déployer sur un point de terminaison par lots

Les points de terminaison par lots s'exécutent sur des **clusters de calcul** (ou des clusters Kubernetes attachés avec la CLI ou le SDK). Un cluster avec `--min-instances 0` ne coûte rien tant qu'aucun travail n'est soumis. Un déploiement est celui **par défaut** : il s'exécute quand le point de terminaison est appelé sans nom de déploiement.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/modelBatchDeployment.schema.json
name: churn-batch-v4
endpoint_name: churn-batch
type: model
model: azureml:churn-classifier:4
compute: azureml:batch-cluster
resources:
  instance_count: 2
settings:
  max_concurrency_per_instance: 2
  mini_batch_size: 10
  output_action: append_row
  output_file_name: predictions.csv
  retry_settings:
    max_retries: 3
    timeout: 30
  error_threshold: -1
  logging_level: info
```

| Paramètre | Par défaut | Sens |
| --- | --- | --- |
| `mini_batch_size` | 10 | **Fichiers** passés à chaque appel de `run()` (le travail est réparti au niveau des fichiers) |
| `max_concurrency_per_instance` | 1 | Processus de scoring parallèles par nœud |
| `output_action` | `append_row` | `append_row` écrit les prédictions dans `output_file_name` ; `summary_only` laisse le script de scoring écrire ses propres sorties |
| `retry_settings` | 3 nouvelles tentatives, 30 s | Nouvelles tentatives et délai d'expiration par mini-lot |
| `error_threshold` | -1 | Fichiers en échec tolérés avant l'échec du travail ; -1 ignore les échecs |

```bash
az ml batch-endpoint create --file endpoint.yml --name churn-batch
az ml batch-deployment create --file deployment.yml --endpoint-name churn-batch --set-default
az ml batch-endpoint invoke --name churn-batch \
  --input azureml://datastores/workspaceblobstore/paths/churn/2026-11/ --input-type uri_folder \
  --output-path azureml://datastores/workspaceblobstore/paths/churn-scores/ \
  --set output_file_name=predictions_2026_11.csv
az ml batch-endpoint update --name churn-batch --set defaults.deployment_name=churn-batch-v5
```

- Les modèles MLflow n'ont besoin ni de script de scoring ni d'environnement ; les modèles personnalisés demandent `code_configuration` avec un script de scoring par lots et un `environment`.
- Entrées : fichiers dans Stockage Azure, dossiers, ressources de données inscrites. Les sorties ne vont que dans des magasins de données basés sur des objets blob, par défaut le magasin blob de l'espace de travail dans un dossier au nom du travail. Un fichier de sortie existant fait **échouer** le travail : utilisez un nom de fichier unique.
- À chaque appel, vous pouvez remplacer `--mini-batch-size`, `--instance-count`, `--deployment-name`.
- `type: pipeline` déploie un **composant de pipeline** (par exemple un prétraitement puis un scoring) derrière le même point de terminaison.

> **Piège d'examen.** Un point de terminaison par lots ne renvoie pas les prédictions dans la réponse HTTP : l'appeler crée un travail et renvoie son nom. Les résultats sont des fichiers dans un magasin de données une fois le travail terminé.

<!-- section: test-troubleshoot | objectives: 2.3.2 -->
## Tester et dépanner les points de terminaison

Testez un déploiement précis avant qu'il ne reçoive du trafic :

```bash
az ml online-endpoint invoke --name churn-api --deployment-name green \
  --request-file sample-request.json
az ml online-endpoint get-credentials --name churn-api
az ml online-deployment get-logs --name green --endpoint-name churn-api --lines 100
az ml online-deployment get-logs --name green --endpoint-name churn-api --container storage-initializer
```

Les clients REST atteignent directement un déploiement avec l'en-tête `azureml-model-deployment: green`, qui contourne les règles de trafic.

| Option de débogage | Usage |
| --- | --- |
| Serveur HTTP d'inférence Azure Machine Learning (`azureml-inference-server-http`) | Exécute `score.py` en local sans Docker : la boucle la plus rapide pour les erreurs de script |
| Point de terminaison local : `az ml online-deployment create ... --local` | Construit et exécute le conteneur dans Docker en local. CLI et SDK uniquement ; un déploiement par point de terminaison ; ni règles de trafic, ni authentification, ni sondes |
| `get-logs` | Sortie console du serveur d'inférence d'un déploiement ; `--container storage-initializer` montre si le modèle et le code ont été téléchargés |
| Tables Log Analytics | Journaux des requêtes, de la console et des événements de conteneur (voir le chapitre sur la surveillance) |

| Erreur de déploiement | Cause typique | Correction |
| --- | --- | --- |
| `ImageBuildFailure` | Dépendances conda impossibles à résoudre, autorisation ACR, délai de construction dépassé | Lire le journal de construction, épingler les versions des packages, `az ml workspace sync-keys` pour les clés ACR |
| `OutOfQuota` | Pas assez de cœurs, ou pas de capacité pour la taille de machine virtuelle dans la région | Supprimer les déploiements inutilisés, demander du quota, choisir une autre SKU ou région |
| `BadArgument` | Modèle dans un autre espace de travail, image ou modèle impossible à télécharger | Inscrire le modèle dans le même espace de travail ; l'identité a besoin de Storage Blob Data Reader et AcrPull |
| `ResourceNotReady` | `score.py` plante dans `init()`, package manquant, sonde en échec au-delà de son seuil | `get-logs`, tester en local, augmenter les délais des sondes ou prendre une SKU plus grande |
| `ResourceNotFound` | Nom ou chemin erroné ; registre privé | Vérifier les références ; accorder AcrPull à l'identité du point de terminaison |
| `OperationCanceled` | Une autre opération était prioritaire ou détenait un verrou | Réessayer après une minute |

| Code de scoring | Sens sur un point de terminaison en ligne managé |
| --- | --- |
| 401 | Clé ou jeton absent, expiré ou erroné, ou pas d'autorisation `score/action` |
| 404 | Aucun déploiement avec un poids de trafic positif |
| 408 | La requête a dépassé `request_timeout_ms` |
| 424 | Le conteneur du modèle a renvoyé une réponse autre que 200 : lisez `ms-azureml-model-error-statuscode` et `ms-azureml-model-error-reason` |
| 429 | Trop de requêtes en attente (au plus `2 × max_concurrent_requests_per_instance × instance_count` sont traitées en parallèle ; l'excédent est rejeté ; vérifiez que `WORKER_COUNT` est passé) ou requêtes par seconde au-delà des limites du point de terminaison : temporisez, augmentez le nombre d'instances |
| 500 | Défaillance de l'infrastructure de la plateforme |

> **Piège d'examen.** Un 404 juste après un déploiement réussi signifie généralement que le nouveau déploiement a 0 % de trafic et qu'aucun autre n'en a : définissez le trafic ou appelez avec `--deployment-name`. Un 424 est l'erreur du modèle lui-même, pas celle de la plateforme.

<!-- section: safe-rollout | objectives: 2.3.3 -->
## Déploiement progressif et restauration sécurisée

Le modèle **bleu-vert** garde le modèle actuel (`blue`) en service pendant qu'un nouveau déploiement (`green`) est créé sous le même point de terminaison, testé, puis reçoit du trafic par paliers :

```bash
az ml online-deployment create --name green --endpoint-name churn-api --file green-deployment.yml
az ml online-endpoint invoke --name churn-api --deployment-name green --request-file sample-request.json
az ml online-endpoint update --name churn-api --mirror-traffic "green=10"
az ml online-deployment get-logs --name green --endpoint-name churn-api
az ml online-endpoint update --name churn-api --mirror-traffic "green=0"
az ml online-endpoint update --name churn-api --traffic "blue=90 green=10"
az ml online-endpoint update --name churn-api --traffic "blue=0 green=100"
az ml online-deployment delete --name blue --endpoint-name churn-api --yes --no-wait
```

| Étape | Utilisateurs réels concernés | Objectif |
| --- | --- | --- |
| Créer `green` avec 0 % de trafic | Aucun | Le déploiement réussit et il est sain |
| Appeler `green` directement | Aucun | Test fonctionnel du nouveau modèle |
| Mettre en miroir un pourcentage vers `green` | Aucun : les clients reçoivent toujours les réponses de `blue` | Valider la latence et les erreurs sur du trafic réel ; les métriques et journaux de `green` sont enregistrés |
| Répartir le trafic réel (`blue=90 green=10`) | 10 % des requêtes | Canari : comparer les métriques sur de vraies réponses |
| `blue=0 green=100`, puis supprimer `blue` | Tous | Terminer le déploiement |

Règles de mise en miroir : points de terminaison en ligne managés uniquement ; un seul déploiement en miroir par point de terminaison ; **50 %** au maximum ; un déploiement reçoit soit du trafic réel, soit du trafic en miroir, pas les deux ; les requêtes envoyées à un déploiement nommé ne sont pas mises en miroir. Les pourcentages de trafic réel doivent totaliser 100 % (ou 0 % pour désactiver le trafic).

La **restauration** (rollback) est un changement de trafic, pas un redéploiement : tant que `blue` existe, `--traffic "blue=100 green=0"` rétablit immédiatement le modèle précédent. Gardez l'ancien déploiement (réduit avec `az ml online-deployment update --name blue --set instance_count=1` si besoin) jusqu'à ce que le nouveau ait fait ses preuves, et gardez la version précédente du modèle inscrite. Supprimer un déploiement n'affecte pas les autres.

> **Piège d'examen.** La mise en miroir teste le nouveau déploiement **sans** impact sur les réponses ; une répartition 90/10 expose 10 % des utilisateurs au nouveau modèle. « Valider avec le trafic de production sans affecter les utilisateurs » désigne la mise en miroir ; « exposer d'abord une petite part des utilisateurs » désigne une répartition du trafic.

<!-- section: key-points -->
## Points clés

- En ligne pour la latence par requête, par lots pour le scoring asynchrone de fichiers vers le stockage ; en ligne managé sauf si l'équipe exploite son propre Kubernetes.
- `aad_token` ne fonctionne que sur les points de terminaison en ligne managés ; les points de terminaison par lots n'utilisent que des jetons Microsoft Entra.
- Les modèles MLflow se déploient sans script de scoring ni environnement, en ligne comme par lots.
- Les nouveaux déploiements en ligne reçoivent 0 % de trafic sauf avec `--all-traffic` ; testez-les avec `--deployment-name` ou l'en-tête `azureml-model-deployment`.
- Par lots : `mini_batch_size` compte des fichiers, `error_threshold -1` ignore les échecs, les sorties doivent utiliser un nom de fichier unique.
- Déboguez avec le serveur HTTP d'inférence, puis `--local`, puis `get-logs` ; 424 = erreur du modèle, 429 = surcharge, 404 = aucun trafic.
- Bleu-vert : miroir (50 % max, un déploiement) puis répartition, gardez blue pour une restauration instantanée par le trafic.
