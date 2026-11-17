Data is a collection of facts (numbers, descriptions, observations) used to record information. The exam gives you an example of data and expects you to classify it as structured, semi-structured or unstructured, and to know what each category implies.

<!-- section: structured-data | objectives: 1.1.1 -->
## Structured data

Data describes **entities**, the things an organization wants to keep track of (customers, products, sales orders), through their **attributes** (a customer's name, address, phone number).

**Structured data** adheres to a **fixed schema**: every record has the same fields. The schema is most often **tabular**: each **row** is one instance of the entity and each **column** is one attribute.

| CustomerID | FirstName | LastName | City |
| --- | --- | --- | --- |
| 1 | Ana | Ruiz | Lisbon |
| 2 | Kenji | Sato | Osaka |
| 3 | Lea | Martin | Lyon |

- Every row has the same columns, and each column holds one kind of value (text, number, date).
- Structured data is usually stored in a **relational database**, where several tables reference one another through key values.
- Because the shape is known in advance, the data is easy to filter, sort and aggregate with SQL.

Typical examples: the accounts and transactions of a bank, an inventory, the orders of an online store, a spreadsheet in which every row has the same columns.

<!-- section: semi-structured-data | objectives: 1.1.2 -->
## Semi-structured data

**Semi-structured data** has some structure, but that structure may **vary from one instance of the entity to another**. One customer has two phone numbers and an email address, another has only an email address, a third has an extra field that the others don't have.

The most common format is **JavaScript Object Notation (JSON)**:

```json
[
  {
    "id": 1,
    "name": "Ana Ruiz",
    "contacts": [
      { "type": "email", "value": "ana@contoso.com" },
      { "type": "mobile", "value": "555-0101" }
    ]
  },
  {
    "id": 2,
    "name": "Kenji Sato",
    "company": "Fabrikam",
    "contacts": [
      { "type": "email", "value": "kenji@fabrikam.com" }
    ]
  }
]
```

- Each item carries the **names of its fields** together with their values, so two items of the same collection don't need the same fields.
- A field can contain another object (nesting) or a list of values, which a single row of a table can't do.
- JSON is only one way to represent semi-structured data; the category is defined by the flexible structure, not by the format.
- Semi-structured data is typically kept in files or in a non-relational database that stores documents.

> **Exam trap.** Semi-structured doesn't mean unstructured. A JSON document has named fields: it has a structure, but not a fixed one. If the question says that the fields differ from one item to another, the answer is semi-structured.

<!-- section: unstructured-data | objectives: 1.1.3 -->
## Unstructured data

**Unstructured data** has **no specific structure**: there are no fields that a program could read without interpreting the content.

- Examples: documents, images, audio and video recordings, binary files.
- It is stored as files; in Azure, large amounts of unstructured data go to **Azure Blob Storage**.
- To filter or aggregate it, the content must first be analyzed (for example to extract the text of a scanned invoice).

Microsoft Learn also mentions **vector data**, or *embeddings*: a numerical representation of content such as text or images, which AI applications use to find content with a similar meaning.

> **Exam trap.** A text document, a PDF contract or an email attachment contains readable words, yet it is unstructured data: nothing splits the content into fields that are the same for every item.

<!-- section: classifying-data | objectives: 1.1.1, 1.1.2, 1.1.3 -->
## Classifying an example

| Category | Schema | Typical form | Typical store |
| --- | --- | --- | --- |
| Structured | Fixed: the same fields for every record | Tables of rows and columns | Relational database |
| Semi-structured | Flexible: fields can vary between items | JSON documents | Files, document database |
| Unstructured | None | Documents, images, audio, video, binary files | File or blob storage |

| Example in the question | Category |
| --- | --- |
| A table of bank transactions with the columns date, account and amount | Structured |
| A product list in which every product has the same five attributes | Structured |
| A JSON product catalog in which each product has its own set of attributes | Semi-structured |
| Customer profiles in which the contact details differ from one customer to another | Semi-structured |
| Photos of products and promotional videos | Unstructured |
| Recordings of calls to a support center | Unstructured |
| Scanned contracts stored as PDF files | Unstructured |

> **Exam tip.** Ask one question: does every item have the same fields? Yes: structured. Fields exist but vary: semi-structured. No fields at all: unstructured.

<!-- section: key-points -->
## Key points

- Entities are described by attributes; a row is one instance of an entity, a column is one attribute.
- Structured: fixed schema, tabular, same fields for every record, usually in a relational database.
- Semi-structured: some structure that varies between items; JSON is the common format.
- Unstructured: no specific structure; documents, images, audio, video, binary files.
- JSON isn't unstructured, and a text document isn't structured.
