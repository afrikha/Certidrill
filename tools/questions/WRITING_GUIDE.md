# Writing guide — AZ-104 question bank

Every question of `content/az-104/` follows this guide. It is written for the
people and agents who author or review questions.

## Non-negotiable rules

1. **Original content only.** Never reproduce a question from a real exam, a
   "dump" site, a practice-test vendor or a book. Write every scenario yourself
   from the Microsoft Learn documentation. Use fictional company names
   (Contoso, Fabrikam, Litware, Northwind, Adatum, Tailspin, Woodgrove, Proseware,
   Wingtip…) and fictional resource names.
2. **Technically exact and current (2026).** Check each fact against Microsoft
   Learn before writing it. If you are not sure, fetch the page or drop the
   question. Pitfalls:
   - Microsoft **Entra ID** (never "Azure AD"), Microsoft **Entra Connect**.
   - Basic SKU public IPs and the Basic Load Balancer are retired (Sept. 2025):
     scenarios use Standard SKUs.
   - The Log Analytics agent (MMA) is retired: use the **Azure Monitor Agent**
     with **data collection rules**.
   - Built-in roles: **Owner, Contributor, Reader, User Access Administrator,
     Role Based Access Control Administrator** (can assign roles, possibly with
     conditions), plus service roles (Virtual Machine Contributor, Storage Blob
     Data Reader/Contributor/Owner, Storage Account Contributor, Network
     Contributor, Backup Contributor/Operator/Reader, Monitoring Reader/Contributor…).
     When "manage access" is the requirement, make sure only one role in the
     options is correct (do not offer both User Access Administrator and
     Role Based Access Control Administrator as if only one were valid).
   - Blob access tiers: **Hot, Cool, Cold, Archive**.
   - Exactly one correct answer for `single`, exactly `choose` correct answers
     for `multi`. No "all of the above", no trick wording, no double negatives.
3. **Unambiguous.** A competent administrator who reads the stem carefully must
   reach exactly the expected answer. State every constraint that decides the
   answer ("minimize cost", "minimize administrative effort", "least privilege",
   tier, region, SKU, existing configuration).
4. **Realistic administrator scenario** in the AZ-104 style: "You have an Azure
   subscription named Sub1 that contains…", "You need to…", "What should you
   do/use/configure?". Plausible distractors drawn from the same area (real
   features that do something else). Distractors and correct answer have
   similar length and style.
5. **Explanations:** `explanation.correct` explains why the answer is right
   (2–4 sentences). `explanation.options` explains why each wrong option (or
   wrong choice of a list) is wrong — required for `single` and `multi`, and
   recommended for the key distractors of other types. Explanations paraphrase
   the documentation, never copy it.
6. **References:** 1–2 Microsoft Learn URLs (`https://learn.microsoft.com/en-us/...`)
   that really exist and cover the point. Prefer URLs you have fetched. Title =
   the page title.

## Languages and terminology

- Every text exists in English (`en`) and French (`fr`), same meaning.
- The French text uses **exactly Microsoft Learn's French terminology**: see
  `content/az-104/glossary.yaml` (terms collected from learn.microsoft.com
  en-us / fr-fr). Product and feature names Microsoft keeps in English stay in
  English; commands, code, parameters, role names, SKU names and portal blade
  names stay in English.
- Terminology decisions (from the glossary — apply them everywhere):
  - Blob tiers: « niveau chaud (Hot) », « niveau froid (Cool) », « niveau froid (Cold) »,
    « niveau archive (Archive) » — always keep the English tier name in parentheses
    since Microsoft FR uses « froid » for both Cool and Cold.
  - SAS stays « SAS » (« jeton SAS », « SAS de service », « SAS de délégation
    d'utilisateur », « SAS de compte ») as in the official study guide, not « SAP ».
  - Role names in English (Owner, Contributor, Role Based Access Control Administrator…).
  - « Sauvegarde Azure » for Azure Backup in prose, « coffre Recovery Services »,
    « coffre de sauvegarde » (Backup vault), « Stockage Azure », « Stockage Blob Azure »,
    « Explorateur Stockage Azure », « groupes de machines virtuelles identiques »
    (VM Scale Sets), « groupe à haute disponibilité », « groupe d'administration »,
    « étendue », « étiquette » (tag), « peering de réseaux virtuels », « itinéraire
    défini par l'utilisateur » / « tronçon suivant », « pool principal » (backend
    pool), « configuration IP frontale », « sonde d'intégrité », « basculement »
    (failover), « restauration automatique » (failback), « suppression réversible »
    (soft delete), « locataire » (tenant), « stratégie » (policy), « verrou
    Suppression / Lecture seule » (CanNotDelete / ReadOnly in CLI/PowerShell).
  - Azure Bastion, Network Watcher, Azure Policy, Azure Monitor, Log Analytics,
    Azure Site Recovery, AzCopy stay in English (see `keep_in_english`).
