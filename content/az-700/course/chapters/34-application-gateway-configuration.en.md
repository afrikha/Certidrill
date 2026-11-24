An Application Gateway request crosses a fixed chain: a **listener** accepts it, a **routing rule** picks a backend pool (or a redirect), **backend settings** define how the gateway connects to the server, and a **rewrite set** can change headers and URL on the way. Exam items give part of this chain and ask which component to add or change, or in which order rules are evaluated.

<!-- section: appgw-listeners | objectives: 3.2.6 -->
## Listeners

A listener matches incoming requests on four values: **frontend IP**, **frontend port**, **protocol** and, for multi-site listeners, **host name**.

| Setting | Values and rules |
| --- | --- |
| Frontend IP | Public or private; the two IPv4 listeners (public and private) can share a port, IPv6 public and private listeners can't |
| Frontend port | 1 to 64999 on v2 (some ports excluded, such as 22 with Private Link) |
| Protocol | HTTP, HTTPS (layer 7), TLS, TCP (layer 4 proxy) |
| Type | **Basic**: any host name on that IP and port. **Multi-site**: up to 5 host names, wildcards `*` (several characters) and `?` (one character) allowed; `*.contoso.com` matches `shop.contoso.com` and `customer1.b2b.contoso.com` but not `contoso.com` |
| Certificate | Required for HTTPS: a PFX file (private key and full chain) or a Key Vault reference |
| SSL profile | Optional: listener-specific TLS policy and client authentication |
| Custom error pages | For codes 400, 403, 405, 408, 500, 502, 503, 504 (404 isn't supported), global or per listener; global pages can't be configured in the portal (PowerShell) |

HTTP/2 applies to client connections over HTTPS only; it is enabled by default when the gateway is created in the portal. WebSocket needs no setting.

**Processing order.** On v2, the **rule priority** (1 to 20000, unique, 1 first) decides which listener serves a request that several listeners match. Give site-specific multi-site listeners a lower number than wildcard listeners, and basic listeners the highest numbers. Without this, `*.contoso.com` or a basic listener captures `shop.contoso.com`.

```bash
az network application-gateway frontend-port create --resource-group RG-Web \
  --gateway-name agw-web --name port-443 --port 443
az network application-gateway http-listener create --resource-group RG-Web \
  --gateway-name agw-web --name lst-shop --frontend-port port-443 \
  --host-names shop.contoso.com --ssl-cert cert-contoso
az network application-gateway http-listener create --resource-group RG-Web \
  --gateway-name agw-web --name lst-wildcard --frontend-port port-443 \
  --host-names "*.contoso.com" --ssl-cert cert-contoso
```

> **Exam trap.** Two sites on the same IP address and port require **multi-site** listeners. A basic listener accepts every host name on its IP and port, so a basic listener placed first in priority takes every request for that port.

<!-- section: appgw-routing-rules | objectives: 3.2.7 -->
## Request routing rules

A rule binds **one listener** (each listener has one rule) to a backend target and backend settings, or to a redirection.

| Rule type | Behavior |
| --- | --- |
| Basic | Every request of the listener goes to one backend pool with one backend setting |
| Path-based | A URL path map: path patterns, each with its pool and backend setting, plus a **default** pool and setting for requests that match no path |
| Advanced (preview) | Conditions on HTTP request attributes |

Path patterns:

- Start with `/`, can end with `*`: `/images/*` and `/images*` are valid; `/images/*.jpg`, `/*.jpg` and `/Repos/*/Comments/*` aren't.
- Case-insensitive; only the path is matched, not the query string.
- Evaluated **in the order listed**: put the most specific paths first and wildcard paths last.
- The full original path is forwarded; use **Override backend path** or a URL rewrite if the backend serves the content from another path.

**Redirection** replaces the backend target: type **Permanent (301)**, **Found (302)**, **See other (303)** or **Temporary (307)**; target another **listener** (HTTP-to-HTTPS, optionally including path and query string) or an **external site** (query string can be included, the path can't). A redirect on a basic rule is global; inside a path map it applies to one path.

```bash
# Path-based rule
az network application-gateway url-path-map create --resource-group RG-Web \
  --gateway-name agw-web --name map-shop --paths "/images/*" --address-pool pool-img \
  --http-settings bs-http --default-address-pool pool-app --default-http-settings bs-http
az network application-gateway url-path-map rule create --resource-group RG-Web \
  --gateway-name agw-web --path-map-name map-shop --name video --paths "/video/*" \
  --address-pool pool-video --http-settings bs-http
az network application-gateway rule create --resource-group RG-Web --gateway-name agw-web \
  --name rule-shop --rule-type PathBasedRouting --http-listener lst-shop \
  --url-path-map map-shop --priority 100

# HTTP to HTTPS redirection
az network application-gateway redirect-config create --resource-group RG-Web \
  --gateway-name agw-web --name to-https --type Permanent \
  --target-listener lst-shop --include-path true --include-query-string true
az network application-gateway rule create --resource-group RG-Web --gateway-name agw-web \
  --name rule-shop-http --rule-type Basic --http-listener lst-shop-http \
  --redirect-config to-https --priority 110
```

> **Exam trap.** The rule priority orders listeners, not the paths inside a path map. A request to `/images/logo.png` with `/*` listed before `/images/*` goes to the `/*` pool.

<!-- section: appgw-http-settings | objectives: 3.2.8 -->
## Backend HTTP settings

Backend settings (the portal's **Backend settings**, `backendHttpSettings` in the API) define the connection from the gateway to the servers. One setting can serve several rules.

| Setting | Values and rules |
| --- | --- |
| Protocol and port | HTTP or HTTPS, port 1 to 65535. HTTPS gives end-to-end TLS |
| Cookie-based affinity | Gateway-managed cookie `ApplicationGatewayAffinity` (plus `ApplicationGatewayAffinityCORS` with `SameSite=None; Secure`); rename it when gateways are chained |
| Connection draining | 1 to 3,600 seconds; deregistering servers get no new requests but keep existing ones (default 30 seconds when not enabled) |
| Request timeout | Default 20 seconds; up to 86,400 seconds for private backends, 240 seconds for external backends |
| Override backend path | Prefixes or replaces the forwarded path |
| Custom probe | At most one per setting; otherwise the default probe |
| Host name | **Pick host name from backend target** (FQDN of the pool member) or **Host name override** with a name you specify |
| Trusted root certificate | For HTTPS backends with a private CA or self-signed certificate |
| Dedicated backend connection | One backend connection per client connection: needed for NTLM or Kerberos passthrough; not with HTTP/2 |

The host name decides what multitenant backends receive. App Service only answers on its own host names: enable **Pick host name from backend target** (and the matching probe option), or better, map a custom domain on the App Service and keep the original host name end to end.

```bash
az network application-gateway http-settings create --resource-group RG-Web \
  --gateway-name agw-web --name bs-app --port 443 --protocol Https \
  --host-name-from-backend-pool true --cookie-based-affinity Disabled \
  --connection-draining-timeout 60 --timeout 30 --probe probe-app
```

> **Exam trap.** Users lose their session after each request: enable cookie-based affinity in the backend settings, not session persistence (a Load Balancer setting). If clients don't accept cookies, affinity can't work.

<!-- section: appgw-tls | objectives: 3.2.9 -->
## Transport Layer Security

Since **August 31, 2025**, clients and backends must use **TLS 1.2 or higher**. Three TLS designs:

| Design | Configuration |
| --- | --- |
| TLS termination | HTTPS listener with a certificate; HTTP backend settings |
| End-to-end TLS | HTTPS listener plus HTTPS backend settings; the gateway re-encrypts toward the server |
| Non-HTTP traffic over TLS | TLS listener on the layer 4 proxy, with TLS or TCP backend settings |

**Listener certificates**: PFX with the full chain, 16 KB maximum on v2; its common name (CN) matches the host name that clients request. A Key Vault reference needs:

1. A **user-assigned managed identity** on the gateway (only one per gateway).
2. Access to the vault for that identity: **Key Vault Secrets User** (RBAC model) or **Get** on secrets (access policy model).
3. The listener certificate referencing the **versionless** secret identifier, so that renewed versions are picked up (the gateway polls every 4 hours, and on any configuration change).

If the vault firewall is on, add the gateway subnet (with the `Microsoft.KeyVault` service endpoint) and allow trusted Microsoft services, or use a private endpoint with the `privatelink.vaultcore.azure.net` zone linked to the gateway's virtual network. HSM-protected certificates aren't supported; the private key must be exportable. A broken Key Vault reference disables the listener.

```bash
az network application-gateway identity assign --resource-group RG-Web \
  --gateway-name agw-web --identity id-agw-kv
az network application-gateway ssl-cert create --resource-group RG-Web \
  --gateway-name agw-web --name cert-contoso \
  --key-vault-secret-id https://kv-contoso.vault.azure.net/secrets/contoso-com/
```

**End-to-end TLS on v2**: a backend certificate from a well-known CA whose name matches the host name in the backend settings needs nothing more (App Service is trusted). A self-signed or private-CA certificate needs its **trusted root certificate** (.cer) uploaded to the backend settings. The gateway sends the backend host name as SNI and checks it against the certificate; settings `validateCertChainAndExpiry`, `validateSNI` and `sniName` can relax this for testing.

**TLS policy** (frontend only on v2; backend connections negotiate TLS 1.3, then 1.2):

| Policy | Minimum | Notes |
| --- | --- | --- |
| `AppGwSslPolicy20220101` | TLS 1.2 | Supports TLS 1.3; **default** for API version 2023-02-01 and later |
| `AppGwSslPolicy20220101S` | TLS 1.2 | Stricter cipher list, TLS 1.3 |
| `AppGwSslPolicy20170401S` | TLS 1.2 | Older ciphers when required |
| `CustomV2` | TLS 1.2 or 1.3 | Your own cipher order, TLS 1.3 support |

`AppGwSslPolicy20150501` (TLS 1.0 minimum, still the default for API versions earlier than 2023-02-01) and `AppGwSslPolicy20170401` (TLS 1.1 minimum) are still listed, but TLS 1.0 and 1.1 are no longer supported since August 31, 2025. These older policies and the 2022 or `CustomV2` policies can't coexist on one gateway. A policy applies to the whole gateway; an **SSL profile** gives a listener its own policy, but listeners on the same port can't use different TLS protocol versions: use a separate port for each version.

**Mutual TLS** (Standard_v2 and WAF_v2): in an SSL profile, **strict** mode requires a valid client certificate chained to an uploaded trusted client CA certificate (root plus intermediates, 25 KB per file, 100 per profile, 200 per gateway); **passthrough** mode requests the certificate but lets the backend validate it. Server variables such as `client_certificate` forward it to the backend.

```bash
az network application-gateway ssl-policy set --resource-group RG-Web \
  --gateway-name agw-web --policy-type Predefined --name AppGwSslPolicy20220101S
```

> **Exam trap.** Without SNI (a client using the IP address), v2 returns the certificate of the HTTPS listener whose rule has the highest priority, not a basic listener's certificate.

<!-- section: appgw-rewrite | objectives: 3.2.10 -->
## Rewrite rule sets

Rewrites are a v2 feature. Structure:

| Level | Content |
| --- | --- |
| Rewrite set | Associated with routing rules: with a basic rule it applies to the whole listener, with a path-based rule to the chosen paths. A rule has one rewrite set; a set can serve several rules |
| Rewrite rule | Executed by **rule sequence** (lowest first) |
| Condition (optional) | Request header, response header or server variable compared with a pattern (RE2 regex), case-insensitive option, negation; several conditions are ANDed |
| Action | Set or delete a request or response header; rewrite the URL path or query string; **re-evaluate path map** to route on the rewritten path |

Values combine text, headers (`{http_req_X-Forwarded-For}`, `{http_resp_Location}`), server variables (`{var_client_ip}`, `{var_host}`, `{var_uri_path}`) and captures from a condition (`{http_resp_Location_2}`).

| Requirement | Rewrite |
| --- | --- |
| Remove the port from `X-Forwarded-For` | Set the request header to `{var_add_x_forwarded_for_proxy}` or `{var_client_ip}` |
| Add HSTS or Content-Security-Policy to every response | Set response headers, no condition |
| Hide `Server` or `X-Powered-By` | Delete response headers |
| App Service redirects expose `azurewebsites.net` | Condition on `Location` matching `(https?):\/\/.*azurewebsites\.net(.*)$`, then set it to `{http_resp_Location_1}://contoso.com{http_resp_Location_2}` |
| `/shop/item?id=5` must reach the backend as `/item/5` | URL rewrite of path and query string |

```bash
az network application-gateway rewrite-rule set create --resource-group RG-Web \
  --gateway-name agw-web --name rs-security
az network application-gateway rewrite-rule create --resource-group RG-Web \
  --gateway-name agw-web --rule-set-name rs-security --name add-hsts --sequence 100 \
  --response-headers Strict-Transport-Security="max-age=31536000"
az network application-gateway rewrite-rule condition create --resource-group RG-Web \
  --gateway-name agw-web --rule-set-name rs-security --rule-name add-hsts \
  --variable var_ssl_enabled --pattern "On" --ignore-case true
az network application-gateway rule update --resource-group RG-Web --gateway-name agw-web \
  --name rule-shop --rewrite-rule-set rs-security
```

Limits and exclusions: 400 rewrite sets, 40 header or URL configurations and 40 conditions per set. `Connection`, `Upgrade` and `X-Original-Host` can't be rewritten, and the `Host` header can't be deleted. Rewrites don't apply to redirected requests, custom error pages or 4xx and 5xx responses generated by the gateway itself.

> **Exam trap.** A URL rewrite doesn't change the backend pool unless **re-evaluate path map** is enabled; without it, the path map is matched on the original path.

<!-- section: key-points -->
## Key points

- Listener = frontend IP + port + protocol (+ host names for multi-site, up to 5 with wildcards).
- v2 rule priority 1 to 20000 orders listeners: specific sites first, wildcard and basic last.
- Path rules are evaluated in list order; the default pool catches the rest; redirection targets a listener or an external site.
- Backend settings: protocol, port, affinity cookie, draining, timeout, host name, trusted root certificate, probe.
- TLS 1.2 minimum; Key Vault needs a user-assigned identity and a versionless secret ID; `AppGwSslPolicy20220101` is the default.
- Rewrite sets: rules by sequence, ANDed conditions, header and URL actions; v2 only.
