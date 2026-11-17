Azure Web Application Firewall (WAF) inspects HTTP and HTTPS requests at Layer 7 and blocks common web attacks such as SQL injection and cross-site scripting before they reach the application. The same WAF policy model runs on Azure Front Door (global, at the edge) and on Azure Application Gateway (regional, in a virtual network), with differences that the exam tests: tiers, rule set versions, modes and where a policy can be associated.

<!-- section: waf-capabilities | objectives: 5.3.1 -->
## Mapping requirements to WAF features

| Requirement | WAF feature |
| --- | --- |
| Protect against the OWASP top attacks (SQL injection, XSS, LFI, RFI, command injection, protocol violations) without changing code | Managed rule set: Default Rule Set (DRS) or OWASP Core Rule Set (CRS) |
| Allow or block specific client IP ranges | Custom rule with an IP match condition |
| Allow or block countries or regions | Custom rule with the `GeoMatch` operator |
| Limit how many requests one client sends in a period | Rate limit custom rule |
| Block requests by header, query string, URI, method, cookie, body content or size | Custom match rule (string match or size constraint) |
| Block bad bots, allow verified search engines | Bot Manager rule set (bad, good, unknown categories) |
| Stop a false positive on one field (for example an authentication token) | Exclusion list (per rule, rule group or rule set) or rule override |
| Reject oversized requests or uploads | Request body and file upload size limits |
| Observe before blocking | Detection mode, or the Log action on a rule |

Rules in a policy follow one model: **custom rules** first, in priority order (lower number first; the first match applies its action and stops custom-rule processing), then the **managed rule sets**. Rule actions are **Allow**, **Block**, **Log** and, for managed rules, **Anomaly score**; Front Door also offers **Redirect**, and both platforms offer a **JavaScript challenge** for bot mitigation (in preview on Application Gateway).

> **Exam trap.** WAF filters HTTP(S) only. Filtering SSH, SMB or arbitrary TCP ports is Azure Firewall or NSG work; volumetric network DDoS is Azure DDoS Protection. Azure Firewall application rules don't inspect inbound web requests: that's the WAF's job.

<!-- section: waf-design | objectives: 5.3.2 -->
## Designing a WAF deployment

| Platform | Scope | WAF capability |
| --- | --- | --- |
| Azure Front Door **Premium** | Global, at Microsoft edge locations | Custom rules, managed DRS, Bot Manager, rate limiting, geo-filtering, JS challenge |
| Azure Front Door **Standard** | Global | **Custom rules only** (no managed rule sets, no bot protection) |
| Azure Application Gateway **WAF_v2** | Regional, inside a virtual network (public or private frontend) | Custom rules, DRS or CRS, Bot Manager, rate limiting, per-site and per-URI policies |
| Azure Application Gateway for Containers | Regional, for Kubernetes ingress | WAF policy support |

Design rules:

- Users worldwide, multiregion origins, or attacks to stop close to their source: **Front Door Premium WAF**.
- A regional application, internal (private) applications, or path-specific protection inside one site: **Application Gateway WAF_v2**.
- Both can be layered (Front Door at the edge, Application Gateway in the region). Lock the regional entry point so that it only accepts traffic from Front Door (`AzureFrontDoor.Backend` service tag and the `X-Azure-FDID` header).
- Application Gateway **v1** (Standard and WAF) retired on **April 28, 2026**: new designs use v2, and WAF policies can be associated only with **WAF_v2**. **Azure Front Door (classic)** retires on **March 31, 2027**.
- A WAF policy is a separate resource: **Global WAF (Front Door)** policies for Front Door, **Regional WAF (Application Gateway)** policies for Application Gateway. A policy of one type can't be attached to the other platform.

Limits that shape a design on Application Gateway WAF_v2 with CRS 3.2 or DRS: up to 100 sites (listeners), 100 custom rules per policy, 200 exclusions, maximum request body inspection 2 MB, file uploads up to 4 GB (default limit 100 MB). With CRS 3.1 or earlier, the request body limit is 128 KB and the site count drops to 40.

> **Exam tip.** "Managed rule sets on Front Door" means **Premium**. A Front Door Standard profile with a requirement for OWASP protection must be upgraded to Premium (in place), or the protection placed on Application Gateway.

<!-- section: waf-modes | objectives: 5.3.3 -->
## Configuring detection or prevention mode

| Mode | Behaviour |
| --- | --- |
| Detection | Matches are logged (WAF logs through diagnostic settings), nothing is blocked. Default mode of a new policy created in the portal |
| Prevention | Matching requests get the rule's action (block, redirect...) and are logged. Blocked requests receive **403** by default |

Managed rules use **anomaly scoring** (CRS 3.x, DRS on Application Gateway, DRS 2.0 and later on Front Door). Each matched rule adds to the request's score according to its severity, and the request is acted on only when the total reaches the **threshold of 5**:

| Severity | Score |
| --- | --- |
| Critical | 5 |
| Error | 4 |
| Warning | 3 |
| Notice | 2 |

