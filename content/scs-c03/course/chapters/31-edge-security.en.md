The network edge is where most attacks first touch an application: floods, injection attempts, bots, credential stuffing, requests that try to bypass the CDN and reach the origin directly. Edge security questions give a threat and a set of constraints (global users, a country restriction, a login page under attack, a partner's rule set to reuse) and ask for the control, the layer where it runs and the exact setting. Know what each edge service can see, where it can be attached, and what it cannot do.

<!-- section: edge-strategy | objectives: 3.1.1 -->
## Choosing an edge security strategy for the threat

| Anticipated threat | Primary control | Complement |
| --- | --- | --- |
| Volumetric layer 3/4 DDoS (SYN floods, UDP reflection) | AWS Shield Standard, automatic and free for every customer, on edge services (CloudFront, Route 53, Global Accelerator) | Shield Advanced for tailored detection, SRT support, cost protection |
| HTTP request floods (layer 7) | AWS WAF rate-based rules, Anti-DDoS managed rule group | Shield Advanced with health-based detection; CloudFront caching absorbs repeated requests |
| SQL injection, cross-site scripting, known exploit payloads | AWS WAF managed rule groups: Core rule set, Known bad inputs, SQL database, OS and application specific groups | Custom rules for the application's paths |
| Scrapers and automated clients | Bot Control rule group, CAPTCHA and Challenge actions | Rate limits on fingerprints |
| Credential stuffing on a login page | Account takeover prevention (ATP) rule group | Rate-based rule scoped to the login path |
| Fake account sign-ups | Account creation fraud prevention (ACFP) rule group | CAPTCHA on the sign-up path |
| Known malicious or anonymizing sources | Amazon IP reputation list, Anonymous IP list | IP sets from threat intelligence |
| Attackers bypassing the CDN to hit the origin | S3 origin access control (OAC), CloudFront VPC origins, origin-facing prefix list | A secret custom header checked at the origin |
| Device impersonation and topic abuse in IoT | AWS IoT Core X.509 mutual TLS with least-privilege IoT policies | Device Defender audits |

**Where AWS WAF attaches**: CloudFront distributions (web ACL with scope `CLOUDFRONT`, managed in US East (N. Virginia)), and regional resources: Application Load Balancers, API Gateway REST APIs, AppSync GraphQL APIs, Cognito user pools, App Runner services, Verified Access instances and Amazon Bedrock AgentCore Gateway. Not Network Load Balancers, not EC2 instances directly.

Defense in depth: block at the edge first (CloudFront with WAF and Shield), keep the origin unreachable except through the edge, filter again at the Regional layer (WAF on the ALB, Network Firewall in the VPC), and finish with security groups. Recent AWS WAF documentation writes **protection pack (web ACL)**; the API and most exam wording still say web ACL.

> **Exam trap.** AWS WAF cannot be associated with a Network Load Balancer. For a TCP or UDP application behind an NLB, the layer 7 answer does not apply: use Shield Advanced on the Elastic IP addresses or a Global Accelerator in front, and Network Firewall or security groups for filtering.

<!-- section: edge-protection | objectives: 3.1.2 -->
## Implementing network edge protection

**AWS WAF web ACL**: rules evaluated by priority, each with an action (**Allow**, **Block**, **Count**, **CAPTCHA**, **Challenge**), rule groups (your own, AWS managed, AWS Marketplace), a default action, and capacity measured in WCUs. Rules add **labels** that later rules can match. Run new rules in **Count** first, read the logs, then switch to Block.

**OWASP Top 10 protection**: the Core rule set covers common web exploits (generic injections, path traversal, oversized requests), Known bad inputs blocks payloads such as known exploit patterns, SQL database targets SQL injection, the Linux, POSIX, Windows, PHP and WordPress groups add platform-specific rules, and Admin protection blocks access to exposed administrative pages. Bot Control, ATP, ACFP and Anti-DDoS are paid rule groups. Broken access control or business-logic flaws still need application fixes; WAF is a layer, not a cure.

**CloudFront headers.**

- **Viewer headers** added by CloudFront and sent to the origin with an **origin request policy**: `CloudFront-Viewer-Country`, `CloudFront-Viewer-Address`, `CloudFront-Viewer-ASN`, `CloudFront-Viewer-JA3-Fingerprint`, `CloudFront-Viewer-JA4-Fingerprint`, `CloudFront-Viewer-TLS`. The address, ASN, TLS and fingerprint headers are allowed only in origin request policies, not cache policies.
- **Response headers policies** add security headers to every response: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options` (`nosniff`), `X-Frame-Options` (`DENY` or `SAMEORIGIN`), `Referrer-Policy`, `X-XSS-Protection`, plus CORS headers, custom headers and header removal (for example `X-Powered-By`). Each header has an **origin override** setting.
- **Origin custom header**: CloudFront adds a secret header to origin requests; a WAF rule on the ALB blocks requests without it.

**Protecting the origin.**

| Origin | Control |
| --- | --- |
| S3 bucket | **Origin access control (OAC)**: bucket policy for the `cloudfront.amazonaws.com` service principal with `AWS:SourceArn` equal to the distribution ARN; supports SSE-KMS (add the same principal to the key policy) and `PUT` or `DELETE`. Origin access identity (OAI) is legacy |
| ALB, NLB or EC2 instance in a private subnet | **CloudFront VPC origins**: no public IP; allow inbound from the origin-facing prefix list `com.amazonaws.global.cloudfront.origin-facing` or, more strictly, from the service-managed security group `CloudFront-VPCOrigins-Service-SG` |
| Public ALB | Security group allowing only the CloudFront origin-facing prefix list, plus the secret header check |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOnlyOurDistribution",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::media-assets-prod/*",
      "Condition": {
        "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::111122223333:distribution/E2QWRUHEXAMPLE" }
      }
    }
  ]
}
```

**Amazon S3 CORS.** A CORS configuration (up to 100 rules, first matching rule wins) lists `AllowedOrigins`, `AllowedMethods`, `AllowedHeaders`, `ExposeHeaders` and `MaxAgeSeconds`. CORS only tells browsers which cross-origin calls to allow: it **grants no access**; bucket policies, ACLs and presigned URLs still decide. Behind CloudFront, forward the `Origin` header so S3 can evaluate CORS, or answer CORS from a response headers policy.

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://app.example.com"],
      "AllowedMethods": ["GET", "PUT"],
      "AllowedHeaders": ["Content-Type", "Authorization"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 600
    }
  ]
}
```

**AWS IoT policies.** IoT Core policies are attached to X.509 certificates, Amazon Cognito identities or thing groups, deny by default, and use actions `iot:Connect`, `iot:Publish`, `iot:Subscribe` and `iot:Receive` on `client`, `topic` and `topicfilter` resources. Policy variables bind each device to its own identity: `${iot:Connection.Thing.ThingName}` in resource ARNs, and the condition `iot:Connection.Thing.IsAttached` set to `true` so that a valid certificate cannot claim another thing. Policy changes can take several minutes to propagate.

**Shield Advanced at the edge**: protect the CloudFront distribution and Route 53 hosted zone (and the ALB if it is also reachable), associate health checks, and enable the Anti-DDoS rule group in the web ACL.

> **Exam trap.** An S3 CORS rule allowing `https://app.example.com` does not make objects readable by that site's users: without an allow in the bucket policy or a presigned URL, the browser gets `403`. Conversely, `AllowedOrigins: ["*"]` is not a public access grant either.

