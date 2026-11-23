Supply chain compliance is about proof: proof of where an artifact came from, how it was built and what it contains, in a form a machine can check before the artifact runs. Customers and regulators increasingly ask software producers for that proof. This chapter covers the SLSA framework and its build levels, SBOMs and attestations and their verification at deployment time, and the CNCF Software Supply Chain Best Practices paper that ties the practices together.

<!-- section: slsa | objectives: 6.3.1 -->
## SLSA build levels and provenance

**SLSA** (Supply-chain Levels for Software Artifacts, pronounced "salsa") is a specification maintained under the OpenSSF of the Linux Foundation. It defines incremental levels of assurance, grouped into **tracks**. Version 1.2 is current; it defines a **Build track** and a **Source track** (protection of the source repository and its history). The Build track is the one the exam focuses on:

| Level | Name | Requirements | Protects against |
| --- | --- | --- | --- |
| **Build L0** | No guarantees | None: the absence of SLSA | Nothing |
| **Build L1** | Provenance exists | A consistent build process; the build platform generates provenance automatically and it is distributed to consumers | Mistakes and documentation gaps (for example a release built from a commit that is not in the repository). Provenance is easy to forge or bypass |
| **Build L2** | Hosted build platform | Builds run on a hosted platform that generates **and signs** the provenance; consumers verify its authenticity | Tampering **after** the build (a modified artifact no longer matches the signed provenance) |
| **Build L3** | Hardened builds | A hardened platform: runs cannot influence each other, even in the same project, and the signing secrets are not accessible to user-defined build steps | Tampering **during** the build, by insiders, with compromised credentials or by other tenants |

**Provenance** is verifiable information about how an artifact was produced: which platform built it (the builder identity), from which source and parameters, with which resolved dependencies. SLSA recommends expressing it as an **in-toto attestation** with the predicate type `https://slsa.dev/provenance/v1`. Its main fields:

| Field | Content |
| --- | --- |
| `subject` | The artifacts produced, identified by name and digest |
| `buildDefinition.buildType` | The template of the build |
| `buildDefinition.externalParameters` | The inputs controlled by the user (repository, ref, workflow); consumers must check them |
| `buildDefinition.resolvedDependencies` | Source and dependencies fetched during the build, with their digests |
| `runDetails.builder.id` | The identity of the trusted build platform, the main factor that determines the SLSA level |

To verify, the consumer checks the signature of the provenance, that the builder is one it trusts, that the subject digest matches the artifact, and that the external parameters (the expected repository and branch) match its policy.

> **Exam trap.** Signed provenance starts at **Build L2**, not L1: L1 only requires that provenance exists. And SLSA levels describe the build's resistance to tampering; they say nothing about vulnerabilities in the code. A Build L3 artifact can still contain a vulnerable dependency, which is why SBOMs and scanning remain necessary.

<!-- section: sbom-attestations | objectives: 6.3.2 -->
## SBOMs, attestations and verification at deployment

A **software bill of materials (SBOM)** is the list of components of an artifact (packages, libraries and their versions, suppliers, licenses, dependency relationships). Two standard formats dominate: **SPDX**, a Linux Foundation project and an ISO/IEC standard, and **CycloneDX**, an OWASP project. An SBOM lets you answer "are we affected?" in minutes when a new vulnerability is published, and it is increasingly requested by customers and in public procurement. Its companion, **VEX** (Vulnerability Exploitability eXchange), states whether a product is affected by a given vulnerability (not affected, affected, fixed, under investigation), which removes false positives from scanner results.

An **attestation** is a signed statement about an artifact. The in-toto attestation format has three layers:

- a **subject**: the artifact, identified by its digest;
- a **predicate type** and **predicate**: what is claimed (SLSA provenance, an SBOM, a vulnerability scan result, test results);
- a signed **envelope** (DSSE) that binds the statement to an identity.

With Sigstore's cosign, an SBOM or a provenance document becomes an attestation attached to the image in the registry, and can be verified with keyless signing (an OIDC identity and issuer) or a key:

