# QZ-dp-800-23-cicd-database-projects — report

File: `content/dp-800/quizzes/23-cicd-database-projects.yaml` (10 questions, `dp800-qz-23-01` to `-10`). Check: `npx tsx factory/check-quiz.ts dp-800 23-cicd-database-projects` → 0 problem(s), 0 warning(s).

## Chapter out of date or wrong against current Learn
- **Pipeline controls table, "When pipelines run (triggers)", Azure DevOps column: "`trigger` (CI on push), `pr` or build validation (pull requests)".** "Build Azure Repos Git repositories - Azure Pipelines" says that for an Azure Repos Git repository you cannot configure a PR trigger in the YAML file. You must use a build validation branch policy. YAML `pr` triggers apply only to GitHub and Bitbucket Cloud. The chapter should say this, because it's a classic trap. Quiz question 9 tests it.
- **SQLCMD variables section (not wrong, but incomplete).** "SQLCMD Variables in SQL Projects" says `DefaultValue` isn't compiled into the .dacpac and is used only by the publish dialogs of graphical tools. A command-line deployment without `/v` or a publish profile gets empty values. This is worth one sentence in the chapter.
- **Testing strategy section (minor).** The SSDT test conditions page also lists **Inconclusive**, the default condition added to every test. Its "Extensible test conditions" section says "six predefined" conditions, but its table lists eight.

## Learn content that contradicts the chapter (the chapter is right)
- Training unit "Detect and Resolve Schema Drift" says the next deployment drops "every object the project doesn't know about". With the default `DropObjectsNotInSource=False`, objects that aren't in the project are kept. The chapter and the mock question `dp800-2c-drift-statements` are correct. Don't reuse the module's sentence.

## Unverified or partly verified
- The **SqlPackage Publish** page (`sqlpackage-publish`) returned `client_error` on every attempt. The defaults of `BlockOnPossibleDataLoss` and `DropObjectsNotInSource` come from the chapter and the bank, not from a fetch in this session. Question 10 cites the "SQL Projects Target Platform" page instead, and that page confirms `/p:AllowIncompatiblePlatform=true`. Question 3 cites the SqlPackage overview, which says Publish incrementally updates the schema to match the source.
- Question 3: no page says in so many words that republishing overwrites an altered procedure. It follows from the Publish definition. The training unit only implies it.
- "Get Started with SQL Database Projects" doesn't mention Linux or macOS. Question 2 uses a Linux computer, as the bank question `dp800-2c-sdk-linux-build` does. The chapter's claim "Windows, Linux, macOS" wasn't re-verified.

## Choices
- Every question avoids the decisions of the 70 mock questions of 2.3.x. New decisions: one object per file (1), the template install (2), republishing to discard an unauthorized change (3), the Scalar Value condition (4), a conditional `WHEN NOT MATCHED BY SOURCE` (5), artifact upload/download with `needs` (6), a conflict plus a build validation re-run plus the refactorlog (7), a SQLCMD secret through a Key Vault-linked variable group (8), the Azure Repos `pr` trap (9), and `AllowIncompatiblePlatform` for an integration-test container (10).
