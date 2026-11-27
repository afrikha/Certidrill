Once Compute Engine instances run, an Associate Cloud Engineer connects to them, lists and inspects them, and protects their disks with snapshots, images and schedules. Exam questions give a constraint (no external IP, Windows VM, OS Login enforced, keep 14 days of backups, share a golden image) and ask for the exact command, flag, firewall rule or IAM role.

<!-- section: connect-linux | objectives: 3.1.1 -->
## Connecting to Linux VMs with SSH

| Method | How | Key handling |
| --- | --- | --- |
| SSH-in-browser | Console, VM instances page, **SSH** button | Ephemeral key created for the session |
| `gcloud compute ssh` | Cloud Shell or a local Google Cloud CLI | Persistent key in `~/.ssh/google_compute_engine`, pushed for you |
| Third-party client (OpenSSH, PuTTY) | `ssh -i KEY user@EXTERNAL_IP` | You add the public key yourself (OS Login profile or metadata) |

```bash
gcloud compute ssh web-1 --zone=europe-west1-b
gcloud compute ssh web-1 --zone=europe-west1-b --tunnel-through-iap   # no external IP needed
gcloud compute ssh web-1 --zone=europe-west1-b --internal-ip          # from inside the VPC or over VPN
gcloud compute ssh web-1 --zone=europe-west1-b --command="sudo systemctl status nginx"
```

Two ways to authorize SSH keys:

| | OS Login (recommended) | Metadata-based SSH keys |
| --- | --- | --- |
| Enable | Metadata `enable-oslogin=TRUE` on the project or the instance | Default when OS Login is off |
| Who can log in | Decided by IAM roles; access disappears when the role or the account is removed | Anyone whose public key is in project or instance metadata |
| Linux user name | From the Google identity | The name given with the key |
| Keys | Stored in the user's OS Login profile (`gcloud compute os-login ssh-keys add`) | Stored in metadata `ssh-keys`; `block-project-ssh-keys=TRUE` ignores project-wide keys on one VM |
| 2-step verification | `enable-oslogin-2fa=TRUE` in addition to `enable-oslogin=TRUE` | Not available |

An instance-level `enable-oslogin=FALSE` overrides a project-level `TRUE`.

IAM roles for OS Login:

| Role | Grants |
| --- | --- |
| Compute OS Login (`roles/compute.osLogin`) | Log in as a standard user (no sudo) |
| Compute OS Admin Login (`roles/compute.osAdminLogin`) | Log in with sudo (root) |
| Service Account User (`roles/iam.serviceAccountUser`) on the VM's service account | Required for all users when the VM has a service account attached |
| Compute OS Login External User (`roles/compute.osLoginExternalUser`), on the organization | Users from another organization |
| IAP-secured Tunnel User (`roles/iap.tunnelResourceAccessor`) | Required to connect through IAP TCP forwarding |

Grant the OS Login role at the project level for console and `gcloud` SSH, or combine an instance-level grant with a project-level role that includes `compute.projects.get`.

> **Exam trap.** Removing a user's metadata key is not enough to revoke access if the key is also in project metadata. With OS Login, removing the IAM role revokes access everywhere: this is why OS Login is the recommended answer for "centrally manage and revoke Linux access".

<!-- section: connect-private-windows | objectives: 3.1.1 -->
## Private VMs, Windows VMs and the serial console

**VMs without an external IP address**:

| Option | When |
| --- | --- |
| IAP TCP forwarding | Default answer: no external IP, no bastion, access controlled by IAM |
| Bastion host | A hardened VM with an external IP in the same VPC; you hop through it |
| Cloud VPN or Cloud Interconnect | Administrators connect from on-premises to internal IPs (`--internal-ip`) |

IAP TCP forwarding requires a firewall rule allowing ingress from **`35.235.240.0/20`** on TCP 22 (SSH) or 3389 (RDP) to the VMs, and `roles/iap.tunnelResourceAccessor` for the user. IAP connects to the primary internal IPv4 address of `nic0`; if the VM has no external IP, `gcloud compute ssh` uses IAP automatically.

```bash
gcloud compute firewall-rules create allow-iap-ssh --network=prod-vpc \
  --direction=INGRESS --action=allow --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 --target-tags=iap-ssh
```

**Windows VMs** use RDP (TCP 3389). Generate or reset the local password, then connect with an RDP client (directly, or through an IAP tunnel to a local port):

```bash
gcloud compute reset-windows-password win-app-1 --zone=europe-west1-b --user=admin_ops
gcloud compute start-iap-tunnel win-app-1 3389 --local-host-port=localhost:3389 \
  --zone=europe-west1-b
```

