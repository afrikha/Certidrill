Generative AI creates new content from a prompt. To read the exam's questions you need its building blocks (tokens, embeddings, transformers, foundation models), its typical use cases, the lifecycle of a foundation model, how token-based pricing affects cost and speed, how the context given to a model is engineered and the basic concepts of agentic AI.

<!-- section: genai-building-blocks | objectives: 2.1.1 -->
## Foundational GenAI concepts

| Concept | Definition |
| --- | --- |
| **Token** | The unit of text a model reads and writes: a word, part of a word or a punctuation mark. Prompts, responses, limits and prices are counted in tokens |
| **Context window** | The maximum number of tokens a model can take into account in one request, prompt and response together |
| **Chunking** | Splitting long documents into smaller pieces (chunks) before creating embeddings, so that only relevant pieces are retrieved and fit in the context window |
| **Embedding** | A numerical representation of the meaning of a text, image or other item, produced by an embeddings model: items with similar meaning get vectors that are close together |
| **Vector** | The ordered list of numbers that stores an embedding; a vector database finds the nearest vectors to a query (semantic search) |
| **Prompt engineering** | Writing and structuring the input (instructions, context, examples) to get better output without changing the model |
| **Transformer** | The neural network architecture behind modern LLMs: its self-attention mechanism weighs the relation of every token to every other token and processes the sequence in parallel |
| **Large language model (LLM)** | A transformer-based model trained on massive text to predict the next token, which lets it answer, summarize, translate and write |
| **Foundation model (FM)** | A large model pre-trained on broad, mostly unlabeled data that can be adapted to many tasks; LLMs are one kind of FM |
| **Multimodal model** | A model that accepts or produces several types of data, for example text and images in, text out |
| **Diffusion model** | A model that generates images (or video, audio) by starting from random noise and removing it step by step, guided by the prompt; Stable Diffusion models are an example on Amazon Bedrock |

> **Exam trap.** Embeddings are not compressed copies of text: they capture meaning. "Find documents that mean the same as the question even with different words" is semantic search with embeddings in a vector store, not keyword search.

<!-- section: genai-use-cases | objectives: 2.1.2 -->
## Use cases for GenAI

| Use case | Example |
| --- | --- |
| Image, video and audio generation | Product images for a catalog, short marketing videos, voice-overs |
| Summarization | Summaries of call transcripts, long reports or legal contracts |
| AI assistants | An internal assistant that answers employees' questions in natural language |
| Translation | Translating and localizing content with the right tone |
| Code generation | Generating, explaining and testing code from a description |
| Customer service agents | Agents that answer, look up orders and resolve requests around the clock |
| Search | Answers in natural language from a company's documents, with citations |
| Recommendation engines | Personalized product descriptions and suggestions generated per customer |

<!-- section: fm-lifecycle | objectives: 2.1.3 -->
## The FM lifecycle

| Stage | What happens |
| --- | --- |
| 1. **Data selection** | Choose and curate large, diverse, high-quality training data; remove harmful, duplicate or unlicensed content |
| 2. **Model selection** | Choose the architecture and size, or, for most companies, choose an existing FM that fits the task, cost and latency |
| 3. **Pre-training** | Self-supervised training on huge unlabeled data gives the model general knowledge; very costly, done by model providers |
| 4. **Fine-tuning** | Further training on smaller, task-specific or domain data, often labeled, adapts the model |
| 5. **Evaluation** | Measure quality, safety and bias with benchmarks, metrics and human review |
| 6. **Deployment** | Serve the model for inference through an API or endpoint |
| 7. **Feedback** | Collect user feedback and monitoring results to improve prompts, data or the model in the next iteration |

> **Exam trap.** Pre-training always comes before fine-tuning; evaluation comes before deployment, and feedback closes the loop. A company that uses Amazon Bedrock starts at model selection: the provider has already done data selection and pre-training.

<!-- section: token-pricing | objectives: 2.1.4 -->
## Token-based pricing

