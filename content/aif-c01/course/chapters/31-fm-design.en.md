Designing an application on a foundation model means choosing the model, its inference parameters, whether to ground answers with RAG, where to store embeddings, how far to customize the model and whether an agent should act. The exam asks for the choice that meets the requirement at the lowest cost or effort.

<!-- section: fm-selection-criteria | objectives: 3.1.1 -->
## Criteria to choose a foundation model

| Criterion | What to check |
| --- | --- |
| **Cost** | Price per input and output token; smaller models cost less |
| **Modality** | Input and output types: text, images, documents, audio, video, embeddings |
| **Latency** | Time to first token and to the full answer; small models respond faster |
| **Multilingual** | The languages the model handles well, for both input and output |
| **Model size** | Number of parameters: larger models are usually more capable, slower and more expensive |
| **Model complexity** | Reasoning ability needed: simple extraction versus multistep analysis |
| **Customization** | Whether the model supports fine-tuning, continued pre-training or distillation in Amazon Bedrock |
| **Input/output length** | Context window size for long documents or history; maximum output tokens for long answers |
| **Prompt caching** | Whether the model supports caching of repeated prompt prefixes, which lowers the cost and latency of long, reused context |

> **Exam tip.** "Summarize 300-page reports in one request" requires a model with a large context window. "A chatbot reuses the same long product manual in every request" benefits from a model that supports prompt caching.

<!-- section: inference-parameters | objectives: 3.1.2 -->
## Inference parameters

For each next token, the model computes a probability for every candidate. Inference parameters change which candidates it considers or limit the response:

| Parameter | Effect | Typical setting |
| --- | --- | --- |
| **Temperature** | Low: the model picks high-probability tokens, answers are more consistent and deterministic. High: lower-probability tokens become more likely, answers are more varied and creative | Low for facts, classification, extraction; higher for brainstorming, marketing copy |
| **Top-p** | Keeps only the most likely tokens whose cumulative probability reaches p (0.8 = top 80 % of the probability mass) | Lower for focused output |
| **Top-k** | Keeps only the k most likely tokens (k = 50: choose among the 50 most probable) | Lower for safer, less surprising output |
| **Maximum length (max tokens)** | Caps the number of output tokens | Short for classification or chat replies; long for reports |
| **Stop sequences** | The model stops generating when it produces one of these strings | End a structured answer cleanly |

Input length matters too: a longer prompt costs more and is slower, and a prompt larger than the context window must be shortened. A response cut off mid-sentence means the maximum length is too low.

> **Exam trap.** "Answers must be the same each time and stick to the most likely wording" means lower the temperature (or top-p/top-k), not raise it. Temperature changes randomness, not knowledge: it doesn't fix hallucinations caused by missing information.

<!-- section: rag | objectives: 3.1.3 -->
## Retrieval Augmented Generation (RAG)

RAG retrieves relevant information from an external knowledge source at query time and adds it to the prompt, so that the model answers from current, company-specific data that it was never trained on. The model itself is not changed.

| Phase | Steps |
| --- | --- |
| Ingestion | Load documents from data sources, split them into chunks, convert each chunk into an embedding, store the vectors and text in a vector store |
| Retrieval | Convert the user's question into an embedding, find the most similar chunks (semantic search), optionally rerank them |
| Generation | Add the retrieved chunks to the prompt as context; the FM generates an answer grounded in them, with citations to the sources |

**Amazon Bedrock Knowledge Bases** is the managed RAG of Amazon Bedrock. It connects to data sources such as Amazon S3, Confluence, SharePoint, Google Drive, OneDrive and a web crawler, handles parsing, chunking, embeddings and the vector store, and returns answers with citations. The Retrieve API returns the relevant chunks; RetrieveAndGenerate also produces the answer. It can filter results by document permissions and can query structured data.

Business applications: support assistants grounded in product documentation, employee assistants over HR policies, search over contracts and technical manuals.

> **Exam trap.** "The model must answer from documents that change every week, with citations, without retraining" is RAG with Knowledge Bases, not fine-tuning. Fine-tuning changes the model's behavior and style; it is a poor way to add frequently changing facts.

<!-- section: vector-databases | objectives: 3.1.4 -->
## AWS services to store embeddings

