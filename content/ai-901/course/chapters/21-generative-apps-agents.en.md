Building a generative AI solution in Microsoft Foundry follows one path: write prompts, deploy a model and test it in the playground, call it from a small client application, then package it as an agent and call the agent. The exam asks which portal action comes when, and what each line of a short Python client does.

<!-- section: prompts | objectives: 2.1.1 -->
## System and user prompts

| | System prompt | User prompt |
| --- | --- | --- |
| Purpose | Sets the behavior of the model: role, tone, scope, format, constraints | Asks for one answer: a question or an instruction |
| Written by | The developer of the application, once | The end user, or the application on the user's behalf, at each turn |
| In the Foundry playground | The **Instructions** box | The message typed in the chat pane |
| In code | The message with the role `system` | The message with the role `user` |

```text
System: You are a support assistant for Contoso Bikes. Answer only questions about orders and repairs. Reply in three bullet points at most. If you don't know, say so.
User: My order arrived with a bent wheel. What are my options?
```

What makes prompts effective:

- **A complete system prompt** gives a role, limits the scope ("answer only questions about..."), fixes the format and the tone, and gives the model a way out ("if you don't know, say so") instead of letting it invent an answer.
- **A clear and specific user prompt** states the task explicitly, adds context (topic, audience), shows an example of the expected result when the style matters, and asks for a structure such as bullet points or a table.
- **Conversation history** is sent with each new prompt, so a follow-up question is understood in context. Starting a new chat (**New chat** in the playground) clears it.

> **Exam trap.** Rules that must hold for the whole conversation, such as the role, the refusal of off-topic questions or the output format, go in the system prompt, not in each user prompt. The model answers the user prompt while following the system prompt.

<!-- section: deploy-and-playground | objectives: 2.1.2 -->
## Deploying a model and using it in the Foundry portal

A **Foundry resource** is the Azure resource that hosts models and services. A **Foundry project** is a workspace inside it, where you deploy models and build agents. One resource can hold many projects.

1. Sign in to the Foundry portal at `https://ai.azure.com` with the **New Foundry** toggle on. Select the current project name, then **Create new project**, and enter a project name. The portal creates the Foundry resource for you; **Advanced options** let you choose the resource group and the location. The first project of a resource is its default project.
2. On the **Discover** page, open the model catalog (**Models**), select a model and read its page.
3. Select **Deploy**. With the default settings the deployment takes the name of the model.
4. The model playground opens. Write the system prompt in **Instructions**, type user prompts in the chat pane, and adjust parameters such as temperature and max output tokens.
5. Open the code view: the portal shows code that calls the deployment with the same instructions and parameters, as a starting point for your client.

The project **Home** page shows the project endpoint, the API key and the Azure OpenAI endpoint.

<!-- section: chat-client | objectives: 2.1.3 -->
## A lightweight chat client with the Foundry SDK

A lightweight client is a small application, often one Python file, that collects the user's input, calls a remote model and shows the result. The model runs in Foundry, not in the client. The Foundry SDK (`azure-ai-projects` package) provides a project client, `AIProjectClient`, and from it an OpenAI-compatible client that calls models through the **Responses API**.

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project = AIProjectClient(
    endpoint="https://<resource>.services.ai.azure.com/api/projects/<project>",
    credential=DefaultAzureCredential(),
)
openai_client = project.get_openai_client()

response = openai_client.responses.create(
    model="gpt-4.1-mini",
    input=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Summarize our release notes in 3 bullets."},
    ],
    temperature=0.7,
    max_output_tokens=300,
)
print(response.output_text)
```

| Element | Role |
| --- | --- |
| `DefaultAzureCredential()` | Authenticates with Microsoft Entra ID, for example after `az login`; no key in the code |
| `endpoint` | The project endpoint, copied from the project **Home** page |
| `get_openai_client()` | Returns the OpenAI-compatible client |
| `responses.create(...)` | Sends the prompt to the model through the Responses API |
| `model` | The **deployment name**, not necessarily the name of the model |
| `input` | The prompt: a simple string, or a list of messages with roles |
| `response.output_text` | The text generated by the model |

You can also create the `OpenAI` client of the `openai` package directly, with `base_url` set to the Azure OpenAI endpoint (`https://<resource>.openai.azure.com/openai/v1/`) and `api_key` set to the key. The call to `responses.create` is the same.

<!-- section: single-agent | objectives: 2.1.4 -->
## Creating and testing an agent in the portal

An agent is a reusable component that packages three things: a **model**, **instructions** (the system prompt) and **tools**.

| Addition | What it gives the agent | Examples |
| --- | --- | --- |
| **Tools** | Actions: the model decides when to call them | Web search, code interpreter, custom functions, MCP servers |
| **Knowledge** | Context: content retrieved to ground the answers | Uploaded files (file search), document stores |

1. Deploy a model and open it in the playground.
2. Write the **Instructions**.
3. Under **Tools**, add a tool such as **Web search**.
4. Add knowledge: upload a file; the portal indexes it and attaches the index to the agent.
5. Select **Save as agent** and give the agent a name.
6. Test it in the agent playground: check that it follows its instructions, calls its tools when relevant and cites its knowledge source.

The saved agent keeps its model, instructions and tools together, so every application that calls it gets the same behavior.

> **Exam trap.** Tools are actions; knowledge is context. "The agent must answer from the company's product manuals" calls for knowledge. "The agent must look something up on the web or run code" calls for a tool. Changing the instructions alone gives the agent neither.

<!-- section: agent-client | objectives: 2.1.5 -->
## A lightweight client for an agent

The client connects to the project with the same `AIProjectClient`, retrieves the agent by its name and references it in the request. The sample code is available in the code view of the agent playground. The code below follows the Learn training module.

```text
agent = project.agents.get(agent_name="support-agent")
openai_client = project.get_openai_client()

response = openai_client.responses.create(
    input=[{"role": "user", "content": "Tell me what you can help with."}],
    extra_body={"agent": {"name": agent.name, "type": "agent_reference"}},
)
print(response.output_text)
```

| | Chat client | Agent client |
| --- | --- | --- |
| Targets | A model deployment: `model="..."` | An agent: `extra_body` with an `agent_reference`, or a client bound to the agent |
| Instructions | Sent by the client in the request | Stored in the agent |
| Tools and knowledge | None unless the client adds them | Those configured in the agent |

The current SDK documentation (`azure-ai-projects` 2.3.0 or later) also binds the client to the agent: `project.get_openai_client(agent_name="support-agent")` returns a client whose `responses.create(input=...)` calls go to that agent, with no `model` and no `extra_body`.

> **Exam tip.** In a code question, look for what the request names. A `model` argument with a deployment name is a chat client. An agent name, in an `agent_reference` or in `get_openai_client(agent_name=...)`, is an agent client; it doesn't repeat the system prompt, because the agent already holds it.

<!-- section: key-points -->
## Key points

- System prompt: role and rules for the whole conversation (**Instructions**). User prompt: one request.
- Portal path: create a project, pick a model in the catalog, **Deploy**, test in the playground, view the code.
- Chat client: `AIProjectClient` with the project endpoint, `get_openai_client()`, `responses.create(model=..., input=...)`, `output_text`.
- Agent: model, instructions and tools; knowledge grounds the answers. **Save as agent**, then test in the agent playground.
- Agent client: `agents.get(agent_name=...)`, then `responses.create` with an `agent_reference`; or `get_openai_client(agent_name=...)`, then `responses.create(input=...)`.
