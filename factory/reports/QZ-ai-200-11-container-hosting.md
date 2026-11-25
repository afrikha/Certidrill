# QZ-ai-200-11-container-hosting — notes

## Chapter vs current Learn (to fix in the chapter, not done here)

- `11-container-hosting.en.md` / `.fr.md`, App Service section: "a service principal is no longer supported for image pull". The Learn page "Configure a custom container for Azure App Service" says that a service principal is no longer supported for **Windows** container image pull, and recommends managed identity for both Windows and Linux. The chapter generalises this to all containers.
- Same section: `az webapp exec` is presented as a normal command. Learn marks it **preview** (the browser terminal is not). The quiz uses only the browser terminal (q3).
- Same section: the sidecar overview ("Sidecars in Azure App Service") says that sidecar-enabled apps support only ports 80 and 8080 for external HTTP traffic, and that containers can also have container-specific environment variables in addition to the shared app settings. The chapter mentions neither. Worth checking how `WEBSITES_PORT` applies to sidecar-enabled apps.
- French chapter: image tags are « étiquette ». The writing guide and the AI-200 mock bank use « balise » for container image tags (« étiquette » is for Azure tags). The quiz uses « balise » and « manifeste non balisé ». Harmonise the chapter.
- The SKU page lists "Repo-scoped permissions with Microsoft Entra role assignments" (ABAC) for all three tiers. The chapter doesn't say which tiers support ABAC; it may be worth one line.
- The SKU page lists "Content trust" as Premium; the writing guide says Docker Content Trust is retired. Nothing in the quiz depends on it.

## Facts not verified, so left out or worded around

- Whether an untagged manifest can still be pulled by digest: the Learn delete page only implies it (it warns that deleting digests breaks systems that pull by digest). q2's answer says only that the manifest and its unique layers stay in the registry.
- `clientID` in the `secrets` section (q10): the YAML reference defines it as "Client ID of a user-assigned managed identity" but gives no example; the Key Vault tutorial omits it with a single identity. q10 states that the task has both a system-assigned identity without vault access and the user-assigned id-hub, so that `clientID` is needed to select id-hub.
- Whether the system-assigned identity endpoint is reachable from App Service sidecars: unknown, so I dropped a question about hiding a secret from a sidecar.
- q7 relies on "Currently, ACR tasks don't support commit or pull-request triggers in GitHub Enterprise repos" (tasks overview). If Microsoft adds this support, q7 must be rewritten.

## Design notes

- The mock bank already covers almost every decision of the chapter (about 60 questions on 1.1.x). The quiz tests what is left: `cmd` step type, untagged manifest after a stable tag push, shell needed by the browser terminal (no SSH server), 3-hour `az acr login` token in a long job, Docker Hub default for unprefixed `cmd` images, lowest tier per feature (zone redundancy on every tier), GitHub Enterprise trigger limitation, versioned vs unversioned references after a configuration change, causes of the literal `@Microsoft.KeyVault(...)` value (deleted secret, private-only vault), and the three identity IDs around a task's `secrets` section.
- q6 is a text drop-down (four slots, three tiers each, `shuffle: false`) rather than a drag-and-drop, because only three tiers exist and the guide asks for 4–6 drag items.
- q9 overlaps the mock question `ai200-1a-app-private-network` on the network cause, but tests diagnosis (which issues cause the literal value) instead of configuration.
