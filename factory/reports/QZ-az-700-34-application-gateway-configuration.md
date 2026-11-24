# QZ-az-700-34-application-gateway-configuration — report

File: `content/az-700/quizzes/34-application-gateway-configuration.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).

Objectives: 3.2.6 (q1, q7), 3.2.7 (q3, q8), 3.2.8 (q2, q9), 3.2.9 (q4, q6), 3.2.10 (q5, q10). Positions 6–10: single, yesno_statements, dropdown, multi, dropdown.

## Chapter vs current Learn (Nov. 2026) — chapter not edited

- **Listener-specific TLS policies (3.2.9), missing limitation.** The chapter says "an SSL profile gives a listener its own policy" without the restrictions on the Learn page "Configure listener-specific SSL policies on Application Gateway through portal": listeners on the **same port** can't have policies with **different TLS protocol versions** (separate ports are needed), and legacy policies can't be used with the 2022 predefined or CustomV2 policies on the same gateway. An exam item asking for "TLS 1.3 only on one listener of port 443" would get a wrong answer from the chapter. I did not test this, since the chapter doesn't teach it.
- **Older TLS policies.** The chapter says `AppGwSslPolicy20150501` and `AppGwSslPolicy20170401` "are discontinued". The TLS policy overview page still lists them (20150501 is still the default for API versions earlier than 2023-02-01) and doesn't call them deprecated. It only says TLS 1.0/1.1 support ended on Aug 31, 2025. Suggest changing to "allow TLS 1.0/1.1, no longer supported since Aug 31, 2025".
- **Wildcard host names (3.2.6).** The chapter doesn't say that `*.contoso.com` doesn't match `contoso.com`, that `*` also matches nested subdomains (`customer1.b2b.contoso.com`), or that `?` matches one character. q7 tests these points (Learn "Application Gateway multi-site hosting"); worth adding a line to the chapter.
- **Request timeout of external backends.** Learn has 1–240 s for external backends and 1–86,400 s for private ones, which matches the chapter. Learn doesn't define "external" vs "private" exactly, so I didn't build a question on it.
- **Custom error pages.** Learn says global error pages can't be configured in the portal yet (only per listener), and that 404 isn't supported. The chapter doesn't mention either.

## Not verified (not used in the quiz)

- Frontend port range "1 to 64999 on v2" and the 16 KB PFX limit (the listener and TLS pages point to the limits page, which I didn't fetch).
- Rewrite limits (400 sets, 40 configurations, 40 conditions): not on the rewrite page.

## Doubts

- q6: on v2 without SNI, the rule that processes the HTTP request comes from the Host header (an IP address here, so the basic listener). This follows from listener matching; Learn doesn't describe this case.
- q9: when the host name isn't overridden, Learn (backend settings, trusted root certificate section) says the gateway uses the incoming Host header as the SNI by default. The answer depends on that.
