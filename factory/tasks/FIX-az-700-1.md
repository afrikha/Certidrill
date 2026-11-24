# Task FIX-az-700-1 — course and bank corrections, AZ-700, chapters 11-vnets-subnets, 12-public-ip, 13-name-resolution, 14-vnet-connectivity, 15-routing-nat, 16-network-monitoring

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-700.md`.

Your chapters (and the only bank objectives you may touch):
- `11-vnets-subnets`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5; findings in `factory/reports/QZ-az-700-11-vnets-subnets.md`
- `12-public-ip`: objectives 1.1.9, 1.1.10, 1.1.7, 1.1.6, 1.1.8; findings in `factory/reports/QZ-az-700-12-public-ip.md`
- `13-name-resolution`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7; findings in `factory/reports/QZ-az-700-13-name-resolution.md`
- `14-vnet-connectivity`: objectives 1.3.1, 1.3.2, 1.3.3; findings in `factory/reports/QZ-az-700-14-vnet-connectivity.md`
- `15-routing-nat`: objectives 1.3.4, 1.3.5, 1.3.6, 1.3.7, 1.3.8, 1.3.9, 1.3.10; findings in `factory/reports/QZ-az-700-15-routing-nat.md`
- `16-network-monitoring`: objectives 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5, 1.4.6, 1.4.7; findings in `factory/reports/QZ-az-700-16-network-monitoring.md`

Report: `factory/reports/FIX-az-700-1.md`.

Checks: `npx tsx factory/check-cert.ts az-700 11-vnets-subnets 12-public-ip 13-name-resolution 14-vnet-connectivity 15-routing-nat 16-network-monitoring`; `npm run -s content:validate -- --cert az-700`; `npx tsx factory/check-quiz.ts az-700 11-vnets-subnets 12-public-ip 13-name-resolution 14-vnet-connectivity 15-routing-nat 16-network-monitoring`.
