# FIX-dp-300-1 — chapters 11, 12, 13, 21 and 22 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-300 11-deploy-azure-sql 12-scale-performance 13-migration 21-authentication-authorization 22-data-protection` 0 problems; `content:validate --cert dp-300` 0 problems, 0 warnings; `check-quiz dp-300` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. The only code change is the Bicep API version in chapter 11 (identical in both languages). The shared WebFetch budget and the hourly limit were each hit once; every finding below was fetched in the end.

## 11-deploy-azure-sql

| Finding | Learn | Change |
| --- | --- | --- |
| Arc row "Defender, best practices assessment: need Azure Monitor Agent" | Confirmed wrong as written (sql/sql-server/azure-arc/assess): the assessment is Windows-only, needs a Log Analytics workspace in the same subscription and installs AMA itself if it's missing. Defender for SQL on Arc uses its own extension (`AdvancedThreatProtection.Windows`) and the Defender page doesn't mention AMA (defender-for-sql-usage) | Arc table, Defender/assessment row |
| Fabric: connecting comes only from Fabric permissions | Confirmed (fabric/database/sql/authorization): "A permission to connect to the database can only be granted with Fabric roles or permissions"; at least Read on the item; DENY in the database wins | Fabric table: new row |
| Bicep sample on `2022-05-01-preview` | Confirmed GA versions exist: servers 2025-01-01, 2023-08-01 (templates/microsoft.sql/servers); servers/databases 2023-08-01 has `sku`, `autoPauseDelay`, `elasticPoolId`, `parent` | Both resources now `@2023-08-01` (same version as quiz q9) |
| Automated Patching vs IaaS Agent overview wording | Not refetched (the quiz writer read both today) | None |
| elasticPools `autoPauseDelay` | Not checked, not used | None |

## 12-scale-performance

| Finding | Learn | Change |
| --- | --- | --- |
| MI Business Critical storage "up to 4 TB (16 TB with premium-series)" | Confirmed imprecise (managed-instance/resource-limits): standard-series 1-4 TB; premium-series up to 5.5 TB, 16 TB from 64 vCores in major regions only (smaller regions 5.5 TB); memory optimized premium-series up to 16 TB | MI table, BC storage cell |
| Log write throughput: only per-vCore figures | Confirmed: GP 4.5 MiB/s per vCore, max 120 MiB/s; NGP 6 MiB/s per vCore, max 220 MiB/s, more IOPS don't raise it; BC 16 MiB/s per vCore, max 160 MiB/s (standard) or 192 MiB/s (premium) | Log write bullet |
| "Next-gen GP sets IOPS and memory independently" | Confirmed wrong scope: flexible memory is GA on premium-series for Next-gen GP **and** Business Critical, billed per GB | Sentence before the `az sql mi update` block |
| Easv7, Msv3/Mdsv3; Premium SSD v2 portal deployment in preview | No error in the chapter (QZ report) | None |

## 13-migration

