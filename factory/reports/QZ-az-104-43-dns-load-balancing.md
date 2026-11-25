# QZ-az-104-43-dns-load-balancing — notes

Quiz: `content/az-104/course/quizzes/43-dns-load-balancing.yaml` (10 questions; 4.3.1 ×4, 4.3.2 ×3, 4.3.3 ×3; positions 6–10: single, dropdown, yesno_statements, multi, single). Checker: 0 problem(s), 0 warning(s).

## Facts checked on Learn (Nov. 2026)
- Record-set TTL, CNAME coexistence/apex, SPF as TXT: dns-zones-records.
- Backend pool limited to one virtual network; "Outbound flow from a backend VM to a frontend of an internal load balancer fails": load-balancer/components.
- Idle timeout 4 min default, 4–100 min on LB rules, TCP reset sent to both endpoints: load-balancer-tcp-reset.
- Probes TCP/HTTP/HTTPS only, HTTP 200 required, UDP apps probe a TCP/HTTP(S) endpoint, established TCP flows continue: load-balancer-custom-probe-overview.
- Outbound rules are described for public Standard LB only; internal LB has no outbound path without NAT gateway / instance PIP / outbound-only LB config: outbound-rules.
- AG listener: internal LB, Floating IP enabled: azure-sql availability-group-load-balancer-portal-configure.
- AzureLoadBalancer tag "only includes probe traffic, not real traffic": service-tags-overview. "Traffic is blocked if no NSG exists on a subnet or NIC": load-balancer-overview.
- Link the privatelink zone to every spoke with clients: private-endpoint-dns-integration.
- Private Resolver inbound endpoint + on-prem conditional forwarder; zone must be linked to the resolver's VNet: private-resolver-hybrid-dns.

## Doubts / deviations
- Q9 option d: no Learn page states in so many words that 168.63.129.16 is unreachable from on-premises; the 168.63.129.16 page says it is a virtual IP of the host node used by VMs, and all Learn hybrid designs forward on-prem queries to a resolver/forwarder in Azure. Explanation is worded accordingly.
- Chapter 43 says a backend VM reaching its own ILB frontend "can be sent back to the same machine and fail"; Learn (components, Limitations) says the flow fails, without condition. Q8 follows Learn; the chapter may deserve a wording fix (not my file).
- Chapter 43 FR uses « réseaux appairés » (load-balancer table, internal LB row); the glossary says « peering » / avoid « appairage ». Not my file.
- FR: metric names kept in English (**Health Probe Status**) as in the chapter; the mock question n3-lbt-nsg-probe translates it « État de la sonde d'intégrité ». Harmonisation to decide.
- FR terms from fr-fr DNS Private Resolver page: « point de terminaison entrant / sortant », « ensemble de règles de transfert DNS », « redirecteur conditionnel » (Learn: « redirecteur conditionnel DNS »).
