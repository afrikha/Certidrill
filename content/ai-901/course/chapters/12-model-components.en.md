A generative AI solution starts with three choices: a model, a deployment and a few parameters. The exam checks that you understand what a model does with a prompt, that you can match a type of model to a need, and that you know what each deployment option and each parameter changes.

<!-- section: how-generative-models-work | objectives: 1.2.1 -->
## How generative AI models work

A large language model (LLM) is trained on huge volumes of text to generate a **completion** from a **prompt**. It works like predictive text: it predicts the most probable next token, appends it to the sequence and repeats until it predicts that the sequence has ended.

| Step | What happens |
| --- | --- |
| **Tokenization** | The text is split into tokens: whole words, sub-words, punctuation. Each token has a numeric identifier |
| **Embeddings** | Each token is represented by a vector, an array of numbers that encodes its meaning. Tokens used in similar contexts have vectors that point in similar directions: "dog" is close to "puppy" and far from "skateboard" |
| **Attention** | The transformer architecture weighs how much each token of the sequence influences the others. In "I heard a dog bark", "heard" and "dog" count more than "I" or "a" to predict "bark" |
| **Prediction** | From the tokens so far, the model computes the most probable next token |

What follows from this:

- **A token is the unit of work.** Limits, rate limits and consumption are counted in tokens, for the prompt and for the answer.
- **Generation is probabilistic.** The same prompt can produce slightly different wording from one call to the next.
- **The model predicts plausible text; it doesn't look up facts.** It can be wrong, and it only knows its training data unless the prompt brings more context. Retrieving documents and adding them to the prompt is retrieval-augmented generation (RAG): the answer is then **grounded** in that information.
- **Training and inference are different moments.** Training adjusts the model on data; inference is using the trained model to generate an answer.

Small language models (SLMs) such as Phi-4 work the same way with fewer resources. A **foundation model** is a large pretrained model with general capabilities that can be used as soon as it is deployed.

<!-- section: choosing-a-model | objectives: 1.2.2 -->
## Choosing a model by its capabilities

The Foundry **model catalog** lists models from Microsoft, OpenAI and many other providers. Each entry gives the capabilities of the model, benchmark results and a model card. Model leaderboards rank models by quality, safety and throughput, and you can test a candidate in a playground.

| Need | Type of model | Examples named by Microsoft Learn |
| --- | --- | --- |
| Conversation, question answering, drafting and summarizing text | Chat (text-generation) model | GPT-4.1, GPT-5 chat models, Claude, Mistral Large |
| Multi-step reasoning, planning, agents that chain tools | Reasoning model | GPT-5 family |
| High volume, low latency or low cost; lightweight applications | Smaller model or SLM | "mini" and "nano" variants, Phi-4 |
| Semantic search, comparing the meaning of texts | Embedding model | text-embedding-3-small |
| Prompts that contain images or audio as well as text | Multimodal model | GPT-4.1, Phi-4-multimodal-instruct |
| Creating an image from a description | Image-generation model | GPT-Image-1 family, FLUX |
| Creating a video | Video-generation model | Sora |
| One well-defined task with predictable, structured output | A Foundry Tool instead of a catalog model | Azure Language, Azure Speech, Azure Content Understanding |

> **Exam trap.** An embedding model returns vectors, not text: it can't hold a conversation. A chat model that only accepts text can't describe an image; the model must be multimodal. Read the capability the question requires before looking at model names.

<!-- section: deployment-options | objectives: 1.2.3 -->
## Deployment options

A model must be deployed before an application can call it. Deploying allocates compute, creates an API endpoint, fixes the configuration (model version, safety settings) and starts monitoring of usage, latency, errors and cost. When you deploy, you choose:

- the **deployment name**, which is what code passes as the model to call (by default, the name of the model);
- the **model version**;
- the **deployment type**;
- the **tokens per minute (TPM)** rate limit.

The deployment type decides where requests are processed and how you pay:

| Deployment type | Where data is processed | Billing | Choose it for |
| --- | --- | --- | --- |
| **Global Standard** | Any Azure region | Pay per token | The default: highest quota, broadest availability |
| **Data Zone Standard** | Inside the data zone (US, EU or APAC) | Pay per token | A data zone requirement |
| **Standard** | Inside the Azure geography of the resource | Pay per token | A regional requirement, low to medium volume |
| **Provisioned** (global, data zone or regional) | Same three choices | Reserved provisioned throughput units (PTUs) | Predictable high volume and consistent latency |
| **Batch** (global or data zone) | Same choices | About 50 % cheaper, results targeted within 24 hours | Large jobs that don't need an immediate answer |

A deployment that receives more tokens or requests than its limit allows is **throttled**: the application gets rate-limit errors. Larger prompts and a higher maximum of output tokens consume more of the limit. The remedies are to lower the maximum of output tokens, send fewer concurrent requests or raise the TPM limit.

> **Exam trap.** Batch is cheaper but not real time: never choose it for a chat application. "Keep processing in the EU" points to a data zone deployment, not to Global Standard.

<!-- section: model-parameters | objectives: 1.2.3 -->
## Configuration parameters

Parameters are set in the playground or passed in the request. They change the behavior, the cost and the speed of the model, not the model itself.

| Parameter | Effect | Typical use |
| --- | --- | --- |
| **System instructions** | Set the role, tone and rules of the model for the whole conversation | "You are a support assistant. Answer in three bullet points." |
| **Temperature** | Controls randomness. A low value gives focused, repeatable answers; a high value gives varied, creative ones | Low for facts and extraction; higher for brainstorming or fiction |
| **Top P** | Another way to control randomness | Change temperature or top P, not both at once |
| **Max output tokens** | Caps the length of the answer; also affects token consumption and throttling | Keep costs and response time under control |

> **Exam trap.** Lowering the temperature makes answers more consistent; it doesn't make them shorter and it doesn't guarantee that they are true. Max output tokens cuts the answer when the cap is reached; it doesn't ask the model to be concise. To get a short answer, say so in the instructions.

<!-- section: key-points -->
## Key points

- Prompt in, completion out: tokens, embeddings (vectors of meaning), attention, next-token prediction.
- Generation is probabilistic; grounding the prompt in data (RAG) reduces wrong answers.
- Match the capability: chat, reasoning, small and fast, embeddings, multimodal, image or video generation, or a Foundry Tool for a fixed task.
- A deployment has a name, a version, a type and a TPM limit; code calls the deployment name.
- Global Standard by default; Data Zone or Standard for residency; Provisioned for reserved throughput; Batch for large asynchronous jobs.
- Temperature: variety. Max output tokens: length. System instructions: role and rules.
