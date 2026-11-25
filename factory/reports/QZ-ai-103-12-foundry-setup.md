# QZ-ai-103-12-foundry-setup — notes

`content/ai-103/quizzes/12-foundry-setup.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.2.1 (q1, q4, q7, q9), 1.2.2 (q3, q6), 1.2.3 (q2, q8), 1.2.4 (q5, q10). Positions 6–10: dragdrop, single, yesno_statements, multi, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Exam trap "private endpoints with no public access can't be configured through the portal"**: I couldn't find this on Learn. "Set up private networking for Foundry Agent Service" (2026-10-29) says the setup can be created in the Azure portal or with Bicep or Terraform. The trap looks out of date. No question uses it.
- **Roles to deploy a standard setup** ("Foundry Account Owner at subscription scope, plus Owner or Role Based Access Control Administrator"): these aren't on "Set up standard agent resources" (2026-07-09). That page says that, beyond creating the account and project, the deploying identity needs Storage Blob Data Contributor on the storage account and Cosmos DB Operator on the Cosmos DB account. It then lists the roles to assign to the project managed identity. No question uses the chapter's roles.
- **Cosmos DB throughput**: Learn says at least 3,000 RU/s in total, provisioned or serverless, and "five baseline containers, each requiring 1000 RU/s". The page contradicts itself: its table lists six containers and its troubleshooting section says three. The chapter just says "each container needs 1,000 RU/s".
- **Region**: Learn requires the Foundry resource to be in the region of the virtual network. Cosmos DB, Foundry IQ (Azure AI Search) and Storage can be in other regions. I didn't find the chapter's "keep the Azure OpenAI resource, the Foundry resource and the project in the same region".
- **Network injection on an existing resource**: "How to configure network isolation" says you can't add outbound virtual network injection to an existing Foundry deployment; you must redeploy. For hosted agents it must be set when the account is created. The chapter doesn't say this, and q9 is built on it.
- **Key Vault connection** (page "Set up an Azure Key Vault Connection", 2026-08-14). Only one is allowed per Foundry resource. The resource must have no existing connections. The managed identity needs Key Vault Secrets Officer at minimum. Secret migration isn't supported, and IaC templates should create the Key Vault connection before any other connection. The chapter only says "connected once for the resource and all its projects"; q7 relies on the rest.
- **Pipeline roles** (RBAC page, 2026-11-12). Contributor can deploy models but can't assign roles. Foundry Account Owner manages models and can conditionally assign Foundry User, but can't build in projects. No single built-in role covers both model deployment and agent publishing, so that needs Foundry Owner or a custom role. Foundry Agent Consumer is the least-privilege role for callers of agent endpoints; at project or agent scope it must be assigned with the CLI, because the portal supports only account scope. The chapter's "Contributor on a dedicated resource group" could be refined.
- SDK: the quickstart now installs `azure-ai-projects>=2.3.0` and says 2.x is incompatible with 1.x, which targets Foundry (classic). Agent publishing and `microsoft/ai-agent-evals` (preview) aren't tested.

## Not verified on a fetched page

- q2, option a: "PTUs are the capacity unit of provisioned types" comes from the chapter. The working-with-models page defines only "1 = 1,000 TPM" (the Standard case).
- q6: I didn't check which models support Standard and Regional Provisioned deployments in Japan. The question names no model, and the APAC data zone being wider than one geography comes from the deployment types page.
- q10: I assume that the conditional Foundry User assignment of Foundry Account Owner can target projects of the resource. The stem says "developer accounts" because the condition is described for user principals. The pipeline uses Azure CLI commands, not an ARM/Bicep deployment, so `Microsoft.Resources/deployments/write` on the resource group isn't needed.

## Design notes

- I avoided the decisions of the mock questions. The new decisions are: the project endpoint format, the capacity unit, Global Standard as the default, per-resource networking (a second resource instead of a private project), the choice of an OIDC federated credential, Global and Regional Provisioned, Standard and Global Batch together, moving an existing resource to its own Key Vault, `null` and `NoAutoUpgrade` at retirement plus SDK 1.x versus 2.x, redeploying for network injection, and three pipeline identities with least privilege.
- In q10, the slot option ids are unique across slots (`b-`, `s-` prefixes), so that `explanation.options` keys don't collide.