```bash
cosign attest --type cyclonedx --predicate sbom.cdx.json \
  registry.example.com/shop/cart@sha256:4b1c...
cosign verify-attestation --type cyclonedx \
  --certificate-identity https://github.com/example-corp/cart/.github/workflows/release.yaml@refs/heads/main \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  registry.example.com/shop/cart@sha256:4b1c...
```

**Verification at deployment time** turns these documents into a control. An admission controller checks every Pod's images before they run:

| Tool | How it verifies |
| --- | --- |
| **Kyverno** | Image verification policies (`ImageValidatingPolicy`, or `verifyImages` rules in older policies): cosign or Notary signatures, in-toto attestations and SBOMs attached as OCI referrers, with conditions on their content |
| **Sigstore policy-controller** | `ClusterImagePolicy` resources: signatures and attestations from given authorities, with CUE or Rego policies on the predicate; enforced on namespaces labelled `policy.sigstore.dev/include: "true"` |
| **OPA Gatekeeper** | Constraints, with an external data provider for signature verification |

Typical deployment requirements: the image is referenced by **digest**; it is signed by the release pipeline's identity; a SLSA provenance attestation shows the expected repository and builder; an SBOM attestation exists; a vulnerability scan attestation shows no critical findings. Keeping the attestations in the registry next to the image also provides audit evidence for compliance.

> **Exam trap.** An SBOM by itself proves nothing about integrity: it is a list. What makes it trustworthy is a **signed attestation** bound to the image **digest**, verified at admission. And a signature on an image proves who signed it, not that the image is free of vulnerabilities.

<!-- section: cncf-best-practices | objectives: 6.3.3 -->
## CNCF Software Supply Chain Best Practices

The CNCF Security Technical Advisory Group (TAG Security) published the **Software Supply Chain Best Practices** paper in May 2021 and a **version 2** in November 2024. Version 1 was built on four principles: **trust** (every step verifiable through cryptographic attestation), **automation** (fewer human errors and less configuration drift), **clarity** (clearly defined build environments with limited scope) and **mutual authentication** (every entity authenticates with hardened mechanisms and regular key rotation). Version 2 adds personas (developer, producer's security team, operations and platform teams, consumer and verifier) and updates the recommendations now that attestations and SBOMs have mature tooling.

The paper organises its recommendations by stage of the supply chain:

| Stage | Main recommendations |
| --- | --- |
| **Source code** | Signed commits, enforced code review, branch protection, strong authentication of contributors |
| **Materials** (dependencies) | Assess and track third-party components, verify checksums and signatures, require SBOMs and VEX from suppliers |
| **Build pipelines** | Single-use (ephemeral) and isolated build workers, network access limited to trusted sources, pipeline configuration as code, attestations for each build step, reproducible builds compared across independent builders, short-lived credentials |
| **Artifacts** | Sign artifacts and their metadata, record provenance with in-toto, evaluate metadata against policy, plan key rotation and revocation, as compromise is a matter of "when, not if" |
| **Deployments and distribution** | Verify supply chain metadata at deployment (for example with a Kubernetes admission controller), use The Update Framework (TUF) for secure distribution and freshness, sign SBOMs and use them for continuous vulnerability scanning |

The paper is a guide, not a certification: it recommends aiming for higher SLSA levels and adopting the practices incrementally, according to each organisation's threat model.

> **Exam tip.** Match the stage to the control: signed commits and review protect **source**; ephemeral, isolated builders protect the **build**; signing and provenance protect **artifacts**; admission-time verification protects **deployment**.

<!-- section: key-points -->
## Key points

- SLSA v1.2: Build and Source tracks. Build L1 provenance exists, L2 hosted platform with signed provenance (protects after the build), L3 hardened isolated builds (protects during the build).
- SLSA provenance: an in-toto attestation, predicate type `https://slsa.dev/provenance/v1`, with the builder identity, the parameters, the resolved dependencies and the subject digest.
- SBOM formats: SPDX and CycloneDX; VEX states exploitability. An attestation binds a predicate to an artifact digest and a signer.
- Verify signatures, provenance and SBOM attestations at admission with Kyverno, Sigstore policy-controller or Gatekeeper; reference images by digest.
- CNCF Software Supply Chain Best Practices (TAG Security, v1 2021, v2 2024): source, materials, build pipelines, artifacts, deployments.
