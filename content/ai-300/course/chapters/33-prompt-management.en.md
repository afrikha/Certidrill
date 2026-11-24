In a generative AI application, the prompt is the component that changes most often, and a one-word change can alter accuracy, tone, safety and cost for every user at once. GenAIOps treats prompts like code: designed with proven techniques, compared as variants on the same test data, stored in Git, reviewed, tagged and promoted through environments. Exam questions ask which technique fixes a prompt problem, how to compare two prompts fairly, and how to organize and release prompt versions.

<!-- section: prompt-design | objectives: 3.3.1 -->
## Designing and developing prompts

With chat models, a prompt is made of a **system message** (instructions that set behavior, scope, tone and format), optional **few-shot examples** (pairs of user and assistant messages), **grounding data** (retrieved documents or facts) and the user's input. In Foundry agents, the system message is the agent's `instructions`, combined with a model deployment and optional tools.

| Technique | When it helps | Note |
| --- | --- | --- |
| Clear instructions at the start | Always: say the task before the context and examples | Still recommended; in Learn's tests, ChatGPT and GPT-4 gave the same response whether the statement came first or last |
| Repeat instructions at the end | The model ignores a rule given early in a long prompt | Models show **recency bias**: the end of the prompt weighs more |
| Few-shot examples | The output must follow a format or style the model doesn't infer | Conditions the current inference only; the model isn't changed. The order of examples matters |
| Break the task down | Multi-part requests produce incomplete answers | Ask for steps separately (for example extract facts, then answer) |
| Chain of thought | Non-reasoning models make errors on multi-step problems | Ask the model to proceed step by step. **Only for non-reasoning models** |
| Specify the output structure | Responses must be parsed or must cite sources | Ask for citations or a fixed structure; citations make fabricated statements less likely, and **inline** citations work better than citations at the end |
| Clear syntax and delimiters | Instructions and data get mixed up | Separate sections with Markdown headings or XML tags |
| Priming the output | The response must start in a given form | End the prompt with the first words of the expected answer |
| Grounding context | Answers must be factual and current | Provide the source data; the closer it is to the final answer, the fewer errors |
| Use of affordances | The model must check facts or get current information instead of relying on its parameters | Tell it to emit calls such as `SEARCH("query")`, stop generation at those calls, run them, then paste the results back into the prompt |

Learn states that these prompt engineering techniques aren't recommended for **reasoning models** (gpt-5 and o-series), and that some techniques give different results with newer models: test them with an evaluation rather than assuming they help. Extracting a reasoning model's reasoning by any method other than its reasoning summary parameter (`reasoning.summary`, Responses API) isn't supported, and summaries aren't guaranteed for every request.

Generation parameters complete the design. `temperature` ranges from 0 to 2: low values give focused, repeatable output; high values more varied output. Change either `temperature` or `top_p`, not both. Cap the output length to control cost. Reasoning models other than GPT-6 Astra don't support `temperature`, `top_p` or `max_tokens`: cap their output with `max_output_tokens` (Responses API) or `max_completion_tokens` (Chat Completions).

A system message structure that works well and versions cleanly:

```text
# Role
You are the order-support assistant for Contoso Outdoor.

# Rules
- Answer only from the documents in the Sources section.
- If the answer isn't in the sources, say that you don't know.
- Never ask for payment card numbers.

# Output
Two to four sentences, then the cited source titles in brackets.

# Sources
{retrieved_documents}
```

In a Foundry project, a prompt becomes part of an **agent version**: creating or updating an agent creates a new version. A deployment script reads the prompt from a file in the repository, so the prompt text never lives only in the portal:

```text
from pathlib import Path
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

project = AIProjectClient(
    endpoint="https://contoso-ai-dev.services.ai.azure.com/api/projects/support",
    credential=DefaultAzureCredential(),
)

instructions = Path("src/agents/order_agent/prompts/v3_instructions.txt").read_text()

agent = project.agents.create_version(
    agent_name="order-agent",
    definition=PromptAgentDefinition(model="chat", instructions=instructions),
)
print(agent.name, agent.version)
```

