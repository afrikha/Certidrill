# QZ-gcp-ace-31-manage-vms — report

File: `content/gcp-ace/quizzes/31-manage-vms.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-ace 31-manage-vms` → 0 problem(s), 0 warning(s).

Objectives: 3.1.1 (q1, q5, q7, q10), 3.1.2 (q3, q6), 3.1.3 (q2, q4, q8, q9). Positions 6–10: two `single` + three `multi` (q8 choose two, q9 and q10 choose three). No NOTE sentence: `blueprint.scoring` scores `multi` all or nothing.

## Verified on docs.cloud.google.com (2026-11-27)

- Set up OS Login: roles (osLogin / osAdminLogin, serviceAccountUser on the VM's service account, osLoginExternalUser), instance-level grants need a project-level role with `compute.projects.get` for console or gcloud SSH, instance `enable-oslogin=FALSE` overrides project TRUE, metadata keys no longer accepted once OS Login is on.
- About archive and standard disk snapshots: deletion moves needed data into the next snapshot; archive snapshots can't be created by schedules; instant snapshots deleted with the source disk; snapshot storage location can't be changed.
- Create schedules for disk snapshots: same region as the disk, start time on the hour (UTC), `--on-source-disk-delete` values and default `keep-auto-snapshots`, retention ≥ 1, no CSEK, attach permissions.
- Machine images: captured properties and the comparison table (multi-disk backup only with machine images; instance templates hold no disk data).
- Manage access to custom images: `roles/compute.imageUser` on an image or a project.
- Viewing serial port output / Troubleshooting using the serial console: `get-serial-port-output` (read-only, last 1 MB), `serial-port-enable`, `compute.disableSerialPortAccess`.
- View information about MIGs and managed instances: `list-instances` columns (STATUS, HEALTH_STATE, ACTION, INSTANCE_TEMPLATE, VERSION_NAME, LAST_ERROR).
- Commands and flags checked with the local gcloud 570.0.0 `--help` (instances list `--zones`, global `--project`, `instance-groups list-instances`, `instance-groups managed list-instances`/`describe`, `instances create --image-family/--image-project`, `resource-policies create snapshot-schedule --on-source-disk-delete`).

## Doubts and unverified facts

- q5: the pages fetched don't say outright that `get-serial-port-output` stays allowed under `compute.disableSerialPortAccess`. They describe that constraint as blocking interactive access, and describe reading output as a separate, read-only API. I relied on that and did not find an explicit statement.
- q6: the generic `gcloud compute instance-groups list-instances` output (name, zone, status only) comes from my knowledge of the API. The help text doesn't list its columns.
- q1: the requirement that `enable-oslogin-2fa` is used together with `enable-oslogin=TRUE` comes from the chapter. I didn't re-quote it from the page.

## Chapter (`31-manage-vms.en.md`) against current docs

- No errors found in the parts I checked.
- Facts not mentioned in the chapter but useful (not used in the quiz): a MIG that uses an image from another project needs `roles/compute.imageUser` for the Google APIs Service Agent (`PROJECT_NUMBER@cloudservices.gserviceaccount.com`) of the MIG's project (Manage access to custom images). The chapter's image-sharing row only covers users. Consider adding it.
- Not verified (not used in the quiz): "6 snapshots per disk per 60 minutes", "one image per disk every 10 minutes", the `DELETED` deprecation-state behaviour, and the exam tip that rolling updates pick up a new family image without editing the template.
- Mock question `gcpace-3a-compute-viewer-role` offers "Reader (`roles/reader`)" as a basic role. That matches the profile's new basic-role names. Just check that it is consistent with the rest of the bank.
