This chapter covers what unlocks everything else: passwords, API keys, KMS key material and certificates. The exam asks how to rotate credentials without downtime, how to control key material generated outside AWS and how it differs from AWS-generated material, how to hide sensitive values in logs and messages, and how to manage keys and certificates across Regions.

<!-- section: secrets-rotation | objectives: 5.3.1 -->
## Managing and rotating secrets

Credentials embedded in code, AMIs, environment variables or plain parameters are a classic finding. The fix is a store that encrypts the value with KMS, controls access with IAM and resource policies, logs every retrieval in CloudTrail and, when possible, rotates the value automatically.

| Need | AWS Secrets Manager | Systems Manager Parameter Store (`SecureString`) |
| --- | --- | --- |
| Automatic rotation | Built in: managed rotation or a Lambda rotation function | None; build it yourself (EventBridge plus Lambda) |
| Cross-account access | Resource policy on the secret plus a customer managed KMS key | Only advanced parameters can be shared, through AWS RAM |
| Replication to other Regions | Replica secrets, kept in sync with the primary | No |
| Size and volume | Values up to 64 KB, charged per secret and per API call | Standard tier: 10,000 parameters of 4 KB, free; advanced tier: 100,000 parameters of 8 KB, parameter policies such as expiration |
| Typical use | Database credentials, third-party API keys, anything that must rotate | Configuration values and secrets rotated by another process |

**Rotation types.** Managed rotation is configured by the owning service, without a Lambda function: RDS, Aurora and DocumentDB master user credentials (for example `--manage-master-user-password` on RDS), Redshift admin passwords, and Amazon ECS Service Connect TLS certificates from AWS Private CA. Managed external secrets rotation updates secrets held by Secrets Manager partners. Everything else uses a rotation Lambda function that runs four steps (`createSecret`, `setSecret`, `testSecret`, `finishSecret`) and moves the staging labels: the new version is `AWSPENDING` during rotation, then becomes `AWSCURRENT`, and the old one becomes `AWSPREVIOUS`.

| Strategy | How it works | Choose it when |
| --- | --- | --- |
| Single user | Changes the password of the same database user | Most cases, ad hoc or interactive users; open connections aren't dropped, and a retry with backoff covers the short gap |
| Alternating users | The first rotation clones the user; each later rotation changes the inactive one, so a valid set always exists | High availability applications; requires a separate secret holding superuser credentials that can create and alter users |

Rotation can run as often as every four hours, with a schedule expression and a window. A rotation function in a VPC needs a path to the Secrets Manager endpoint (an interface VPC endpoint or a NAT gateway) and to the database.

```bash
aws secretsmanager rotate-secret --secret-id prod/orders/db --rotation-lambda-arn arn:aws:lambda:eu-west-1:111122223333:function:orders-db-rotation --rotation-rules '{"ScheduleExpression":"rate(30 days)","Duration":"3h"}'
aws secretsmanager replicate-secret-to-regions --secret-id prod/orders/db --add-replica-regions Region=eu-central-1,KmsKeyId=alias/orders-secrets
```

**Cross-account access** needs three pieces: a resource policy on the secret naming the external role, a customer managed KMS key whose key policy allows that role `kms:Decrypt`, and an identity policy in the other account allowing `secretsmanager:GetSecretValue` on the secret ARN and `kms:Decrypt` on the key. Use `BlockPublicPolicy` when calling `PutResourcePolicy` to reject a policy that would make the secret public, and never grant `secretsmanager:PutResourcePolicy` to outside principals. Replica secrets are read-only copies; rotation runs on the primary and propagates.

Long-term IAM access keys are credentials too: prefer roles (instance profiles, IAM Roles Anywhere, Identity Center), and detect old keys with the AWS Config managed rule for access key rotation.

> **Exam trap.** A secret encrypted with the AWS managed key `aws/secretsmanager` can't be read from another account, whatever the resource policy says, because that key's policy can't be edited. Cross-account secrets always need a customer managed key.

<!-- section: imported-key-material | objectives: 5.3.2 -->
## Using imported key material and external key stores

