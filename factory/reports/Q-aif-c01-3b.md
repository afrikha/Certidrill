# Q-aif-c01-3b — report

50 questions in `content/aif-c01/questions/foundation/`, prefix `aifc01-3b-`, all `status: draft`.

- Per objective: 3.1.6 = 10, 3.2.1 = 10, 3.2.2 = 10, 3.2.3 = 10, 3.2.4 = 10.
- Types: single 39, multi 6 (5 options, choose 2), ordering 2 (6 actions, count 4), dragdrop 3 (AWS matching, `reuse: false`, one unused item each).
- Difficulty: easy 20, medium 22, hard 8 (40 / 44 / 16 %).
- Validator: `CERT=aif-c01 npx tsx factory/validate.ts --prefix aifc01-3b-` → 50 files, 0 problem(s).

## Sources (all fetched with WebFetch on 2026-11-19)

Bedrock user guide (what-is-prompt-engineering, prompt-engineering-guidelines, prompt-injection, guardrails, guardrails-prompt-attack, agents, playgrounds), AgentCore developer guide (overview, memory), Amazon Nova user guide (prompting, prompting-precision, prompting-system-role, prompting-chain-of-thought, prompting-examples, prompting-support-text, prompting-image-generation), AWS Prescriptive Guidance (agentic-ai-foundations introduction, Strands Agents, LLM prompt engineering common attacks and best practices), AWS CAF for AI security perspective, AWS Quick and AWS Transform user guides, aws.amazon.com/what-is/ai-agents and /what-is/prompt-engineering.

## Notes and doubts

- **Scoring NOTE.** The 6 multi and 3 dragdrop stems end with the per-element NOTE, as BRIEF.md, the writing guide and the CLF-C02 / SAA-C03 banks do. The AIF-C01 profile and blueprint say every AWS type is scored all or nothing: if that rule is implemented, remove the NOTE bank-wide.
- **Closed services.** No question makes SageMaker Clarify, Model Monitor, Amazon Q Business, Q Developer or Bedrock Agents Classic an answer or a distractor. Agents Classic is closed to new sign-ups (confirmed on the Bedrock "agents" page); AgentCore + Strands Agents are used instead.
- **Amazon Quick.** Option text uses the exam guide name "Amazon Quick"; the explanation says AWS documentation now names it AWS Quick (`aifc01-3b-agent-quick-nocode`).
- **"Using multiple comments" (3.2.3).** The meaning of this guide bullet is unclear and no AWS page explains it, so no question tests it.
- **Hijacking / exposure / poisoning (3.2.4).** AWS has no single page defining these four guide terms. Mapping used: hijacking = prompt injection that overrides the developer's instructions (goal hijacking, Guardrails prompt-attack page); exposure = leakage of the system prompt, conversation history or other users' data (Prescriptive Guidance attacks, CAF); poisoning = malicious data in training or retrieved content datasets (CAF security perspective).
- **Negative prompts.** Tested on Amazon Nova Canvas `negativeText` (no negation words, plain nouns); for text models negative instructions appear as "Do not..." constraints in the matching question.
- **Reference titles** are page H1s without the " - Amazon Bedrock" suffix; the AgentCore overview page H1 is just "Overview".
- AgentCore Policy and newer AgentCore services (Harness, Optimization, Payments, Registry) appear on the overview page but are not tested (too recent / beyond foundational scope).
