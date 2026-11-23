A container that runs in your cluster is the end product of a chain: source code, dependencies, a build system, a registry and a deployment pipeline. An attacker who compromises any link ships code into production without touching the cluster's own defenses. The KCSA exam expects you to name the stages, the threat at each one, and the projects that prove where an artifact came from: Sigstore, in-toto, SBOM formats and SLSA.

<!-- section: supply-chain-stages | objectives: 5.1.1 -->
## Stages of the software supply chain

| Stage | What happens | Typical threats | Controls |
| --- | --- | --- | --- |
| **Source** | Developers commit code; third-party dependencies are declared | Stolen developer credentials, unreviewed commit, malicious or typosquatted dependency, compromised upstream library | Branch protection, mandatory review, signed commits, dependency pinning and scanning |
| **Build** | CI compiles, tests and packages the image | Compromised build server or runner, build script that injects code, build from a source other than the reviewed one, leaked pipeline secrets | Isolated and ephemeral builders, provenance generation, least-privilege pipeline credentials |
| **Artifacts** | Images, charts and binaries are stored in a registry | Image replaced or retagged, unsigned image, image with known vulnerabilities | Signing, scanning, immutable tags, references by digest |
| **Deployment** | Manifests are applied to the cluster | Deployment of an unverified or unapproved image, tampered manifests, over-privileged deployment credentials | Admission policies that verify signatures and registries, GitOps with reviewed manifests |

The CNCF Cloud Native Security Whitepaper groups the same ideas into lifecycle phases: **Develop**, **Distribute** (build, registry, signing), **Deploy** and **Runtime**. Supply chain controls belong mainly to Develop and Distribute, with verification at Deploy.

**SLSA** (Supply-chain Levels for Software Artifacts) is the framework that grades how trustworthy a build is. Its Build track defines levels:

| SLSA Build level | Requirement |
| --- | --- |
| L0 | No guarantees |
| L1 | Provenance exists and is distributed with the artifact |
| L2 | Builds run on a hosted build platform that **signs** the provenance |
| L3 | Hardened build platform: builds cannot influence each other, and signing secrets are out of reach of the user-defined build steps |

The current SLSA specification (v1.2) also has a Source track for the source control stage. **Provenance** is the metadata that states which entity built an artifact, with which process and from which inputs.

> **Exam trap.** Vulnerability scanning and supply chain integrity are different questions. A scan tells you whether an image contains known vulnerable packages; a signature and provenance tell you who produced the image and how. A clean scan does not prove the image is the one your pipeline built.

<!-- section: signing-attestations | objectives: 5.1.2 -->
## Signing and attestations: Sigstore and in-toto

**Sigstore** is an open project for signing and verifying software artifacts. Its three main components:

