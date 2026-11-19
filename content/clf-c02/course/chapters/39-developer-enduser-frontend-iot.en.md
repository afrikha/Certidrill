This chapter covers four more families of the exam guide: developer tools, end-user computing, frontend web and mobile, and the Internet of Things (IoT). Questions name a need ("build and test code automatically", "trace slow requests", "give employees a cloud desktop", "host a web app from a Git repository", "connect millions of sensors") and ask for the AWS service that meets it.

<!-- section: developer-tools | objectives: 3.8.4 -->
## Developer tool services

| Service | What it does |
| --- | --- |
| **AWS CLI** (Command Line Interface) | One tool to control AWS services from a terminal and to automate them in scripts |
| **AWS SDKs** | Libraries to call AWS services from application code (Java, Python, JavaScript, .NET...) |
| **AWS CodeBuild** | Fully managed **build** service: compiles source code, runs tests and produces packages ready to deploy. No build server to manage; you pay for build time |
| **AWS CodePipeline** | Fully managed **continuous delivery** service: models the release process as a **pipeline** of stages (source, build, test, deploy) that runs automatically at every code change |
| **AWS X-Ray** | Collects **traces** of requests as they travel through a distributed application; shows a **trace map** of the services involved and helps find the component that causes latency or errors |

Related tools seen in other chapters: **AWS CloudFormation** deploys infrastructure as code, **Amazon CloudWatch** collects metrics and logs.

<!-- section: developer-choice | objectives: 3.8.11 -->
## Tools to develop, deploy and troubleshoot

| Requirement | Service |
| --- | --- |
| Run AWS commands from a terminal or a shell script | AWS CLI |
| Call AWS services from application code | AWS SDKs |
| Compile code and run unit tests on each commit, without managing build servers | AWS CodeBuild |
| Automate the whole release process from the repository to production | AWS CodePipeline (with CodeBuild for the build stage) |
| Find which microservice slows down user requests | AWS X-Ray |
| Collect application logs and alarm on a metric | Amazon CloudWatch |
| Create the same infrastructure in several environments from templates | AWS CloudFormation |

> **Exam trap.** X-Ray and CloudWatch both help troubleshoot, but X-Ray follows **one request** across services (tracing), while CloudWatch collects **metrics, logs and alarms**. CodeBuild **builds**; CodePipeline **orchestrates** the stages and calls CodeBuild.

<!-- section: end-user-computing | objectives: 3.8.5 -->
## End-user computing services

End-user computing services run desktops, applications or browsers in AWS and **stream only the display** (pixels) to the user's device. Data stays in AWS, which helps security when devices are lost or unmanaged.

| Service | What users get | Typical use |
| --- | --- | --- |
| **Amazon WorkSpaces** | A full **virtual desktop** (Windows or Linux): WorkSpaces Personal (persistent desktop for one user) or WorkSpaces Pools (non-persistent desktops) | Remote employees, contractors, call centers, replacing on-premises virtual desktop infrastructure; monthly or hourly billing |
| **Amazon AppStream 2.0**, now documented as **Amazon WorkSpaces Applications** | **Desktop applications** streamed to a web browser or a client, without a full desktop | Give users one application (design software, a legacy business application) on any device, without installing it; one central version to maintain |
| **Amazon WorkSpaces Secure Browser** | A **web browser** that runs in AWS and is streamed to the user | Secure access to internal websites and SaaS applications from unmanaged devices, without a VPN client and without data on the device; the session is wiped at the end; pay as you go, per connected user per month |

<!-- section: vm-output-choice | objectives: 3.8.12 -->
## Presenting virtual machine output on end-user machines

| Requirement | Service |
| --- | --- |
| Each employee needs a persistent Windows desktop in the cloud, reachable from a laptop, a tablet or a thin client | Amazon WorkSpaces |
| Stream one Windows desktop application to users' browsers without giving them a desktop | Amazon AppStream 2.0 (WorkSpaces Applications) |
| Contractors must reach internal web applications from their own devices, with no data downloaded | Amazon WorkSpaces Secure Browser |

> **Exam trap.** Amazon EC2 runs virtual machines, but it doesn't deliver a desktop experience to end users. When the stem says "desktop", "stream applications" or "browser isolation" for employees, the answer is in the WorkSpaces family.

<!-- section: amplify | objectives: 3.8.6, 3.8.13 -->
## Frontend web and mobile: AWS Amplify

**AWS Amplify** is a set of tools and services to **build, deploy and host full-stack web and mobile applications** quickly:

| Part | What it does |
| --- | --- |
| **Amplify Hosting** | Connects a Git repository, builds and deploys the web app at every commit (CI/CD), and serves it globally through Amazon CloudFront; custom domains, branch previews |
| **Backend building** | Adds cloud features with little code: user sign-in (Amazon Cognito), data and APIs (AWS AppSync, Amazon DynamoDB), file storage (Amazon S3), functions (AWS Lambda) |
| **Client libraries and UI components** | Connect the frontend (React, Next.js, Angular, Vue, iOS, Android, Flutter, React Native) to these backend features |

| Requirement | Service |
| --- | --- |
| Frontend developers want to host a single-page web app from a Git repository with automatic deployments | AWS Amplify Hosting |
| Add authentication and a data backend to a mobile app with minimal cloud expertise | AWS Amplify |
| Publish a REST API in front of Lambda functions | Amazon API Gateway (Amplify can use it, but it is the API service) |

> **Exam tip.** "Frontend", "mobile app", "full-stack", "web developers with little AWS experience" point to AWS Amplify. A static website alone can also be hosted in Amazon S3 with CloudFront, but Amplify adds the CI/CD and the backend features.

<!-- section: iot | objectives: 3.8.7, 3.8.14 -->
## IoT services: AWS IoT Core

**AWS IoT Core** connects IoT devices (sensors, machines, vehicles, appliances) to the AWS Cloud securely and at scale:

| Capability | Role |
| --- | --- |
| **Device gateway and message broker** | Devices connect and exchange messages with MQTT, HTTPS or MQTT over WebSocket; billions of devices and trillions of messages |
| **Authentication and authorization** | Each device authenticates, typically with an X.509 certificate; IoT policies control what it can do |
| **Registry** | Records each device (thing) and its attributes |
| **Device shadow** | Stores the last reported and desired state of a device, so applications can read or change it even when the device is offline |
| **Rules engine** | Filters and routes device messages to AWS services: Lambda, DynamoDB, S3, Kinesis, SNS, SQS |

**AWS IoT Device Management** complements IoT Core to onboard, organize, monitor and update fleets of devices remotely.

| Requirement | Service |
| --- | --- |
| Connect sensors to the cloud and route their readings to a database | AWS IoT Core |
| Know the current state of a device that is offline | AWS IoT Core device shadow |
| Push a firmware update to a fleet of devices | AWS IoT Device Management |

<!-- section: key-points -->
## Key points

- AWS CLI: terminal and scripts. SDKs: application code. CodeBuild: build and test. CodePipeline: release pipeline. X-Ray: request tracing.
- WorkSpaces: virtual desktops. AppStream 2.0 (WorkSpaces Applications): streamed applications. WorkSpaces Secure Browser: streamed browser for web and SaaS apps.
- End-user computing streams pixels; data stays in AWS.
- AWS Amplify: build, deploy and host full-stack web and mobile apps; Amplify Hosting gives Git-based CI/CD and CloudFront delivery.
- AWS IoT Core: secure device connection, MQTT messaging, registry, device shadow, rules engine. IoT Device Management: fleet onboarding, monitoring and updates.
