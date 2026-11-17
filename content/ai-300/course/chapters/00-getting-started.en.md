AI-300 is the exam of the Microsoft Certified: Machine Learning Operations Engineer Associate certification. It targets the engineer who builds and runs the platform around models, which the study guide calls AI operations (AIOps): MLOps for traditional machine learning with Azure Machine Learning, and GenAIOps for generative AI applications and agents with Microsoft Foundry. It doesn't test algorithm theory: it tests what you provision, configure, automate and monitor, so most questions show an `az ml` command, a job, component or endpoint YAML file, a Bicep resource, a GitHub Actions workflow or a short Python snippet to choose or complete.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 120 minutes of exam time |
| Questions | Not published; plan for about 40 to 60 |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn is available during the exam, but searching it costs time: use it to confirm a YAML key or a flag, not to learn a topic |
| Interactive components | Announced as possible by Microsoft ("may have interactive components") |
| Language | English; localized versions usually arrive about eight weeks after the English one, and you can request 30 extra minutes when your language isn't available |
| Skills measured | The study guide shows no "skills measured as of" date; its page is dated October 15, 2026 |
| Validity | One year, renewable for free with an online assessment on Microsoft Learn |

Microsoft also offers a free practice assessment on the certification page and an exam sandbox (`aka.ms/examdemo`) to try the exam interface before the day.

The five domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Design and implement an MLOps infrastructure | 15 to 20 % |
| Implement machine learning model lifecycle and operations | 25 to 30 % |
| Design and implement a GenAIOps infrastructure | 20 to 25 % |
| Implement generative AI quality assurance and observability | 10 to 15 % |
| Optimize generative AI systems and model performance | 10 to 15 % |

The two machine learning domains (MLOps infrastructure and model lifecycle) make up close to half of the exam; the three generative AI domains share the other half.

Expected formats: one answer among four or five, several answers ("each correct answer presents part of the solution"), code or YAML blocks with two to four drop-down lists, Yes/No statements, drag and drop, and ordering of steps. In a "does the solution meet the goal" series, the same scenario comes back with a different solution each time, and you can't go back to a previous question of the series. Questions with several elements usually give one point per correct element.

The candidate profile in the study guide expects Python, an entry-level knowledge of DevOps (GitHub Actions, command-line interfaces) and infrastructure as code with Bicep and Azure CLI. This course uses only the current tools: Azure CLI `ml` extension v2 and Python SDK `azure-ai-ml` v2. Python code is shown in plain-text blocks.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences: a fictional company with an existing Azure Machine Learning workspace or Foundry project, then one or two constraints that decide the answer: least privilege, no public network access, no secrets in the pipeline, lowest cost, no downtime. Underline the constraint first; it usually eliminates half the options.

| Words in the question | Think of |
| --- | --- |
| "reuse the same storage path without repeating the URI", "versioned, immutable reference to data" | Data asset (`uri_file`, `uri_folder` or `mltable`) on top of a datastore |
| "connect the workspace to an existing storage account" | Datastore (it never creates storage) |
| "no cost when no job runs" | Compute cluster with `min_instances: 0`, or serverless compute |
| "don't manage any compute" | Serverless compute: omit `compute` in the job |
| "data scientists run jobs but can't create compute" | AzureML Data Scientist role |
| "use the same component in dev, test and prod workspaces" | Azure Machine Learning registry |
| "the workflow must not store a client secret" | OpenID Connect with a federated identity credential, `permissions: id-token: write` |
| "block all outbound traffic except approved destinations" | Managed virtual network in `allow_only_approved_outbound` mode |
| "the workspace must not be reachable from the internet" | Public network access disabled plus a private endpoint |
| "log parameters and metrics, compare runs" | MLflow tracking |
| "score millions of records every night" | Batch endpoint |
| "send 10 % of requests to the new model" | Managed online endpoint with two deployments and a traffic split |
| "test the new model on live traffic without affecting responses" | Mirrored traffic |
| "pay per token, no infrastructure to manage" | Serverless API deployment of a foundation model |
| "guaranteed throughput for a high, steady volume" | Provisioned throughput units |
| "is the answer supported by the retrieved documents?" | Groundedness evaluator |
| "does the answer address the question?" | Relevance evaluator |

Code questions show YAML or Python with blanks: the `type` of an input, the binding expression, the role to assign, the flag that targets a registry instead of a workspace. Read every code block of this course until you can say what each line does.

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Datastore | Data asset | A datastore stores how to connect to an existing storage account; a data asset is a named, versioned reference to a file, folder or table, usually through a datastore |
| `uri_folder` | `mltable` | `uri_folder` points to a folder that your code reads; `mltable` adds a schema and loading steps in an `MLTable` file (tables, AutoML) |
| Compute instance | Compute cluster | An instance is one personal VM for notebooks and development; a cluster is a pool of nodes that scales for jobs |
| Compute cluster | Serverless compute | You create and size a cluster; serverless compute is requested per job and managed by Azure Machine Learning |
| Curated environment | Custom environment | Curated environments are maintained by Microsoft (`AzureML-` prefix in the CLI); custom ones are built from your image, Dockerfile or conda file |
| Workspace asset | Registry asset | A workspace asset is visible in one workspace; a registry asset can be used by every workspace in the registry's regions |
| Archive | Delete | Data asset versions can't be deleted; archiving hides them from lists but keeps them usable |
| Service principal secret | OpenID Connect | A secret is stored in GitHub and expires; OIDC exchanges a short-lived GitHub token through a federated credential |
| Own virtual network | Managed virtual network | You run the network yourself, or Azure Machine Learning creates and runs an isolated network with outbound rules |
| Managed online endpoint | Batch endpoint | Online returns a prediction per request with low latency; batch processes large inputs asynchronously as jobs |
| Blue-green traffic split | Mirrored traffic | A split sends a share of requests to the new deployment and returns its answers; mirroring copies requests to it but never returns its answers |
| Data drift | Prediction drift | Data drift is a change in the distribution of input features; prediction drift is a change in the distribution of model outputs |
| Data drift | Data quality | Drift compares distributions with a baseline; data quality checks nulls, types and out-of-range values |
| Serverless API | Managed compute | Serverless API is billed per token on Microsoft infrastructure; managed compute runs the model on VMs that you pay per hour |
| Pay-as-you-go deployment | Provisioned throughput | Pay-as-you-go bills consumption; provisioned throughput reserves capacity for predictable latency at high volume |
| Groundedness | Relevance | Groundedness checks that the answer is supported by the provided context; relevance checks that it answers the question |
| Prompt engineering | RAG and fine-tuning | Prompt engineering changes instructions; RAG adds retrieved data at run time; fine-tuning changes the model weights with training examples |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the MLOps infrastructure module gives the vocabulary (workspace, datastore, compute, environment, component, registry) that the training, deployment and GenAIOps modules reuse.
2. In a test subscription, create a workspace with `az ml workspace create`, a compute cluster with `min_instances: 0`, a datastore and a data asset, then run a command job from YAML. Change one key at a time and read the error messages.
3. Turn the same job into a two-step pipeline with registered components, then publish an environment and a component to a registry and run the pipeline from a second workspace.
4. Put the YAML files in a GitHub repository and run them from a GitHub Actions workflow that signs in with OpenID Connect.
5. Deploy a model to a managed online endpoint, add a second deployment and split the traffic; then deploy a foundation model in a Foundry project and run an evaluation with built-in evaluators.
6. Practise finding a page on Microsoft Learn quickly (YAML schema reference, CLI reference, evaluator list): during the exam this is your reference.
7. After each module, take a mock exam and reread the sections linked to your mistakes. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