**Serial console**: when SSH is broken (bad `sshd_config`, firewall inside the guest, failed boot), enable the interactive serial console with metadata `serial-port-enable=TRUE` and connect with `gcloud compute connect-to-serial-port VM`. For a read-only view of boot messages, use `gcloud compute instances get-serial-port-output VM`.

> **Exam tip.** "SSH times out" usually means the network path: check for a firewall rule allowing TCP 22 from your source (or from `35.235.240.0/20` for IAP). "Permission denied (publickey)" means authorization: OS Login role, key, or metadata.

<!-- section: view-instances | objectives: 3.1.2 -->
## Viewing running instances

The console's **VM instances** page lists instances of the selected project with status, zone, internal and external IPs; filter by label, status or zone and add columns. From the CLI:

```bash
gcloud compute instances list                                  # all zones of the current project
gcloud compute instances list --filter="status=RUNNING"
gcloud compute instances list --filter="labels.env=prod AND status=RUNNING" \
  --format="table(name,zone.basename(),machineType.basename(),status)"
gcloud compute instances list --zones=europe-west1-b,europe-west1-c --project=example-prod
gcloud compute instances describe web-1 --zone=europe-west1-b \
  --format="value(networkInterfaces[0].networkIP)"
```

| Need | Command or place |
| --- | --- |
| Instances of another project without changing your configuration | `--project=PROJECT_ID` |
| Make a project the default for later commands | `gcloud config set project PROJECT_ID` |
| Full configuration of one VM (disks, metadata, service account, scheduling) | `gcloud compute instances describe` |
| Machine-readable output for a script | `--format="value(...)"`, `--format=json` |
| Instances of a managed instance group | `gcloud compute instance-groups managed list-instances MIG --region=REGION` |
| CPU and memory utilization over time | Console Observability tab of the VM or Cloud Monitoring (memory requires the Ops Agent) |
| Every VM across all projects of the organization | Cloud Asset Inventory (`gcloud asset search-all-resources --scope=organizations/ORG_ID --asset-types=compute.googleapis.com/Instance`) |

Instance states to recognize: `PROVISIONING`, `STAGING`, `RUNNING`, `STOPPING`, `TERMINATED` (stopped: no vCPU or memory charges, disks and static IPs still billed), `SUSPENDED`.

<!-- section: snapshots | objectives: 3.1.3 -->
## Disk snapshots

A snapshot is a point-in-time backup of one disk. Snapshots are **incremental**: the first is full, the next ones store only changed blocks and reference earlier snapshots.

```bash
gcloud compute snapshots create web-1-boot-20261127 \
  --source-disk=web-1 --source-disk-zone=europe-west1-b \
  --storage-location=europe-west1
gcloud compute disks snapshot data-disk-1 --zone=europe-west1-b   # equivalent, from the disk
gcloud compute snapshots list --filter="sourceDisk~web-1"
gcloud compute snapshots delete web-1-boot-20261127
gcloud compute disks create web-1-restored --source-snapshot=web-1-boot-20261127 \
  --zone=europe-west1-c
```

| Type | Stored | Typical use |
| --- | --- | --- |
| Standard snapshot | Multi-region (default: the one closest to the disk) or a region you choose; survives deletion of the source disk | Backups, restore into another zone or region |
| Archive snapshot (`--snapshot-type=ARCHIVE`) | Same durability, lower storage cost; cannot be created by a schedule | Long-term retention, compliance |
| Instant snapshot (`gcloud compute instant-snapshots create`) | Same zone or region as the disk, not redundant; deleted with the disk | Fast local restore point before a risky change |

Facts the exam uses:

- Deleting a snapshot never breaks the others: data still needed is moved into the next snapshot. To remove all data of a disk, delete all its snapshots.
- You cannot change the storage location of an existing snapshot: create a new one and delete the old one.
- A disk can be snapshotted at most 6 times per 60 minutes.
- For application-consistent backups of a running VM, pause writes (or stop the VM) before the snapshot; on Windows VMs, `--guest-flush` asks the guest OS (VSS) to prepare.
- Snapshots of a CMEK-protected disk are encrypted with the same key.

<!-- section: snapshot-schedules | objectives: 3.1.3 -->
## Snapshot schedules

A snapshot schedule is a **resource policy** in the **same region** as the disks it is attached to.