| Component | Role |
| --- | --- |
| **Cosign** | The client that signs and verifies container images and other artifacts, and attaches attestations to them in the registry |
| **Fulcio** | A code-signing certificate authority that issues **short-lived certificates** bound to an OIDC identity (a developer's account or a CI workload identity) |
| **Rekor** | A **transparency log** that records each signing event so anyone can audit it |

In **keyless signing**, the signer generates a temporary key pair, proves its identity with an OIDC token, receives a short-lived certificate from Fulcio, signs the artifact digest, records the event in Rekor, and discards the private key. There is no long-lived signing key to steal or rotate. Verification checks that the signature is valid for the certificate, that the certificate identity (and issuer) is the one expected, that it chains to Sigstore's root of trust, and that Rekor holds the signing record.

```bash
cosign sign registry.example.com/shop/web@sha256:3f1c...
cosign verify registry.example.com/shop/web@sha256:3f1c... \
  --certificate-identity=https://ci.example.com/shop/web/build \
  --certificate-oidc-issuer=https://ci.example.com
```

A signature says "this identity approved this exact digest". An **attestation** is a signed statement about the artifact: its provenance, its SBOM, its test or scan results. **in-toto**, a CNCF graduated project, is the framework and metadata standard for this: it records which steps of the supply chain were performed, by whom, and in what order, so a consumer can verify the whole chain. in-toto attestations (a subject identified by digest, plus a typed predicate such as SLSA provenance) are what cosign attaches with `cosign attest` and checks with `cosign verify-attestation`.

Verification happens twice: in the pipeline before promotion, and in the cluster at admission time, with a policy engine (Kyverno image verification, OPA Gatekeeper with an external data provider, or the Sigstore policy-controller) that rejects Pods whose images are not signed by an approved identity.

> **Exam tip.** Fulcio issues certificates, Rekor logs, cosign signs and verifies. If a question mentions "short-lived certificate tied to an OIDC identity", the answer is Fulcio; "tamper-evident public record of signatures" is Rekor.

<!-- section: sbom | objectives: 5.1.3 -->
## Software bills of materials

A **software bill of materials (SBOM)** is a machine-readable inventory of the components inside an artifact: packages, libraries, versions, licenses and their relationships. It does not fix anything by itself; it lets you answer quickly "which of our images contain the vulnerable library?" when a new CVE is published, and check license compliance.

| Format | Maintained by | Notes |
| --- | --- | --- |
| **SPDX** | The Linux Foundation | Software Package Data Exchange; an ISO/IEC standard (ISO/IEC 5962:2021); strong focus on licensing as well as components |
| **CycloneDX** | OWASP | Security-oriented; also describes services, vulnerabilities (VEX) and other bills of materials |

How SBOMs are used in a cloud native pipeline:

1. Generate the SBOM at build time, from the image or the source (tools such as Syft or Trivy).
2. Attach it to the image as a signed attestation, so it cannot be swapped.
3. Scan the SBOM continuously against new vulnerability data instead of rescanning every image.
4. Enforce policy: require an SBOM attestation at admission, or block images that contain banned components.

> **Exam trap.** An SBOM is an inventory, not a vulnerability report and not a signature. SPDX and CycloneDX are formats; Syft and Trivy are tools that produce them; cosign signs them.

<!-- section: cicd-pipelines | objectives: 5.1.4 -->
## Securing CI/CD pipelines

The build system is a high-value target: it holds credentials to the registry and often to the clusters, and it produces what runs in production.

| Practice | Why |
| --- | --- |
| **Ephemeral, isolated build environments** (a fresh runner or Pod per job, destroyed afterwards) | A compromised build cannot persist or influence the next one; this is a SLSA Build L3 requirement |
| Separate runners for untrusted code (pull requests from forks) | Prevents untrusted code from reaching production credentials |
| **Short-lived, scoped pipeline credentials** (OIDC workload identity federation instead of static keys), stored in the CI secret store, never in the repository or the image | A leaked token expires quickly and only grants what the job needs |
| Protected branches and required reviews on pipeline definitions | The pipeline file is code that runs with privileges |
| Pin build tools and base images by digest | Avoids silently pulling a changed dependency |
| Generate provenance and sign artifacts in the pipeline | Downstream consumers can verify origin |

**GitOps** changes the direction of deployment. Instead of a CI pipeline pushing to the cluster with cluster-admin credentials, an agent running **inside** the cluster (Argo CD or Flux) **pulls** the desired state from a Git repository and reconciles it.

| Push-based CD | GitOps (pull-based) |
| --- | --- |
| CI holds credentials to every cluster | Cluster credentials never leave the cluster |
| Changes can bypass review | Every change is a reviewed commit, with history and easy rollback |
| Drift goes unnoticed | The agent detects and corrects drift from Git |

GitOps moves the trust to the Git repository, so the repository needs branch protection, required reviews, and ideally signed commits; the GitOps agent's own RBAC should be limited to the namespaces it manages.

<!-- section: key-points -->
## Key points

- Stages: source, build, artifacts, deployment; each needs its own controls.
- SLSA Build levels L0 to L3: provenance exists, signed by a hosted platform, hardened isolated builds. Provenance = who built it, how, from what.
- Sigstore: cosign signs and verifies, Fulcio issues short-lived identity certificates, Rekor is the transparency log; keyless signing has no long-lived key.
- in-toto (CNCF graduated) describes and verifies supply chain steps; attestations are signed statements about an artifact.
- SBOM formats: SPDX (Linux Foundation, ISO/IEC) and CycloneDX (OWASP); an SBOM is an inventory.
- CI/CD: ephemeral isolated builders, short-lived scoped credentials, reviewed pipeline code; GitOps pulls from Git and keeps cluster credentials inside the cluster.