Importing key material (bring your own key) means you generate the material in your own infrastructure and give KMS a copy. KMS then uses it like any other key, but durability and part of the lifecycle become your job.

1. **Create a KMS key without material**, origin `EXTERNAL`. Symmetric, asymmetric (except ML-DSA and ML-KEM), HMAC and multi-Region keys can be created this way; keys in custom key stores can't.
2. **Download a wrapping public key and an import token** with `get-parameters-for-import`: wrapping key spec `RSA_4096` (recommended), `RSA_3072` or `RSA_2048`, and an algorithm such as `RSAES_OAEP_SHA_256` for symmetric material or `RSA_AES_KEY_WRAP_SHA_256` for RSA private keys. Both are valid for 24 hours.
3. **Wrap the material** with the public key, inside your HSM or key manager.
4. **Import it**, choosing `KEY_MATERIAL_EXPIRES` with a `--valid-to` date (no more than 365 days ahead) or `KEY_MATERIAL_DOES_NOT_EXPIRE`.
5. **Keep the original securely**: AWS can't recover it, and reimporting the same material is the only way back after expiration or deletion.

**Rotating imported material.** Automatic rotation never applies to imported keys. For symmetric encryption keys, import new material with `--import-type NEW_KEY_MATERIAL` (the key enters the Pending rotation state), then run on-demand rotation; older material stays associated with the key, so existing ciphertext still decrypts, and each material can have its own expiration. On-demand rotation is limited to 25 per key. For imported asymmetric or HMAC keys, `ImportType` is rejected: rotate by creating a new key and moving the alias.

```bash
aws kms get-parameters-for-import --key-id 0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e --wrapping-algorithm RSAES_OAEP_SHA_256 --wrapping-key-spec RSA_4096
aws kms import-key-material --key-id 0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e --encrypted-key-material fileb://EncryptedKeyMaterial.bin --import-token fileb://ImportToken.bin --expiration-model KEY_MATERIAL_EXPIRES --valid-to 2027-06-30T00:00:00Z --import-type NEW_KEY_MATERIAL --key-material-description "2027 rotation"
aws kms rotate-key-on-demand --key-id 0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e
```

**Expiration and deletion as controls.** When material expires or you call `delete-imported-key-material`, the key moves to `PendingImport` immediately and can't be used. Data keys already decrypted by a service (for example, a mounted EBS volume) keep working until the next time KMS is asked to decrypt them. Reimporting the same material restores the key. This is a fast, reversible kill switch; scheduling key deletion (7 to 30 days) is the permanent one. Alert before expiration with a CloudWatch alarm on the `SecondsUntilKeyMaterialExpiration` metric. For multi-Region keys with imported material, you import the same material into every replica separately; new material IDs propagate from the primary, the material itself doesn't.

**Custom key stores.** When material must live in hardware you control:

| | AWS CloudHSM key store | External key store (XKS) |
| --- | --- | --- |
| Where the key lives | Your CloudHSM cluster, at least two active HSMs in different Availability Zones, through the `kmsuser` crypto user | An external key manager outside AWS (HSM or software), reached through an XKS proxy you run |
| Connectivity | Inside AWS | Public endpoint, or a VPC endpoint service you create (the proxy can still be outside AWS) |
| Encryption | KMS key backed by a key in your cluster | Double encryption: KMS material first, then your external key; neither side alone can decrypt |
| Key types | Symmetric encryption only | Symmetric encryption only; no imported material, no multi-Region keys |
| Rotation | Manual: new KMS key, move the alias | Manual in KMS; the external key manager can rotate the material behind the external key ID |
| Who owns availability | You (cluster size, HSM health) | You (proxy, network, key manager); AWS recommends a round trip of 35 ms or less |

Revoking an external key store's access stops every AWS use of the key at once, and losing the external key makes the data unrecoverable; AWS states that for most workloads the burden and availability risk outweigh the benefit.

> **Exam trap.** "The company must be able to make its data unusable in AWS immediately and restore access later" points to deleting imported key material (then reimporting it) or, for a hold-your-own-key mandate, revoking an external key store. Disabling a key also works and is reversible, but it doesn't remove the material from AWS, which is what such stems usually require.

