This chapter sets the vocabulary that every other chapter uses: what AI, ML, deep learning, generative AI and agentic AI are and how they nest, how a trained model is used for inference, which kinds of data models consume and the three ways a model learns. The exam gives a short scenario and asks you to name the concept, the type of inference or the type of learning.

<!-- section: ai-terms | objectives: 1.1.1 -->
## Basic AI terms

| Term | Definition |
| --- | --- |
| **Artificial intelligence (AI)** | The broad field of systems that perform tasks associated with human intelligence: perceiving, reasoning, learning, deciding |
| **Machine learning (ML)** | A branch of AI where a system learns patterns from data instead of following rules written by hand |
| **Algorithm** | The procedure that learns from data (for example linear regression, decision tree, k-means) |
| **Model** | The result of training an algorithm on data: learned parameters that turn an input into a prediction |
| **Training** | Feeding data to an algorithm so that it adjusts the model's parameters |
| **Inference** | Using a trained model to make a prediction or generate output from new input |
| **Neural network** | Layers of connected nodes (neurons) whose weights are adjusted during training |
| **Deep learning** | ML with neural networks of many layers; it learns features by itself from images, audio and text |
| **Computer vision** | AI that interprets images and video: classify, detect objects, read text, recognize faces |
| **Natural language processing (NLP)** | AI that understands and produces human language: sentiment, entities, translation, summaries |
| **Large language model (LLM)** | A very large deep learning model trained on huge amounts of text that understands and generates language |
| **Generative AI (GenAI)** | AI that creates new content (text, images, audio, video, code) rather than only classifying or predicting |
| **Agentic AI** | AI systems that pursue a goal autonomously: they plan steps, call tools and act, with limited human input |

Three terms describe the quality of a model:

- **Fit** is how well the model captures the real pattern. **Overfitting**: excellent on the training data, poor on new data (the model memorized noise; high variance). **Underfitting**: poor on both (the model is too simple or trained too little; high bias). A good fit generalizes to data it has never seen.
- **Bias** has two meanings. In ML statistics it is a systematic error that causes underfitting. In responsible AI it is an unfair difference in outcomes between groups, often caused by unrepresentative training data.
- **Fairness** is the goal that a model's outcomes don't disadvantage people because of attributes such as gender, age or ethnicity.

> **Exam trap.** "Training accuracy is 99 % but accuracy on new data is 70 %" is overfitting. Fixes: more and more varied training data, a simpler model, regularization or early stopping. Training longer makes overfitting worse.

<!-- section: ai-ml-genai-differences | objectives: 1.1.2 -->
## How AI, ML, deep learning, GenAI and agentic AI relate

Each term is a subset of the previous one, except agentic AI, which is a way of using models:

| Level | What it adds | Example |
| --- | --- | --- |
| AI | Any technique that mimics intelligent behavior, including fixed rules | A rules engine that approves expense reports |
| ML | Learns from data | A model that predicts customer churn from history |
| Deep learning | Many-layer neural networks, works on unstructured data | A model that detects defects in product photos |
| Generative AI | Deep learning models (foundation models) that generate new content | An assistant that drafts product descriptions |
| Agentic AI | A model that reasons, plans, uses tools and acts toward a goal | An agent that reads a support ticket, checks the order system and issues a refund |

Similarities: all of them rely on data and on models; ML, deep learning and GenAI are trained and then used for inference. Differences: traditional ML predicts or classifies from mostly structured data and usually needs one model per task; generative AI uses one large pretrained foundation model for many tasks; agentic AI wraps a model in a loop of reasoning, tool calls and memory so that it completes multistep tasks, not just one response.

<!-- section: inference-types | objectives: 1.1.3 -->
## Types of inference

How you serve predictions depends on latency needs, payload size and traffic. Amazon SageMaker AI offers one option for each pattern:

