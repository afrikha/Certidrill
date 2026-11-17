AZ-802 checks that you can administer Windows Server wherever it runs: on physical hosts and Hyper-V, in Azure virtual machines, and on premises through Azure Arc. It covers Active Directory Domain Services, hybrid management, virtual machines, networking, storage and file services, security, and troubleshooting. This course follows the official study guide objective by objective; each section names the objectives it prepares.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Exam | AZ-802: Administering Windows Server. It replaces AZ-800 and AZ-801, retired on September 30, 2026 |
| Certification | Microsoft Certified: Windows Server Administrator Associate (intermediate level) |
| Duration | 120 minutes, the time Microsoft gives to associate exams that may contain interactive components |
| Questions | Not published; about 45 to 58 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Language | English. If the exam isn't offered in your language, you can request 30 extra minutes |
| Documentation | Microsoft Learn can be opened during the exam, on the same clock |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |

The seven domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Deploy and manage AD DS | 20 to 25 % |
| Manage Windows Server instances and workloads in a hybrid environment | 10 to 15 % |
| Manage virtual machines | 10 to 15 % |
| Implement and manage an on-premises and hybrid networking infrastructure | 10 to 15 % |
| Manage storage and file services | 15 to 20 % |
| Secure Windows Server infrastructure | 10 to 15 % |
| Monitor and troubleshoot Windows Server environments | 15 to 20 % |

AD DS is the heaviest domain, and it comes back in security (protected users, delegation, password policies) and in troubleshooting (replication, recovery, Kerberos). Expect roughly a third of the exam to involve Active Directory.

The score is scaled: 700 doesn't mean 70 % of the questions. Questions made of several elements (drop-down lists, Yes/No statements, drag and drop, ordered steps) give one point per correct element.

An exam is made of sections:

- **Case study.** One company scenario in tabs (forests and sites, Hyper-V hosts, file servers, an Azure subscription, requirements) followed by several questions from different domains. Once you leave the case study, you can't come back to it.
- **Yes/No series.** The same scenario is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final. Several solutions can be right, or none.
- **Main section.** Independent questions that you can flag and review until you submit: one answer among four, "select two", three Yes/No statements about an exhibit, drop-down lists that complete a PowerShell command, drag and drop (tool to task, role to scope), and steps to put in order.

> **Exam tip.** Microsoft Learn is available, but the timer keeps running. Use it to check one precise fact (a cmdlet parameter, the Windows Server version that introduced a feature), never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a question

Stems are short to medium: two to five sentences that name the servers (DC1, Server1, VM1), the domains and sites, and the exact symptom or goal. The question then asks what to do, what to use, or what to run first.

Work in three steps:

1. Locate everything: which forest and domain, which site, on premises or in Azure, which Windows Server version.
2. Identify the constraint that decides: "least privilege", "minimize administrative effort", "without restarting", "the first step", "must remain available if the WAN link fails".
3. Eliminate the answers that would work in another context (another scope, another product family, another version).

| Words in the stem | Think of |
| --- | --- |
| "branch office", "physical security can't be guaranteed" | Read-only domain controller (RODC), with a password replication policy |
| "the domain controller that holds the role failed and won't return" | Seize the role, then clean up metadata; never bring the old holder back |
| "users can't create objects", "RID pool" | RID master availability |
| "time is wrong across the forest" | PDC emulator of the forest root domain |
| "users from the other forest must access only Server1" | Forest trust with selective authentication |
| "service runs on several servers", "no password management" | Group managed service account (gMSA) |
| "different password rules for one group of users" | Fine-grained password policy, not a GPO on an OU |
| "least privilege", "delegate" | The narrowest built-in group or a delegated permission on an OU, never Domain Admins |
| "minimize administrative effort" | The built-in or managed feature (gMSA, Azure Update Manager, Windows Admin Center) rather than scripts |
| "first", "before you" | An order of operations: prerequisites (KDS root key, functional level, adprep) come before the action |

