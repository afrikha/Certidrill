# QZ-az-104-12-rbac — notes

## Chapter vs current Learn (to fix in the chapter, not done here)

- `12-rbac.en.md` / `.fr.md`, IAM tabs table: the row "Classic administrators" is outdated. The Learn page "Azure classic subscription administrators" says that classic administrator roles were fully retired in May 2026 and that the **Classic Administrators** tab was removed from the Azure portal. It also says that in December 2025, Azure assigned Owner at subscription scope to users who were still co-administrators. The quiz doesn't use classic administrators.
- Virtual Machine Contributor includes `Microsoft.Storage/storageAccounts/listKeys/action` (Learn page "Azure built-in roles for Compute"). The chapter says only that it doesn't manage the storage account, which is true. Because the role can list keys, q10 has no option about storage keys or about reading stweb1 without Microsoft Entra authorization.

## Facts not verified, so left out

- Whether **Check access** includes assignments made through group membership: the Learn quickstart doesn't say. q4 doesn't use it.
- Whether storage firewall rules exempt control plane (Resource Manager) operations: the fetched page doesn't say. q7 doesn't use it.

## Design notes

- q6: Contributor keeps `Microsoft.Storage/storageAccounts/write`, so G-StorageOps could turn Shared Key access back on. The expected answer (disallow Shared Key) is the solution Learn documents, and the other three options each fail one stated requirement. A stricter version would add an Azure Policy assignment, which belongs to another objective.
- q3: the correct role (Tag Contributor) contains the word "tag" from the stem. This can't be avoided, and it's acceptable for a position-3 consolidation question.
- French "deny assignment": I used « affectation de refus » (the glossary's main form). The chapter uses « attribution de refus », which the glossary lists under `also_seen`. Harmonise one way or the other.
