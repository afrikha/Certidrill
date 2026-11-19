# Q-aif-c01-1c — report

40 questions in `content/aif-c01/questions/aiml/`, prefix `aifc01-1c-`, 8 per objective (1.3.2–1.3.6).
Types: single 31, multi 5, ordering 2, dragdrop 2. Difficulty: 16 easy / 18 medium / 6 hard.
Validator: `CERT=aif-c01 npx tsx factory/validate.ts --prefix aifc01-1c-` → 0 problem(s).

## Notes and choices

- **Closed services.** SageMaker Model Monitor, Clarify and Ground Truth are closed to new customers (checked on their docs pages). Model Monitor shows up only as a wrong option (`mlops-monitor-cloudwatch`), and the explanation says it is closed. CloudWatch is the right answer there, which matches AWS's "Model Monitor availability change" page (it recommends CloudWatch for endpoint metrics). Clarify, Amazon Q Business and Q Developer are never used.
- **Amazon Quick**: the exam guide's name is used in the options; the explanation and reference use "AWS Quick" (doc title "What is AWS Quick?").
- **Avoided on purpose**: on-demand deployment of Bedrock custom models (the Provisioned Throughput page still says "you must purchase Provisioned Throughput to use a customized model"), Bedrock service tiers (Priority/Flex), and real-time endpoint payload and timeout limits (not confirmed on the fetched pages).
- **Bedrock data use** (`prod-bedrock-data-use`, `prod-unsupported-arch`): based on the Bedrock FAQs. Inputs and outputs are not shared with model providers and are not used to train models; PrivateLink is supported.
- **1.3.6 business metrics**: reference is the Well-Architected ML Lens page "Business goal identification". The page does not name ROI; the ROI definition is general knowledge.
- **EKS self-hosting** (`prod-eks-selfhost`): "What is Amazon EKS?" does not mention GPUs or ML. The question uses only the general Kubernetes and EC2 instance-type facts.
- **Course chapter 13-ml-lifecycle** was not yet written: check that its terms (self-hosted API, MLflow, Feature Store, Model Registry) match these questions once it exists.
- **Scoring NOTE**: added to multi and dragdrop stems (platform scores per element), as the writing guide requires. The profile says the real exam scores all or nothing.
