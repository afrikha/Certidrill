# Q-scs-c03-5b — report

50 questions in `content/scs-c03/questions/data/`, prefix `scsc03-5b-`: 10 each for 5.2.2, 5.2.3, 5.2.4, 5.3.1, 5.3.2.
Types: single 39, multi 7, ordering 2, dragdrop 2. Difficulty: 7 easy, 25 medium, 18 hard. Validator: 0 problems.

## Facts verified on AWS pages (Nov. 2026) worth noting for the course
- KMS on-demand rotation: max 25 per key; supported for symmetric EXTERNAL keys after importing NEW_KEY_MATERIAL (Pending rotation); "the KMS key becomes unusable as soon as any of its materials expires or is deleted".
- ImportKeyMaterial ValidTo: maximum 365 days from import (Step 4 page). Wrapping key + token valid 24 hours, indivisible set.
- Multi-Region EXTERNAL keys: import new material into the primary first, then the same material into each replica.
- XKS proxy credential, URI path and name editable in any state; connectivity/endpoint changes need DISCONNECTED.
- AWS Backup: logically air-gapped vault min retention >= 7 days, shareable to accounts in other orgs (not OUs); cross-account copy needs CMK for non-fully-managed resources (EBS, EC2, RDS, Aurora); default vault cannot be a cross-account destination; malware protection (GuardDuty) for EBS, EC2, S3 recovery points.
- EBS snapshot lock cooling-off 1-72 h (compliance only); Recycle Bin retention 1-365 days for snapshots/AMIs, 1-7 days for volumes.
- S3 Object Lock now has variable retention (event holds); not used in questions because the API details could not be verified.
- Lambda docs now distinguish "Lambda Event Functions" (.zip, code signing) from Web Functions and MicroVMs; questions only say ".zip file archives".

## Doubts / not verified (kept out of answers)
- Secrets Manager page "Network access for AWS Lambda rotation function" could not be read (rate limited / empty); the VPC endpoint question relies on the "Using an AWS Secrets Manager VPC endpoint" page.
- EFS lifecycle allowed values and 128 KiB minimum not verified; question uses only defaults and "On first access". "Archive is the lowest-cost EFS class" is from general knowledge.
- Replicas into an Object Lock destination getting the destination default retention (scsc03-5b-s3-ransomware-copies, option a) is from general knowledge.
