# K-ai-103-sr1 — report

6 Yes/No series (18 questions), one Yes per series, Yes position varied (1, 1, 2, 2, 3, 3).

| Series | Domain | Objective | Topic |
| --- | --- | --- | --- |
| ai103-sr1-keyless-app | planning | 1.3.4 | Managed identity + Foundry User vs Key Vault key vs Contributor |
| ai103-sr1-tool-injection | planning | 1.4.1 | Guardrail Indirect attacks on Tool response; agent guardrail overrides model guardrail |
| ai103-sr1-refund-approval | generative | 2.2.5 | MCPTool `allowed_tools` + `require_approval` never-list, approval request/response |
| ai103-sr1-background-edit | vision | 3.1.3 | images/edits with alpha mask vs inverted mask vs generations |
| ai103-sr1-contract-translation | text | 4.1.3 | Batch document translation + glossary vs text translation vs portal single-file |
| ai103-sr1-hybrid-parts | extraction | 5.1.2 | Hybrid + semantic ranker vs vector only vs keyword + semantic |

Difficulty: 5 easy, 10 medium, 3 hard.

## Doubts and notes

- Foundry RBAC roles were renamed (Foundry User = former Azure AI User). The solution text names "Foundry User (previously named Azure AI User)". The keyless-auth page (configure-entra-id) still says "Cognitive Services User", while the RBAC page says not to use Cognitive Services roles; the series relies on the RBAC page.
- Guardrail Tool response / Tool call intervention points and agent guardrails are Preview (stated in the solution text).
- MCP `require_approval` dict form (`{"never": [...]}`) is documented, but Learn shows no Python sample of it; the Python form is assumed to be the same dict.
- hybrid-parts-1 explanation (vector search can miss exact part numbers) is the general rationale of hybrid search; the fetched hybrid query page does not state it explicitly.
- Python SDK signatures (`VectorizableTextQuery(text, k_nearest_neighbors, fields)`, `search(..., query_type, semantic_configuration_name)`) checked in the azure-search-documents 12.1.0 wheel because the WebFetch budget ran out.
- French: "Recherche Azure AI" and "classeur sémantique" not re-checked on fr-fr (WebFetch budget exhausted).
