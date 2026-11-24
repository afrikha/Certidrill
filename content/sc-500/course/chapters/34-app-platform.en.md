Platform services share a small set of security levers: who can call the endpoint (authentication, keys, IP restrictions, private endpoints), which identity the service uses to reach other resources (managed identities instead of secrets), and what inspects the traffic (Web Application Firewall, API Management policies, Defender for Cloud).

<!-- section: defender-containers | objectives: 3.3.1 -->
## Defender for Containers

Defender for Containers covers Kubernetes clusters (AKS, Amazon EKS, Google GKE, Arc-enabled Kubernetes), their nodes and the registries they pull from:

| Capability | How |
| --- | --- |
| Posture (misconfigurations) | Agentless discovery through the Kubernetes API, control plane recommendations, and data plane hardening with **Azure Policy for Kubernetes** (for example, deny privileged containers) |
| Vulnerability assessment | Agentless scans of registry images, running containers and nodes, rescanned daily |
| Runtime threat protection | **Defender sensor** on the nodes plus Kubernetes audit logs; alerts mapped to MITRE ATT&CK; antimalware, binary drift detection and blocking |
| Supply chain | **Gated deployment**: an admission controller audits or blocks deployments of images that violate your vulnerability rules |

Enable: **Environment settings** > subscription > **Containers** On > **Settings**, then choose the components: **Defender sensor** (with *Enable Defender Security Gating* and *Enable Defender Runtime Anti Malware*), **Azure Policy**, **Kubernetes API access**, **Registry access** (with **Security findings** on image push) and **Agentless scanning for machines** (node scanning, with exclusion tags).

> **Exam trap.** Runtime detection (a crypto miner starting in a pod, a binary not in the image) needs the **Defender sensor**. Recommendations such as "privileged containers should be avoided" are evaluated and enforced by the **Azure Policy** add-on, not by the sensor.

<!-- section: aks-security | objectives: 3.3.2 -->
## Azure Kubernetes Service

| Requirement | Control |
| --- | --- |
| API server reachable only from the virtual network | Private cluster (`--enable-private-cluster`) |
| Public API server limited to admin networks | Authorized IP ranges (up to 200; Standard load balancer; **not with a private cluster**) |
| Kubernetes permissions managed as Azure role assignments | Microsoft Entra integration + Azure RBAC for Kubernetes authorization (`--enable-aad --enable-azure-rbac`) |
| No static admin kubeconfig | `--disable-local-accounts` (`az aks get-credentials --admin` then fails) |
| Pods access Azure without secrets | Microsoft Entra Workload ID (OIDC issuer + workload identity) |
| Restrict pod-to-pod traffic | Kubernetes network policies |
| Secrets in etcd encrypted with your key | KMS etcd encryption with Azure Key Vault |

Built-in roles for Azure RBAC on Kubernetes, assignable at cluster or namespace scope:

| Role | Access |
| --- | --- |
| Azure Kubernetes Service RBAC Reader | Read most objects in a namespace; not Secrets, roles or role bindings |
| Azure Kubernetes Service RBAC Writer | Read/write most objects, including Secrets; not roles or role bindings |
| Azure Kubernetes Service RBAC Admin | Admin in a namespace, including roles and role bindings |
| Azure Kubernetes Service RBAC Cluster Admin | Every resource in every namespace |

```bash
az aks update -g RG1 -n aks1 --enable-azure-rbac
az aks update -g RG1 -n aks1 --disable-local-accounts
az role assignment create --role "Azure Kubernetes Service RBAC Reader" \
  --assignee dev@contoso.com --scope "<cluster ID>/namespaces/team-a"
```

> **Exam trap.** After disabling local accounts on an existing cluster, rotate the cluster certificates to revoke certificates that users may already hold.

<!-- section: acr-security | objectives: 3.3.3 -->
## Azure Container Registry

Authentication options:

| Method | Use | Notes |
| --- | --- | --- |
| Individual Microsoft Entra identity (`az acr login`) | Developers | Token valid 3 hours |
| Service principal | CI/CD pipelines | Azure RBAC |
| Managed identity | Azure services pulling images (Container Apps, ACI, App Service) | Preferred: no secret |
| Admin user | Single-user tests | **Disabled by default**; full push and pull, no RBAC; avoid |
| Non-Entra tokens with scope maps | Repository-scoped access for external systems | All tiers |

Authorization: **AcrPull** (pull), **AcrPush** (push and pull), **AcrDelete**. The **Container Registry Repository Reader / Writer / Contributor** roles work in both permissions modes: Reader for orchestrators that pull images (AKS, Container Apps, Container Instances), Writer for CI/CD pipelines that push, Contributor when they also delete. A registry in the permissions mode **RBAC Registry + ABAC Repository Permissions** uses **Container Registry Repository Reader / Writer / Contributor** with ABAC conditions to scope access to specific repositories; in that mode, AcrPull, AcrPush and AcrDelete aren't honored, and Owner, Contributor and Reader have no data plane access (AcrPull maps to Repository Reader plus **Container Registry Repository Catalog Lister**). Switching to that mode invalidates the credentials issued before the switch: clients get HTTP 401 until they refresh them.

