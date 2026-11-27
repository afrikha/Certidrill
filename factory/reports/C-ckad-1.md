# C-ckad-1 — CKAD course, chapters 00-getting-started and 11-images-workloads (2026-11-27)

## Files written
- `content/ckad/course/chapters/00-getting-started.en.md` (about 1,150 words of prose, 6 sections)
- `content/ckad/course/chapters/11-images-workloads.en.md` (about 1,900 words of prose plus code, 9 sections; objectives 1.1.1–1.1.4, 1.2.1–1.2.4)

## Checks
- `npx tsx factory/check-cert.ts ckad 00-getting-started 11-images-workloads`: 0 problems in these chapters (31 for the other, still missing chapters).
- `npm run -s content:validate -- --cert ckad --course --chapters 00-getting-started,11-images-workloads`: course 0 problem(s) in these chapters. The same run reports 2 problems in question files of another agent (`ckad-1c-init-order-deployment.yaml`, `ckad-1c-init-populate-emptydir.yaml`: `body` missing); not touched.

## Sources fetched
LF CKAD page, LF "Important tips CKA & CKAD", "Resources allowed", "ExamUI performance based exams"; kubernetes.io: Images, Jobs, CronJob, Define a command and arguments, Pull an image from a private registry, Configure service accounts; kubectl reference pages for run, create deployment, create job, create cronjob, create secret docker-registry; kubectl source (`create_cronjob.go`, `create_job.go`, `create_deployment.go`) for generator defaults; docs.docker.com Dockerfile reference and `docker image save`; docs.podman.io `podman save` and `podman build`.

## Doubts and deviations
1. **"Skip and flag"**: the task asks for it, but no LF page (tips, ExamUI performance-based) documents a flag feature or task navigation. The chapter says "skip it, write down its number and come back" without claiming a flag button.
2. **Namespace in the task statement**: the tips page only says the infobox gives the SSH instructions; that each task names its namespace comes from the profile (`factory/profiles/ckad.md`).
3. **Job back-off cap**: the v1.37 Jobs page says recreation delays are "capped at ten minutes" (older pages said six). The chapter gives only "10 s, 20 s, 40 s..." and no cap.
4. **Docker default file name**: written as "`docker build .` looks for `Dockerfile`"; not verified whether recent Docker/BuildKit also auto-detects `Containerfile`.
5. **Dockerfile example** uses a `text` fence (no `dockerfile` language is allowed); `golang:1.25` and `gcr.io/distroless/static-debian12` are real public images but only illustrative.
6. **CronJob `timeZone` default** written as "controller's time zone" (kube-controller-manager's local time zone), from memory of the CronJob page; the fetched part did not quote the unset case.
7. No links in either chapter; `course.yaml` references left empty (file not mine).
