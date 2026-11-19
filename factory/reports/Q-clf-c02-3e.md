# Q-clf-c02-3e — report

40 questions in `content/clf-c02/questions/technology/`, prefix `clfc02-3e-` (3.8.5–3.8.14, 4 each). Types: 35 single, 5 multi. Difficulty: 16 easy / 18 medium / 6 hard. Validator: 0 problems.

## Naming decisions

- **AppStream 2.0**: options use the exam guide name "Amazon AppStream 2.0". Explanations say that AWS now documents it as Amazon WorkSpaces Applications (doc page title "What Is Amazon WorkSpaces Applications?").
- **Amazon Connect**: the admin guide page is now titled "What is Connect Customer?". It says Amazon Connect Customer is the new name of the contact center product, and that Amazon Connect is now a family of agentic AI solutions. Options keep "Amazon Connect" (the exam guide name). The explanation of `clfc02-3e-connect-contact-center` mentions the new name. Reviewers: check how the course chapter names it.
- **Support plans**: only Basic, Business Support+, Enterprise Support and Unified Operations are used. Developer, Business and Enterprise On-Ramp end on January 1, 2027, so they are left out.

## Facts not verified on a fetched page (general knowledge, kept because they are stable)

- SQS standard queues give at-least-once delivery and best-effort ordering (the FIFO page only describes the FIFO guarantees).
- Global Accelerator does not cache content, and S3 Transfer Acceleration speeds up transfers but does not cache (`clfc02-3e-cloudfront-static-frontend`, explanations only).
- Hourly WorkSpaces billing suits occasional users (the fetched page confirms only that monthly and hourly billing exist).
- Unified Operations costs more than Enterprise Support. The fetched pages show only that it adds services on top of Enterprise Support, so the explanations say "adds services" and no price.

## Source caveats

- The Amazon WorkSpaces Secure Browser admin guide landing page is an empty stub. The Secure Browser FAQ (aws.amazon.com) is used as the reference instead.
- AWS sources disagree on Enterprise Support's critical-case response time. The plan comparison page says < 15 min for business- or mission-critical system down. The user guide says "up to 15 minutes" for production-critical cases. `clfc02-3e-support-unified-ops-ime` uses "less than 15 minutes".
- The EventBridge page now describes a new "Custom Event Bus" that supports ordered delivery. For that reason the event bus option was removed from the FIFO ordering question.
- Out-of-scope services (Greengrass, Device Defender, CodeDeploy, Device Farm…) were left out, even as distractors.

## Overlap with sibling batches

- 3d (3.8.1–3.8.4) covers SNS/SQS/EventBridge, Connect/SES, Support and CodeBuild/CodePipeline/X-Ray. 3b covers Elastic Beanstalk. This batch tests different decisions: multichannel A2P, SaaS event routing, CloudWatch alarm + SNS, FIFO ordering, Lex in Connect, SES from the company's own domain, Marketplace, Unified Operations IMEs, X-Ray latency, CloudFormation templates, CodePipeline + CodeBuild together, and CloudWatch Logs versus CloudTrail. Check for duplicates once 3d is finished.
