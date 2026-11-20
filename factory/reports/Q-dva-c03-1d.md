# Q-dva-c03-1d — report

33 questions in `content/dva-c03/questions/development/`, prefix `dvac03-1d-`: 1.3.2 ×11, 1.3.3 ×11, 1.3.4 ×11; single 27, multi 6; difficulty 10 / 16 / 7. Validator: 0 problem(s).

## Notes and doubts

- Course chapters for 1.3.x did not exist yet when the batch was written: questions are based on the AWS documentation only and were not cross-checked with the course.
- Multi questions keep the scoring NOTE sentence, following the existing saa-c03 bank, although the blueprint says AWS multi scoring is all-or-nothing (the loader ignores that rule for now). If the NOTE is removed for AWS, remove it here too.
- Reference titles come from the fetched pages. Two Lambda pages are currently titled "... Lambda Event Functions ..." (configuration-vpc.html, configuration-ephemeral-storage.html); they were kept exactly as fetched.
- `dvac03-1d-cache-lambda-dax-access`, option d: the claim that the standard DynamoDB SDK client cannot call a DAX cluster endpoint is inferred from the DAX client pages (applications must switch to the DAX client); no page states it in those words.
- `dvac03-1d-cache-apigw-invalidation-auth`: the option text says "Require authorization for cache invalidation" with FAIL_WITH_403 / SUCCEED_WITHOUT_RESPONSE_HEADER; the handling values and execute-api:InvalidateCache come from the fetched API Gateway caching page, the console label was not checked.
- `dvac03-1d-cache-dax-query-ttl`: the fix applies a custom parameter group to an existing cluster; the fetched page says parameter groups can be modified on a running cluster and that new TTLs apply to items cached afterward.
- Facts deliberately avoided because not verified: per-partition throughput numbers (3,000 RCU / 1,000 WCU), DAX ports, ElastiCache session-store guidance, transactional RCU/WCU doubling, global tables MRSC details.
- S3 maximum object size is now 50 TB (single PUT 5 GB), as stated on the fetched "Uploading objects" page.
