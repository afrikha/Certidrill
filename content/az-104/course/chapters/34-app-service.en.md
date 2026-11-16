Azure App Service hosts web applications and APIs without managing servers. Almost every exam question on App Service comes down to one thing: which **pricing tier** offers the feature, and how the feature behaves.

<!-- section: app-service-plans | objectives: 3.4.1 -->
## App Service plans

An **App Service plan** is the set of compute resources that runs your apps. It fixes:

- the **region**;
- the **operating system** (Windows or Linux: a plan hosts one or the other);
- the **pricing tier** and instance size (for example S1, P1v3);
- the **number of instances**.

All the apps of a plan run on **the same instances** and scale together. You pay for the plan, not per app (dedicated tiers). An app that needs another region, another operating system or independent scaling needs its own plan.

| Tier | Compute | Max instances | Custom domain | TLS binding | Autoscale | Slots | Backups |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Free** (F1) | Shared, CPU quota | 1 | No | No | No | No | No |
| **Shared** (D1) | Shared, CPU quota | 1 | Yes | No | No | No | No |
| **Basic** (B1-B3) | Dedicated | 3, manual | Yes | SNI, managed certificate | No | No | Yes |
| **Standard** (S1-S3) | Dedicated | 10 | Yes | SNI and IP-based | **Yes** | **5** | Yes |
| **Premium** (v3, v4) | Dedicated, faster | 30 | Yes | Yes | Yes, plus automatic scaling | 20 | Yes |
| **Isolated** (v2) | Dedicated, in an App Service Environment inside your virtual network | 100 | Yes | Yes | Yes | 20 | Yes |

"Lowest cost" answers to memorize: custom domain = **Shared**; HTTPS on a custom domain, dedicated instances, backups, virtual network integration, private endpoint = **Basic**; autoscale and deployment slots = **Standard**; more than 10 instances, more than 5 slots, zone redundancy = **Premium**; full network isolation = **Isolated**.

```bash
az appservice plan create -g RG1 -n plan-contoso --location westeurope \
  --is-linux --sku P1V3 --number-of-workers 2
```

<!-- section: app-service-scaling | objectives: 3.4.2 -->
## Scaling an App Service plan

| Direction | What changes | How |
| --- | --- | --- |
| **Scale up** / down | The **tier or size** of the instances: more CPU, memory, features | *Scale up (App Service plan)*; applies in seconds to all apps, no redeployment |
| **Scale out** / in | The **number** of instances | *Scale out (App Service plan)* |

Scale-out methods:

| Method | Tier | Behavior |
| --- | --- | --- |
| **Manual** | Basic and above | A fixed instance count; never changes by itself |
| **Rules-based autoscale** (Azure Monitor autoscale) | Standard and above | Rules on metrics (CPU percentage, memory, HTTP queue length) or schedules, within minimum and maximum limits |
| **Automatic scaling** | Premium v2 and above | The platform adds instances according to HTTP traffic. *Maximum burst* at the plan level; *always ready instances* per app |

Autoscale works as for scale sets: instance limits, pairs of scale-out and scale-in rules, cool down, and **profiles** (default, recurring, fixed dates; a fixed-date profile overrides the others during its dates).

> **Exam trap.** "Scale up to S3" doesn't add instances. If the requirement is "the number of instances must change automatically with the load", the answer is autoscale on a Standard or higher plan, never a scale up and never a manual instance count.

<!-- section: create-web-app | objectives: 3.4.3 -->
## Creating an app

An app has a globally unique name that forms its default host name `<app>.azurewebsites.net`. At creation you choose the publishing model (**code** or **container**), the **runtime stack** (.NET, Java, Node.js, Python, PHP), the operating system, the region and the plan.

```bash
az webapp list-runtimes --os-type linux
az webapp create -g RG1 -n app-contoso-web --plan plan-contoso \
  --runtime "NODE:20-lts" --https-only true
az webapp config appsettings set -g RG1 -n app-contoso-web --settings API_URL=https://api.contoso.com
```

