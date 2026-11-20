At the professional level, encryption questions rarely ask whether to encrypt: they ask where the keys live, who can use them from which account and Region, how they rotate without touching applications, which hardware a regulator accepts, and how to prepare for quantum-capable attackers. This chapter covers customer managed KMS keys and their rotation in multi-account and multi-Region designs, TLS and certificate management with ACM and AWS Private CA, dedicated HSMs with AWS CloudHSM, and post-quantum strategies with ML-KEM and ML-DSA.

<!-- section: kms-customer-managed | objectives: 2.2.1 -->
## Customer managed keys and automatic rotation

A customer managed key is the default choice as soon as a stem mentions control: who may use the key, separation of duties, cross-account access, the ability to disable the key, or a rotation schedule set by the security team. AWS managed keys (`aws/<service>`) rotate about every 365 days on a fixed schedule and their key policy can't be edited, so they can't be shared with another account.

**Rotation options for KMS keys**

| Key | Automatic rotation | On-demand rotation | What to do otherwise |
| --- | --- | --- | --- |
| Symmetric, `AWS_KMS` origin | Yes, every 90 to 2,560 days (365 by default) | Yes, up to 25 per key | Nothing |
| Symmetric, imported material (`EXTERNAL`) | No | Yes, after importing new material | Track material expiration |
| Multi-Region key, `AWS_KMS` origin | Yes, set on the primary key only, synchronized to replicas | Yes, started on the primary | Nothing |
| Asymmetric, HMAC, or key in a custom key store | No | No | Create a new key, move the alias |

Rotation changes only the current key material: the key ID, ARN, alias and policy stay, older ciphertexts still decrypt with the version that encrypted them, and no application change is needed. Rotation does not re-encrypt existing data and does not rotate data keys already issued. On-demand rotation doesn't shift the automatic schedule. The monthly key fee increases only for the first and second rotations.

```bash
# Rotate every 180 days, and restrict the allowed periods with kms:RotationPeriodInDays in policies
aws kms enable-key-rotation --key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab --rotation-period-in-days 180
aws kms rotate-key-on-demand --key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
```

**Key ownership in an organization**

| Design | Strength | Weakness |
| --- | --- | --- |
| One key per workload account, created by the pipeline | Blast radius of one account, quotas per account, the workload team owns its key | Security team needs a cross-account audit path (CloudTrail, Config) |
| Central key account, keys used cross-account | One place for key administration and deletion protection | Every consumer needs both the key policy and an IAM policy; KMS request quotas are shared by the key's account |
| Multi-Region keys (primary plus replicas) | Same key ID and material in several Regions: ciphertext encrypted in one Region decrypts in another without a cross-Region call | Each replica has its own key policy, which must be kept consistent; a compromise affects all Regions |

A key used by another account needs two grants of trust: the key policy names the other account (or its role), and an IAM policy in that account allows the KMS actions on the key ARN. Use conditions to narrow use:

```json
{
  "Sid": "AllowUseThroughS3FromWorkloadAccount",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::444455556666:role/app-data-writer" },
  "Action": ["kms:GenerateDataKey", "kms:Decrypt"],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "kms:ViaService": "s3.eu-west-1.amazonaws.com",
      "kms:CallerAccount": "444455556666"
    }
  }
}
```

Protect keys against destruction: deletion is always scheduled (7 to 30 days, 30 by default), so alert on `ScheduleKeyDeletion` with EventBridge and deny it in an SCP except for a break-glass role. An encryption context passed on every call ties ciphertext to its tenant or record and appears in CloudTrail, which supports both authorization (`kms:EncryptionContext:` condition keys) and audit.

> **Exam trap.** "Rotate the key material and re-encrypt all existing objects" isn't what KMS rotation does. Rotation only protects new encryptions; re-encrypting data needs a copy job (S3 Batch Operations, a snapshot copy) with the new key.

<!-- section: tls-certificates | objectives: 2.2.2 -->
## Encryption in transit and certificate management

Terminate TLS where the stem needs inspection or routing, and re-encrypt to the target when it requires end-to-end encryption. Choose the TLS policy deliberately: an Application Load Balancer or Network Load Balancer HTTPS or TLS listener created in the console uses `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` by default, but one created with the AWS CLI, CloudFormation or the CDK gets `ELBSecurityPolicy-2016-08` unless you set the policy explicitly.

