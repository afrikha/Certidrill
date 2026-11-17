AI-assisted tools write, explain and run T-SQL for you: GitHub Copilot in SQL Server Management Studio (SSMS) and in Visual Studio Code with the MSSQL extension, Copilot in Microsoft Fabric, and Model Context Protocol (MCP) servers that give an agent live access to a database. Exam questions ask what data leaves your environment, how to turn each tool on, which chat mode and file a requirement calls for, and which MCP endpoint connects an agent to SQL Server, Azure SQL or a Fabric lakehouse with the least privilege.

<!-- section: security-impact | objectives: 1.4.1 -->
## Security impact of AI-assisted tools

Every prompt is sent to a cloud-hosted model, with context the tool adds to it:

| Tool | Context sent with the prompt |
| --- | --- |
| GitHub Copilot (VS Code, Visual Studio, SSMS) | The code you are editing, content of open files, your prompt, and schema information when the editor is connected to a database. SSMS may add the SQL Server version and information about the database |
| Copilot in Fabric | Metadata of the workspace items: lakehouses, warehouses, semantic models |
| Copilot for SQL database in Fabric | The database **schema**, not the data |

What Microsoft states about that data: prompts and responses are not used to train the models, data is encrypted in transit and at rest, and GitHub Copilot in SSMS doesn't retain prompts, responses or system metadata.

The tools act **with your identity**. In SSMS, a query that Copilot writes runs under the permissions of your login: without `SELECT` on `Sales.Orders`, Copilot can't read it either. An MCP server acts with the identity it connects with, so that identity is the real security boundary.

| Risk | Control |
| --- | --- |
| Regulated data (PII, financial, health) or trade-secret schemas sent to a cloud model | Classify the data first; restrict who gets Copilot licenses or Fabric Copilot access (security groups) in line with database access |
| Credentials pasted in prompts or stored in files the assistant reads | Environment variables, VS Code input prompts (`"password": true`), Azure Key Vault; never a password in `mcp.json` or an instruction file |
| Generated `GRANT` statements wider than needed | Review every permission statement against least privilege |
| Generated dynamic SQL open to injection | Require `sp_executesql` with parameters, never string concatenation of user input |
| An agent that can modify data | Dedicated read-only identity for the MCP server, a development or test database rather than production, approval of each tool call |
| MCP traffic over the public internet | Firewall rules, private endpoints or VPN for sensitive environments |

Agent experiences ask before acting: in the MSSQL extension, Agent mode requires approval for each tool invocation; in SSMS and VS Code, write operations in Agent mode are never performed without your explicit approval.

Data residency in Fabric: if the capacity is outside the US or France, Copilot for SQL database is off until an administrator enables **Data sent to Azure OpenAI can be processed outside your capacity's geographic region, compliance boundary, or national cloud instance**. When a Fabric data agent is consumed from a non-Fabric service, including as an MCP server, responses can leave Fabric's compliance boundary and fall under that service's data handling terms.

Governance for GitHub Copilot: a policy on the GitHub Copilot administrator dashboard turns Agent mode and MCP on or off in SSMS, an **MCP server allow list** restricts which servers users can add, and GitHub Enterprise Cloud records Copilot usage in audit logs.

> **Exam trap.** AI-generated code is a first draft. Content filtering reduces insecure patterns but doesn't replace review: the correct answer to "ensure generated T-SQL meets security standards" is human review (plus tests), not "trust Copilot's filters" or "add an instruction file".

<!-- section: enable-copilot | objectives: 1.4.2 -->
## Enabling GitHub Copilot and Copilot in Fabric

**GitHub Copilot** needs a GitHub account with Copilot access (a paid plan, or Copilot Free) and a supported editor.