One Critical match blocks a request in prevention mode; one Warning match alone doesn't. In the logs, individual rule hits show **Matched**; the final decision appears as **Blocked** (prevention) or **Detected** (detection). On Front Door, the anomaly score action (Block, Log or Redirect) is chosen for the managed rule set. Custom rules don't use scoring: their action applies directly.

Recommended rollout: deploy in **Detection**, send WAF logs to Log Analytics, tune exclusions and custom rules for false positives, then switch to **Prevention**. To evaluate a single new rule while staying in prevention, set that rule's action to **Log**.

```bash
az network application-gateway waf-policy policy-setting update \
  --resource-group RG-Web --policy-name WAFP-Shop \
  --mode Prevention --state Enabled
```

> **Exam trap.** A WAF in Detection mode that "isn't blocking an obvious SQL injection" is working as designed: change the mode to Prevention. Disabling the rule or adding a custom rule isn't the answer.

<!-- section: waf-front-door-rules | objectives: 5.3.4 -->
## Configuring rule sets for WAF on Azure Front Door

**Managed rule sets (Premium):**

- **Default Rule Set (DRS)**: `Microsoft_DefaultRuleSet` 2.0 and later use anomaly scoring; DRS 2.1 (based on OWASP CRS 3.3.2) and DRS 2.2 (CRS 3.3.4) add Microsoft Threat Intelligence rules. DRS 2.2 runs at paranoia level 1 by default (PL2 rules disabled). Earlier versions (1.x) block on each match. Changing the version resets rule customizations: reapply overrides and exclusions.
- **Bot Manager** rule set (1.0, 1.1): bad bots blocked, good bots allowed, unknown bots logged by default; actions can be changed per category (block, allow, log, redirect, JS challenge).
- Per managed rule or rule group: enable, disable, change the action; **exclusions** for request header, cookie, query string argument or body field names, at rule, rule group or rule set level.

**Custom rules (Standard and Premium):**

| Element | Options |
| --- | --- |
| Rule type | **Match** or **Rate limit** |
| Match variables | `RemoteAddr` (original client IP, usually from `X-Forwarded-For`), `SocketAddr` (IP that connects to the edge, for example a proxy), `RequestMethod`, `QueryString`, `PostArgs`, `RequestUri`, `RequestHeader`, `RequestBody`, `Cookies` |
| Operators | `IPMatch`, `GeoMatch`, `Equal`, `Contains`, `BeginsWith`, `EndsWith`, `Regex`, size comparisons, with optional negation and transforms |
| Actions | Allow, Block, Log, Redirect, JS challenge (Premium) |
| Rate limit | Threshold per **1 or 5 minutes**, grouped by socket IP (default) and, in Premium, by country/region, AS number or JA4 fingerprint |

Geo-filtering: include the code **ZZ** (unknown country/region) to avoid false positives on unmapped addresses, and combine `GeoMatch` with a `RequestUri` condition for path-specific geo rules. Rate limit counters are kept **per edge location**: size thresholds on the traffic one location receives.

Policy settings: **mode**, **state**, **redirect URL** (required if any rule uses Redirect), **custom block response status code and body** (default 403), request body inspection.

> **Exam trap.** Users behind a corporate proxy all share one `SocketAddr`. To block or rate-limit a client by its real address when traffic comes through a proxy, match on `RemoteAddr`; to block the proxy itself, match on `SocketAddr`.

<!-- section: waf-appgw-rules | objectives: 5.3.5 -->
## Configuring rule sets for WAF on Application Gateway

**Managed rule sets:**

| Rule set | Notes |
| --- | --- |
| DRS 2.2 | Recommended for new policies; based on CRS 3.3.4 plus Microsoft Threat Intelligence rules; paranoia level 1 by default |
| DRS 2.1 | Based on CRS 3.3.2; still supported, upgrade recommended |
| CRS 3.2 | New WAF engine (better performance, larger limits, per-rule exclusions, rate limiting); can't be downgraded to 3.1 |
| CRS 3.1, 3.0 | Older engine; new features unavailable |
| Bot Manager 0.1, 1.0, 1.1 | Used alongside one OWASP/DRS rule set |

Only one OWASP or DRS rule set is active at a time. Paranoia levels 3 and 4 aren't supported.

**Custom rules:** match rules with match variables (`RemoteAddr`, `RequestMethod`, `QueryString`, `PostArgs`, `RequestUri`, `RequestHeaders`, `RequestBody`, `RequestCookies`), operators (`IPMatch` with `RemoteAddr`, `GeoMatch`, `Equal`, `Contains`, `BeginsWith`, `EndsWith`, `Regex`, size operators) and actions Allow, Block, Log. Up to 100 custom rules per policy.

**Rate limiting** (requires the new engine, select CRS 3.2 or later): a threshold of requests per time window, a match condition, and a **group by** variable: `ClientAddr` (default), `GeoLocation`, `None` (all matching traffic shares one counter), or the `X-Forwarded-For` variants. It uses a sliding window, and counters are kept separately for each association (gateway or listener).