| Type | How it works | Choose it when | SageMaker AI option |
| --- | --- | --- | --- |
| **Real-time** | A persistent endpoint answers each request in milliseconds | Interactive, low-latency use: fraud check during payment, product recommendations on a page | Real-time inference endpoint |
| **Serverless** | The endpoint scales automatically and down to zero when idle; you pay per use | Intermittent or unpredictable traffic with idle periods that can tolerate cold starts | Serverless Inference |
| **Asynchronous** | Requests are queued; input and output are in Amazon S3; optional Amazon SNS notification | Large payloads (up to 1 GB) or long processing (up to one hour) with near real-time needs | Asynchronous Inference (can scale to zero) |
| **Batch** | A job processes a whole dataset at once, with no persistent endpoint | Predictions for many records on a schedule, results not needed immediately: nightly scoring of all customers | Batch transform |

Serverless Inference doesn't support GPUs. Amazon Bedrock offers the same distinction for foundation models: on-demand calls for interactive use and batch inference jobs for large offline workloads at a lower price.

> **Exam trap.** "Results needed in milliseconds" is real-time; "large files, minutes of processing, notify when done" is asynchronous; "score the whole dataset every night" is batch; "a few requests a day, minimize cost, cold starts acceptable" is serverless.

<!-- section: data-types | objectives: 1.1.4 -->
## Types of data

| Type | What it is | Typical use |
| --- | --- | --- |
| **Labeled** | Each example has the correct answer (the label or target) | Supervised learning: emails marked spam or not spam |
| **Unlabeled** | Examples without answers | Unsupervised learning, pre-training of foundation models |
| **Structured** | Organized in a fixed schema of rows and columns | Databases, spreadsheets |
| **Tabular** | Structured data in a table: each row a record, each column a feature | Customer records for churn prediction |
| **Time-series** | Values recorded in time order at intervals | Sales per day for forecasting, sensor readings |
| **Unstructured** | No predefined schema | Free text, images, audio, video |
| **Text** | Unstructured language data | Reviews, support tickets, contracts |
| **Image** | Pixels, unstructured | Product photos, medical scans, scanned documents |

Semi-structured data (JSON, logs) has tags but no rigid schema. Labeling is often the most expensive step of a supervised project because humans must provide the answers.

<!-- section: learning-types | objectives: 1.1.5 -->
## Types of learning

| Type | Data | How it learns | Examples |
| --- | --- | --- | --- |
| **Supervised learning** | Labeled | Learns the mapping from inputs to known outputs | Classification (spam detection, image labels), regression (house prices) |
| **Unsupervised learning** | Unlabeled | Finds structure by itself | Clustering (customer segments), anomaly detection, dimensionality reduction |
| **Reinforcement learning (RL)** | No dataset: an environment | An agent takes actions, receives rewards or penalties and learns the policy that maximizes the total reward | Robotics, game playing, route optimization, autonomous driving in simulation |

Two variants appear around foundation models. **Self-supervised learning** creates labels from the data itself (predict the next word of a sentence): it is how LLMs are pre-trained on unlabeled text. **Reinforcement learning from human feedback (RLHF)** uses human rankings of model answers as the reward to align a model with human preferences. **Semi-supervised learning** combines a few labeled examples with many unlabeled ones.

> **Exam trap.** "Historical transactions marked fraudulent or legitimate" is supervised learning even if the goal is "detect fraud". "Find unusual transactions with no examples of fraud" is unsupervised (anomaly detection). "Learns from rewards by trial and error" is reinforcement learning, never supervised.

<!-- section: key-points -->
## Key points

- AI contains ML, which contains deep learning, which contains generative AI; agentic AI uses models to plan and act with tools.
- A model is the output of training an algorithm on data; inference uses it on new data.
- Overfitting: great on training data, poor on new data. Underfitting: poor on both.
- Inference: real-time (milliseconds), serverless (intermittent, scales to zero), asynchronous (large payloads, long processing, queued), batch (whole dataset, no endpoint).
- Supervised needs labels, unsupervised finds structure without labels, reinforcement learns from rewards.
