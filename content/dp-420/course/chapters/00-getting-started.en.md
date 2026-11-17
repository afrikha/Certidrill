DP-420 is the exam of the Microsoft Certified: Azure Cosmos DB AI Developer Associate certification (the former Azure Cosmos DB Developer Specialty, renamed and re-leveled on October 6, 2026). It targets a developer who writes C# or Python against Azure Cosmos DB for NoSQL: data models and partition keys, SDK code, queries and policies, security and performance, and the AI side of the service (vector, full-text and hybrid search, RAG, agent memory, Microsoft Fabric). It tests what you code and configure, so most questions show a snippet, a query, a JSON policy or a setting to choose or complete.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 100 minutes of exam time |
| Questions | Not published; plan for about 45 to 58, with a case study and a problem-solution series |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No points deducted: always answer |
| Multi-part questions | Usually one point per correct element |
| Documentation | Microsoft Learn is available during associate exams, but the timer keeps running: confirm a parameter, don't learn a topic |
| Interactive components | Announced as possible by Microsoft |
| Skills measured | As of October 6, 2026 (the skills list was largely rewritten) |
| Preview features | Most questions cover generally available features; commonly used preview features may appear |
| Validity | One year, renewable for free with an online assessment on Microsoft Learn |

The three domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Design and develop database solutions | 40 to 45 % |
| Secure, optimize, and deploy database solutions | 30 to 35 % |
| Implement AI and analytics capabilities in database solutions | 20 to 25 % |

Expected formats: one answer among four or five, several answers ("each correct answer presents part of the solution"), code with two to four drop-down lists, Yes/No statements, drag and drop, and ordering of steps. Breaks can't be taken during a problem-solution set, and once you start a break you can't return to the questions seen before it. Some questions are unscored, and you can't tell which ones.

If the exam isn't available in your language, you can request 30 extra minutes. The English version is updated first; localized versions follow about eight weeks later.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences: a fictional company, an access pattern ("read an order by its ID", "list the last 20 messages of a conversation"), a volume or an RU budget, and **one deciding constraint**: lowest RU cost, lowest latency, a consistency guarantee, tenant isolation, no code change. Underline that constraint first: it usually eliminates half the options.

| Words in the question | Think of |
| --- | --- |
| "users must always see their own changes", "lowest cost" | Session consistency, not Strong |
| "read one item, ID and partition key known", "lowest RU" | Point read (`ReadItemAsync`, `read_item`), not a query |
| "unpredictable traffic", "pay for the peak only when it happens" | Autoscale; serverless if it's intermittent and single-region |
| "change only one property", "reduce network payload" | Patch (partial document update) |
| "all or nothing", "same customer" | Transactional batch on one logical partition key |
| "import millions of items as fast as possible" | Bulk execution (`AllowBulkExecution`) |
| "don't overwrite a concurrent update" | Optimistic concurrency: `_etag` with If-Match, HTTP 412 |
| "delete automatically after 30 days" | Time to live (`DefaultTimeToLive`, item `ttl`) |
| "a tenant can exceed 20 GB" | Hierarchical partition keys with a high-cardinality last level |
| "all writes go to today's date" | Hot partition: synthetic key with a suffix |
| "one physical partition at 100 % while others are low" | Hot partition key, not a throughput shortage |
| "react to every insert and update" | Change feed (processor or pull model) |
| "no keys in the code" | Microsoft Entra ID with a Cosmos DB data plane role |
| "find semantically similar documents" | Vector policy and index, `VectorDistance` |
| "combine keyword and semantic relevance" | Hybrid search: `RRF` over `FullTextScore` and `VectorDistance` |

Code questions show C# or Python with blanks: the client option, the method, the request option, the parameter that carries the partition key or the ETag. Read every snippet of this course until you can say what each line does. C#, Python and query code is shown in plain-text blocks.

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Point read | Query on `c.id` | A point read by ID and partition key costs about 1 RU per 1 KB item; the same item fetched by a query costs more, and much more without the partition key |
| Session | Strong | Session gives read-your-writes to one session at single-replica cost; Strong gives everyone the latest write, doubles the read RU and isn't possible with multi-region writes |
| Bounded staleness | Consistent prefix | Bounded staleness limits the lag (K versions or T seconds); consistent prefix only guarantees order |
| Manual throughput | Autoscale | Manual bills the provisioned RU/s every hour; autoscale bills the highest RU/s reached in the hour, between 10 % and 100 % of the maximum, at 1.5 times the manual rate (single write region) |
| Autoscale | Serverless | Autoscale never goes below 10 % of its maximum; serverless bills only the RU consumed but runs in a single region |
| Dedicated throughput | Shared database throughput | Dedicated RU/s are reserved for one container and backed by the SLA; shared RU/s are split among up to 25 containers with no guarantee per container |
| Logical partition | Physical partition | A logical partition is one key value (20 GB maximum); a physical partition hosts many of them (50 GB, 10,000 RU/s) |
| Hierarchical partition key | Synthetic partition key | Hierarchical keys are up to three real paths with prefix routing; a synthetic key is one property your code builds by concatenation or suffix |
| Embed | Reference | Embed what is bounded, read together and rarely changed; reference what is unbounded, many-to-many or changes often |
| Transactional batch | Bulk | A batch is atomic, one logical partition, 100 operations at most; bulk maximizes throughput and each operation succeeds or fails on its own |
| Replace | Patch | Replace sends the whole item; patch sends up to 10 operations on paths |
| Upsert | Create | Create fails with 409 if the ID exists in the partition; upsert creates or replaces |
| ETag (If-Match) | Session token | The ETag prevents lost updates; the session token guarantees read-your-writes |
| Change feed latest version | All versions and deletes | Latest version shows the last state of changed items and no deletes; all versions and deletes shows every change, including deletes |
| Change feed processor | Pull model | The processor stores leases in a lease container and spreads work across instances; the pull model leaves the position and the polling to your code |
| Azure RBAC role on the account | Cosmos DB data plane role | Contributor manages the account; reading items with Microsoft Entra ID needs a data plane role such as Cosmos DB Built-in Data Reader |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the first module (resource model, operations, partitioning, change feed) gives the vocabulary that security, performance and AI retrieval reuse.
2. Create a free tier account (or use the emulator) and a container partitioned on a realistic key. Load a few thousand items with the SDK and print the RU charge of each operation: a point read, the same item by query, a patch, a batch.
3. Write the same operations in C# and in Python: the exam can show either, and method names differ (`ReadItemAsync` and `read_item`, `QueryDefinition` and `parameters`).
4. Change one setting at a time (consistency override, indexing policy, page size, partition key) and watch the RU charge and the result.
5. Practise finding a page on Microsoft Learn quickly (SDK reference, limits, query functions): during the exam this is your reference.
6. After each module, take a mock exam and reread the sections linked to your mistakes. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
