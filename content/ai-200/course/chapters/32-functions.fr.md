Azure Functions exécute du code piloté par les événements sans serveur à gérer : une requête HTTP, un message Service Bus, un nouvel objet blob ou un minuteur démarre une fonction, et les liaisons lisent et écrivent dans d'autres services sans code client. Dans le **modèle de programmation v2** de Python, les déclencheurs et les liaisons sont des décorateurs dans `function_app.py`. Les questions d'examen montrent une fonction décorée à compléter, un paramètre à ajouter pour qu'une liaison se connecte avec une identité managée, ou un plan d'hébergement et une commande de déploiement à choisir.

<!-- section: programming-model | objectives: 3.2.1 -->
## Le modèle de programmation Python v2

Le modèle v2 est recommandé pour les nouvelles applications Python. Chaque fonction est une méthode globale sans état dans `function_app.py` ou dans un fichier de blueprint, enregistrée sur un objet `FunctionApp` :

```text
project/
├── function_app.py        # app = func.FunctionApp(); decorated functions
├── blueprints/ingest.py   # bp = func.Blueprint(); more functions
├── host.json              # runtime configuration, published
├── local.settings.json    # local app settings and secrets, never published
└── requirements.txt       # dependencies, installed by the remote build
```

| Concept | Règle |
| --- | --- |
| Déclencheur | Exactement **un** par fonction : il définit comment la fonction démarre et fournit en général l'entrée |
| Liaisons d'entrée et de sortie | Facultatives, en nombre quelconque : elles lisent ou écrivent dans un service sans code SDK |
| Valeur de retour | La sortie unique peut être la valeur de retour de la fonction (`-> func.HttpResponse`, `-> str`) |
| Plusieurs sorties | Paramètres `func.Out[T]`, écrits avec `.set()` |
| Blueprint | `bp = func.Blueprint()` dans un autre fichier, puis `app.register_functions(bp)` |
| Obligatoire dans Azure | `function_app.py` et `host.json` |

Les liaisons et déclencheurs nomment un paramètre d'application dans `connection=`, jamais une valeur secrète. Les fonctions ne peuvent pas réutiliser les clients créés en interne par les liaisons : quand le code a besoin d'un client SDK (Azure OpenAI, Cosmos DB), créez-le une fois au niveau du module et réutilisez-le d'un appel à l'autre.

> **Piège d'examen.** Une fonction avec deux décorateurs de déclencheur n'est pas valide. Pour réagir à la fois à un appel HTTP et à un message de file d'attente, écrivez deux fonctions qui partagent une fonction utilitaire.

<!-- section: http-apis | objectives: 3.2.1 -->
## Créer des API HTTP serverless

```text
import json
import azure.functions as func

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

@app.route(route="documents/{doc_id:int}/summary", methods=["POST"])
@app.service_bus_queue_output(arg_name="job", queue_name="summarize-jobs",
                              connection="ServiceBusConnection")
def request_summary(req: func.HttpRequest, job: func.Out[str]) -> func.HttpResponse:
    doc_id = req.route_params.get("doc_id")
    options = req.get_json()
    job.set(json.dumps({"documentId": doc_id, "options": options}))
    return func.HttpResponse(json.dumps({"status": "queued", "documentId": doc_id}),
                             status_code=202, mimetype="application/json")
```

| Élément | Règle |
| --- | --- |
| URL | `https://<app>.azurewebsites.net/api/<route>` ; modifiez ou supprimez le préfixe `api` avec `extensions.http.routePrefix` dans `host.json` |
| Paramètres de route | `{doc_id:int}`, `{id?}` (facultatif), lus dans `req.route_params`, pas comme arguments supplémentaires de la fonction |
| `methods` | Les méthodes HTTP acceptées par la fonction (toutes si omis) |
| `func.AuthLevel.ANONYMOUS` | Aucune clé |
| `func.AuthLevel.FUNCTION` | Une clé de fonction ou une clé d'hôte ; niveau par défaut quand aucun n'est défini |
| `func.AuthLevel.ADMIN` | La clé principale (master key) |
| Transmettre une clé | `?code=<key>` dans la chaîne de requête ou l'en-tête `x-functions-key` |
| Exécutions locales | Core Tools (`func start`, port 7071) ignore le niveau d'autorisation |

