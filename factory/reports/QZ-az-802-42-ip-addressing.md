# QZ-az-802-42-ip-addressing — report

File: `content/az-802/quizzes/42-ip-addressing.yaml` (10 questions). `npx tsx factory/check-quiz.ts az-802 42-ip-addressing`: 0 problems, 0 warnings.

Objectives: 4.2.1 (Q3, Q8), 4.2.2 (Q4, Q9), 4.2.3 (Q1, Q5, Q6), 4.2.4 (Q7), 4.2.5 (Q2, Q10). Positions 6–10 use the formats single, hotarea, yesno_statements, multi and yesno_statements.

The 28 mock-exam questions for 4.2.x cover almost every decision in the chapter. The quiz avoids their decisions: it tests the failover port, conflict detection, a static private IP set on the NIC, T1/T2 timing, how short leases fix exhaustion, which option value a reserved client ends up with, OnClientRequest vs older clients and DHCP on a DC, two combined causes after a move to Azure, and failover states (COMM-INT vs partner down). 4.2.4 is tested only once (Q7), because the bank already covers reservations from every angle.

## Facts checked on Learn (fetched)
- Failover: TCP 647, 2 servers, IPv4 only. In COMM-INT, a hot standby server renews existing clients for the MCLT and leases new addresses from its reserve only. It uses the whole pool only after the MCLT, and not while it stays in COMM-INT (DHCP failover in Windows Server). Defaults are MCLT 1 hour, ReservePercent 5 and AutoStateTransition False (Add-DhcpServerv4Failover).
- DNS: a Windows client sends option 81 with Flags 0, so it registers its A record and the server registers the PTR. On a DC with no dedicated credentials, DHCP inherits the DC's rights over a secure zone (Dynamic DNS Update in Windows and Windows Server).
- ConflictDetectionAttempts: range 0–5, default 0. T1 is at 50 % (unicast), T2 at 87.5 % (broadcast). Authorization is required in a domain. Azure facts checked: the VNet FAQ (DHCP relay, UDP 68→67 not supported) and the NIC IP page (don't set the IP in the OS; use static allocation on the NIC).

## Doubts / sources
- Q7 (option precedence: reservation > scope > server, policy only for matching clients): no current Learn page states the precedence. The only Learn source found is the archived Windows Server 2003 page "Assigning options", which Q7 cites. The behavior hasn't changed, but a newer source would be better.
- Q6 (shorter lease for transient guests): no current Learn page gives lease-duration guidance. The chapter states it, and the answer follows from how leases work; the cited references (DHCP scopes, DHCP failover) only support the distractors.
- Set-DhcpServerv4DnsSetting documents no default value for its parameters. Q8 therefore states the settings explicitly instead of relying on defaults.

## Chapter vs Learn
- Chapter, failover table: "MCLT 1 hour" is the cmdlet default (Add-DhcpServerv4Failover), but the DHCP failover page doesn't state it. That's consistent, not an error.
- Chapter, DHCP-HA section: Learn adds that hot standby in COMM-INT "may use the entire pool after MCLT expires, but not while it remains in communication-interrupted state". The chapter's exam trap agrees with this.
- Chapter, Azure table: Learn's NIC page says that once assigned, dynamic private IPs are released only when the NIC is deleted, moved to another subnet, or switched to static. The chapter doesn't claim otherwise. A course or question that says "a dynamic private IP changes on stop/deallocate" would be wrong; that applies only to dynamic public IPs.
- No error found in the chapter for this quiz's scope.
