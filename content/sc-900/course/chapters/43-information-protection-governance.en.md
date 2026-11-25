Protecting data follows a logic: know what you have, label it, prevent it from leaking, then keep it or delete it according to the rules. Microsoft Purview has a tool for each step, and the exam insists on look-alikes: sensitivity label or retention label, policy or label.

<!-- section: data-classification | objectives: 4.3.1 -->
## Data classification capabilities

Classification identifies sensitive content so that labels, DLP and retention can act on it. Purview has two kinds of classifiers.

| Classifier | How it recognizes content | Example |
| --- | --- | --- |
| **Sensitive information types (SITs)** | By **pattern**: a regular expression or a keyword list, with supporting evidence nearby and a confidence level | Credit card numbers, social security numbers, bank account numbers |
| **Trainable classifiers** | By **what the content is**, using machine learning trained on examples | Contracts, invoices, resumes, harassment |

- Sensitive information types are **built-in**, **named entity** (person names, physical addresses, medical terms), **custom** (your employee IDs) or **exact data match (EDM)**, which looks for exact values taken from a database of your sensitive data.
- Trainable classifiers are **pre-trained** by Microsoft and ready to use, or **custom**: you supply samples of the content to recognize. Custom classifiers support English content only.

> **Exam tip.** A fixed format such as a number: sensitive information type. A category of document that no pattern describes: trainable classifier.

<!-- section: explorers | objectives: 4.3.2 -->
## Content explorer and Activity explorer

Both tools are under **Information Protection** in the Microsoft Purview portal, in the **Explorers** section.

| | Content explorer | Activity explorer |
| --- | --- | --- |
| Question answered | **What** sensitive data do we have, and **where**? | **What is done** with labeled content? |
| Shows | A current snapshot of the items that have a sensitivity label, a retention label or a sensitive information type, in Exchange, SharePoint, OneDrive and Teams | The history of activities, up to 30 days: label applied, changed or downgraded, file copied to removable media or to a network share, file printed, DLP policy matched |
| Benefit | See how much sensitive data exists and where, down to the item itself | Check that the controls in place are effective |
| Access | Highly restricted, because it can show the content of files: specific role groups (Content Explorer List viewer, Content Explorer Content viewer) | The data comes from the Microsoft 365 audit log |

Under Explorers, **Data explorer** is now the main, consolidated view of these items; **Content explorer (classic)** remains available with its older, location-based interface.

<!-- section: sensitivity-labels | objectives: 4.3.3 -->
## Sensitivity labels and label policies

A **sensitivity label** is a tag applied to content to classify it and, optionally, to protect it. An item has only one sensitivity label at a time. A label is:

- **Customizable**: you create the categories you need, such as Public, General, Confidential, Highly Confidential.
- **Clear text**: stored in the metadata of the file or email, so other apps and services can read it.
- **Persistent**: it travels with the content, wherever it is saved or sent.

| A label can | Detail |
| --- | --- |
| **Encrypt** | Emails, meeting invites and documents: only the users or groups you choose can open them |
| **Mark the content** | Headers, footers and watermarks in Office apps |
| **Protect containers** | Control the privacy and the external sharing of Teams, Microsoft 365 Groups and SharePoint sites |
| **Be applied automatically** | In Office apps, applied or recommended when sensitive information types or trainable classifiers are detected (the user can reject the label); an auto-labeling policy labels content already in SharePoint, OneDrive or Exchange, with no recommendation |
| **Classify only** | No protection at all, just a tag for reporting |

Labels do nothing until they are published. A **sensitivity label policy** publishes labels to chosen users and groups, and can also:

- apply a **default label** to new documents and emails;
- **require a justification** to remove a label or to replace it with a lower one;
- make labeling **mandatory** before saving a document or sending an email;
- give a link to a custom **help page**.

<!-- section: dlp | objectives: 4.3.4 -->
## Data loss prevention

**Data loss prevention (DLP)** prevents users from sharing sensitive data inappropriately. **DLP policies** identify, monitor and automatically protect sensitive items across:

- Microsoft 365 services: Exchange, SharePoint, OneDrive, Teams chat and channel messages;
- Office apps: Word, Excel, PowerPoint;
- devices running Windows or macOS (**endpoint DLP**: copy to a USB drive or a network share, print);
- on-premises file shares and on-premises SharePoint, Microsoft Fabric and Power BI, non-Microsoft cloud apps.

DLP detects content by deep content analysis, not by a simple text scan. When a condition is met, a policy can show a **policy tip** that warns the user, **block** the sharing with or without the possibility to override with a justification, or move a file at rest to quarantine. In Teams, the sensitive message is not displayed to the recipients.

<!-- section: retention | objectives: 4.3.6 -->
## Retention policies, retention labels and retention label policies

**Data lifecycle management** keeps what you must keep and deletes what you no longer need. Retention settings have three outcomes: **retain only**, **delete only**, or **retain and then delete**. Retained content stays in place; if a user edits or deletes it, a copy is kept in a secure location.

| | Retention policy | Retention label |
| --- | --- | --- |
| Level | Container: site, mailbox, Teams chats | Item: document, email, folder |
| Settings | The same for all content in the location | Different from one item to another |
| When content moves | Settings do not travel with it | Settings travel with it inside the Microsoft 365 tenant |
| How many | Several policies can apply to the same content | One retention label at a time per item |
| Only here | Teams and Viva Engage messages | Start retention on an event, disposition review, mark as a record |

A **retention label policy** makes labels usable: it **publishes** them to locations so that users can apply them, or **auto-applies** a label when a condition is met. If several settings conflict, **retention wins over deletion** and the longest retention period wins.

> **Exam trap.** **Sensitivity label**: how confidential the content is; it can encrypt and it persists outside Microsoft 365. **Retention label**: how long the content is kept. A document can have one of each.

<!-- section: records-management | objectives: 4.3.5 -->
## Records management

**Records management** adds control for high-value items that have legal, regulatory or business-critical importance. An item becomes a **record** through a retention label that marks it as a record. Then:

- **restrictions** block certain actions, such as deleting the item or editing a locked record;
- activities on the item are **logged**;
- **proof of disposition** is kept when the item is deleted at the end of its retention period.

A **regulatory record** is stricter: once the label is applied, **nobody, not even a global administrator, can remove it**, and the retention period cannot be shortened.

Other capabilities: a **file plan** to manage all retention labels in one place, **event-based retention** (the period starts when an event occurs, such as an employee leaving) and **disposition review** (a reviewer approves the deletion or extends the retention).

<!-- section: key-points -->
## Key points

- Sensitive information types match patterns; trainable classifiers recognize categories of content by machine learning.
- Content explorer: what sensitive items exist and where (restricted access). Activity explorer: what users do with labeled content.
- Sensitivity labels classify and protect (encryption, markings, containers); a label policy publishes them.
- DLP policies identify, monitor and protect sensitive items in Microsoft 365, Office apps and devices: policy tips and blocking.
- Retention policy: container level. Retention label: item level. Retention label policies publish or auto-apply labels.
- Records management: retention labels declare records; a regulatory record's label can never be removed.
