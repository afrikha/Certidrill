# Q-aif-c01-2a — QUESTIONS AIF-C01, domain genai (2.1.1–2.1.5)

- 60 questions in `content/aif-c01/questions/genai/aifc01-2a-*.yaml`, 12 per objective.
- Types: single 46, multi 7 (5 options / choose 2), ordering 3, dragdrop (matching) 4. Difficulty: 24 easy / 27 medium / 9 hard.
- Validator: `CERT=aif-c01 npx tsx factory/validate.ts --prefix aifc01-2a-` → 60 files, 0 problem(s).
- No AIF-C01 course chapter existed while writing. The facts come from AWS pages fetched on 2026-11-19, and every reference was fetched.

## Format decisions
- Multi and matching stems end with the scoring NOTE, as the WRITING_GUIDE and the existing CLF-C02 / SAA-C03 banks do. The profile says AIF-C01 scores everything all or nothing: remove the NOTE lines if the app adopts `all_or_nothing`.
- Ordering stems: "Select the correct steps ... (Select and order FOUR.)". Matching stems: "Select the correct X from the following list for each Y. Each X should be selected one time or not at all. (Select FOUR.)", with `reuse: false`.
- None of the closed services (Clarify, Model Monitor, Q Business, Q Developer, Kendra, Agents Classic) appears, as an answer or as a distractor.

## References outside docs.aws.amazon.com
- AWS "What is" pages (aws.amazon.com/what-is/generative-ai, /foundation-models, /large-language-model, /diffusion-model): no docs.aws.amazon.com page covers diffusion models, self-attention or FM vs traditional ML at this level.
- `https://aws.amazon.com/bedrock/pricing/` (title "Amazon Bedrock Pricing"): per-token / per-image on-demand billing, batch at about 50 % below on-demand for select models.
- `https://kiro.dev/docs/` ("Kiro Documentation"): Kiro has no docs.aws.amazon.com page.

## Facts checked that drive answers
- Bedrock service tiers: Reserved (1- or 3-month term, set up through the account team, 99.5 % target), Priority (premium, fastest), Standard (default), Flex (discount, longer processing; evaluations, summarization, agentic workflows). Pricing page: Priority +75 %, Flex −50 % (percentages not used in the questions).
- Provisioned Throughput: model units, billed hourly, no commitment / 1 month / 6 months. Batch inference is not supported for provisioned models.
- Prompt caching: on-demand only (not batch), cache checkpoints, prefix must be static, default TTL 5 minutes (1 hour for some Claude models).
- CountTokens API: free, matches the billed input tokens.
- Chunking strategies: default (~300 tokens), fixed-size, hierarchical (child matched, parent returned), semantic (uses an FM, extra cost), none.
- Nova: Micro text only 128K; Pro 300K; Nova 2 Lite up to 1M; Canvas (image, inpainting/outpainting/background removal); Reel (video); Nova 2 Sonic (speech-to-speech); Nova Multimodal Embeddings (unified vector space).
- AWS Quick: the docs now say "AWS Quick". The question uses the guide's name, "Amazon Quick", and the explanation mentions the new name.

## Not used (could not verify or ambiguous)
- Whether a custom model must use Provisioned Throughput. The PT page says it must, but on-demand deployment of custom models exists for some models, so no question depends on it.
- The input versus output price ratio (it varies by model). Only "both are billed" is tested.
