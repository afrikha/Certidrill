Security on AWS is a shared responsibility: AWS secures the cloud itself, and the customer secures what it puts in the cloud and how it configures it. The exam asks which party owns a given task, which tasks both parties perform on their own layer, and how the split moves when a customer chooses Amazon EC2, Amazon RDS or AWS Lambda.

<!-- section: model | objectives: 2.1.1, 2.1.2 -->
## The AWS shared responsibility model

| Item | AWS: security **of** the cloud | Customer: security **in** the cloud |
| --- | --- | --- |
| Scope | The infrastructure that runs every AWS service | Everything the customer deploys, stores and configures |
| Components | Hardware, software, networking and facilities; the global infrastructure (Regions, Availability Zones, edge locations); the host operating system and the virtualization layer; the software of managed services | Customer data; applications; identity and access management; guest operating system, where the customer has one; network and firewall configuration; client-side and server-side encryption choices; protection of network traffic |
| Varies by service? | Grows when the service is more managed | Shrinks when the service is more managed, but never disappears |

The model reduces the customer's operational burden: AWS operates, manages and controls the components from the host operating system and virtualization layer down to the physical security of the facilities.

> **Exam trap.** "Security of the cloud" is AWS; "security in the cloud" is the customer. Memorize the prepositions: the options of a question often swap them.

<!-- section: customer-responsibilities | objectives: 2.1.3 -->
## The customer's responsibilities

Whatever the service, the customer is always responsible for:

- **its data**: classifying it, choosing whether and how to encrypt it, and deciding who can access it;
- **identity and access management**: IAM users, groups, roles and policies, MFA, the protection of the root user and of access keys;
- **the configuration of AWS-provided controls**: security groups, network ACLs, bucket policies, Amazon S3 Block Public Access settings, encryption settings;
- **its applications and code**.

Depending on the service, the customer is also responsible for:

- the **guest operating system** of its EC2 instances: updates and security patches;
- the **software it installs** on those instances (a web server, a database engine, an agent);
- the **network configuration** of its VPC: subnets, route tables, firewall rules.

<!-- section: aws-responsibilities | objectives: 2.1.4 -->
## AWS responsibilities

AWS is always responsible for:

- the **physical security** of data centers: access control, guards, surveillance, environmental controls (power, cooling, fire suppression);
- the **hardware**: servers, storage devices, network equipment, and their secure decommissioning;
- the **global network** and the **global infrastructure**: Regions, Availability Zones and edge locations;
- the **host operating system and the virtualization layer** (hypervisor) that isolate customers from one another;
- for managed services, the **operating system, platform and software** that run the service.

A customer can never visit an AWS data center to audit it. AWS proves its controls with independent third-party audits, whose reports are available in AWS Artifact (chapter 22).

<!-- section: shared-controls | objectives: 2.1.5 -->
## Responsibilities that the customer and AWS share

Some IT controls exist on both sides, each party applying them to its own layer:

| Type of control | Who | Examples |
| --- | --- | --- |
| **Inherited controls** | Fully from AWS | Physical and environmental controls of the data centers |
| **Shared controls** | AWS on the infrastructure, the customer on its own resources | **Patch management**: AWS patches the infrastructure, the customer patches its guest operating systems and applications. **Configuration management**: AWS configures its infrastructure devices, the customer configures its operating systems, databases and applications. **Awareness and training**: AWS trains its employees, the customer trains its own |
| **Customer-specific controls** | Only the customer | Routing or zoning data within specific security environments, according to the application deployed |

> **Exam tip.** When the question asks for a responsibility that is **shared**, the answer is patch management, configuration management or awareness and training. Physical security is never shared: it is inherited from AWS.

<!-- section: service-shift | objectives: 2.1.6 -->
## How the split shifts with the service

The more a service is managed, the more AWS takes on. The customer's data, access permissions and encryption decisions never move to AWS.

| Task | Amazon EC2 | Amazon RDS | AWS Lambda | Amazon S3, Amazon DynamoDB |
| --- | --- | --- | --- | --- |
| Physical security, hardware, hypervisor | AWS | AWS | AWS | AWS |
| Operating system patches | Customer (guest operating system) | AWS | AWS | AWS |
| Database engine patches | Customer, if it installs a database on the instance | AWS, during a maintenance window that the customer chooses | Not applicable | Not applicable to S3; AWS for DynamoDB |
| Runtime and scaling of the service | Customer (instance size, Auto Scaling) | Customer chooses the instance class and options; AWS runs the engine | AWS manages the runtime and scales functions | AWS |
| Network access rules | Customer (security groups, network ACLs) | Customer (security groups of the DB instance) | Customer, for functions connected to a VPC | Customer (bucket policies, table permissions) |
| Application code | Customer | Customer (queries, schema, database users) | Customer (function code and its dependencies) | Customer |
| Data, IAM permissions, encryption choices | Customer | Customer | Customer | Customer |

- **Amazon EC2** is infrastructure as a service: the customer manages almost every layer above the hypervisor.
- **Amazon RDS** is a managed database: AWS installs, patches and backs up the engine and its operating system; the customer has no access to that operating system and manages the database's users, data and network access.
- **AWS Lambda** is serverless: there is no server or operating system to manage at all; the customer writes the code and sets its IAM permissions and configuration.
- **Amazon S3 and DynamoDB** are abstracted services: the customer only stores and retrieves data through endpoints and manages that data, its encryption and its permissions.

> **Exam trap.** Moving from EC2 to RDS or Lambda transfers operating system patching to AWS, but **not** the protection of data. "Who is responsible for configuring a security group", "for encrypting the data" or "for granting IAM permissions" is always the customer, whatever the service.

<!-- section: key-points -->
## Key points

- AWS: security of the cloud (facilities, hardware, network, global infrastructure, host operating system and virtualization).
- Customer: security in the cloud (data, IAM, configuration of security groups and encryption, applications, guest operating system).
- Shared controls: patch management, configuration management, awareness and training. Inherited: physical and environmental. Customer-specific: zoning data.
- EC2: customer patches the guest operating system. RDS: AWS patches the operating system and engine. Lambda: no operating system for the customer. Data and permissions always stay with the customer.
