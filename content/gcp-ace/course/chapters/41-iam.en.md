Identity and Access Management (IAM) decides who can do what on which Google Cloud resource. Associate Cloud Engineer questions are practical: which predefined role to grant, at which level of the hierarchy, with which `gcloud` command, and why a user still has (or lacks) access after a change. This chapter covers allow policies, inheritance through the organization hierarchy, the three role types and custom roles.

<!-- section: allow-policies | objectives: 4.1.1 -->
## Viewing and creating IAM policies

An **allow policy** (often just "IAM policy") is attached to a resource: an organization, a folder, a project, or a resource that supports its own policy (a Cloud Storage bucket, a Pub/Sub topic, a service account, a BigQuery dataset...). It contains **role bindings**: each binding gives one role to a list of principals, optionally with a condition.

```json
{
  "bindings": [
    {
      "role": "roles/storage.objectViewer",
      "members": [
        "group:analysts@example.com",
        "serviceAccount:reporting@tailspin-prod.iam.gserviceaccount.com"
      ]
    },
    {
      "role": "roles/compute.instanceAdmin.v1",
      "members": ["user:ana@example.com"],
      "condition": {
        "title": "until-end-of-2026",
        "expression": "request.time < timestamp('2027-01-01T00:00:00Z')"
      }
    }
  ],
  "etag": "BwYJx1aBcDE=",
  "version": 3
}
```

Principal identifiers used in `--member`:

| Identifier | Principal |
| --- | --- |
| `user:ana@example.com` | A Google Account (Cloud Identity or Google Workspace user, or a consumer account) |
| `group:analysts@example.com` | A Google group: the recommended way to grant access to people |
| `serviceAccount:app@PROJECT_ID.iam.gserviceaccount.com` | A service account |
| `domain:example.com` | Every account of a Cloud Identity or Workspace domain |
| `allUsers` / `allAuthenticatedUsers` | Anyone on the internet / anyone signed in with a Google identity (public access) |
| `principal://...` and `principalSet://...` | Federated identities: workforce pools, workload identity pools, GKE workloads |

In organizations created on or after 2024-05-03, the default configuration of the managed constraint `iam.managed.allowedPolicyMembers` blocks granting roles to `allUsers` and `allAuthenticatedUsers`: making a bucket or service public there first needs an organization policy change.

**Creating and changing bindings.** For one binding, use `add-iam-policy-binding` / `remove-iam-policy-binding` on the resource type: `projects`, `resource-manager folders`, `organizations`, and many resource-level groups (`gcloud storage buckets`, `gcloud iam service-accounts`, `gcloud pubsub topics`...).

```bash
# Grant a predefined role to a group on a project
gcloud projects add-iam-policy-binding tailspin-prod \
  --member="group:analysts@example.com" --role="roles/bigquery.dataViewer"

# Temporary access with an IAM condition (expression and title are required)
gcloud projects add-iam-policy-binding tailspin-prod \
  --member="user:ana@example.com" --role="roles/compute.instanceAdmin.v1" \
  --condition='expression=request.time < timestamp("2027-01-01T00:00:00Z"),title=until-end-of-2026'

# Revoke it
gcloud projects remove-iam-policy-binding tailspin-prod \
  --member="user:ana@example.com" --role="roles/compute.instanceAdmin.v1" --all

# Same pattern on a folder, an organization, a bucket
gcloud resource-manager folders add-iam-policy-binding 123456789012 \
  --member="group:netops@example.com" --role="roles/compute.networkAdmin"
gcloud organizations add-iam-policy-binding 987654321098 \
  --member="group:sec@example.com" --role="roles/iam.securityReviewer"
gcloud storage buckets add-iam-policy-binding gs://tailspin-invoices \
  --member="serviceAccount:billing@tailspin-prod.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

For many changes at once, use **read-modify-write**: `get-iam-policy` to a file, edit the bindings, `set-iam-policy` with the file. The `etag` field is an optimistic lock: IAM rejects the write if the policy changed since it was read, so never delete or edit the etag.

```bash
gcloud projects get-iam-policy tailspin-prod --format=json > policy.json
# edit policy.json (keep the etag), then:
gcloud projects set-iam-policy tailspin-prod policy.json
```

> **Exam trap.** `set-iam-policy` **replaces** the whole policy. A file that contains only the new binding removes every other binding of the project. To add one role, `add-iam-policy-binding` is the safe answer.

**Viewing access.**

| Need | Tool |
| --- | --- |
| Who has which role on a project (direct bindings) | Console **IAM & Admin > IAM** (view by principals or by roles), or `gcloud projects get-iam-policy` |
| Policies of the project **and its ancestors** (folders, organization) | `gcloud projects get-ancestors-iam-policy PROJECT_ID` (add `--include-deny` for deny policies) |
| Which resources a principal can access, across the organization | Policy Analyzer: `gcloud asset analyze-iam-policy --organization=ORG_ID --identity="user:ana@example.com"` |
| Why a principal does or doesn't have a permission on a resource | Policy Troubleshooter: `gcloud policy-troubleshoot iam RESOURCE --principal-email=... --permission=...` |
| Search bindings by member or role in a scope | `gcloud asset search-all-iam-policies --scope=projects/PROJECT_ID --query="policy:ana@example.com"` |

`get-iam-policy` returns only the bindings attached to that resource, never the inherited ones. The console IAM page shows inherited roles with their source.

```bash
gcloud policy-troubleshoot iam \
  //cloudresourcemanager.googleapis.com/projects/tailspin-prod \
  --principal-email=ana@example.com \
  --permission=compute.instances.start