| Environment | How to enable |
| --- | --- |
| SSMS 22 | Visual Studio Installer > SSMS > **Modify** > Workloads tab > **AI Assistance** > Modify. Then select the GitHub Copilot badge (upper right) > **Open Chat Window to Sign In** and sign in with the account that has Copilot access |
| Visual Studio Code | Install the **GitHub Copilot** and **GitHub Copilot Chat** extensions and sign in to GitHub, install **SQL Server (mssql)**, connect from the **Connections** view, then right-click the database > **Chat with this database** |

SSMS features by version: chat and inline chat; autocompletions from SSMS 22.2; Agent mode and MCP servers from SSMS 22.7.

In VS Code, the first database chat asks you to grant the MSSQL extension access to the language models of GitHub Copilot Chat. The `@mssql` chat participant is **schema-aware** through the connected database; inline completions (ghost text in `.sql` files) are **not**. Slash commands such as `@mssql /connect` and `@mssql /changeDatabase` connect and switch databases.

**Copilot in Fabric** is controlled by a Fabric administrator in the admin portal > **Tenant settings** > **Copilot and Azure OpenAI Service**:

| Setting | Purpose |
| --- | --- |
| Users can use Copilot and other features powered by Azure OpenAI | The main switch, for the organization or specific security groups |
| Data sent to Azure OpenAI can be processed outside your capacity's geographic region, compliance boundary, or national cloud instance | Needed when the capacity is outside the regions where Fabric processes Copilot requests (for Copilot in SQL database: outside the US and France) |
| Capacities can be designated as Fabric Copilot capacities | Lets capacity admins designate a Fabric Copilot capacity |
| Users can use Copilot, AI Agents, and other AI experiences powered by OpenAI as a Microsoft subprocessor | Allows features that use OpenAI as a subprocessor |

Prerequisites and rules:

- A paid capacity **F2 or higher**, or Power BI Premium **P1 or higher**, in a supported region. Trial SKUs aren't supported for Copilot in SQL database. Pro and Premium Per User workspaces need a **Fabric Copilot capacity**.
- Copilot is enabled by default for tenants with paid capacities; Microsoft recommends scoping it to security groups first.
- If the settings are **delegated to capacity administrators**, each capacity admin enables them on their capacity.
- Copilot for SQL database isn't available when Private Link is enabled and public access is disabled.

