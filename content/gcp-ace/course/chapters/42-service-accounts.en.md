A service account is the identity of a workload rather than a person: a VM, a Cloud Run service, a GKE Pod or a pipeline outside Google Cloud. A service account is both a **principal** (you grant it roles on resources) and a **resource** (you grant people roles on it, such as the right to use or impersonate it). Associate questions ask which service account type is involved, which role lets someone attach or impersonate it, how to avoid keys, and how GKE and external workloads get Google Cloud credentials.

<!-- section: service-account-types | objectives: 4.2.1 -->
## Creating service accounts and Google-managed service accounts

| Type | Created by | Email format | Managed by |
| --- | --- | --- | --- |
| User-managed | You (`gcloud iam service-accounts create`) | `NAME@PROJECT_ID.iam.gserviceaccount.com` | You |
| Default service accounts | Google Cloud, when you enable certain services | Compute Engine: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`; App Engine: `PROJECT_ID@appspot.gserviceaccount.com` | You (they are user-managed accounts created automatically) |
| Service agents (Google-managed) | Google Cloud, so that a service can act on your resources | For example `service-PROJECT_NUMBER@container-engine-robot.iam.gserviceaccount.com` (GKE), `PROJECT_NUMBER@cloudservices.gserviceaccount.com` (Google APIs Service Agent) | Google |

```bash
# Requires Create Service Accounts (roles/iam.serviceAccountCreator) or Service Account Admin
gcloud iam service-accounts create orders-api \
  --display-name="Orders API" --description="Runtime identity of the orders service" \
  --project=tailspin-prod
gcloud iam service-accounts list --project=tailspin-prod
```

- The account ID is 6 to 30 characters (lowercase letters, digits, dashes) and can't be changed later.
- A new account may take 60 seconds or more before it can be used everywhere (eventual consistency): retry with backoff.

**Default service accounts.** Depending on the organization policy, the Compute Engine and App Engine default service accounts may be granted **Editor** on the project automatically. Google strongly recommends disabling this with the boolean constraint `iam.automaticIamGrantsForDefaultServiceAccounts`, enforced by default in organizations created after May 3, 2024. Cloud Run, Cloud Run functions and GKE nodes also use the Compute Engine default service account when you don't choose one.

**Service agents** are created when the service needs them (usually at first use of its API) and receive a role whose name ends in `serviceAgent`, such as `roles/container.serviceAgent`. Don't revoke these roles unless a role recommendation suggests it: the service breaks. To create a service agent in advance (for example to grant it a Cloud KMS key role before using CMEK), trigger its creation with `gcloud workload-identity service-agents generate`. A service agent created on request **doesn't receive its roles automatically**: grant the roles that the command's response lists.

```bash
gcloud workload-identity service-agents generate \
  --service="bigquery.googleapis.com" --location="global" --project="123456789012"
```

> **Exam trap.** A "Google-managed service account" in a stem is a service agent: you can grant it roles (for example `roles/cloudkms.cryptoKeyEncrypterDecrypter` on a key for CMEK), but you can't create keys for it, attach it to a VM or delete it.

<!-- section: least-privilege | objectives: 4.2.2 -->
## Using service accounts in IAM policies with minimum permissions

A service account appears in allow policies with the `serviceAccount:` prefix, like any principal:

```bash
gcloud projects add-iam-policy-binding tailspin-prod \
  --member="serviceAccount:orders-api@tailspin-prod.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
gcloud storage buckets add-iam-policy-binding gs://tailspin-invoices \
  --member="serviceAccount:orders-api@tailspin-prod.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"