- French typography: non-breaking-style space before `:` `?` `!` `;`, « » quotes.
- Language-neutral texts (a command, `Standard_LRS`, a role name) can be a plain
  string instead of `{ en, fr }`.

## File format

One file per question: `content/az-104/questions/<domain>/<id>.yaml`, where
`<domain>` is the domain of the objective (`identities`, `storage`, `compute`,
`networking`, `monitoring`) and the file name equals `id`.

Read the existing examples first — one per type:

| Type | Example |
| --- | --- |
| `single` | `questions/storage/stor-lifecycle-cool-delete.yaml` |
| `multi` | `questions/networking/net-peering-transitivity.yaml` |
| `yesno_statements` | `questions/storage/stor-sas-types.yaml` |
| `dropdown` (code) | `questions/compute/comp-bicep-location-output.yaml`, `questions/monitoring/mon-kql-heartbeat.yaml` |
| `dragdrop` | `questions/identities/id-roles-least-privilege.yaml` |
| `ordering` | `questions/networking/net-udr-nva.yaml` |
| `hotarea` | `questions/networking/net-nsg-effective-rules.yaml` |
| `series_yesno` | `series/series-auditors-read.yaml` + `questions/identities/series-auditors-*.yaml` |
| case study | `case-studies/cs-northwind-clinics.yaml` + `questions/*/cs-nw-*.yaml` |

The schemas are in `lib/questions/schema.ts` (read it). Key points:

- `id`: lowercase `[a-z0-9-]`, 3–61 chars, unique; use your assigned prefix.
- `objective`: code from `content/az-104/objectives.yaml` (e.g. `"2.3.5"`, quoted).
- `difficulty`: 1 (easy, recall), 2 (medium, apply), 3 (hard, multi-step / tricky).
  Target mix 30 % / 50 % / 20 %.
- `status: draft`.
- ids inside a question (`a`, `b`, `s1`, slot ids…) match `[a-zA-Z0-9_-]{1,40}`.
- `single`: usually 4 options. `multi`: 4–6 options, `choose: 2` (sometimes 3);
  the stem ends with "Each correct answer presents a complete solution." or
  "…part of the solution." (FR : « Chaque bonne réponse constitue une solution
  complète. » / « …une partie de la solution. »).
- `yesno_statements`: 3 statements, not all with the same answer.
- `dropdown`: `layout: code` (with `language`: bash, powershell, json, bicep,
  kusto) or `layout: text`; the template contains each `[[slotId]]` marker exactly
  once **in both languages**; 2–4 slots, 3–5 options each.
- `dragdrop`: 4–6 items, 2–4 targets; say whether items can be reused
  (`reuse: true/false` + the matching sentence in the stem).
- `ordering`: 5–7 actions, `count` 3–5, distractors that are plausible but not
  needed.
- `hotarea`: a table (`grid`) whose answer cells carry an `area` id; 1–2 prompts.
- `shuffle: false` only when option order matters (e.g. numeric values ascending).

## YAML pitfalls (the validator will catch them, but avoid them)

- French text contains `" : "` — never write it as a plain scalar. Use a block
  scalar for every `en`/`fr` text:
  ```yaml
  stem:
    en: |
      You have ...
    fr: |
      Vous disposez de ...
  ```
  and double quotes for short texts in flow mappings:
  `text: { en: "Option A", fr: "Option A : détail" }`.
- Inside double quotes escape `"` as `\"`. Backticks are fine.
- Strings that start with `` ` ``, `*`, `&`, `!`, `{`, `[`, `@`, `%` or look like
  numbers/booleans (`"443"`, `"yes"`) must be quoted.

## Validate

```bash
npm run content:validate -- --prefix <your-prefix>
```

It must report `0 problem(s)` before you finish. Do not run git commands and do
not modify files outside your assigned prefix.
