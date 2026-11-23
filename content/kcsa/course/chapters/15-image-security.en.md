Every container starts from an image, so a vulnerable, tampered or leaked image compromises the workload before any Kubernetes control applies. This chapter covers how to build safer images, how to scan them, how to make sure the image that runs is the one you approved, and how to control who pulls from your registries.

<!-- section: secure-images | objectives: 1.5.1 -->
## Building secure images

| Practice | Why |
| --- | --- |
| **Minimal base image** (distroless, `scratch`, slim distributions) | Fewer packages means fewer vulnerabilities and fewer tools for an attacker; production images should not contain shells or debugging utilities |
| **Multi-stage build** | Compilers, package managers and build dependencies stay in the build stage; only the artifact is copied into the final image |
| **Non-root default user** | The image sets an unprivileged `USER` with a numeric ID, so the container doesn't run as root even when the Pod doesn't say otherwise, and `runAsNonRoot: true` can verify it |
| **No secrets in layers** | Every layer is kept in the image: a key copied in one step and deleted in the next is still readable in the earlier layer; pass credentials at build time with the builder's secret mounts and at run time with Kubernetes Secrets |
| **Pinned, maintained base images** | Reference the base image by digest and rebuild regularly to pick up fixes |
| **Minimal metadata exposure** | No credentials in environment variables or labels of the image; image configuration is readable by anyone who can pull it |

A multi-stage build that ends in a distroless image running as a non-root user:

```text
FROM golang:1.25 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
USER 65532:65532
ENTRYPOINT ["/api"]
```

> **Exam trap.** Deleting a secret file in a later Dockerfile instruction doesn't remove it from the image: the earlier layer still contains it. The fix is never to copy it in, not to delete it afterwards.

<!-- section: vulnerability-scanning | objectives: 1.5.2 -->
## Vulnerability scanning

A scanner reads the packages and libraries in an image and compares them with databases of known vulnerabilities (CVEs). Scan at several points:

| Where | What it achieves |
| --- | --- |
| **In the build pipeline** (for example Trivy) | Fail the build when vulnerabilities above an agreed severity have a fix available; catch them before the image is published |
| **In the registry**, on push and on a schedule (for example Harbor with its integrated scanner) | Every stored image has a current report; the registry can block pulls of images that exceed a severity threshold |
| **At admission** | A policy accepts only images that were scanned, signed or come from the approved registry |
| **At runtime**, on the images that are actually running | Find running workloads affected by a newly published vulnerability |

**Rescan continuously.** An image that was clean at build time becomes vulnerable when a new CVE is published, while its content hasn't changed. Rescan stored and running images on a schedule, and rebuild and redeploy when fixes are available.

Scanning finds known vulnerabilities; it doesn't remediate them, and it doesn't find unknown flaws or prove the image wasn't tampered with. Combine it with minimal images, signatures and runtime detection. A software bill of materials (SBOM) lists the components of an image, which lets you find quickly which images contain a newly vulnerable library.

> **Exam tip.** "An image scanned clean last month is now reported vulnerable without any change" is expected behavior: the vulnerability database changed, not the image. The answer is continuous rescanning and rebuilding.

<!-- section: digests-and-signing | objectives: 1.5.3 -->
## Digests, tags and signatures

A **tag** (`api:1.4.2`, `api:latest`) is a mutable pointer: whoever can push to the repository can move it to another image. A **digest** (`api@sha256:...`) is the hash of the image content and is immutable. When an image reference has both a tag and a digest, only the digest is used for pulling.

```yaml
containers:
- name: api
  image: registry.example.com/shop/api:1.4.2@sha256:3b1c6f0e9a7d4b2c8e5f1a0d9c7b6e4f2a1d0c9b8e7f6a5d4c3b2a1f0e9d8c7b
```

The image pull policy decides when the kubelet asks the runtime to pull:

| `imagePullPolicy` | Behavior | Default when omitted |
| --- | --- | --- |
| `Always` | Pull (resolve the reference against the registry) each time a container starts; cached layers are reused | Tag `:latest` or no tag |
| `IfNotPresent` | Pull only if the image isn't on the node | Any other tag, or a digest |
| `Never` | Never pull; the image must already be on the node | Never a default |