| Requirement | Listener security policy |
| --- | --- |
| TLS 1.3 only | `ELBSecurityPolicy-TLS13-1-3-2021-06` or `ELBSecurityPolicy-TLS13-1-3-PQ-2025-09` |
| TLS 1.2 and 1.3 with strong ciphers, hybrid post-quantum key exchange for capable clients | `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` (recommended) |
| FIPS-validated cryptographic module at the load balancer | A `FIPS` policy, for example `ELBSecurityPolicy-TLS13-1-2-Res-FIPS-PQ-2025-09` |
| Clients authenticate with certificates | ALB mutual TLS with a trust store of your CA certificates, or mTLS on an API Gateway custom domain |
| Clients must use TLS 1.2 or later to reach S3 | Bucket policy denying requests where `s3:TlsVersion` is less than 1.2, and denying `aws:SecureTransport` false |

**AWS Certificate Manager** issues public certificates, validated by DNS or email, valid 198 days, renewed automatically when they are in use and DNS validation still works; the ARN doesn't change. Imported certificates are never renewed by ACM: monitor their expiration. ACM certificates are Regional, and a certificate for CloudFront must be in US East (N. Virginia).

**AWS Private CA** builds a private hierarchy (root, subordinates) for internal TLS, service-to-service mTLS and device identity:

