# QZ-dp-900-42-real-time-analytics — report

File: `content/dp-900/quizzes/42-real-time-analytics.yaml` (10 questions, EN + FR). Check: `npx tsx factory/check-quiz.ts dp-900 42-real-time-analytics` → 0 problem(s), 0 warning(s).

Objectives: 4.2.1 (q1, q4, q7, q9), 4.2.2 (q2, q3, q5, q6, q8, q10). Formats 6–10: single, yesno_statements, dragdrop, multi, hotarea.

## Sources fetched (Nov 2026)
Module "Explore fundamentals of real-time analytics" units 2, 3, 4, 5; What is Real-Time Intelligence?; Overview of Microsoft Fabric eventstreams; Eventhouse overview; What is Fabric Activator?; Introduction to Azure Stream Analytics (H1 "Welcome to Azure Stream Analytics", no retirement notice); DP-900 study guide (4.2 group "minor" change on July 21, 2026).

## Overlap with the mock exam
The bank has ~35 questions on 4.2.1–4.2.2. Close in theme: q5 s1 (Event Hubs as source and sink; Event Hubs as a sink also appears in `dp900-4b-rt-match-stages`), q8 (combines the decisions of `dp900-4b-rt-spark-streaming`, `-stream-analytics`, `-eventstream` in a three-team dragdrop), q6 (chain Eventstream → Eventhouse → Activator, each item tested alone in the bank). New facts tested: batch failure on one bad record (q4), ADLS Gen2 as a streaming source (q2), micro-batches are still streaming and event-triggered jobs can still be batches (q7).

## Doubts / to verify
- q10: Apache Kafka is the wrong component for "calculate clicks per window", following the chapter's exam tip and Learn ("open-source ingestion solution"). Kafka's ecosystem (Kafka Streams, ksqlDB) can process streams; an expert could object. If the reviewer prefers, swap it for Azure IoT Hub.
- q10: Activator rule "more than 10,000 clicks in a minute": Learn confirms threshold and pattern triggers and email actions; the per-minute count could also be computed upstream. Low risk.
- q6: Real-Time Dashboards can have alerts, but Learn implements them as Activator rules; the explanation says so.

## Chapter vs current Learn
- Learn unit 2 now describes the lambda architecture (and mentions delta and kappa as out of scope); the chapter teaches the combination without the name. Not tested.
- Learn unit 3: Event Hubs delivers events in order within a partition with at-least-once delivery; the chapter says a queue "keeps events in order" (fine). Learn adds that AI assistance in Real-Time Intelligence can generate KQL from natural language; not in the chapter.
- Learn's eventstream page lists a Spark Notebook destination (preview) and the SQL operator (preview); not used.
