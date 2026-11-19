AI is worth using when it does something faster, at a larger scale or better than people or fixed rules, and when the business accepts a probabilistic answer. This chapter covers where AI/ML adds value and where it doesn't, which ML technique fits a problem, typical real-world applications, the AWS managed AI services and how to choose between a traditional ML model and a foundation model.

<!-- section: ai-value | objectives: 1.2.1 -->
## Where AI/ML provides value

| Value | What it means | Example |
| --- | --- | --- |
| **Assist human decision making** | The model gives a score or a recommendation; a person decides | A risk score helps an underwriter review a loan; a model flags scans for a radiologist |
| **Solution scalability** | The same model handles ten or ten million requests without hiring | Moderating every uploaded image instead of a sample |
| **Automation** | Repetitive tasks run without human work | Extracting fields from invoices, routing support emails, transcribing calls |
| **Finding patterns** | Relationships too complex for hand-written rules | Fraud patterns across millions of transactions |
| **Personalization** | A different answer for each user | Product recommendations, tailored content |

AI/ML fits when there is enough relevant data, the pattern is hard to express as rules and an occasional wrong answer is acceptable or can be reviewed.

<!-- section: when-not-ai | objectives: 1.2.2 -->
## When AI/ML is not appropriate

- **The outcome must be exact and deterministic.** Calculating a tax, applying a fixed discount or checking that a field is not empty needs a rule or a formula, not a prediction. A model always gives a probable answer, never a guaranteed one.
- **The cost-benefit analysis is negative.** Collecting and labeling data, training, hosting, monitoring and retraining cost more than the value of the prediction, or a simple rule already performs well enough.
- **There is not enough good data**, or the data is biased and can't be corrected.
- **Every decision must be fully explained**, and the candidate model can't be explained well enough for the regulator.
- **The problem changes faster than you can retrain**, or errors would be unacceptable without human review.

> **Exam trap.** "The company needs the same, exact result every time from a known formula" means AI/ML is not appropriate. Don't choose a more powerful model: choose a rule-based or conventional program.

<!-- section: ml-techniques | objectives: 1.2.3 -->
## Choosing an ML technique

| Technique | Output | Learning type | Examples |
| --- | --- | --- | --- |
| **Regression** | A continuous number | Supervised | House price, delivery time, energy consumption |
| **Binary classification** | One of two classes | Supervised | Spam or not, fraud or legitimate, churn or stay |
| **Multiclass classification** | One of several classes | Supervised | Ticket category, product type in a photo |
| **Clustering** | Groups of similar items, discovered without labels | Unsupervised | Customer segments, grouping similar documents |
| **Anomaly detection** | Items that don't fit the normal pattern | Usually unsupervised | Unusual card transactions, faulty sensor readings |
| **Forecasting** | Future values of a time series | Supervised on historical data | Next month's sales per store |
| **Recommendation** | Items a user is likely to want | Supervised or collaborative filtering | "Customers who bought this also bought" |

> **Exam trap.** "Predict whether" is classification; "predict how much" or "how many" is regression. "Segment customers into groups we don't know in advance" is clustering; if the groups are known and labeled, it is classification.

<!-- section: real-world-applications | objectives: 1.2.4 -->
## Real-world AI applications

| Application | What the model does | Example |
| --- | --- | --- |
| **Computer vision** | Detects objects, faces, text and unsafe content in images and video | Quality inspection on a production line, content moderation |
| **NLP** | Understands text: sentiment, entities, language, classification | Analyzing customer reviews, routing emails |
| **Speech recognition** | Converts speech to text | Call center transcripts, subtitles |
| **Recommendation systems** | Ranks items for each user | Products, videos, articles |
| **Fraud detection** | Scores transactions or accounts for risk | Card payments, fake account sign-ups |
| **Forecasting** | Predicts future values from history | Demand planning, staffing |
| **Knowledge bases** | Answers questions from a company's own documents (search and generative answers) | Employee assistant over HR policies |
| **Agentic AI** | Plans and performs multistep tasks with tools | An agent that books travel within the company policy |

<!-- section: aws-ai-services | objectives: 1.2.5 -->
## AWS managed AI/ML services

The managed AI services use models trained and operated by AWS: you call an API and get a result, with no ML expertise and no infrastructure.

| Service | Capabilities |
| --- | --- |
| **Amazon SageMaker AI** | Fully managed service to build, train, tune, deploy and monitor your own ML models; includes SageMaker Canvas (no-code ML), JumpStart (pretrained models) and managed endpoints |
| **Amazon Transcribe** | Speech to text, for batch files or real-time streams; speaker identification, custom vocabularies, removal of personal data from transcripts |
| **Amazon Translate** | Neural machine translation of text and documents, real-time or batch; custom terminology for brand and product names |
| **Amazon Comprehend** | NLP on text: entities, key phrases, language, sentiment and targeted sentiment, syntax, personal data (PII) detection; custom classification and custom entity recognition |
| **Amazon Lex** | Conversational interfaces (chatbots and voice bots): recognizes the intent of a request and collects the details it needs (slots) |
| **Amazon Polly** | Text to lifelike speech in many languages and voices |
| **Amazon Rekognition** | Image and video analysis: objects, faces, text, unsafe content |
| **Amazon Textract** | Extracts printed and handwritten text, forms and tables from scanned documents |
| **Amazon Personalize** | Real-time personalized recommendations from user interaction data |

Comprehend topic modeling and event detection are closed to new customers, and Amazon Kendra is no longer open to new customers: for a new search or question-answering project over company documents, choose Amazon Bedrock Knowledge Bases.

> **Exam trap.** Transcribe is speech to text, Polly is text to speech. Lex understands a conversation; it uses speech recognition but is not a transcription service. Translate changes the language of a text; Comprehend analyzes its meaning.

<!-- section: traditional-vs-fm | objectives: 1.2.6 -->
## Traditional ML model or foundation model

| Criterion | Traditional ML model | Foundation model (FM) |
| --- | --- | --- |
| Data | Structured, tabular, labeled data for one task | Unstructured text, images or audio; little or no labeled data |
| Task | One narrow prediction (score, class, number) | Many tasks: generate, summarize, answer, converse |
| Explainability | Simpler models (linear models, decision trees) are interpretable; feature importance can be shown | Billions of parameters, hard to explain why an answer was produced |
| Regulatory concerns | Easier to document, audit and justify for credit, insurance or hiring decisions | Harder to justify individual decisions; risk of hallucination |
| Operational constraints | Small, cheap, fast, can run at the edge with very low latency | Higher cost per request and latency; needs large compute or a managed API |
| Time to first result | Needs data collection and training | Immediately usable through prompts |

> **Exam tip.** "Regulators require the company to explain every loan decision" points to an interpretable traditional model. "Generate personalized marketing text in many languages without training data" points to a foundation model on Amazon Bedrock.

<!-- section: key-points -->
## Key points

- AI/ML adds value for decision support, scale, automation, pattern finding and personalization.
- Don't use AI/ML when an exact, deterministic result is required or when costs exceed benefits.
- Regression predicts a number, classification a category, clustering finds groups without labels.
- Transcribe (speech to text), Polly (text to speech), Translate (language), Comprehend (meaning of text), Lex (chatbots), Rekognition (images), Textract (documents), Personalize (recommendations), SageMaker AI (your own models).
- Explainability, regulation and tight latency or cost favor traditional ML; unstructured, multitask, generative needs favor foundation models.