| Need | Design |
| --- | --- |
| Internal endpoints on ELB, CloudFront or API Gateway with automatic renewal | Private certificates requested through ACM from a Private CA; their private key isn't accessible, and they are free |
| Certificates installed on instances or containers | ACM exportable private certificates, or certificates issued directly by Private CA (`IssueCertificate`, not renewed by ACM) |
| Very short-lived certificates with no revocation infrastructure | A CA in short-lived certificate mode (validity up to 7 days, lower price, last CA of the hierarchy; ACM can't issue from it) |
| One CA for every account of the organization | Root CA in a security account, subordinate CA shared with AWS RAM |
| Revocation for general-purpose certificates | CRL in S3 or OCSP |

CAs are Regional and can't be copied to another Region: a multi-Region design creates a subordinate CA per Region under the same root.

> **Exam tip.** "Least operational overhead for TLS certificates on internal ALBs in 40 accounts" is a shared Private CA plus ACM private certificates, which ACM renews and deploys; scripts that call `IssueCertificate` and reimport certificates are the overhead the qualifier rejects.

<!-- section: cloudhsm | objectives: 2.2.3 -->
## Dedicated hardware security modules

KMS already generates and protects key material in FIPS 140-3 Security Level 3 validated HSMs, in a multi-tenant fleet operated by AWS. Choose AWS CloudHSM only when the requirement explicitly names single-tenant HSMs, customer-exclusive control of HSM users, or an interface such as PKCS #11, JCE or CNG/KSP.

| Fact | AWS CloudHSM |
| --- | --- |
| Tenancy and control | Single-tenant HSMs in a cluster in your VPC; you create crypto users and manage keys; AWS has no access to key material |
| HSM types | `hsm2m.medium` (FIPS 140-3, FIPS or non-FIPS mode); `hsm1.medium` (FIPS 140-2) no longer accepts new clusters |
| Cluster mode | FIPS mode allows only FIPS-validated keys and algorithms; non-FIPS mode allows all supported algorithms |
| Availability | Spread at least two HSMs across Availability Zones; the service automates provisioning, backups and maintenance |
| Typical uses | TLS offload for web servers, Oracle TDE, document or code signing with PKCS #11, a KMS custom key store |

**Choosing a key store**

| Requirement | Answer |
| --- | --- |
| Standard regulated workload, AWS service integrations, highest throughput | KMS standard key store with customer managed keys |
| Prove that you generated the key material yourself | Imported key material (BYOK) in the standard key store; you control expiration and deletion of the material |
| Key material in single-tenant HSMs you control, still used by S3, EBS, RDS through KMS | KMS key in an AWS CloudHSM key store (symmetric keys only, no automatic rotation, no multi-Region keys, lower throughput) |
| Key material must stay outside AWS, under an external key manager | External key store (XKS) through an XKS proxy; highest latency, you own availability |
| Application calls HSM APIs directly (PKCS #11, JCE) | CloudHSM cluster with the Client SDK |
| Payment HSM functions (PIN, card keys) | AWS Payment Cryptography, not CloudHSM |

AWS states that custom key stores aren't more secure than the standard key store; they trade performance, the 99.999% SLA and operational simplicity for a compliance requirement. If a custom key store is needed, prefer CloudHSM over XKS, because its connection with KMS stays inside the AWS network.

> **Exam trap.** "FIPS 140-3 Level 3 validated key storage" alone doesn't require CloudHSM: the standard KMS key store meets it. The deciding words are single-tenant, exclusive control of the HSM, or a direct HSM API.

<!-- section: post-quantum | objectives: 2.2.4 -->
## Post-quantum cryptography strategy

A future cryptographically relevant quantum computer threatens public-key algorithms (RSA, ECDH, ECDSA), not well-sized symmetric encryption: data encrypted under KMS keys with AES-256-GCM is already considered quantum resistant. The urgent risk is "harvest now, decrypt later": recorded TLS sessions whose classical key exchange can be broken later. The second risk is long-lived signatures (firmware, code, documents, root CAs) that must stay verifiable for decades.

| Risk | AWS mechanism |
| --- | --- |
| Recorded traffic to AWS APIs decrypted later | Hybrid post-quantum TLS (ECDH plus ML-KEM, FIPS 203) on AWS KMS, ACM and Secrets Manager endpoints, served by s2n-tls; enable it in AWS SDK HTTP client settings |
| Recorded traffic to your applications | ALB or NLB `PQ` security policies (`X25519MLKEM768`, `SecP256r1MLKEM768`, `SecP384r1MLKEM1024`); clients must support ML-KEM |
| Long-lived digital signatures | KMS asymmetric keys `ML_DSA_44`, `ML_DSA_65`, `ML_DSA_87` (FIPS 204), algorithm `ML_DSA_SHAKE_256` |
| Quantum-safe certificates for internal PKI | AWS Private CA keys and signing algorithms `ML_DSA_44`, `ML_DSA_65`, `ML_DSA_87` |
| Application-level key establishment | KMS keys `ML_KEM_512`, `ML_KEM_768`, `ML_KEM_1024` with `Encapsulate` and `Decapsulate` (32-byte shared secret, not available in the China Regions) |

ML-DSA signing in KMS accepts messages up to 4 KB with message type `RAW`; for larger messages, compute the 64-byte μ representation locally and sign it with `EXTERNAL_MU`. Post-quantum keys can't use imported key material.

```bash
aws kms create-key --key-spec ML_DSA_65 --key-usage SIGN_VERIFY --description "Firmware signing, post-quantum"
aws kms sign --key-id alias/firmware-signing-pq --message fileb://firmware-digest.bin --message-type RAW --signing-algorithm ML_DSA_SHAKE_256
```

A migration plan follows the order of risk:

1. **Inventory** where public-key cryptography is used: TLS endpoints, VPN, SSH, certificates, signing keys, and the clients that connect to them.
2. **Protect key exchange first**: PQ TLS policies on load balancers, hybrid TLS in SDK clients that call KMS, ACM and Secrets Manager.
3. **Verify**: KMS CloudTrail events record `tlsDetails.keyExchange` (for example `X25519MLKEM768`); a metric filter on events without `MLKEM` finds clients still on classical key exchange.
4. **Plan signatures**: new ML-DSA signing keys and a post-quantum CA hierarchy for artifacts that must remain trusted for years, while classical signatures remain for clients that can't verify ML-DSA yet.
5. **Stay crypto-agile**: aliases and configuration, not hard-coded algorithms, so a key spec can change without redeploying code.

> **Exam trap.** Rotating KMS symmetric keys or moving to CloudHSM doesn't address the quantum threat to data in transit. "Protect today's API traffic against future decryption" is hybrid ML-KEM key exchange in TLS.

<!-- section: key-points -->
## Key points

- Customer managed keys: automatic rotation every 90 to 2,560 days, on-demand rotation up to 25 times; rotation never re-encrypts data.
- Cross-account use needs the key policy and an IAM policy; narrow it with `kms:ViaService`, `kms:CallerAccount` and encryption context.
- Multi-Region keys share material and ID across Regions; rotation is managed on the primary.
- Set listener TLS policies explicitly in IaC; PQ policies add hybrid ML-KEM key exchange.
- ACM renews in-use, DNS-validated certificates; imported certificates and `IssueCertificate` certificates aren't renewed by ACM.
- Share one Private CA hierarchy through AWS RAM; short-lived mode caps validity at 7 days.
- CloudHSM for single-tenant, customer-controlled HSMs (`hsm2m.medium`, FIPS 140-3); the standard KMS key store already uses FIPS 140-3 Level 3 HSMs.
- Post-quantum: ML-KEM for key exchange first, ML-DSA for long-lived signatures; AES-256 data at rest is already quantum resistant.
