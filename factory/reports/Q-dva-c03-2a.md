# Q-dva-c03-2a — QUESTIONS DVA-C03, security 2.1.1–2.1.5 (2026-11-20)

- 50 questions in `content/dva-c03/questions/security/`, prefix `dvac03-2a-`: 10 per objective; single 42, multi 8 (one choose-3); difficulty 15/25/10. Validator: 0 problem(s).
- Facts checked with WebFetch on docs.aws.amazon.com (curl is blocked by the proxy). Reference titles fetched one by one.
- Course chapter `21-auth` appeared during the work; spot-checked, no contradiction found (presigned URL limits, aws login, SigV4a, function URL permissions since Oct 2025).

## Points not verified on a rendered AWS page (kept as general knowledge, low risk)
- S3 error code name `RequestTimeTooSkewed` (dvac03-2a-sigv4-clock-skew): the S3 API error page does not render through WebFetch; the 5-minute rule is from the SigV4 page.
- Roles Anywhere credential helper wired through `credential_process` (dvac03-2a-roles-anywhere-onprem): the intro page mentions a "credential helper configuration" but not the setting name.
- Missing session token causing an authentication error (dvac03-2a-boto3-session-token): stem avoids naming the exact error code.

## Deviations / choices
- POST policy question (dvac03-2a-presigned-post-limits) references the S3 user guide page "HTML forms (AWS signature version 2)": the SigV4 POST pages of the API reference do not render; conditions (`content-length-range`, `starts-with $key`) and `generate_presigned_post` are on that page.
- OpenSearch SigV4 signing (service name `es`/`aoss`) left out: the page did not render.
- Amazon Q Developer, Cloud9 and Copilot CLI never appear; X-Ray not used in this batch.
- New 2026 facts used: `aws login` (CLI 2.32.0+, SignInLocalDevelopmentAccess), Amazon Bedrock API keys (long-term = exploration only, short-term ≤ 12 h), Lambda function URLs needing both InvokeFunctionUrl and InvokeFunction since October 2025.
