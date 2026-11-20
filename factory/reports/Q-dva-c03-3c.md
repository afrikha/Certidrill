# Q-dva-c03-3c — QUESTIONS DVA-C03, domain deployment (2026-11-20)

## Output
- 38 questions in `content/dva-c03/questions/deployment/`, prefix `dvac03-3c-`: 3.3.5 = 8, 3.3.6 = 8, 3.3.7 = 8, 3.3.8 = 7, 3.3.9 = 7.
- Types: single 32, multi 6 (all "Choose two"). Difficulty: 11 easy / 19 medium / 8 hard.
- Validator: `CERT=dva-c03 npx tsx factory/validate.ts --prefix dvac03-3c-` → 38 files, 0 problem(s).
- No DVA-C03 course chapter existed yet when the batch was written (chapters dir empty), so alignment with the course is not checked.

## Sources
- All facts from WebFetch of docs.aws.amazon.com (CodePipeline user guide and API reference, CodeDeploy, CloudFormation, SAM, Elastic Beanstalk, Lambda, API Gateway, ECS, CodeCommit, CodeBuild, Bedrock, Bedrock AgentCore, Prescriptive Guidance) and kiro.dev. Reference titles are the H1 headings returned by WebFetch (summarised fetches, not verbatim HTML).
- `dvac03-3c-kiro-headless-codebuild` references `https://kiro.dev/docs/cli/headless/` (Kiro docs are not on docs.aws.amazon.com); BRIEF-AWS asks for docs.aws.amazon.com or aws.amazon.com URLs — a reviewer may want to accept or replace it.
- AgentCore reference title written as "Overview - Amazon Bedrock AgentCore" (the H1 is only "Overview").

## Points to review
- 2026 status respected: Amazon Q Developer, AWS Cloud9 appear only as wrong options with the closure stated in the explanation; Copilot CLI and X-Ray SDKs not used; CodeCommit used as a current service.
- 3.3.9 has no dedicated "AI in CI/CD" AWS service; questions use Bedrock (Converse API from Lambda), CodePipeline manual approvals / PutApprovalResult / stage conditions (LambdaInvoke rule), Kiro CLI headless mode, AgentCore Runtime + Gateway, and IaC generation, with human-in-the-loop and least privilege as deciding constraints. AWS DevOps Agent (GA March 2026, per search results) was not used because it is not in the guide's in-scope list.
- `dvac03-3c-ai-post-deploy-validation`: the docs state that a Lambda error meets On Failure criteria and show LambdaInvoke + CloudWatchAlarm rules in the On Success diagram, but do not spell out LambdaInvoke pass/fail for On Success; the question relies on "a failed rule fails the condition, which engages ROLLBACK".
- `dvac03-3c-pr-validation-trigger` uses the pull request event values OPEN / UPDATED / CLOSED (docs show OPEN and CLOSED in JSON and "Updated" in prose).
- `dvac03-3c-ecs-canary-options` relies on ECS native canary deployments (strategy, canary percentage, canary bake time, alarm rollback) documented on the ECS canary page; exact API field names were not verified, so options describe them in words.
- `dvac03-3c-codedeploy-stop-rollback`: `--auto-rollback-enabled` comes from the CLI reference as summarised by WebFetch, not printed on the CodeDeploy guide page.
