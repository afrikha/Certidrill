# QZ-az-802-73-troubleshoot-active-directory — report

File: `content/az-802/quizzes/73-troubleshoot-active-directory.yaml` (10 questions; check: 0 problem(s), 0 warning(s)).

## Chapter issues against current Learn (Nov 2026)

- **7.3.1, deleted object lifetime: wrong default.** The chapter says "`tombstoneLifetime` (180 days when not set)". *Advanced AD DS Management Using Active Directory Administrative Center (Level 200)* says forests created with Windows Server 2003 SP1 or later have `tombstoneLifetime` **set** to 180 days. When the attribute is **not set** (forests upgraded from Windows 2000 or installed with Windows Server 2003 RTM), Windows uses an internal default of **60 days**. Fix the table row.
- **7.3.2, LDIF file.** The chapter says ntdsutil writes an LDIF file that restores back-links "such as group memberships held in other domains". Per *authoritative restore* and *Run an LDIF File to Recover Back-Links*, the generated .ldf restores the back-links in the domain of the restore. For groups in another domain you run `create ldif file(s) from <text file>` in that domain, and the Learn procedure involves a nonauthoritative restore there. Learn also says to import the .ldf (`ldifde -i -k -f`) on a **different, up-to-date DC**, not on the restored one. Both points are worth adding.
- **7.3.7, netdom resetpwd.** I couldn't verify the procedure (stop the KDC, set it to Manual, purge tickets, restart): the troubleshooting article URL returned an error and the *netdom resetpwd* page doesn't mention it. The page documents only `/server`, `/userd` and `/passwordd`, while the chapter uses `/s /ud /pd`. I didn't use the procedure.
- **7.3.6, KRB_AP_ERR_MODIFIED.** The chapter gives "SPN on the wrong account, DNS name pointing to the wrong server". *Kerberos authentication troubleshooting guidance* lists clock skew, a non-unique SPN and a non-unique service account name. Q8 tests the wrong-account case without naming the error code.
- **7.3.4, GUID of removelingeringobjects.** The chapter says "DSA object GUID". *Troubleshoot replication error 8614* gives `<Source DSA GUID>`, while its event 2042 text shows the invocation ID. Q9 says only "DSA GUID of DC1".
- **7.3.5.** Deleting a DC's computer object in ADUC (or its NTDS Settings object) moves its FSMO roles to the DC shown, which can't be changed (*Clean up AD DC server metadata*). This could be added next to "seize the role".

## Doubts

- Q2 cites the training unit *Understand the system volume and Distributed File System Replication* (shares appear only after the initial SYSVOL synchronization). The troubleshooting article on missing shares covers only FRS / Windows 2000.
- Q5: the French text of the trust error message is my rendering of Windows' French string. Check it.
- Undecided glossary term "cmdlet / applet de commande": I avoided it (wrote « commande »).