Une fonction déclenchée par HTTP doit répondre en moins de **230 secondes**, quel que soit le plan : au-delà, l'équilibreur de charge renvoie 502 pendant que la fonction continue de s'exécuter. Pour un long travail IA (résumer un long document, un lot d'incorporations), acceptez la requête, mettez la tâche en file d'attente et renvoyez 202 avec un emplacement d'état, comme ci-dessus.

> **Piège d'examen.** Les clés de fonction rendent un point de terminaison plus difficile à appeler, elles ne le sécurisent pas pour les utilisateurs. L'authentification des utilisateurs finaux revient à l'authentification App Service (Microsoft Entra ID) ou à une passerelle comme API Management devant la fonction.

<!-- section: triggers-bindings | objectives: 3.2.1 -->
## Implémenter les déclencheurs et les liaisons

| Décorateur | Type | Usage typique |
| --- | --- | --- |
| `@app.route` | Déclencheur HTTP (et sortie HTTP) | API REST |
| `@app.service_bus_queue_trigger` / `@app.service_bus_topic_trigger` | Déclencheur | Traiter des tâches en file d'attente ; le déclencheur de rubrique exige `topic_name` et `subscription_name` |
| `@app.queue_trigger` | Déclencheur | Messages d'une file d'attente Stockage |
| `@app.blob_trigger` | Déclencheur | Objet blob nouveau ou modifié |
| `@app.event_grid_trigger` | Déclencheur | Événements d'un abonnement Event Grid |
| `@app.cosmos_db_trigger` | Déclencheur | Flux de modification d'un conteneur Cosmos DB |
| `@app.timer_trigger` (ou `@app.schedule`) | Déclencheur | Planification NCRONTAB à six champs, secondes en premier : `0 */10 * * * *` |
| `@app.blob_input`, `@app.cosmos_db_input` | Entrée | Lire un document ou un objet blob désigné par le déclencheur |
| `@app.blob_output`, `@app.queue_output`, `@app.service_bus_queue_output`, `@app.service_bus_topic_output`, `@app.event_hub_output` | Sortie | Écrire les résultats |

```text
import logging

@app.service_bus_queue_trigger(arg_name="msg", queue_name="summarize-jobs",
                               connection="ServiceBusConnection")
@app.blob_output(arg_name="summary", path="summaries/{documentId}.json",
                 connection="StorageConnection")
def summarize_job(msg: func.ServiceBusMessage, summary: func.Out[str]) -> None:
    job = json.loads(msg.get_body().decode("utf-8"))
    summary.set(json.dumps(call_model(job)))
    logging.info("Summarized %s", job["documentId"])
```

L'expression de liaison `{documentId}` prend la valeur d'une propriété du message JSON. Avec le déclencheur Service Bus, le runtime **termine** (complete) le message quand la fonction réussit et l'**abandonne** quand elle lève une exception ; après `MaxDeliveryCount` tentatives, Service Bus le déplace vers la file d'attente de lettres mortes. Définissez `cardinality=func.Cardinality.MANY` pour recevoir un lot. Ne désactivez `autoCompleteMessages` que si votre code règle lui-même les messages.

Un **déclencheur Event Grid** reçoit un `func.EventGridEvent` : lisez `event.event_type` et `event.subject` pour orienter le travail et `event.get_json()` pour la charge utile `data`. Le déclencheur répond pour vous à la négociation de validation de l'abonnement, qu'une simple fonction HTTP devrait coder. Pour réagir aux nouveaux objets blob en Flex Consumption, utilisez `@app.blob_trigger(..., source="EventGrid")` : la source par interrogation n'y est pas disponible, et la source Event Grid démarre la fonction plus vite.

Les nouvelles tentatives dépendent du déclencheur :

| Déclencheur | Nouvelles tentatives |
| --- | --- |
| Timer, Event Hubs, Cosmos DB, Kafka | Stratégie de nouvelle tentative du runtime : `@app.retry(strategy="fixed_delay", max_retry_count="3", delay_interval="00:00:10")` ou `exponential_backoff` avec `minimum_interval` et `maximum_interval` |
| Service Bus | Nouvelle remise par Service Bus, puis file d'attente de lettres mortes |
| File d'attente Stockage, Stockage Blob | Extension de liaison : file d'attente ou objets blob incohérents (poison), configurés dans `host.json` |
| Event Grid | Stratégie de nouvelle tentative de l'abonnement aux événements |

Une stratégie de nouvelle tentative ne s'exécute que lorsque la fonction lève une exception non interceptée, et son compteur est conservé dans la mémoire de l'instance.

> **Piège d'examen.** `@app.retry` sur une fonction déclenchée par Service Bus ou Event Grid n'est pas la réponse : ces sources réessaient d'elles-mêmes (nombre de remises, stratégie de l'abonnement aux événements). Configurez la nouvelle tentative là où la source la définit.

