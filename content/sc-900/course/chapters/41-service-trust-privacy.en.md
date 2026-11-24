Before trusting a cloud provider with regulated data, an organization wants proof: who audited the provider, what the report says, how the data is protected. Microsoft publishes that proof in the Service Trust Portal and states its commitments in privacy principles. The exam checks that you know what the portal offers and what each principle promises.

<!-- section: service-trust-portal | objectives: 4.1.1 -->
## Service Trust Portal offerings

The **Service Trust Portal (STP)** is the public site where Microsoft publishes **audit reports** and other compliance information about its cloud services (`https://aka.ms/STP`). It provides content, tools and resources on how Microsoft cloud services protect your data and on how you can manage the security and compliance of your own cloud data.

What you find there:

- Audit reports produced by **external auditors**, which you can download.
- **Whitepapers** written by Microsoft on how its services protect data.
- Guidance to manage cloud data security and compliance.

| Category | Content |
| --- | --- |
| **Certifications, Regulations, and Standards** | Security implementation and design information that shows how Microsoft cloud services meet standards and regulations: ISO/IEC, SOC, GDPR, FedRAMP, PCI DSS and others |
| **Reports, Whitepapers, and Artifacts** | General documents: AI resources (compliance, security and privacy of AI solutions such as Microsoft Copilot), business continuity and disaster recovery, penetration test and security assessment reports by third parties, privacy and data protection, FAQ and whitepapers |
| **Industry and Regional Resources** | Documents by industry (financial services, healthcare and life sciences, media and entertainment, United States government) and by region |
| **Resources for your Organization** | Documents that apply to your organization, restricted by tenant according to its subscription and permissions |

Practical points:

- **Access**: the site is public, but some resources require you to sign in with your Microsoft cloud services account (a Microsoft Entra organization account) and to accept the Microsoft non-disclosure agreement for compliance materials.
- **My Library**: you save documents in one place with **Save to library**, and **Notification Settings** sends an email when a saved document is updated.
- **All Documents** lists every available document, with a filter by cloud service; **My Download History** shows the documents downloaded in the last 18 months.

| Requirement | Answer |
| --- | --- |
| Download the SOC 2 or ISO 27001 audit report of a Microsoft cloud service | Service Trust Portal |
| Read the result of a third-party penetration test of Microsoft cloud services | Service Trust Portal |
| Be notified when a compliance document is updated | My Library in the Service Trust Portal |
| Measure the progress of your own organization toward a regulation | Compliance Manager, in the Microsoft Purview portal |

> **Exam trap.** The Service Trust Portal documents the compliance of **Microsoft** and of its services. It does not assess **your** tenant: that is Compliance Manager. Neither one is a security monitoring tool.

<!-- section: privacy-principles | objectives: 4.1.2 -->
## Privacy principles of Microsoft

Microsoft's approach to privacy rests on a commitment to give you control over the data you put in the cloud, guaranteed by contractual commitments. It is stated in four principles:

| Principle | What it promises |
| --- | --- |
| **You control your data** | Your data belongs to you: you can access, modify or delete it at any time. Microsoft uses it only to provide the services you have chosen, and does not share it with advertiser-supported services or mine it for marketing or advertising |
| **Know where your data is located** | You can determine where your data is stored: Microsoft offers data residency options around the world and is transparent about how data is stored and processed |
| **Your data is secured at rest and in transit** | Microsoft encrypts data at rest (up to AES-256) and in transit (with protocols such as TLS and IPsec); services such as Azure Key Vault give you control over keys and secrets |
| **Microsoft defends your data** | Microsoft does not give any government direct or unfettered access to customer data. Its position is that government requests for your data should be directed to you, and it challenges such requests in court where it lawfully can |

Details worth knowing:

- Under **You control your data**: subcontractors that need access to your data can perform only the functions they were engaged for, and are bound by the same contractual privacy commitments; authorized subprocessors are audited in advance.
- If a government or a law enforcement agency requests your data, Microsoft does not disclose it except as you direct or where the law requires it, and, where legally permitted, promptly notifies you, provides a copy of the request and directs the requesting party to you.

> **Exam tip.** Statements such as "Microsoft uses customer data for advertising" or "Microsoft gives governments direct access to customer data" are always false. "The customer owns and controls its data" is always true.

<!-- section: key-points -->
## Key points

- Service Trust Portal: Microsoft's public site for audit reports by external auditors, whitepapers, penetration test reports and compliance guidance about Microsoft cloud services.
- Four categories: Certifications, Regulations, and Standards; Reports, Whitepapers, and Artifacts; Industry and Regional Resources; Resources for your Organization.
- Some documents require signing in with a Microsoft Entra organization account; My Library saves documents and notifies you of updates.
- The portal is about Microsoft's compliance; Compliance Manager is about yours.
- Privacy principles: you control your data; you know where it is located; it is secured at rest and in transit; Microsoft defends it.
- Microsoft does not use customer data for advertising and gives no government direct access to it.
