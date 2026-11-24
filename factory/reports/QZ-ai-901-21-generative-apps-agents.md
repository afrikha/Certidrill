# QZ-ai-901-21-generative-apps-agents — doubts and notes

## Chapter out of date or inconsistent with current Learn (chapters not edited)

- **The `extra_body` agent reference has two forms on Learn (agent-client section).**
  - The chapter's code follows the training unit "Creating an agent": `extra_body={"agent": {"name": agent.name, "type": "agent_reference"}}`, with `pip install --pre azure-ai-projects>=2.0.0b1`.
  - The current docs show other syntaxes:
    - "Quickstart: Get started with Microsoft Foundry SDK" (`azure-ai-projects>=2.3.0`) binds the client to the agent with `project.get_openai_client(agent_name=...)` and uses no `extra_body`.
    - "Build with agents, conversations, and responses" (runtime components) does the same.
    - The migration guide (`agents/how-to/migrate`, "Current" snippets) uses `extra_body={"agent_reference": {"name": ..., "type": "agent_reference"}}`. The key there is `agent_reference`, not `agent`.
  - The chapter's key `"agent"` may therefore be a pre-release form. Worth checking the current 2.x SDK reference and possibly teaching `get_openai_client(agent_name=...)`.
  - The quiz avoids the exact `extra_body` syntax. Q10 only says "retrieve the agent by name and reference it in the request".
- **Creating a project (portal section).** The chapter says you "name the Foundry resource and choose the subscription, the resource group and the region" when you create a project. The current page "Create a project for Microsoft Foundry" describes:
  - a **New Foundry** toggle;
  - **Create new project** from the project selector;
  - a project name;
  - **Advanced options** for the resource group and location.

  The portal creates the Foundry resource automatically. Naming the resource and choosing the subscription aren't described there. The page also mentions a **default** project per resource. The quiz doesn't test this step.
- **Chat client `base_url`.** The chapter writes `https://<resource>.openai.azure.com/openai/v1/`. The training unit "Using a generative AI model" builds `base_url=f"{AZURE_OPENAI_ENDPOINT}/openai"`. Both appear on Learn (the image-generation unit uses `/openai/v1/`). The quiz doesn't depend on the suffix.
- **Max output tokens and throttling.** The training unit "Generative AI models" still says to "lower max tokens" against throttling. The quota page contradicts this, as already reported in QZ-ai-901-12. Not used here.

## Unverified or weakly sourced facts used

- **Q7 (playground settings aren't stored in the deployment).** No page says this in one sentence. The answer is built from:
  - the chapter's chat-client table ("Instructions: sent by the client in the request");
  - "Using a generative AI model": after testing you can "use the same system and user prompts and parameter values in your code", and the playground "provides code that calls your Foundry deployment".
- **Q9 s3 (a second request without history or `previous_response_id` has no context).** The runtime-components page shows that a follow-up uses `previous_response_id` or a conversation. It doesn't state the negative case explicitly. The chapter's history bullet concerns the playground.
- **Q3 (specific user prompt).** "Prompt engineering techniques" covers specificity ("reduce interpretation and narrow the task"). The audience/format advice comes from the chapter.

## Facts verified (pages fetched 2026-11-24)

- **Home page.** The project **Home** page shows the project endpoint and API key. The key isn't needed with Entra ID ("Create a project for Microsoft Foundry"). Used in Q2.
- **Playgrounds.** The agents playground has Instructions, Tools (code interpreter, file search, web search) and Knowledge. The model playground has **Save as agent**, the **Code** tab, and **Compare models** with up to three models; Tools are hidden in compare mode ("Microsoft Foundry Playgrounds"). Used in Q4, Q7.
- **Agent components.** An agent packages a model, instructions and tools. Knowledge = context, ingested and indexed, with citations. Tools = actions ("Creating an agent"). Used in Q4, Q8, Q10.
- **Web search tool.** No Bing resource is needed for general web search, and responses include URL citations ("Web search tool"). No preview label applies to the tool itself; preview labels concern only the .NET SDK and deep research. Used in Q8.
- **Give the model an "out" and specificity.** Both are on "Prompt engineering techniques". Used in Q3, Q6.
- **Chat client via the OpenAI package.** The client takes `base_url` + `api_key`; `responses.create(model=<deployment>, input=[...])` is the same call ("Using a generative AI model"). `AIProjectClient` + `DefaultAzureCredential` + `az login` + `get_openai_client()` come from the SDK quickstart. Used in Q5, Q9.

## Other notes

- **Mock overlap.** The bank has about 100 questions on 2.1.1–2.1.5 and covers nearly every single decision. The quiz uses diagnosis and comparison angles that the bank doesn't ask:
  - fixing a system prompt from two reported symptoms;
  - why playground settings don't reach an app;
  - what stays the same when switching to the `openai` client;
  - the absence of context in a second request;
  - a chat client that copies the agent's instructions but loses its knowledge.
- **Q4 stem rewritten.** The first stem was too close to `ai901-2b-agent-yn-save-flow` (checker similarity 0.51).
- **Reference titles.** They use the page H1, as the AI-901 bank does.
