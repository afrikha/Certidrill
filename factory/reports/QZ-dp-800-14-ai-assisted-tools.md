# QZ-dp-800-14-ai-assisted-tools — report

File: `content/dp-800/quizzes/14-ai-assisted-tools.yaml` (10 questions, `dp800-qz-14-01` to `-10`). `npx tsx factory/check-quiz.ts dp-800 14-ai-assisted-tools`: 0 problem(s), 0 warning(s).

Plan: 1 running a .prompt.md file (1.4.4) · 2 GitHub Enterprise Cloud audit logs (1.4.1) · 3 Azure MCP Server (1.4.5) · 4 SSMS `%USERPROFILE%\.mcp.json` (1.4.3) · 5 which instruction files a request includes (1.4.4, Yes/No) · 6 SQL MCP Server: no NL2SQL, stdio role defaults to anonymous, no DDL (1.4.5, Yes/No) · 7 MCP server allow list vs Disable Agent Mode (1.4.1) · 8 DAB + VS Code HTTP setup (1.4.5, ordering) · 9 `dml-tools` false / `custom-tool` true (1.4.5, dropdown) · 10 Copilot for a Pro workspace plus a security-group-scoped tenant setting (1.4.2, multi).

## The chapter out of date or contradicted by current Learn

- **Instructions and inline suggestions.** The Learn quickstart "Custom Instructions for GitHub Copilot and T-SQL" (sql/tools/visual-studio-code-extensions/github-copilot/custom-instructions, fetched on 2026-11-24) says: custom instructions "apply across every GitHub Copilot surface that matches the applyTo glob, including ask mode, edit mode, agent mode, and inline completions". The chapter says the opposite in three places: section 1.4.4 ("Instructions don't apply to inline suggestions"), the Key points, and the FR equivalents. The VS Code documentation says the chapter's version, so the sources disagree. The quiz doesn't test this point. The chapter should be aligned on Learn, or the point should be removed. No mock question tests it (grep "inline suggestion/completion": none).
- **AGENTS.md.** The same Learn page names AGENTS.md only as OpenAI Codex's file. It doesn't say that GitHub Copilot reads it. The chapter's table row "AGENTS.md — cross-agent alternative to copilot-instructions.md" isn't backed by the Learn pages I fetched. Not tested.
- **Plan mode.** Training unit 5 lists only Ask, Edit and Agent. I found no Learn source for the chapter's "Plan (MSSQL extension)" row. Not tested.
- **applyTo relative to the workspace root.** Not stated on the Learn pages I fetched (the mock questions `dp800-1d-applyto-*` rely on it). Not tested in the quiz.
- **Fabric tenant settings.** "Enable and configure Copilot in Microsoft Fabric" lists four delegable settings, including "Data sent to OpenAI as a Microsoft subprocessor can be processed outside your capacity's geographic region…". The chapter's table has "Capacities can be designated as Fabric Copilot capacities" in its place. The chapter could add the fourth setting and the delegation path (OneLake catalog > Govern > Capacities). Q10's stem states that the tenant allows Fabric Copilot capacities, so it doesn't depend on that setting.
- **SSMS admin controls.** Disable Agent Mode is an ADMX policy (Computer Configuration > Administrative Templates > SQL Server Management Studio > Copilot Settings). The MCP allow list is set in GitHub Copilot enterprise/organization policies (AI Controls > MCP). The chapter says "a policy on the GitHub Copilot administrator dashboard turns Agent mode and MCP on or off in SSMS", which is also on the SSMS MCP servers page. Both are correct. The chapter could name the ADMX policy.
- **Audit logs.** The chapter's "GitHub Enterprise Cloud records Copilot usage in audit logs" is confirmed by training unit 3 only. The SSMS admin-controls page doesn't mention audit logs.

## Assumptions stated in stems (not verified as defaults)

- Q8: the stem states that the configuration created by `dab init` enables REST, GraphQL and MCP. The default value of the runtime MCP setting wasn't verified.
- Q3: Azure MCP Server's coverage of storage accounts and web apps is inferred from "integration across Azure services, including SQL databases" (training units 5 and 7).

## Overlaps to know about

- Q9's first slot (`"dml-tools": false` on an entity) is the same decision as `dp800-cs2c-mcp-endpoint`, which is under objective 2.x, not this chapter's objectives. The other two slots (source type stored-procedure, `"custom-tool": true`) aren't tested anywhere else.
- Q3 makes Azure MCP Server the answer. In `dp800-1d-mcp-endpoint-choice`, it's a distractor for a different requirement.
