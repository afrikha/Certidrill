Azure Functions runs event-driven code without servers to manage: an HTTP request, a Service Bus message, a new blob or a timer starts a function, and bindings read and write other services without client code. In the Python **v2 programming model**, triggers and bindings are decorators in `function_app.py`. Exam questions show a decorated function to complete, a setting to add so a binding connects with a managed identity, or a hosting plan and deployment command to choose.

<!-- section: programming-model | objectives: 3.2.1 -->
## The Python v2 programming model

The v2 model is recommended for new Python apps. Each function is a stateless global method in `function_app.py` or in a blueprint file, registered on a `FunctionApp` object:

```text
project/
├── function_app.py        # app = func.FunctionApp(); decorated functions
├── blueprints/ingest.py   # bp = func.Blueprint(); more functions
├── host.json              # runtime configuration, published
├── local.settings.json    # local app settings and secrets, never published
└── requirements.txt       # dependencies, installed by the remote build
```

| Concept | Rule |
| --- | --- |
| Trigger | Exactly **one** per function: it defines how the function starts and usually provides input |
| Input and output bindings | Optional, any number: they read or write a service without SDK code |
| Return value | The single output can be the function's return value (`-> func.HttpResponse`, `-> str`) |
| Several outputs | `func.Out[T]` parameters, written with `.set()` |
| Blueprint | `bp = func.Blueprint()` in another file, then `app.register_functions(bp)` |
| Required in Azure | `function_app.py` and `host.json` |

Bindings and triggers name an app setting in `connection=`, never a secret value. Functions can't reuse the clients created internally by bindings: when the code needs an SDK client (Azure OpenAI, Cosmos DB), create it once at module level and reuse it across invocations.

> **Exam trap.** A function with two trigger decorators is invalid. To react to both an HTTP call and a queue message, write two functions that share a helper.

<!-- section: http-apis | objectives: 3.2.1 -->
## Building serverless HTTP APIs

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

| Element | Rule |
| --- | --- |
| URL | `https://<app>.azurewebsites.net/api/<route>`; change or remove the `api` prefix with `extensions.http.routePrefix` in `host.json` |
| Route parameters | `{doc_id:int}`, `{id?}` (optional), read from `req.route_params`, not as extra function arguments |
| `methods` | The HTTP methods the function accepts (all methods when omitted) |
| `func.AuthLevel.ANONYMOUS` | No key |
| `func.AuthLevel.FUNCTION` | A function key or a host key; the default level when none is set |
| `func.AuthLevel.ADMIN` | The master key |
| Passing a key | `?code=<key>` in the query string or the `x-functions-key` header |
| Local runs | Core Tools (`func start`, port 7071) ignores the authorization level |

An HTTP-triggered function must answer within **230 seconds**, whatever the plan: after that the load balancer returns 502 while the function keeps running. For long AI work (summarizing a long document, a batch of embeddings), accept the request, queue the job and return 202 with a status location, as above.

> **Exam trap.** Function keys make an endpoint harder to call, not secure for users. Authenticating end users is the job of App Service authentication (Microsoft Entra ID) or a gateway such as API Management in front of the function.

<!-- section: triggers-bindings | objectives: 3.2.1 -->
## Implementing triggers and bindings

| Decorator | Kind | Typical use |
| --- | --- | --- |
| `@app.route` | HTTP trigger (and HTTP output) | REST API |
| `@app.service_bus_queue_trigger` / `@app.service_bus_topic_trigger` | Trigger | Process queued jobs; topic trigger needs `topic_name` and `subscription_name` |
| `@app.queue_trigger` | Trigger | Storage queue messages |
| `@app.blob_trigger` | Trigger | New or updated blob |
| `@app.event_grid_trigger` | Trigger | Events from an Event Grid subscription |
| `@app.cosmos_db_trigger` | Trigger | Change feed of a Cosmos DB container |
| `@app.timer_trigger` (or `@app.schedule`) | Trigger | NCRONTAB schedule with six fields, seconds first: `0 */10 * * * *` |
| `@app.blob_input`, `@app.cosmos_db_input` | Input | Read a document or blob named by the trigger |
| `@app.blob_output`, `@app.queue_output`, `@app.service_bus_queue_output`, `@app.service_bus_topic_output`, `@app.event_hub_output` | Output | Write results |

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

The binding expression `{documentId}` takes the value of a property of the JSON message. With the Service Bus trigger, the runtime **completes** the message when the function succeeds and **abandons** it when it raises an exception; after `MaxDeliveryCount` attempts, Service Bus moves it to the dead-letter queue. Set `cardinality=func.Cardinality.MANY` to receive a batch. Disable `autoCompleteMessages` only if your code settles the messages itself.

An **Event Grid trigger** receives a `func.EventGridEvent`: read `event.event_type` and `event.subject` to route the work and `event.get_json()` for the `data` payload. The trigger answers the subscription validation handshake for you, which a plain HTTP function would have to code. To react to new blobs on Flex Consumption, use `@app.blob_trigger(..., source="EventGrid")`: the polling source isn't available there, and the Event Grid source starts the function faster.

Retries depend on the trigger:

| Trigger | Retries |
| --- | --- |
| Timer, Event Hubs, Cosmos DB, Kafka | Runtime retry policy: `@app.retry(strategy="fixed_delay", max_retry_count="3", delay_interval="00:00:10")` or `exponential_backoff` with `minimum_interval` and `maximum_interval` |
| Service Bus | Redelivery by Service Bus, then dead-letter queue |
| Storage queue, Blob Storage | Binding extension: poison queue or poison blobs, configured in `host.json` |
| Event Grid | Retry policy of the event subscription |

