# K-ai-300-sr1 — 6 Yes/No series, AI-300

Series (prefix `ai300-sr1`), 18 questions, answers 9 Yes / 9 No, difficulty 4 easy / 10 medium / 4 hard:

| Series | Objective | Domain | Answers |
| --- | --- | --- | --- |
| private-workspace | 1.3.4 | mlops | Y N N |
| shadow-green | 2.3.3 | ml-lifecycle | N N Y |
| training-drift | 2.4.1 | ml-lifecycle | Y N N |
| eu-ptu | 3.2.4 | genaiops | Y N Y |
| fabrication-eval | 4.1.2 | quality | N Y N |
| error-codes | 5.1.3 | optimization | N Y Y |

Six series over five domains: ml-lifecycle has two (different objectives).

## Points to check

- The Learn web-fetch budget ran out before the Python SDK `mirror_traffic` syntax could be checked, so the SDK option was dropped. All three shadow-green solutions use CLI or REST.
- private-workspace-1: Learn does not say outright that adding a private endpoint leaves `public_network_access` enabled. It only shows the setting as separate, and says removing private endpoints doesn't make the workspace public. The explanation is phrased to match that. `--public-network-access Disabled` on `az ml workspace update` is inferred from the documented `Enabled` example.
- eu-ptu: the statement that Sweden Central belongs to the EU data zone is inferred. Learn says Data Zone Provisioned keeps processing "within a geographic zone (US or EU)", and Sweden is an EU member.
- error-codes: `"kind": "text"` with a `text` property is documented in prose (vectorizer required). The JSON property name `text` was not seen verbatim.
- training-drift: `monitoring_signals` and `alert_notification` are placed under `create_monitor`, as in the Learn sample. The indentation of the fetched snippet was ambiguous. The prediction-drift explanation (it compares output distributions) is inferred from the sample's `model_outputs` data context.
