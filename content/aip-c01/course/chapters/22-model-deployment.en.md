Deploying a foundation model means choosing where the model runs and how capacity is bought: serverless on-demand calls to Amazon Bedrock, reserved or provisioned Bedrock capacity, a custom model deployed into Bedrock, or a container on an Amazon SageMaker AI endpoint that you size yourself. Questions describe a traffic profile (spiky, steady, overnight bulk, latency-critical), a model (managed, fine-tuned, open-weight, imported) and a constraint (cost, latency, GPU memory, startup time), and the answer is the deployment option whose limits fit. LLMs add problems that classic ML endpoints never had: weights of tens or hundreds of gigabytes, GPU memory that holds the KV cache as well as the weights, throughput measured in tokens rather than requests, and start-up times measured in minutes.

<!-- section: deployment-options | objectives: 2.2.1 -->
## Matching the deployment option to the application

Amazon Bedrock offers several ways to run inference on the same model, each with a different capacity and billing model:

| Option | Capacity and billing | Choose it when |
| --- | --- | --- |
| On-demand (Standard tier) | Shared capacity, price per input and output token, account quotas in tokens and requests per minute | Default for interactive applications with variable traffic |
| Priority tier (`service_tier` `priority`) | Request-level prioritization, premium over on-demand price, no reservation | Customer-facing calls that need the fastest responses without a 24x7 reservation |
| Flex tier (`flex`) | Discounted price, longer processing times | Evaluations, summarization and agentic workloads that tolerate delay |
| Reserved tier (`reserved`) | Input and output tokens-per-minute reserved for 1 or 3 months (minimum 100,000 input TPM and 10,000 output TPM), fixed monthly price, overflow goes to Standard; through the AWS account team | Mission-critical workloads that cannot tolerate throttling (99.5 % uptime target) |
| Cross-Region inference profile | On-demand capacity spread over the Regions of a geographic profile, or of all commercial Regions for a global profile; no extra routing cost, global about 10 % cheaper | Throughput bursts and models offered only through a profile; geographic profile when data must stay in a geography |
| Batch inference | Prompts in files in Amazon S3, results written to S3 asynchronously, discounted for supported models | Large offline datasets: nightly summaries, classification of an archive |
| Provisioned Throughput | Model units (MUs), each a fixed number of input and output tokens per minute; hourly billing; no commitment, 1 month or 6 months | Steady high volume on one model, or a custom model that must have dedicated capacity |

The tier is selected per request with the optional `service_tier` field (`reserved`, `priority`, `default`, `flex`); omitting it means Standard. On-demand quota is shared by Priority, Standard and Flex, while Reserved capacity is separate. CloudWatch metrics carry a `ResolvedServiceTier` dimension that shows the tier that actually served each request.

**Provisioned Throughput** is purchased with `CreateProvisionedModelThroughput`. Omit `commitmentDuration` for a no-commitment purchase (deletable at any time; available for custom models and for some base models); `OneMonth` and `SixMonths` cost less per hour but can't be deleted before the end of the term. Accounts have no model units for committed purchases by default: request them first through AWS Support. The returned `provisionedModelArn` is passed as `modelId` in `InvokeModel` or `Converse`.

```bash
aws bedrock create-provisioned-model-throughput \
  --provisioned-model-name claims-summarizer-pt \
  --model-id arn:aws:bedrock:us-east-1:111122223333:custom-model/claims-ft-v3 \
  --model-units 2 \
  --commitment-duration OneMonth
```

**Custom models** (fine-tuned or distilled in Bedrock) are served in one of two ways: Provisioned Throughput (dedicated capacity, consistent latency) or a **custom model deployment** for on-demand inference, invoked through the deployment ARN, where you pay only for usage. Open-weight models customized elsewhere enter Bedrock through **Custom Model Import** (Hugging Face `.safetensors` weights in S3; architectures such as Llama, Mistral, Mixtral, Qwen, GPT-OSS; text models under 200 GB, multimodal under 100 GB; context under 128K; no embedding models; not usable with batch inference) and are then called on demand with `InvokeModel` or `InvokeModelWithResponseStream`.

**Lambda for on-demand invocation.** The common serverless pattern is API Gateway or an event source, then an AWS Lambda function that calls the Bedrock Runtime API with the AWS SDK under its execution role. Create the SDK client outside the handler so warm invocations reuse connections, keep the model ID in configuration rather than code, and set the function timeout above the longest expected generation. Lambda adds no GPU and no model hosting: the model runs in Bedrock, so Lambda is the right compute for orchestration, not for serving weights.

> **Exam trap.** Provisioned Throughput is not a cure for occasional throttling. Spiky traffic that exceeds the on-demand quota is solved first with a cross-Region inference profile, retries with backoff and a quota increase; Provisioned Throughput fits steady, predictable volume. Also note that inference profiles don't support Provisioned Throughput, and batch inference isn't supported for provisioned models.

