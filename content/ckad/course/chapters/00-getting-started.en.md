CKAD (Certified Kubernetes Application Developer) is the CNCF certification, run by The Linux Foundation, that checks you can build, deploy, configure and troubleshoot applications on Kubernetes. There is no multiple choice: you solve tasks on real clusters from a Linux terminal, against the clock. This chapter covers the exam format and environment, what the Certidrill practice trains and what it cannot, the `kubectl` habits that save minutes on every task, and a study plan. The course is written for Kubernetes v1.37.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Delivery | Online, proctored through the PSI secure browser |
| Duration | 2 hours |
| Tasks | 15–20 performance-based tasks on the Linux command line |
| Kubernetes version | v1.37 |
| Passing score | 66 %, scored automatically; results emailed within 24 hours |
| Attempts | One retake included |
| Simulator | Two killer.sh sessions per registration, 36 hours of access each |
| Validity | 2 years |
| Languages | English, Japanese, Simplified Chinese |

| Domain | Weight |
| --- | --- |
| Application Design and Build | 20 % |
| Application Deployment | 20 % |
| Application Observability and Maintenance | 15 % |
| Application Environment, Configuration and Security | 25 % |
| Services and Networking | 20 % |

<!-- section: exam-environment -->
## The exam environment

You start on a base machine (hostname `base`). Each task opens with an infobox that tells you which host to reach with `ssh <host>`; you work there and type `exit` to return to `base` before the next task. Nested SSH is not supported, and the base machine has none of the tools: everything happens on the task hosts.

On every task host you get `kubectl` with the `k` alias and Bash completion, `yq`, `curl`, `wget` and the man pages; `sudo -i` gives you root. The task statement names the objects, the namespace and often a file path where an answer must be saved.

The only documentation allowed is kubernetes.io/docs (its search box included, but not external search results), kubernetes.io/blog and helm.sh/docs, opened in the browser of the remote desktop. A terminal and the VSCodium editor are available. In the terminal, copy with Ctrl+Shift+C and paste with Ctrl+Shift+V; use Ctrl+Alt+W instead of Ctrl+W, which would close the browser tab.

> **Exam trap.** Working on the wrong host or in the wrong namespace scores zero even when the YAML is perfect. Before the first command of a task, check that the prompt shows the host of the infobox and that every command carries the namespace of the task.

Time management: 2 hours for 15–20 tasks is 6 to 8 minutes per task. When a task does not move after a few minutes, skip it, write down its number and come back once the quick ones are done. Every task scores on its own, so ten finished tasks beat fifteen half-done ones.

<!-- section: certidrill-practice -->
## What the Certidrill practice trains

Certidrill has no cluster. Its exercises are of two kinds:

| Exercise | You do | It checks |
| --- | --- | --- |
| `command` | Type one command line, as at the prompt | The objects that `kubectl` v1.37 prints in client dry-run, or the parsed command for reads and operations (`logs`, `rollout undo`, `scale`, `get -o jsonpath`...) |
| `manifest` | Write YAML in an editor, sometimes from a starter file | The fields the task asks for, one check each |

Quizzes add single-answer and multiple-answer questions on decisions and diagnostics. Together they train the part that loses most points: knowing the exact command, flag and field without searching.

What they do not train: a live cluster. You never wait for a Pod to become `Running`, read real events, debug a crash, edit in `vim` over SSH or feel the clock run. Certidrill practice sets are not a realistic mock exam. For that, use the two killer.sh sessions included with the exam, the second one in the last week, and a local cluster (kind or minikube) where you replay the commands of each chapter.

<!-- section: kubectl-speed -->
## kubectl habits that save time

Never write a manifest from scratch when a generator exists. Generate it, save it, edit only what the task adds, then apply it:

```bash
export do="--dry-run=client -o yaml"
k run web --image=nginx:1.27 -n shop $do > web.yaml
k create deployment api --image=nginx:1.27 --replicas=3 -n shop $do > api.yaml
k apply -f api.yaml
```

When you forget a field name or its place, ask the API instead of the browser:

```bash
k explain pod.spec.containers.imagePullPolicy
k explain cronjob.spec.jobTemplate.spec --recursive
```

Two ways to handle namespaces:

```bash
k get pods -n shop                                 # explicit on every command
k config set-context --current --namespace=shop    # default for the current context
k config view --minify | grep namespace            # check which namespace is the default
```

| Situation | Habit |
| --- | --- |
| Create an object a generator knows | `k create ...` or `k run ...` with `$do > file.yaml`, edit, `k apply -f` |
| Change a Pod field that cannot be edited in place (`command`, `args`, `env`, `ports`) | `k get pod web -o yaml > web.yaml`, edit, `k replace --force -f web.yaml` |
| Find a field | `k explain <kind>.<path>` and `--recursive` |
| Delete a Pod without waiting | `k delete pod web --force --grace-period=0` |
| Save an answer to a file | Redirect the output with `>` to the exact path of the task |

> **Exam trap.** `set-context --current --namespace` changes the kubeconfig of the host you are on and stays set for later tasks on that host. Putting `-n` on every command is safer: the next task will use another namespace.

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order and type every command of each chapter on a local cluster, then delete the objects and redo them from memory.
2. After each chapter, do its Certidrill exercises without the documentation; for every mistake, find the field with `kubectl explain`, then on kubernetes.io, the way you will during the exam.
3. Learn where the YAML examples are on kubernetes.io (Pods, Jobs, CronJobs, probes, volumes, NetworkPolicies, Ingress): copying a documented example is often faster than generating.
4. Time yourself: one command task in under 2 minutes, one manifest task in under 6.
5. Use the first killer.sh session in the middle of your preparation, the second in the last week, and redo every task you missed.
6. Book the exam when you pass the killer.sh session comfortably and finish the Certidrill practice sets with time left.

<!-- section: key-points -->
## Key points

- 2 hours, 15–20 hands-on tasks, Kubernetes v1.37, 66 % to pass, one retake, valid 2 years.
- `ssh` to the host of each task, `exit` back to `base`; `-n` on every command.
- Generate with `--dry-run=client -o yaml > file`, edit, apply; look fields up with `kubectl explain`.
- Skip a stuck task and come back: every task scores on its own.
- Certidrill trains commands and manifests without a cluster; killer.sh and a local cluster train the live part.
