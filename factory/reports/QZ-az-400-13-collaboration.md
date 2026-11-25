# QZ-az-400-13-collaboration — notes

`content/az-400/quizzes/13-collaboration.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.3.1 (q1, q5), 1.3.2 (q4, q7), 1.3.3 (q9), 1.3.4 (q6), 1.3.5 (q3, q8), 1.3.6 (q2, q10). Positions 6–10: multi (choose 3), single, dragdrop, dropdown (YAML), yesno_statements.

## Chapter vs current Learn (fix in the chapter, not done here)

- **`actions/checkout@v4`** in the GitHub Actions example of section docs-from-git: the current major version in the action's README is **v7** (chapter 21 already uses v7). The quiz uses v7.
- **Azure Boards app prerequisites**: install-github-app also lists "Administrator or owner of the GitHub organization to install the app" plus *read* permission on the repositories, while connect-to-github asks for administrator or owner of each repository. The chapter merges both; fine, but the two Learn pages differ.
- **Missing from the chapter, worth adding** (q8 relies on Learn for them): PAT connections don't support pull request status checks or GitHub Copilot integration (GitHub App connection required); a repository already connected with another authentication type must be removed from that connection before it is reconnected through the app; when `AB#` links fail for one area path, the Azure Boards identity needs *View/Edit work items in this node* on that area path. q8 tests these with the chapter's "Only select repositories" and "add another connection" points, so a careful reader of the chapter alone may miss two of the four targets.
- **Service hooks**: Learn's overview says a subscription created for a resource that its creator can't access is never triggered (q6). The chapter doesn't say it. The Web Hooks page also lists Project Collection Administrators, not only Project Administrators, as able to create subscriptions.
- **Teams / Azure Boards**: the chapter's "creating work item subscriptions requires Project Administrators or Team Administrators" is confirmed; Learn adds that Team Administrators can't remove or modify subscriptions created by Project Administrators (q10 s2). Learn's boards-teams page doesn't name the OAuth policy; the training unit says "app access via OAuth ... is enabled".
- **GitHub app for Teams**: the chapter's "only one required label filter per repository" and "commits notify for the default branch" weren't found on a Learn page (only on GitHub's side); not used in the quiz.
- **OpenAPI**: the Learn page (aspnetcore-11.0 view) no longer mentions the `OpenApiGenerateDocumentsOnBuild` property that the chapter names; it says installing `Microsoft.Extensions.ApiDescription.Server` generates the document during build, with `OpenApiDocumentsDirectory` and `OpenApiGenerateDocumentsOptions`. The chapter's property name should be checked or removed. The quiz (q7) names only the package.

## Not verified on a Learn page

- GitHub webhook practices (`X-Hub-Signature-256`, 10-second answer, `X-GitHub-Delivery`): no Learn page exists (the Learn module "Monitor GitHub events by using a webhook with Azure Functions" now redirects to the Functions HTTP trigger article). So 1.3.4 is tested through Azure DevOps service hooks only.
- q9: `--first-parent` / `--merges` behavior is standard Git; `contents: write` for creating a release was checked on docs.github.com (REST "Create a release"); `gh release create` flags on cli.github.com. The Learn references (changelog and releases training units) cover the topic, not these exact flags.
- q4: categorization by labels only and the `"*"` catch-all were checked on docs.github.com ("Automatically generated release notes"); the Learn training unit shows the file but doesn't explain the wildcard.

## Design notes

- Mock questions read: all `1.3.x` files in `questions/processes/` (including cs1c, cs2c, cs3a and series sr1, sr2). Avoided their decisions: `[[_TOC_]]`/Mermaid/`.order`/Create Repository permission, GitHub Pages, `release.yml` keys, `gh release create` generate/start-tag/prerelease, shallow fetch, `persistCredentials`, git log range, Run state changed filters, Incoming WebHook, `X-Hub-Signature` header, AB# locations and keywords, Teams app matching, `addAreapath`, Workflows app.
- New decisions: `[[_TOSP_]]`, `%2D`/`%3A` file names, `workflows` feature of the GitHub Teams app, Project Collection Administrators prerequisite, labels vs title prefixes, build-time OpenAPI, service hook creator access + Minimal + HTTPS, four Boards connection repairs, `--first-parent` + `--notes-file` + `contents: write` + `fetch-depth: 0`, Teams subscription/unlink rights.