Avoid `:latest` in production and pin by digest, so that a change in the registry can't silently change what runs.

A digest proves the content didn't change, not who produced it. **Image signing** adds provenance: the build pipeline signs the image digest, and the cluster verifies the signature before running it. **cosign**, from the Sigstore project, signs and verifies container images; its keyless mode uses short-lived certificates tied to an OIDC identity and records signatures in a public transparency log. Kubernetes itself signs its release images and binaries with cosign keyless signing.

```bash
cosign verify registry.example.com/shop/api@sha256:3b1c6f0e9a7d4b2c8e5f1a0d9c7b6e4f2a1d0c9b8e7f6a5d4c3b2a1f0e9d8c7b \
  --certificate-identity ci@example.com \
  --certificate-oidc-issuer https://token.actions.example.com
```

Verification must happen **at deploy time**, in **admission control**: the Sigstore policy-controller, Kyverno's image verification rules or an equivalent admission webhook reject Pods whose images aren't signed by a trusted identity. The Kubernetes security checklist asks for references by sha256 digest, or signature validation at deploy time.

> **Exam trap.** `imagePullPolicy: Always` doesn't make a tag immutable or verify anything: it only re-resolves the tag, which an attacker who pushed a new image under that tag would happily serve. Digests pin content; signatures prove origin.

<!-- section: registry-access | objectives: 1.5.4 -->
## Controlling access to registries

Keep internal images in a **private registry** that requires authentication to pull and to push, with push rights limited to the build pipeline.

The kubelet authenticates to a private registry in one of these ways:

| Mechanism | How |
| --- | --- |
| **imagePullSecrets** in the Pod spec | A Secret of type `kubernetes.io/dockerconfigjson` (or `kubernetes.io/dockercfg`) in the Pod's namespace; the recommended way for private registries |
| **imagePullSecrets on the ServiceAccount** | Added automatically to every Pod that uses the ServiceAccount |
| **Kubelet credential provider plugin** | The kubelet runs a plugin that fetches short-lived registry credentials, for example from the cloud provider; configured on the node |

```bash
kubectl create secret docker-registry regcred -n shop \
  --docker-server=registry.example.com \
  --docker-username=puller --docker-password="$REGISTRY_TOKEN"
kubectl patch serviceaccount api -n shop \
  -p '{"imagePullSecrets":[{"name":"regcred"}]}'
```

An image pulled once stays cached on the node. Without further control, another Pod on that node could use it without credentials. Two answers:

- The **AlwaysPullImages** admission plugin (not enabled by default) forces `imagePullPolicy: Always`, so every Pod must present valid credentials; recommended for multi-tenant clusters.
- The kubelet's **image pull credential verification** (beta since v1.35, on by default) checks the credentials of every Pod that uses an image that needed credentials, even if it is already present.

Finally, **restrict which registries** a cluster may pull from: an admission policy (a ValidatingAdmissionPolicy, Kyverno, OPA Gatekeeper, or the ImagePolicyWebhook admission plugin) rejects Pods whose images don't come from approved registries, and mirrors of public images let you scan and approve them before use.

> **Exam trap.** RBAC can't restrict which registry an image comes from: the image is a field inside the Pod. Restricting registries is an admission control decision.

<!-- section: key-points -->
## Key points

- Build minimal images with multi-stage builds, a non-root default user and no secrets in any layer.
- Scan in the pipeline, in the registry and on running images; rescan continuously because new CVEs appear for unchanged images.
- Tags are mutable, digests are immutable; sign images with cosign (Sigstore) and verify signatures at admission.
- `imagePullPolicy` defaults to `Always` for `:latest` or no tag, `IfNotPresent` otherwise.
- Private registries with imagePullSecrets (Pod or ServiceAccount) or a kubelet credential provider; AlwaysPullImages for multi-tenant nodes; admission policies to allow only approved registries.
