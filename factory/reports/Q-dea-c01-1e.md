# Q-dea-c01-1e — report

36 questions (single 30, multi 6), 6 per objective 1.4.6–1.4.11; difficulty 11 easy / 18 medium / 7 hard. Validator: 0 problems (only the existing blueprint dragdrop warning).

## Notes and doubts
- Lambda docs now title pages "Lambda Event Functions" (e.g. "Configure ephemeral storage for Lambda Event Functions"); reference titles were shortened to the Lambda-neutral part, and stems say "AWS Lambda function".
- Amazon S3 Files is used as a correct answer (two questions: mounting a bucket in Lambda, DirectS3Read = ENABLED below 512 MB). Facts from the Lambda S3 Files page and the S3 "Working with Amazon S3 Files" page; the pages do not state a GA date.
- The SAM page for the state machine DeploymentPreference object could not be read (rate limit, then empty); the gradual-deployment question uses only what the AWS::Serverless::StateMachine page states (DeploymentPreference requires AutoPublishAlias; UseAliasAsEventTarget), with no Type values.
- ScheduleV2 event on AWS::Serverless::StateMachine: the event types are verified; the option gives only the cron expression, not property names.
- Glue local container: the list of unsupported features (job bookmarks, Glue Data Quality) is taken from the page as applying to the Glue container images in general.
- HNSW vs IVF (profile trap) was not used: no docs.aws.amazon.com page comparing them was found; only blogs. Left to the vector-index objective.
- 1.4.8 overlaps 1.4.5 (task 1d, written in parallel): I chose repeatability topics (Parameters/Mappings, Deletion/UpdateReplacePolicy Snapshot, CDK construct library, cdk bootstrap, CDK Pipelines --trust, Git sync); a reviewer should check for duplicates with deac01-1d-*.
- Lambda timeout is not used in any answer.
