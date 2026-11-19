# Q-saa-c03-3c — report

51 questions (`saac03-3c-*`, `content/saa-c03/questions/performance/`), 3 per objective 3.4.6–3.4.8 and 3.5.1–3.5.14. single 42, multi 9; difficulty 15/26/10. Validator: 0 problem(s). No course chapters existed yet for these objectives; facts come from docs.aws.amazon.com pages fetched on 2026-11-19 (cited in each question).

## Naming decisions
- **AWS Quick / Quick Sight**: the exam guide v1.1 says "Amazon Quick", but the current docs (docs.aws.amazon.com/quicksight/... and /quick/...) title the product **AWS Quick**, with the BI feature **AWS Quick Sight** (former Amazon QuickSight). Questions use "AWS Quick Sight" and the docs page titles ("... - AWS Quick"). Align with the course if it chose otherwise.
- Amazon Data Firehose (not Kinesis Data Firehose); Amazon Managed Service for Apache Flink (not Kinesis Data Analytics); Kinesis on-demand mode written as "On-demand Standard" (docs now also list On-demand Advantage).

## Assumptions / facts not verified verbatim on a fetched page
- Tape Gateway presenting a virtual tape library to existing backup software: the fetched "What is Tape Gateway?" page confirms virtual tapes replacing physical tape and archive to Glacier Flexible Retrieval / Deep Archive, not the iSCSI VTL wording (kept out of the text).
- DataSync scheduled runs copying only changed data (default transfer mode) — general knowledge, stated briefly in `saac03-3c-datasync-nfs-migration`.
- SNS message size: only stated as "far below 50 MB" (not verified on a page).
- Managed Service for Apache Flink is not named in the exam guide's in-scope list (Kinesis family is); used as correct answer in `saac03-3c-flink-windowed-fraud`. Replace if the reviewer considers it out of scope.

## Deliberately avoided
- Snow Family (no new orders), FSx File Gateway (availability to new customers unclear), Lambda 15-minute timeout as a deciding fact (Lambda Managed Instances now allow 90 minutes for some invocations), S3 5 TB object limit (now 48.8 TiB), SQS 256 KB (now 1 MiB), Kinesis 1 MB record size (now 10 MiB), CloudFront "no static IPs" (Anycast static IPs exist).
- The Firehose buffering-hints page could not be read (empty content), so no question relies on buffer sizes.
