# Q-aif-c01-4b — report

42 questions, prefix `aifc01-4b-`, folder `content/aif-c01/questions/responsible/`. Validator: 0 problem(s).

- Per objective: 4.1.7 = 9, 4.2.1 = 9, 4.2.2 = 8, 4.2.3 = 8, 4.2.4 = 8.
- Types: single 33, multi 5, ordering 2, dragdrop 2 (one more single than the target of 32, which the task allows since the mix is approximate).
- Difficulty: 17 easy, 19 medium, 6 hard.

## Choices and deviations
- The multi and dragdrop stems end with the per-element scoring NOTE, as in the writing guide and in CLF-C02, even though AWS scores every AIF-C01 type all or nothing (the blueprint says so, but the loader does not apply that rule yet). Remove the NOTE if all-or-nothing scoring is turned on.
- No closed service appears as a right answer. SageMaker Clarify, Model Monitor, Ground Truth, A2I and Amazon Q do not appear in any option. Bedrock human-based evaluation uses an Amazon Cognito managed work team (from the docs), so it does not depend on Ground Truth.
- Most concepts in 4.1.7, 4.2.1, 4.2.3 and 4.2.4 (label quality, subgroup and intersectional analysis, independent human audits, explainability mechanisms, trade-offs, transparency strategy, human oversight, measuring explanations, accessibility) come from the AWS Well-Architected Responsible AI Lens (published November 2025) and the "Model interpretability" page of the healthcare ML whitepaper. The references are the H1 titles of those pages, without the " - Responsible AI Lens" suffix.
- `aifc01-4b-ai-service-cards` cites https://aws.amazon.com/ai/responsible-ai/resources/, which is an AWS page but not docs or an FAQ. Its second reference is the Lens page RAIGT01-BP02.
- I found no AWS documentation that states a direct "safety vs transparency" trade-off. For 4.2.3 I used only documented points: the publication review that protects sensitive design information while keeping appropriate transparency (RAIGT01-BP01), post hoc explanations that adversarial inputs can affect, and the privacy versus explainability, transparency versus accuracy and explainability versus latency trade-offs.
- I did not use open-weight models whose safeguards can be removed by fine-tuning as a safety-vs-transparency example, because I could not verify it in AWS docs.
