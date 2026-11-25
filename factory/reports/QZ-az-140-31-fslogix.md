# QZ-az-140-31-fslogix — report

File: `content/az-140/quizzes/31-fslogix.yaml` (10 questions, `az140-qz-31-01` to `-10`). `npx tsx factory/check-quiz.ts az-140 31-fslogix`: 0 problem(s), 0 warning(s).

Coverage: 3.1.1 (06), 3.1.2 (04, 05, 07), 3.1.3 (03, 08), 3.1.4 (01, 09), 3.1.5 (02, 10). Formats 6–10: multi, dropdown, multi, yesno_statements, dragdrop.

The mock bank already covers most FSLogix decisions (29 questions on 3.1.x plus 1.2.2). To avoid repeating them, the quiz tests these points: `IgnoreNonWVD`, raising `SizeInMBs` for existing containers, `IncludeOneNote`, object-specific settings and their precedence, Cloud Cache on an ODFC-only deployment, Cloud Cache behavior at a forced sign-out, `.fxa` versus `.fxr`, and three-level assignment order.

## Chapter (31-fslogix) out of date or inaccurate against current Learn

1. **Include/exclude groups**. The chapter says that "membership in an exclude list wins over the include list". The current Learn page (*Local include and exclude groups*) doesn't say this; it only gives the default memberships. I couldn't verify it, so the quiz doesn't use it. The mock question `az140-3a-fsl-prof-pilot-group` doesn't depend on it.
2. **Rule Set assignments**. The chapter says "the last match decides". Learn says only that assignments are processed top to bottom, and shows that Everyone at the bottom gives "applies to no one". Last match is inferred from those figures, not stated. Q10 relies on it (Everyone Yes, Markets No, Interns Yes).
3. **Cloud Cache registration settings**. Learn has nuances that the chapter lacks:
   - After `CcdUnregisterTimeout` expires, the local cache is kept even if `ClearCacheOnLogoff` = 1. Only `ClearCacheOnForcedUnregister` = 1 deletes it. Q09 s3 uses this.
   - With `HealthyProvidersRequiredForUnregister` = 0, `CcdUnregisterTimeout` and `ClearCacheOnForcedUnregister` have no effect.
   - Learn's high-availability example asks for at least two providers of different kinds in the region of the VMs (or ZRS), and recommends `HealthyProvidersRequiredForRegister` = 1 and `ClearCacheOnLogoff` = 1.
4. **Object-specific settings**. The chapter has one table row. Learn adds:
   - Precedence: user, then group, then system-wide settings. Q07 uses it.
   - These settings can't be configured with the Group Policy templates.
   - Microsoft Entra cloud-only identities aren't supported.
   - Keys exist under both the Profiles and the ODFC keys.
5. **Antivirus exclusions**. Same gap as in 22-security: the current list adds drivers, the FSLogix program and data folders, registry keys and mount points.
6. **Kerberos notice**. Every FSLogix page now warns that the April 2026 Windows Server update changes the default Kerberos encryption from RC4 to AES-SHA1. Shares that aren't upgraded may fail to mount containers. This isn't in the chapter; it may belong in the storage chapter (1.2.x).
7. **Reference title in the bank**. About 20 mock questions cite `fslogix/reference-configuration-settings` as "Configuration Setting Reference". The current page title is "Configuration Settings"; the quiz uses the current title.

## Unverified or borderline facts in the quiz

- Q05: existing containers are extended to the new `SizeInMBs` "during user sign in" (verified on the Configuration Settings page). Option d (re-creating the containers with the frx utility) is a valid but heavier method; it's wrong only because of the "minimize effort" constraint.
- Q06: "same region" comes from *User profile management for Azure Virtual Desktop with FSLogix profile containers*, which says "The storage account must be in the same region as the session host VMs".
- Q01: the maximum of four providers is verified. Explanation a ("two is the minimum for resiliency") follows the Configuration Examples page.
