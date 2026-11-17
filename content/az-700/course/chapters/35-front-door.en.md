Azure Front Door is Microsoft's global entry point for HTTP and HTTPS applications: a content delivery network with load balancing, TLS offload, a rules engine and a web application firewall, running in edge locations around the world. Exam questions ask when to choose it over the regional services, which tier a requirement needs, how a request travels from the client to an origin, and how to cache, rewrite, redirect and lock down that traffic.

<!-- section: capabilities | objectives: 3.3.1, 3.3.2 -->
## Capabilities and use cases

A request goes through these steps: DNS returns the IP address of the best point of presence (PoP); the client connects to it; Front Door matches the `Host` header to a domain of your profile; the domain's web application firewall (WAF) policy runs; the request is matched to a **route** and the route's **rule sets** run; a valid cached copy is returned if caching is on; otherwise an **origin** of the route's **origin group** is selected and the request is forwarded.

Map requirements to the load-balancing services:

| Requirement | Service |
| --- | --- |
| Global HTTP/HTTPS entry point, failover between regions, edge caching | Azure Front Door |
| Layer 7 routing and WAF for a web application in one region, inside a virtual network | Azure Application Gateway |
| TCP or UDP load balancing in one region | Azure Load Balancer |
| DNS-based global routing for any protocol, with the client connecting directly to the endpoint | Azure Traffic Manager |
| Accelerate a dynamic API used worldwide | Azure Front Door without caching (split TCP and the Microsoft backbone still help) |

Typical use cases: multiregion applications (active/active or active/passive), global APIs, static websites in Azure Storage, migrations and blue-green deployments with weighted origins, and one WAF policy in front of origins in Azure, on-premises or in another cloud. Origins must be publicly reachable, except Private Link origins in Premium. WebSockets, HTTP/2, IPv6, apex and wildcard domains are supported.

> **Exam trap.** Front Door handles only HTTP and HTTPS. An application that uses another TCP or UDP protocol, such as SFTP or a game protocol over UDP, needs Load Balancer (regional) or Traffic Manager (global, DNS-based), not Front Door.

<!-- section: tiers | objectives: 3.3.3 -->
## Choosing a tier

| Capability | Standard | Premium |
| --- | --- | --- |
| Static and dynamic delivery, caching, compression, rules engine, custom domains, managed certificates | Yes | Yes |
| WAF custom rules (IP, geo-filtering, rate limiting) | Yes | Yes |
| WAF Microsoft-managed rule sets and bot protection | No | Yes |
| Private Link connection to the origin | No | Yes |
| Mutual TLS (client certificates) | No | Yes |
| Endpoints per profile | 10 | 25 |
| Custom domains per profile | 100 | 500 |
| Origin groups / origins per profile | 100 / 100 | 200 / 200 |

Both tiers allow 50 origins per origin group and 100 rules per rule set. The SKU names used by commands and templates are `Standard_AzureFrontDoor` and `Premium_AzureFrontDoor`.

Standard upgrades to Premium in place (**Configuration** page), without downtime; WAF policies are copied and their managed rules must then be enabled. Premium can't be downgraded: recreate the profile. **Azure Front Door (classic)** accepts no new profiles since April 1, 2025 and retires on **March 31, 2027**: migrate to Standard or Premium.

> **Exam tip.** Read the requirement words: "managed rule set", "OWASP protection", "bot protection" or "private origin with no public access" mean **Premium**. Caching, custom domains, HTTPS and custom WAF rules alone fit **Standard**.

<!-- section: configuration | objectives: 3.3.4 -->
## Configuring endpoints, origins and routes

A profile contains these objects:

| Object | Role | Key settings |
| --- | --- | --- |
| Endpoint | Logical grouping of routes, with a generated host name such as `contoso-frontend-abc123.z01.azurefd.net` | Enabled state; name reuse scope (`TenantReuse` by default) |
| Origin group | Origins that serve the same content | Health probe (path, protocol, HEAD or GET, interval), sample size, successful samples, latency sensitivity, session affinity |
| Origin | One backend: App Service, Storage or a custom host | Host name, origin host header, ports, priority (1 to 5), weight (1 to 1,000), Private Link |
| Route | Links domains and paths to an origin group | Patterns to match, accepted protocols, HTTPS redirect, origin path, forwarding protocol, caching, rule sets |
| Domain | Custom domain validated with a TXT record `_dnsauth.<subdomain>`, then pointed to the endpoint with a CNAME | Certificate (managed or your own), TLS policy |

