# E-ckad-21-deployments-strategies — report

28 exercises in `content/ckad/questions/deployment/` (27 new + the model `ckad-2b-rollout-undo-revision`, untouched): 4 per objective 2.1.1–2.2.4. Types: 15 manifest, 10 command/invocation, 3 command/object (46 % command). Difficulty 5 × 1, 15 × 2, 8 × 3.

## Doubts to verify in CI (real kubectl v1.37)

- **Object-mode outputs on files** (`--local -o yaml`), not run against a real kubectl:
  - `ckad-2b-set-image-container`: I assumed `set image` works on typed objects and prints `strategy: {}`, `resources: {}` per container and `status: {}`.
  - `ckad-2a-bluegreen-switch-selector`: I assumed `set selector` prints a typed Service with `status: loadBalancer: {}`. Its `kubectl label svc` negative is written as unstructured output, with no status.
  - `ckad-2a-quarantine-pod-label`: I assumed `kubectl label` / `annotate` print the file unchanged except for the label (unstructured, no `status`/`resources`).
  - None of the checks depend on these defaults.
- **`kubectl set selector` and `kubectl label --local`** on a file are not in BRIEF-PRACTICE's list of object-mode verbs (`label`/`annotate` are). `set selector` is the documented imperative way to switch a Service selector. A candidate who uses `kubectl patch svc` would get the right result, but the application may not run `patch` in object mode.
- **`kubectl autoscale --cpu-percent`** is no longer on the v1.37 reference page, which only documents `--cpu` (`70%` or `500m`) and `--memory`. To stay safe, `ckad-2b-autoscale-cpu-value` asks for an absolute value (`--cpu=250m`), which `--cpu-percent` cannot express. I could not confirm whether `--cpu-percent` still exists as a hidden deprecated flag.
- **Parser limitation** in `factory/exercise.ts`: a joined short flag whose value contains `=` (`-lapp=web,version=green`, the form shown on the Labels page) is parsed as `selector: "app"`. Candidates who type that valid form fail the check. I did not use it as a solution. It should be fixed in `parseCommand` (only split at `=` when it comes right after the letter).
- **`ckad-2a-get-pods-by-version`**: an equivalent set-based selector (`-l 'app in (web),version=green'`) would fail the `oneOf`. This form is rare and was left out.
- **`ckad-2b-resume-paused-manifest`** requires `paused: false` explicitly. The stem says the Deployment was paused with `kubectl rollout pause`, so `paused` is not in last-applied-configuration, and simply deleting the field and running `kubectl apply` would not unpause it. That three-way-merge reasoning is mine, not quoted from kubernetes.io.
- **`ckad-2a-canary-abort`**: the negative "omitting replicas defaults to 1" relies on `.spec.replicas` defaulting to 1, the documented API default.
- The chapter `21-deployments-strategies.en.md` was not read (task says it may be in progress). The facts come from kubernetes.io: Deployments, Deploy a Release Using a Canary Deployment, Service, EndpointSlices, Labels and Selectors, Horizontal Pod Autoscaling, and kubectl set selector/set image/label/scale/autoscale/rollout status.
- While I worked, another agent's file (`ckad-2d-configmap-generator.yaml`) briefly made `check-exercise.ts` crash, because the script parses all files before filtering. The crash had cleared by the final run.
