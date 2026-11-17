AI-103 is the exam of the Microsoft Certified: Azure AI Apps and Agents Developer Associate certification. It targets an Azure AI engineer who builds, manages and deploys agents and AI solutions on Microsoft Foundry and who writes Python. Most questions make you choose (a model, a Foundry service, a retrieval method, a deployment type, an agent tool, an evaluator, a guardrail); the others make you implement: complete a short Python snippet or JSON definition, order the steps of a setup, or read a trace or an evaluation result.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 120 minutes of exam time |
| Questions | Not published; plan for about 45 to 58, including one case study and one "does the solution meet the goal" series |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn is available during the exam, but searching it costs time: use it to confirm a detail, not to learn a topic |
| Interactive components | Announced as possible by Microsoft ("you may have interactive components") |
| Prerequisites | None formally; Microsoft expects Python development experience and familiarity with generative AI and Azure services |
| Skills measured | Version of April 16, 2026 |
| Preview features | Most questions cover generally available features; commonly used preview features can appear |

The five domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Plan and manage an Azure AI solution | 25 to 30 % |
| Implement generative AI and agentic solutions | 30 to 35 % |
| Implement computer vision solutions | 10 to 15 % |
| Implement text analysis solutions | 10 to 15 % |
| Implement information extraction solutions | 10 to 15 % |

Expected formats: one answer among four or five, several answers ("each correct answer presents part of the solution"), Yes/No statements, code or sentences to complete with drop-down lists, drag and drop, and ordering of steps. In a "does the solution meet the goal" series, the same scenario comes back with a different solution each time, and you can't go back to a previous question of the series. Questions with several elements usually give one point per correct element.

If the exam isn't available in your language, you can request 30 extra minutes. A failed attempt can be retaken after 24 hours.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences: a fictional company, an application or agent, then one or two constraints that decide the answer. Underline the constraint first; it usually eliminates half the options.

| Words in the question | Think of |
| --- | --- |
| "without storing keys", "keyless", "no secrets in code" | Managed identity or `DefaultAzureCredential` with Microsoft Entra ID and an RBAC role |
| "no traffic over the public internet" | Private endpoints, public network access disabled |
| "lowest cost", "results within 24 hours", "millions of documents overnight" | Batch deployment (50 % cheaper than Global Standard) |
| "guaranteed throughput", "consistent latency" | Provisioned throughput (PTU) |
| "data must stay in the EU" | Data Zone deployment (or Standard for one geography) |
| "HTTP 429" | Rate limit or quota reached: retry with back-off, raise TPM, add capacity |
| "answer from the company's documents", "cite sources" | Retrieval-augmented generation (grounding), not a parameter change |
| "exact product codes and natural-language questions" | Hybrid search (keyword plus vector) |
| "best results first", "re-rank" | Semantic ranker |
| "remember the user's preferences across sessions" | Agent memory, not conversation history |
| "call our order API" | Function calling, OpenAPI tool or MCP tool |
| "a person approves before the action runs" | Tool approval, human in the loop |
| "measure groundedness", "detect fabrications" | Evaluator, not a content filter |
| "see each step of the agent run" | Tracing (OpenTelemetry, Application Insights) |
| "fields from invoices or forms" | Azure Content Understanding analyzer |
| "change only the sky in this image" | Mask-based edit (inpainting), not a new generation |

Code questions show Python with one or several blanks: the client to create, the method to call, the parameter that carries the deployment name, the tool definition or the credential. Read every snippet of this course until you can say what each line does. Python code in this course is shown in plain-text blocks.

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Quota | Rate limit | Quota is the TPM a subscription may allocate per region, model and deployment type; the rate limit is what one deployment enforces at run time from the TPM assigned to it |
| Provisioned throughput | Standard deployment | Provisioned reserves capacity billed per PTU and per hour; Standard is pay-per-token, best effort |
| Vector search | Hybrid search | Vector compares meaning only; hybrid runs keyword and vector queries in parallel and merges the results |
| Hybrid search | Semantic ranker | Hybrid retrieves; the semantic ranker re-scores the top results of a query |
| RAG | Generation parameters | RAG brings missing knowledge; temperature or top_p only change how the model writes |
| Function calling | Knowledge tool | Function calling performs an action in your code; a knowledge tool retrieves content to ground the answer |
| Conversation history | Agent memory | History is the current conversation; memory keeps distilled facts across sessions |
| Content filter | Evaluator | A filter blocks harmful input or output at run time; an evaluator scores quality or safety on a dataset or on traffic |
| Evaluator | Tracing | An evaluator gives a score; a trace shows the steps, calls, tokens and latency of one run |
| Single agent | Multi-agent orchestration | One agent with several tools is simpler; several agents fit separate roles, permissions or models |
| Content Understanding analyzer | Multimodal prompt | An analyzer returns a fixed schema with confidence and grounding; a prompt returns free text |
| Mask-based edit | New generation | A mask changes only the selected area; a new prompt regenerates the whole image |
| Foundry resource | Foundry project | The resource holds governance, networking and model deployments; a project isolates the work of a team |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the planning module (services, setup, monitoring, security, responsible AI) gives the vocabulary that the other modules assume.
2. Create a Foundry project in a test subscription, deploy a chat model and an embedding model, and build one agent with a knowledge tool and a function. Doing it once makes the setup and ordering questions easy.
3. Run every Python snippet of this course with `DefaultAzureCredential`, and change one parameter at a time to see its effect.
4. Practise finding a page on Microsoft Learn quickly (deployment types, quotas, built-in roles, agent tools): during the exam this is your reference.
5. After each module, take a mock exam and reread the sections linked to your mistakes.
6. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
