# QZ-az-802-62-ad-ds-security — report

File: `content/az-802/quizzes/62-ad-ds-security.yaml` (10 questions; `check-quiz` 0 problem(s), 0 warning(s)).

Formats 6–10: single, single, hotarea, multi, dropdown. Objectives: 6.2.1 (Q1, Q8), 6.2.7 (Q2), 6.2.3 (Q3), 6.2.2 (Q4), 6.2.4 (Q5), 6.2.6 (Q6), 6.2.5 (Q7), 6.2.8 (Q9), 6.2.9 (Q10).

## Facts checked on Learn (fetched 2026-11-24)
- Resultant PSO: direct link to the user wins, then lowest precedence among global groups, then Default Domain Policy; other group types ignored; no merge (cc770394).
- Protected Users logs (ProtectedUser-Client, ProtectedUserFailures-DomainController, ProtectedUserSuccesses-DomainController) disabled by default; event 100 = NTLM failure.
- Entra Password Protection: DFSR required (installs on FRS but doesn't work), no agent needed on RODCs, proxy not supported on RODC, restart required.
- Virtual DCs on hosts separate from other VMs, storage separated from storage admins (Securing DCs against attack).
- Built-in Administrator (RID 500) always exempt from authentication policies; device restrictions need the Kerberos client armoring setting on devices (Guidance about how to configure protected accounts).
- GPCO can create GPOs but gets no rights on others' GPOs and can't link; Link GPOs is delegated per site/domain/OU (WS2003 page, still on Learn as previous-versions).
- AES keys exist only if the password was changed on a WS2008+ DC.

## Chapter vs Learn
- Chapter table "Domain Admins: few members". *Implementing Least-Privilege Administrative Models* says Domain Admins, like Enterprise Admins, should have no day-to-day members (only temporary membership, except the secured built-in Administrator). Consider aligning the chapter.
- The Protected Users page has inconsistent wording: prerequisites say DFL Windows Server 2012 R2, guidelines say 2008 for AES keys. The chapter (2012 R2 for DC-side protections) matches the prerequisites.
- Not verified (and not used): the chapter's statement that `New-ADAuthenticationPolicy` is enforced by default. The silos page only says that a silo that isn't enforced runs in audit mode by default.
- Not verified (and not used): shielded VMs, OSConfig `DomainController` scenario, LDAP events 3074/3075, the claim that the old Kerberos registry value isn't honored on WS2025.

## Doubts
- Q9 reference is the Windows Server 2003 Group Policy delegation page (the only one fetched that states GPCO/link semantics). It is still correct but old.
- Q6 overlaps in theme with `az802-6b-uac-options-dd` (sensitive flag for an admin). Here the deciding point is different: Protected Users is ruled out by offline sign-in and NTLM-by-IP constraints.
- Q10 is consistent with `az802-6b-uac-options-dd` (AES flag): in the quiz, the AES flags are already set and the missing piece is the password reset that creates AES keys.
