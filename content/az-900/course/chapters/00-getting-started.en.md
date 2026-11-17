AZ-900 checks that you understand what the cloud is, what Azure offers and how it is managed. It doesn't ask you to configure anything: every question comes down to recognizing a concept or choosing the right service for a need.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 45 minutes of exam time |
| Questions | Not published; about 35 to 45 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Closed book: Microsoft Learn isn't available during fundamentals exams |
| Validity | Doesn't expire |
| Prerequisites | None |

The three domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Describe cloud concepts | 25 to 30 % |
| Describe Azure architecture and services | 35 to 40 % |
| Describe Azure management and governance | 30 to 35 % |

Question formats: one answer among four, several answers ("select two"), series of three Yes/No statements, sentences to complete with a drop-down list, and matching by drag and drop. There is no case study and no lab. Questions with several elements give one point per correct element.

<!-- section: reading-questions -->
## Reading a question

Most questions describe a need in one or two sentences and ask which concept or service matches it. Train yourself to turn the sentence into a keyword:

| Words in the question | Think of |
| --- | --- |
| "no upfront cost", "pay only for what you use" | Consumption-based model, operational expenditure |
| "quickly add resources when demand increases" | Scalability, elasticity |
| "remains available if a datacenter fails" | Availability zones |
| "remains available if a region fails" | Region pairs, geo-redundant storage |
| "enforce a rule on resources", "allowed regions" | Azure Policy |
| "prevent accidental deletion" | Resource lock |
| "who can do what" | Azure RBAC |
| "private connection that doesn't use the internet" | ExpressRoute |
| "recommendations to reduce costs or improve security" | Azure Advisor |
| "be informed of an Azure outage that affects me" | Azure Service Health |

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Services that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Azure Policy | Azure RBAC | Policy controls what resources may be; RBAC controls who may act |
| Azure Advisor | Azure Monitor | Advisor recommends improvements; Monitor collects metrics and logs and raises alerts |
| Azure Service Health | Azure Monitor | Service Health reports on the Azure platform; Monitor reports on your resources |
| Pricing calculator | Cost Management | The calculator estimates before deployment; Cost Management analyzes what you actually spend |
| VPN Gateway | ExpressRoute | VPN is encrypted traffic over the internet; ExpressRoute is a private circuit |
| Microsoft Entra ID | Microsoft Entra Domain Services | Entra ID is the cloud identity service; Domain Services provides domain join, Group Policy and LDAP for legacy applications |
| AzCopy | Azure File Sync | AzCopy copies on demand; File Sync keeps a Windows file server and an Azure file share in sync |
| Azure Migrate | Azure Data Box | Migrate assesses and migrates workloads over the network; Data Box ships data on a physical device |
| Availability set | Availability zone | A set spreads virtual machines inside one datacenter; zones are separate datacenters |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order; each one is short.
2. Create a free Azure account and open the portal: seeing a resource group, a subscription and the cost pages makes the vocabulary concrete.
3. After each domain, take a mock exam and reread the sections linked to your mistakes.
4. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
