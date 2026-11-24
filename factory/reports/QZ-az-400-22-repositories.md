# QZ-az-400-22-repositories — notes

`content/az-400/quizzes/22-repositories.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.2.1 (q1, q10), 2.2.2 (q7), 2.2.3 (q2, q8), 2.2.4 (q3), 2.2.5 (q5, q9), 2.2.6 (q4, q6). Positions 6–10: multi, dragdrop, dropdown (text), ordering, dropdown (code).

## Chapter vs current Learn (fix in the chapter, not done here)

- **Secret scanning product name.** The Learn page "Set up secret scanning for GitHub Advanced Security" now names two offers: GitHub Advanced Security for Azure DevOps, and the standalone **GitHub Secret Protection for Azure DevOps**. The chapter mentions only the first one (2.2.6 "Prevent rather than purge"). q6 keeps the generic phrase "secret scanning push protection".
- **Delete tag permission.** Learn ("Use Git tags") also says that the creator of a tag inherits Force push for that tag. The chapter only says that deleting needs Force push on the repository or on All tags. The mock question `az400-2b-tag-azrepos-statements` (s2) relies on this inheritance, which the chapter doesn't teach.
- **Moderate role.** The chapter lists a GitHub repository role named "Moderate". The Learn unit "Configure repository permissions using GitHub" lists five built-in roles (Read, Triage, Write, Maintain, Admin) and no Moderate role. It also lists *organization moderators* as an organization role. I couldn't confirm a repository role named Moderate, so the chapter's table should be checked. The quiz doesn't use it.
- **Custom repository roles.** The same Learn unit is inconsistent about plans: one sentence ties custom roles to GitHub Free, another to Enterprise Cloud. The chapter says Enterprise Cloud. That isn't used in the quiz.
- **Scalar on Learn.** The training unit "Work with large repositories" still calls Scalar "a .NET Core application that works on Windows and macOS" and mentions the GVFS protocol. The chapter's description is the current one: Scalar ships with Git since 2.38. Learn is out of date here, not the chapter.
- **Azure Repos and history rewrites.** "Remove Large Binaries from Your Git History" says that after a rebase and force push, the file can still come back in clones from Azure Repos. The chapter says this. For that reason q10 (Git LFS migration) is set on GitHub, and its goal is to convert the history, not to shrink every new clone.

## Not verified on a fetched Learn page

- `git lfs migrate import --everything` and `git push --force --all` (q10): I checked them on the git-lfs man page (git-lfs-migrate), not on Learn. No Learn page documents `git lfs migrate`. The reference is the Azure Repos large-files page, which only tells you to remove binaries already in history. The claim that `migrate import` adds the patterns to `.gitattributes` comes from Git LFS behaviour, not from a fetched page.
- `git push origin --delete <tag>` (q3) isn't on any Learn page I fetched ("Use Git tags" covers only the portal and Visual Studio). It's standard Git and appears in the chapter.
- `git rm --cached` combined with `git commit --amend` (q4) isn't shown as command lines on Learn. The "Save your work with commits" page describes amending, and the chapter's table gives the commands.
- Git subtree, and the fact that a plain clone needs no extra step (q7), aren't on Learn. The training unit on cross-repo sharing describes git-subrepo, a different tool. GitHub template repositories aren't on Learn either. Both come from the chapter.
- The ordering in q9 (branch, `reset --hard origin/main`, switch) is standard Git. Learn's "Undo changes" page only covers reset in general. I left `reset --soft` and `--mixed` out of the distractors, because they could also lead to a valid sequence.
- Stakeholder having no Azure Repos access in a private project (q8): the table on "About access levels" doesn't render clearly. It matches the chapter and the mock question `az400-2b-perm-access-statements`.

## Design notes

- I avoided the decisions of the mock questions. The new decisions are:
  - what LFS stores (pointer);
  - Deny vs Allow across groups;
  - deleting a remote tag;
  - amending an unpushed commit to drop a file;
  - restoring a deleted repository (recycle bin REST API);
  - rotation plus push protection without a history rewrite;
  - subtree vs submodule vs YAML templates vs template repository;
  - an external contractor in both toolchains (Basic + Contributors, outside collaborator + Write);
  - moving unpushed commits from main to a new branch;
  - `migrate import --everything` with `push --force --all`.
- French follows the chapter: « dépôt », « balise », « pull request », « push forcé ».
