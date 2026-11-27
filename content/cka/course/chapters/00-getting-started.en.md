CKA (Certified Kubernetes Administrator) is the hands-on administrator certification of the Cloud Native Computing Foundation (CNCF), run by The Linux Foundation. There are no options to choose from: you get a terminal and a set of tasks to complete on real clusters, and a script checks the result. This chapter covers the format and the environment of the exam, what the Certidrill practice trains and what it does not, the command habits that save minutes on every task, and a study plan. The course is written for Kubernetes v1.37.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Delivery | Online, proctored, in the PSI Bridge secure browser |
| Duration | 2 hours |
| Tasks | 15 to 20 performance-based tasks on the Linux command line |
| Kubernetes version | v1.37 |
| Passing score | 66 %, scored automatically; results are emailed within 24 hours |
| Included | One retake and two killer.sh simulator sessions (36 hours of access each) |
| Validity | 2 years |
| Languages | English, Japanese, Simplified Chinese |

| Domain | Weight |
| --- | --- |
| Troubleshooting | 30 % |
| Cluster Architecture, Installation & Configuration | 25 % |
| Services & Networking | 20 % |
| Workloads & Scheduling | 15 % |
| Storage | 10 % |

Troubleshooting and cluster administration make up more than half of the score, and they are the domains that need node-level skills: `kubeadm`, `etcdctl`, `systemctl`, `journalctl`, `crictl` and the files under `/etc/kubernetes`.

<!-- section: exam-environment -->
## The exam environment

- Each task starts with an infobox that gives the host to `ssh` to. Do the task on that host, then `exit` to return to the base system (hostname `base`). Nested SSH is not supported, and you must never reboot `base`.
- `sudo -i` gives you root on any task host; `sudo` also works for single commands.
- The task hosts have `kubectl` with the `k` alias and Bash completion, plus `yq`, `curl`, `wget` and `man`. The base system has none of these.
- Allowed documentation: kubernetes.io/docs, kubernetes.io/blog, helm.sh/docs and gateway-api.sigs.k8s.io, plus the links of a task's Quick Reference box. You may search kubernetes.io/docs but not open external results.
- Copy and paste in the terminal is `Ctrl+Shift+C` and `Ctrl+Shift+V`. The Insert key is blocked: in `vim`, type `i`.

> **Exam trap.** Work on the wrong host or cluster and the task scores zero even if every command is right. Run the `ssh` command of the infobox, and any `kubectl config use-context` command the task gives, before anything else.

With about 17 tasks in 120 minutes you have roughly 7 minutes per task. Skim the tasks, do the quick ones first, and skip any task that blocks you for more than a few minutes: note its number and come back to it at the end. Before moving on, check the result of each task with a `get` or `describe`.

<!-- section: certidrill-practice -->
## What the Certidrill practice trains

Certidrill runs no cluster. It gives you two kinds of exercises, checked without a cluster:

| Type | You write | What is checked |
| --- | --- | --- |
| `command` | One command line (`kubectl`, `kubeadm`, `etcdctl`, `etcdutl`, `crictl`, `systemctl`, `journalctl`, `helm`) | The objects kubectl would create, or the verb, resource and flags of the command |
| `manifest` | One or more YAML documents: objects, a static Pod manifest, a `KubeletConfiguration`, a CoreDNS ConfigMap | Each required field, one check per field |

Timed practice sets of 17 exercises in 120 minutes train speed and the exact flags and fields. They do **not** train what a real broken cluster demands: finding the fault yourself, waiting for components to restart, checking that the fix worked. Troubleshooting exercises here give you the symptoms or the broken file. For a full rehearsal on live clusters, use the two killer.sh sessions included with the exam, the second one in your last week.

<!-- section: command-habits -->
## kubectl and node habits

Generate manifests instead of typing them, and look up fields instead of guessing:

```bash
alias k=kubectl                     # already set on the exam hosts
export do="--dry-run=client -o yaml"
k create deployment web --image=nginx:1.27 -n shop $do > web.yaml
k explain pod.spec.volumes.persistentVolumeClaim
k explain statefulset.spec --recursive | less
k config use-context cluster2       # only when the task gives a context
k get pods -n shop -o wide          # -n on every command
```

When `kubectl` gets no answer, the API server itself may be down. Work on the control plane node:

```bash
sudo -i
systemctl status kubelet
journalctl -u kubelet --no-pager | tail -30
crictl ps -a                        # containers, including exited ones
crictl logs <container-id>
ls /etc/kubernetes/manifests        # static Pods: edit these files, not kubectl
```

> **Exam trap.** Forgetting `-n` creates the object in the `default` namespace, where the checker never looks. Put the namespace on every command, or set it with `k config set-context --current --namespace=shop` and switch it back afterwards.

> **Exam tip.** Some procedures are too long to remember flag by flag: the kubeadm upgrade, the etcd backup and restore, the PersistentVolume examples. Know where their kubernetes.io pages are before exam day, and copy their commands rather than typing them.

<!-- section: study-plan -->
## A study plan that works

1. Build a two-node kubeadm cluster (virtual machines are enough) and keep it: install, upgrade one minor version, back up and restore etcd, break the kubelet and fix it.
2. Read each chapter, type every command it shows, and do its exercises until you get the flags right without the documentation.
3. Practise finding pages on kubernetes.io/docs quickly: the search box and the task pages are your only help on exam day.
4. Take timed practice sets on Certidrill to drill speed on commands and manifests, and read the checks you failed.
5. Use the first killer.sh session two to three weeks before the exam and the second in the last week; redo the tasks you missed on your own cluster.

<!-- section: key-points -->
## Key points

- 2 hours, 15 to 20 hands-on tasks, Kubernetes v1.37, 66 % to pass, one retake.
- `ssh` to the host named by each task, `sudo -i` when you need root, `exit` back to `base`.
- Docs allowed: kubernetes.io/docs, kubernetes.io/blog, helm.sh/docs, gateway-api.sigs.k8s.io.
- Generate YAML with `--dry-run=client -o yaml`, check fields with `kubectl explain`, put `-n` everywhere.
- When the API server is down: `systemctl`, `journalctl`, `crictl` and the static Pod manifests.
- Certidrill drills commands and manifests; killer.sh and your own cluster train real troubleshooting.