- **App settings** and **connection strings** are exposed to the code as environment variables; changing them restarts the app.
- Deployment: ZIP deploy, local Git, GitHub Actions or Azure Pipelines (*Deployment Center*), FTPS, or a container image.
- **Always On** (Basic and above) keeps the app loaded instead of unloading it after idle time.
- A **managed identity** lets the app reach Key Vault, storage or a database without secrets.
- The Kudu console (`<app>.scm.azurewebsites.net`) gives access to files and logs.

<!-- section: app-service-tls | objectives: 3.4.4 -->
## Certificates and TLS

Protocol settings: **HTTPS Only** redirects HTTP to HTTPS; **Minimum TLS version** rejects older versions (1.2 by default). The default name `*.azurewebsites.net` already has a Microsoft certificate; certificates are needed for **custom domains**.

| Certificate option | Characteristics |
| --- | --- |
| **App Service managed certificate** | Free; created and **renewed automatically**; for a custom domain already mapped to the app; **no wildcard, not exportable**; the app must be reachable from the internet for validation of an apex domain |
| **App Service certificate** | Purchased through Azure, stored in Key Vault, automatic renewal possible; standard or **wildcard** |
| Import from Key Vault | A certificate you manage in Key Vault |
| Upload a private certificate (`.pfx`) | A certificate from any authority; you handle renewal |
| Upload a public certificate (`.cer`) | Not for bindings: lets the app trust a remote endpoint |

Then create a **binding** between the custom domain and the certificate: **SNI SSL** (Basic and above) or **IP-based SSL** (Standard and above; dedicated inbound IP address for old clients).

Order of operations: map the custom domain, add or create the certificate, create the binding.

```bash
az webapp update -g RG1 -n app-contoso-web --https-only true
az webapp config set -g RG1 -n app-contoso-web --min-tls-version 1.2
```

<!-- section: custom-domain | objectives: 3.4.5 -->
## Mapping a custom DNS name

Custom domains require the **Shared** tier or higher (TLS on them requires Basic). App Service must **verify that you own the domain** and DNS must **route** the name to the app:

| Name to map | Routing record | Verification record |
| --- | --- | --- |
| Subdomain `www.contoso.com` | **CNAME** `www` to `<app>.azurewebsites.net` (preferred: follows IP changes), or an A record | **TXT** `asuid.www` = custom domain verification ID |
| Root (apex) domain `contoso.com` | **A** record `@` to the app's inbound IP address (a CNAME isn't allowed at the apex) | **TXT** `asuid` = custom domain verification ID |
| Wildcard `*.contoso.com` | CNAME `*` to `<app>.azurewebsites.net` | TXT `asuid` |

Steps: get the app's **custom domain verification ID** and IP address (Custom domains page); create the DNS records at your DNS provider; add the custom domain in the app and validate; add a certificate and binding.

To migrate a live site **without downtime**, create only the TXT `asuid` record first, add and secure the domain in App Service, and switch the CNAME or A record last.

<!-- section: app-service-backup | objectives: 3.4.6 -->
## Backing up an app

| | **Automatic backups** | **Custom backups** |
| --- | --- | --- |
| Tiers | Basic, Standard, Premium, Isolated | Same |
| Configuration | None: enabled by default | A **storage account and container** that you provide, on demand or on a schedule |
| Frequency and retention | Hourly; restore points kept up to 30 days | Your schedule; kept indefinitely or per your retention setting |
| Size | Up to 30 GB | Up to 10 GB, including databases |
| Linked databases | No | Yes (connection strings of supported databases) |
| Partial backup | No | Yes: exclusions listed in `_backup.filter` in `%HOME%\site\wwwroot` |
| Download | No | Yes: ZIP file plus XML manifest in the container |

A backup contains the app configuration, its file content and optionally linked databases. You **restore** to the same app (overwrite), to a deployment slot or to a new app. If the storage account is behind a firewall, enable backup and restore over the virtual network integration.