Commands are mostly read, sometimes completed with a drop-down list. Know the cmdlet nouns and the key parameters (`Move-ADDirectoryServerOperationMasterRole -Force`, `New-ADServiceAccount -PrincipalsAllowedToRetrieveManagedPassword`, `Install-ADDSDomainController -ReadOnlyReplica`) and the classic tools: `repadmin`, `dcdiag`, `ntdsutil`, `netdom`, `w32tm`, `nltest`, `manage-bde`.

<!-- section: core-rules -->
## Rules that decide many answers

These rules come back in every domain. Each one is detailed in its chapter.

1. **Scope first.** Schema master and domain naming master are one per forest; PDC emulator, RID master and infrastructure master are one per domain. Enterprise Admins acts on the forest, Domain Admins on one domain.
2. **Transfer when the holder is online, seize only when it's gone for good.** A seized former role holder must never return to the network as it was.
3. **A trust is a direction of authentication.** The trusting domain holds the resources; the trusted domain holds the accounts. Access flows opposite to the trust.
4. **Sites follow subnets.** A computer's site is decided by its IP address and the subnet objects; site links, their cost and their schedule shape replication between sites.
5. **Group scopes nest in one direction**: accounts go into global groups, global groups into universal or domain local groups, and permissions go to domain local groups.
6. **Least privilege and the narrowest scope win** over a broad role that would also work.
7. **Version matters.** Windows Server 2025 introduced features that older versions lack (for example the delegated managed service account); when a stem names versions, check them against the feature.

> **Exam trap.** An answer is rarely wrong in itself: it is wrong for the scope (forest or domain), the location (on premises, Azure VM, Azure Arc) or the version. Before you answer, name the three.

<!-- section: confusing-pairs -->
## Features that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| RODC | Writable domain controller | An RODC holds a read-only copy of the directory, replicates inbound only and caches only the passwords its policy allows |
| Transfer a FSMO role | Seize a FSMO role | A transfer synchronizes with the current holder first; a seizure takes the role without it, when the holder is gone |
| gMSA | Standalone managed service account (sMSA) | A gMSA can be used by several servers; an sMSA by one computer only |
| gMSA | Delegated managed service account (dMSA) | A dMSA (Windows Server 2025) replaces an existing service account and binds its use to machine identities |
| Forest trust | External trust | A forest trust links two forest root domains and is transitive; an external trust links two domains and isn't |
| Fine-grained password policy | Default Domain Policy | The domain policy applies to every account of the domain; a fine-grained policy applies to chosen users or groups |
| DSRM restore | AD Recycle Bin | The Recycle Bin restores deleted objects online with their attributes; DSRM restores the database from a backup |
| JEA | CredSSP or Kerberos delegation | JEA restricts what a remote session can do; CredSSP and delegation solve the second hop of credentials |
| DFS Namespaces | DFS Replication | Namespaces give one path to shared folders; Replication keeps folder contents identical on several servers |
| Azure File Sync | Storage Replica | File Sync caches an Azure file share on Windows file servers; Storage Replica replicates volumes block by block between servers |
| Storage Spaces | Storage Spaces Direct | Storage Spaces pools the disks of one server; Storage Spaces Direct pools the local disks of the nodes of a failover cluster |
| Standard checkpoint | Production checkpoint | A production checkpoint uses backup technology in the guest and is supported for production workloads; a standard checkpoint captures memory state too |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: AD DS comes first because security, Group Policy and troubleshooting depend on it.
2. Build a lab: two Windows Server 2025 virtual machines on Hyper-V (or in Azure), one forest with two domain controllers, a second site, then an RODC and a second forest with a trust. An Azure subscription adds Azure Arc, Azure Update Manager and Azure File Sync.
3. Do each task twice, once in the console and once in PowerShell, and read the output of `repadmin /replsummary`, `dcdiag` and `netdom query fsmo` until you can predict it.
4. After each domain, take a mock exam, read every explanation, and reread the sections linked to your mistakes.
5. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
