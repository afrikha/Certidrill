# QZ-az-104-23-files-blobs — notes

Quiz: `content/az-104/course/quizzes/23-files-blobs.yaml`, 10 questions. Checker: 0 problem(s), 0 warning(s).

## Layout

| # | Objective | Difficulty | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.3.2 | 1 | single | Container naming rules |
| 2 | 2.3.1 | 1 | single | The cloud endpoint is the file share in a sync group |
| 3 | 2.3.3 | 2 | single | Changing the default tier moves inferred-tier blobs only |
| 4 | 2.3.4 | 2 | single | Azure Backup schedules share snapshots and deletes them on retention |
| 5 | 2.3.6 | 2 | single | Restore an overwritten blob by copying the previous version |
| 6 | 2.3.1 | 3 | dropdown | File Sync topology: 1 service, 3 sync groups, 6 server endpoints |
| 7 | 2.3.2 | 3 | multi | Locked time-based retention: can be extended, not shortened or removed; creates allowed |
| 8 | 2.3.3 | 3 | single | Premium block blob accounts can't be tiered: copy to standard GPv2 LRS, then archive |
| 9 | 2.3.5 | 3 | hotarea | Lifecycle rule: prefix includes container, blobTypes, least-expensive action wins |
| 10 | 2.3.6 | 3 | yesno_statements | Versioning + soft delete: deleting the base blob creates a non-soft-deleted previous version; a version deleted by ID is soft-deleted and must be undeleted before copy |

None of these repeats a mock-exam decision (checked against all 2.3.x questions in `questions/storage/`, including the cs-* case-study questions).

## Doubts and choices

- **French term for versioning**: I used « versioning des objets blob » (study guide 2.3.6 and chapter 23), whereas the glossary's Learn term is « contrôle de version des objets blob » and the mock bank uses the latter. Harmonise one way if needed.
- **Q3**: "inferred" is kept as the portal label `Hot (inferred)`; « niveau déduit » in the French prose is my own wording, not checked on a fr-fr page.
- **Q6**: "a server registers with only one Storage Sync Service" and "one server endpoint per registered server per sync group" come from the Learn planning page, not from the chapter; the answer can still be worked out from the chapter (one cloud endpoint per sync group, server endpoint = synchronized folder).
- **Q8**: Learn says premium block blob data can't be tiered with Set Blob Tier or lifecycle management, and that you copy it to another account with Put Block From URL / AzCopy. I added "LRS" to the right option because Archive isn't supported with ZRS/GZRS.
- **Q10**: The behaviour (deleting the base blob makes the current version a previous version, which isn't soft-deleted; a version deleted by ID is soft-deleted; Undelete Blob restores soft-deleted versions without promoting any) comes from the versioning overview page. The chapter only says that deletion keeps the previous state as a version.
- Fact not used but worth adding to the chapter: when you configure Azure Backup for Azure Files, it turns on file share soft delete (14 days) on the storage account. Azure Backup doesn't support NFS shares.
