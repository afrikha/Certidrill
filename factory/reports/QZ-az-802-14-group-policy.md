# QZ-az-802-14-group-policy — report

File: `content/az-802/quizzes/14-group-policy.yaml` (10 questions, draft). Check: `npx tsx factory/check-quiz.ts az-802 14-group-policy` → 0 problem(s), 0 warning(s).

Objectives: 1.4.1 (Q1, Q3, Q5, Q6, Q7, Q9, Q10), 1.4.2 (Q2, Q4, Q8). Positions 6–10: single, dropdown, multi, yes/no, multi.

The 17 mock-exam questions on 1.4.x (including cs2a) were read first. The quiz does not use the decisions they test (computer Read in security filtering, hotarea precedence, Enforced plus link order, choosing Merge loopback, cross-forest migration order, tools drag and drop, WMI filter, GPP actions, Apply once plus Site targeting, Drive Maps ILT, first available letter, Set-GPPrefRegistryValue Create, Remove this item, preferences versus policies, kiosk Replace in Computer Configuration).

## Pages fetched (November 24, 2026)

Group Policy processing for Windows, Group Policy preferences in Windows, Group Policy scope in Windows, Group Policy Management Console in Windows, Create and Manage Central Store, Loopback processing of Group Policy, Password Policy (Windows 10, previous versions), MS14-025 security bulletin, Configure a Local Group Item (previous versions), Redirect users and computers containers.

## Facts not verified on a fetched page

- Q4 option c: Restricted Groups "Members of this group" replaces the whole membership. This is long-standing, but no fetched Learn page states it. The Local Group item behavior (Update, Delete all member groups) was verified.
- Q2: Windows LAPS is the correct answer from the chapter. I fetched no LAPS page. The reference is the MS14-025 bulletin.
- Q6: the Password Policy page says the policy "is applied on the domain level" and that FGPP applies to users and global security groups, not to OUs (shadow group). The chapter's statement that password settings in an OU-linked GPO change the **local** accounts of the computers in that OU isn't on that page. It is long-standing.
- Q10: a computer needs a restart (new ticket) before security filtering uses its new group membership. This is general Kerberos behavior, stated on Learn only in the containers gMSA page, and also assumed by the mock hotarea.

## Chapter versus current Learn

- **Run in logged-on user's security context.** The chapter says it is "needed for user items that read user resources, such as a drive map to a share the computer account can't reach". Learn (Group Policy preferences in Windows) says that user preference items run as SYSTEM by default, but that "Drive Maps and Printers automatically use the user's security context and don't require this option". The drive map example is wrong. Use Files, Shortcuts or Registry items reading user resources instead. Q8 uses a Files item.
- **Security settings reapplied every 16 hours**: this isn't on the current Group Policy processing page (the course report already lists it as unverified). Not used.
- **MS14-025**: the bulletin also lists Immediate tasks (uplevel and downlevel) among the extensions whose password fields were removed. The chapter's list omits them.
- **GPO status labels**: the GPMC Learn page lists "All policy settings disabled". The chapter and GPMC itself use "All settings disabled". Q7 rewords the option to avoid the conflict.
- **Central store**: Learn says the store is "checked by the Group Policy tools by default" and is replicated to all the DCs. This is consistent with the chapter. Learn doesn't say "instead of the local folder" in so many words.
- **Loopback**: Learn adds that user settings applied through loopback can't be filtered by denying Read/Apply to the computer object. The chapter doesn't say this. It could be added as an exam trap.

## French

The French GPMC labels (« Lien activé », « Paramètres de configuration ordinateur désactivés », « Bloquer l'héritage », « Appliqué ») are taken from the chapter and the mock exam. They were not checked on fr-fr pages. The names of the preference options and extensions stay in English, as in the chapter.
