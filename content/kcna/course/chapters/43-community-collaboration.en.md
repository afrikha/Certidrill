Kubernetes and the tools around it are built in the open by thousands of contributors from competing companies. This works because of neutral foundations, clear governance and documented processes. This chapter covers how the CNCF is governed, what its project maturity levels mean, how the Kubernetes project itself is organized, the roles that work with cloud native technology, and how people collaborate and contribute.

<!-- section: cncf-governance | objectives: 4.3.1 -->
## The CNCF and its governance

The **Cloud Native Computing Foundation (CNCF)** is part of the nonprofit **Linux Foundation**. Its mission is to make cloud native computing ubiquitous by fostering an ecosystem of open source, **vendor-neutral** projects. Kubernetes was its first hosted project and Prometheus the second. The foundation holds the projects' trademarks and provides services (events such as KubeCon + CloudNativeCon, infrastructure, security audits, certification programs) while the projects keep their own technical governance.

| Body | Role |
| --- | --- |
| **Governing Board (GB)** | Business side: marketing, budget, business oversight; sets the scope of the CNCF |
| **Technical Oversight Committee (TOC)** | Technical leadership: defines the technical vision, **admits projects**, oversees them and approves their moves between maturity levels; 11 voting members (6 appointed by the GB, 2 by the TOC, 2 by end users, 1 by maintainers), two-year terms |
| **Technical Advisory Groups (TAGs)** | Groups under the TOC that bring expertise to an area and help projects; current TAGs: Developer Experience, Infrastructure, Operational Resilience, Security and Compliance, Workloads Foundation |
| **End User community** and **End User Technical Advisory Board (TAB)** | Companies that use cloud native technology without selling it; the End User TAB represents end users in community decisions |

> **Exam trap.** The TOC makes **technical** decisions (which projects join, their maturity level); the Governing Board handles **business and budget**. Neither manages the day-to-day development of a project, which belongs to the project's maintainers.

<!-- section: maturity-levels | objectives: 4.3.2 -->
## CNCF project maturity levels

Every CNCF project has a maturity level that signals what kind of organization should adopt it. Moves between levels are decided by the TOC after due diligence.

| Level | Signal | Typical requirements |
| --- | --- | --- |
| **Sandbox** | Entry point for early-stage, **experimental** projects not yet widely tested in production | Follows CNCF legal, IP and code of conduct policies |
| **Incubating** | Used successfully in production by a number of users, with a healthy pool of contributors | Documented adopters, growing contributor base, governance |
| **Graduated** | **Stable, widely adopted, production ready** | Maintainers from at least two organizations, OpenSSF Best Practices passing badge, a third-party security review, documented governance and adopters |

Projects that reach the end of their lifecycle and become inactive are **archived** (for example rkt, Service Mesh Interface and OpenTracing); the Linux Foundation still holds their trademarks.

| Example projects | Level |
| --- | --- |
| Kubernetes, Prometheus, etcd, containerd, CRI-O, CoreDNS, Envoy, Helm, Argo, Flux, Istio, Linkerd, Cilium, OpenTelemetry, Jaeger, Fluentd, KEDA, Knative, Falco, OPA, Kyverno, Harbor | Graduated |
| CNI, OpenCost, Backstage, Thanos | Incubating |

> **Exam tip.** The maturity level describes adoption and sustainability, not code quality. "Experimental, early stage" = Sandbox; "production-ready and widely adopted" = Graduated.

<!-- section: kubernetes-organization | objectives: 4.3.3 -->
## How the Kubernetes project is organized

| Group | Role |
| --- | --- |
| **Steering Committee** | 7 elected members who oversee the governance of the whole project, delegate ownership to groups and are the last escalation point |
| **Special Interest Groups (SIGs)** | The main unit of organization: each SIG owns an area of the code and its subprojects, with chairs and tech leads, and meets in public (SIG Network, SIG Storage, SIG Node, SIG Apps, SIG Docs, SIG Release, SIG Architecture...) |
| **Subprojects** | Specific work efforts inside a SIG, for example Kustomize and kubectl in SIG CLI, Cluster Autoscaler and Karpenter in SIG Autoscaling |
| **Working Groups (WGs)** | Discussion forums for topics that cross SIG lines; they do not own code |
| **Committees** | Groups for sensitive topics that need discretion, such as the Code of Conduct Committee and the Security Response Committee; membership is not open |

