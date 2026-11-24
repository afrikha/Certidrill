# QZ-az-104-21-storage-access — doubts and notes

File: `content/az-104/course/quizzes/21-storage-access.yaml` (10 questions, check-quiz: 0 problem(s), 0 warning(s)).

Plan: Q1 2.1.1 single (d1), Q2 2.1.3 single (d1), Q3 2.1.5 single (d2), Q4 2.1.2 single (d2), Q5 2.1.4 multi (d2), Q6 2.1.1 dropdown (d3), Q7 2.1.2 dragdrop (d3), Q8 2.1.5 ordering (d3), Q9 2.1.3 multi (d3), Q10 2.1.1 yesno (d3).

## Doubts and unverified points

- **Q4 (user delegation SAS distractor).** "Create a user delegation SAS" lists `sr` values for blob and file resources only (container, blob, directory, share, file), and no service-level scope. Learn never says outright that a user delegation SAS can't cover several services or service-level operations. The explanation draws that conclusion from those `sr` values.
- **Q8 (ordering).** The order follows the steps listed on "On-Premises AD DS Authentication for Azure Files" (enable AD DS, share-level permissions, Windows ACLs, mount). The scenario forbids the account key, so the ACL step has to come after the share-level roles. Learn doesn't say the first two steps can't be swapped (an RBAC assignment could technically be made before the account is registered in AD DS).
- **Q9.** "Create a service SAS" says `se`/`sp` must be left out of the token when the policy sets them. "Define a stored access policy" says a parameter can't be set in both places. Neither page says what an existing token that has its own `se` does once the policy also gets an expiry. The explanation doesn't say either.
- **Chapter vs Learn (no change made, outside my files):**
  - The chapter says `Microsoft.Storage` service endpoints work for "same region as the account, or its paired region". The current firewall page only says "same region" (Microsoft.Storage) / "any region" (Microsoft.Storage.Global). The limitations page only mentions paired regions about IP rules. No quiz question depends on the paired region.
  - The chapter's list of roles with `listKeys` includes Storage Account Contributor. "Manage account access keys" names only Owner, Contributor and Storage Account Key Operator Service Role. The role does hold `Microsoft.Storage/storageAccounts/*`, but this is worth checking.
  - "Assign Share-Level Permissions for Azure Files" now lists more SMB roles than the chapter does: Storage File Data SMB Admin, SMB Take Ownership, and Privileged Contributor/Reader. Q3 deliberately leaves them out of its options.
  - "Prevent authorization with Shared Key" still labels user delegation SAS as "Blob Storage only" in its table. The SAS overview lists Blob, Queue, Table and Files.
- **Reference titles.** Taken from the current `<title>` without the " - Azure Storage | Microsoft Learn" suffix. "Set the default public network access rule" drops the suffix ": Azure Storage". "Assign Share-Level Permissions for Azure Files" and "On-Premises AD DS Authentication for Azure Files" keep Learn's current capitalization; the bank still uses the older titles.
- **French.** Portal labels are translated as in the bank ("Activé à partir des réseaux sélectionnés", "Désactivé", "Privé", "Clés d'accès"). Built-in Azure Policy names stay in English.