<!-- section: configuration | objectives: 3.2.2 -->
## Configurer une application de fonction

Les paramètres d'application deviennent des variables d'environnement (`os.environ`, `os.getenv`). En local, ils se trouvent dans les `Values` de `local.settings.json`, qui n'est jamais publié. Un nom `connection=` désigne un paramètre (une chaîne de connexion) ou, pour une **identité managée**, des paramètres qui partagent le préfixe avec un double trait de soulignement :

| Paramètre | Valeur |
| --- | --- |
| `ServiceBusConnection__fullyQualifiedNamespace` | `contoso-ai.servicebus.windows.net` |
| `StorageConnection__blobServiceUri` / `__queueServiceUri` | `https://contosoai.blob.core.windows.net` / `https://contosoai.queue.core.windows.net` |
| `<prefix>__credential` et `<prefix>__clientId` | `managedidentity` et l'ID client d'une identité **affectée par l'utilisateur** (l'identité affectée par le système est utilisée par défaut) |
| `AzureWebJobsStorage__accountName` | Stockage de l'hôte via l'identité (Storage Blob Data Owner, plus Storage Table Data Contributor) |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Envoie les journaux et les traces à Application Insights |
| `OPENAI_API_KEY` = `@Microsoft.KeyVault(SecretUri=https://kv-ai.vault.azure.net/secrets/openai-key/)` | Référence Key Vault : l'identité de l'application doit avoir **Key Vault Secrets User** |

