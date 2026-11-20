# Q-soa-c03-5c — report

30 questions (5.3.3: 10, 5.3.4: 10, 5.3.5: 10), single 25 / multi 5, difficulty 8/16/6. Validator: 0 problem(s).

## Facts relied on but not read verbatim on a fetched page
- `soac03-5c-vpce-private-dns`: gateway endpoints exist only for S3 and DynamoDB (general knowledge); `aws ec2 describe-vpc-endpoints` output shape built from the API field names.
- `soac03-5c-s3-onprem-interface-endpoint`: S3 interface endpoints are reachable from on-premises with endpoint-specific DNS names (the fetched interface-endpoint page mentions only the S3 inbound-Resolver private DNS option).
- `soac03-5c-im-local-events-sns`, option d: CloudWatch Logs subscription filter destinations (Kinesis Data Streams, Data Firehose, Lambda, OpenSearch Service) from general knowledge.
- `soac03-5c-client-vpn-intermittent`, option a: authorization rules apply to destination networks and groups, not to subnet associations (general Client VPN knowledge).
- `soac03-5c-vpn-idle-startup-action`: console labels Start/Restart/Clear map to the API values `start`, `restart`, `clear` (API reference fetched).

## Choices
- No question depends on what happens when the 100-prefix BGP limit is exceeded on a VGW VPN (behavior not documented on the fetched page); DX prefix limit used only as a distractor.
- Stale-content-on-origin-error questions avoided: the Expiration page says CloudFront may return a stale cached object on origin errors even without `stale-if-error`, which makes such scenarios ambiguous.
- Avoided duplicates of DVA/SAA CloudFront questions (query-string cache key, User-Agent/Origin Shield, versioned file names, SPA max-age).
- Network Synthetic Monitor metric names not verified: questions say "packet loss metric" and "network health indicator" without metric IDs. Cache hit rate referred to by its console name.
- French: "politique de demande d'origine", "taux d'accès au cache", "city-network" kept in English, "indicateur de santé du réseau (NHI)", "sonde" (probe), "action de démarrage" / "action de délai DPD", "interface virtuelle privée", "tunnel partagé (split-tunnel)". Worth a glossary check against docs.aws.amazon.com/fr_fr.
