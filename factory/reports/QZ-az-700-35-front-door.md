# QZ-az-700-35-front-door — report

File: `content/az-700/quizzes/35-front-door.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).

Objectives: 3.3.1 (q1), 3.3.2 (q6), 3.3.3 (q3), 3.3.4 (q7), 3.3.5 (q4), 3.3.6 (q9), 3.3.7 (q2), 3.3.8 (q5, q8), 3.3.9 (q10). Positions 6–10: single, single, dropdown, yesno_statements, single.

The 36 mock-exam questions on 3.3.x already cover most of the obvious decisions, so the quiz tests other ones: the Premium downgrade, the CAA record, rule condition AND/OR logic, HTTPS plus UDP service choice, the origin host header, a permanent redirect that keeps the path, cache-duration precedence, and the Private Link 7,200 RPS limit.

## Chapter vs current Learn (Nov. 2026) — chapter not edited

- **PoP selection (3.3.7).** The chapter says "Unicast PoP selection: DNS returns the IP address of the best PoP… (or to the user's DNS resolver…)". The Learn page "Traffic acceleration" has both an **Anycast** section and a **Unicast** section and doesn't say which applies when. It doesn't mention the DNS resolver at all. I didn't test it; the chapter should be checked.
- **Origin weight range.** The chapter says weight 1 to 1,000. "How to configure an origin for Azure Front Door" gives a default of 1000, but its example uses weights 1000 and 2000, which contradicts a 1,000 maximum. Not tested.
- **Wildcard domains and managed certificates.** Learn "Domains in Azure Front Door" says managed certificates on **wildcard** domains are **not** rotated automatically, and that apex domains may need revalidation. The chapter's renewal row only covers the CNAME case.
- **Stop evaluating remaining rules.** Learn "What is a rule set" says that when it's selected, the remaining **rule sets** of the route don't run. The chapter says it "ends the processing for that request". Close enough, but whether it also skips later rules in the same set isn't documented. Not tested.
- **Not in the chapter.** The origin response timeout (16 to 240 seconds, profile-wide), and the fact that requests above 7,200 RPS get `429 Too Many Requests` (q10's stem gives the status code).
- **BYOC app registration.** Learn says access through the Front Door app registration (service principal) "is being deprecated"; managed identity is recommended. The chapter puts both options side by side.

## Not verified

- The limits table in the chapter (endpoints 10/25, custom domains 100/500, origin groups and origins per profile, 50 origins per group, 100 rules per set). The Front Door section of the subscription limits page was beyond what I could fetch. I didn't use them.
- 308 keeps the request method: true per RFC 7538, but the Learn URL redirect page only states it for 307. q8 avoids 308 (its options are 301, 302 and 307).
- WebSocket support (the Learn page didn't load). q1 uses IPv6 and HTTP/2 instead, which the overview page confirms.

## Doubts

- q10: the answer adds origins for the same app with different Private Link regions. Learn prefers a separate app instance per origin but allows the same host name with different regions. The stem sets latency sensitivity to 1,000 ms, so all the origins receive traffic.
- q7: the stem states the origin host header explicitly, rather than relying on the default (portal: origin host name; ARM without a value: the incoming host name).
