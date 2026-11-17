AI-901 is the exam of the Microsoft Certified: Azure AI Fundamentals certification. It checks two things: that you recognize AI concepts and workloads, and that you know how to put them to work in Microsoft Foundry, which means choosing the right portal action, tool or model and reading a short Python snippet. Machine learning theory isn't part of the skills measured.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 45 minutes of exam time (65 minutes of seat time) |
| Questions | Not published; about 35 to 45 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Closed book: Microsoft Learn isn't available during fundamentals exams |
| Prerequisites | None; Microsoft expects basic Python syntax and familiarity with Azure resources |
| Skills measured | Version of April 15, 2026 |

The two domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Identify AI concepts and capabilities | 40 to 45 % |
| Implement AI solutions by using Microsoft Foundry | 55 to 60 % |

Question formats: one answer among four, several answers ("select two"), series of three Yes/No statements, sentences or short code to complete with a drop-down list, and matching by drag and drop. There is no case study and no lab. Questions with several elements give one point per correct element.

<!-- section: reading-questions -->
## Reading a question

Stems are short: a need in one or two sentences, then "Which principle?", "What should you use?" or a piece of code with a blank. Train yourself to turn the sentence into a keyword:

| Words in the question | Think of |
| --- | --- |
| "similar applicants get different results", "bias against a group" | Fairness |
| "usable by people with disabilities", "captions", "many languages" | Inclusiveness |
| "users know an AI wrote the answer", "explain how the result was produced" | Transparency |
| "a person reviews the decision", "who answers for the system" | Accountability |
| "behaves as designed in unexpected conditions", "blocks harmful content" | Reliability and safety |
| "protect personal data", "control who can access" | Privacy and security |
| "more creative" or "more predictable" answers | Temperature |
| "limit the length of the answer" | Max output tokens |
| "set the role, tone and rules of the assistant" | System prompt (instructions) |
| "audio to text" | Speech recognition |
| "text to audio" | Speech synthesis |
| "describe a picture", "answer a question about a photo" | Multimodal model with image input |
| "create a picture from a description" | Image-generation model |
| "fields from invoices, receipts or recordings" | Azure Content Understanding |
| "reuse a model with its instructions and tools" | Agent |

Code questions don't ask you to write a program. They ask you to spot a few identifiers: which client is created, which method is called, which parameter carries the deployment name, the prompt or the image. For each snippet of this course, know what every line is for.

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Fairness | Inclusiveness | Fairness: comparable people get comparable outcomes; inclusiveness: nobody is prevented from using the system |
| Transparency | Accountability | Transparency: people understand what the system does and its limits; accountability: people answer for it and keep control |
| Reliability and safety | Privacy and security | The first is about how the system behaves; the second about protecting data and access |
| System prompt | User prompt | The system prompt sets role and rules for the whole conversation; the user prompt is one request |
| Temperature | Max output tokens | Temperature changes how varied the answer is; max output tokens caps its length |
| Model | Agent | A model generates an answer to a prompt; an agent packages a model with instructions and tools |
| Chat client | Agent client | A chat client names a model deployment and sends its own instructions; an agent client references an agent by name |
| Speech recognition | Speech synthesis | Recognition turns speech into text; synthesis turns text into speech |
| Image analysis | Image generation | Analysis goes from an image to text; generation goes from text to an image |
| Multimodal model | Foundry Tool | A model follows a free prompt; a Foundry Tool such as Azure Language or Azure Speech does one task with predictable, structured output |
| OCR | Field extraction | OCR returns the text of a document; field extraction returns named values such as the invoice total |
| Foundry resource | Foundry project | The resource is the Azure resource that hosts models and services; a project is a workspace inside it |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order; each one is short. The first three cover the concepts, the last four cover Foundry.
2. Create a Foundry project, deploy a chat model and try the playground: writing instructions, changing a parameter and saving an agent makes the vocabulary concrete.
3. Read every code snippet line by line until you can say which client, method and parameter it uses.
4. After each domain, take a mock exam and reread the sections linked to your mistakes.
5. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
