# QZ-dp-900-22-azure-relational-services — report

File: `content/dp-900/quizzes/22-azure-relational-services.yaml` (10 questions, `dp900-qz-22-01`…`10`). Check: 0 problem(s), 0 warning(s).

Coverage: 2.2.1 (Q1, Q3, Q4, Q6, Q8, Q9, Q10), 2.2.2 (Q2, Q5, Q7). Positions 6–10: multi, dragdrop, hotarea, yesno ×2.

Pages fetched (Nov. 24, 2026): DP-900 units "Describe Azure SQL services and capabilities" and "Describe Azure services for open-source databases"; "Features comparison: Azure SQL Database and Azure SQL Managed Instance"; "What is Azure SQL Managed Instance?". The hourly WebFetch limit was then reached; the "What is Azure SQL?" overview was not fetched and is not referenced.

## Chapter vs current Learn (chapter not edited)
- Serverless: Learn says the database can pause automatically **in the General Purpose tier**; the chapter (Azure SQL Database table) says it "can pause when it is inactive" without that qualifier.
- Managed Instance now has update policies (Always-up-to-date, SQL Server 2022, SQL Server 2025 update policy, per the MI overview page). The chapter's decision row "a specific version of SQL Server, upgraded only when you decide → SQL Server on Azure VMs" stays right (MI still applies updates automatically), but the chapter could mention that MI isn't always on the newest engine.
- CLR on Managed Instance: supported "without access to the file system in CREATE ASSEMBLY" (features comparison). The chapter lists CLR among MI features without the restriction; harmless at DP-900 level. Q6 uses Service Broker + Database Mail rather than CLR to avoid this caveat.
- Learn's unit now also mentions the Azure SQL Database free tier and Copilot in Azure (preview); not in the chapter, not used.
- The features-comparison page's HTML `<title>` is now "Compare SQL Database Engine Features - Azure SQL Database & Azure SQL Managed Instance"; its H1 is still "Features comparison: Azure SQL Database and Azure SQL Managed Instance", used as reference title (as in the mock bank).

## Doubts
- Q5 s3 (PostgreSQL data protected at rest and in transit): Learn states it for MySQL and says PostgreSQL has "the same … security … benefits"; the chapter states it for both.
- Q9 s3 (zone redundancy raises the SLA): Learn wording "SLA that increases with zone redundancy"; zone redundancy isn't offered on every tier, which the statement doesn't need.
- Q2 distractor explanation calls the SQL Server engine "not object-relational" — a simplification consistent with the Learn unit.
