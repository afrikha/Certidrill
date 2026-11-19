AWS offers help at several levels: free documentation and community answers for everyone, paid Support plans with engineers and response times, and tools such as Trusted Advisor and AWS Health that watch your account. Exam questions ask where to find a resource, which plan is the cheapest one that includes a feature, and which tool or team handles a situation.

<!-- section: official-resources | objectives: 4.3.1, 4.3.5 -->
## Resources on official AWS websites

| Resource | Where | What you find |
| --- | --- | --- |
| **AWS Documentation** | docs.aws.amazon.com | User guides, developer guides, API references, tutorials for every service |
| **AWS Whitepapers and guides** | aws.amazon.com/whitepapers | Technical papers written by AWS and partners: architecture, security, Well-Architected Framework, cost optimization |
| **AWS Blogs** | aws.amazon.com/blogs | News, launches, walkthroughs and best practices, by topic (AWS News Blog, Architecture, Security...) |
| **AWS Architecture Center** | aws.amazon.com/architecture | Reference architectures, diagrams and best practices |
| **Service FAQs and pricing pages** | aws.amazon.com/`<service>` | Answers to common questions, prices, limits |
| **AWS Skill Builder** | skillbuilder.aws | Digital training courses and labs |

<!-- section: technical-resources | objectives: 4.3.6 -->
## AWS technical resources

| Resource | Use it to |
| --- | --- |
| **AWS re:Post** | Ask and answer technical questions in a community managed by AWS; answers come from the community and from AWS experts |
| **AWS Knowledge Center** (on re:Post) | Read articles and videos that answer the **most frequent questions** customers ask AWS Support |
| **AWS Prescriptive Guidance** | Follow **guides** (planning and implementation best practices) and **patterns** (steps, architectures and code) for migration, modernization and optimization projects, from AWS technology experts and AWS Partners |
| **AWS Solutions Library** | Deploy vetted solutions and guidance for common business and technical problems |

> **Exam tip.** "Common question with a step-by-step answer from AWS Support" is the Knowledge Center; "ask the community" is re:Post; "plan a large migration with proven patterns" is Prescriptive Guidance.

<!-- section: support-plans | objectives: 4.3.2, 4.3.7 -->
## AWS Support plans

Every account has **Basic Support**, free. Three paid plans add technical support by AWS engineers. Developer, Business and Enterprise On-Ramp are former plans that are being discontinued.

| Feature | Basic Support | AWS Business Support+ | AWS Enterprise Support | AWS Unified Operations |
| --- | --- | --- | --- | --- |
| Customer service, account and billing, documentation, re:Post | Yes | Yes | Yes | Yes |
| Technical support cases | No | 24/7 phone, web and chat | 24/7 phone, web and chat | 24/7 phone, web and chat |
| Trusted Advisor checks | Core checks | Full set | Full set and Trusted Advisor Priority | Full set and Trusted Advisor Priority |
| AWS Health API and Support API | No | Yes | Yes | Yes |
| Designated Technical Account Manager (TAM) | No | No | Yes | Yes, with domain specialist engineers |
| Business-critical or mission-critical system down | Not applicable | Under 30 minutes | Under 15 minutes | Under 5 minutes |
| Production system down | Not applicable | Under 1 hour | Under 1 hour | Under 1 hour |
| Minimum price | Free | 29 USD per month | 5,000 USD per month | Not listed; 3-month initial commitment, then month to month |

All paid plans answer production system impaired cases in under 4 hours, system impaired cases in under 12 hours and general guidance in under 24 hours.

Choosing a plan:

- Only documentation, community help and billing questions: **Basic Support**.
- 24/7 technical help for production workloads at the lowest cost: **Business Support+**.
- A designated TAM, strategic business reviews, a 15-minute critical response, AWS Security Incident Response access: **Enterprise Support**.
- The fastest critical response (5 minutes), infrastructure event management and architecture guidance: **Unified Operations**.

> **Exam trap.** The cheapest plan with a **designated TAM** is Enterprise Support, not Business Support+. The cheapest plan with the **full set of Trusted Advisor checks** or the **AWS Health API** is Business Support+.

<!-- section: support-center | objectives: 4.3.4 -->
## AWS Support Center

The **AWS Support Center** in the console is where you open and follow **support cases**:

| Case type | Available with |
| --- | --- |
| Account and billing | Every plan, Basic included |
| Service quota increase | Every plan, Basic included |
| Technical support | Paid plans only |

- You choose a **severity** (general guidance, system impaired, production system impaired, production system down, business-critical or mission-critical system down); response times depend on the severity and the plan.
- With a paid plan, any IAM user with the right permissions can open cases, and can ask for contact by web, chat or phone.

<!-- section: trusted-advisor-health | objectives: 4.3.8 -->
## Trusted Advisor and AWS Health

**AWS Trusted Advisor** inspects your account and recommends improvements, in six categories: **cost optimization, performance, security, fault tolerance, service limits, operational excellence**.

- Cost optimization checks find savings: idle load balancers, idle RDS instances, unassociated Elastic IP addresses, over-provisioned EBS volumes, Reserved Instance lease expirations, Savings Plans purchase recommendations.
- **Basic Support**: all service limits checks and a selection of security and fault tolerance checks, refreshed manually. **Paid plans**: all checks, the Trusted Advisor API and Amazon EventBridge monitoring.

**AWS Health** reports events that can affect your AWS resources and accounts:

| Tool | What it gives | Access |
| --- | --- | --- |
| **AWS Health Dashboard** | Service health (public events, no sign-in required) and your account health: operational issues, scheduled changes (for example EC2 instance retirement), account notifications, with the affected resources | All customers, at no additional cost |
| **AWS Health API** | The same events, to integrate with your own operations tools; with AWS Organizations, an organizational view of all accounts | Business Support+, Enterprise Support or Unified Operations |

> **Exam trap.** Trusted Advisor recommends **best practices** for your resources; the Health Dashboard reports **AWS events** that affect them. "Be informed of scheduled maintenance on my instances" is AWS Health.

<!-- section: trust-safety | objectives: 4.3.9 -->
## Reporting abuse: AWS Trust and Safety

The **AWS Trust and Safety team** handles reports that AWS resources are used for abusive or illegal purposes: spam and abusive email, port scanning, denial-of-service attacks, intrusion attempts, objectionable content, content that infringes copyright.

- Anyone who suspects abuse **from AWS resources** reports it to the Trust and Safety team, with evidence: the URL for abusive content; the target IP address, a timestamp with time zone and log samples for network abuse.
- Trust and Safety investigates, may ask the reporter for more information, and works with the customer who controls the resource.
- If you receive a Trust and Safety notification about one of **your** resources (for example, a compromised instance sending spam), you answer the Trust and Safety team and fix the issue. AWS Support can't handle abuse reports or questions about these notifications.

> **Exam trap.** Abuse is reported to AWS Trust and Safety, not to AWS Support, and not through a support case about your own account.

<!-- section: key-points -->
## Key points

- Documentation, whitepapers, blogs, Architecture Center: official AWS websites, free.
- re:Post: community Q&A. Knowledge Center: answers to frequent questions. Prescriptive Guidance: guides and patterns.
- Plans: Basic (free, no technical cases), Business Support+ (24/7 engineers, full Trusted Advisor, Health API), Enterprise Support (TAM, 15 minutes), Unified Operations (5 minutes).
- Support Center: account and billing and quota cases for everyone; technical cases with a paid plan.
- Trusted Advisor: six categories, cost optimization checks. Health Dashboard: events for all customers; Health API with a paid plan.
- Abuse of AWS resources: AWS Trust and Safety team.