<!-- section: key-material-origins | objectives: 5.3.3 -->
## Imported versus AWS-generated key material

| Property | AWS generated (`AWS_KMS`) | Imported (`EXTERNAL`) |
| --- | --- | --- |
| Who generates the material | KMS, inside its FIPS 140-3 Level 3 HSMs | You, with an entropy source you can prove |
| Durability | Managed by AWS | Your responsibility: keep a copy outside AWS |
| Automatic rotation | Yes, symmetric keys, every 90 to 2,560 days | Never |
| On-demand rotation | Yes, symmetric keys | Yes, symmetric keys, after importing new material |
| Expiration | No | Optional, up to 365 days per import, renewable by reimporting |
| Instant removal from AWS | No (disable, or schedule deletion after 7 to 30 days) | Yes, `delete-imported-key-material`, reversible by reimporting |
| Same material inside and outside AWS | No, material never leaves KMS | Yes for asymmetric and HMAC keys (interoperable signatures and MACs); KMS symmetric ciphertext still can't be decrypted outside KMS |
| Multi-Region keys | Material replicated by KMS | Same material imported into each replica |
| Key policy, grants, CloudTrail, service integrations | Identical | Identical |

Choose imported material only when a requirement names one of these properties: proof of key generation, an independent copy for disaster recovery, expiration or instant deletion under your control, or the same signing key used outside AWS. Imported material is not stronger cryptography; it moves risk to you.

> **Exam trap.** A key with imported material does not let you decrypt S3 or EBS data outside AWS by using your copy of the material: KMS doesn't publish its symmetric ciphertext format. If data must be decryptable without AWS, encrypt it client-side with keys you manage, before it is sent.

<!-- section: data-masking | objectives: 5.3.4 -->
## Masking sensitive data in logs and messages

**CloudWatch Logs data protection policies** detect sensitive values (credentials, financial data, PII, PHI, device identifiers) with managed data identifiers, some of which also require nearby keywords, and with custom data identifiers (regular expressions).

| Behavior | Detail |
| --- | --- |
| Scope | One account-level policy (existing and future log groups) and one policy per log group; both apply when both exist; 30,720 characters per policy |
| Masking | At every egress point: console, CloudWatch Logs Insights, metric filters, subscription filters |
| Viewing originals | Only principals with `logs:Unmask` |
| Timing | Applied at ingestion; events ingested before the policy stay unmasked |
| Log classes | Standard and Essentials (formerly Infrequent Access) |
| Monitoring | `LogEventsWithFindings` metric in `AWS/Logs`; audit findings sent to CloudWatch Logs, Firehose or S3 |

```json
{
  "Name": "payments-logs-protection",
  "Version": "2021-06-01",
  "Statement": [
    {
      "Sid": "audit",
      "DataIdentifier": ["arn:aws:dataprotection::aws:data-identifier/CreditCardNumber", "arn:aws:dataprotection::aws:data-identifier/AwsSecretKey"],
      "Operation": { "Audit": { "FindingsDestination": { "S3": { "Bucket": "example-dp-findings" } } } }
    },
    {
      "Sid": "redact",
      "DataIdentifier": ["arn:aws:dataprotection::aws:data-identifier/CreditCardNumber", "arn:aws:dataprotection::aws:data-identifier/AwsSecretKey"],
      "Operation": { "Deidentify": { "MaskConfig": {} } }
    }
  ]
}
```

**Amazon SNS message data protection** (audit, de-identify or deny message payloads against data identifiers) is no longer available to new customers since April 30, 2026; existing accounts keep it with security updates only. The recommended pattern for new designs: publishers send to an inbound topic, a Lambda function inspects each message with Amazon Bedrock Guardrails and logs, blocks or redacts the sensitive data, and publishes the result to the topic that subscribers use.

Elsewhere, Amazon Macie finds sensitive data in S3 without changing it, Bedrock Guardrails sensitive information filters block or mask PII in prompts and responses, and the best mask is not logging the value at all.

> **Exam trap.** A data protection policy doesn't rewrite history. When a stem says passwords already appear in a log group, the policy protects new events only; existing events must be handled separately (restricted access, export and purge, or a shorter retention), and the leaked credentials must be rotated.

