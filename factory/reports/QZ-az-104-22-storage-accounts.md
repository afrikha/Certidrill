# QZ-az-104-22-storage-accounts — doubts and notes

Quiz written: `content/az-104/course/quizzes/22-storage-accounts.yaml`. Every question has a type and a difficulty: 1 single (2.2.4, d1), 2 single (2.2.3, d1), 3 single (2.2.1, d2), 4 single (2.2.5, d2), 5 yesno (2.2.2, d2), 6 single (2.2.1, d3), 7 dropdown (2.2.5, d3), 8 single (2.2.2, d3), 9 yesno (2.2.4, d3), 10 multi (2.2.3, d3). Checker: 0 problems, 0 warnings.

## Facts checked on Learn (Nov. 2026)

- Encryption at rest: always on, can't be disabled, 256-bit AES, Microsoft-managed keys by default, customer-provided keys for Blob Storage only (storage-service-encryption).
- CMK: RSA/RSA-HSM 2048/3072/4096 only (no EC); key version checked daily when omitted (customer-managed-keys-overview).
- Object replication: block blobs only; any online tier (Hot, Cool, Cold) supported; prefix filter; by default only blobs created after the rule are copied (object-replication-overview).
- Archive tier: LRS, GRS, RA-GRS only (access-tiers-overview, storage-redundancy). GZRS secondary uses LRS; the secondary region is the pair and can't be changed (storage-redundancy).
- HNS upgrade: in place, one-way, writes paused, portal option **Data Lake Gen2 migration** (upgrade-to-data-lake-storage-gen2-how-to).
- Storage Explorer: Reader is needed to list storage accounts (troubleshooting guide).
- AzCopy flags: `--overwrite` true/false/prompt/ifSourceNewer, `--include-pattern` (wildcards) vs `--include-path` (no wildcards), `--block-blob-tier` Hot/Cool/Cold/Archive. `sync` has no `--overwrite` and no `--block-blob-tier` option. Checked on the AzCopy wiki on GitHub, because the Learn `storage-ref-azcopy-*` pages now redirect there. The references point to the Learn upload and sync pages.

## Doubts

- Q6: a server-to-server AzCopy copy from a standard account (Hot tier) to a premium block blob account may need `--s2s-preserve-access-tier=false`, because premium block blob accounts don't use access tiers. I did not verify this on Learn, so the explanation only says "for example with AzCopy".
- French "purge protection": the chapter uses « protection contre le vidage » and the bank uses both « protection contre le vidage » (4) and « protection contre la purge » (5). Q9 follows the chapter. The glossary doesn't have this term yet, so it should be decided there.
- Versioning: Q10 follows the chapter and the study guide (« versioning des objets blob »). The glossary term is « contrôle de version des objets blob ».
- ZRS uses "three or more" availability zones according to the current redundancy page, but the chapter says "three". No question depends on the exact number.
