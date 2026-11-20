# Q-dva-c03-4a — QUESTIONS DVA-C03, troubleshooting 4.1.1–4.1.5 (2026-11-20)

## Result
- 50 questions in `content/dva-c03/questions/troubleshooting/`, prefix `dvac03-4a-`: 10 per objective (4.1.1–4.1.5).
- Types: single 42, multi 8 (seven "Choose two" with 5 options, one "Choose three" with 6 options).
- Difficulty: 15 easy, 25 medium, 10 hard.
- `CERT=dva-c03 npx tsx factory/validate.ts --prefix dvac03-4a-` → 50 files, 0 problem(s).

## Sources and choices
- All facts checked by WebFetch on docs.aws.amazon.com (Lambda, SQS event source, API Gateway, X-Ray segment documents, DynamoDB throttling / GSI back pressure / Contributor Insights, ALB troubleshooting, CloudWatch Logs Insights, filter patterns, Live Tail, CloudTrail event history, CloudFormation troubleshooting / failure options / stack status / CreateStack, CodeBuild, CodeDeploy, Elastic Beanstalk logs and AI-powered environment analysis, ECS CannotPullContainer, ECR VPC endpoints, Bedrock Converse API, boto3 retries) and kiro.dev.
- 4.1.5 AI tools used as correct answers: CloudWatch Logs Insights query generator and result summarization, CloudWatch investigations (alarm action, investigation group resource policy), Elastic Beanstalk AI-powered environment analysis (`eb logs --analyze`, instance profile permissions), Kiro (#terminal context, Bugfix Specs, MCP servers / AWS Observability power), Amazon Bedrock Converse API with a CloudWatch Logs subscription filter.
- Not used as correct answers: Amazon Q Developer (closed), AWS DevOps Agent (GA March 2026 per AWS What's New, but not in the guide's in-scope list), CloudTrail Lake, X-Ray SDKs.

## Deviations / points to review
- Three references point to kiro.dev (Chat, Bugfix Specs, MCP), not docs.aws.amazon.com: Kiro has no AWS-hosted user guide. Titles are the page names without the "- Docs - Kiro" breadcrumb.
- AWS is renaming some Lambda pages to "Lambda Event Functions": titles were taken from the page H1 as fetched (".md" versions), so some say "Lambda functions" and others "Lambda Event Functions". Recheck at review time.
- Wording not found verbatim in the fetched pages (kept generic in the stems): the CodeBuild message for a missing buildspec (stem says only "YAML_FILE_ERROR stating that no buildspec file was found"); the Elastic Beanstalk event text ("refer to eb-engine.log"); the Python `Runtime.ImportModuleError` line (standard Lambda message, not on the fetched page).
- Distractor explanations relying on general knowledge, not on a fetched page: no STS endpoint needed for Fargate ECR pulls in the same account; `ecs-agent` endpoint used by EC2 container instances; LSIs only at table creation.
- Course chapters for 4.1 did not exist when the questions were written; questions were not cross-checked against the course.
