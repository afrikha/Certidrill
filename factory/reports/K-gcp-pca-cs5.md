# K-gcp-pca-cs5 — report

1. 3 original case studies (Google format, 6 tabs): gcppca-cs5a-brambleway-grocers (grocery delivery retailer), gcppca-cs5b-corvane-telecom (telecom operator), gcppca-cs5c-ashgrove-power (electric utility with smart meters).
2. 15 questions (5 per case): single=13, multi=2 (Choose two.); difficulty 3 easy / 8 medium / 4 hard.
3. Domains: design 3, provisioning 5, security 3, processes 2, implementation 1, operations 1 (cs5a 4 domains, cs5b 4, cs5c 5).
4. Facts checked with WebFetch on docs.cloud.google.com (2026-11-27); every reference is a fetched page with its H1 title. No Preview feature is a correct answer.
5. `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-cs5` → 18 files, 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-cs5` → 0 problem(s), 0 warning(s).

## Notes and doubts

- I grepped the existing stems before writing, so these decisions are new to the bank: GKE placeholder Pods with a low PriorityClass, Cloud Armor bot management with reCAPTCHA tokens, a BigQuery row access policy with a subquery lookup table, BigQuery ML ARIMA_PLUS with a time series ID column, Database Migration Service for SQL Server from backup files, Oracle Database@Google Cloud (Exadata, BYOL), MACsec for Cloud Interconnect, Workload Identity Federation with X.509 certificates, GKE multi-network for Pods (Device type for DPDK), Data Guard to standby Exadata for regional DR, Cloud CDN serve-while-stale, Confidential VM, BigQuery physical storage billing, Dataflow system lag alerting, and Dataform. Firestore offline sync was considered and dropped because gcppca-1c-mobile-profiles-media already tests it.
- Launch stages: WIF with X.509 certificates has been GA since 2025-05-07 (IAM release notes). None of the bot management, multi-network, MACsec, serve-stale, Dataform or Oracle Database@Google Cloud pages I fetched shows a Preview label. The fetched content does not state a launch stage outright, though.
- GKE placeholder Pods: the option uses priority -10, because the doc says that in Standard clusters with node auto-provisioning, GKE does not create nodes for Pods with a priority below -10. I left "capacity buffers" out of the options because I did not check its launch stage.
- Cloud Armor bot management: the fetched page does not list the supported load balancer types. The case uses a global external Application Load Balancer, which is the type the page mentions.
- Datastream: the overview names Cloud SQL as a destination only through Dataflow templates, not as a direct destination. The explanation of the Datastream distractor says this.
- Oracle Database@Google Cloud: the license type (BYOL or license-included) and RAC come from the Architecture Center page "Enterprise application on Compute Engine with Oracle Exadata". Marketplace ordering and Google invoicing come from "Purchase and billing". The case does not name regions, because I did not check where the service is available.
- The "RAC cluster stretched across regions" distractor (gcppca-cs5b-billing-dr) is rejected because the reference architecture uses Data Guard to standby Exadata for regional recovery. The fetched pages do not say outright that a stretched RAC cluster is unsupported.
- MACsec: the doc says it is available on 100-Gbps and 400-Gbps connections in every location, and on 10-Gbps connections only at some facilities. The HA VPN over Cloud Interconnect page gives a 50-Gbps limit per encrypted VLAN attachment. Both facts are used in the explanation.
- BigQuery storage prices were checked on the pricing page (active physical $0.040 vs active logical $0.023 per GiB-month, US). The case shows a compression ratio of about 9:1, so the cost decision does not depend on exact prices.
- A Dataflow "data freshness" metric was not documented on the fetched monitoring page. The alerting question therefore uses system lag, which that page defines and gives as its alerting example.