The **origin host header** is the `Host` value sent to the origin; the portal fills in the origin host name. App Service and Blob Storage reject a host header they don't know, so keep that value or add the custom domain to the app.

**Route matching** takes the most specific match: protocol, then domain (exact match, otherwise HTTP 404), then path (exact first, then wildcard). With routes `/abc/*` and `/*`, `/abc/d` takes `/abc/*` and `/abcd` takes `/*`; without a `/*` route, unmatched paths get a 404.

**Origin selection** inside an origin group:

1. Keep the enabled origins that health probes report healthy (only HTTP 200 counts as success).
2. Keep the lowest **priority** value present (1 is the highest priority): this gives active/passive.
3. Keep the origins whose latency is within the **latency sensitivity** of the fastest one. With the default of 0 ms, only the fastest origin receives traffic.
4. Split traffic by **weight** among the remaining origins: this gives weighted or active/active distribution.

**Session affinity** (origin group setting) uses the `ASLBSA` cookie. If every origin fails its probes, Front Door uses all of them in round robin. Probes can be disabled only for a group with a single enabled origin.

```bicep
resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2021-06-01' = {
  parent: endpoint
  name: 'route-static'
  properties: {
    originGroup: { id: originGroup.id }
    customDomains: [ { id: customDomain.id } ]
    supportedProtocols: [ 'Http', 'Https' ]
    patternsToMatch: [ '/static/*' ]
    httpsRedirect: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Disabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [ 'text/html', 'text/css', 'application/javascript' ]
      }
    }
  }
}
```

> **Exam trap.** Weights don't split traffic between origins of different priorities, and with a latency sensitivity of 0 ms they apply only to origins with the same latency. For a 90/10 canary between two regions, give both origins the same priority and raise the latency sensitivity.

<!-- section: tls | objectives: 3.3.5 -->
## TLS termination and end-to-end encryption

Front Door terminates the client's TLS connection at the edge, inspects and routes the request, then opens a **separate** connection to the origin. The **forwarding protocol** of the route decides that second leg:

| Forwarding protocol | Front Door to origin |
| --- | --- |
| HTTP only | Unencrypted (TLS offload) |
| HTTPS only | TLS re-encrypted: end-to-end TLS |
| Match incoming request | Same protocol as the client used |

For HTTPS to the origin, the origin must present a certificate with a **complete chain** to a CA in the Microsoft Trusted CA list (no self-signed or internal CA) and a subject name that matches the origin **host name**. **Certificate subject name validation** can be disabled for testing, but Microsoft advises against it and Private Link requires it.

Client side, TLS 1.0 and 1.1 aren't supported; each domain's **TLS policy** sets the minimum version and cipher suites (predefined `TLSv1.2_2023` by default, or custom). The route option **Redirect all traffic to use HTTPS** answers HTTP requests with a redirect. Client certificate authentication (mTLS) is Premium only.

Certificates for custom domains:

| | Front Door-managed certificate | Your own certificate (BYOC) |
| --- | --- | --- |
| Source | Issued by DigiCert; add a CAA record `0 issue digicert.com` if your domain restricts issuers | Imported in Azure Key Vault as a certificate object (PFX), from a trusted CA; EC keys not supported |
| Domains | Subdomain, apex and wildcard | Any domain that matches the certificate's CN or SAN |
| Renewal | Automatic when the domain CNAME points directly to the endpoint; otherwise revalidate with a new TXT record 45 days before expiry | Automatic when the secret version is **Latest**; a pinned version must be reselected manually |
| Prerequisites | Domain validated (TXT record) | Key Vault in the **same subscription** as the profile; access through a managed identity (Azure RBAC) or Front Door's service principal (access policy); "Allow trusted Microsoft services" if the vault firewall is on |

> **Exam trap.** Encryption "between Front Door and the web servers" isn't a certificate setting on the domain: set the route's forwarding protocol to **HTTPS only** and make sure the origin certificate matches the origin host name.

<!-- section: caching | objectives: 3.3.6 -->
## Configuring caching