```

Least-privilege rules:

| Practice | Why |
| --- | --- |
| One user-managed service account **per application** (and per environment) | A compromise or a role change affects one workload; audit logs name the application |
| Don't use the default Compute Engine service account for applications | It is shared by every VM, Cloud Run service and node that didn't choose an account, and may hold Editor |
| Predefined roles of the service, at the **narrowest resource** (bucket, topic, dataset) | Project-wide or basic roles grant far more than the code needs |
| Remove unused roles with **role recommendations** (IAM recommender, `google.iam.policy.Recommender`) | Based on up to 90 days of observed permission usage: suggests removing a role or replacing it with a smaller or custom role |
| Use IAM Conditions for time-boxed or resource-scoped access | For example only objects whose name starts with a prefix |

> **Exam trap.** "The application on the VM gets 403 errors calling Cloud Storage" is fixed by granting the **VM's service account** a Cloud Storage role (and checking access scopes), not by granting a role to the developer who deployed it.

<!-- section: attach-to-resources | objectives: 4.2.3 -->
## Assigning service accounts to resources

**Attaching** a service account makes it the resource's default identity: code on the resource gets short-lived tokens for it automatically from the metadata server, with no key. To attach a service account, the deployer needs `iam.serviceAccounts.actAs` on it, given by **Service Account User** (`roles/iam.serviceAccountUser`), in addition to the role that creates the resource.

```bash
# Compute Engine: choose the account and use the cloud-platform scope (IAM decides access)
gcloud compute instances create web-1 --zone=europe-west1-b \
  --service-account=web-app@tailspin-prod.iam.gserviceaccount.com \
  --scopes=cloud-platform

# Change it later: the VM must be stopped
gcloud compute instances stop web-1 --zone=europe-west1-b
gcloud compute instances set-service-account web-1 --zone=europe-west1-b \
  --service-account=web-app-v2@tailspin-prod.iam.gserviceaccount.com --scopes=cloud-platform
gcloud compute instances start web-1 --zone=europe-west1-b

# Cloud Run service and Cloud Run function runtime identity
gcloud run deploy orders --image=europe-west1-docker.pkg.dev/tailspin-prod/apps/orders:1.4 \
  --region=europe-west1 \
  --service-account=orders-api@tailspin-prod.iam.gserviceaccount.com
gcloud run deploy resize --region=europe-west1 --source=. \
  --function=main --base-image=python312 \
  --service-account=resize-fn@tailspin-prod.iam.gserviceaccount.com

# GKE node pool identity (nodes, not Pods)
gcloud container node-pools create apps --cluster=prod-gke --region=europe-west1 \
  --service-account=gke-nodes@tailspin-prod.iam.gserviceaccount.com
```

- Changing the attached account depends on the resource: a **Compute Engine instance** is stopped, changed with `set-service-account`, then started; a **Cloud Run** service gets a new revision with `gcloud run services update --service-account` (or a new deploy); an **instance template** can't be edited, so create a new template and roll it out to the MIG.
- **Access scopes** are a legacy per-VM limit on top of IAM. With the default service account and default scopes, many APIs are read-only or blocked. Google recommends the `cloud-platform` scope and controlling access with IAM roles only. `--no-service-account --no-scopes` leaves the VM with no identity.
- Attaching a service account from **another project** is blocked by the constraint `iam.disableCrossProjectServiceAccountUsage`, enforced by default and configurable only at the project level (on the project that owns the service account). When you allow it, a service agent of the consuming project also needs Service Account Token Creator on the account.

> **Exam trap.** "The developer has Compute Instance Admin but can't create a VM that uses the `web-app` service account." The missing piece is Service Account User on that service account, not another Compute Engine role.

<!-- section: manage-service-account-iam | objectives: 4.2.4 -->
## Managing IAM permissions of a service account

Because a service account is a resource, it has its own allow policy that controls **who can use or manage it**:

| Role (on the service account) | Allows |
| --- | --- |
| Service Account User (`roles/iam.serviceAccountUser`) | Attach the account to resources (`actAs`), deploy jobs that run as it |
| Service Account Token Creator (`roles/iam.serviceAccountTokenCreator`) | Impersonate it: create access tokens, ID tokens, sign JWTs and blobs |
| Service Account OpenID Connect Identity Token Creator (`roles/iam.serviceAccountOpenIdTokenCreator`) | Create OIDC ID tokens only |
| Workload Identity User (`roles/iam.workloadIdentityUser`) | Let federated identities (GKE workloads, external workloads) impersonate it |
| Service Account Admin (`roles/iam.serviceAccountAdmin`) | Create, update, disable, delete accounts and manage their allow policies |
| Service Account Key Admin (`roles/iam.serviceAccountKeyAdmin`) | Create, list, disable and delete keys |

```bash
# Let one developer deploy Cloud Run services as orders-api, and nothing else
gcloud iam service-accounts add-iam-policy-binding \
  orders-api@tailspin-prod.iam.gserviceaccount.com \
  --member="user:ana@example.com" --role="roles/iam.serviceAccountUser"