<!-- section: app-service-networking | objectives: 3.4.7 -->
## Networking settings

App Service separates **inbound** features (who can reach the app) from **outbound** features (what the app can reach).

| Direction | Feature | Purpose |
| --- | --- | --- |
| Inbound | **Access restrictions** | Allow or deny by IPv4/IPv6 range, **service tag** or **virtual network subnet** (service endpoint `Microsoft.Web`). Separate rules for the main site and the `scm` site |
| Inbound | **Private endpoint** | A private IP address for the app in your virtual network; reachable from peered networks and on-premises. Disable public network access to refuse internet traffic |
| Outbound | **Virtual network integration** | The app calls resources **inside** a virtual network (and beyond, through peering or VPN). Needs a dedicated subnet **delegated to `Microsoft.Web/serverFarms`** in the same region |
| Outbound | **Hybrid Connections** | The app calls one TCP host and port on-premises through Azure Relay, without VPN |

- Access restriction rules are evaluated **by priority, lowest number first; the first match applies**. As soon as one rule exists, unmatched traffic is denied (HTTP 403) by the implicit last rule.
- Virtual network integration is **outbound only**: it doesn't make the app privately reachable. For private inbound access, use a private endpoint.
- By default only private (RFC 1918) destinations go through the integration; with *route all* (outbound internet traffic), everything does and the NSGs and route tables of the integration subnet apply.
- The app's **outbound IP addresses** (Properties) are what a remote firewall must allow when there is no integration.

<!-- section: deployment-slots | objectives: 3.4.8 -->
## Deployment slots

A deployment slot is a live app with its own host name (`<app>-<slot>.azurewebsites.net`), in the same plan as the production slot. Standard: 5 slots; Premium and Isolated: 20.

Typical use: deploy to **staging**, validate, then **swap** staging and production. Before switching the routing, App Service warms up the instances of the source slot with the target's settings, so the swap causes **no downtime**; the previous version is now in staging and a second swap is the **rollback**.

What follows the content in a swap and what stays with the slot:

| Swapped with the content | Stays with the slot |
| --- | --- |
| App settings and connection strings (not marked as slot settings), framework versions, handler mappings, public certificates, WebJobs content, path mappings | Settings marked **Deployment slot setting** ("sticky"), custom domain names, private certificates and TLS bindings, **scale settings**, publishing endpoints, managed identities, virtual network integration, IP restrictions, Always On, diagnostic settings |

Mark as slot settings the values that must differ between environments: a staging database connection string, for example.

| Feature | Behavior |
| --- | --- |
| **Swap with preview** (multi-phase) | Phase 1 applies the target's settings to the source slot and pauses: you test staging with production settings. Then complete or cancel the swap |
| **Auto swap** | Every deployment to the slot is swapped to production automatically after warm-up. Not supported on Linux apps |
| **Traffic %** (testing in production) | Routes a percentage of production traffic to another slot; the `x-ms-routing-name=<slot>` query parameter forces a slot for one user |
| Clone settings | A new slot can copy the configuration of an existing slot; content isn't copied |

```bash
az webapp deployment slot create -g RG1 -n app-contoso-web --slot staging \
  --configuration-source app-contoso-web
az webapp deployment slot swap -g RG1 -n app-contoso-web --slot staging --target-slot production
```

<!-- section: key-points -->
## Key points

- The plan fixes region, operating system, tier and instances; apps of a plan share them.
- Shared: custom domain. Basic: TLS, backups, 3 manual instances. Standard: autoscale, 5 slots. Premium: 30 instances, 20 slots.
- Scale up = bigger instances; scale out = more instances; autoscale from Standard.
- Subdomain: CNAME plus TXT `asuid.<sub>`. Apex: A record plus TXT `asuid`.
- Managed certificate: free, auto-renewed, no wildcard, not exportable.
- Automatic backups need no configuration; custom backups need a storage account and allow databases and partial backups.
- Virtual network integration is outbound; private endpoint and access restrictions are inbound.
- Slot settings stay with the slot; swap again to roll back.