Caching is enabled per **route** and can be overridden by a rule set. Each PoP keeps its own cache. Only `GET` requests are cached. Use separate routes for static content (cached) and personalized or authenticated content (not cached).

The **query string caching behavior** decides the cache key:

| Behavior | Cache key |
| --- | --- |
| Ignore Query String | Path only: one cached copy whatever the query string |
| Use Query String | Every unique URL, including the query string (parameter order doesn't matter) |
| Ignore Specified Query Strings | All parameters except the listed ones |
| Include Specified Query Strings | Only the listed parameters |

How long content stays cached:

- The origin's headers decide first: `Cache-Control: s-maxage`, then `max-age`, then `Expires`. Without them, Front Door caches for a random duration between one and three days. The maximum is 366 days.
- `Cache-Control: private`, `no-cache` or `no-store` prevents caching even when a rule overrides the duration.
- A **route configuration override** action can set the cache behavior: **Honor origin**, **Override always** (your duration replaces the origin's) or **Override if origin missing** (your duration only when the origin sends none).

Also: large files are cached in 8 MB chunks (the origin must support byte-range requests), `Set-Cookie` is removed from cacheable responses, and the `X-Cache` response header shows `TCP_HIT`, `TCP_MISS` or `CONFIG_NOCACHE`.

To remove content before it expires, **purge** it: one path such as `/images/logo.png`, a wildcard such as `/scripts/*`, or `/*` for everything on the selected domains. A purge is case-insensitive, covers every query string variation, reaches all PoPs within about 10 minutes, and must name subdomains for a wildcard domain.

```bash
az afd endpoint purge \
  --resource-group RG-Web \
  --profile-name contoso-afd \
  --endpoint-name contoso-frontend \
  --domains "[www.contoso.com]" \
  --content-paths "[/scripts/*]"
```

> **Exam tip.** To publish new content without waiting for the TTL or purging, version the file names (`app.v2.js`): the new URL is a new cache key.

<!-- section: acceleration | objectives: 3.3.7 -->
## Traffic acceleration

Front Door shortens the path between users and origins even for content that can't be cached:

- **Unicast PoP selection**: DNS returns the IP address of the best PoP, close to the user (or to the user's DNS resolver when the client location is unknown).
- **Split TCP**: the handshakes happen with the nearby PoP; Front Door reuses long-lived connections to the origins over the Microsoft backbone.
- **Latency-based routing**: the default method sends each PoP's traffic to the origin with the lowest measured latency.
- **Compression**: on the fly with **Brotli** (preferred) or **gzip**, only when caching is enabled on the route, for the configured MIME types and files larger than 1 KB and smaller than 8 MB.

| Requirement | Configuration |
| --- | --- |
| Faster dynamic pages for distant users | Route without caching: split TCP and the backbone still apply |
| Lower bandwidth for text files | Enable caching and compression; adjust the MIME types |
| Users sent to the nearest healthy region | Same priority on all origins, latency-based selection |

> **Exam trap.** The **Enable compression** checkbox appears only after **Enable caching** is selected on the route. A route that must never cache can't use Front Door compression; the origin can still compress its responses.

<!-- section: rules | objectives: 3.3.8 -->
## Rule sets, URL rewrite and URL redirect

A **rule set** is a group of rules associated with one or more routes. WAF rules run first, then the route's rule sets in their configured order, then the rules of each set in order. A rule has up to **10 match conditions**, combined with AND (several values in one condition are combined with OR), and up to **5 actions**. **Stop evaluating remaining rules** ends the processing for that request.

Match conditions include request path, URL, file extension, query string, header, cookies, method, protocol, host name, device type and remote address (IP or geo match). Regular expressions and server variables such as `{url_path:seg1}` are supported.

| Action | Use it to |
| --- | --- |
| Route configuration override | Send matching requests to another origin group or forwarding protocol; enable, disable or tune caching |
| Modify request header / Modify response header | Append, overwrite or delete a header (security headers such as HSTS, hide a server header) |
| URL redirect | Return a redirect to the client |
| URL rewrite | Change the path sent to the origin, invisible to the client |

**URL redirect** settings: type **301** (Moved), **302** (Found), **307** (Temporary redirect) or **308** (Permanent redirect); protocol; destination host, path, query string and fragment (each one replaces the incoming value or keeps it when empty).

**URL rewrite** settings: a **source pattern** (prefix match on the path after the route's pattern to match), a **destination**, and **Preserve unmatched path**:

| Preserve unmatched path | Source pattern | Destination | Request | Path sent to the origin |
| --- | --- | --- | --- | --- |
| Yes | `/` | `/foo/` | `/sub/1.jpg` | `/foo/sub/1.jpg` |
| Yes | `/sub/` | `/foo/` | `/sub/image/1.jpg` | `/foo/image/1.jpg` |
| No | `/sub/` | `/foo/2.jpg` | `/sub/image/1.jpg` | `/foo/2.jpg` |

```bicep
resource redirectOldShop 'Microsoft.Cdn/profiles/ruleSets/rules@2021-06-01' = {
  parent: ruleSet
  name: 'redirectOldShop'
  properties: {
    order: 1
    conditions: [
      {
        name: 'UrlPath'
        parameters: {
          typeName: 'DeliveryRuleUrlPathMatchConditionParameters'
          operator: 'BeginsWith'
          matchValues: [ 'shop/' ]
        }
      }
    ]
    actions: [
      {
        name: 'UrlRedirect'
        parameters: {
          typeName: 'DeliveryRuleUrlRedirectActionParameters'
          redirectType: 'PermanentRedirect'
          destinationProtocol: 'Https'
          customHostname: 'store.contoso.com'
        }
      }
    ]
    matchProcessingBehavior: 'Stop'
  }
}
```

> **Exam trap.** "The browser must display the new URL" or "search engines must update their index" is a **redirect** (301 or 308 for permanent). "Users keep the same URL while the origin receives another path" is a **rewrite**. 307 and 308 keep the request method, so use them when a POST must stay a POST.

<!-- section: private-link-origin | objectives: 3.3.9 -->
## Securing an origin with Private Link

With **Premium**, Front Door reaches an origin that has no public endpoint. Enabling Private Link on an origin makes Front Door create a **private endpoint** in a Front Door-managed virtual network of the region you select; the connection stays **Pending** until the resource owner approves it.

Supported origins: App Service and Azure Functions, Blob Storage, storage static websites, an **internal load balancer** through a **Private Link service** you create, API Management, Application Gateway and Azure Container Apps. App Service deployment slots and Static Web Apps aren't supported.

Steps:

1. For an internal load balancer origin, create a Private Link service on the load balancer frontend IP configuration.
2. Add the origin, enable **Private link**, then choose the resource, the target subresource (`blob`, `sites`...) and the **region** closest to the origin. Certificate subject name validation must stay enabled.
3. Approve the pending connection on the resource or the Private Link service (**Private endpoint connections**).
4. Block public access to the origin (App Service does it automatically with private endpoints; for storage, use its firewall).

Design rules:

- An origin group can't mix public and private origins.
- In one profile, origins with the same resource, subresource and region share one private endpoint, approved once; another region or profile means another approval.
- Each regional cluster accepts up to 7,200 requests per second per profile; for more load or regional redundancy, add origins that use different Private Link regions.
- Private Link covers only Front Door to origin; clients still reach Front Door over the internet.

Without Premium, lock down a public origin: allow only the **AzureFrontDoor.Backend** service tag (NSG or access restriction) and reject requests whose `X-Azure-FDID` header isn't your profile ID.

> **Exam trap.** The private endpoint created by Front Door doesn't appear in your virtual network and needs no subnet from you; what you must do is **approve** the connection. Requests fail with a Front Door error until the approval completes.

<!-- section: key-points -->
## Key points

- Front Door: global, HTTP/HTTPS only. Regional layer 7 is Application Gateway; non-HTTP is Load Balancer or Traffic Manager.
- Premium adds managed WAF rules, bot protection, Private Link origins and client mTLS; Standard upgrades in place, no downgrade.
- Origin selection: healthy, lowest priority value, latency sensitivity, then weights.
- End-to-end TLS: forwarding protocol HTTPS only and an origin certificate that matches the origin host name.
- Caching is per route; compression requires caching; purge or version files to refresh.
- Redirect changes the browser URL, rewrite doesn't.
- Private Link origin: Premium, approve the pending connection, never mix public and private origins in a group.