<!-- section: hybrid-endpoints | objectives: 2.2.1 -->
## Hybrid deployments with SageMaker AI endpoints

A hybrid solution keeps managed models on Bedrock and hosts what Bedrock can't serve on SageMaker AI: a proprietary model, an open-weight model with a custom serving stack, a model that needs a specific GPU or AWS Inferentia instance, or a model that must run with your own container. The application calls both through one internal API, so routing can change without client changes.

| SageMaker AI option | Key limits | Fit for FMs |
| --- | --- | --- |
| Real-time endpoint | `InvokeEndpoint` payload up to 6 MB; the container must respond within 60 seconds; GPU and Inferentia instances; `InvokeEndpointWithResponseStream` for token streaming | Interactive LLM serving with dedicated instances |
| Real-time endpoint with inference components | Several models on one endpoint, each with its own accelerators, CPU, memory (minimum 128 MB) and copy count; can scale to zero | Many fine-tuned variants or several LLMs sharing a GPU fleet |
| Asynchronous inference | Requests queued, payload up to 1 GB, processing up to one hour, input and output in S3, SNS notification, scale to zero | Long generations, large documents, batch-like traffic with near real-time expectations |
| Serverless Inference | No GPU, memory 1–6 GB, cold starts, scale to zero | Small CPU models only; never a GPU LLM |
| Batch transform | No persistent endpoint, processes a dataset in S3 | Offline scoring jobs |

Two bridges connect the services. **Amazon Bedrock Marketplace** deploys one of more than 100 additional models to an endpoint managed by SageMaker AI, then you call it with Bedrock `InvokeModel` or `Converse` (the marketplace endpoint ARN as `modelId`), with Bedrock tools such as Guardrails and Knowledge Bases. **Custom Model Import** moves supported open-weight architectures from SageMaker AI training into Bedrock serverless inference, removing the endpoint to manage.

**Scale to zero** on a SageMaker AI endpoint requires inference components and `ManagedInstanceScaling` with `MinInstanceCount` set to 0. Scaling out from zero relies on a step scaling policy triggered by a CloudWatch alarm on `NoCapacityInvocationFailures`; while no instance exists, invocations return errors and provisioning takes several minutes.

> **Exam tip.** "Lowest operational overhead" with a model that Bedrock offers points to Bedrock on-demand. "Must use our own fine-tuned open-weight model with no infrastructure to manage" points to Custom Model Import (if the architecture is supported) or a Bedrock custom model deployment. "Needs a specific serving container, GPU type or custom inference code" points to a SageMaker AI endpoint.

<!-- section: llm-deployment-challenges | objectives: 2.2.2 -->
## LLM-specific deployment challenges

Traditional ML models are small, stateless per request and CPU-friendly. LLMs differ on every axis:

| Challenge | Why it happens | Deployment answer |
| --- | --- | --- |
| GPU memory | Weights need about 2 bytes per parameter in FP16 or BF16 (a 70-billion-parameter model is about 140 GB), plus the KV cache, which grows with context length and concurrent requests | Choose instances by total GPU memory; shard the model across GPUs with tensor parallelism; quantize |
| GPU utilization | Token-by-token decoding leaves GPUs idle if requests are processed one at a time | Continuous batching in an LLM serving container |
| Token throughput | Capacity is tokens per second, not requests per second; long prompts and long answers cost differently | Size and scale on token metrics; cap output tokens |
| Model loading | Downloading and loading hundreds of GB takes minutes | Uncompressed artifacts, fast model loading, longer timeouts, bigger volumes |
| Latency | Time to first token matters more than total time for chat | Streaming responses, speculative decoding, smaller or quantized models |

**Container-based patterns.** SageMaker AI provides **large model inference (LMI)** deep learning containers, specialized Docker containers for LLM inference that support quantization, tensor parallelism and continuous batching. SageMaker AI **inference optimization** adds four techniques:

| Technique | Effect | Trade-off |
| --- | --- | --- |
| Quantization (INT4-AWQ, FP8, INT8-SmoothQuant) | Lower-precision weights and activations; fits on smaller, cheaper, more available GPUs | Possible accuracy loss |
| Speculative decoding | A small draft model proposes tokens that the target model verifies in parallel | Lower latency, no quality loss |
| Compilation | Ahead-of-time optimization for the chosen GPU, Trainium or Inferentia hardware | Faster deployment and scale-out, no accuracy loss |
| Fast model loading | Pre-sharded weights streamed from S3 directly to the GPUs | Faster deployment and auto scaling |

**Model loading strategies.** Large artifacts break the defaults, so the endpoint configuration must be adjusted:

