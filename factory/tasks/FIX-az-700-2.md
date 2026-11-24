# Task FIX-az-700-2 — course and bank corrections, AZ-700, chapters 21-site-to-site-vpn, 22-point-to-site-vpn, 23-expressroute-design, 24-expressroute-implementation, 25-virtual-wan, 31-load-balancer-design

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-700.md`.

Your chapters (and the only bank objectives you may touch):
- `21-site-to-site-vpn`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7, 2.1.8, 2.1.9; findings in `factory/reports/QZ-az-700-21-site-to-site-vpn.md`
- `22-point-to-site-vpn`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.2.8, 2.2.9; findings in `factory/reports/QZ-az-700-22-point-to-site-vpn.md`
- `23-expressroute-design`: objectives 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5; findings in `factory/reports/QZ-az-700-23-expressroute-design.md`
- `24-expressroute-implementation`: objectives 2.3.6, 2.3.7, 2.3.8, 2.3.9, 2.3.10, 2.3.11, 2.3.12, 2.3.13; findings in `factory/reports/QZ-az-700-24-expressroute-implementation.md`
- `25-virtual-wan`: objectives 2.4.1, 2.4.2, 2.4.3, 2.4.4, 2.4.5, 2.4.6, 2.4.7; findings in `factory/reports/QZ-az-700-25-virtual-wan.md`
- `31-load-balancer-design`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5; findings in `factory/reports/QZ-az-700-31-load-balancer-design.md`

Report: `factory/reports/FIX-az-700-2.md`.

Checks: `npx tsx factory/check-cert.ts az-700 21-site-to-site-vpn 22-point-to-site-vpn 23-expressroute-design 24-expressroute-implementation 25-virtual-wan 31-load-balancer-design`; `npm run -s content:validate -- --cert az-700`; `npx tsx factory/check-quiz.ts az-700 21-site-to-site-vpn 22-point-to-site-vpn 23-expressroute-design 24-expressroute-implementation 25-virtual-wan 31-load-balancer-design`.
