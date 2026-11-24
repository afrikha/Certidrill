# QZ-sc-900-11-security-compliance-concepts — report

Quiz: `content/sc-900/quizzes/11-security-compliance-concepts.yaml` (10 questions, `sc900-qz-11-01` to `-10`). `npx tsx factory/check-quiz.ts sc-900 11-security-compliance-concepts`: 0 problem(s), 0 warning(s).

Pages fetched on 2026-11-24 (all references point to them): Learn units 2–6 of module `describe-security-concepts-methodologies` (shared responsibility, defense in depth, Zero Trust, encryption and hashing, GRC).

## Coverage
1.1.1: q3, q6 · 1.1.2: q5, q8 · 1.1.3: q9 · 1.1.4: q1, q4, q10 · 1.1.5: q2, q7. Positions 6–10: yesno, dragdrop, single, dragdrop, dropdown.
The mock bank already covers almost every decision of these objectives; the quiz tests other ones (symmetric key distribution, hash comparison of a download, threats rather than controls for CIA, mixed IaaS/PaaS/SaaS split, GRC concepts in activities, layer diagnosis of a phishing attack, principles of four ZT measures, which key signs / verifies / encrypts).

## Doubts
- q8 (phished password, "which layer should be strengthened") expects Identity and access; Data is a distractor because encryption at rest doesn't stop an authenticated user. Defensible, but it relies on reasoning, not on a sentence of Learn.
- q9: Learn's Zero Trust unit also puts "risk-based adaptive policies that limit access when risky activity is detected" under least privilege. To avoid ambiguity with verify explicitly, no measure of the quiz is risk-based.

## Chapter vs current Learn (not edited)
- Shared responsibility unit now also covers responsibilities for AI services (provider secures the model hosting environment and platform safety controls; customer remains responsible for its data, usage and configuration). The chapter has nothing on it.
- GRC unit gives the risk-management steps (identify, assess, respond — accept, mitigate, transfer, avoid — monitor), states that risk management doesn't aim to eliminate risk, and names HIPAA, ISO 27001, SOC 2 as frameworks. The chapter omits the steps and responses.
- Encryption unit has a key-management section (keys stored separately, HSMs, rotation, Azure Key Vault) and mentions rainbow tables / dictionary attacks; the chapter omits key management.
- Defense in depth: Learn adds "monitoring compute resources for unusual behavior" (compute) and "application-level authentication and authorization" (application); integrity controls also include audit logs and database transaction controls. Minor omissions.
- French: objectives.yaml says « modèle de confiance zéro », the chapter « modèle Confiance Zéro »; the quiz follows the chapter (« Confiance Zéro (Zero Trust) »).