Copilot in the Fabric SQL query editor offers a **chat pane** (natural language to T-SQL; it can't edit queries already in the editor), **code completion** (Tab accepts), and quick actions **Fix** and **Explain** on a highlighted query. It doesn't run queries on its own.

> **Exam trap.** A user with a workspace role still gets no Copilot when the tenant switch is off, when the workspace is on a trial or Pro capacity, or when the tenant settings are delegated and the capacity admin hasn't enabled them. A GitHub Copilot license doesn't enable Copilot in Fabric: they are separate products.

<!-- section: models-mcp-tools | objectives: 1.4.3 -->
## Models, chat modes and MCP tools in a chat session

**Model.** In SSMS and VS Code, a model picker at the top of the Copilot Chat window selects the model for the session (GPT, Claude and Gemini families, depending on your plan). Use a more capable model for optimization and design, a faster one for routine completions.

**Mode.** The mode decides what Copilot can do:

| Mode | What it does | MCP tools |
| --- | --- | --- |
| Ask | Answers and generates code in the chat; `@mssql` in VS Code runs read-only queries by default | No |
| Edit | Applies changes across files in the workspace | No |
| Agent | Plans and runs multistep work with tools: connect, list databases, run queries, read execution plans, change schema, with approval | **Yes** |
| Plan (MSSQL extension) | Designs a data model from a requirements document before any DDL | Through `@mssql` context |

**Tools.** In Agent mode, the **Tools** icon of the chat lists every MCP server and its tools, with a status (green when healthy). Enable only the tools the task needs for this session. In SSMS, tools of a newly added MCP server are **disabled by default**: enable each tool in the Tools list before Copilot can use it.

Adding a server:

| Client | How |
| --- | --- |
| VS Code | Command Palette > **MCP: Add Server** > HTTP or Stdio, or a workspace file `.vscode/mcp.json` that VS Code detects and offers to start |
| SSMS 22.7+ | Tools icon > green **+** > **Add custom MCP server** (Server ID, Type HTTP or stdio) or **Add from MCP registry**, or the user-level file `%USERPROFILE%\.mcp.json` |

```json
{
  "servers": {
    "sales-sql": {
      "type": "http",
      "url": "https://dab-sales.azurewebsites.net/mcp",
      "headers": {
        "Authorization": "Bearer ${input:sql_token}"
      }
    }
  },
  "inputs": [
    {
      "id": "sql_token",
      "type": "promptString",
      "description": "Access token for the Sales MCP endpoint",
      "password": true
    }
  ]
}
```

The `inputs` entry prompts for the token at startup and keeps it out of the file, which can then be committed and shared with the team.

**Copilot in Fabric** works on the workspace resources automatically. To use Fabric data from another chat client, publish a **Fabric data agent** and copy its MCP server URL (see the last section). Which AI providers Fabric may call is decided by the tenant settings above, not by the user in the chat.

> **Exam trap.** "Copilot can't see the MCP server tools" usually means the chat is in Ask or Edit mode, or the tool is disabled in the Tools list. Switch to **Agent** and enable the tool; reinstalling the extension or changing the model doesn't help.

<!-- section: instruction-files | objectives: 1.4.4 -->
## GitHub Copilot instruction files

Instruction files send your team's standards with every chat request.

| File | Location | Applies to |
| --- | --- | --- |
| Repository instructions | `.github/copilot-instructions.md` at the repository root | Every chat request in the repository; no frontmatter needed |
| Scoped instructions | `.github/instructions/<name>.instructions.md` | Files that match the `applyTo` glob in the frontmatter |
| `AGENTS.md` | Repository root | Cross-agent alternative to `copilot-instructions.md` |
| Prompt files | `.github/prompts/<name>.prompt.md` | Nothing automatically: a reusable prompt you pick in the chat |
| User and organization instructions | User profile, organization settings | Personal preferences; centrally managed standards |

A repository file for a database project:

```text
# Database development standards

- Target: Azure SQL Database. Always use schema-qualified names (dbo.Customer).
- Tables singular PascalCase; procedures usp_ActionEntity; views vw_EntityName.
- Explicit column lists, never SELECT *.
- Every procedure: SET NOCOUNT ON, TRY...CATCH, explicit transaction for writes.
- Never GRANT to public. Never concatenate user input: use sp_executesql with parameters.
- Use EXISTS rather than COUNT(*) for existence checks.
```

A scoped file that applies only to T-SQL files:

```text
---
applyTo: '**/*.sql'
---
Use THROW, not RAISERROR, in new code.
Name indexes IX_TableName_ColumnName.
```

Rules to remember:

- `applyTo` patterns are relative to the workspace root, not to `.github/instructions`: `tests/**/*.sql` matches `tests/unit/a.sql` but not `src/a.sql`.
- Instructions don't apply to **inline suggestions** as you type; they apply to chat.
- Instructions guide the model; they don't guarantee compliance and don't replace tests, code review or security controls.

> **Exam tip.** "All developers must get the same T-SQL conventions automatically" = `.github/copilot-instructions.md` committed to the repository. "Only for `.sql` files" = a `.instructions.md` file with `applyTo`. "A reusable task the developer starts on demand" = a `.prompt.md` file.

<!-- section: mcp-endpoints | objectives: 1.4.5 -->
## Connecting to MCP server endpoints

| Requirement | Endpoint |
| --- | --- |
| Agent access to SQL Server or Azure SQL tables, views and procedures, with role-based permissions | **SQL MCP Server** (Data API builder) |
| Chat about a database you are connected to in VS Code, no server to run | MSSQL extension, **Chat with this database** |
| Azure SQL plus other Azure resources from Agent mode | **Azure MCP Server** extension, signed in with your Azure account |
| Lakehouse, warehouse or semantic model data in Fabric | A published **Fabric data agent** used as an MCP server |

**SQL MCP Server** is Microsoft's open-source MCP server built into Data API builder (DAB) 1.7 and later (2.0 recommended). It exposes the same entities, roles and permissions as the DAB REST and GraphQL endpoints, over **streamable HTTP** (for example `http://localhost:5000/mcp`) or **stdio**.

```bash
dab init --database-type mssql --connection-string "@env('SQL_CONNECTION_STRING')" --host-mode development
dab add Product --source dbo.Product --source.type table --permissions "anonymous:read" --description "Products sold online"
dab start                               # HTTP endpoint .../mcp
dab start --mcp-stdio role:reader       # stdio transport, as the role reader
```

Its tools are generated from the configuration: `describe_entities`, `create_record`, `read_records`, `update_record`, `delete_record`, `execute_entity` and `aggregate_records`. A stored procedure entity can be published as a named custom tool (`"mcp": { "custom-tool": true }`, DAB 2.0 and later), and an entity can be hidden from MCP:

```json
{
  "entities": {
    "Payroll": {
      "source": "dbo.Payroll",
      "mcp": { "dml-tools": false },
      "permissions": [ { "role": "hr", "actions": [ "read" ] } ]
    }
  }
}
```

Design choices to know: the agent never queries the database directly, only through DAB entities (which can alias names and hide columns); SQL MCP Server deliberately doesn't do NL2SQL (DAB builds deterministic T-SQL) and doesn't run DDL; `read_records` results are cached. In stdio mode the role defaults to `anonymous`.

**Fabric lakehouse.** Create a data agent in the workspace, give it the lakehouse or warehouse as a source, **publish** it, then open its **Settings** > **Model Context Protocol** tab and copy the **MCP server URL**. Add it as an HTTP server in `.vscode/mcp.json`; VS Code offers **Add Server** and you sign in with your Microsoft account. The **Microsoft Fabric MCP Server** extension for VS Code simplifies this setup.

**Azure SQL** endpoints also need network access: the client IP allowed in the server firewall, or a network path to the private endpoint.

| Authentication to the MCP endpoint | Use for |
| --- | --- |
| Interactive sign-in in the browser | Development |
| Service principal (Microsoft Entra application) | Automated or shared environments |
| API key, where the server supports it | Stored in an environment variable or an input prompt, never in the file |

Test the connection in Agent mode: the server shows green under the Tools icon, and "What tables are available in the database?" returns your real schema.

> **Exam trap.** Use separate MCP endpoints for development, test and production, and give each the narrowest identity: read-only, or schema-only when the agent only needs metadata. Pointing an agent at production with a `db_owner` identity is never the least-privilege answer.

<!-- section: key-points -->
## Key points

- Prompts carry code, open files and schema to a cloud model; they aren't used for training. Copilot acts with your permissions, an MCP server with its own identity.
- SSMS 22: AI Assistance workload; Agent mode and MCP from 22.7. VS Code: GitHub Copilot, GitHub Copilot Chat and mssql extensions; `@mssql` is schema-aware, inline completions aren't.
- Copilot in Fabric: tenant setting "Users can use Copilot and other features powered by Azure OpenAI", F2 or P1 and higher (no trial), cross-geo setting outside the processing regions.
- MCP tools work only in **Agent** mode and must be enabled in the Tools list.
- `.github/copilot-instructions.md` for the whole repository, `.instructions.md` with `applyTo` for file patterns, `.prompt.md` for reusable prompts; none applies to inline suggestions.
- SQL MCP Server = Data API builder, seven DML tools, same RBAC as REST and GraphQL, no NL2SQL, no DDL. Fabric lakehouse = published data agent, MCP server URL in its settings.
