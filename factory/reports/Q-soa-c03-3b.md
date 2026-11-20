# Q-soa-c03-3b — report

57 questions in `content/soa-c03/questions/deployment/` (prefix `soac03-3b-`): 3.1.4 = 19, 3.1.5 = 19, 3.1.6 = 19; single 47, multi 10; difficulty 17 / 29 / 11. Validator: 0 problem(s).

## Sources
All facts are from AWS pages fetched on 2026-11-20 (CloudFormation StackSets user guide and API reference, AWS RAM, VPC sharing and security group sharing, Transit Gateway, Route 53 Resolver, EC2 Auto Scaling instance refresh pages, CloudFormation UpdatePolicy, ECS blue/green and alarm-based rollback, CodeDeploy deployment configurations, RDS Blue/Green, CloudFront continuous deployment, ALB action types, Prescriptive Guidance "Terraform AWS Provider best practices" (backend, security), IAM OIDC, CloudFormation Git sync, Service Catalog Terraform, Systems Manager Ansible, CodeCommit approval rule templates, CloudFormation public extensions, CodePipeline manual approval). Page titles were read with WebFetch; I could not fetch raw HTML to check `<title>` byte for byte.

## Inferred or partly verified (worth a reviewer's look)
- Transit Gateway: the page does not state the default of Auto accept shared attachments, so the stem says that it was created with the option turned off (`ram-tgw-pending`).
- NAT gateways, internet gateways and Elastic IP addresses are not RAM-shareable: inferred from their absence in "Shareable AWS resources" (`ram-shareable-network`).
- Git sync: that a console update is overwritten by the next sync is inferred from "the deployment file holds the parameters", not stated (`gitsync-params`, explanation of option a).
- ECS blue/green: lifecycle hook stage names were not verified, so the options do not name them (`ecs-blue-green-bake`).
- HCP Terraform dynamic credentials: the AWS guidance names only TFC_AWS_PLAN_ROLE_ARN and TFC_AWS_APPLY_ROLE_ARN (HashiCorp also needs TFC_AWS_PROVIDER_AUTH); the option stays generic (`tf-hcp-dynamic-creds`).
- GitHub `sub` claim of the form `...:environment:NAME` for jobs that use environments: from the AWS guidance example plus GitHub behavior (`tf-github-oidc-sub`, option d).

## Deviations
- No HCL code fences (only bash/json/yaml allowed); Terraform settings appear as inline code.
- Avoided overlap with SAA/DVA: StackSets automatic deployment to an OU, VPC subnet sharing, ALB weighted blue/green, ECS canary / circuit breaker, CodeDeploy EC2 blue/green, Lambda canary, CodeCommit branch protection / SSH / connection PENDING.