<!-- section: multi-region-keys-certificates | objectives: 5.3.5 -->
## Keys and certificates in one Region or several

**Customer managed keys** are Regional. Their key policy is the primary access control: keep a statement for the account (so IAM policies can delegate), separate key administrators from key users, and restrict use with `kms:ViaService` or encryption context conditions. Grants give temporary, narrow permissions, mostly to AWS services acting for you. Deletion is always scheduled (7 to 30 days); block it with an SCP outside a break-glass role.

**Multi-Region keys** (key IDs starting with `mrk-`) are related keys in different Regions of the same partition that share key material and key ID, so ciphertext encrypted in one Region can be decrypted in another without a cross-Region call.

| Shared across the set (synchronized from the primary) | Independent per key |
| --- | --- |
| Key ID, key material and origin, key spec and usage, rotation (automatic and on-demand, managed on the primary) | Key policy, grants, aliases, tags, description, enabled state |

A single-Region key can't be converted into a multi-Region key; you create one with `--multi-region`, then replicate it, one key per Region at most. Promote a replica with `update-primary-region` if the primary Region is lost. Multi-Region keys can't live in custom key stores. Use them for disaster recovery, active-active applications, global client-side encryption and distributed signing; otherwise, AWS recommends single-Region keys for their Regional isolation.

```bash
aws kms create-key --multi-region --description "Orders client-side encryption" --policy file://orders-key-policy.json
aws kms replicate-key --key-id mrk-4f8e2a1b9c7d4e3f8a2b1c0d9e8f7a6b --replica-region ap-southeast-2 --policy file://orders-key-policy-apse2.json
```

**Certificates.** ACM certificates are Regional: request or import the certificate in each Region where a load balancer or API uses it, and in US East (N. Virginia) for CloudFront. Public certificates are valid 198 days; ACM renews in-use, DNS-validated certificates automatically, but never renews imported ones. **Exportable public certificates** (an extra charge) can be installed on EC2, containers or on-premises hosts; ACM renews them 45 days before expiration, but you must redeploy the renewed certificate, and the exported private key must be protected and the certificate revoked if it is compromised.

**AWS Private CA** builds root and subordinate CAs. CAs are Regional and can't be copied between Regions, so a multi-Region design creates a subordinate CA in each Region, all chained to the same root, and shares them with workload accounts through AWS RAM.

| Requirement | Design |
| --- | --- |
| Internal TLS on load balancers, CloudFront or API Gateway, renewed automatically | ACM private certificates issued by a Private CA (free when you can't access the private key) |
| Certificates on instances, containers or devices | Exportable private certificates, or certificates issued directly by Private CA (your automation renews them) |
| Workload identity with very short validity, no revocation | Short-lived certificate mode (validity up to 7 days) |
| One trust anchor, CAs in several Regions | Root CA in a dedicated account, one subordinate CA per Region, shared through AWS RAM |

> **Exam trap.** Updating the key policy of a multi-Region primary key changes nothing in the replicas: policies, grants and aliases are independent. A stem where decryption fails only in the second Region after a policy change points to the replica's own key policy.

<!-- section: key-points -->
## Key points

- Secrets Manager rotates (managed rotation or Lambda), replicates and shares across accounts; Parameter Store `SecureString` doesn't rotate.
- Alternating users needs a superuser secret; single user is the default choice.
- Cross-account secrets need a customer managed key, never `aws/secretsmanager`.
- Import token and wrapping key are valid 24 hours; imported material can expire (365 days maximum) and be deleted instantly, then reimported.
- Imported symmetric keys rotate on demand after importing `NEW_KEY_MATERIAL`; never automatically.
- Custom key stores: symmetric keys only, manual rotation, you own availability; XKS double-encrypts.
- CloudWatch Logs data protection masks at ingestion for new events; `logs:Unmask` reveals values. SNS message data protection is closed to new customers; use Lambda with Bedrock Guardrails.
- Multi-Region keys share material, ID and rotation; policies and aliases stay per Region. Private CAs and ACM certificates are Regional.