> **Exam trap.** "Add 'think step by step' to the prompt" is the wrong fix for a reasoning model: chain-of-thought prompting applies only to non-reasoning models. And few-shot examples don't train the model: they influence only the requests that contain them, and they cost input tokens on every call.

<!-- section: prompt-variants | objectives: 3.3.2 -->
## Creating prompt variants and comparing performance

A **variant** is an alternative version of a prompt or of its settings (instructions, examples, temperature, model deployment). Comparing variants is a controlled experiment:

1. Change **one thing at a time**, keep everything else identical.
2. Run every variant on the **same evaluation dataset**, representative of real traffic (including edge cases and unsafe requests).
3. Score each run with the **same evaluators** (for example groundedness, relevance, task adherence, a safety evaluator) and record latency and token cost.
4. Compare against a **baseline** and check that the difference is statistically meaningful before you promote.

**In Foundry projects**, each variant is typically an agent version or a prompt file deployed to a development project. Two ways to compare:

| Tool | How it compares |
| --- | --- |
| Evaluation runs in the portal | Select two or more runs, then **Compare**; set a **baseline run**. Cells are colored using statistical t-tests (Improved = desired direction, Degraded = wrong direction, Changed = no desired direction; suffix Strong for p at most 0.001, Weak for p above 0.001 and at most 0.05, for example ImprovedStrong or DegradedWeak; Inconclusive when there are too few examples or p is 0.05 or more). The comparison view isn't saved |
| `microsoft/ai-agent-evals` GitHub Action (preview) | `agent-ids: "order-agent:3,order-agent:4"` evaluates several versions on the data file; the first is the baseline unless `baseline-agent-id` is set; the summary shows confidence intervals and a pairwise significance test |

For runs against a model target, the run details also show p50 and p95 end-to-end latency and an estimated cost from token usage. The estimate exists only for **Global Standard** model deployments, is marked **partial** when some models can't be priced, and excludes evaluator model usage, evaluation runtime costs, negotiated pricing, commitments and discounts: use Azure billing data for actual charges.

**In Foundry (classic) prompt flow**, variants are a built-in feature of the **LLM tool** node: the original node is `variant_0` (the default); **Clone** creates `variant_1` with different prompt text or parameters. A single run tests the variants of one LLM node at a time, the other nodes using their default variant. To compare at scale, run a batch run with an evaluation method over a dataset, then multi-select the variant runs and select **Visualize outputs**; finally set the best variant as the node's default. Prompt flow is retired on **April 20, 2027**, is no longer recommended for new development, and its replacement is Microsoft Agent Framework (evaluation flows map to Azure AI Evaluation SDK evaluators).

| Requirement | Answer |
| --- | --- |
| Know whether version 4 of the prompt is really better than version 3 | Evaluate both on the same dataset with the same evaluators; compare runs with version 3 as baseline and check significance |
| Isolate the effect of a new few-shot example | A variant that differs only by that example |
| Choose between two temperatures for an existing prompt flow LLM node | Two variants of the node, a batch run with evaluation, Visualize outputs |
| Block a prompt change that lowers quality | Evaluation in the pull request pipeline with a pass-rate threshold |
| Quality equal, choose the cheaper variant | Compare token usage and latency of the runs |

> **Exam trap.** Comparing a new prompt on a new dataset with an old prompt's scores from last month measures two changes at once. The fair comparison runs both variants on the same dataset, with the same evaluators and the same judge model deployment.

<!-- section: prompt-git | objectives: 3.3.3 -->
## Version control for prompts with Git

Editing a prompt directly in the portal leads to predictable failures: silent quality degradation, environments that drift apart, no way to restore the version that worked, and safety instructions removed by someone who thought they were unnecessary. Storing prompts in a Git repository gives history, review, environment separation and rollback.

A repository layout recommended for Foundry agents keeps prompts in separate files next to the script that deploys them:

