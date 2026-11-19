AWS offers AI and machine learning at two levels: ready-to-use AI services that you call through an API with no ML expertise, and Amazon SageMaker AI to build your own models. Analytics services ingest, catalog, query and visualize data. The exam gives you a task (detect faces, convert speech to text, query files in S3, build a dashboard) and asks which service accomplishes it.

<!-- section: ai-ml-services | objectives: 3.7.1, 3.7.3 -->
## AWS AI/ML services and the tasks they accomplish

| Task | Service |
| --- | --- |
| Build, train and deploy custom machine learning models | **Amazon SageMaker AI** |
| Conversational interfaces (chatbots) with voice and text | **Amazon Lex** |
| Turn text into lifelike speech | **Amazon Polly** |
| Convert speech to text (transcription of calls, subtitles) | **Amazon Transcribe** |
| Translate text between languages | **Amazon Translate** |
| Find sentiment, entities, key phrases, language or personal data in text | **Amazon Comprehend** |
| Detect objects, people, faces, text and unsafe content in images and videos | **Amazon Rekognition** |
| Extract printed and handwritten text, forms and tables from scanned documents | **Amazon Textract** |
| Generative AI assistant for software development | **Amazon Q Developer** |

- **AI services** (Lex, Polly, Transcribe, Translate, Comprehend, Rekognition, Textract) use models trained by AWS: you send data through an API and get a result. Choose them for the least effort.
- **Amazon SageMaker AI** is for data scientists and developers who need their own model: it covers preparing data, training, tuning, deploying and monitoring models.
- **Amazon Q Developer** helps developers understand, build, extend and operate AWS applications: code chat, inline code suggestions, security scanning and code upgrades in the IDE and on the command line. In the AWS Management Console, its conversational experience is now called the AWS assistant.
- **Amazon Q Business** is no longer open to new customers; AWS points them to Amazon Quick.

| Pair that the exam mixes up | How to tell them apart |
| --- | --- |
| Polly and Transcribe | Polly: text to speech. Transcribe: speech to text |
| Lex and Polly | Lex understands a conversation (intent); Polly only speaks |
| Textract and Rekognition | Textract: documents, forms, tables. Rekognition: images and videos, faces and objects |
| Comprehend and Translate | Comprehend analyzes the meaning of text; Translate changes its language |

> **Exam trap.** "Analyze customer reviews for sentiment with the least effort" is Amazon Comprehend, not a model built in SageMaker AI. Choose SageMaker AI only when the company must build or train its own model.

<!-- section: analytics-services | objectives: 3.7.2, 3.7.4 -->
## AWS analytics services

| Service | What it does | Choose it when |
| --- | --- | --- |
| **Amazon Athena** | Serverless, interactive SQL queries directly on data in Amazon S3; you pay for the queries you run | Ad hoc analysis of logs or a data lake without loading data or managing servers |
| **Amazon Kinesis** | Collects and processes streaming data in real time (Kinesis Data Streams); the related Amazon Data Firehose delivers streams to S3, Redshift or OpenSearch | Clickstreams, IoT telemetry, application logs analyzed as they arrive |
| **AWS Glue** | Serverless data integration: crawlers discover data, the Data Catalog stores table definitions, ETL jobs transform data | Prepare and transform data (extract, transform, load) without clusters |
| **Amazon Quick** | AI-powered service evolved from Amazon QuickSight; its Quick Sight feature provides interactive dashboards and business intelligence, embedded in applications if needed | Business users need dashboards and visualizations |
| **Amazon EMR** | Managed big data frameworks such as Apache Spark and Hadoop | Large-scale processing with open-source big data tools |
| **Amazon Redshift** | Cloud data warehouse for SQL analytics on large structured data sets | Reporting over years of data consolidated from many sources |
| **Amazon OpenSearch Service** | Search and log analytics | Full-text search, log and operational analytics |

A typical analytics pipeline:

| Step | Services |
| --- | --- |
| Ingest | Kinesis (streaming), DMS (databases), file transfers into S3 |
| Store | Amazon S3 data lake, Amazon Redshift |
| Catalog and transform | AWS Glue |
| Query and process | Athena, EMR, Redshift |
| Visualize | Amazon Quick |

The AWS documentation now titles the service AWS Quick; the exam guide uses the name Amazon Quick, and older material calls the BI feature Amazon QuickSight.

> **Exam trap.** Athena queries data where it already is, in S3, with standard SQL; Redshift is a warehouse you load data into; Glue prepares data but doesn't build dashboards; Quick visualizes but doesn't store the data lake. "Real time" or "streaming" points to Kinesis.

<!-- section: key-points -->
## Key points

- AI services by input: text to speech (Polly), speech to text (Transcribe), language (Translate), meaning of text (Comprehend), images and videos (Rekognition), documents (Textract), chatbots (Lex).
- SageMaker AI builds, trains and deploys custom models; the AI services need no ML expertise.
- Amazon Q Developer assists developers; Amazon Q Business no longer accepts new customers.
- Athena: serverless SQL on S3. Kinesis: real-time streaming. Glue: serverless ETL and Data Catalog. Quick: dashboards and BI. EMR: Spark and Hadoop. Redshift: data warehouse. OpenSearch Service: search and log analytics.