<!-- section: edge-rules | objectives: 3.1.3 -->
## Edge rules: geography, rate limiting and client fingerprinting

**Geography.**

| | CloudFront geographic restriction | AWS WAF geo match statement |
| --- | --- | --- |
| Granularity | Country only | Country (ISO 3166-1 alpha-2), and region (ISO 3166-2) through labels such as `awswaf:clientip:geo:region:US-OR` |
| Scope | Whole distribution, allow list or block list | Any rule, combinable with paths, headers, IP sets, rate limits |
| Response | `403` (custom error page possible) | Rule action (Block with custom response, CAPTCHA, Count) |
| Client address | Viewer IP | Source IP or an IP from a header (forwarded IP configuration) |

Requests blocked by the CloudFront restriction are not forwarded to WAF, so when geography must be combined with other criteria, use the WAF geo match statement. Finer locations (city, postal code) need a third-party geolocation service with signed URLs.

**Rate limiting** with rate-based rules:

- **Evaluation window**: 60, 120, 300 or 600 seconds (default 300). **Limit**: minimum 10 requests per window per aggregation instance. Action: anything except Allow.
- **Aggregation**: source IP, IP address in a header, ASN, ASN in a header, count all (requires a scope-down statement), or **custom keys** combining label namespace, header, cookie, query argument, query string, URI path, JA3 fingerprint, JA4 fingerprint, HTTP method, IP. A request missing one of the key components is not counted.
- A **scope-down statement** limits counting to matching requests, for example one path.
- Behind a proxy or CDN, the source IP is the proxy; use the forwarded IP option (first address of `X-Forwarded-For`), knowing that headers can be forged.

```json
{
  "Name": "login-throttle",
  "Priority": 10,
  "Action": { "Block": {} },
  "Statement": {
    "RateBasedStatement": {
      "Limit": 50,
      "EvaluationWindowSec": 300,
      "AggregateKeyType": "CUSTOM_KEYS",
      "CustomKeys": [
        { "IP": {} },
        { "JA4Fingerprint": { "FallbackBehavior": "MATCH" } }
      ],
      "ScopeDownStatement": {
        "ByteMatchStatement": {
          "SearchString": "/account/login",
          "FieldToMatch": { "UriPath": {} },
          "TextTransformations": [{ "Priority": 0, "Type": "LOWERCASE" }],
          "PositionalConstraint": "STARTS_WITH"
        }
      }
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "login-throttle"
  }
}
```