L'identité a aussi besoin d'un rôle de données sur chaque cible : Azure Service Bus Data Receiver pour un déclencheur, Data Sender pour une liaison de sortie (Learn propose Data Owner pour une mise à l'échelle précise du déclencheur Service Bus), Storage Blob Data Contributor pour écrire des objets blob. En local, les connexions basées sur l'identité utilisent la connexion du développeur.

```json
{
  "version": "2.0",
  "functionTimeout": "00:10:00",
  "logging": { "logLevel": { "default": "Information" } },
  "extensions": {
    "http": { "routePrefix": "api" },
    "serviceBus": {
      "autoCompleteMessages": true,
      "maxAutoLockRenewalDuration": "00:05:00"
    }
  }
}
```

`host.json` s'applique à toutes les fonctions de l'application : délai d'expiration, niveaux de journalisation et paramètres par extension, comme le renouvellement du verrou Service Bus (5 minutes par défaut) ou le préfixe de route HTTP. Modifier un paramètre d'application redémarre l'application.

> **Conseil d'examen.** « Aucun secret dans le code ni dans les paramètres d'application » désigne une identité managée avec des paramètres `__fullyQualifiedNamespace` (ou `__serviceUri`) pour les liaisons, et des références Key Vault pour les secrets dont le code a encore besoin.

<!-- section: hosting-deploy | objectives: 3.2.2 -->
## Choisir un plan et déployer

| Plan | Mise à l'échelle | Délai d'exécution | Usage |
| --- | --- | --- | --- |
| **Flex Consumption** | Pilotée par les événements, jusqu'à zéro, jusqu'à 1 000 instances par groupe de fonctions ; instances toujours prêtes facultatives | 30 minutes par défaut, illimité | Plan serverless recommandé ; Linux uniquement ; intégration de réseau virtuel |
| Premium | Pilotée par les événements, au moins une instance toujours à chaud | 30 minutes par défaut, illimité | Pas de démarrage à froid, Windows ou Linux, conteneurs personnalisés |
| Dedicated (plan App Service) | Manuelle ou mise à l'échelle automatique | 30 minutes par défaut, illimité avec Always On | Capacité disponible d'un plan existant |
| Container Apps | KEDA, jusqu'à zéro | Dépend des déclencheurs | Fonctions en conteneurs à côté d'autres microservices |
| Consumption (hérité) | Pilotée par les événements, jusqu'à zéro | 5 minutes par défaut, 10 au plus | Applications existantes uniquement ; pas de réseau virtuel |

Particularités de Flex Consumption : mémoire d'instance de 512, 2 048 (valeur par défaut recommandée) ou 4 096 Mo ; les fonctions HTTP, blob et Durable se mettent à l'échelle par groupe, toutes les autres individuellement ; les instances toujours prêtes (0 par défaut) suppriment les démarrages à froid et sont facturées même inactives ; une application par plan ; pas d'emplacements de déploiement ; le déclencheur Blob ne prend en charge que la source Event Grid ; Python 3.10 et versions ultérieures.

```bash
az functionapp create --resource-group rg-ai --name contoso-summarizer \
  --storage-account contosoaifunc --flexconsumption-location westeurope \
  --runtime python --runtime-version 3.11 --instance-memory 2048

az functionapp scale config always-ready set --resource-group rg-ai \
  --name contoso-summarizer --settings http=2

az functionapp scale config set --resource-group rg-ai --name contoso-summarizer \
  --trigger-type http --trigger-settings perInstanceConcurrency=10

az functionapp deployment source config-zip --resource-group rg-ai \
  --name contoso-summarizer --src app.zip --build-remote true
```

| Déploiement | Remarques |
| --- | --- |
| `func azure functionapp publish <app>` | Core Tools depuis le dossier du projet ; la build distante installe `requirements.txt` |
| `az functionapp deployment source config-zip ... --build-remote true` | Zip de la racine du projet ; demandez toujours une build distante pour Python |
| Package Flex Consumption | Le zip est stocké dans un conteneur d'objets blob (par défaut dans le compte `AzureWebJobsStorage`) et l'application s'exécute à partir de lui |
| GitHub Actions ou Azure Pipelines | Même déploiement zip depuis la CI/CD |

> **Piège d'examen.** Une application Python déployée sans build distante et sans ses packages échoue avec `ModuleNotFoundError` : listez les dépendances dans `requirements.txt` et compilez à distance (ou déployez des dépendances précompilées). Créer la fonction dans le portail ne prend pas en charge les packages tiers.

<!-- section: key-points -->
## Points clés

- Modèle v2 : `func.FunctionApp()`, décorateurs dans `function_app.py`, blueprints avec `register_functions` ; un déclencheur, autant de liaisons que nécessaire.
- HTTP : `@app.route(route=..., methods=...)`, valeurs de route dans `req.route_params`, `AuthLevel.FUNCTION` par défaut, clé dans `code` ou `x-functions-key`, limite de réponse de 230 secondes : mettez le long travail en file d'attente et renvoyez 202.
- Sorties : valeur de retour ou `func.Out[T].set()` ; `connection=` nomme un paramètre, jamais un secret.
- Le déclencheur Service Bus termine le message en cas de succès et l'abandonne en cas d'exception ; `@app.retry` seulement pour Timer, Event Hubs, Cosmos DB et Kafka.
- Connexions par identité : `<prefix>__fullyQualifiedNamespace`, `__serviceUri`, `__credential`, `__clientId`, plus des rôles de données ; références Key Vault avec Key Vault Secrets User.
- Flex Consumption est le plan par défaut : mise à l'échelle jusqu'à zéro, instances toujours prêtes, 512/2 048/4 096 Mo, pas d'emplacements, Linux.
- Déployez Python avec une build distante : `func azure functionapp publish` ou `config-zip --build-remote true`.
