Cloud computing is the on-demand delivery of IT resources over the internet with pay-as-you-go pricing: instead of buying and running servers, you use compute, storage, databases and other services from AWS when you need them and pay only for what you use. The exam asks you to match a business statement to one of the six advantages of cloud computing, to the benefit of the global infrastructure, or to high availability, elasticity or agility.

<!-- section: value-proposition | objectives: 1.1.1 -->
## The value proposition of the AWS Cloud

AWS summarizes the value of the cloud in six advantages. Learn their exact names: the exam often quotes them.

| Advantage | What it means | Typical stem |
| --- | --- | --- |
| **Trade fixed expense for variable expense** | No large investment in data centers and servers before you know how you'll use them; you pay only when you consume resources, and only for what you consume | "avoid upfront hardware purchases", "pay only for what is used" |
| **Benefit from massive economies of scale** | AWS aggregates the usage of hundreds of thousands of customers, which translates into lower pay-as-you-go prices | "lower prices because AWS buys at scale" |
| **Stop guessing capacity** | No expensive idle resources and no shortage: you use as much or as little as you need and scale up and down in minutes | "the company overprovisions servers for its yearly peak" |
| **Increase speed and agility** | New resources are a click away: the time to make them available to developers drops from weeks to minutes | "developers wait weeks for a server", "experiment quickly" |
| **Stop spending money running and maintaining data centers** | Focus on the projects that differentiate the business, not on racking, stacking and powering servers | "the IT team spends its time maintaining hardware" |
| **Go global in minutes** | Deploy an application in several Regions around the world in a few clicks, for lower latency at minimal cost | "serve customers on another continent with low latency" |

These advantages are the reason AWS is a **utility** model: like electricity, capacity is consumed as a service and billed by usage. On AWS, a company doesn't own or depreciate the hardware; it pays an operating expense.

> **Exam trap.** "Trade fixed expense for variable expense" and "Benefit from massive economies of scale" are both about cost. The first is about *when and how* you pay (no upfront purchase, pay per use); the second is about *the price itself* being lower because AWS buys and operates at a huge scale.

<!-- section: global-infrastructure-benefits | objectives: 1.1.2 -->
## Benefits of the global infrastructure

The AWS global infrastructure is made of **Regions** (separate geographic areas), each with several **Availability Zones** (one or more data centers with independent power, cooling and networking), and **edge locations** that bring content and DNS answers close to users. Chapter 32 details how they relate; here, the exam asks what they bring to a business.

| Benefit | How the global infrastructure delivers it |
| --- | --- |
| **Speed of deployment** | Resources are already built and waiting in every Region: a new environment takes minutes instead of the months of a new data center. A template (AWS CloudFormation) deploys the same environment again in another Region |
| **Global reach** | A company can run its application in a Region close to each group of customers without building or renting a facility in their country |
| **Low latency** | Users are served from the nearest Region, and from edge locations for cached content (Amazon CloudFront) |
| **Data residency** | The customer chooses the Region where its data is stored; data doesn't leave that Region unless the customer copies or replicates it |
| **Resilience** | Several Availability Zones per Region, and several Regions, allow designs that survive the loss of a data center or of a whole Region |

> **Exam tip.** "Expand to a new country in days, without building a data center" is **go global in minutes**, a benefit of the global infrastructure. "Keep customer data inside the European Union" is answered by **choosing the Region**, not by a security service.

<!-- section: availability-elasticity-agility | objectives: 1.1.3 -->
## High availability, elasticity and agility

| Concept | Definition | How AWS provides it | Typical stem |
| --- | --- | --- | --- |
| **High availability** | The system keeps running, with minimal downtime, when a component fails | Run resources in **several Availability Zones**, behind a load balancer; managed services with Multi-AZ options | "the application must remain available if a data center fails" |
| **Elasticity** | Resources are added and removed **automatically** to match demand, in both directions | **Auto Scaling** adds instances during a peak and removes them when demand falls; serverless services scale on their own | "traffic varies a lot during the day", "pay only for the capacity used at each moment" |
| **Agility** | The organization can try, change and deliver quickly and cheaply | Resources in minutes, managed services, automation; an experiment that fails costs little and is deleted | "reduce the time to launch new features", "experiment with new ideas" |

Related terms the options use:

- **Scalability**: the ability to grow to handle more load, by adding resources (horizontal scaling: more instances) or by using a bigger resource (vertical scaling: a larger instance). Elasticity is scalability that happens automatically and also shrinks.
- **Fault tolerance**: the system keeps working *without any interruption* when a component fails, because redundant components take over. High availability accepts a very short interruption; fault tolerance aims for none.
- **Durability**: the data isn't lost. Amazon S3 is designed for 99.999999999 % (11 nines) durability by storing data redundantly across at least three Availability Zones (except the S3 One Zone storage classes).

> **Exam trap.** Elasticity is about **demand that changes** (scale out and back in); high availability is about **failures** (keep running when an Availability Zone is lost). "Handle Black Friday traffic, then stop paying for it" is elasticity, not high availability.

<!-- section: key-points -->
## Key points

- Cloud computing: on-demand IT resources over the internet, pay-as-you-go.
- Six advantages: fixed to variable expense, economies of scale, stop guessing capacity, speed and agility, no data center maintenance, go global in minutes.
- Global infrastructure: speed of deployment, global reach, low latency, data residency by choice of Region, resilience across Availability Zones and Regions.
- High availability: several Availability Zones. Elasticity: Auto Scaling in both directions. Agility: fast, cheap experimentation.
