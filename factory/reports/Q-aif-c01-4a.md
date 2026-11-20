# Q-aif-c01-4a — QUESTIONS AIF-C01, domain responsible (4.1.1–4.1.6)

- 54 questions in `content/aif-c01/questions/responsible/aifc01-4a-*.yaml`, 9 per objective; single 41, multi 7 (5 options / choose 2), ordering 3 (4 of 6 actions), dragdrop 3 (matching, 3–4 prompts); difficulty 22 easy / 24 medium / 8 hard.
- Validator: `CERT=aif-c01 npx tsx factory/validate.ts --prefix aifc01-4a-` → 0 problem(s).
- No AIF-C01 course chapter existed while writing (41-responsible-ai is being written in parallel); facts come from AWS pages fetched on 2026-11-19 (every reference was fetched).

## Choices and deviations
- Scoring NOTE sentence kept on multi and dragdrop, as in the WRITING_GUIDE and the CLF-C02 bank, although AWS scores all or nothing (blueprint `scoring` rule not implemented yet). Remove it in bulk if the platform switches AIF-C01 to all-or-nothing display.
- Closed services never used as answers: SageMaker Clarify, Model Monitor, Ground Truth, A2I, Debugger, Amazon Q. The Clarify "Class Imbalance (CI)" doc page is used only as a concept reference (aifc01-4a-data-rebalance-groups, aifc01-4a-bv-group-underrepresented); the page itself states Clarify is closed to new customers.
- Responsible AI dimensions: AWS's eight (Generative AI Lens / Nova responsible use). "Inclusivity" is not an AWS dimension; it is used as the guide's term (4.1.1 bullet) and defined from the Responsible AI Lens dataset guidance (underrepresented languages, user groups).
- FR: Guardrails policy names translated with the English name in parentheses at first use (sujets refusés, filtres de mots, filtres d'informations sensibles, vérifications de l'ancrage contextuel, vérifications par raisonnement automatisé, filtre d'attaques par invite); « garde-fou » for a guardrail; actions Block / Mask / Detect kept in English (console labels); « peaufiner » for fine-tune (as in objectives.yaml).

## Facts checked (Nov 2026) that drive answers
- Guardrails: content filters (Hate, Insults, Sexual, Violence, Misconduct + prompt attack), denied topics (up to 30, investment-advice example), word filters (profanity list, up to 10,000 custom items), sensitive information filters (Block / Mask=ANONYMIZE / Detect=NONE), contextual grounding (grounding + relevance, threshold 0–0.99, output only), Automated Reasoning checks (detect only, VALID/INVALID, English US). Input blocked → only guardrail evaluation is charged. ApplyGuardrail evaluates text without invoking an FM; the Guardrails product page says it works with self-hosted / third-party models. Versions: working draft → test window → create version → reference ID + version.
- AWS uncapped IP indemnity for outputs of generally available Amazon Nova models (Nova 2 responsible-use page; Service Terms §50.10); exclusions include failing to enable available filters, modifying/fine-tuning, knowing of infringement (§50.10.2). Service Terms §50.6: AI services not to be used by themselves for clinical decision-making.
- Bedrock does not store/review prompts and completions, never shares them with partners; AWS does not train Bedrock models (incl. Nova) on them (Nova responsible-use page).
- Inf2: up to 50% better performance/watt than comparable EC2 instances (Inferentia page). SUS01-BP01 Region choice (renewable projects / grid carbon intensity; anti-patterns). ML Lens sustainability: managed services or pretrained models (MLCOST-04), small datasets, stop idle resources, data/compute proximity (MLCOST-21).
- Bedrock automatic evaluation metrics per task: accuracy, robustness, toxicity (summarization: all three).

## Stated from sources other than the question's references
- "Bayesian search needs fewer jobs than grid search" (aifc01-4a-sel-multi-sustainable-dev, option a explanation): AWS Architecture Blog "Optimize AI/ML workloads for sustainability: Part 2"; the ML Lens pages fetched did not cover tuning.
- AWS Glue DataBrew availability to new customers was not stated on its "What is" page; no closure notice found (aifc01-4a-data-databrew-profile).
- The Customer Carbon Footprint Tool now appears to be documented as "AWS Sustainability" (billing docs redirect); not used in any question.