```text
project-root/
├── .env                          # local settings, not committed
├── .gitignore
├── requirements.txt
├── src/
│   └── agents/
│       └── order_agent/
│           ├── order_agent.py    # deployment script
│           └── prompts/
│               ├── v1_instructions.txt
│               ├── v2_instructions.txt
│               └── v3_instructions.txt
├── tests/
│   └── test_order_agent.py
├── infra/
│   └── main.bicep
└── .github/
    └── workflows/
        ├── test-agents.yml
        └── deploy-agents.yml
```

Conventions:

| Topic | Practice |
| --- | --- |
| Format | Plain text (`.txt`) for agent instructions, Markdown for documentation, YAML or JSON for configuration and metadata, templates (`.jinja2`) for dynamic prompts |
| Naming | Lowercase, underscores, version in the prompt file name (`v2_instructions.txt`), prompts in a `prompts/` folder per agent, shallow hierarchy |
| Version alignment | Foundry numbers agent versions incrementally; number prompt files the same way so file, Git tag and agent version line up |
| Releases | A **Git tag** per deployed version (`v1`, `v2`...) identifies which commit produced which agent version |
| Secrets | Endpoints and keys in `.env` locally (never committed) and in pipeline variables or secrets; prefer Microsoft Entra ID with OIDC |

The workflow for a change:

```bash
git checkout main
git pull origin main
git checkout -b feature/improve-order-greeting

# edit src/agents/order_agent/prompts/v4_instructions.txt, update the script
git add src/agents/order_agent/
git commit -m "Order agent v4: shorter greeting, explicit refusal rule"
git push origin feature/improve-order-greeting

# after review, evaluation and merge to main
git checkout main
git pull origin main
git tag v4
git push origin v4
```

1. Work on a **branch** (`feature/...`, `hotfix/...`, `experiment/...`).
2. Open a **pull request** with the test results and the comparison with the current version; reviewers check accuracy, safety and tone.
3. A **pipeline** on the pull request deploys the candidate to a development project and runs the evaluation; a threshold blocks the merge if quality drops.
4. After approval, **merge** to `main` and **tag** the release.
5. A deployment pipeline promotes the same prompt files to test and production; monitor after release.
6. To roll back, redeploy the prompt files of the previous tag; Foundry records a new agent version with the earlier instructions.

```yaml
on:
  pull_request:
    branches: [ main ]
    paths: [ "src/agents/**" ]

permissions:
  id-token: write
  contents: read

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - name: Create the candidate agent version
        run: |
          pip install -r requirements.txt
          python src/agents/order_agent/order_agent.py
      - uses: microsoft/ai-agent-evals@v3-beta
        with:
          azure-ai-project-endpoint: ${{ vars.FOUNDRY_PROJECT_ENDPOINT }}
          deployment-name: eval-judge
          agent-ids: "order-agent:3,order-agent:4"
          data-path: ${{ github.workspace }}/evals/order-agent.json
```

The pipeline identity authenticates with workload identity federation (no secret stored) and needs Foundry User on the project. Evaluations cost tokens: run them on pull requests that touch prompts, not on every commit.

> **Exam tip.** When a question asks how to know which prompt is running in production and restore the previous one quickly, the answer combines prompts stored as files in Git, a tag per release, and a deployment script or pipeline that creates the agent version from those files, not edits in the portal.

<!-- section: key-points -->
## Key points

- Prompt = system message + few-shot examples + grounding data + user input; in Foundry agents, the system message is the agent's instructions, and each create or update makes a new agent version.
- Techniques: instructions first and repeated at the end, few-shot, task breakdown, chain of thought (non-reasoning models only), output structure and citations, Markdown or XML delimiters, grounding. Change `temperature` or `top_p`, not both.
- Variants: one change at a time, same dataset, same evaluators, baseline, statistical significance (portal Compare, `ai-agent-evals` with several `agent-ids`).
- Prompt flow variants: LLM node only, `variant_0` default, batch run plus Visualize outputs; prompt flow retires April 20, 2027.
- Git: prompts in versioned files, branch, pull request with evaluation gate, merge, tag, promote; roll back by redeploying the previous tag.