**Client fingerprinting.** The **JA3** (32-character hash) and **JA4** (36-character) fingerprints describe the client's TLS Client Hello. AWS WAF inspects them only on **CloudFront and ALB**, with string, regex and size statements (not SQLi or XSS statements), and requires a **fallback** (match or no match) for requests where no fingerprint can be computed. Get the values from WAF logs, then block a malicious tool's fingerprint, or rate-limit per fingerprint when attackers rotate IP addresses. **Header order** inspection is another fingerprinting signal.

> **Exam tip.** "Attackers rotate through thousands of IP addresses but use the same tool" points to rate limiting or blocking on the JA3 or JA4 fingerprint, not on IP. "Block one country except two of its states" needs a WAF geo match with region labels; CloudFront geographic restriction cannot do it.

<!-- section: edge-integrations | objectives: 3.1.4 -->
## Integrations with AWS edge services and third parties

**WAF logging.** One logging destination per web ACL: CloudWatch Logs log group, S3 bucket or Amazon Data Firehose stream, each with a name starting with `aws-waf-logs-`. Logs include the terminating rule, labels, the JA3 and JA4 fingerprints and request details; **redacted fields** hide values such as the `authorization` header, and **logging filters** keep only some requests. Redaction in the logging configuration does not apply to request sampling or Security Lake collection: use the web ACL data protection settings for those.

**OCSF ingestion with Amazon Security Lake.**

- **AWS WAFv2 logs** are a native Security Lake source (no WAF charge for this collection), converted to OCSF with CloudTrail, VPC Flow Logs, Route 53 Resolver, EKS audit logs and Security Hub CSPM findings.
- **Custom sources** bring third-party CDN, WAF or firewall data: the producer writes **Parquet** objects in **OCSF** (version 1.3 or earlier), **one OCSF event class per custom source**, under the source's prefix partitioned as `region=`, `accountId=`, `eventDay=`. Security Lake creates the prefix, a provider role, a Lake Formation table and a Glue crawler. Up to 50 custom sources per account.
- **Subscribers** (a SIEM, Athena, OpenSearch) receive data access or query access.

```text
aws-security-data-lake-eu-west-1-example/ext/edge-cdn-http/region=eu-west-1/accountId=111122223333/eventDay=20261121/part-0001.zstd.parquet
```

**Third-party WAF rules.** AWS Marketplace managed rule groups from security vendors are subscribed to in the WAF console and added to a web ACL like any rule group. The seller owns the rules, actions, labels and updates; you cannot edit them, but you can override a rule or the whole group to Count to handle false positives. Pricing is a monthly fee plus requests. To stop paying, remove the group from every web ACL and Firewall Manager policy before cancelling the subscription.

**AWS Firewall Manager** applies WAF policies (including Marketplace rule groups, AWS managed groups and custom rules), Shield Advanced protections, security group, network ACL, Network Firewall and DNS Firewall policies across the organization, including to new accounts and resources as they appear.

**Monitoring integrations**: WAF metrics in CloudWatch per rule, Shield Advanced `DDoSDetected` metrics and events, WAF and Shield data visible to the SRT through its access role.

> **Exam trap.** A Firewall Manager WAF policy that uses an AWS Marketplace rule group works only if every account in scope has subscribed to that rule group. And WAF logs go to exactly one destination: to reach both a SIEM and long-term storage, send them to Firehose and fan out, or to S3 and let Security Lake collect.

<!-- section: key-points -->
## Key points

- Match threat to control: Shield Standard and edge services for layer 3/4, WAF rate-based and Anti-DDoS for HTTP floods, managed rule groups for OWASP threats, Bot Control, ATP and ACFP for automation and fraud.
- WAF attaches to CloudFront, ALB, API Gateway REST, AppSync, Cognito, App Runner, Verified Access and AgentCore Gateway; never to an NLB.
- Protect the origin: OAC for S3, VPC origins or the origin-facing prefix list for load balancers and instances, secret header checks; response headers policies add HSTS, CSP and other security headers.
- CORS is a browser rule, not an access grant; IoT policies bind certificates to thing names with policy variables and `IsAttached`.
- Geography: CloudFront restriction for whole-distribution country lists, WAF geo match for regions and combined rules; rate-based windows 60 to 600 seconds, minimum limit 10, custom keys including JA3 and JA4.
- Integrate: one WAF log destination prefixed `aws-waf-logs-`, Security Lake native WAF source and OCSF custom sources, Marketplace rule groups, Firewall Manager across the organization.