A retry policy runs only when the function raises an uncaught exception, and its count is kept in instance memory.

> **Exam trap.** `@app.retry` on a Service Bus or Event Grid triggered function isn't the answer: those sources retry by themselves (delivery count, event subscription policy). Configure the retry where the source defines it.

<!-- section: configuration | objectives: 3.2.2 -->
## Configuring a function app

App settings become environment variables (`os.environ`, `os.getenv`). Locally, they live in the `Values` of `local.settings.json`, which is never published. A `connection=` name points to one setting (a connection string) or, for a **managed identity**, to settings that share the prefix with a double underscore:

| Setting | Value |
| --- | --- |
| `ServiceBusConnection__fullyQualifiedNamespace` | `contoso-ai.servicebus.windows.net` |
| `StorageConnection__blobServiceUri` / `__queueServiceUri` | `https://contosoai.blob.core.windows.net` / `https://contosoai.queue.core.windows.net` |
| `<prefix>__credential` and `<prefix>__clientId` | `managedidentity` and the client ID of a **user-assigned** identity (system-assigned is used by default) |
| `AzureWebJobsStorage__accountName` | Host storage through the identity (Storage Blob Data Owner, plus Storage Table Data Contributor) |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Sends logs and traces to Application Insights |
| `OPENAI_API_KEY` = `@Microsoft.KeyVault(SecretUri=https://kv-ai.vault.azure.net/secrets/openai-key/)` | Key Vault reference: the app identity needs **Key Vault Secrets User** |

The identity also needs a data role on each target: Azure Service Bus Data Receiver for a trigger, Data Sender for an output binding (Learn suggests Data Owner for accurate scaling of the Service Bus trigger), Storage Blob Data Contributor to write blobs. Locally, identity-based connections use the developer's own sign-in.

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

`host.json` applies to every function of the app: timeout, logging levels, and per-extension settings such as Service Bus lock renewal (5 minutes by default) or the HTTP route prefix. Changing an app setting restarts the app.

> **Exam tip.** "No secret in code or in app settings" is a managed identity with `__fullyQualifiedNamespace` (or `__serviceUri`) settings for bindings, and Key Vault references for the secrets the code still needs.

<!-- section: hosting-deploy | objectives: 3.2.2 -->
## Choosing a plan and deploying

| Plan | Scale | Execution timeout | Use |
| --- | --- | --- | --- |
| **Flex Consumption** | Event driven, to zero, up to 1,000 instances per function group; optional always-ready instances | 30 minutes by default, unbounded | Recommended serverless plan; Linux only; virtual network integration |
| Premium | Event driven, at least one instance always warm | 30 minutes by default, unbounded | No cold start, Windows or Linux, custom containers |
| Dedicated (App Service plan) | Manual or autoscale | 30 minutes by default, unbounded with Always On | Spare capacity of an existing plan |
| Container Apps | KEDA, to zero | Depends on triggers | Functions as containers next to other microservices |
| Consumption (legacy) | Event driven, to zero | 5 minutes by default, 10 at most | Existing apps only; no virtual network |

Flex Consumption specifics: instance memory of 512, 2,048 (recommended default) or 4,096 MB; HTTP, blob and Durable functions scale as groups, every other function on its own; always-ready instances (0 by default) remove cold starts and are billed even when idle; one app per plan; no deployment slots; the Blob trigger supports only the Event Grid source; Python 3.10 and later.

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

| Deployment | Notes |
| --- | --- |
| `func azure functionapp publish <app>` | Core Tools from the project folder; remote build installs `requirements.txt` |
| `az functionapp deployment source config-zip ... --build-remote true` | Zip of the project root; always request a remote build for Python |
| Flex Consumption package | The zip is stored in a blob container (by default in the `AzureWebJobsStorage` account) and the app runs from it |
| GitHub Actions or Azure Pipelines | Same zip deployment from CI/CD |

> **Exam trap.** A Python app deployed without remote build and without its packages fails with `ModuleNotFoundError`: list dependencies in `requirements.txt` and build remotely (or deploy prebuilt dependencies). Creating the function in the portal doesn't support third-party packages.

<!-- section: key-points -->
## Key points

- v2 model: `func.FunctionApp()`, decorators in `function_app.py`, blueprints with `register_functions`; one trigger, any number of bindings.
- HTTP: `@app.route(route=..., methods=...)`, route values in `req.route_params`, `AuthLevel.FUNCTION` by default, key in `code` or `x-functions-key`, 230-second response limit: queue long work and return 202.
- Outputs: return value or `func.Out[T].set()`; `connection=` names a setting, never a secret.
- Service Bus trigger completes on success and abandons on exception; `@app.retry` only for Timer, Event Hubs, Cosmos DB and Kafka.
- Identity connections: `<prefix>__fullyQualifiedNamespace`, `__serviceUri`, `__credential`, `__clientId`, plus data roles; Key Vault references with Key Vault Secrets User.
- Flex Consumption is the default plan: scale to zero, always-ready instances, 512/2,048/4,096 MB, no slots, Linux.
- Deploy Python with a remote build: `func azure functionapp publish` or `config-zip --build-remote true`.