```

IAM Conditions (Common Expression Language) restrict a binding by date and time (`request.time`), resource name (`resource.name.startsWith(...)`), resource type or service, or tags. Conditions can't be used with the legacy basic roles (Owner, Editor, Viewer) nor with `allUsers` / `allAuthenticatedUsers`. A conditional binding doesn't override an unconditional binding of the same role. Google recommends no more than 100 conditional role bindings in one allow policy (a best practice, not a hard limit).

Policy changes usually take effect within 2 minutes, sometimes 7 minutes or more.

<!-- section: inheritance | objectives: 4.1.2 -->
## Policy inheritance in the organization hierarchy

```text
Organization (example.com)          roles granted here apply to everything below
├── Folder: Production
│   ├── Project: tailspin-prod
│   │   ├── Bucket gs://tailspin-invoices   (resource-level policy)
│   │   └── VM web-1
│   └── Project: payments-prod
└── Folder: Development
    └── Project: tailspin-dev
```

Rules the exam tests:

1. The **effective policy** of a resource is the **union** of its own policy and the policies of all its ancestors. Roles only add up.
2. A role granted at a higher level **can't be revoked lower down**: removing nothing at the project level takes away a role inherited from the folder. Remove the binding where it was made, or use a deny policy.
3. A less restrictive parent policy always wins over a more restrictive child policy, because there is no "restrict" in an allow policy.
4. When a project is **moved** to another folder, it loses the roles inherited from the old folder and gains those of the new one. Its own bindings stay.
5. Grant at the **narrowest level** that covers what is needed now and later:

| Requirement | Where to grant |
| --- | --- |
| One bucket, one topic, one service account | The resource itself (resource-level policy) |
| All resources of one project | The project |
| All projects of a department or environment, including projects created later | Its folder |
| Every project in the company (security auditors, network admins) | The organization |

Who can change policies at each level:

| Level | Role that can set the allow policy |
| --- | --- |
| Project | Project IAM Admin (`roles/resourcemanager.projectIamAdmin`) |
| Folder | Folder Admin (`roles/resourcemanager.folderAdmin`) |
| Organization | Organization Admin (`roles/resourcemanager.organizationAdmin`) |
| Almost any resource | Security Admin (`roles/iam.securityAdmin`) |

**Deny policies** are the exception to "roles only add up". They attach to an organization, folder or project, are inherited like allow policies, and IAM checks them **before** allow policies: a denied permission is refused whatever roles the principal holds, unless the principal is listed in `exceptionPrincipals`. Permissions are written in the `SERVICE_FQDN/RESOURCE.ACTION` form. Managing them requires Deny Admin (`roles/iam.denyAdmin`), granted on the organization; the basic Admin and Owner roles don't include it. Deny Reviewer (`roles/iam.denyReviewer`) only views them.

```bash
gcloud iam policies create deny-role-deletion \
  --attachment-point=cloudresourcemanager.googleapis.com/projects/tailspin-prod \
  --kind=denypolicies --policy-file=deny.json
