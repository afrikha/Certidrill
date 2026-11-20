# Q-clf-c02-3d — report

48 questions `clfc02-3d-*` in `content/clf-c02/questions/technology/` (3.6.5–3.6.8, 3.7.1–3.7.4, 3.8.1–3.8.4, 4 each). single 42, multi 6; difficulty 20 easy / 21 medium / 7 hard. Validator: 0 problem(s).

## Sources
Every reference page was fetched with WebFetch in this session (docs.aws.amazon.com, aws.amazon.com/premiumsupport/plans/, aws.amazon.com/storagegateway/faqs/). curl to docs.aws.amazon.com is blocked by the proxy. The shared WebFetch quota ran out once (about 15:45 UTC). I drafted the storage questions from pages I had already fetched, then checked every other fact after the quota reset at 16:00 UTC.

## Naming decisions and doubts
- **Amazon Connect**: the documentation now says "Amazon Connect Customer is the current name for the product previously called Amazon Connect". The questions use the exam guide name, Amazon Connect, and the explanation of `clfc02-3d-connect-contact-center` mentions the new name once.
- **Amazon Quick**: the documentation title is "AWS Quick". The questions use the guide name, Amazon Quick, as chapter 37 does, and `clfc02-3d-quick-dashboards` mentions the documentation name.
- **Amazon Q**: Amazon Q Business is closed to new customers (chapter 37), so the Amazon Q question uses Amazon Q Developer. Its page announces end of support for the Amazon Q Developer IDE plugins on April 30, 2027, with Kiro as the replacement. The question will need a review then.
- **FSx File Gateway**: not available to new customers (verified). It appears only as a wrong option, and its explanation says so.
- Out-of-scope services (Data Lifecycle Manager, CodeDeploy, FSx for Lustre) are not used. Neither are Amazon Pinpoint, Amazon Chime, AWS CodeCommit or Snowball, because their availability is uncertain or they are closed.
- Some facts could not be verified on the fetched pages, so they were left out: Hive on EMR, "full-text search" for OpenSearch, Textract "key-value pairs", the named CodePipeline stages, the target vault inside backup rules, and "pre-trained" for Rekognition.
- Overlap risk with parallel batches: 3.8.3 (customer enablement) is close to 3.8.10 (batch 3e) and 4.3.x (Support plans). This batch tests Support Center cases, Basic Support case types, re:Post and the Support API. It does not test which plan to choose.
