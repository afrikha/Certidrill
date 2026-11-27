# QZ-gcp-ace-33-manage-serverless-ai — report

File: `content/gcp-ace/quizzes/33-manage-serverless-ai.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-ace 33-manage-serverless-ai` → 0 problem(s), 0 warning(s).

Coverage: 3.1.10 (q1), 3.1.11 (q7, multi), 3.1.12 (q6), 3.1.13 (q4, q8), 3.1.14 (q5), 3.1.15 (q2, q9 multi), 3.1.16 (q3, q10 multi). The 35 mock questions of these objectives were read; the quiz tests other decisions (tag URL format, Workbench shut-down billing, quick start pool, adding a GPU to an existing N1 VM, deleting an agent with `force=True`, a canary's share of the service maximum, `--to-revisions` rescaling vs `LATEST`, Cloud Run GPU zonal redundancy cost, changing Workbench hardware in place, Workstations with no public IP plus Cloud NAT).

## Verification (2026-11-27)
- Cloud Run: max-instances page (service max split by traffic share, the lower of service/revision limit wins, "no available container instances" on a revision); rollouts page (tag URL `TAG---SERVICE-HASH.a.run.app`); GPU page (L4 minimum 4 CPU / 16 GiB, instance-based billing required, zonal redundancy on by default and costs more, fractional GPU Preview and RTX PRO 6000 only). `gcloud run services update-traffic` reference + local help: under 100 % assigned, revisions that serve traffic are rescaled proportionally; `LATEST` follows the newest ready revision.
- Compute Engine "Add or remove GPUs": stop the VM, host maintenance Terminate, then add the GPU; no gcloud command for adding a GPU to an existing VM (console or REST `setMachineResources`), so q4 is phrased as console steps.
- Agent Runtime: "Manage deployed agents" (`client.runtimes.delete(name=..., force=True)` when the agent has sessions/memory); "Deploy an agent" (`max_instances` range 1–1000).
- Workbench: idle shutdown page (no CPU/GPU charges while shut down, disk charges continue; CPU use does not reset the idle timer); change-machine-type page (instance must be shut down; G2 ↔ non-G2 change not supported). Flags checked with local `gcloud workbench instances update --help`.
- Workstations: create-configuration page (quick start pool = pre-started VMs, billed; disabling public IPs requires Private Google Access or Cloud NAT). Flags checked with local `gcloud workstations configs create/update --help`.

## Doubts and chapter gaps
- Chapter section traffic-splitting does not mention the `LATEST` keyword in `--to-revisions` nor the proportional rescaling when less than 100 % is assigned (q7 relies on the gcloud reference). Worth one line in the chapter.
- Chapter section notebooks says machine type / GPU can be changed after creation with `gcloud workbench instances update`, but omits that the instance must be **shut down** first and that switching between G2 and non-G2 machine types is **not supported** (Learn-equivalent page "Change machine type and configure GPUs of an Agent Platform Workbench instance").
- Chapter section gpus-tpus: the GPU page says new projects get L4 quota automatically only with zonal redundancy **off** (3 GPUs per region at first deployment); zonal-redundancy-on quota must be requested. Not in the chapter.
- Agent Runtime "Deploy an agent" page: `min_instances` default is 1 (range 0–75, Preview note that idle billing is waived), `container_concurrency` default 9. The chapter's sample uses `min_instances: 1`, consistent; defaults not stated.
- Cloud NAT overview says traffic to Google APIs is routed through Private Google Access; q10 states that Private Google Access is already enabled to keep a single defensible pair (disable public IPs + Cloud NAT).
- GatewayClass support for HTTPRoute weights (chapter: not on `gke-l7-gxlb`) could not be verified: the capabilities table did not survive extraction. Not used in the quiz.