**Exclusions** remove a request attribute from evaluation: match variable (`RequestHeaderKeys`, `RequestHeaderValues`, `RequestCookieKeys`, `RequestCookieValues`, `RequestArgKeys`, `RequestArgValues`; the older `...Names` variables remain for compatibility), operator (`Equals`, `StartsWith`, `EndsWith`, `Contains`, `EqualsAny`) and selector, applied globally or to specific rules (per-rule scope with CRS 3.2 or later).

**Request size settings** (policy settings, CRS 3.2 or later): **request body check** (inspection on or off), **maximum request body inspection limit**, **request body enforcement** and **maximum request body size (KB)**, **file upload enforcement** and **file upload limit (MB)**. Only `multipart/form-data` content with a file name counts as a file upload. A high-priority custom rule on headers, cookies or URI is evaluated before size limits.

> **Exam trap.** "Allow uploads of 500 MB files through the WAF" is solved by raising the **file upload limit** (WAF_v2 with CRS 3.2 or DRS supports up to 4 GB), not by disabling request body inspection or switching to Detection.

<!-- section: waf-policy | objectives: 5.3.6 -->
## Implementing a WAF policy

A WAF policy contains: **policy settings** (state, mode, size limits, custom block response), **custom rules**, **managed rules** (rule sets, overrides, exclusions). Implementation order:

1. Create the policy (portal: **Create a resource > Web Application Firewall (WAF)**), choosing **Policy for**: Global WAF (Front Door) or Regional WAF (Application Gateway); for Front Door, also choose the tier (Classic, Standard or Premium) of the profile it will protect.
2. Select the managed rule sets and versions (Premium Front Door or Application Gateway).
3. Add custom rules (IP allow lists, geo, rate limits) with priorities.
4. Set the mode to Detection, associate the policy, collect logs, add exclusions.
5. Switch to Prevention.

```bash
az network application-gateway waf-policy create \
  --resource-group RG-Web --name WAFP-Shop \
  --type Microsoft_DefaultRuleSet --version 2.1

az network application-gateway waf-policy policy-setting update \
  --resource-group RG-Web --policy-name WAFP-Shop \
  --mode Detection --state Enabled \
  --request-body-check true --file-upload-limit-in-mb 500
```

An older Application Gateway whose WAF settings live in its own **WAF configuration** must be migrated to a WAF policy to use the newer features (portal migration or PowerShell). Firewall Manager can also list and associate WAF policies centrally.

> **Exam tip.** The CLI `--type` values are `Microsoft_DefaultRuleSet`, `OWASP`, `Microsoft_BotManagerRuleSet` and `Microsoft_HTTPDDoSRuleSet`: a question asking for "CRS 3.2" expects `OWASP` with version `3.2`, one asking for "DRS" expects `Microsoft_DefaultRuleSet`.

<!-- section: waf-association | objectives: 5.3.7 -->
## Associating a WAF policy

**Application Gateway WAF_v2** (policy **Association** tab: Application Gateway, HTTP Listener or Route Path):

| Association | Applies to | Use it for |
| --- | --- | --- |
| Application gateway (global) | Every listener and path without a more specific policy | Common baseline |
| HTTP listener (per-site) | One site (host name) | Different exclusions or rules per site |
| Path-based rule (per-URI) | One path of a URL path map | Stricter rules on `/payments` or `/login` |

The **most specific** policy wins: per-URI overrides per-site, which overrides global. Associating a new policy where one already exists **replaces** it.

```bash
az network application-gateway http-listener update \
  --resource-group RG-Web --gateway-name AGW-Shop \
  --name lst-adatum --waf-policy WAFP-Adatum
```

**Azure Front Door** (Standard or Premium): associate a policy with the **profile**, specific **domains** or specific **routes**. When several scopes apply, **route** wins over **domain**, which wins over **profile**. A domain can be associated with only one policy at a time: remove it from the existing association before adding it to another policy. The policy is replicated to all edge locations.

> **Exam trap.** On Application Gateway, a per-site policy needs a multi-site **listener** per site; a per-URI policy needs a **path-based** routing rule. A basic rule without a URL path map can't take a per-URI policy.

<!-- section: key-points -->
## Key points

- Front Door Premium: managed DRS, Bot Manager and custom rules; Front Door Standard: custom rules only; Application Gateway: WAF_v2 only (v1 retired April 28, 2026).
- Custom rules run first, by priority; managed rules use anomaly scoring with a threshold of 5 (Critical 5, Error 4, Warning 3, Notice 2).
- Detection logs, Prevention acts (403 by default); new policies start in Detection: tune, then switch.
- Application Gateway: DRS 2.2 recommended, CRS 3.2 and later run the new engine (2 MB body inspection, 4 GB uploads, per-rule exclusions, rate limiting), no downgrade.
- Front Door: `RemoteAddr` is the original client, `SocketAddr` the connecting IP; add `ZZ` to geo rules; rate limits count per edge location over 1 or 5 minutes.
- Association: Application Gateway global, per-site (listener), per-URI (path rule), most specific wins; Front Door profile, domain, route, route wins.