- Deploy **uncompressed** artifacts: a `ModelDataSource` with `S3DataType` set to `S3Prefix` and `CompressionType` set to `None`, which avoids decompressing a huge `tar.gz` on every new instance (not supported with batch transform, Serverless Inference or multi-model endpoints).
- Raise `ModelDataDownloadTimeoutInSeconds` when the model exceeds about 40 GB, and `ContainerStartupHealthCheckTimeoutInSeconds` when logs show health check timeouts while the model is still loading.
- Increase `VolumeSizeInGB` above the model size when the model exceeds 30 GB on an instance without local disk.

```json
{
  "EndpointConfigName": "llm-70b-config",
  "ProductionVariants": [
    {
      "VariantName": "primary",
      "ModelName": "llm-70b-awq",
      "InstanceType": "ml.p4d.24xlarge",
      "InitialInstanceCount": 1,
      "VolumeSizeInGB": 256,
      "ModelDataDownloadTimeoutInSeconds": 1800,
      "ContainerStartupHealthCheckTimeoutInSeconds": 1800
    }
  ]
}
```

> **Exam trap.** An endpoint that fails with a health check timeout while CloudWatch logs show the model still loading is not a code bug and not an IAM issue: raise `ContainerStartupHealthCheckTimeoutInSeconds` (and the download timeout for very large weights). Switching to Serverless Inference is never the answer for a GPU-sized LLM.

<!-- section: optimized-deployment | objectives: 2.2.3 -->
## Balancing performance and resources

The cheapest deployment is the smallest model that passes your evaluation, called through the cheapest capacity option that meets the latency target.

| Approach | How | Fits |
| --- | --- | --- |
| Select the right model | Evaluate candidates on your own prompts (Bedrock evaluations, LLM-as-a-judge) and keep the smallest one above the quality bar | Every new workload |
| Smaller pre-trained models for specific tasks | Classification, extraction, routing or short summaries on a small text model; reserve the large model for reasoning | High-volume, narrow tasks |
| Distillation | A large teacher model generates responses that train a smaller student model, deployed as a custom model | A large model's quality is needed on one task at small-model cost and latency |
| Intelligent prompt routing | One serverless endpoint routes each request between two models of the same family (for example Amazon Nova Lite and Nova Pro) based on predicted response quality, with a fallback model and a response quality difference threshold | Mixed easy and hard prompts, minimal code |
| API-based model cascading | Application code sends the request to a small model first and escalates to a larger model only when a check fails (validation, confidence, refusal) | Most routine queries are easy; the escalation rule is application-specific |
| Prompt caching | Reuse a long static prefix (system prompt, documents); cache reads are billed at a reduced rate and don't count toward the TPM quota | Long repeated context |
| Batch or Flex | Non-urgent work at discounted prices | Offline and tolerant workloads |

Intelligent prompt routing is created with `create-prompt-router` (models, fallback model, `responseQualityDifference`) or used through the default routers. It is optimized for English prompts and can't learn from your application's performance data; when routing must depend on business rules or measured outcomes, build the cascade in code.

```text
# Python: API-based cascade (small model first, escalate on failed validation)
answer = converse(model_id=SMALL_MODEL, messages=messages, max_tokens=400)
if not passes_schema(answer) or answer.stop_reason == "max_tokens":
    answer = converse(model_id=LARGE_MODEL, messages=messages, max_tokens=1200)
    metrics.put("Escalations", 1)
```

> **Exam trap.** Intelligent prompt routing switches only between models of the same family and decides on predicted response quality, not on your cost or latency rules. A requirement to route across providers, by customer tier or by a confidence score returned by your own validator calls for application code, Step Functions or a gateway, not a prompt router.

<!-- section: key-points -->
## Key points

- Bedrock capacity: on-demand Standard by default; `priority` for fastest responses, `flex` for discounted delay-tolerant work, `reserved` for guaranteed TPM (1 or 3 months); cross-Region inference for bursts; batch inference for offline datasets; Provisioned Throughput (MUs, no commitment, 1 or 6 months) for steady volume.
- Custom models: Provisioned Throughput or an on-demand custom model deployment; open-weight models through Custom Model Import (supported architectures, `.safetensors`, no embeddings, no batch).
- Lambda orchestrates Bedrock calls; it never hosts LLM weights.
- SageMaker AI hybrid: real-time (6 MB, 60 seconds, streaming), inference components (per-model accelerators, scale to zero), asynchronous (1 GB, one hour), Serverless Inference (no GPU). Bedrock Marketplace exposes SageMaker-managed endpoints through Bedrock APIs.
- LLM serving: GPU memory for weights plus KV cache, tensor parallelism, quantization, continuous batching, speculative decoding; LMI containers.
- Large models: uncompressed `S3Prefix` artifacts, fast model loading, longer download and health check timeouts, bigger volumes.
- Optimize with the smallest model that passes evaluation, distillation, intelligent prompt routing (same family, English), cascading in code, prompt caching, batch and Flex.
