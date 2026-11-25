# Q-dop-c02-1a — QUESTIONS DOP-C02, domain sdlc (2026-11-23)

- 47 questions `dopc02-1a-*` in `content/dop-c02/questions/sdlc/`: 1.1.1–1.1.5 × 7, 1.1.6–1.1.7 × 6; single 39 / multi 8 (7 "Choose two", 1 "Choose three"); difficulty 7 easy / 24 medium / 16 hard; single answers a 9, b 10, c 11, d 9. English only.
- Checks: `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-1a-` → 0 problem(s); `npm run content:validate -- --cert dop-c02 --prefix dopc02-1a-` → 0 problem(s), 0 warning(s).
- Every fact checked on docs.aws.amazon.com / aws.amazon.com pages fetched on 2026-11-23 (all references are fetched pages). No retired service is a correct answer; CodeStar appears only as a distractor ("shut down July 2024").

## Overlap avoided
Other batches already written when this one ran: 1b (stage-shift-left-unit, stage-onfailure-rollback), 1d (codedeploy-cross-region-actions), 2a (git-sync-stack, pipeline-change-set-approval), 3c (ecr-replication-templates). Planned 1a questions on the same decisions were replaced (CDK Pipelines self-mutation, on-success alarm condition, CDK bootstrap --trust, CodeArtifact origin controls, GitHub Enterprise Server host in a VPC, source revision override + pipeline variables).

## Points worth a reviewer's eye
- `deployment-window-entry`: the docs do not say whether an execution waits or fails when an entry condition's DeploymentWindow rule is not met; the stem only requires that production is not deployed outside the window.
- `alarm-bake-on-success`: relies on the documented on-success semantics (CloudWatchAlarm: OK/INSUFFICIENT_DATA meet the condition; results Rollback or Fail).
- `full-clone-git-metadata`: the CodeBuild role permission for full clone is stated as codeconnections:UseConnection (the action page points to the troubleshooting topic for the exact statement; not fetched).
- `ec2-min-healthy-hosts`: 75 % of 8 = 6 exactly, to avoid relying on the undocumented rounding of FLEET_PERCENT.
