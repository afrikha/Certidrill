Microsoft groups responsible AI into six principles: fairness, reliability and safety, privacy and security, inclusiveness, transparency and accountability. The exam describes a situation or a design decision and asks which principle it serves, often as a series of Yes/No statements. Learn the one idea behind each principle, then the pairs that are easy to swap.

<!-- section: fairness | objectives: 1.1.1 -->
## Fairness

AI systems should treat everyone fairly and avoid affecting similarly situated groups of people in different ways. A system that guides loan approvals, hiring or medical treatment should make the same recommendation for people with similar finances, qualifications or symptoms.

What to consider:

- **Bias in data.** Bias can enter when data is collected, when the model is built or when the system operates. Check where a dataset comes from and whether every group is adequately represented.
- **Outcomes by group.** Compare the results for sensitive groups such as gender, ethnicity or age, not only the overall accuracy.
- **Evaluation.** In Foundry, safety evaluators scan the output of a model or an agent for bias and unfairness. Evaluators detect and score problems; they don't fix them.

<!-- section: reliability-safety | objectives: 1.1.2 -->
## Reliability and safety

AI systems must operate reliably, safely and consistently: perform as designed, respond safely to conditions nobody anticipated, and resist harmful manipulation.

What to consider:

- **Testing.** Test rigorously during development and deployment. A system that affects human safety or large populations is tested in the lab and in real conditions.
- **Unintended circumstances.** Design for accidental misuse, malicious data and attacks.
- **Monitoring and feedback.** Track performance after release and give users a way to report problems.
- **Human input.** Decide when the system must hand a decision over to a person.
- **Generated content.** A generative model can produce wrong or harmful text. Foundry models apply content safety filters (guardrails) by default, which block harmful prompts and answers, and grounding the prompt in trusted data makes answers more reliable.

<!-- section: privacy-security | objectives: 1.1.3 -->
## Privacy and security

AI systems need data, so the data and the models must be protected and people's right to privacy preserved.

What to consider:

- **Laws and consent.** Comply with data protection and privacy laws; tell people how their data is collected, used and stored, and give them control over it.
- **Data minimization.** Use personal data only for a defined purpose and only as long as needed; delete what was collected by mistake or is no longer relevant.
- **Anonymity.** Remove personal identification from data. PII detection in Azure Language finds names, phone numbers or addresses in text and can redact them before the text is stored or shared.
- **Access.** Microsoft Entra ID and role-based access control limit who can reach model deployments, resources and data. Keys and other secrets belong in Azure Key Vault, not in code.

In this principle, "security" means protecting data and systems against unauthorized access. "Safety" in the previous principle means that the system's own behavior doesn't cause harm.

<!-- section: inclusiveness | objectives: 1.1.4 -->
## Inclusiveness

AI should empower every person, so systems must reflect the full range of human experiences and needs. Real-time captions, image descriptions and predictive text already help people with hearing, vision or other disabilities take part in work and daily life; a voice interface makes an application usable without a keyboard or a screen.

What to consider:

- **Inclusive design.** Recognize who could be excluded and why; solve for one person and extend to many; learn from diverse perspectives.
- **Accessibility.** Follow accessibility standards and laws, and test with people with disabilities.
- **Diversity of users.** Take into account different languages and different levels of technical skill.

<!-- section: transparency | objectives: 1.1.5 -->
## Transparency

People must be able to understand how an AI system reaches its results, what it can do and what its limits are. Those who use AI should also be open about when, why and how they use it.

What to consider:

- **Disclosure.** Tell users that they are talking to an AI and label generated content, for example "AI-generated content may be incorrect".
- **Intelligibility.** Explain the behavior of the system in terms its users and stakeholders can understand, such as why an application was rejected.
- **Documentation.** Publish the purpose, the data and the limitations of the system. In the Foundry model catalog, each model has a model card with its constraints and caveats.
- **Sources.** An answer grounded in documents that cites them lets the user verify it.

<!-- section: accountability | objectives: 1.1.6 -->
## Accountability

The people who design and deploy an AI system are accountable for how it operates. AI should not be the final authority on a decision that affects someone's life, and humans keep meaningful control over highly autonomous systems.

What to consider:

- **Governance.** Define roles, policies and review boards that oversee development and deployment.
- **Human in the loop.** Keep people with the right expertise involved in consequential decisions, able to inspect and correct what the model produced.
- **Traceability.** Record who deployed which model, when and why, and monitor it in production.

<!-- section: telling-principles-apart | objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6 -->
## Telling the principles apart

| The scenario says | Principle |
| --- | --- |
| A hiring model ranks equally qualified candidates lower because of their gender | Fairness |
| A chatbot is tested against prompts that try to make it produce harmful content | Reliability and safety |
| Customer names are redacted before call transcripts are stored | Privacy and security |
| Only authorized staff can read the data the agent uses | Privacy and security |
| An application adds captions and a voice interface for users who can't hear or see | Inclusiveness |
| A page tells users that answers are generated by AI and may be incorrect | Transparency |
| A bank can explain why a loan application was rejected | Transparency |
| A doctor confirms every diagnosis the system proposes | Accountability |
| A committee approves each AI system before it is released | Accountability |

> **Exam trap.** Fairness is about outcomes: comparable people get comparable results. Inclusiveness is about access: nobody is left out because of a disability, a language or a level of skill. A biased loan model is a fairness problem; an application that can't be used with a screen reader is an inclusiveness problem.

> **Exam trap.** Transparency is about understanding: the system is explained and its limits are documented. Accountability is about people: someone answers for the system and a human can override it. "Explain the decision" is transparency; "a person reviews the decision" is accountability.

> **Exam tip.** When a scenario mentions personal data, consent, encryption or access rights, the answer is privacy and security. When it mentions testing, unexpected input, failures or harmful output, the answer is reliability and safety.

<!-- section: key-points -->
## Key points

- Fairness: similar people, similar outcomes; look for bias in data and compare results by group.
- Reliability and safety: works as designed, even in unexpected conditions; testing, monitoring, content filters.
- Privacy and security: protect personal data and access; consent, minimization, PII redaction, access control.
- Inclusiveness: usable by everyone; accessibility, languages, inclusive design.
- Transparency: users know they deal with AI and understand its behavior and limits.
- Accountability: people answer for the system and keep control; governance and human review.
