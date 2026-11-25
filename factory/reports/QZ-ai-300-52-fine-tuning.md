# QZ-ai-300-52-fine-tuning — notes

Quiz `content/ai-300/quizzes/52-fine-tuning.yaml`, 10 questions (5.2.1 ×3, 5.2.2 ×2, 5.2.3 ×3, 5.2.4 ×2). Formats at positions 6–10: multi, dropdown, hotarea, multi, single. `check-quiz` reports 0 problems and 0 warnings.

## Pages fetched (learn.microsoft.com, 2026-11-24)

The pages fetched were:

- Training in Microsoft Foundry (`/azure/foundry/fine-tuning/overview`), fetched twice (also through the old considerations URL, which now serves the same page)
- SFT how-to
- DPO how-to
- RFT how-to
- Manage fine-tuning costs
- Deploy fine-tuned models
- Generate synthetic data (preview)
- RBAC for Azure OpenAI (classic)

## Chapter vs current Learn (to fix in the chapter, not done here)

- **Page title.** The overview page is now titled "Training in Microsoft Foundry". The old considerations URL serves the same page. Fourteen bank questions still cite it as "Fine-tuning in Microsoft Foundry", which is outdated.
- **Supported models.** The chapter's table lists only OpenAI models. Learn now lists open models too:
  - SFT: `Llama-3.3-70B-Instruct`, `Qwen3-32B`, `gpt-oss-20b`, `Ministral-3B`, plus several preview models.
  - RFT: `o4-mini` and `gpt-5` (by invitation) as GA, plus preview models such as `MAI-Code-1.1-Flash` and `gpt-oss-120b`.
  - Learn adds that a model supported for one method isn't automatically supported for another.
- **DPO billing.** The chapter's cost table says DPO bills "Training tokens". Learn groups SFT and DPO under token-based billing and shows the formula tokens × epochs × price. The DPO row probably needs "× epochs" (Learn doesn't say so explicitly for DPO).
- **Canceled jobs.** The chapter says only that jobs canceled before training starts aren't billed. Learn adds two points:
  - A canceled run is charged for the work completed up to the cancellation.
  - Work lost because of a service error isn't billed.

  Learn also says that RFT grader tokens are billed at data zone rates after training completes. Q2 and Q10 use these facts.
- **Loss pattern.** The chapter has a row "Both losses stay high → check data quality, more examples". No fetched page (SFT, overview) states it; Learn's data quality guidance is "accurate, consistent, representative examples; inspect missing scenarios, duplicates, bias, sensitive information". Not used as an answer.
- **`FineTunedTrainingHours` metric.** Not found on the cost page. Still unverified.
- **RFT grader testing.** Learn says to test graders on "correct, incorrect, and malformed responses" and to check that superficial responses can't earn a high score. The chapter says "adversarial". Learn also says `cosine` is for evaluations, not RFT, and lists more `text_similarity` metrics (`gleu`, `meteor`, `rouge_1`…`rouge_5`).
- **Deployment types.** The overview lists **Data Zone Standard** (US data zone only) among the serverless deployment types for fine-tuned models. It's missing from the chapter's deployment-type table.
- **Deployment options.** The overview lists only Serverless and Managed compute (preview). Fireworks on Foundry (preview) appears only on the deploy page.
- **Role names.** The SFT, DPO and RFT pages say that Foundry User and Foundry Owner were renamed from Azure AI User and Azure AI Owner (same IDs and permissions). The Azure OpenAI RBAC page is now "(classic)".
- **Synthetic data generation.** Still preview ("functionality, formats, and limits may change"). The page has no "Simulation seed" generator; only Simple Q&A and Tool use exist. The bank question ai300-5b-prelaunch-eval-data uses "Simulation seed" as a distractor on another page (synthetic evaluation dataset), which wasn't re-checked here.

## Preview features and objective 5.2.2

The Foundry Data Generation tool is preview, and preview features must not be the correct answer. So the two 5.2.2 questions use teacher-generated (distillation) data, which Managed Training supports as GA, and data management rules from the GA pages:

- Q3: inspect the data for duplicates and missing scenarios.
- Q6: keep a real, held-out final test set, and mix real data with the synthetic data.

The bank's 5.2.2 questions test the preview tool directly; the quiz avoids repeating them.

## Not verified, or inferred

- Q3 and Q6: a *higher* learning rate tends to increase overfitting. This is inferred from Learn's "a smaller learning rate multiplier can help reduce overfitting".
- Q6: "validation data can't also be the final test". This is from "Separate training, validation, and final test data" plus general practice.
- Q10: the time an RFT job spends paused at the spending limit isn't billed. Inferred from "billed by training time" and the queue rule; the cost page doesn't say it explicitly. The training rate of 100 USD per hour is a stated assumption, not a real price.
- Q9: canceling a running RFT job stops further charges. Inferred from "canceled runs are charged for work completed up to cancellation".
- Q1, option d: models of different sizes don't share a weight structure. General knowledge, used only in a distractor explanation.

## Design notes

- The quiz avoids the bank's decisions, which include:
  - Developer training for experiments, and the expired Developer deployment;
  - deleting an old deployment;
  - per-grader scores and reward hacking;
  - the SFT checkpoint hotarea and the SFT cost calculation;
  - the DPO JSONL, DPO-on-SFT code and multi grader;
  - Tool use and Simple Q&A generator settings, and traces to dataset.
- The quiz tests instead:
  - distillation;
  - billing of canceled work;
  - Standard training for residency;
  - the deployment role;
  - the `score_model` grader and its templates;
  - DPO checkpoint choice by held-out preference rate, against the baseline;
  - a cost cleanup with SLA and geography constraints;
  - an RFT cost calculation (failed job, queue, spending-limit pause, grader tokens).
- French: « réglage précis », « point de contrôle », « évaluateur » (grader), « référence » (baseline), « fuite d'évaluation », « surajustement », as in the chapter. Glossary-checked terms only where they exist; no AI-300 glossary file exists.
