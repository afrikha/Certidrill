# C-dop-c02-1 — COURSE DOP-C02, chapters 00, 11, 12, 13 (2026-11-23)

Files: `content/dop-c02/course/chapters/{00-getting-started,11-cicd-pipelines,12-automated-testing,13-artifacts}.en.md` (English only, no `.fr.md`).
Check: `npx tsx factory/check-cert.ts dop-c02 00-getting-started 11-cicd-pipelines 12-automated-testing 13-artifacts` → 0 problems; `npm run content:validate -- --cert dop-c02 --course --chapters ...` → 0 problems.
Words (prose and tables, code excluded): 00 = 1,963; 11 = 2,494 (7 objectives, about 300 over the guideline, trimmed once); 12 = 2,265; 13 = 2,291.

## Verified on AWS pages (WebFetch, 2026-11-23)
- Guide out-of-scope job tasks (exact wording); CodeBuild buildspec reference (env, `secrets-manager` format, exported variables, `on-failure` values incl. RETRY-count 0–100, `finally`, reports formats, artifacts keys, cache keys, max 5 report groups); UPLOAD_ARTIFACTS always attempted; local cache modes and limits (not in VPC); Lambda compute limitations; batch build types incl. `build-fanout`; webhook events and filter groups; pull request build policy; `CODEBUILD_*` variables; code coverage metrics and formats (LCOV accepted).
- CodePipeline: cross-account requirements (CMK, bucket policy, roles, no console), cross-Region `artifactStores`, action reference list, Commands action (V2 only, 55 min, single-line), InspectorScan action, Lambda invoke (PutJob*, continuation token, cross-Region note), manual approval 7 days, trigger filters, `providerType` only `CodeStarSourceConnection`, PR events OPEN/UPDATED/CLOSED.
- CodeConnections rename; CodeCommit EventBridge detail-types and events.
- CodeArtifact concepts (1,000 repos/domain, formats), external connections (one per repo), token (12 h default, 15 min–12 h, 0), statuses, package origin controls.
- ECR lifecycle policies (count types, 24 h, archive), tag mutability (`IMMUTABLE_WITH_EXCLUSION`), replication (25 destinations, new images only, settings not replicated), scanning basic vs enhanced, pull through cache (registries, secret prefix, 24 h check), encryption fixed at creation, managed signing.
- Secrets Manager rotation (4 h minimum), cross-account (CMK required), Parameter Store tiers; Lambda code signing (Warn/Enforce, layers); ECS health check exit codes and ranges; CodeDeploy hook timeout 3,600 s and Lambda hook 1 h; Image Builder concepts, Schedule start conditions, lifecycle actions, lifecycle runs daily and ignores downstream references; Distributed Load Testing on AWS (v4.3.5, JMeter/k6/Locust, Fargate, multi-Region); AWS FIS concepts; Amazon Inspector code security and CI/CD scanning.

## General knowledge, not confirmed on a fetched page (reviewer please check)
- CodeBuild: `post_build` runs after a failed `build` (phase diagram is an image; only the UPLOAD_ARTIFACTS note was readable); build status reporting to providers; project artifact types `S3`/`CODEPIPELINE`/`NO_ARTIFACTS`; env var types `PARAMETER_STORE`/`SECRETS_MANAGER`; registry credentials for private images; secret masking in build logs.
- CodeConnections `PENDING` → `AVAILABLE` handshake, hosts for self-managed providers, `codeconnections:UseConnection`; full clone output artifact format.
- CodeDeploy predefined configuration names (Lambda/ECS variants); ECS native blue/green/linear/canary taken from the DVA-C03 report.
- Image Builder: security scanning setting requires Amazon Inspector activation (scanning page not readable); lifecycle rules by count or age; distribution launch template updates in other accounts.
- `cdk bootstrap --trust` example; `copy-package-versions`; Lambda invoke action job data with artifact credentials; Run Command non-zero exit = Failed; `cfn-signal -e $?`.

## Choices
- Lifecycle table in 00 follows the task list and the profile; for closed services without an official successor (Incident Manager, Change Manager) the "current answer" column gives generic building blocks, not a named replacement.
- Security Hub named "AWS Security Hub" with a note that the docs title it Security Hub CSPM.
