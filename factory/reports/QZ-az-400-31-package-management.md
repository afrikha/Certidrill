# QZ-az-400-31-package-management — notes

`content/az-400/quizzes/31-package-management.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.1.1 (q3), 3.1.2 (q1, q4, q6, q10), 3.1.3 (q2, q8), 3.1.4 (q5, q7, q9). Positions 6–10: dropdown (text), yesno_statements, hotarea, dropdown (code), multi.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Retention and views.** "Delete and recover packages" says that packages in a view are exempt from retention policies, and that promoting a version is the way to keep it indefinitely. The chapter describes the two retention conditions but not this exemption. q4 states "No version has been promoted to a view" so that the exemption doesn't change the answer.
- **Feed Publisher (Contributor) rights.** The chapter's role table includes "yank". The Learn "Manage permissions" page lists publish, promote, deprecate and unlist, and Feed Owner adds "allow external package versions". Yank is specific to Cargo and isn't on that page, so it's worth checking. The page also says to assign Feed Publisher to **both** build identities when a pipeline must publish. The chapter says one *or* the other, depending on the job authorization scope, which agrees with "Understand job access tokens" (q6 follows that page).
- **Cross-project publishing.** Learn says that a project-level build identity that accesses a feed in another project also needs at least **Edit project-level information** in that project. The chapter doesn't mention this.
- **GitHub Actions artifact retention.** The training unit "Share artifacts between jobs" says the default retention is "90 days for public repos, 400 days for private". The chapter says 90 days by default, configurable up to 90 days (public) or 400 days (private). The chapter matches GitHub's documentation as I know it, and the training unit looks wrong, but I didn't fetch the GitHub page. q5 avoids any default value.
- **Action versions.** The chapter uses `actions/upload-artifact@v7` and `actions/download-artifact@v8`. The Learn training unit still uses `@v4`. I couldn't check the current major versions on Learn, so the quiz names the actions without a version.
- **DotNetCoreCLI@2.** The reference page lists `bySemVerBuildNumber` in one allowed-values list but not in the other. The chapter lists three schemes and doesn't mention it. The page also says that `byBuildNumber` expects a build number format containing a version.

## Not verified on a fetched Learn page

- `npm ci` (q8) installs from the lock file and never writes to package.json or package-lock.json; `npm update` installs the highest version in the range. I checked both on docs.npmjs.com, not on Learn. The Learn reference (Visual Studio package.json page) covers `~`, `^` and package-lock.json only.
- q4 (retention): Learn says that a version is deleted when **both** conditions are true. The quiz assumes they are evaluated per version, so the oldest version survives if it was downloaded recently. That reading matches the page's wording, but Learn doesn't give a worked example.
- q3: there's no Cargo registry in GitHub Packages. I inferred this from the list of ecosystems on the Learn unit "Publish packages"; no page says it explicitly.
- q10: the stem says the @Release view is visible to the organization, because Learn requires that visibility for a view used as an upstream source by another feed. With this stated, I believe no other step is needed, but no Learn page lists the steps for an in-organization upstream end to end.

## Design notes

- I avoided the decisions of the mock questions. The new decisions are:
  - which view holds an unpromoted version (@Local);
  - npm tilde resolution;
  - Cargo plus npm in one service;
  - retention conditions evaluated per version;
  - per-artifact `retention-days`;
  - which build identity to use when job authorization is limited to the project, plus `NuGetAuthenticate@1`;
  - counters with a composite prefix (Build.Reason) and per-pipeline scope;
  - `npm ci` vs `npm update` with a caret range;
  - `byEnvVar` and the `versionEnvVar` syntax;
  - an upstream to another feed's @Release view plus the Collaborator role for saving packages.
- No preview or retired feature is an answer.
