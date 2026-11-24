# QZ-dp-420-21-security-controls — report

File: `content/dp-420/quizzes/21-security-controls.yaml` (10 questions: 2.1.1 ×3, 2.1.2 ×3, 2.1.3 ×2, 2.1.4 ×2). Check: 0 problem(s), 0 warning(s).

## Decisions tested (not in the mock bank, which already covers ~60 questions on these objectives)
Resource token = database user + permission; private IPs rejected by the IP firewall; `notDataActions` unsupported (and locks don't block data plane deletes); masked partition key hides the Data Explorer document view; key regeneration independence/duration and `*/write` for `disableLocalAuth`; container-scoped Data Reader instead of a read-only key; custom Azure role for `sqlRoleAssignments` (vs Operator, User Access Administrator, DocumentDB Account Contributor); custom DNS record for a new region behind a private endpoint; DDM facts (Fabric mirroring, removing all paths, negative MaskSubstring, inference); change feed processor roles on a masked container (custom read+unmask role on the monitored container, Data Contributor on leases).

## Doubts and points against current Learn (Nov 2026)
- **Safe key rotation** (chapter, authentication section): presented as a feature without a preview mention. The capability is named `EnableKeyCheckBeforeRegenerationPreview` and a devblog of June 2026 announces it in public preview. The chapter should say "(preview)". Not used in the quiz.
- **CosmosBackupOperator** (chapter table): "change backup retention" isn't in the Learn built-in roles page, which describes it as "Can submit restore requests" (actions `backup/action`, `restore/action`). Unverified; not used.
- **DocumentDB Account Contributor**: the built-in roles page shows `databaseAccounts/*` with no NotActions, so it can list keys and write `sqlRoleAssignments`; the chapter's trap says it can list keys but its table only says "Manage Azure Cosmos DB accounts". Worth adding that it can also create data plane role assignments.
- **Separate identities**: the RBAC how-to page doesn't say it; the "Secure your account" page does ("Use distinct Azure identities for control plane and data plane operations"). The chapter is right; cite that page.
- **Read-only keys read all data**: true in practice, but I found no current Learn page that states it explicitly (the REST access-control page only describes master keys). Q6 doesn't depend on it alone (the key is also a forbidden secret).
- **Network security perimeter**: in the chapter's table; I didn't verify its current status for Cosmos DB (a `how-to-configure-nsp` page exists). Not used.
- **TLS**: the Learn database-security page now says "Enforce TLS 1.3"; the chapter says "enforce a minimum TLS version". Not wrong, could be made concrete.
- **French chapter**: uses « réseaux appairés » / « appairés »; the writing guide asks for « peering » (« réseaux virtuels liés par peering »). To fix in the FR chapter.
- Q7: Learn lists `sqlRoleDefinitions/read`, `sqlRoleAssignments/read` and `sqlRoleAssignments/write` to create an assignment; `sqlRoleAssignments/delete` for removal is inferred from the Operator NotActions (write/delete). Whether the CLI also needs `databaseAccounts/read` isn't documented.
