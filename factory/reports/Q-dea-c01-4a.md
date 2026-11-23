# Q-dea-c01-4a — report

43 questions (single 36, multi 7; difficulty 13 easy / 21 medium / 9 hard), prefix `deac01-4a-`, folder `content/dea-c01/questions/governance/`.
Validators: `factory/validate.ts` 0 problems; `tools/validate-questions.ts` 0 problems, 1 warning that is not mine (blueprint.scoring.dragdrop per_element in `content/dea-c01/blueprint.yaml`).

## Notes and doubts

- No `NOTE: Each correct selection...` sentence on multi: DEA-C01 blueprint scores multi all or nothing (validator rejects the note).
- `content/_shared/glossary-aws.yaml` does not exist, so the French AWS terminology check did not run; terms follow BRIEF-AWS §6 (politique, compartiment, point de terminaison, politique d'approbation, rôle d'exécution, mappage de source d'événement, balise, unité de domaine, profil de projet, « plan (blueprint) »).
- No DEA-C01 course chapters existed when the batch was written: question/course agreement not checked.
- SageMaker Unified Studio (4.1.7): the admin guide lists the domain-unit policies (project creation, project membership...) by name only, without descriptions. The questions rely on names (project creation policy = who can create projects; project membership policy used only as a distractor), on the "Apply to child domain units" cascade option, on the project profile "Selected users and groups" authorization and on on-create vs on-demand blueprints (all documented). The default "all users can create projects" comes from an AWS Big Data blog, so `smus-domain-unit-cascade` states it in the stem instead of relying on it.
- `glue-role-trust-policy`: the Glue role page does not spell out `glue.amazonaws.com`; it is confirmed by the `iam:PassedToService` condition of AWSGlueConsoleFullAccess.
- `msk-scram-provisioned`: SASL/SCRAM with Secrets Manager is documented for MSK; "provisioned only" is inferred from MSK Serverless requiring IAM access control for all clusters.
- `redshift-managed-endpoint`: the page lists prerequisites (cluster relocation or Multi-AZ for provisioned, cross-account grant); no node-type claim was used.
- Avoided by design: Redshift GetClusterCredentials ARN formats (could not fetch the policy example), endpoint-policy support for the Redshift Data API (not documented on fetched pages), Lambda timeouts, any closed or maintenance-mode service as a correct answer.
- Overlap check: ListBucket ARN, CLI SSO profiles, Parameter Store standard tier and Lambda Secrets extension are already covered in saa-c03/dva-c03, so they were not reused.
