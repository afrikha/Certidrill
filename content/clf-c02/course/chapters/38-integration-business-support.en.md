This chapter covers three small families of the exam guide: application integration (Amazon SQS, Amazon SNS, Amazon EventBridge), business applications (Amazon Connect, Amazon SES) and customer enablement (AWS Support and the other ways AWS helps you). Questions give one need in a sentence ("decouple", "notify", "react to an event", "contact center", "send email", "get help") and ask for the service or the option that meets it.

<!-- section: integration-services | objectives: 3.8.1 -->
## Application integration services

Integration services let the components of an application exchange information without calling each other directly. Each component can then fail, scale or change on its own: this is **loose coupling**.

| Service | Model | What it does |
| --- | --- | --- |
| **Amazon SQS** (Simple Queue Service) | Queue, **pull** | Stores messages until a consumer polls, processes and deletes them. Each message is processed by one consumer. The queue absorbs bursts and keeps the work when the consumer is slow or offline |
| **Amazon SNS** (Simple Notification Service) | Publish/subscribe, **push** | A publisher sends a message to a **topic**; SNS pushes a copy to every subscriber: SQS queues, AWS Lambda functions, HTTP or HTTPS endpoints, email addresses, SMS text messages, mobile push notifications |
| **Amazon EventBridge** | Event bus, **rules** | Receives **events** from AWS services, your applications and SaaS partner applications; rules match the events by their content and route them to targets (Lambda, SQS, SNS, Step Functions...). EventBridge Scheduler runs tasks on a schedule |
| **AWS Step Functions** | Workflow | Coordinates several steps in order, with branches, retries and error handling |

Points the exam tests:

- **SQS queue types.** Standard queues deliver at least once, in best-effort order, with nearly unlimited throughput. **FIFO** queues keep the exact order and process each message exactly once.
- **Retention.** SQS keeps a message 4 days by default, up to 14 days. A message that fails repeatedly can go to a **dead-letter queue** for analysis.
- **Fan-out.** SNS topic plus several SQS queues: one message reaches several independent systems, each with its own buffer.
- **Serverless.** All four services are fully managed: no server to provision, pay per use.

> **Exam trap.** SQS and SNS are both "messaging", but SQS **holds** messages for one consumer that pulls them, while SNS **pushes** each message to all subscribers immediately and keeps nothing. "Buffer orders until the back end is ready" is SQS; "notify several systems at once" is SNS.

<!-- section: messaging-choice | objectives: 3.8.8 -->
## Choosing a service for messages, alerts and notifications

| Requirement | Service |
| --- | --- |
| Decouple a web tier from a slow processing tier; never lose a request | Amazon SQS |
| Process orders in the exact order they were placed | Amazon SQS FIFO queue |
| Send the same message to several applications at once (fan-out) | Amazon SNS topic, with SQS queues subscribed |
| Send an SMS or an email alert to the operations team when a CloudWatch alarm fires | Amazon SNS (the alarm action publishes to a topic) |
| Push notifications to mobile devices | Amazon SNS |
| Start a Lambda function when an EC2 instance changes state or a new object lands in S3, filtering on event content | Amazon EventBridge rule |
| Receive events from a SaaS application (for example a CRM or a payment provider) | Amazon EventBridge (partner event source) |
| Run a task every night at 2 a.m. | Amazon EventBridge Scheduler |
| Chain several steps with retries and human approval | AWS Step Functions |

> **Exam tip.** The alerting chain is CloudWatch (metric and alarm) → SNS (topic) → email, SMS or a ticketing endpoint. CloudWatch detects; SNS delivers.

<!-- section: business-applications | objectives: 3.8.2, 3.8.9 -->
## Business applications: Amazon Connect and Amazon SES

| Service | What it is | Typical use |
| --- | --- | --- |
| **Amazon Connect** | Cloud **contact center**: phone (voice) and chat with customers, contact flows (interactive voice response), routing to agents, recording, analytics. Pay for what you use, no hardware, no long-term commitment | Set up a customer service center in minutes; scale agents up and down with seasonal demand; route calls by skill |
| **Amazon SES** (Simple Email Service) | Cloud **email** service for applications: sending through the SES API or SMTP, receiving email, sender authentication (DKIM, SPF, DMARC), reputation dashboards | Transactional email (order confirmations, password resets), marketing and bulk email, receiving email into an application |

Decision rules:

- "Customer support center", "call center", "IVR", "agents answering calls and chats": **Amazon Connect**.
- "The application must send personalized emails to customers", "newsletters", "high-volume email": **Amazon SES**.
- "Notify subscribed administrators by email when something happens": **Amazon SNS** email subscriptions. SNS email is simple notifications to people who confirmed a subscription; SES sends fully formatted emails from your domain to any recipient.

> **Exam trap.** Amazon Connect is not a networking service (despite AWS Direct Connect's similar name) and not a chatbot builder: Amazon Lex builds the conversational bots that a Connect contact flow can use.

<!-- section: customer-enablement | objectives: 3.8.3 -->
## Customer enablement services

Customer enablement groups the ways AWS helps customers to use the cloud, beyond the services themselves:

| Option | What it offers |
| --- | --- |
| **AWS Support** plans | Basic (included in every account), AWS Business Support+, AWS Enterprise Support, AWS Unified Operations; technical help from AWS engineers, Trusted Advisor checks, response times by severity |
| **Account and billing support** | Included for every customer, at no charge, in all plans |
| **AWS re:Post** | Community question-and-answer site, with answers from the community and AWS experts, plus the Knowledge Center articles |
| **AWS Professional Services** | AWS consultants who work on your project (migration, modernization) with your team |
| **AWS Partners** | Third-party consulting firms and software vendors validated by AWS |
| **AWS Training and Certification** | Courses (AWS Skill Builder), classroom training and certifications |

Chapter 43 details the Support plans and chapter 44 the partners and technical assistance.

<!-- section: support-choice | objectives: 3.8.10 -->
## Choosing the right assistance

| Need | Option |
| --- | --- |
| A question about an invoice, a charge or an account | Account and billing support (free, every plan) |
| A service quota increase | Service quota increase case (available with Basic Support) |
| A how-to question answered by the community, at no cost | AWS re:Post |
| 24/7 access to cloud support engineers by phone, chat and web for production workloads, at the lowest cost | AWS Business Support+ |
| A designated Technical Account Manager (TAM) and a 15-minute response for business-critical system down | AWS Enterprise Support |
| A 5-minute response from an incident management engineer and a designated TAM plus domain specialist engineers | AWS Unified Operations |
| Experts to deliver a migration project with your team | AWS Professional Services or an AWS Partner |

> **Exam trap.** With Basic Support you can open account, billing and service quota cases, but **not technical support cases**. Any "open a technical case with AWS engineers" requirement needs a paid plan.

<!-- section: key-points -->
## Key points

- SQS: queue, pull, one consumer per message, standard or FIFO, 4 days default and 14 days maximum retention.
- SNS: topic, push to every subscriber (SQS, Lambda, HTTP, email, SMS, mobile push); fan-out with SQS.
- EventBridge: event bus and rules that route events from AWS services, your applications and SaaS partners; Scheduler for schedules.
- CloudWatch alarm → SNS topic is the standard alert path.
- Amazon Connect: cloud contact center. Amazon SES: application email at scale.
- Customer enablement: Support plans, account and billing support, re:Post, Professional Services, Partners, training.
- Basic Support: no technical cases. Business Support+: 24/7 engineers. Enterprise Support: designated TAM. Unified Operations: 5-minute critical response.