gcloud iam service-accounts get-iam-policy orders-api@tailspin-prod.iam.gserviceaccount.com
```

> **Exam trap.** Granting Service Account User or Token Creator **on the project** lets the principal act as **every** service account of the project, including powerful ones. For least privilege, grant it on the individual service account.

Lifecycle and keys:

```bash
gcloud iam service-accounts disable old-batch@tailspin-prod.iam.gserviceaccount.com
gcloud iam service-accounts enable old-batch@tailspin-prod.iam.gserviceaccount.com
gcloud iam service-accounts delete old-batch@tailspin-prod.iam.gserviceaccount.com
gcloud iam service-accounts undelete 112233445566778899001   # 21-digit unique ID

gcloud iam service-accounts keys list --iam-account=legacy@tailspin-prod.iam.gserviceaccount.com
gcloud iam service-accounts keys disable KEY_ID --iam-account=legacy@tailspin-prod.iam.gserviceaccount.com
gcloud iam service-accounts keys delete KEY_ID --iam-account=legacy@tailspin-prod.iam.gserviceaccount.com
```

- **Disable before delete** when unsure: a disabled account can be re-enabled. A deleted account can be undeleted for **30 days** with its numeric unique ID (not its email: `gcloud iam service-accounts undelete ACCOUNT_ID`); its bindings show with a `deleted:` prefix until purged.
- A new account with the same name is a **different identity**: it doesn't inherit the old bindings.

<!-- section: impersonation | objectives: 4.2.5 -->
## Service account impersonation

**Impersonation** lets an authenticated principal (a user or another service account) obtain short-lived credentials of a service account and act with its permissions. It needs `iam.serviceAccounts.getAccessToken` on the target account, usually through Service Account Token Creator. Use it to test a workload's permissions, to run admin scripts with a privileged account that nobody holds directly, and to avoid downloading keys.

```bash
# One command
gcloud storage ls gs://tailspin-invoices \
  --impersonate-service-account=deployer@tailspin-prod.iam.gserviceaccount.com

# Every gcloud command of this configuration
gcloud config set auth/impersonate_service_account deployer@tailspin-prod.iam.gserviceaccount.com
gcloud config unset auth/impersonate_service_account

# Application Default Credentials for local code (client libraries, Terraform)
gcloud auth application-default login \
  --impersonate-service-account=deployer@tailspin-prod.iam.gserviceaccount.com
```

- A comma-separated list of accounts in `auth/impersonate_service_account` creates a **delegation chain**: each account must hold Token Creator on the next.
- Audit logs record both identities: the caller and the impersonated service account.
- The `iamcredentials.googleapis.com` API (IAM Service Account Credentials API) issues the tokens.

> **Exam tip.** "Developers must run Terraform as a privileged service account without key files" points to Service Account Token Creator on that account plus `--impersonate-service-account` (or impersonation in ADC).

<!-- section: short-lived-credentials | objectives: 4.2.6 -->
## Short-lived service account credentials

| Credential | Lifetime | Typical use | Role on the service account |
| --- | --- | --- | --- |
| OAuth 2.0 access token | 1 hour by default; up to 12 hours if the account is listed in `constraints/iam.allowServiceAccountCredentialLifetimeExtension` | Call Google APIs | Service Account Token Creator |
| OpenID Connect ID token | 1 hour | Call a Cloud Run service, a Cloud Run function or an IAP-protected app that checks the audience | OpenID Connect Identity Token Creator (or Token Creator) |
| Self-signed JWT / signed blob (`signJwt`, `signBlob`) | JWT `exp` at most 12 hours ahead (1 hour for Google APIs) | Signed URLs, custom auth | Service Account Token Creator |

```bash
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com
gcloud auth print-access-token \
  --impersonate-service-account=reporting@tailspin-prod.iam.gserviceaccount.com
gcloud auth print-identity-token \
  --impersonate-service-account=reporting@tailspin-prod.iam.gserviceaccount.com \
  --audiences="https://orders-abc123-ew.a.run.app" --include-email
