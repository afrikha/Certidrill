# Q-dva-c03-2d — QUESTIONS DVA-C03, security 2.3.2–2.3.5 (2026-11-20)

- 36 questions (`dvac03-2d-*`), 9 per objective; single 30, multi 6; difficulty 12 easy / 17 medium / 7 hard. Validator: 0 problem(s).
- No DVA-C03 course chapters existed when written; facts come from the AWS pages listed as references (all fetched with WebFetch).

## Deviations and doubts
- `dvac03-2d-kiro-content-collection`: the reference is `https://kiro.dev/docs/privacy-and-security/data-protection/` (Kiro's own docs site, not docs.aws.amazon.com). The option names (Telemetry and Content, "Content Collection for Service Improvement", "Usage Analytics And Performance Metrics") come from that page.
- French: "guardrail" is rendered « barrière de protection (guardrail) » at first mention, as the fr_fr Bedrock pages do (they also use « garde-fou »). "Prompt attack" is « attaques par invite », "system prompt" « invite système » (no fr_fr page found for these terms).
- `dvac03-2d-agentcore-policy`: the Cedar condition is described in words, not code; the core-concepts page gives only an illustrative syntax (`context.input.*`).
- Not used because not verified: Lambda advanced logging levels (page body did not load), the Bedrock `data_retention_mode` setting (new data-retention page, odd model names), CloudWatch managed data identifier names (questions say "managed data identifiers for email addresses…" without exact names).
- `dvac03-2d-cloudtrail-no-content`: the CloudTrail page shows that InvokeModel/Converse are management events and its examples contain only the model ID; it does not state as a rule that the prompt text is never in the event, so the question does not claim it.
