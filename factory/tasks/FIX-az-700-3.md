# Task FIX-az-700-3 — course and bank corrections, AZ-700, chapters 32-load-balancer-traffic-manager, 33-application-gateway-design, 34-application-gateway-configuration, 35-front-door, 41-private-link, 42-service-endpoints

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-700.md`.

Your chapters (and the only bank objectives you may touch):
- `32-load-balancer-traffic-manager`: objectives 3.1.6, 3.1.9, 3.1.10, 3.1.11, 3.1.8, 3.1.7; findings in `factory/reports/QZ-az-700-32-load-balancer-traffic-manager.md`
- `33-application-gateway-design`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5; findings in `factory/reports/QZ-az-700-33-application-gateway-design.md`
- `34-application-gateway-configuration`: objectives 3.2.6, 3.2.7, 3.2.8, 3.2.9, 3.2.10; findings in `factory/reports/QZ-az-700-34-application-gateway-configuration.md`
- `35-front-door`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7, 3.3.8, 3.3.9; findings in `factory/reports/QZ-az-700-35-front-door.md`
- `41-private-link`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6; findings in `factory/reports/QZ-az-700-41-private-link.md`
- `42-service-endpoints`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4; findings in `factory/reports/QZ-az-700-42-service-endpoints.md`

Report: `factory/reports/FIX-az-700-3.md`.

Checks: `npx tsx factory/check-cert.ts az-700 32-load-balancer-traffic-manager 33-application-gateway-design 34-application-gateway-configuration 35-front-door 41-private-link 42-service-endpoints`; `npm run -s content:validate -- --cert az-700`; `npx tsx factory/check-quiz.ts az-700 32-load-balancer-traffic-manager 33-application-gateway-design 34-application-gateway-configuration 35-front-door 41-private-link 42-service-endpoints`.
