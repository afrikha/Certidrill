An application architecture question describes how components must talk to each other (commands, notifications, telemetry, API calls), what must be shared between instances (cached data, settings) and how the application reaches production. Several Azure services look alike in each family: the requirements decide which one fits.

<!-- section: messaging | objectives: 4.2.1 -->
## Recommending a messaging architecture

A **message** carries data that the sender expects a receiver to process: an order to fulfil, a payment to record. A queue between two components decouples them: the sender doesn't wait, the receiver works at its own pace (load leveling), and several receivers share the work (competing consumers). A **topic** delivers a copy of each message to every subscription, with filters (publish-subscribe).

| Requirement | Storage queues | Service Bus |
| --- | --- | --- |
| Queue larger than 80 GB | Yes, up to the capacity of the storage account | No: 1 to 80 GB per queue |
| Message size | 64 KB | 256 KB in Standard, up to 100 MB in Premium |
| Guaranteed first-in, first-out order | No | Yes, with sessions |
| Duplicate detection, transactions, automatic dead-letter queue | No | Yes |
| Publish-subscribe to several consumers | No | Yes, with topics and subscriptions |
| Delivery | At least once | At least once (peek-lock) or at most once (receive and delete) |
| Receive without polling | No | Yes, long polling over AMQP |

Storage queues are the simple, cheap answer for a backlog of small messages with no ordering need. Service Bus is the enterprise broker, and its tier is part of the answer:

| Tier | Adds |
| --- | --- |
| Basic | Queues only |
| Standard | Topics and subscriptions, sessions, transactions, duplicate detection; shared capacity, billed per operation |
| Premium | Dedicated messaging units with predictable performance, messages up to 100 MB, private endpoints and virtual network rules, customer-managed keys, Geo-Disaster Recovery and Geo-Replication |

Every tier is zone-redundant where zones exist. For a regional outage, Premium offers Geo-Disaster Recovery, which replicates only the metadata of the namespace (entities, configuration), and Geo-Replication, which also replicates the messages.

> **Exam trap.** "Messages must be processed in the order they were sent" or "each order must be processed exactly once" needs Service Bus sessions or duplicate detection, in Standard at least. "Access the namespace through a private endpoint" needs Premium.

<!-- section: events | objectives: 4.2.2 -->
## Recommending an event-driven architecture

An **event** is a lightweight notification that something happened; the publisher expects nothing from the consumers. Events are either discrete (a blob was created) or a continuous series (telemetry).

| Service | Purpose | Typical requirement |
| --- | --- | --- |
| Event Grid | Routing of discrete events to handlers | React to a change in an Azure resource or an application; serverless, pay per event |
| Event Hubs | Ingestion of streams of events | Telemetry, clickstream, logs: millions of events per second, replayed by several readers |
| Service Bus | Transactional messaging | Orders, financial transactions, workflows |

**Event Grid** pushes events to handlers: Azure Functions, Logic Apps, webhooks, Service Bus queues and topics, Event Hubs, Storage queues. Sources are system topics (events of Azure services such as Storage or Resource Manager), custom topics (your applications) and partner topics. Delivery is at least once and unordered; Event Grid retries with exponential backoff for up to 24 hours, then drops the event unless a dead-letter blob container is configured. Event Grid namespaces add pull delivery, where consumers read at their own pace, and an MQTT broker for devices.

**Event Hubs** stores events in partitions for a retention period; each consumer group reads the stream independently and can replay it. Its Kafka endpoint accepts existing Kafka clients with a configuration change only.

| Tier | Maximum retention | Notes |
| --- | --- | --- |
| Basic | 1 day | One consumer group; no Kafka, no Capture |
| Standard | 7 days | Kafka endpoint, Capture to Blob Storage or Data Lake Storage (billed separately), private endpoints, Geo-Disaster Recovery |
| Premium | 90 days | Capture included, Geo-Replication, isolated processing units |
| Dedicated | 90 days | Single-tenant cluster for the highest volumes |

The services combine: Event Hubs ingests telemetry for analytics while Event Grid triggers a function when a file arrives, and Service Bus carries the resulting orders.