With on-demand inference, Amazon Bedrock charges per input token and per output token, at a rate per million tokens that depends on the model and the Region. Output tokens usually cost more than input tokens. The consequences:

| Driver | Effect on cost | Effect on performance |
| --- | --- | --- |
| Long prompts (instructions, retrieved documents, chat history) | More input tokens billed on every request | Higher latency before the first token |
| Long responses | More output tokens billed | Generation time grows with the number of output tokens |
| Maximum length (max tokens) setting | Caps the output tokens, and so the cost, of each response | Shorter answers return faster, but can be cut off |
| Larger, more capable model | Higher price per token | Often slower; better on complex tasks |
| Prompt caching of a repeated prefix | Cached input tokens are billed at a reduced rate | Lower latency for requests that reuse the prefix |
| Batch inference | Lower price than on-demand for select models | Results arrive later, asynchronously |

Images, audio and video are also converted into tokens or billed per unit by multimodal models. Reducing tokens (concise prompts, only the relevant chunks, summarized history) lowers both cost and latency.

<!-- section: context-engineering | objectives: 2.1.5 -->
## Context engineering

A model knows only its training data and what is in its context window at the moment of the request. **Context engineering** is the design of everything placed in that window on each call, while prompt engineering focuses on the wording of the instructions. The context of an FM application can hold:

- the system instructions (role, rules, output format) and a few examples;
- knowledge retrieved for this request (RAG chunks, database results);
- the conversation history and memory of earlier sessions;
- tool definitions and the results of tool calls;
- the user's input.

Good context engineering selects only relevant information, orders and structures it, summarizes or trims old history, keeps static parts at the start so that they can be cached and stays within the token budget. Too little context causes hallucinations; too much raises cost and latency and can bury the important facts. It matters most for agents, whose context grows with every step.

<!-- section: agentic-concepts | objectives: 2.1.6 -->
## Agentic AI concepts

An **AI agent** combines a foundation model with tools, memory and a loop: it reasons about the goal, chooses an action, calls a tool, observes the result and repeats until the task is done.

| Concept | What it means |
| --- | --- |
| **Tool usage** | The model decides to call a function or API (search, database, calculator, business system), receives the result and uses it in its next step |
| **Memory management** | Short-term memory keeps the current session's conversation and state; long-term memory keeps facts and preferences across sessions, often summarized and retrieved when relevant |
| **Model Context Protocol (MCP)** | An open standard that connects agents to external systems in one consistent way: an MCP server exposes tools, data resources and prompts, and any MCP-compatible agent (the client) can discover and use them without custom integration code |
| **Workflow orchestration** | Coordinating steps: a predefined workflow runs fixed steps in order; an agent plans its steps dynamically; both can include human approval for sensitive actions |
| **Multi-agent system patterns** | Several specialized agents solve a complex task: a supervisor (orchestrator) delegates to worker agents, which can be exposed as tools; a sequential pipeline passes results from agent to agent; a graph defines the paths between agents; a swarm lets peer agents hand off to each other |
| **Multi-agent communication** | Hierarchical (supervisor and workers), peer-to-peer handoffs, a shared memory or state, or a standard protocol such as Agent2Agent (A2A) between agents built with different frameworks |

> **Exam trap.** MCP connects an agent to tools and data sources; A2A connects agents to other agents. Memory is what lets an agent remember a user across sessions; a larger context window alone doesn't persist anything between sessions.

<!-- section: key-points -->
## Key points

- Tokens are the unit of input, output, limits and price; embeddings are vectors that capture meaning; chunking splits documents for retrieval.
- LLMs are transformer-based foundation models; multimodal models handle several data types; diffusion models generate images from noise.
- FM lifecycle: data selection, model selection, pre-training, fine-tuning, evaluation, deployment, feedback.
- Cost and latency grow with input and output tokens: concise prompts, max tokens, prompt caching and batch inference reduce them.
- Context engineering decides what the model sees at each call; agents add tools, memory and orchestration, connected through MCP.