**Kubernetes Enhancement Proposals (KEPs)** are how new features and other non-trivial changes are proposed, discussed and tracked. A KEP is sponsored by a SIG and stored in the `kubernetes/enhancements` repository; it describes the motivation, the design, and the criteria to move between stages.

**Feature stages**: **alpha** (may change or be dropped, disabled by default), **beta** (well tested; since v1.24 new beta APIs are not enabled by default), **stable** or GA (enabled, covered by the deprecation policy).

**Release cycle**: Kubernetes releases a new minor version about **three times a year**. A release team (SIG Release) runs each cycle, with an **enhancements freeze** about four weeks in and a **code freeze** a few weeks before the release. The project maintains the **three most recent minor releases** (for example 1.37, 1.36, 1.35), each with about one year of patch support. Versions are `x.y.z`: major, minor, patch.

> **Exam trap.** A SIG owns code and is long-lived; a working group is for cross-SIG topics and owns no code. A new Kubernetes feature starts with a KEP, not with a CNCF TOC vote.

<!-- section: personas | objectives: 4.3.4 -->
## Cloud native roles and personas

| Persona | Focus | Typical questions |
| --- | --- | --- |
| **Application developer** | Writes the application and its container image, defines how it runs (manifests, Helm chart), instruments it | "How do I package, configure and debug my service?" |
| **DevOps engineer** | DevOps is a methodology where teams own the whole process from development to production; builds CI/CD and automation | "How do changes get to production quickly and safely?" |
| **Site reliability engineer (SRE)** | Applies software engineering to operations: keeps services reliable once they run, with service level objectives, monitoring, incident response | "Is the service meeting its reliability targets?" |
| **Platform engineer** | Builds the internal platform (clusters, pipelines, golden paths, self-service tools) that developers consume | "What do developers need to ship without managing infrastructure?" |
| **Security engineer** | Secures the supply chain, clusters and workloads: policies, scanning, access control, runtime detection | "Who can do what, and what is running?" |
| **Cloud architect** | Designs the overall system: cloud and cluster topology, service boundaries, resilience, cost | "Which architecture meets the requirements?" |

> **Exam tip.** DevOps focuses on getting code to production; SRE on keeping it reliable once it runs; platform engineering on giving developers a self-service platform.

<!-- section: open-source-collaboration | objectives: 4.3.5 -->
## Open source collaboration

**Open governance** means decisions are made in public, by documented rules, by maintainers who can come from different companies, under a neutral foundation that owns the trademark. No single vendor can close or redirect the project, which is why users trust graduated projects.

**Contribution paths** are not only code:

| Path | Examples |
| --- | --- |
| Code | Fix an issue labelled `good first issue` or `help wanted`, write tests |
| Documentation | Improve or translate kubernetes.io (SIG Docs) |
| Community | Answer questions, triage issues, join SIG meetings, help organize events |
| Release | Shadow a role in the Kubernetes release team |
| Mentoring | Programs such as LFX Mentorship |

**Rules of collaboration in Kubernetes:**

- Every contributor signs the **CNCF Contributor License Agreement (CLA)** before the first pull request is accepted, and follows the **Code of Conduct**, enforced by the Code of Conduct Committee.
- **OWNERS files** name reviewers and approvers for each part of the code. A **reviewer** checks code quality and comments `/lgtm`; an **approver** gives holistic acceptance with `/approve`; automation (Prow) merges when both labels are present and tests pass.
- The contributor ladder goes from **member** to **reviewer**, **approver** and **subproject owner** as contributors gain experience and trust.
- Communication is public: issues, pull requests, mailing lists, recorded SIG meetings.

> **Exam trap.** `/lgtm` (looks good to me) is the reviewer's code review; `/approve` is the approver's acceptance from the OWNERS file. A pull request needs both before automation merges it.

<!-- section: key-points -->
## Key points

- CNCF: part of the Linux Foundation, vendor-neutral. Governing Board = business; TOC = technical vision and project admission; TAGs = expertise; End User TAB = voice of users.
- Maturity: Sandbox (experimental), Incubating (production use, growing), Graduated (stable, widely adopted, security review). Archived = inactive.
- Kubernetes: Steering Committee (7), SIGs own code, WGs cross SIGs, committees for sensitive topics; KEPs for enhancements; about three releases a year, three minor versions maintained.
- Personas: developer, DevOps, SRE, platform engineer, security engineer, architect.
- Collaboration: CLA, Code of Conduct, OWNERS files, `/lgtm` then `/approve`, contributor ladder, many non-code paths.