```

```json
{
  "displayName": "Only the security team deletes custom roles",
  "rules": [
    {
      "denyRule": {
        "deniedPrincipals": ["principalSet://goog/public:all"],
        "exceptionPrincipals": ["principalSet://goog/group/sec@example.com"],
        "deniedPermissions": ["iam.googleapis.com/roles.delete"]
      }
    }
  ]
}
```

> **Exam trap.** Organization policies (`gcloud org-policies`, constraints such as `iam.allowedPolicyMemberDomains` or `compute.vmExternalIpAccess`) restrict **what configurations are allowed**, not who can act. To stop a user from deleting VMs, the answer is IAM (remove the role, or a deny policy), not an organization policy constraint.

> **Exam tip.** If a stem says a user "still has access after you removed the role from the project", look for an inherited binding on a folder or the organization, or membership in a group that holds the role.

<!-- section: role-types | objectives: 4.1.3 -->
## Basic, predefined and custom roles

A **role** is a collection of permissions named `service.resource.verb` (for example `compute.instances.start`, `storage.objects.get`). You never grant a permission directly, only roles.

| Type | Examples | What to know |
| --- | --- | --- |
| Basic roles | Reader (`roles/reader`), Writer (`roles/writer`), Admin (`roles/admin`) | Very broad, across all services. Writer includes Reader plus state changes; Admin adds sensitive tasks such as managing roles and permissions and setting up billing for the project. Support IAM Conditions |
| Legacy basic roles | Viewer (`roles/viewer`), Editor (`roles/editor`), Owner (`roles/owner`) | The former primitive roles, still available. Same structure (Viewer in Editor in Owner). No IAM Conditions. Owner can't be granted with `gcloud` to a user outside the organization (console invitation only) |
| Predefined roles | `roles/storage.objectViewer`, `roles/compute.instanceAdmin.v1`, `roles/container.developer` | Created and maintained by Google per service; Google adds new permissions automatically. The default choice |
| Custom roles | `projects/tailspin-prod/roles/vmOperator` | Your own list of permissions, when no predefined role is narrow enough |

Google's guidance: don't grant basic roles in production unless there is no alternative; when one is unavoidable (sandbox, test project), prefer Admin, Writer and Reader to the legacy roles. Neither Admin nor Owner includes changing billing payment information or creating deny policies.

Predefined roles that appear often in Associate questions:

| Need | Role |
| --- | --- |
| Read objects in a bucket / full control of objects / manage buckets | `roles/storage.objectViewer` / `roles/storage.objectAdmin` / `roles/storage.admin` |
| Run BigQuery queries / read tables / edit tables | `roles/bigquery.jobUser` / `roles/bigquery.dataViewer` / `roles/bigquery.dataEditor` |
| Manage VM instances (not networks, not IAM) | `roles/compute.instanceAdmin.v1` |
| Manage networks, subnets, routes, load balancers (not firewall rules or SSL certificates) | `roles/compute.networkAdmin` |
| Manage firewall rules and SSL certificates | `roles/compute.securityAdmin` |
| Deploy workloads in GKE clusters | `roles/container.developer` |
| Read logs / also read Data Access audit logs | `roles/logging.viewer` / `roles/logging.privateLogViewer` |
| Read all IAM policies for an audit, change nothing | `roles/iam.securityReviewer` |
| Browse the hierarchy without seeing resources | `roles/browser` |
| Manage the IAM policy of a project | `roles/resourcemanager.projectIamAdmin` |

> **Exam trap.** "Give the team access to read Cloud Storage objects" is never answered with Viewer or Reader: they cover every service of the project. Choose the predefined role of the service, at the bucket or project level.

To list the permissions of a role or the roles grantable on a resource:

```bash
gcloud iam roles describe roles/compute.instanceAdmin.v1
gcloud iam list-grantable-roles //cloudresourcemanager.googleapis.com/projects/tailspin-prod
```

<!-- section: custom-roles | objectives: 4.1.3 -->
## Defining custom roles

Create a custom role when a predefined role grants too much (least privilege) and no narrower predefined role exists.

| Property | Value |
| --- | --- |
| Where it is defined | An **organization** or a **project**, never a folder (define it at the organization to use it in a folder) |
| Where it can be granted | Only in the project or organization where it was created (an organization-level role can be granted on any folder or project of that organization) |
| Name | `projects/PROJECT_ID/roles/ROLE_ID` or `organizations/ORG_ID/roles/ROLE_ID`; the role ID can't be changed |
| Limits | 300 custom roles per organization and 300 per project; up to 3,000 permissions per role; no `*` wildcard |
| Permissions | Only permissions whose custom-role support level isn't `NOT_SUPPORTED`; `TESTING` permissions are not for production; project-level roles can't include organization-only permissions such as `resourcemanager.organizations.get` |
| Launch stage | `ALPHA`, `BETA`, `GA`, `DEPRECATED`, `DISABLED` (and `EAP`): informational, except `DISABLED`, which inactivates the role's bindings |
| Required role | Role Administrator (`roles/iam.roleAdmin`) on the project, Organization Role Administrator (`roles/iam.organizationRoleAdmin`) on the organization |

A custom role is a static list: unlike a predefined role, it doesn't receive new permissions when Google adds them, so you maintain it.

```yaml
# vm-operator.yaml
title: VM Operator
description: Start, stop and reset Compute Engine instances.
stage: GA
includedPermissions:
- compute.instances.get
- compute.instances.list
- compute.instances.start
- compute.instances.stop
- compute.instances.reset
```

```bash
# Which permissions can go in a custom role on this project
gcloud iam list-testable-permissions \
  //cloudresourcemanager.googleapis.com/projects/tailspin-prod \
  --filter="customRolesSupportLevel!=NOT_SUPPORTED"

