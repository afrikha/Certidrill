# QZ-az-140-13-plan-host-pools — end-of-chapter quiz, AZ-140, chapter 13

File: `content/az-140/quizzes/13-plan-host-pools.yaml` (10 questions, draft).
Check: `npx tsx factory/check-quiz.ts az-140 13-plan-host-pools` → 0 problem(s), 0 warning(s).

Objectives: 1.3.1 (q2), 1.3.2 (q1, q7), 1.3.3 (q5, q9), 1.3.4 (q4, q8), 1.3.5 (q3, q6), 1.3.6 (q10).
Types: single 6, yesno_statements 3, dropdown 1; positions 6–10 use yesno_statements and dropdown.

The mock bank already covers almost every decision of this chapter, so the quiz tests decisions it leaves out: Marketplace multi-session image with Microsoft 365 Apps, the 200 role assignments per object limit, single-session sizing, breadth-first random choice among the half of hosts with the fewest sessions, Office 365 E3 not being eligible, the 3840 × 2160 GPU threshold, Windows 10 ESU included in AVD, depth-first selection with drain mode and the limit, one per-user charge per tenant per month, and Azure Dev/Test.

## Verified on learn.microsoft.com (2026-11-24)

Licensing Azure Virtual Desktop; Prerequisites for Azure Virtual Desktop (OS table, unsupported items, Dev/Test tip); Configure host pool load balancing; Session host VM sizing guidelines (single-session table, 3840 × 2160 rule); Enable GPU acceleration; Install Office on a custom VHD image (multi-session images with Microsoft 365 Apps); Extended Security Updates program for Windows 10 (ESU at no extra cost in AVD); Azure subscription and service limits (AVD: 200 role assignments per object); Built-in Azure RBAC roles for AVD; Drain session hosts; Check vCPU quotas (allocated and deallocated cores count).

## Chapter out of date or to check against current Learn

- **GPU table, section performance.** NVv3 and NVv4 were announced for retirement on **September 30, 2026** (Learn "retired sizes list"): they're retired now. The chapter still recommends them (table rows "NVadsA10 v5, NVv3, NCasT4_v3" and "NVv4", plus "AMD sizes need the AMD driver"), and the sizing table lists NV16as_v4 / NV6 as Power examples (the Learn sizing page itself isn't updated). The chapter could keep NVadsA10 v5 and NCasT4_v3 only and note the retirement. Mock questions that use NVv3/NVv4 as options should be checked too (I didn't check them one by one). The quiz uses no retired size.
- The Learn GPU page also says HEVC/H.265 needs **Windows 10 or Windows 11** session hosts (not Windows Server); the chapter doesn't say it.
- Per-user access pricing: Learn says it doesn't include "Microsoft Office, Microsoft Defender XDR, or Universal Print"; the chapter writes "Microsoft 365 Apps". Same meaning, wording differs.
- The Azure Dev/Test sentence of the chapter comes from the Prerequisites page (tip), not the Licensing page. That's correct, no change needed.
- Sizing page inconsistency (Learn itself): "limit VM size to between 6 vCPUs and 24 vCPUs" vs the "4 to 24 cores" range and the 8-vCPU minimum in the table. The chapter follows the "4 to 24" sentence. No quiz question depends on it.

## Doubts

- q9 s2 (Dev/Test): Learn says "end users may connect … without separate license entitlement in order to perform acceptance tests". I applied it to an external customer user who does acceptance tests. The Azure Dev/Test offer has its own terms of use, which I didn't fetch.
- q2: the 200 limit is "Role Assignment per any Azure Virtual Desktop object". The distractor explanations use the facts "one desktop application group per host pool" and "an assignment on the host pool or the workspace gives no access", both from the chapter.
- q6 assumes that two 4K monitors (2 × 3840 × 2160) exceed the "3840 x 2160 total resolution" threshold. The page doesn't define how the total is computed, but two monitors clearly exceed one 4K surface.
