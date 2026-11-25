AIP-C01 is the professional exam for developers who put generative AI into production on AWS. Every question describes a company, its GenAI application (an assistant, a RAG search, a document pipeline, an agent), its data and its constraints on latency, cost, accuracy, safety or compliance, then asks for the design that meets all of them. Model training and data science are out of scope: what is tested is how you select, integrate, secure, operate and evaluate foundation models (FMs) with Amazon Bedrock and the services around it. This chapter explains the format, a reading method, the service status traps of November 2026, the option families the exam sets against each other and a study plan.

<!-- section: exam-format -->
## Exam format

| Item | Value |
| --- | --- |
| Certification | AWS Certified Generative AI Developer – Professional |
| Exam code | AIP-C01 (beta closed March 31, 2026; standard exam since) |
| Duration | 180 minutes |
| Questions | 75: 65 scored and 10 unscored, not identified |
| Score | Scaled from 100 to 1,000; 750 passes |
| Scoring model | Compensatory: only the overall score counts, no minimum per domain; no penalty for guessing |
| Price | 300 USD |
| Languages | English, Japanese, Korean, Simplified Chinese; no French version |

The target candidate has two or more years of experience building production applications on AWS or with open-source technologies, and at least one year of hands-on generative AI work. The guide excludes model development and training, advanced ML techniques and data or feature engineering: when an option starts training a model from scratch, it is rarely the answer.

| Domain | Weight | Course module |
| --- | --- | --- |
| Foundation Model Integration, Data Management, and Compliance | 31 % | Chapters 11 to 16 |
| Implementation and Integration | 26 % | Chapters 21 to 25 |
| AI Safety, Security, and Governance | 20 % | Chapters 31 to 34 |
| Operational Efficiency and Optimization for GenAI Applications | 12 % | Chapters 41 to 43 |
| Testing, Validation, and Troubleshooting | 11 % | Chapters 51 to 53 |

Two question types exist. **Multiple choice** has four options and one correct answer. **Multiple response** ends with "Choose two." or "Choose three." and offers five or six options; every selected answer must be correct to earn credit. There is no case study, ordering, matching or lab.

> **Exam tip.** You have 2 minutes 24 seconds per question. Answer every question on the first pass, flag the doubtful ones and keep 20 minutes to revisit them; a blank scores the same as a wrong answer. Certidrill mock exams score all 75 questions.

<!-- section: reading-questions -->
## Reading a GenAI scenario

A stem runs three to seven sentences: a company, its application, the data it uses, its users, the constraints, a qualifier, then "Which solution will meet these requirements?". The four options are complete designs, and each wrong one is a valid AWS design that misses one stated constraint.

1. Read the final question and the qualifier first.
2. List the hard constraints: data residency, latency target, budget, "no code changes", accuracy or grounding, PII, human approval, existing skills.
3. Eliminate each option that breaks a constraint, even if it is otherwise elegant.
4. Apply the qualifier between the survivors.
5. For "Choose two" or "Choose three", check that the selected options work together and that each one is needed.

| Words in the stem | What they usually select |
| --- | --- |
| "LEAST operational overhead" | Managed Bedrock features (Knowledge Bases, Guardrails, Prompt Management, evaluations, AgentCore) over self-hosted models, custom vector code or EC2 fleets |
| "MOST cost-effective" | The smallest model that passes the evaluation, prompt caching, batch inference for offline jobs, the Flex tier or a global cross-Region profile when residency allows |
| "lowest latency" | Streaming responses, a smaller or latency-optimized model, the Priority tier, caching, pre-computation |
| "without changing the application code" | Configuration outside the code: AWS AppConfig, Prompt Management versions, inference profiles, a guardrail attached by configuration |
| "data must stay in the EU" | A geographic (EU) cross-Region inference profile or in-Region inference, never a global profile |
| "reduce hallucinations" | Grounding with RAG, contextual grounding checks, citations, structured outputs, evaluation against a golden dataset |
| "a human must approve" | Step Functions with a callback task token, an approval step before the action |
| "must not see other tenants' data" | Metadata filters set by the application from the caller's identity, or one knowledge base per tenant |

> **Exam trap.** The distractors are rarely wrong services; they are right services used in the wrong place. A guardrail applied only to the output when the stem worries about prompt attacks, a global inference profile for EU-only data, or fine-tuning to add documents that change every day all fail one stated constraint.

<!-- section: service-status -->
## Service status in November 2026

AWS changed the GenAI catalog during 2026, and the exam guide still names services that new customers can no longer use. Certidrill never makes these the answer for a new design:

