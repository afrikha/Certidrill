# Q-dva-c03-3b — QUESTIONS DVA-C03, deployment (3.2.3–3.2.5, 3.3.1–3.3.4)

56 questions, prefix `dvac03-3b-`, 8 per objective; single 46 / multi 10; difficulty 18 easy / 27 medium / 11 hard. Validator: 0 problem(s).

## Overlaps avoided (cross-batch)
Other agents had already written the same decision with the same answer, so my first drafts were deleted and replaced:
- 3a `ecr-immutable-exclusion`, `samconfig-env`, `stagevar-lambda-alias`, `ecs-tag-digest`, `container-image-size`, `layer-python-structure`, `pip-platform-arm64`; 1c `cfg-env-version-locked`, `cfg-layer-*`; 1b `apigw-proxy-json-body`; 3c `ecs-circuit-breaker`, `codedeploy-alarm-rollback`; 2b `ecs-task-role`; 2c `ecs-secret-execution-role`.
- Remaining near-neighbours (different answer): `ctr-eks-fargate-pod-identity` (Pod Identity not supported on Fargate) vs 2a `eks-pod-identity` (Pod Identity on EC2).

## Facts not found word-for-word on a fetched page (kept, widely documented elsewhere)
- `sam local generate-event apigateway aws-proxy` (event type name) — SAM pages only show `s3 put`; the CLI lists it with `sam local generate-event apigateway`.
- Task definition revisions cannot be edited in place (`ctr-ecs-new-revision`).
- Lambda image functions keep the old image after a push with the same tag (`pkg-image-update-code`): the doc says "rebuild your container image and update the function code"; digest pinning itself is not stated.
- HTTP API Lambda integrations have no separate proxy toggle (explanation of a distractor in `tevt-http-api-v2-method`).
- CodeBuild coverage reports: page lists line and branch coverage and the console Reports view; wording kept generic.
- Lambda AppSpec uses capitalized keys (Name, Alias, CurrentVersion, TargetVersion) as in CodeDeploy AppSpec examples; the resources reference page shows lowercase.

## Left out (could not verify)
- IRSA support for EKS Fargate pods (not stated on fetched pages) — the Pod Identity/Fargate question uses "run on EC2 nodes" as the answer instead.
- Amplify automatic subdomains, per-branch environment variable overrides, API Gateway console test without deployment / authorizer bypass.

## Service status
- AWS Copilot CLI: only a distractor; `env-copilot-express-mode` makes Amazon ECS Express Mode the answer (Containers blog of March 2026 recommends it; reference = ECS Express Mode doc page).
- Amazon Q Developer: only a distractor (closed to new sign-ups May 15, 2026). Kiro is the AI tool for 3.2.5.
- Kiro references point to kiro.dev (no docs.aws.amazon.com page), titles as served ("Hooks - Features - Docs - Kiro"...).

## Notes for reviewers
- AWS Lambda doc titles now say "Lambda Event Function"; references keep the served titles, question text says "Lambda function".
- French: « balise » for image tags and EC2 tags, « étiquette de ressource » for the ECR `tag-resource` distractor (to keep the distinction); « jeu de modifications » (change set), « pile », « hook » kept in English for CodeDeploy/Kiro.