> **Exam trap.** Event Grid doesn't store a stream for later replay, and Event Hubs doesn't route individual events to handlers with filters. "React when a blob is created" is Event Grid; "ingest device telemetry for Stream Analytics" is Event Hubs.

> **Exam tip.** "Existing Kafka producers, no application rewrite" is Event Hubs in Standard or higher. "Keep the raw events automatically in a data lake" is Event Hubs Capture.

<!-- section: api-integration | objectives: 4.2.3 -->
## Recommending a solution for API integration

**Azure API Management** places a gateway in front of backend APIs, wherever they run. The gateway is a facade: backends can change without affecting consumers. Its components:

- **API gateway**: verifies subscription keys, tokens (JWT) and certificates, enforces rate limits and quotas, transforms requests and responses, caches responses, emits logs and metrics.
- **Policies**: statements executed on the request or the response, at global, product, API or operation scope.
- **Products and subscriptions**: package APIs for consumers, who get a subscription key, with or without approval.
- **Developer portal**: generated documentation where consumers discover, test and subscribe to APIs.
- **Workspaces**: let several teams manage their own APIs on a shared instance.

The tier follows the networking and geography requirements:

| Requirement | Tier |
| --- | --- |
| Sporadic traffic, pay per call, no fixed capacity | Consumption |
| Evaluation and test of every feature, no SLA | Developer |
| Reach backends inside a virtual network; the gateway stays public | Standard v2 |
| Gateway injected in a virtual network, isolated inbound and outbound | Premium or Premium v2 |
| One instance with gateways in several regions | Premium |
| Self-hosted gateway next to on-premises or other-cloud APIs | Premium (Developer for test) |
| Availability zones | Premium or Premium v2 |

The v2 tiers deploy in minutes and all have an SLA, but they don't offer multi-region deployment or the self-hosted gateway. The **self-hosted gateway** is a container that runs close to the APIs and stays managed from the Azure instance: it is the answer to "one management plane for APIs hosted on-premises and in several clouds".

To expose a legacy system that has no API, front a Logic Apps workflow or a function with API Management. For integration with partners, Logic Apps provides the connectors and API Management the secured, documented endpoint.

> **Exam trap.** An application gateway or Front Door protects and load-balances HTTP traffic; neither publishes a developer portal, issues subscription keys or applies per-consumer quotas. Those requirements designate API Management.

<!-- section: caching | objectives: 4.2.4 -->
## Recommending a caching solution

A cache answers three requirements: reduce the load and latency of a data store, share state between stateless instances, and serve static content close to users.

| Requirement | Recommend |
| --- | --- |
| Cache query results or objects in memory (cache-aside pattern) | Azure Managed Redis |
| Share user sessions between web instances | Azure Managed Redis as session store |
| Serve images, scripts and downloads from edge locations | Azure Front Door caching |
| Avoid calling a backend for identical API requests | Response caching policy in API Management, built-in cache or an external Redis cache |

With **cache-aside**, the application reads the cache first, loads from the database on a miss and writes the result to the cache with an expiration; it invalidates the entry when the data changes.

**Azure Managed Redis** is the current Redis service, built on Redis Enterprise:

| Tier | Profile |
| --- | --- |
| Memory Optimized | Most memory per vCPU: large datasets with moderate throughput |
| Balanced | Standard workloads |
| Compute Optimized | Most vCPUs per GB: highest throughput |
| Flash Optimized | Keeps less-used data on NVMe storage: very large datasets at a lower cost |

Enable high availability for production: the instance then has at least two nodes, spread across zones where the region has them. Active geo-replication links instances in several regions that all accept writes, with automatic conflict resolution; it isn't available in Flash Optimized. Data persistence writes snapshots to disk for a faster recovery; it isn't a backup. Authenticate with Microsoft Entra ID and connect through a private endpoint.

Azure Cache for Redis is being retired: the Enterprise tiers on March 31, 2027, the Basic, Standard and Premium tiers on September 30, 2028. New designs use Azure Managed Redis.

Front Door caches only responses to GET requests, per edge location: use it for static assets and disable caching on routes that return user-specific data.

> **Exam trap.** A cache isn't the system of record: data in Redis can be lost at a failover or an eviction. A requirement of durable, queryable storage designates a database, with the cache in front.

