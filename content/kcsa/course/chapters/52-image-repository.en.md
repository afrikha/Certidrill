The image registry is where the supply chain meets the cluster: every node pulls from it, every pipeline pushes to it. A registry that anyone can write to, or a tag that can be moved silently, lets an attacker replace production code without touching Kubernetes. This chapter covers how to lock down a registry, which controls a registry such as Harbor provides, and how the kubelet decides when to pull an image.

<!-- section: registry-access | objectives: 5.2.1 -->
## Securing access to a container registry

| Control | What it protects | Practice |
| --- | --- | --- |
| **Authentication** | Only known identities push or pull | No anonymous push; prefer short-lived tokens or workload identity over static passwords; separate robot (service) accounts for CI and for clusters |
| **Authorization** | Each identity reaches only its repositories | CI can push only to its project; clusters get **pull-only** credentials; humans rarely need push to production repositories |
| **Private network access** | The registry is not reachable from the internet | Private endpoint or firewall rules limiting access to build agents and cluster nodes; TLS on every connection |
| **Private repositories** | Image contents are not public | Internal code and configuration baked into images stay confidential |

Kubernetes gives Pods registry credentials through **`imagePullSecrets`**: a Secret of type `kubernetes.io/dockerconfigjson` (or the legacy `kubernetes.io/dockercfg`) in the **same namespace** as the Pod.

```bash
kubectl create secret docker-registry regcred -n shop \
  --docker-server=registry.example.com \
  --docker-username=shop-puller \
  --docker-password="$PULL_TOKEN"
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: shop
spec:
  containers:
  - name: web
    image: registry.example.com/shop/web:2.3.1
  imagePullSecrets:
  - name: regcred
```

Because a Pod can reference only Secrets of its own namespace, the Secret must exist in each namespace that pulls. Adding `imagePullSecrets` to a **ServiceAccount** attaches it automatically to every Pod that uses that ServiceAccount. Other options are kubelet credential provider plugins, which fetch short-lived registry credentials for the node from a cloud identity, so no static password sits in a Secret.

A pull Secret is still a Secret: anyone who can read Secrets or create Pods in the namespace can use it. Give it pull-only rights on the registry.

> **Exam trap.** Without extra controls, an image that one tenant pulled to a node with its credentials stays cached there, and another tenant's Pod on that node can start it with `imagePullPolicy: IfNotPresent` without any credentials. The fixes are the `AlwaysPullImages` admission plugin, which forces `Always` on every new Pod, and the kubelet's image pull credential verification (`KubeletEnsureSecretPulledImages`, beta and enabled by default since v1.35), which makes the kubelet check credentials even for an image already present.

<!-- section: registry-controls | objectives: 5.2.2 -->
## Registry controls: scanning, immutability, promotion and mirrors

Enterprise registries such as **Harbor** (a CNCF graduated registry) add security controls on top of storage:

| Control | Purpose |
| --- | --- |
| **Scan on push** | Every new image is scanned for known vulnerabilities (Harbor uses Trivy as its default scanner); results are stored with the image |
| **Scheduled rescans** | New CVEs are published every day: an image that was clean last month may not be clean now |
| **Prevent vulnerable images from running** | The registry refuses to serve images with vulnerabilities at or above a chosen severity |
| **Immutable tags** | Once pushed, a tag (for example `2.3.1`) cannot be overwritten or deleted, so the tag always means the same content |
| **Signature enforcement** | Only signed images can be pulled from the project |
| **Robot accounts** | Scoped, non-human credentials for CI pipelines and clusters |
| **Replication** | Copies images between registries, for promotion or for mirrors |
| **Proxy cache** | Serves and caches images from an upstream public registry |

**Image promotion** separates registries (or projects) by trust level. The pipeline pushes to a development registry; only images that pass scanning, tests and signature checks are **promoted** (copied by digest) to the production registry, which clusters in production are allowed to pull from. Nobody pushes directly to production.

**Mirroring public images** removes a direct dependency on public registries. Base images and third-party images are copied into an internal registry, scanned, and pulled from there. Benefits: control over what enters the organization, scanning before use, protection against an upstream image being replaced or deleted, and no exposure to public rate limits. Combine this with an admission policy (Kyverno, OPA Gatekeeper or a ValidatingAdmissionPolicy) that rejects Pods whose image does not start with an approved registry such as `registry.example.com/`.

> **Exam tip.** "Ensure a tag can never point to a different image" → immutable tags in the registry, or references by digest in manifests. "Detect vulnerabilities discovered after the image was built" → periodic rescans, not only scan on push.

<!-- section: pull-policy-digest | objectives: 5.2.3 -->
## imagePullPolicy, digests and signature verification

`imagePullPolicy` tells the kubelet when to pull:

| Value | Behavior |
| --- | --- |
| `IfNotPresent` | Pull only if the image is not already on the node |
| `Always` | Each time a container starts, the kubelet asks the runtime to resolve the reference against the registry; unchanged layers come from the cache. Requires valid credentials each time |
| `Never` | Never pull; the container starts only if the image is already on the node |

When the field is omitted, Kubernetes sets it at Pod creation:

| Image reference | Default policy |
| --- | --- |
| Digest (`@sha256:...`) | `IfNotPresent` |
| Tag `:latest` | `Always` |
| No tag (which means `:latest`) | `Always` |
| Any other tag | `IfNotPresent` |

The default is computed only once, at creation: changing the image to `:latest` later does not change a policy already set to `IfNotPresent`.

**Tags are mutable**: whoever can push can move `web:2.3.1` to different content. A **digest** is the SHA-256 hash of the image manifest, so it always designates the same bytes. If a reference includes both a tag and a digest, only the digest is used.

```yaml
containers:
- name: web
  image: registry.example.com/shop/web@sha256:9d2b6f0c1a7e4b3d8f5a2c6e1b0d9f7a3c5e8b2d4f6a1c3e5b7d9f0a2c4e6b8d
```

Pulling by digest guarantees **integrity** (the content is the content that was tested) but not **origin**: a digest of a malicious image is still a valid digest. **Signature verification** answers who produced it. An admission policy verifies the cosign signature (or attestation) for the image, checks that the signer identity is the trusted CI pipeline, and can rewrite the tag into the verified digest so that the node pulls exactly what was verified.

| Goal | Control |
| --- | --- |
| Same content on every node and every restart | Reference by digest |
| Content produced by a trusted pipeline | Signature verification at admission |
| No use of cached images without credentials | `AlwaysPullImages` or kubelet credential verification |
| Avoid unknown versions in production | Never use `:latest`; use a version tag and a digest |

> **Exam trap.** `imagePullPolicy: Always` does not verify a signature and does not protect against a moved tag: it pulls whatever the tag points to now. Integrity comes from the digest, authenticity from the signature.

<!-- section: key-points -->
## Key points

- Registry: authenticated, authorized (pull-only for clusters, push only for CI), private network, TLS.
- `imagePullSecrets` reference a `kubernetes.io/dockerconfigjson` Secret in the Pod's namespace, or come from the ServiceAccount.
- Registry controls: scan on push plus scheduled rescans, immutable tags, signature enforcement, robot accounts, promotion between registries, mirrors and proxy caches of public images.
- Defaults: `:latest` or no tag → `Always`; any other tag or a digest → `IfNotPresent`.
- `AlwaysPullImages` and kubelet credential verification stop tenants from using images cached by others.
- Digest = integrity; signature = authenticity; verify both at admission.
