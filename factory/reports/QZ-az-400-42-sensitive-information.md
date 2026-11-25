# QZ-az-400-42-sensitive-information — notes

`content/az-400/quizzes/42-sensitive-information.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 4.2.1 (q1, q5, q10), 4.2.2 (q3, q7, q8), 4.2.3 (q2, q6), 4.2.4 (q4, q9). Positions 6–10: single ×2, dropdown, yesno_statements, multi.

## Chapter vs current Learn (fix in the chapter, not done here)

- **AzureCLI@2 `addSpnToEnvironment` with workload identity federation**: the task page says the script gets `servicePrincipalId`, `tenantId` and either `servicePrincipalKey` or `idToken` (the federation token), depending on the authentication scheme. The chapter only says the task "exposes the service principal details". Since the chapter recommends federation service connections, it should name `idToken` (q7 relies on it).
- **Reusable workflows**: the chapter says secrets aren't passed "automatically" to reusable workflows but doesn't say how to pass them (explicit `secrets:` in the calling job, or `secrets: inherit`). Learn's "Manage secrets in GitHub" unit says to pass only the required secrets explicitly.
- **Secrets in `if:`**: the chapter says they can't be referenced; Learn also gives the workaround (job-level environment variable tested in the condition), used in q3. Worth one line in the chapter.
- **Private key vault** (`pipelines/release/key-vault-access`): Learn separates two paths. Microsoft-hosted agents: link the vault to a variable group and allow the Azure DevOps IP ranges of the geography (public access needed). Self-hosted agents: private endpoint plus AzureKeyVault@2 on the agent; the page adds "If you don't want to grant Azure DevOps inbound access, use the AzureKeyVault@2 task directly on the agent", which implies that linked variable groups are queried by the service, not the agent. The chapter's network paragraph doesn't make this distinction. The page is also inconsistent about roles (Key Vault Secrets User, then Get/List access policies, then Key Vault Contributor for the dynamic-IP method).
- **Fork builds in Azure Pipelines** (`pipelines/repos/github`): the page says new organizations default to **Securely build pull requests from forked repositories** (since Sept. 2023) and, a few lines earlier, to **Disable building pull requests from forked repositories** (since Sprint 229). The control is off for existing organizations. The chapter doesn't give the three options of the control (disable / securely build / customize) nor that it exists at organization and project level; q9 tests it.
- Learn's training unit "Manage encrypted secrets" advises using secrets "within script commands rather than assigning them to environment variables", the opposite of `set-secret-variables` (never pass secrets on the command line). The chapter follows `set-secret-variables`, which is the right choice; just a warning for reviewers who use the training unit.
- Confirmed as written: Key Vault RBAC default from API 2026-02-01 (rbac-guide); Azure DevOps isn't a Key Vault trusted service (network-security page); secrets rotate through Event Grid `SecretNearExpiry` (30 days before expiry) and an Azure function, rotation policies exist for keys only, certificates renew through integrated CAs (DigiCert, GlobalSign); secure files 10 MB, content not editable; DownloadSecureFile@1 deletes the file when the job completes whatever its result.

## Not verified / doubts

- q8 s3 (an environment secret changed while the job waits for approval: the job gets the new value) is deduced from two Learn facts: environment secrets are read when the job that references the environment starts, and the job can't access them before approval. No page states the "changed while waiting" case explicitly.
- q6 relies on each job possibly running on a different agent and on the file being deleted at the end of its job; Learn doesn't discuss passing `secureFilePath` across jobs.
- q10: Managed DevOps Pools in vnet-hub would also work; the option says "self-hosted agent pool whose agents are deployed in vnet-hub" to stay within the chapter.
- French: I wrote « commandes Az PowerShell » to avoid settling the `undecided` term « cmdlet / applet de commande ».

## Design notes

- Mock questions of 4.2.x test Key Vault roles, purge protection, AzureKeyVault@2 inputs, linked variable groups, OIDC subjects and `id-token: write`, secret precedence, `gh secret set`, secure file roles/authorization/Apple and SSH tasks, issecret, JSON masking, fork builds at pipeline level and the project pipeline settings. The quiz tests other decisions: certificate object, secure file lifetime, `if:` with secrets, script injection, secret rotation, secure file across jobs, `idToken` with Connect-AzAccount, reusable workflow/fork/environment secret timing, the organization-level fork control, private vault (network + data role).
- No preview feature is an answer.