```bash
gcloud compute resource-policies create snapshot-schedule daily-14d \
  --region=europe-west1 --start-time=02:00 --daily-schedule \
  --max-retention-days=14 --on-source-disk-delete=keep-auto-snapshots \
  --storage-location=europe-west1
gcloud compute disks add-resource-policies data-disk-1 \
  --resource-policies=daily-14d --zone=europe-west1-b
gcloud compute disks create data-disk-2 --size=200GB --zone=europe-west1-b \
  --resource-policies=daily-14d
gcloud compute disks remove-resource-policies data-disk-1 \
  --resource-policies=daily-14d --zone=europe-west1-b
gcloud compute resource-policies delete daily-14d --region=europe-west1
```

| Setting | Rule |
| --- | --- |
| Start time | UTC, on the hour (`02:00`; `02:13` is rejected) |
| Frequency | One of `--hourly-schedule=N` (1–23), `--daily-schedule`, `--weekly-schedule=sunday`, or `--weekly-schedule-from-file` for several days |
| Retention | `--max-retention-days` (1 or more) is mandatory with `gcloud` and the console |
| Source disk deleted | `keep-auto-snapshots` (default) keeps the snapshots; `apply-retention-policy` keeps applying retention |
| Change a schedule | `gcloud compute resource-policies update snapshot-schedule` (schedule, retention, description, labels) |
| Delete a schedule | Detach it from every disk first |
| CSEK-encrypted disks (CSEK is deprecated for Compute Engine) | Cannot use snapshot schedules |

> **Exam trap.** A schedule in `us-central1` cannot be attached to a disk in `europe-west1-b`: create a schedule in each region. And attaching a schedule needs `compute.disks.addResourcePolicies` plus `compute.resourcePolicies.use`.

<!-- section: images | objectives: 3.1.3 -->
## Custom images and machine images

A **custom image** is a bootable template for new disks (golden image). Sources: a disk, a snapshot, another image (including one shared from another project), or a compressed RAW file in Cloud Storage.

```bash
gcloud compute instances stop web-1 --zone=europe-west1-b
gcloud compute images create web-golden-v3 \
  --source-disk=web-1 --source-disk-zone=europe-west1-b \
  --family=web-golden --storage-location=eu
gcloud compute instances create web-7 --zone=europe-west1-d \
  --image-family=web-golden --image-project=example-images
gcloud compute images deprecate web-golden-v2 --state=DEPRECATED --replacement=web-golden-v3
gcloud compute images list --no-standard-images
gcloud compute images delete web-golden-v1
```

| Fact | Detail |
| --- | --- |
| Image from a disk attached to a running VM | Refused by default; stop the VM (recommended) or use `--force` after pausing writes and running `sync` |
| Image family | Points to the newest non-deprecated image of the family: `--image-family` always gets the latest |
| Deprecation states | `ACTIVE`, `DEPRECATED` (works, with a warning), `OBSOLETE` (new uses fail), `DELETED` (new uses fail; the image still exists until you delete it) |
| Share with another project | Grant Compute Image User (`roles/compute.imageUser`) on the image or the image project; users pass `--image-project`. For a MIG that uses the image, also grant it to the Google APIs Service Agent of the MIG's project (`PROJECT_NUMBER@cloudservices.gserviceaccount.com`) |
| Rate | One image per disk every 10 minutes (bursts up to 6 in 60 minutes) |
| Location | Region or multi-region (default: closest multi-region); recreate the image to move it |

| Need | Use |
| --- | --- |
| Back up one disk every night, restore data | Snapshot schedule |
| Standard OS build reused by many VMs and MIG instance templates | Custom image in an image family |
| Back up or clone a whole VM: all disks, machine type, metadata, labels | Machine image (`gcloud compute machine-images create NAME --source-instance=VM`) |
| Quick rollback point minutes before a patch, same zone | Instant snapshot |
| Keep backups for 7 years at the lowest cost | Archive snapshots |

> **Exam tip.** Point MIG instance templates at an **image family**, not a fixed image name: a new image in the family is picked up by new instances and rolling updates without editing the template's image reference.

<!-- section: key-points -->
## Key points

- `gcloud compute ssh` manages keys for you; add `--tunnel-through-iap` for private VMs, with ingress from `35.235.240.0/20` and `roles/iap.tunnelResourceAccessor`.
- OS Login (`enable-oslogin=TRUE`) ties SSH to IAM: `compute.osLogin` (user) or `compute.osAdminLogin` (sudo), plus `iam.serviceAccountUser` when the VM has a service account.
- Windows: RDP on 3389 and `gcloud compute reset-windows-password`; broken SSH: serial console.
- `gcloud compute instances list --filter=... --format=...` and `describe` for inventory; Cloud Asset Inventory across projects.
- Snapshots are incremental and safe to delete individually; schedules are regional resource policies attached to disks.
- Images build new disks (use image families, deprecate old images); machine images capture a whole VM.
