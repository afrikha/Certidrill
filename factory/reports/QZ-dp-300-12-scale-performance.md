# QZ-dp-300-12-scale-performance — end-of-chapter quiz

File: `content/dp-300/quizzes/12-scale-performance.yaml` (10 questions, `dp300-qz-12-01`..`10`, EN + FR, draft).
Check: `npx tsx factory/check-quiz.ts dp-300 12-scale-performance` → 0 problem(s), 0 warning(s).

Plan: 1 end of a scaling operation (1.2.1) · 2 sparse columns vs compression (1.2.5) · 3 MI GP log write cap → vCores (1.2.2) · 4 LOCK_ESCALATION = AUTO (1.2.4) · 5 Ebdsv5 for price-performance (1.2.3) · 6 elastic pool sizing formula (1.2.1) · 7 MI GP tempdb limit → Business Critical (1.2.2) · 8 VM settings per symptom, dragdrop (1.2.3) · 9 RANGE RIGHT / $PARTITION / split populated / TRUNCATE partitions, yes/no (1.2.4) · 10 heap PAGE compression and DML pages (1.2.5).
Bank questions of 1.2.1–1.2.5 were read first; no bank decision repeated with the same answer.

## Pages fetched (2026-11-24)
Scale resources (single database); MI resource limits; elastic pool overview; VM performance checklist; Data compression; Partitioned tables and indexes; ALTER PARTITION FUNCTION; TRUNCATE TABLE.

## Not verified on a fetched page (general knowledge, consistent with the chapter)
- Q4 distractors: `LOCK_ESCALATION = DISABLE` "prevents escalation in most cases"; RCSI doesn't help writer/writer blocking.
- Q10 distractor a: `ALTER INDEX ALL ... REBUILD` doesn't rebuild the heap itself.
- Q9: `$PARTITION` function (shown in the chapter, not on a fetched page).
- Q8: Accelerated Networking lowers latency and CPU used for networking; lock pages in memory prevents paging out of the buffer pool; IFI skips zeroing (the checklist only says to enable them); Write Accelerator for M-series log disks.

## Chapter issues (12-scale-performance) against current Learn (MI resource limits page)
- Managed Instance Business Critical storage: chapter says "up to 4 TB (16 TB with premium-series hardware)". Learn: standard-series 1–4 TB by vCores; premium-series 5.5 TB for 24–56 vCores, 5.5 TB or 16 TB depending on the region for 64–128 vCores.
- Log write throughput: chapter gives only 4.5 MiB/s per vCore (GP) and 16 MiB/s per vCore (BC). Learn also gives instance maxima (GP 120 MiB/s, BC 160 MiB/s standard-series / 192 MiB/s premium) and Next-gen GP 6 MiB/s per vCore, max 220 MiB/s.
- "Next-gen General Purpose sets IOPS and memory independently": Learn says flexible memory is GA on premium-series hardware for Next-gen General Purpose and Business Critical (not standard-series, not only NGP).
- VM checklist now also lists Easv7 and Msv3/Mdsv3 for memory-intensive workloads; portal deployment of a SQL VM with Premium SSD v2 is still marked preview. No error in the chapter.
