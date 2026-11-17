AI-200 is the exam of the Microsoft Certified: Azure AI Cloud Developer Associate certification. It targets a back-end developer who writes Python and builds the cloud side of AI applications on Azure: containers that host the services, databases that store documents and embeddings, messaging and serverless functions that connect the parts, and the security and monitoring around them. It doesn't test model training or agent design (that is AI-103): it tests what you code and configure, so most questions show a Python snippet, an `az` command, a YAML manifest, a query or a setting to choose or complete.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 120 minutes of exam time |
| Questions | Not published; plan for about 45 to 58, including one case study and one "does the solution meet the goal" series |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn is available during the exam, but searching it costs time: use it to confirm a parameter, not to learn a topic |
| Interactive components | Announced as possible by Microsoft ("you may have interactive components") |
| Skills measured | The study guide shows no "skills measured as of" date; its page is dated April 15, 2026 |
| Validity | One year, renewable for free with an online assessment on Microsoft Learn |

The four domains weigh about the same:

| Domain | Weight |
| --- | --- |
| Develop containerized solutions on Azure | 20 to 25 % |
| Develop AI solutions by using Azure data management services | 25 to 30 % |
| Connect to and consume Azure services | 20 to 25 % |
| Secure, monitor, and troubleshoot Azure solutions | 20 to 25 % |

Expected formats: one answer among four or five, several answers ("each correct answer presents part of the solution"), code blocks with two to four drop-down lists, Yes/No statements, drag and drop, and ordering of steps. In a "does the solution meet the goal" series, the same scenario comes back with a different solution each time, and you can't go back to a previous question of the series. Questions with several elements usually give one point per correct element.

If the exam isn't available in your language, you can request 30 extra minutes. A failed attempt can be retaken after 24 hours.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences: a fictional company with an AI workload (a retrieval API, an embedding pipeline, a chat history store), then one or two constraints that decide the answer: latency, RU cost, scaling on events, retries, no secrets in code. Underline the constraint first; it usually eliminates half the options.

| Words in the question | Think of |
| --- | --- |
| "without storing credentials", "no secrets in code", "keyless" | Managed identity and `DefaultAzureCredential`, plus the service's data role (AcrPull, Cosmos DB data plane role, Key Vault Secrets User) |
| "every replica must run the same build" | Unique image tag or digest, not `latest` |
| "build agents don't have Docker" | `az acr build` (ACR Tasks quick task) |
| "rebuild when the base image is patched" | ACR task with its base image update trigger |
| "scale on queue length", "no cost when idle" | Container Apps custom KEDA rule with `minReplicas` 0 |
| "send 10 % of traffic to the new version" | Container Apps multiple revision mode and traffic weights |
| "the pod restarts again and again" | `CrashLoopBackOff`: `kubectl logs --previous` |
| "users must see their own writes, lowest cost" | Cosmos DB Session consistency |
| "sort on two properties" | Cosmos DB composite index |
| "process every new or updated item" | Cosmos DB change feed (Azure Functions trigger in Python) |
| "find the most similar chunks" | Vector index plus `VectorDistance` (Cosmos DB) or pgvector (PostgreSQL), with `TOP N` / `LIMIT` |
| "each message processed by several independent consumers" | Service Bus topic with subscriptions, not a queue |
| "messages that fail repeatedly" | Dead-letter queue |
| "react to a discrete event, such as a blob created" | Event Grid |
| "feature flags", "settings shared by several apps" | App Configuration; secrets stay in Key Vault |
| "follow one request across services" | Distributed tracing with OpenTelemetry |

Code questions show Python with blanks: the client to create, the method to call, the parameter that carries the partition key or the credential. Read every snippet of this course until you can say what each line does. Python code in this course is shown in plain-text blocks.

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| App Service | Container Apps | App Service hosts a web app or API container on a plan; Container Apps adds revisions, traffic splitting and KEDA scaling down to zero |
| Container Apps | AKS | Container Apps hides Kubernetes; AKS gives the full Kubernetes API, manifests and node pools to manage |
| Quick task (`az acr build`) | Triggered task (`az acr task create`) | A quick task builds once on demand; a task runs again on a commit, a base image update or a schedule |
| Revision-scope change | Application-scope change | Template changes (image, environment variables, scale rules) create a revision; secrets, ingress and traffic don't |
| Console logs | System logs | Console logs are what your code prints; system logs are platform events such as image pulls and probe failures |
| Azure RBAC role on Cosmos DB | Cosmos DB data plane role | Contributor manages the account; reading items with Microsoft Entra ID needs Built-in Data Reader or Data Contributor |
| Session consistency | Strong consistency | Session guarantees read-your-writes for one client at single-replica cost; Strong guarantees the latest write for everyone at twice the read RU |
| `flat` vector index | `diskANN` vector index | `flat` is exact, up to 505 dimensions; `diskANN` is approximate, up to 4,096 dimensions, best for large sets |
| Change feed processor | Change feed pull model | The processor keeps leases and spreads work across instances (.NET, Java, Functions); the pull model leaves position and polling to your code |
| Service Bus queue | Service Bus topic | A queue delivers each message to one consumer; a topic copies it to every subscription |
| Service Bus | Event Grid | Service Bus carries business messages to be processed reliably; Event Grid distributes events that report that something happened |
| Trigger | Binding | A function has exactly one trigger that starts it; bindings connect it to input and output data without client code |
| Key Vault | App Configuration | Key Vault protects secrets, keys and certificates; App Configuration holds settings and feature flags and can reference Key Vault secrets |
| Traces | Logs and metrics | A trace follows one request across services; logs are individual records; metrics are numeric aggregates over time |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the container module gives the deployment vocabulary that the data, integration and monitoring modules reuse.
2. In a test subscription, build an image with `az acr build`, deploy it to Container Apps with a managed identity, then add a queue-based scale rule and watch the replicas change.
3. Create a Cosmos DB for NoSQL container with a vector policy, load a few hundred chunks with the Python SDK, and run a `VectorDistance` query; look at the RU charge before and after changing the indexing policy.
4. Run every Python snippet of this course with `DefaultAzureCredential` and change one parameter at a time to see its effect.
5. Practise finding a page on Microsoft Learn quickly (CLI reference, SDK reference, limits): during the exam this is your reference.
6. After each module, take a mock exam and reread the sections linked to your mistakes. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