| Finding | Learn | Change |
| --- | --- | --- |
| VM target: "add the VM as a replica of an existing AG" | Confirmed (data-migration/sql-server/virtual-machines/overview): the overview names a **distributed availability group** "when you have an availability group configured on-premises"; adding a replica isn't listed. Azure Migrate is the lift-and-shift method | 1.3.5 last paragraph |
| DMS online and offline for VM targets | Confirmed (azure/dms/dms-overview: SQL Server on Azure VMs online and offline; SQL Database offline only; logins and TDE: No) | "online or offline" added; DMS table row unchanged |
| MI link prerequisites incomplete | Confirmed (managed-instance-link-preparation): Always On AG feature + restart, multiple-database link mode, database master key in master, full recovery model, at least one full backup, ports 5022 (both ways) and 11000-11999 (SQL Server to MI), no overlapping ranges, trace flags -T1800 / -T9567 recommended | 1.3.3 prerequisites sentence |
| MI to SQL Server: TDE and `WITH MOVE` | Confirmed (restore-database-to-sql-server): service-managed TDE databases can't be restored; a CMK reachable through the SQL Server Connector for Azure Key Vault is required; `WITH MOVE` with explicit paths is required | 1.3.6 table, MI to SQL Server row |
| Copy/move: failover group on the instance | Confirmed (database-copy-move-how-to): "The source or destination SQL managed instance shouldn't be configured with a failover group". The page says nothing on service tiers | Copy/move rules bullet and troubleshooting row |
| BACPAC: Import/Export and Entra MFA | Confirmed (database-import): "doesn't support Microsoft Entra ID authentication when MFA is required" | Import constraints sentence |
| DMS offline and logins (SQL Database vs MI) | Learn disagrees: the DMS overview table says logins "No"; the MI migration overview says to move SQL logins and T-SQL Agent jobs with DMS offline | None (the chapter's statement is about SQL Database). For a human decision |

## 21-authentication-authorization

| Finding | Learn | Change |
| --- | --- | --- |
| Who can create Entra logins | Learn contradicts itself (authentication-azure-ad-logins): Permissions section "Microsoft Entra admin permission or membership in the loginmanager server role", CREATE LOGIN section "Only the Microsoft Entra admin can execute this command" | None. For a human decision |
| Server roles not supported for Entra groups | Confirmed (same page, group limitations) | New sentence after the server roles paragraph |
| Members of a fixed server role can add logins to it | Learn contradicts itself for Azure SQL Database (security-server-roles: the Overview callout says yes, the Permissions section says only the server admin or Entra admin). For SQL Server and MI the server-level-roles page says yes | None (the sentence is about Azure SQL Database). For a human decision |
| `ALTER LOGIN ... DISABLE` needs cache flushes | Confirmed: `DBCC FLUSHAUTHCACHE` and `DBCC FREESYSTEMCACHE('TokenAndPermUserStore')` for immediate effect | 2.1.4 DISABLE bullet |
| `##MS_...##` roles on MI | Confirmed (sql/.../server-level-roles, applies to SQL Server and MI): "Azure SQL Database and Azure SQL Managed Instance support these roles". Note: the Azure SQL Database roles page applies to SQL Database only and doesn't mention MI | Server roles table, SQL Server/MI row |
| dbcreator "any database" | Confirmed ("create, alter, drop, and restore any database"); the chapter doesn't claim otherwise | None |
| Entra-only auth disables Windows auth on MI | Not supported (authentication-azure-ad-only-authentication mentions only SQL authentication) | Parenthesis removed (an unverifiable claim is left out) |

## 22-data-protection

| Finding | Learn | Change |
| --- | --- | --- |
| Inaccessible "after about 30 minutes" | Confirmed (transparent-data-encryption-byok-overview): "in up to 10 minutes"; Key Vault 4XX error: after 30 minutes; 5XX: 24-hour buffer, heals on its own; restored within 30 minutes: automatic recovery | TDE key-loss paragraph |
| Manual recovery | Confirmed: Retry existing key, Validate key; original key needed, a new version doesn't help; settings that can be lost (failover group, tags, elastic pool, read scale, auto-pause, PITR history, LTR) | Same paragraph |
| Key types | Confirmed: RSA/RSA-HSM 2,048 or 3,072 bits (SQL Database and MI); AES 128/192/256 in Key Vault Premium or Managed HSM, SQL Database only, AES-256 recommended. Versionless keys (SQL Database only) not added | BYOK sentence |
| Geo-replication with CMK | Confirmed: both servers need permissions on every vault with a required key; with different keys, add both keys to both servers before creating the link or failover group | Geo-replication sentence |
| Redirect through a private endpoint | Confirmed (private-endpoint-overview): inbound 1433-65535 to the endpoint VNet, outbound from the client VNet; ODBC, OLE DB, .NET SqlClient, JDBC 9.4+ redirect, others proxied; existing private endpoints on Default use Proxy on 1433 | Redirect bullet |
| Minimum TLS | Partly confirmed (connectivity-settings): default accepts 1.2 and later; can't revert to the default after enforcing. **TLS 1.3 enforcement not found** on that page | Connectivity sentence; TLS 1.3 not added |
| Always Encrypted limits | Confirmed (always-encrypted-database-engine) | Limits sentence extended: `timestamp`, `image`, `ntext`, `text`, `hierarchyid`, `vector`, computed, sparse, partitioning, DDM-masked columns; `FOR XML`/`FOR JSON`, TVPs, distributed queries |
| FR « réseaux appairés » | Glossary: « peering » | « réseaux connectés par peering » (MI endpoints table) |

## Mock-exam bank questions changed

- `questions/security/dp300-sr2-tde-protector-1.yaml` (explanation EN + FR): "customer-managed TDE accepts RSA and RSA-HSM keys of 2,048 or 3,072 bits only" became "an RSA or RSA-HSM TDE protector must be 2,048 or 3,072 bits (symmetric AES keys, also supported in Azure SQL Database, are excluded here by the policy)". Learn now accepts AES keys for SQL Database. The answer (No) doesn't change; the series scenario requires an RSA key.
- `questions/security/dp300-2b-tde-cmk-purge-protection.yaml` (explanation of option d, EN + FR): "TDE supports RSA keys of 2,048 and 3,072 bits only" became "An RSA TDE protector must be 2,048 or 3,072 bits, so a 4,096-bit key is not supported". Same reason; the answer doesn't change.

## Checked and left unchanged

- Bank questions on the other corrected facts: `dp300-sr2-tde-protector-2/3` (RSA 3,072 still valid), `dp300-1a-mi-config-match` (classic GP 16 TB, NGP 32 TB / 500 databases), `dp300-1b-mi-copy-network` (stem already says neither instance is in a failover group), `dp300-1b-mi-move`, `dp300-1b-method-match`, `dp300-cs1a-online-migration`, `dp300-1b-vm-log-shipping`, `dp300-1b-migration-plan-hotarea` and `dp300-cs2c-offline-migration` (DMS modes match the DMS overview), `dp300-2a-login-central-disable` (already mentions the cache flush), `dp300-2a-server-roles-facts`, `dp300-2a-db-manager-role`, `dp300-2a-monitor-all-dbs`, `dp300-2b-server-role-monitoring` (all Azure SQL Database), `dp300-cs3b-monitoring-login` (SQL Server 2022 on VMs, `##MS_` roles valid there), `dp300-2a-principal-types` (MI; VIEW SERVER STATE needs a login whatever the role). No bank question adds a Microsoft Entra group to an Azure SQL Database server role or relies on the removed Entra-only/Windows claim. No AE bank question encrypts a column type newly listed as unsupported.
- No bank question uses a preview or retired feature as the answer for these points.

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0): quiz 12 q3 (8 to 16 vCores, 36 to 72 MiB/s) stays under the new 120 MiB/s maximum; quiz 22 q6 (key restored after 50 minutes) and q9 (Redirect through a private endpoint) match the new text.

