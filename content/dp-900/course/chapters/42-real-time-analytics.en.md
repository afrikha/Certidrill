Some data must be analyzed as it arrives: sensor readings, clicks, payments, logs. The exam asks you to tell batch processing from stream processing and to pick the Microsoft service that ingests, processes or shows streaming data.

<!-- section: batch-vs-stream | objectives: 4.2.1 -->
## Batch and stream processing

- **Batch processing**: records are collected and stored, then processed together in one operation. The batch starts on a schedule (every hour, every night), when a certain amount of data has arrived, or on another event.
- **Stream processing**: each new piece of data is processed as it arrives, in real time, without waiting for a batch.

| | Batch | Stream |
| --- | --- | --- |
| **Data scope** | All the data of the dataset | The most recent data, or a rolling time window (the last 30 seconds) |
| **Data size** | Large datasets, handled efficiently | Individual records or micro-batches of a few records |
| **Latency** | Typically a few hours | Seconds or milliseconds |
| **Analysis** | Complex analytics | Simple responses, aggregates, rolling averages |
| **Example** | Monthly credit card statement, nightly load of a data warehouse | Stock prices, fraud detection, smoke and heat sensors that trigger an alarm |

Latency is the time between the arrival of the data and the availability of the result. Batch processing handles large volumes at a convenient time, for example overnight, but all the input must be ready before the job starts and one error can stop the whole batch.

Most large-scale solutions **combine both**: stream processing feeds real-time dashboards and also writes its results to a data store, where they join batch-processed data for historical analysis. A common pattern for this combination is the **lambda architecture**. Streaming technology can also simply capture the data for later batch processing.

> **Exam trap.** Data that arrives continuously isn't necessarily processed as a stream. If the sales of the day are loaded and analyzed every night, it is batch processing: what decides is when the data is processed, on arrival or grouped, later.

<!-- section: stream-architecture | objectives: 4.2.1, 4.2.2 -->
## Elements of a stream processing solution

1. An **event** generates data: a sensor signal, a social media post, a log entry.
2. The data is captured in a **streaming source**. In more advanced solutions it is a queue, which makes sure that events are processed in order and that each one is processed only once.
3. A **perpetual query** runs on the incoming events: it selects, projects and aggregates values over time periods called **windows** (the number of readings per minute).
4. The results are written to an output, called a **sink**: a file, a database table, a real-time dashboard or another queue.

| Stage | Services |
| --- | --- |
| **Sources** | **Azure Event Hubs**: ingestion of high volumes of events; events within a partition are delivered in order, with at-least-once delivery. **Azure IoT Hub**: similar, optimized for Internet of Things (IoT) devices. **Apache Kafka**: open-source ingestion solution, often used with Spark. **Azure Data Lake Storage Gen2**: usually for batch, also usable as a streaming source |
| **Sinks** | Azure Event Hubs, to queue the results for further processing. Azure Data Lake Storage Gen2, OneLake or Azure Blob storage, to keep them as files. Azure SQL Database, Azure Databricks or Microsoft Fabric, to keep them in tables. **Power BI**, to show them in real time |

<!-- section: real-time-services | objectives: 4.2.2 -->
## Microsoft services for real-time analytics

**Real-Time Intelligence** is the workload of Microsoft Fabric for data in motion, from the arrival of the events to dashboards and automated actions.

| Component of Real-Time Intelligence | Role |
| --- | --- |
| **Real-Time hub** | Central catalog where the organization discovers and shares its data streams |
| **Eventstream** | Ingest, transform and route streaming events to destinations, without code |
| **Eventhouse** | Store event and time-series data in KQL databases, queried with Kusto Query Language (KQL) |
| **KQL queryset** | Write and run queries on the data of an eventhouse |
| **Real-Time Dashboard** | Visualize the live data |
| **Activator** | Trigger an action automatically, such as an alert, when the data meets a condition |

Two other technologies are named in the exam scope:

| Technology | What it is | Choose it when |
| --- | --- | --- |
| **Spark Structured Streaming** | Library of Apache Spark that reads a stream into a dataframe that keeps growing, queries it and writes the results to a sink. Available in **Azure Databricks** and Microsoft Fabric | You already process data with Spark and code; a Delta Lake table can receive the stream and serve batch queries at the same time |
| **Azure Stream Analytics** | Platform as a service (PaaS) in which a streaming job reads a source, applies a perpetual query and writes to an output | A standalone or hybrid streaming solution outside Fabric |

| Requirement | Answer |
| --- | --- |
| Receive high volumes of events from applications | Azure Event Hubs |
| Receive telemetry from IoT devices | Azure IoT Hub |
| Route streaming events without code in Microsoft Fabric | Eventstream |
| Query logs and time-series data with KQL | Eventhouse |
| Send an alert when a value crosses a threshold | Activator |
| Process a stream with Spark code | Spark Structured Streaming in Azure Databricks or Microsoft Fabric |

> **Exam tip.** Separate ingestion from processing. Event Hubs, IoT Hub and Kafka receive events; they don't analyze them. Eventhouse, Spark Structured Streaming and Azure Stream Analytics do.

<!-- section: key-points -->
## Key points

- Batch: data collected, then processed together, latency of hours, complex analysis on all the data.
- Stream: data processed on arrival, latency of seconds or milliseconds, aggregates over time windows.
- Architecture: event, streaming source, perpetual query, sink.
- Sources: Azure Event Hubs, Azure IoT Hub (IoT devices), Apache Kafka.
- Microsoft Fabric Real-Time Intelligence: Real-Time hub, Eventstream, Eventhouse (KQL), Real-Time Dashboard, Activator.
- Spark Structured Streaming: streaming with Spark in Azure Databricks or Microsoft Fabric. Azure Stream Analytics: PaaS streaming jobs outside Fabric.
