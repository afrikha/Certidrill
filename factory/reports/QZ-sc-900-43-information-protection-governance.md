# QZ-sc-900-43-information-protection-governance

File: `content/sc-900/quizzes/43-information-protection-governance.yaml`, 10 questions (`sc900-qz-43-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts sc-900 43-information-protection-governance` → 0 problem(s), 0 warning(s).
Objectives: 4.3.1 = q1, q7; 4.3.2 = q6; 4.3.3 = q3; 4.3.4 = q5, q8; 4.3.5 = q4, q10; 4.3.6 = q2, q9.
Types: single 6, yesno 2, multi 1, dropdown 1. Positions 6–10: yesno, single, single, multi, dropdown.

The 45 mock questions (`sc900-4a-class-*`, `sc900-4a-expl-*`, `sc900-4b-sl/dlp/ret/rec-*`) cover almost every single fact of the chapter. The quiz tests other decisions: retention label settings travel on a move (q2), recommended client-side labeling vs auto-labeling policy / default / mandatory label (q3), what a locked record blocks (q4), Teams blocked message not shown to recipients + Office apps + macOS (q5), SIT-only unlabeled item in Content explorer vs 30-day activity history (q6), supporting element to cut false positives vs EDM / lower confidence (q7), DLP item-level external access block vs container label / encrypting auto-label (q8), custom trainable classifier + auto-applied retention label (q9), sensitivity label + record (not regulatory, admin must be able to remove label) + disposition review only on labels + one label of each kind (q10).

## Sources fetched (learn.microsoft.com, 2026-11-24)

purview/sit-sensitive-information-type-learn-about, trainable-classifiers-learn-about, retention, records-management, apply-sensitivity-label-automatically, dlp-learn-about-dlp, data-classification-activity-explorer, data-classification-content-explorer.

## Chapter / mock issues against current Learn

- **Activity explorer, removable media.** The current activity explorer page lists endpoint actions (delete, create, copy to clipboard, modify, read, print, rename, copy to network share, access by unallowed app) but not "copy to removable media". The chapter (table of 4.3.2) and mock `sc900-4a-expl-compare-yn` (s3, answer Yes) rely on it. Recheck (the endpoint DLP page may still list USB copy as an audited activity).
- **Content explorer.** The page is now "Get started with Content Explorer (classic)"; its path is Data Lifecycle Management > Explorers, not Information Protection as the chapter says; the page doesn't mention "Data explorer" (chapter sentence unverified).
- **Auto-labeling.** Learn distinguishes client-side labeling (recommend or apply, user decides) from service-side auto-labeling policies, which don't support recommended labeling. The chapter's "applied automatically or recommended" doesn't make the distinction; q3 relies on the Learn page.
- **Custom trainable classifiers** support English content only (not in the chapter); q9 states the reports are in English.
- **Records.** Locked/unlocked records apply to SharePoint and OneDrive only; a locked record's label can be removed by the container admin only. q4 and q10 rely on the restrictions table of the records management page (default tenant settings stated in both stems).
- **DLP** Learn lists Microsoft 365 Copilot and Copilot Chat as a DLP location in preview: not used.

## Doubts

- q6 s1: content explorer's definition ("has a sensitivity label, a retention label, or is classified as a SIT") implies SIT-only items appear; the page doesn't show an explicit unlabeled-email example.
- q10: "the site administrator can remove the label" maps to "container admin only" in the restrictions table; assumes the record is locked (default when the record label is applied).
- French: « bibliothèque », « enregistrement verrouillé », « étiquette pour conteneurs », « élément de prise en charge » follow the chapter and the mock bank; fr-fr pages not fetched in this task.
