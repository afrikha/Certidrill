# QZ-ai-300-33-prompt-management — notes

Quiz: `content/ai-300/quizzes/33-prompt-management.yaml`, 10 questions (3.3.1 ×4, 3.3.2 ×3, 3.3.3 ×3). Positions 6–10: dragdrop, single, single, multi, single. Checker: 0 problem(s), 0 warning(s). Every fact was checked on the Learn pages cited in the quiz (fetched 2026-11-24).

## Chapter vs current Learn (to fix in the chapter, not done here)

- **"Newer chat models are less sensitive to the order."** "Prompt engineering techniques" doesn't say this. It says that for ChatGPT and GPT-4, the response was the same whether or not the instructions came first. It also says that some techniques give different results with newer models such as gpt-4.1 and gpt-4.5. Reword the chapter's note.
- **Citations.** Learn says that inline citations reduce false content better than citations at the end. The chapter only says "ask for citations".
- **Use of affordances** (stop at a tool call such as `SEARCH("query")`, run it, paste the result back) is a technique on the same page. It's missing from the chapter's table.
- **Estimated cost of evaluation runs.** "See Evaluation Results in Microsoft Foundry portal" says the estimate exists only for **Global Standard** model deployments, can be marked **partial**, and excludes negotiated pricing and discounts. The chapter states the cost estimate without these limits. q4 and q10 state Global Standard in the stem.
- **Comparison labels.** The chapter quotes only ImprovedStrong and Inconclusive. Learn also defines ImprovedWeak, DegradedStrong, DegradedWeak, ChangedStrong and ChangedWeak: "Strong" means p ≤ 0.001, "Weak" means 0.001 < p ≤ 0.05. q10 relies on DegradedWeak, so a learner needs this table. The chapter should add it.
- **Role rename.** The same page notes that Azure AI User is now **Foundry User**. The chapter already uses Foundry User.
- **Training module out of date.** "Understand Microsoft Foundry agents and prompt versioning" still shows `AIProjectClient.from_connection_string` and `agents.create_agent`. The current quickstart ("Quickstart: Create a prompt agent") uses `project.agents.create_version` with `PromptAgentDefinition`, as the chapter does. The quiz follows the quickstart.
- **Experiments.** "Apply Git-based workflows to optimization experiments" says to document a failed experiment, then keep its branch or delete it, but delete it only once the results are committed. It also tags promotions as `promoted-to-prod-<date>`. Neither point is in the chapter. Not tested.
- **Reasoning models.** The reasoning page says reasoning models other than GPT-6 Astra don't support `temperature`, `top_p` or `max_tokens`, and that the GPT-6 feature table contradicts this. `reasoning.summary` exists only in the Responses API, and summaries aren't guaranteed for every request. q7 uses gpt-5, so the `temperature` statement holds.

## Doubts and design notes

- q5: Learn says that Foundry creates a new agent version on every create or update. It doesn't say whether versions are immutable. The question claims only that a new version 4 is created, which the chapter also states.
- q6: few-shot examples aren't among the techniques, so no item competes with priming for an output-format problem. "Lower the temperature" is the distractor for calculation errors.
- q8: option d is a valid comparison. It's wrong only because the stem asks for the fewest new runs, and its explanation says so.
- q3 tests the other branch of the mock question `ai300-3c-prompt-file-format`. There the prompt has no variables and the answer is `.txt`; here run-time variables make `.jinja2` the answer. The Learn table also lists `.py` for dynamic content, so no `.py` option is offered.
- Prompt flow variants (retiring April 20, 2027) and the `microsoft/ai-agent-evals` action (preview) aren't used as answers.
- Overlap with the mock exam was checked against all 34 questions of 3.3.x. Decisions tested here and not there: priming, `temperature` vs `top_p`, `.jinja2` for variables, latency and cost in run details, the result of a rollback in Foundry, a four-problem technique mapping, `reasoning.summary`, a comparison with a changed judge and dataset, PR pipeline to the development project with a tag-triggered production deployment, and statistical labels combined with a promotion policy.