| Feature | Tier |
| --- | --- |
| Private endpoints, IP access rules | Premium |
| Customer-managed keys | Premium |
| Anonymous pull | Standard and Premium |
| Repository-scoped permissions | All tiers |

> **Exam trap.** Docker Content Trust can't be enabled on new registries since May 31, 2026 and is removed on March 31, 2028 (as is the AcrImageSigner role). Image signing now uses the **Notary Project** (signatures stored as OCI artifacts).

<!-- section: aci-aca | objectives: 3.3.4 -->
## Azure Container Instances and Azure Container Apps

**Container Instances**:

- Deploy the container group into a **virtual network** to give it a private IP only; outbound traffic from a virtual network uses a NAT gateway.
- Pass secrets with `secureValue` instead of `value`: the portal and `az container show` display only the name. Secret volumes are the alternative for files.
- Use a managed identity instead of registry passwords or embedded keys.

```yaml
environmentVariables:
  - name: 'DB_HOST'
    value: 'sql1.contoso.local'
  - name: 'DB_PASSWORD'
    secureValue: 'stored-only-inside-the-container'
```

**Container Apps**:

| Requirement | Setting |
| --- | --- |
| App reachable only from apps in the environment | Ingress **internal** |
| Whole environment without public endpoint | Environment created with `--internal-only true` in your subnet |
| Only some public IPs can call | IP restrictions: **all Allow** or **all Deny** rules, never mixed; no rule = everyone |
| Pull from ACR without credentials | Managed identity with AcrPull |
| Secrets | Key Vault references with a managed identity |
| Users must sign in | Built-in authentication |
| Callers present certificates | Client certificate mode (`clientCertificateMode`) |
| Encrypt traffic between apps | Peer-to-peer encryption on the environment |

HTTP on port 80 is redirected to HTTPS by default. Some built-in roles include `listSecrets`, which returns secret values in clear text: check role permissions before assigning them.

```bash
az containerapp ingress access-restriction set -n app1 -g RG1 \
  --rule-name office --ip-address 203.0.113.0/24 --action Allow
```

<!-- section: functions | objectives: 3.3.5 -->
## Azure Functions

HTTP triggers have an authorization level: `anonymous`, `function` (default, a function or host key) or `admin` (master key). The key travels in the `code` query parameter or the `x-functions-key` header. Keys are shared secrets, not identity: for real client authentication, enable **App Service authentication** (Microsoft Entra ID) or put **API Management** in front.

Network and secrets:

- **Access restrictions** (inbound IP and service rules, evaluated by priority; no rule = all allowed).
- **Private endpoints** on Flex Consumption, Elastic Premium and Dedicated (App Service) plans, with private DNS zones.
- **Virtual network integration** for outbound access to private resources.
- Key Vault references in app settings (`@Microsoft.KeyVault(SecretUri=...)`) and **identity-based connections**, for example `AzureWebJobsStorage__accountName` with a managed identity instead of a connection string.
- HTTPS only, latest TLS, FTP disabled or FTPS only, explicit CORS origins (never `*`), remote debugging off. `functionsRuntimeAdminIsolationEnabled` disables the `/admin` endpoints.

> **Exam trap.** A function app's settings are visible to all its functions. To isolate a function that needs a credential, move it to a separate function app.

<!-- section: logic-apps | objectives: 3.3.6 -->
## Azure Logic Apps

| Requirement | Consumption | Standard |
| --- | --- | --- |
| Authenticate Request trigger callers | OAuth with Microsoft Entra ID authorization policy (Issuer, Audience); can disable SAS | Easy Auth |
| Restrict inbound callers | **Workflow settings**: **Only other Logic Apps** or **Specific IP ranges** | **Networking** > **Access restrictions** |
| Roles | Logic App Contributor, Logic App Operator | Logic Apps Standard Reader, Operator, Developer, Contributor |

- The Request trigger URL contains a **SAS** (`sp`, `sv`, `sig`): protect it, regenerate the access keys regularly, or create expiring callback URLs (`NotAfter`).
- **Secure Inputs** / **Secure Outputs** hide data in run history and from Log Analytics. Restrict run history access to an IP range (`0.0.0.0-0.0.0.0` blocks everyone).
- Use `securestring` parameters and Key Vault for secrets; for outbound calls prefer **Managed identity** authentication.

> **Exam trap.** Anyone who can edit a workflow can use every managed identity assigned to it: Contributor-level access to a workflow is access to what its identities can reach.

<!-- section: app-service | objectives: 3.3.7 -->
## Azure App Service

| Requirement | Setting |
| --- | --- |
| Redirect HTTP to HTTPS | HTTPS Only (off by default) |
| Refuse old TLS | Minimum TLS version 1.2 or higher (also on the SCM site) |
| No clear-text deployment credentials | Disable basic authentication for FTP and SCM; FTPS only or FTP disabled |
| Users sign in before reaching the code | Built-in authentication: 302 redirect (web apps) or 401 (APIs) for unauthenticated requests |
| Mutual TLS | Client certificates |
| Secrets out of app settings | Key Vault references + managed identity |
| No public exposure | Private endpoint, or ILB App Service Environment |
| Outbound to private resources | Virtual network integration |
| Threat detection | Defender for App Service |