# Create from a file, or from flags
gcloud iam roles create vmOperator --project=tailspin-prod --file=vm-operator.yaml
gcloud iam roles create auditReader --organization=987654321098 \
  --title="Audit Reader" --permissions="logging.logEntries.list,logging.logs.list" \
  --stage=GA

# Start from a predefined role, then trim it
gcloud iam roles copy --source="roles/compute.instanceAdmin.v1" \
  --destination=vmAdminLite --dest-project=tailspin-prod

# Change, disable, delete, restore
gcloud iam roles update vmOperator --project=tailspin-prod \
  --add-permissions=compute.instances.suspend
gcloud iam roles update vmOperator --project=tailspin-prod --stage=DISABLED
gcloud iam roles delete vmOperator --project=tailspin-prod
gcloud iam roles undelete vmOperator --project=tailspin-prod
gcloud iam roles list --project=tailspin-prod --show-deleted

# Grant it: use the full custom role name
gcloud projects add-iam-policy-binding tailspin-prod \
  --member="group:night-ops@example.com" \
  --role="projects/tailspin-prod/roles/vmOperator"
```

`update` uses the etag (read-modify-write): `--add-permissions` and `--remove-permissions` change the list, `--permissions` replaces it entirely, and `--file` takes an edited `describe` output that keeps its etag.

Deleting a role: its bindings stay in policies but are inactive, and it can't be used in new bindings. You can **undelete it within 7 days** (bindings become active again). After that it is scheduled for permanent deletion 7 to 14 days after the request, a process that takes 30 days; its role ID can be reused only once that permanent deletion is complete, up to 44 days after the deletion request.

> **Exam trap.** A custom role created in project A can't be granted in project B. To share one definition across projects, create it at the **organization** level, not at the folder level, which doesn't support custom roles.

> **Exam tip.** Only a few trusted administrators should hold Role Administrator: anyone who can edit a custom role can add any permission to it.

<!-- section: key-points -->
## Key points

- An allow policy = bindings (role + members + optional condition) + etag, attached to an organization, folder, project or resource.
- `add-iam-policy-binding` for one change; `set-iam-policy` replaces the whole policy and needs the current etag.
- `get-iam-policy` shows direct bindings only; `get-ancestors-iam-policy`, the console, Policy Analyzer and Policy Troubleshooter show the rest.
- Effective access = union of the resource's policy and all ancestors'; a lower level can't revoke an inherited role; only deny policies, checked first, take permissions away.
- Basic roles (Admin/Writer/Reader, legacy Owner/Editor/Viewer) are too broad for production; predefined roles are the default; custom roles for least privilege when nothing narrower exists.
- Custom roles live in an organization or a project (never a folder), are granted only inside it, and can be undeleted within 7 days.
