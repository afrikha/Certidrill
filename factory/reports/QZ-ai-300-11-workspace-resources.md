# QZ-ai-300-11-workspace-resources — notes

Quiz `content/ai-300/quizzes/11-workspace-resources.yaml`: 10 questions (1.1.1 ×2, 1.1.2 ×2, 1.1.3 ×3, 1.1.4 ×3). Positions 6–10: single, dropdown (Python), multi, single, multi. `check-quiz` = 0 problems, 0 warnings.

## Chapter vs current Learn (to fix in the chapter, not done here)

- **Studio data preview behind a storage firewall** (datastores section, identity table). The chapter says only that the workspace managed identity is used. The Learn page "Administer data authentication" says you **must also enable** the datastore setting **Use workspace managed identity for data preview and profiling in Azure Machine Learning studio**, then give the workspace identity Storage Blob Data Reader. If the storage uses a private endpoint, the identity also needs Reader on that private endpoint. q10 tests the datastore setting, so the chapter should mention it.
- **Application Insights deleted** (associated resources table: "the only way to get it back is to recreate the workspace"). The page "Workspace soft deletion" says that to recover a soft-deleted workspace whose Application Insights was deleted, you recover the Log Analytics workspace and then recreate Application Insights with its original name. The mock question `ai300-1a-ws-recover-order` already follows that page. The chapter wording looks too absolute. Check it against the `az ml workspace` CLI page that the chapter's warning came from.
- **Soft delete and role assignments.** Learn marks role assignments with "Microsoft attempts recreation, not guaranteed". It also says the role assignments of the workspace identity are recovered, but role assignments you added are not. The chapter's "role assignments you added" is right. You could add that the container registry is not a hard requirement for recovery: images are rebuilt.
- **Default role of the workspace identity.** The page "Manage roles in your workspace" says that a system-assigned identity of a workspace created after 2024-11-19 gets **Azure AI Administrator** by default. Older workspaces got Contributor on the resource group. The chapter says only "Created by Microsoft". That isn't wrong, but it's incomplete.
- **User-assigned identity roles.** On Learn, Storage Blob Data Contributor is marked *optional* (it's needed only for data preview in the studio). The chapter lists it as if it were required.
- **Learn contradiction, for information.** "Manage roles in your workspace" says that Reader can view datastore credentials. "Administer data authentication" says that retrieving credentials needs `datastores/listsecrets/action`, and it lists Contributor, Azure AI Developer and AzureML Data Scientist (not Reader). The chapter and the mock bank (`ai300-1a-ds-reader-creds`, `cs3a`) follow the first page. The quiz doesn't depend on this.
- These are missing from the chapter but true on Learn. The quiz doesn't use them: a cluster can be created in another region than the workspace (an instance can't), and an instance with a managed identity doesn't idle-shut-down unless that identity has Contributor on the workspace.

## Facts not verified on a fetched page (used only as distractors)

- `AzureCliCredential`, `ClientSecretCredential`, `InteractiveBrowserCredential` (azure-identity classes) and the env vars `AZURE_TENANT_ID` / `AZURE_CLIENT_SECRET`. They are standard azure-identity names, from memory.
- The token scopes `https://ml.azure.com/` and `https://vault.azure.net/` are used as wrong targets. Their exact validity doesn't matter, because only `https://storage.azure.com/` (verified) is accepted by Storage.

## Design notes

- q8 (key rotation): Learn says the workspace syncs a new key by itself after about one hour. The stem's "immediately" is what makes `sync-keys` required. I left out the Learn warning that unregistering a datastore and re-registering it under the same name fails (it isn't in the chapter).
- q9: the stem gives the ARM property (`allowSharedKeyAccess: false`) and the correct option names the portal label. This way, the option doesn't simply repeat the stem.
- q10: the stem says "look at sample rows" instead of "preview". The aim is that the correct option (the real setting label, which contains "data preview") doesn't echo the stem.
- Portal labels are kept in English in the French text (Allow storage account key access, the datastore preview setting), as in the chapter.
- These mock-exam decisions were avoided: default storage kinds, BYO YAML, name reuse, recover items/order, hbi, delete-all, ADLS no-secret, auth match, default stores, Files auth, wasbs, job URI, SAS rotation, Reader credentials, cluster defaults/YAML/min 0, on-behalf-of, serverless Spot, idle shutdown + Contributor, AcrPull, custom role, quota scope, roles match, self-service roles, UAI facts, `user_identity`.
