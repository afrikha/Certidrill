# QZ-az-140-42-updates-backup-dr — report

File: `content/az-140/quizzes/42-updates-backup-dr.yaml` (10 questions, `npx tsx factory/check-quiz.ts az-140 42-updates-backup-dr` → 0 problem(s), 0 warning(s)).

Coverage: 4.2.1 (q3, q6), 4.2.2 (q2, q8), 4.2.3 (q4, q9), 4.2.4 (q1), 4.2.5 (q5, q7, q10). Positions 6–10: multi, single, yesno_statements, dropdown, multi.
The 33 mock-exam questions of 4.2.x were read first; the quiz tests other decisions: vault region/subscription, Site Recovery not replicating extensions, standard management (no session host update), ANF cross-region vs cross-zone (mutually exclusive), ANF restore to new volume, AMA via Azure Policy + certificates in the script/image after session host update, `excludeFromLatest` rollback, active-passive vs active-active workspaces and no test failover, Cloud Cache for both containers / Premium cache disk sized for the largest profile / 3 storage accounts, restoring a vault-only recovery point (full share to an alternate location + VHDLocations).

## Chapter / Learn discrepancies (chapter 42 to fix)
- **Azure Files restore from the vault.** The chapter (4.2.5) says "Restores run from the snapshot when it exists, from the vault otherwise". That's incomplete. Restore Azure Files says "Vaulted backup currently supports only full share recovery". A restore to the **original location** needs a Snapshot or Snapshot-and-Vault-tier recovery point (it fails if the snapshot is gone). From the vault, the whole share is restored to an **alternate location** (About Azure Files backup). Item Level Restore therefore needs the snapshot. q10 relies on this.
- **Vault location.** The chapter says the vault is in the same region as the storage account. Back up Azure Files says same region **and same subscription**, except with Cross Subscription Backup.
- Session host update: Learn says the existing power state and drain mode of the session hosts are honored, and a purchase plan isn't retained. The chapter doesn't say this; it isn't wrong, only missing.
- The French chapter uses « capture instantanée » for snapshot, but the shared glossary (Learn fr-fr) gives « instantané ». The quiz uses « instantané ».

## Unverified French terms (not on a fetched fr-fr page)
- « réplication interrégion » / « réplication interzone » (ANF cross-region / cross-zone replication). The English name is given in parentheses at first use.
- « rétablir » for ANF *revert volume*, and « restauration d'instantané de fichier unique » for *single-file snapshot restore*.
- « restauration du partage complet (Full Share Restore) » and « restauration au niveau de l'élément (Item Level Restore) » are taken from the chapter.

## Other doubts
- q3, option d (changing the image reference of an existing VM in place): treated as impossible for standalone VMs. This is general Azure knowledge, not stated on the AVD page that was fetched.
- q6: "Azure Policy definitions that install the Azure Monitor Agent and associate the DCR" is worded generically. Learn says only "you can use Azure Policy" to install the agent automatically.