```

The API methods behind these commands are `generateAccessToken`, `generateIdToken`, `signJwt` and `signBlob` of the IAM Service Account Credentials API.

**Service account keys** are long-lived credentials and the **last resort**:

| Fact | Value |
| --- | --- |
| Expiry | Never, by default; `constraints/iam.serviceAccountKeyExpiryHours` sets the lifetime of **newly created** keys only, with one of the values `1h`, `8h`, `24h`, `168h`, `336h`, `720h`, `1440h`, `2160h`; it can't be merged with a parent policy (replace or inherit it) |
| Limit | 10 keys per service account |
| What Google stores | Only the public part of a user-managed key |
| Block creation / upload | Legacy boolean `iam.disableServiceAccountKeyCreation` / `iam.disableServiceAccountKeyUpload`, enforced by default in organizations created on or after May 3, 2024; managed equivalents `iam.managed.disableServiceAccountKeyCreation` / `iam.managed.disableServiceAccountKeyUpload` (the docs recommend the managed upload constraint, which works with Policy Intelligence tools) |

```bash
gcloud iam service-accounts keys create key.json \
  --iam-account=legacy@tailspin-prod.iam.gserviceaccount.com
```

> **Exam trap.** If the workload runs on Google Cloud, attach a service account; if it runs on AWS, Azure, on-premises or in CI/CD, use Workload Identity Federation; for a human, use impersonation. A downloaded JSON key is correct only when none of these is possible, and then it should be rotated and stored securely.

<!-- section: gke-workload-identity | objectives: 4.2.7 -->
## Using a Google Cloud service account with a GKE application

Without configuration, Pods on GKE Standard nodes call Google APIs as the **node service account** (the Compute Engine default account unless you chose one): every Pod on the node shares it. Give nodes a minimal custom account with Kubernetes Engine Default Node Service Account (`roles/container.defaultNodeServiceAccount`), plus Artifact Registry Reader (`roles/artifactregistry.reader`) on the repositories they pull from, and give **each application** its own identity with **Workload Identity Federation for GKE**.

How it works: the cluster gets a workload pool `PROJECT_ID.svc.id.goog`; the GKE metadata server on each node exchanges the Pod's Kubernetes ServiceAccount token for a Google Cloud token. Autopilot clusters always have it enabled.

```bash
# Standard cluster: enable at creation, or later on an existing cluster, then on node pools
gcloud container clusters create prod-gke --region=europe-west1 \
  --workload-pool=tailspin-prod.svc.id.goog
gcloud container clusters update legacy-gke --region=europe-west1 \
  --workload-pool=tailspin-prod.svc.id.goog
gcloud container node-pools update apps --cluster=legacy-gke --region=europe-west1 \
  --workload-metadata=GKE_METADATA

gcloud container clusters get-credentials prod-gke --region=europe-west1
kubectl create namespace orders
kubectl create serviceaccount orders-ksa --namespace orders
```

Two ways to give the Kubernetes ServiceAccount access:

```bash
# Recommended: grant roles directly to the Kubernetes ServiceAccount principal
gcloud storage buckets add-iam-policy-binding gs://tailspin-invoices \
  --role=roles/storage.objectViewer \
  --member=principal://iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/tailspin-prod.svc.id.goog/subject/ns/orders/sa/orders-ksa

# Alternative (APIs not supported by direct access): link to an IAM service account
gcloud iam service-accounts add-iam-policy-binding \
  orders-api@tailspin-prod.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:tailspin-prod.svc.id.goog[orders/orders-ksa]"
kubectl annotate serviceaccount orders-ksa --namespace orders \
  iam.gke.io/gcp-service-account=orders-api@tailspin-prod.iam.gserviceaccount.com
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: orders
  namespace: orders
spec:
  serviceAccountName: orders-ksa
  nodeSelector:
    iam.gke.io/gke-metadata-server-enabled: "true"   # Standard only; Autopilot rejects it
  containers:
  - name: app
    image: europe-west1-docker.pkg.dev/tailspin-prod/apps/orders:1.4
```

- With the linking method, **both** the `roles/iam.workloadIdentityUser` binding and the annotation are required.
- `principalSet://.../tailspin-prod.svc.id.goog/namespace/orders` grants a role to every Pod of a namespace.
- The identity is namespace + ServiceAccount name in the project's pool: the same pair in another cluster of the same project gets the same access.

