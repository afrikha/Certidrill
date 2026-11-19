# Q-aif-c01-1a — report

49 questions in `content/aif-c01/questions/aiml/` (prefix `aifc01-1a-`): 1.1.1 ×9, 1.1.2–1.2.1 ×8 each.
Types: single 38, multi 6, ordering 2, dragdrop 3. Difficulty: 20 easy / 22 medium / 7 hard.
Single-answer positions: a 8, b 10, c 11, d 9. Validator: 0 problem(s).

## Choices and deviations

- The scoring NOTE sentence is on the `multi` and `dragdrop` questions, as in the CLF-C02 and SAA-C03 banks and the writing guide, even though AWS scores these all or nothing (blueprint `multiScoring` not implemented yet). If the all-or-nothing rule is implemented, remove the NOTE from these 9 files.
- Many references are AWS concept pages (`aws.amazon.com/what-is/...`, `aws.amazon.com/compare/...`, `aws.amazon.com/ai/responsible-ai/`), because the AI/ML definitions of 1.1.x are there rather than on docs.aws.amazon.com. Every reference was fetched on 2026-11-19, and each title is the page title.
- No closed service is a right answer. SageMaker Clarify, Model Monitor, Ground Truth, A2I, Kendra, Amazon Q, Amazon Forecast and Fraud Detector are not used, even as distractors. The Rekognition moderation question does not mention A2I (the Rekognition page still links to it).

## Facts left out (could not be verified on the fetched pages)

- Real-time endpoint payload (6 MB) and timeout (60 s) limits: the "Real-time inference" page does not state them, so no question uses them.
- Serverless Inference payload and timeout limits: not on the page.
- The Amazon Bedrock batch inference discount compared with on-demand: not on the batch inference page. The Bedrock batch question uses "LEAST operational overhead" rather than cost.
- Real-time endpoints scaling to zero (inference components): not verified, so no question says whether real-time endpoints can scale to zero.
- Amazon Transcribe Call Analytics sentiment: not described on the fetched page. In `value-call-sentiment`, sentiment comes from Transcribe + Comprehend.
