# QZ-az-700-54-waf — notes

`content/az-700/quizzes/54-waf.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 5.3.1 (q1), 5.3.2 (q2, q6), 5.3.3 (q3), 5.3.4 (q8), 5.3.5 (q4, q9, q10), 5.3.6 (q5), 5.3.7 (q7). Positions 6–10: multi, single, yesno_statements, dropdown, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Front Door association scopes.** "Policy settings for Web Application Firewall in Azure Front Door" says that policies can be associated at the profile, domain and route scopes, and that the most specific scope wins (route, then domain, then profile). The page's "Applies to" says **Front Door Premium** only. The chapter (section waf-association) says "Azure Front Door (Standard or Premium)" for these three scopes. Check whether route and profile scopes exist on Standard. q7 uses Premium.
- **Front Door match variables.** The current page "Custom rules for Azure Web Application Firewall on Azure Front Door" no longer lists `RemoteAddr` / `SocketAddr` among its match variables. It only mentions client IP, geo, AS number, client fingerprint and service tag conditions. The page "Configure an IP restriction rule with a WAF for Azure Front Door" still defines both variables, and q8 uses them. It also doesn't list a JS challenge action (the chapter lists JS challenge for Premium). I didn't use JS challenge.
- **Application Gateway size limits** (service limits page): with CRS 3.1 or earlier on v2, the maximum file upload is **750 MB** and the request body limit 128 KB. With CRS 3.2 or DRS it's 4 GB and 2 MB (and 2 GB for the body when enforcement is disabled). The default file upload limit is 100 MB, and there's a 4 KB buffer. The chapter gives 128 KB for CRS 3.1 but not the 750 MB upload cap. q9 relies on it.
- **Rate limiting on Application Gateway**: the page "Rate limiting for Azure Web Application Firewall on Azure Application Gateway" names the group-by values `ClientAddr` (default), `GeoLocation`, `None`, `ClientAddrXFFHeader` and `GeoLocationXFFHeader`, and says that counters are per association and not divided by scale-out. This matches the chapter. The page only says "select CRS 3.2" for the new engine. The chapter's "CRS 3.2 or later" (including DRS) wasn't confirmed on that page, so q10 uses CRS 3.2.
- **Origin lockdown**: "Secure traffic to Azure Front Door origins" (updated Oct 2026) gives the Application Gateway recipe: an NSG that allows 80/443 from `AzureFrontDoor.Backend` and denies them from `Internet`, plus a WAF custom rule on `X-Azure-FDID`. The chapter matches this.

## Not fully verified

- In q2, the private frontend of Application Gateway v2 is verified (frontend IP configuration page). The page doesn't say whether "private IP only" deployments are GA, so the option says "a listener on its private frontend IP address" without claiming that the gateway has no public IP.
- In q3, the claim that a disabled custom rule produces no log entries is inferred from "a custom rule can be disabled to stop evaluation" (Front Door custom rules page). The Application Gateway page doesn't say it explicitly.
- In q9, the requirement for a file upload limit above 1,536 MB for a 1.5 GB file assumes binary units. The option offered is 1,600 MB, which is safe either way.

## Design notes

The bank already covers bots, geo rules, RemoteAddr for a client behind a proxy, exclusions, CRS 3.2 for rate limiting, the DRS 2.2 CLI, upgrade side effects, domain association, per-URI and per-site policies, Front Door tiers, v1 retirement, anomaly scoring, Detection vs Prevention and the 429 response. This quiz tests other decisions: Redirect being exclusive to Front Door, a private Application Gateway for an internal app, the Log action to trial a rule in Prevention, the file upload limit, the policy redirect URL, origin lockdown (Backend vs Frontend tag, FDID check at the origin), route vs domain association, SocketAddr + Log + priority on Front Door, the CRS 3.1 size caps that force a rule set upgrade, and rate-limit grouping with per-association counters.