> **Exam trap.** Mounting a service account key as a Kubernetes Secret works but is not the recommended answer. "Without managing keys" on GKE means Workload Identity Federation for GKE.

<!-- section: workload-identity-federation | objectives: 4.2.8 -->
## Provisioning Workload Identity Federation

**Workload Identity Federation** lets workloads outside Google Cloud (AWS, Azure, on-premises with Active Directory or X.509 certificates, GitHub Actions, GitLab, any OIDC or SAML 2.0 provider) access Google Cloud with their own credentials, exchanged by the **Security Token Service** for a short-lived federated token. No service account key is created.

| Component | Role |
| --- | --- |
| Workload identity pool | Container of external identities, in a project; Google recommends one pool per environment |
| Provider | Trust relationship with one IdP (AWS account, OIDC issuer, SAML) |
| Attribute mapping | Maps token claims to Google attributes; `google.subject` is required (for example `google.subject=assertion.sub`); custom `attribute.NAME` values enable `principalSet://` bindings |
| Attribute condition | CEL expression that must be true for the credential to be accepted; **mandatory** for GitHub to restrict tokens to your organization |
| Access | **Direct resource access** (roles granted to `principal://` or `principalSet://` identifiers; recommended) or **service account impersonation** (`roles/iam.workloadIdentityUser` on the account) |

Required: Workload Identity Pool Admin (`roles/iam.workloadIdentityPoolAdmin`) and the IAM, Resource Manager, Service Account Credentials and Security Token Service APIs.

```bash
gcloud services enable iam.googleapis.com cloudresourcemanager.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com

gcloud iam workload-identity-pools create ci-pool --location="global" \
  --display-name="CI pipelines"

gcloud iam workload-identity-pools providers create-oidc github \
  --location="global" --workload-identity-pool="ci-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com/" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='tailspin'"

# Direct access for one repository
gcloud storage buckets add-iam-policy-binding gs://tailspin-artifacts \
  --role=roles/storage.objectAdmin \
  --member="principalSet://iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/ci-pool/attribute.repository/tailspin/web"

# Or impersonation of a deployer service account
gcloud iam service-accounts add-iam-policy-binding \
  deployer@tailspin-prod.iam.gserviceaccount.com --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/ci-pool/attribute.repository/tailspin/web"
```

For AWS, the provider takes the account ID (`providers create-aws ... --account-id=111122223333`, default mapping `google.subject=assertion.arn`). The external workload then uses a **credential configuration file**, which contains no secret, only where to read the external token and which provider and service account to use:

```bash
gcloud iam workload-identity-pools create-cred-config \
  projects/123456789012/locations/global/workloadIdentityPools/aws-pool/providers/aws-prod \
  --aws --output-file=gcp-credentials.json \
  --service-account=batch@tailspin-prod.iam.gserviceaccount.com
```

> **Exam trap.** **Workforce** Identity Federation is for **people** (employees signing in with Okta or Microsoft Entra ID to the console or gcloud, pools defined at the organization level). **Workload** Identity Federation is for **applications** outside Google Cloud. GKE Pods use Workload Identity Federation for GKE.

<!-- section: key-points -->
## Key points

- Three kinds: user-managed (yours), default (created for you, may get Editor: disable with `iam.automaticIamGrantsForDefaultServiceAccounts`), service agents (Google-managed, don't revoke their roles).
- One service account per application, predefined roles on the narrowest resource, role recommendations to trim.
- Attaching needs Service Account User on the account; a Compute Engine VM must be stopped to change it; prefer the `cloud-platform` scope and IAM.
- Grant Service Account User and Token Creator on the specific account, not on the project.
- Impersonation: Token Creator + `--impersonate-service-account`, `auth/impersonate_service_account` or ADC; both identities are logged.
- Access tokens last 1 hour by default (12 hours with the lifetime extension constraint); keys never expire by default and are a last resort.
- GKE: `--workload-pool=PROJECT_ID.svc.id.goog`, `GKE_METADATA` node pools, roles granted to the `principal://` identifier or a Workload Identity User link plus annotation.
- External workloads: pool + provider + attribute mapping and condition, then direct access or impersonation, with a credential configuration file and no key.
