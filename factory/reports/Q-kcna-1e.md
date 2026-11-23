# Q-kcna-1e — KCNA questions, fundamentals 1.4.3 / 1.4.4 / 1.4.5 (2026-11-23)

## Result
36 `single` questions in `content/kcna/questions/fundamentals/kcna-1e-*.yaml`, 12 per objective. Difficulty 15 easy / 16 medium / 5 hard. Correct answers spread 9 a / 9 b / 9 c / 9 d. `CERT=kcna npx tsx factory/validate.ts --prefix kcna-1e-`: 0 problems. `npm run content:validate -- --cert kcna --prefix kcna-1e-`: 0 problems, 0 warnings.

## Sources fetched (WebFetch, 2026-11-23)
kubernetes.io: Runtime Class, Pod Overhead, Container Runtimes, Container Runtime Interface (CRI), Updated: Dockershim Removal FAQ (blog), Find Out What Container Runtime is Used on a Node, Debugging Kubernetes nodes with crictl, Define a Command and Arguments for a Container. Other: containerd.io, cri-o.io, opencontainers.org/about/overview, github.com/opencontainers/runc, github.com/containers/crun, github.com/google/gvisor, github.com/kata-containers/kata-containers, github.com/GoogleContainerTools/distroless, github.com/docker/docs (multi-stage.md, best-practices.md).

## Doubts and choices
1. **Missing RuntimeClass**: the Runtime Class page says a Pod that names a non-existent RuntimeClass enters the `Failed` phase; my understanding is that the RuntimeClass admission plugin rejects such a Pod at creation. Not tested. The course chapter repeats the doc ("the Pod fails"), which is ambiguous enough.
2. **Dockerfile sources**: docs.docker.com is not an accepted CNCF host, so the Dockerfile questions cite the docker/docs Markdown sources on github.com. The Dockerfile reference and the build-cache pages could not be fetched (robots / server errors). Facts used only from the fetched best-practices and multi-stage pages (cache ordering, `.dockerignore`, `apt-get` in one `RUN`, ENTRYPOINT + CMD, `USER`, `--target`, `--file`, `--pull`). `USER` also applying to later build instructions and `ADD` copying a source directory like `COPY` are general knowledge.
3. **Kaniko** was not used as an answer (the project was archived by Google in 2025, from memory); the daemonless builder question uses Buildah, which the Dockershim FAQ lists.
4. **Reference titles** of GitHub pages are the GitHub page titles as fetched; the Kata Containers title is shortened to `GitHub - kata-containers/kata-containers` (the full repository description is long and was not quoted verbatim), and the distroless title drops its leading emoji.
5. Not tested (unverified or too detailed for KCNA): cgroup driver matching, CRI socket paths, containerd 1.x/2.x config keys, the maturity or foundation of gVisor and Kata Containers, crun.