<!-- section: app-configuration | objectives: 4.2.5 -->
## Recommending an application configuration management solution

| Need | Service |
| --- | --- |
| Settings and feature flags shared by several applications and environments, changed without redeployment | Azure App Configuration |
| Secrets, keys and certificates | Azure Key Vault |
| Settings of one web app, injected as environment variables, possibly specific to a deployment slot | App Service app settings |

**Azure App Configuration** stores key-values centrally. Labels hold a different value per environment or version; feature flags turn a feature on for some users without a deployment; applications refresh their settings dynamically; a point-in-time replay shows the values at an earlier date. App Configuration and Key Vault are used together: a key-value holds a **Key Vault reference**, and the application resolves the secret from the vault with its managed identity. Access to the store itself also uses Microsoft Entra ID and managed identities, with no connection string in the code.

| Tier | SLA | Notes |
| --- | --- | --- |
| Free | None | 10 MB, 1,000 requests per day |
| Developer | None | Adds private endpoints |
| Standard | 99.9 %, 99.95 % with geo-replication | Adds geo-replication, soft delete, customer-managed keys |
| Premium | 99.9 %, 99.99 % with geo-replication | No request quota |

> **Exam trap.** Don't store a connection string or a password in App Configuration because it encrypts data: the recommended design keeps the secret in Key Vault and a reference in App Configuration.

<!-- section: automated-deployment | objectives: 4.2.6 -->
## Recommending an automated deployment solution

Automated deployment has three layers.

**Infrastructure as code.** Bicep files and ARM templates declare the target state; a deployment is idempotent and repeatable in every environment. Terraform is the choice of teams that manage several clouds with one tool.

| Requirement | Recommend |
| --- | --- |
| Share approved templates in the organization, versioned and protected by Azure RBAC | Template specs |
| Manage a set of resources as one unit, delete what is removed from the template, block changes and deletions made outside it | Deployment stacks with deny settings |
| Replace Azure Blueprints, retired on January 31, 2027 | Deployment stacks and template specs |

**Pipelines.** GitHub Actions workflows or Azure Pipelines build, test and deploy at each commit, with environments, approvals and automated rollback. They sign in to Azure with workload identity federation, without a stored secret.

**Release strategy.** The goal is a deployment without downtime and a fast rollback:

| Platform | Mechanism |
| --- | --- |
| App Service | Deployment slots (Standard tier and higher): deploy to a staging slot, warm it up, swap with production without dropping requests; swap back to roll back; route a percentage of traffic to a slot to test in production |
| Container Apps | Revisions: in multiple revision mode, split traffic between revisions for blue-green or canary releases |
| AKS | Rolling updates of Kubernetes deployments |
| Virtual Machine Scale Sets | New image version from Azure Compute Gallery, applied by rolling upgrades |

Settings marked as slot settings stay with their slot during a swap: the staging slot keeps its test database connection.

> **Exam tip.** "Deploy a new version with no downtime and roll back immediately" for a web app is a deployment slot swap. "Prevent administrators from deleting resources deployed by the template" is a deployment stack with deny settings, not a resource lock set by hand.

<!-- section: key-points -->
## Key points

- Message: data to process, with a contract (Storage queues, Service Bus). Event: notification (Event Grid for discrete events, Event Hubs for streams).
- Storage queues: simple, more than 80 GB. Service Bus: order with sessions, duplicate detection, transactions, topics; Premium for private endpoints, large messages and geo features.
- Event Grid pushes to handlers, retries for 24 hours, dead-letters to a blob container. Event Hubs keeps a replayable stream: 7 days in Standard, 90 in Premium; Kafka endpoint; Capture.
- API Management: policies, products, subscriptions, developer portal. Premium for multi-region and self-hosted gateway; Standard v2 to reach private backends; Consumption for sporadic traffic.
- Azure Managed Redis for data and session caching, with high availability enabled; Front Door for static content; Azure Cache for Redis is being retired.
- App Configuration for settings and feature flags, Key Vault for secrets, linked by Key Vault references and managed identities.
- Bicep and template specs for infrastructure, deployment stacks to manage and protect it, pipelines to deliver, slots or revisions to release without downtime.