**Access restrictions** are evaluated by priority; once any rule exists, unmatched traffic is denied unless you set the unmatched rule action. The SCM (Kudu) site has its own rules or can reuse the main site's. Rule types: IPv4/IPv6, service endpoint, service tag, plus HTTP header filters.

> **Exam trap.** Access restrictions don't apply to traffic arriving through a **private endpoint**. To accept only one Front Door profile, combine a service tag rule `AzureFrontDoor.Backend` with an `X-Azure-FDID` header filter: the tag alone allows every Front Door customer.

<!-- section: waf | objectives: 3.3.8 -->
## Azure Web Application Firewall

| Item | Application Gateway | Front Door |
| --- | --- | --- |
| SKU | WAF_v2 (policies not supported on v1) | Premium for managed rules and bot protection; Standard = custom rules only |
| Policy scopes | Global, per-site (listener), per-URI (path rule) | Profile, domain, route |
| Most specific wins | Yes | Route, then domain, then profile |

- **Modes**: **Detection** logs only; **Prevention** blocks (403). Start in Detection, then switch.
- **Managed rules**: Microsoft Default Rule Set (DRS) or OWASP CRS 3.x with anomaly scoring: Critical 5, Error 4, Warning 3, Notice 2; a score of 5 blocks.
- **Custom rules** run **before** managed rules, by priority (lowest number first): match conditions, geo-match, IP lists, rate limiting (Front Door: per client IP over 1 or 5 minutes). Actions: Allow, Block, Log (and Redirect on Front Door).
- **Bot Manager** rule set: Bad bots blocked, Good bots allowed, Unknown bots logged by default.
- **Exclusions** remove a header, cookie or argument (for example an authentication token) from inspection to fix false positives without disabling a rule.
- Logs: `ApplicationGatewayFirewallLog` (Application Gateway) to Log Analytics, storage or Event Hubs.

> **Exam trap.** A false positive on one field is fixed with an **exclusion** (or by disabling one rule), not by switching the whole policy to Detection.

<!-- section: apim-policies | objectives: 3.3.9 -->
## API Management policies for back-end protection

Policies run in the **inbound**, **backend**, **outbound** and **on-error** sections, at global, product, API or operation scope; `<base />` inherits the parent scope's policies.

| Requirement | Policy |
| --- | --- |
| Validate an OAuth token from any issuer | `validate-jwt` |
| Validate a Microsoft Entra token (audience, claims) | `validate-azure-ad-token` |
| Allow or block caller IPs | `ip-filter` |
| Limit rate per subscription / per key (IP, claim) | `rate-limit` (all tiers) / `rate-limit-by-key` (not in Consumption) |
| Volume quota per subscription / per key | `quota` (all tiers, product scope only) / `quota-by-key` (Developer, Basic, Standard, Premium) |
| APIM authenticates to the back end without secrets | `authentication-managed-identity` |
| Client certificate to the back end / validate the caller's certificate | `authentication-certificate` / `validate-client-certificate` |
| Reject oversized or malformed bodies | `validate-content` (also `validate-parameters`, `validate-headers`) |
| Browser cross-origin calls | `cors` |

```text
<inbound>
  <base />
  <validate-azure-ad-token tenant-id="contoso.onmicrosoft.com">
    <audiences><audience>api://orders</audience></audiences>
  </validate-azure-ad-token>
  <rate-limit-by-key calls="100" renewal-period="60"
      counter-key="@(context.Request.IpAddress)" />
  <authentication-managed-identity resource="api://orders-backend" />
</inbound>
```

To make APIM the only path to the back end, also lock the back end itself: access restrictions or a private endpoint on the App Service or function app, and back-end authentication that APIM's managed identity satisfies. An instance can't be upgraded from or downgraded to the Consumption tier: an API that needs `rate-limit-by-key` must be published through an instance in another tier.

> **Exam trap.** `rate-limit` and `quota` count per **subscription key**; to throttle per caller IP or per user claim, use the `-by-key` variants.

<!-- section: key-points -->
## Key points

- Defender for Containers: sensor for runtime, Azure Policy add-on for hardening, registry access for image scanning, gating for deployment control.
- AKS: private cluster vs authorized IP ranges (not both), Azure RBAC for Kubernetes, disable local accounts.
- ACR: admin user off, managed identity + AcrPull, private endpoints and CMK need Premium, Notary Project replaces Content Trust.
- Container Apps IP restrictions are all Allow or all Deny; ACI secrets use `secureValue`.
- Function keys aren't authentication; private endpoints need Flex Consumption, Premium or Dedicated.
- App Service access restrictions don't filter private endpoint traffic; Front Door lock-down = service tag + `X-Azure-FDID`.
- WAF: custom rules first, most specific policy wins, exclusions for false positives.
- APIM: `validate-jwt`/`validate-azure-ad-token`, `ip-filter`, `rate-limit-by-key`, `authentication-managed-identity`.