| Service | Vector capability | Choose it when |
| --- | --- | --- |
| **Amazon OpenSearch Service** | Vector search (k-NN) in managed clusters or in OpenSearch Serverless vector search collections; combines vector and keyword (hybrid) search | Low-latency semantic search at scale, hybrid search |
| **Amazon Aurora PostgreSQL** | The pgvector extension stores embeddings next to relational data | The company already uses PostgreSQL and wants vectors and business data in one database |
| **Amazon RDS for PostgreSQL** | The same pgvector extension | Existing RDS for PostgreSQL workloads that add similarity search |
| **Amazon Neptune** | Neptune Analytics combines graph queries with vector search | Relationships between entities matter (GraphRAG, knowledge graphs) |
| **Amazon S3 Vectors** | Vector buckets and vector indexes with subsecond queries, pay for what you use | Large vector datasets at the lowest storage cost, less frequent queries |
| **Amazon DocumentDB** | Vector search in a JSON document database | Applications that already store their data as documents |

Bedrock Knowledge Bases supports OpenSearch Serverless, OpenSearch managed clusters, S3 Vectors, Aurora PostgreSQL and Neptune Analytics, and third-party stores such as Pinecone, Redis Enterprise Cloud and MongoDB Atlas.

<!-- section: customization-costs | objectives: 3.1.5 -->
## Cost tradeoffs of FM customization

From the cheapest to the most expensive to set up:

| Approach | What it changes | Cost profile |
| --- | --- | --- |
| **In-context learning (prompt engineering, few-shot examples)** | Only the prompt | No training cost; each request pays for the extra prompt tokens |
| **RAG** | The context, with retrieved data | Embeddings, vector store and retrieval costs plus longer prompts; no training; data stays current |
| **Fine-tuning** | The model's weights, with labeled task examples (prompt and response pairs) | Labeled data, training per token, monthly storage and hosting of the custom model |
| **Model distillation** | A smaller student model is fine-tuned on a larger teacher's responses | Teacher inference plus student training once, then cheaper and faster inference with accuracy close to the teacher for the use case |
| **Continued pre-training** | The model's weights, with large unlabeled domain data (medical, legal, financial text) | More data and training than fine-tuning, plus storage and hosting |
| **Pre-training from scratch** | Everything: a new model | Massive data, compute and time; rarely justified outside model providers |

Start with prompt engineering, add RAG for knowledge, and customize the model only when behavior, format or domain language still falls short.

> **Exam trap.** "Make a model cheaper and faster for one use case while keeping quality close to a large model" is distillation. "Teach the vocabulary of a domain from unlabeled documents" is continued pre-training. "Labeled examples of the expected answers" is fine-tuning.

<!-- section: ai-agents | objectives: 3.1.6 -->
## The role of AI agents

An AI agent goes beyond answering: it receives a goal, breaks it into steps, decides which tools and data sources to use, calls business systems through APIs, checks the results and continues until the task is done, asking a human for approval when the action is sensitive.

| Business application | What the agent does |
| --- | --- |
| Customer service | Checks an order, applies the return policy and issues a refund |
| Insurance and finance | Collects claim documents, verifies coverage and prepares the decision for an adjuster |
| IT operations | Investigates an alert, queries logs and metrics, proposes or applies a fix |
| Software development | Plans and implements a feature from specifications, runs tests (Kiro) |
| Research and reporting | Searches several sources and writes a cited report (Quick Research) |

On AWS, developers write agents with Strands Agents or another framework and run them on Amazon Bedrock AgentCore; business users use the agents of Amazon Quick.

> **Exam trap.** A chatbot that only answers questions from documents needs RAG. Choose an agent when the scenario requires actions in other systems or several dependent steps.

<!-- section: key-points -->
## Key points

- Choose an FM on cost, modality, latency, languages, size, complexity, customization, input/output length and prompt caching.
- Low temperature, top-p or top-k: consistent output; high: creative output; max tokens caps the length and cost.
- RAG grounds answers in current data without retraining; Bedrock Knowledge Bases manages ingestion, retrieval and citations.
- Vectors live in OpenSearch Service, Aurora or RDS for PostgreSQL (pgvector), Neptune Analytics, S3 Vectors or DocumentDB.
- Customization set-up cost: prompt engineering, RAG, fine-tuning, distillation, continued pre-training, pre-training; distillation then lowers inference cost.
- Agents plan and act with tools; use one when the task needs actions, not only answers.