| Service in the guide | Status | Use instead |
| --- | --- | --- |
| Amazon Bedrock Agents (now Agents Classic) | Closed to new customers since July 30, 2026 | Amazon Bedrock AgentCore, Strands Agents; Knowledge Bases and Guardrails are unaffected |
| Amazon Kendra | Closed to new customers since July 30, 2026 | Bedrock Knowledge Bases with a vector store |
| Amazon Q Business, Q Business Apps | Closed to new customers since July 30, 2026 | Bedrock Knowledge Bases and AgentCore |
| SageMaker AI Clarify, Model Monitor | Closed to new customers since July 30, 2026 | Bedrock evaluations and Guardrails for FMs; CloudWatch metrics and alarms for monitoring |
| SageMaker Ground Truth, Amazon Augmented AI (A2I) | Closed to new customers since July 30, 2026 | Bedrock human evaluation jobs; Step Functions review workflows |
| Amazon Q Developer | New sign-ups closed May 15, 2026; IDE plugins end of support April 30, 2027 | Kiro |
| AWS App Runner | In maintenance | Lambda, Amazon ECS on Fargate |

Renamed services keep working under their new names: **AWS Quick** (Quick Sight is now one of its features), **Data Wrangler** inside SageMaker Canvas, and **Amazon Q Developer in chat applications** (formerly AWS Chatbot).

> **Exam trap.** When a guide skill names a closed service (for example "Amazon Bedrock agent tracing"), the concept is still tested: reasoning traces now come from AgentCore Observability, the trace of a Strands agent or a Step Functions execution history. Choose the current service when an option offers it.

<!-- section: confusing-pairs -->
## Option families the exam sets against each other

| Family | Options | What separates them |
| --- | --- | --- |
| Inference capacity | On-demand, cross-Region inference, Provisioned Throughput, batch inference, SageMaker AI endpoint | Pay per token; route to Regions with capacity through an inference profile; dedicated model units billed by the hour, also used to serve custom models; offline JSONL jobs from S3 at a discount; your own or open-weights model on instances you choose |
| Cross-Region profiles | Geographic, global | Geographic keeps processing inside a geography (US, EU...); global uses any commercial Region for about 10 % savings and needs `aws:RequestedRegion` `unspecified` in SCPs |
| Adding knowledge or behavior | Prompt engineering, RAG, fine-tuning, distillation | Instructions and examples; current or private documents retrieved at query time; a stable style or task learned from labeled examples; a smaller student model trained from a teacher's answers |
| Knowledge retrieval | Bedrock Knowledge Bases, custom RAG on OpenSearch or Aurora pgvector | Managed ingestion, chunking, retrieval and citations with the least code; full control of the index, scoring and query logic |
| Agents | AgentCore, Strands Agents, Step Functions | Managed runtime, gateway, identity, memory and observability for agents of any framework; open-source SDK to write the agent loop; deterministic workflow with approvals, retries and stopping conditions |
| Prompt control | Prompt Management, Bedrock Flows, AppConfig | Versioned, parameterized prompts; chained prompts with conditions and knowledge base or Lambda nodes; runtime switching of model IDs and parameters with gradual rollout and rollback |
| Safety | Guardrails policies | Content filters (including prompt attacks), denied topics, word filters, sensitive information filters (PII), contextual grounding checks, Automated Reasoning checks |
| PII | Guardrails, Amazon Comprehend, Amazon Macie | Block or mask PII in prompts and responses; detect or redact PII in text inside a pipeline; discover sensitive data stored in S3 |
| Evaluation | Bedrock evaluations: automatic, LLM-as-a-judge, human, RAG | Built-in metrics on built-in or custom datasets; a judge model scores quality with explanations; your own reviewers; retrieval and generation quality of a knowledge base |
| Observability | Model invocation logging, CloudTrail, CloudWatch metrics, X-Ray | Full prompts and responses; who called which API; latency, tokens and throttles with alarms; traces across service boundaries |

<!-- section: study-plan -->
## Study plan

1. Read the modules in order: foundation builds the vocabulary of models, data, retrieval and prompts that the other four domains reuse.
2. Build a small lab in one account: call two models through the Converse API, create a knowledge base on an S3 folder, attach a guardrail, version a prompt in Prompt Management, run a Bedrock evaluation job and turn on model invocation logging. Delete everything afterwards.
3. For each chapter, rewrite its decision tables from memory as "requirement, then design"; the exam asks the same decision with different words.
4. Take a mock exam after each module; for every question, including those you got right, name the constraint each wrong option fails.
5. Book the exam when three full 75-question mocks in a row reach 820 or more within 180 minutes on questions you haven't seen before.