## For a human decision

- **Entra login creation** (21): the Entra server principals page says both "loginmanager members can" and "only the Microsoft Entra admin can". The chapter keeps "Microsoft Entra admin or `loginmanager` / `##MS_LoginManager##`".
- **Who adds members to Azure SQL Database server roles** (21): the server roles page says both "each member of a fixed server role" and "only the server admin or the Microsoft Entra admin". The chapter keeps the second (Permissions section).
- **DMS and logins** (13): DMS overview "Migrate logins: No" vs MI migration overview "move SQL logins ... by using DMS in offline mode" (also T-SQL Agent jobs). Chapter key point "logins and Agent jobs are always yours to migrate" kept.
- **Arc best practices assessment license** (11): the assess page says Software Assurance or pay-as-you-go only; the chapter's license paragraph also lists "a SQL Server subscription". Not changed (the license-types page wasn't fetched).
- **TLS 1.3 as an enforceable minimum** (22): reported by the quiz writer, not found on the connectivity settings page; not added.
- **French terms not in the glossary**: « mode de lien multibase » (multiple-database link mode), « mémoire flexible » (flexible memory), « indicateurs de trace », « connecteur SQL Server pour Azure Key Vault », « Defender pour SQL », « clé symétrique AES », « paramètres table » (table-valued parameters), « colonnes éparses » (sparse columns). Portal labels Retry existing key / Validate key / Transparent data encryption kept in English.
